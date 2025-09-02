// db.js - IndexedDB Database Management
export class TripDatabase {
    constructor() {
        this.dbName = 'TripPlannerDB';
        this.dbVersion = 1;
        this.db = null;
    }
    
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open database:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createObjectStores(db);
            };
        });
    }
    
    createObjectStores(db) {
        console.log('Creating object stores...');
        
        // Trips store
        if (!db.objectStoreNames.contains('trips')) {
            const tripStore = db.createObjectStore('trips', { keyPath: 'id' });
            tripStore.createIndex('createdAt', 'createdAt', { unique: false });
            tripStore.createIndex('updatedAt', 'updatedAt', { unique: false });
            tripStore.createIndex('shareToken', 'share.token', { unique: true, sparse: true });
        }
        
        // Activities store
        if (!db.objectStoreNames.contains('activities')) {
            const activityStore = db.createObjectStore('activities', { keyPath: 'id' });
            activityStore.createIndex('tripId', 'tripId', { unique: false });
            activityStore.createIndex('source', 'source', { unique: false });
            activityStore.createIndex('start', 'start', { unique: false });
            activityStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
        }
        
        // Comments store (for shared trips)
        if (!db.objectStoreNames.contains('comments')) {
            const commentStore = db.createObjectStore('comments', { keyPath: 'id' });
            commentStore.createIndex('tripId', 'tripId', { unique: false });
            commentStore.createIndex('activityId', 'activityId', { unique: false });
            commentStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
        
        // App settings store
        if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        console.log('Object stores created');
    }
    
    // Trip CRUD operations
    async saveTrip(trip) {
        return this.performTransaction('trips', 'readwrite', (store) => {
            return store.put(trip);
        });
    }
    
    async getTripById(tripId) {
        return this.performTransaction('trips', 'readonly', (store) => {
            return store.get(tripId);
        });
    }
    
    async getTripByShareToken(token) {
        return this.performTransaction('trips', 'readonly', (store) => {
            const index = store.index('shareToken');
            return index.get(token);
        });
    }
    
    async getAllTrips() {
        return this.performTransaction('trips', 'readonly', (store) => {
            return store.getAll();
        });
    }
    
    async deleteTrip(tripId) {
        // Delete all activities for this trip first
        await this.deleteActivitiesByTrip(tripId);
        
        // Delete all comments for this trip
        await this.deleteCommentsByTrip(tripId);
        
        // Delete the trip itself
        return this.performTransaction('trips', 'readwrite', (store) => {
            return store.delete(tripId);
        });
    }
    
    async duplicateTrip(tripId, newName) {
        const originalTrip = await this.getTripById(tripId);
        if (!originalTrip) {
            throw new Error('Trip not found');
        }
        
        const activities = await this.getActivitiesByTrip(tripId);
        
        // Create new trip
        const newTrip = {
            ...originalTrip,
            id: this.generateId(),
            name: newName,
            share: { mode: 'private', token: null, allowComments: false },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await this.saveTrip(newTrip);
        
        // Duplicate all activities
        for (const activity of activities) {
            const newActivity = {
                ...activity,
                id: this.generateId(),
                tripId: newTrip.id
            };
            await this.saveActivity(newActivity);
        }
        
        return newTrip;
    }
    
    // Activity CRUD operations
    async saveActivity(activity) {
        activity.updatedAt = new Date().toISOString();
        if (!activity.createdAt) {
            activity.createdAt = activity.updatedAt;
        }
        
        return this.performTransaction('activities', 'readwrite', (store) => {
            return store.put(activity);
        });
    }
    
    async getActivityById(activityId) {
        return this.performTransaction('activities', 'readonly', (store) => {
            return store.get(activityId);
        });
    }
    
    async getActivitiesByTrip(tripId) {
        return this.performTransaction('activities', 'readonly', (store) => {
            const index = store.index('tripId');
            return index.getAll(tripId);
        });
    }
    
    async getActivitiesBySource(tripId, source) {
        const allActivities = await this.getActivitiesByTrip(tripId);
        return allActivities.filter(activity => activity.source === source);
    }
    
    async getActivitiesByDateRange(tripId, startDate, endDate) {
        const allActivities = await this.getActivitiesByTrip(tripId);
        return allActivities.filter(activity => {
            if (!activity.start) return false;
            const activityDate = new Date(activity.start);
            return activityDate >= new Date(startDate) && activityDate <= new Date(endDate);
        });
    }
    
    async getActivitiesByTag(tripId, tag) {
        return this.performTransaction('activities', 'readonly', (store) => {
            const index = store.index('tags');
            return new Promise((resolve, reject) => {
                const results = [];
                const request = index.openCursor(IDBKeyRange.only(tag));
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        if (cursor.value.tripId === tripId) {
                            results.push(cursor.value);
                        }
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        });
    }
    
    async searchActivities(tripId, searchTerm) {
        const allActivities = await this.getActivitiesByTrip(tripId);
        const lowerSearchTerm = searchTerm.toLowerCase();
        
        return allActivities.filter(activity => 
            activity.title.toLowerCase().includes(lowerSearchTerm) ||
            activity.description.toLowerCase().includes(lowerSearchTerm) ||
            activity.notes.toLowerCase().includes(lowerSearchTerm) ||
            activity.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
        );
    }
    
    async deleteActivity(activityId) {
        // Delete associated comments first
        await this.deleteCommentsByActivity(activityId);
        
        return this.performTransaction('activities', 'readwrite', (store) => {
            return store.delete(activityId);
        });
    }
    
    async deleteActivitiesByTrip(tripId) {
        return this.performTransaction('activities', 'readwrite', (store) => {
            const index = store.index('tripId');
            return new Promise((resolve, reject) => {
                const request = index.openCursor(IDBKeyRange.only(tripId));
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        });
    }
    
    async bulkSaveActivities(activities) {
        return this.performTransaction('activities', 'readwrite', (store) => {
            return Promise.all(activities.map(activity => {
                activity.updatedAt = new Date().toISOString();
                if (!activity.createdAt) {
                    activity.createdAt = activity.updatedAt;
                }
                return store.put(activity);
            }));
        });
    }
    
    // Comment CRUD operations
    async saveComment(comment) {
        comment.createdAt = comment.createdAt || new Date().toISOString();
        comment.id = comment.id || this.generateId();
        
        return this.performTransaction('comments', 'readwrite', (store) => {
            return store.put(comment);
        });
    }
    
    async getCommentsByTrip(tripId) {
        return this.performTransaction('comments', 'readonly', (store) => {
            const index = store.index('tripId');
            return index.getAll(tripId);
        });
    }
    
    async getCommentsByActivity(activityId) {
        return this.performTransaction('comments', 'readonly', (store) => {
            const index = store.index('activityId');
            return index.getAll(activityId);
        });
    }
    
    async deleteComment(commentId) {
        return this.performTransaction('comments', 'readwrite', (store) => {
            return store.delete(commentId);
        });
    }
    
    async deleteCommentsByTrip(tripId) {
        return this.performTransaction('comments', 'readwrite', (store) => {
            const index = store.index('tripId');
            return new Promise((resolve, reject) => {
                const request = index.openCursor(IDBKeyRange.only(tripId));
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        });
    }
    
    async deleteCommentsByActivity(activityId) {
        return this.performTransaction('comments', 'readwrite', (store) => {
            const index = store.index('activityId');
            return new Promise((resolve, reject) => {
                const request = index.openCursor(IDBKeyRange.only(activityId));
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
        });
    }
    
    // Settings operations
    async getSetting(key) {
        return this.performTransaction('settings', 'readonly', (store) => {
            return store.get(key);
        }).then(result => result ? result.value : null);
    }
    
    async setSetting(key, value) {
        return this.performTransaction('settings', 'readwrite', (store) => {
            return store.put({ key, value, updatedAt: new Date().toISOString() });
        });
    }
    
    async deleteSetting(key) {
        return this.performTransaction('settings', 'readwrite', (store) => {
            return store.delete(key);
        });
    }
    
    async getAllSettings() {
        return this.performTransaction('settings', 'readonly', (store) => {
            return store.getAll();
        }).then(results => {
            const settings = {};
            results.forEach(item => {
                settings[item.key] = item.value;
            });
            return settings;
        });
    }
    
    // Statistics and analytics
    async getTripStats(tripId) {
        const activities = await this.getActivitiesByTrip(tripId);
        const bankActivities = activities.filter(a => a.source === 'bank');
        const calendarActivities = activities.filter(a => a.source === 'calendar');
        
        // Get unique tags
        const allTags = activities.flatMap(a => a.tags || []);
        const uniqueTags = [...new Set(allTags)];
        
        // Calculate total planned time
        let totalPlannedTime = 0;
        calendarActivities.forEach(activity => {
            if (activity.start && activity.end) {
                totalPlannedTime += new Date(activity.end) - new Date(activity.start);
            }
        });
        
        return {
            totalActivities: activities.length,
            bankActivities: bankActivities.length,
            calendarActivities: calendarActivities.length,
            uniqueTags: uniqueTags.length,
            allTags: uniqueTags,
            totalPlannedTime: totalPlannedTime, // in milliseconds
            totalPlannedHours: Math.round(totalPlannedTime / (1000 * 60 * 60) * 10) / 10
        };
    }
    
    async getActivityStats() {
        const allActivities = await this.performTransaction('activities', 'readonly', (store) => {
            return store.getAll();
        });
        
        const tagCounts = {};
        allActivities.forEach(activity => {
            activity.tags?.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        const mostUsedTags = Object.entries(tagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count }));
        
        return {
            totalActivities: allActivities.length,
            mostUsedTags,
            tagCounts
        };
    }
    
    // Data export/import utilities
    async exportAllData() {
        const [trips, activities, comments, settings] = await Promise.all([
            this.getAllTrips(),
            this.performTransaction('activities', 'readonly', (store) => store.getAll()),
            this.performTransaction('comments', 'readonly', (store) => store.getAll()),
            this.getAllSettings()
        ]);
        
        return {
            version: this.dbVersion,
            exportedAt: new Date().toISOString(),
            trips,
            activities,
            comments,
            settings
        };
    }
    
    async importAllData(data) {
        if (!data.version || !data.trips) {
            throw new Error('Invalid data format');
        }
        
        // Clear existing data
        await this.clearAllData();
        
        // Import data
        if (data.trips?.length) {
            for (const trip of data.trips) {
                await this.saveTrip(trip);
            }
        }
        
        if (data.activities?.length) {
            await this.bulkSaveActivities(data.activities);
        }
        
        if (data.comments?.length) {
            for (const comment of data.comments) {
                await this.saveComment(comment);
            }
        }
        
        if (data.settings) {
            for (const [key, value] of Object.entries(data.settings)) {
                await this.setSetting(key, value);
            }
        }
    }
    
    async clearAllData() {
        const stores = ['trips', 'activities', 'comments', 'settings'];
        
        for (const storeName of stores) {
            await this.performTransaction(storeName, 'readwrite', (store) => {
                return store.clear();
            });
        }
    }
    
    // Utility methods
    async performTransaction(storeName, mode, operation) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(storeName, mode);
            const store = transaction.objectStore(storeName);
            
            transaction.onerror = () => {
                console.error('Transaction failed:', transaction.error);
                reject(transaction.error);
            };
            
            transaction.oncomplete = () => {
                // Transaction completed successfully
            };
            
            try {
                const request = operation(store);
                
                if (request && typeof request.then === 'function') {
                    // Handle promises returned by bulk operations
                    request.then(resolve).catch(reject);
                } else if (request) {
                    // Handle IDBRequest objects
                    request.onsuccess = () => resolve(request.result);
                    request.onerror = () => reject(request.error);
                } else {
                    // Handle operations that don't return a request
                    resolve();
                }
            } catch (error) {
                reject(error);
            }
        });
    }
    
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
    
    // Database maintenance
    async getStorageUsage() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            return await navigator.storage.estimate();
        }
        return null;
    }
    
    async vacuum() {
        // IndexedDB doesn't need explicit vacuuming, but we can optimize by
        // recreating the database with current data
        console.log('Starting database optimization...');
        
        const backupData = await this.exportAllData();
        
        // Close current database
        this.db.close();
        
        // Delete and recreate database
        await this.deleteDatabase();
        await this.init();
        
        // Restore data
        await this.importAllData(backupData);
        
        console.log('Database optimization completed');
    }
    
    async deleteDatabase() {
        return new Promise((resolve, reject) => {
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);
            
            deleteRequest.onsuccess = () => {
                console.log('Database deleted successfully');
                resolve();
            };
            
            deleteRequest.onerror = () => {
                console.error('Failed to delete database:', deleteRequest.error);
                reject(deleteRequest.error);
            };
            
            deleteRequest.onblocked = () => {
                console.warn('Database deletion blocked. Close all tabs using this app.');
                // Could show a message to user to close other tabs
            };
        });
    }
    
    // Health check
    async healthCheck() {
        try {
            // Try to perform a simple operation
            await this.performTransaction('settings', 'readonly', (store) => {
                return store.count();
            });
            
            return {
                status: 'healthy',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.m
