// scripts/firebase-config.js - Firebase Configuration and Services
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    onSnapshot 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Import Firebase configuration from auto-generated file
import { firebaseConfig } from './generate-config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firebase Service Class
export class FirebaseService {
    constructor() {
        this.auth = auth;
        this.db = db;
        this.currentUser = null;
        this.isOnline = navigator.onLine;
        this.syncEnabled = false;
        
        // Listen for auth state changes
        onAuthStateChanged(this.auth, (user) => {
            this.currentUser = user;
            this.syncEnabled = !!user;
            console.log('Auth state changed:', user ? user.email : 'signed out');
        });
        
        // Listen for online/offline
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Back online - syncing...');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Offline mode');
        });
    }
    
    // Authentication Methods
    async signUp(email, password) {
        try {
            const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
            console.log('User signed up:', userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    async signIn(email, password) {
        try {
            const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
            console.log('User signed in:', userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw this.handleAuthError(error);
        }
    }
    
    async signOut() {
        try {
            await signOut(this.auth);
            console.log('User signed out');
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }
    
    handleAuthError(error) {
        switch (error.code) {
            case 'auth/user-not-found':
                return new Error('No user found with this email');
            case 'auth/wrong-password':
                return new Error('Incorrect password');
            case 'auth/email-already-in-use':
                return new Error('Email already in use');
            case 'auth/weak-password':
                return new Error('Password should be at least 6 characters');
            case 'auth/invalid-email':
                return new Error('Invalid email address');
            default:
                return new Error(error.message || 'Authentication failed');
        }
    }
    
    // Trip Methods
    async saveTrip(trip) {
        if (!this.syncEnabled || !this.isOnline) {
            throw new Error('Sync not enabled or offline');
        }
        
        try {
            // Add user ID to trip
            const tripData = {
                ...trip,
                userId: this.currentUser.uid,
                updatedAt: new Date().toISOString()
            };
            
            if (trip.id && trip.id.startsWith('firebase_')) {
                // Update existing trip
                const docRef = doc(this.db, 'trips', trip.id.replace('firebase_', ''));
                await updateDoc(docRef, tripData);
                console.log('Trip updated in Firebase');
            } else {
                // Create new trip
                const docRef = await addDoc(collection(this.db, 'trips'), tripData);
                trip.id = 'firebase_' + docRef.id;
                console.log('Trip created in Firebase:', docRef.id);
            }
            
            return trip;
        } catch (error) {
            console.error('Error saving trip to Firebase:', error);
            throw error;
        }
    }
    
    async getTrips() {
        if (!this.syncEnabled || !this.isOnline) {
            return [];
        }
        
        try {
            const q = query(
                collection(this.db, 'trips'), 
                where('userId', '==', this.currentUser.uid),
                orderBy('updatedAt', 'desc')
            );
            
            const querySnapshot = await getDocs(q);
            const trips = [];
            
            querySnapshot.forEach((doc) => {
                trips.push({
                    ...doc.data(),
                    id: 'firebase_' + doc.id
                });
            });
            
            console.log('Loaded trips from Firebase:', trips.length);
            return trips;
        } catch (error) {
            console.error('Error loading trips from Firebase:', error);
            throw error;
        }
    }
    
    async deleteTrip(tripId) {
        if (!this.syncEnabled || !this.isOnline) {
            throw new Error('Sync not enabled or offline');
        }
        
        try {
            const firebaseId = tripId.replace('firebase_', '');
            
            // Delete all activities for this trip first
            await this.deleteActivitiesByTrip(tripId);
            
            // Delete the trip
            await deleteDoc(doc(this.db, 'trips', firebaseId));
            console.log('Trip deleted from Firebase');
        } catch (error) {
            console.error('Error deleting trip from Firebase:', error);
            throw error;
        }
    }
    
    // Activity Methods
    async saveActivity(activity) {
        if (!this.syncEnabled || !this.isOnline) {
            throw new Error('Sync not enabled or offline');
        }
        
        try {
            const activityData = {
                ...activity,
                userId: this.currentUser.uid,
                updatedAt: new Date().toISOString()
            };
            
            if (activity.id && activity.id.startsWith('firebase_')) {
                // Update existing activity
                const docRef = doc(this.db, 'activities', activity.id.replace('firebase_', ''));
                await updateDoc(docRef, activityData);
                console.log('Activity updated in Firebase');
            } else {
                // Create new activity
                const docRef = await addDoc(collection(this.db, 'activities'), activityData);
                activity.id = 'firebase_' + docRef.id;
                console.log('Activity created in Firebase:', docRef.id);
            }
            
            return activity;
        } catch (error) {
            console.error('Error saving activity to Firebase:', error);
            throw error;
        }
    }
    
    async getActivitiesByTrip(tripId) {
        if (!this.syncEnabled || !this.isOnline) {
            return [];
        }
        
        try {
            const q = query(
                collection(this.db, 'activities'),
                where('userId', '==', this.currentUser.uid),
                where('tripId', '==', tripId)
            );
            
            const querySnapshot = await getDocs(q);
            const activities = [];
            
            querySnapshot.forEach((doc) => {
                activities.push({
                    ...doc.data(),
                    id: 'firebase_' + doc.id
                });
            });
            
            console.log('Loaded activities from Firebase:', activities.length);
            return activities;
        } catch (error) {
            console.error('Error loading activities from Firebase:', error);
            throw error;
        }
    }
    
    async deleteActivity(activityId) {
        if (!this.syncEnabled || !this.isOnline) {
            throw new Error('Sync not enabled or offline');
        }
        
        try {
            const firebaseId = activityId.replace('firebase_', '');
            await deleteDoc(doc(this.db, 'activities', firebaseId));
            console.log('Activity deleted from Firebase');
        } catch (error) {
            console.error('Error deleting activity from Firebase:', error);
            throw error;
        }
    }
    
    async deleteActivitiesByTrip(tripId) {
        if (!this.syncEnabled || !this.isOnline) {
            return;
        }
        
        try {
            // Get activities first, then delete them
            const activities = await this.getActivitiesByTrip(tripId);
            const deletePromises = [];
            
            activities.forEach((activity) => {
                const firebaseId = activity.id.replace('firebase_', '');
                deletePromises.push(deleteDoc(doc(this.db, 'activities', firebaseId)));
            });
            
            await Promise.all(deletePromises);
            console.log('All activities deleted for trip:', tripId);
        } catch (error) {
            console.error('Error deleting activities by trip:', error);
            throw error;
        }
    }
    
    // Sync Methods
    async syncToCloud(localData) {
        if (!this.syncEnabled || !this.isOnline) {
            throw new Error('Cannot sync: not authenticated or offline');
        }
        
        try {
            console.log('Starting sync to cloud...');
            
            // Sync trips
            for (const trip of localData.trips) {
                await this.saveTrip(trip);
            }
            
            // Sync activities
            for (const activity of localData.activities) {
                await this.saveActivity(activity);
            }
            
            console.log('Sync to cloud completed');
        } catch (error) {
            console.error('Sync to cloud failed:', error);
            throw error;
        }
    }
    
    async syncFromCloud() {
        if (!this.syncEnabled || !this.isOnline) {
            throw new Error('Cannot sync: not authenticated or offline');
        }
        
        try {
            console.log('Starting sync from cloud...');
            
            // Get trips (already uses simple query)
            const trips = await this.getTrips();
            const allActivities = [];
            
            // Get all activities for all trips
            for (const trip of trips) {
                const activities = await this.getActivitiesByTrip(trip.id);
                allActivities.push(...activities);
            }
            
            console.log('Sync from cloud completed');
            return {
                trips,
                activities: allActivities
            };
        } catch (error) {
            console.error('Sync from cloud failed:', error);
            throw error;
        }
    }
    
    // Utility Methods
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    canSync() {
        return this.syncEnabled && this.isOnline;
    }
}

// Export singleton instance
export const firebaseService = new FirebaseService();

// Export for debugging
window.firebaseService = firebaseService;
