// pwa.js - PWA Management and Offline Support
export class PWAManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.installPrompt = null;
        this.updateAvailable = false;
        this.registration = null;
    }
    
    init() {
        this.setupOnlineOfflineHandlers();
        this.setupInstallPrompt();
        this.setupUpdatePrompt();
        this.checkOnlineStatus();
        
        console.log('PWA manager initialized');
    }
    
    setupOnlineOfflineHandlers() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.onOnlineStatusChange(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.onOnlineStatusChange(false);
        });
    }
    
    onOnlineStatusChange(isOnline) {
        console.log(`Network status: ${isOnline ? 'online' : 'offline'}`);
        
        // Update UI to reflect online/offline status
        this.updateNetworkStatusIndicator(isOnline);
        
        if (isOnline) {
            this.showToast('Back online', 'success');
            // Trigger any pending sync operations
            this.triggerPendingSync();
        } else {
            this.showToast('Working offline', 'warning');
        }
    }
    
    updateNetworkStatusIndicator(isOnline) {
        // Add/remove offline indicator in header
        const header = document.querySelector('.app-header');
        if (!header) return;
        
        let indicator = header.querySelector('.network-status');
        
        if (!isOnline) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'network-status offline';
                indicator.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm4.2 11.8L11 10.6c.6-.6 1-1.4 1-2.6 0-2.2-1.8-4-4-4S4 5.8 4 8c0 1.2.4 2 1 2.6L3.8 11.8C2.7 10.7 2 9.4 2 8c0-3.3 2.7-6 6-6s6 2.7 6 6c0 1.4-.7 2.7-1.8 3.8z"/>
                    </svg>
                    <span>Offline</span>
                `;
                header.appendChild(indicator);
            }
        } else {
            if (indicator) {
                indicator.remove();
            }
        }
    }
    
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            
            // Save the event so it can be triggered later
            this.installPrompt = e;
            
            // Show install button/banner
            this.showInstallOption();
            
            console.log('Install prompt available');
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('PWA was installed');
            this.hideInstallOption();
            this.showToast('App installed successfully!', 'success');
            
            // Clear the saved prompt
            this.installPrompt = null;
        });
    }
    
    showInstallOption() {
        // Add install button to header or show install banner
        const header = document.querySelector('.app-header .header-right');
        if (!header) return;
        
        let installBtn = header.querySelector('.install-btn');
        if (installBtn) return; // Already showing
        
        installBtn = document.createElement('button');
        installBtn.className = 'header-btn install-btn';
        installBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.5 1.5v6h2l-2.5 3-2.5-3h2v-6h1z"/>
                <path d="M3 12v1h10v-1H3z"/>
            </svg>
            Install
        `;
        installBtn.title = 'Install app on your device';
        
        installBtn.addEventListener('click', () => this.promptInstall());
        
        header.insertBefore(installBtn, header.firstChild);
    }
    
    hideInstallOption() {
        const installBtn = document.querySelector('.install-btn');
        if (installBtn) {
            installBtn.remove();
        }
    }
    
    async promptInstall() {
        if (!this.installPrompt) {
            this.showToast('Install not available', 'warning');
            return;
        }
        
        try {
            // Show the install prompt
            const result = await this.installPrompt.prompt();
            
            console.log('Install prompt result:', result.outcome);
            
            if (result.outcome === 'accepted') {
                console.log('User accepted install prompt');
            } else {
                console.log('User dismissed install prompt');
            }
            
        } catch (error) {
            console.error('Install prompt failed:', error);
        } finally {
            // Clear the saved prompt
            this.installPrompt = null;
        }
    }
    
    setupUpdatePrompt() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                    this.updateAvailable = true;
                    this.showUpdatePrompt();
                }
            });
            
            // Check for updates when app becomes visible
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistration().then(registration => {
                        if (registration) {
                            registration.update();
                        }
                    });
                }
            });
        }
    }
    
    showUpdatePrompt() {
        // Create update notification
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span>New version available!</span>
                <div class="update-actions">
                    <button id="dismiss-update" class="update-btn secondary">Later</button>
                    <button id="apply-update" class="update-btn primary">Update</button>
                </div>
            </div>
        `;
        
        // Add styles
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: var(--primary-color);
            color: white;
            padding: 12px;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        
        document.body.appendChild(updateBanner);
        
        // Setup event listeners
        document.getElementById('dismiss-update')?.addEventListener('click', () => {
            updateBanner.remove();
        });
        
        document.getElementById('apply-update')?.addEventListener('click', () => {
            this.applyUpdate();
            updateBanner.remove();
        });
    }
    
    async applyUpdate() {
        try {
            if ('serviceWorker' in navigator) {
                const registration = await navigator.serviceWorker.getRegistration();
                
                if (registration && registration.waiting) {
                    // Tell the waiting service worker to skip waiting
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
                    
                    // Reload the page to use the new version
                    window.location.reload();
                }
            }
        } catch (error) {
            console.error('Failed to apply update:', error);
            this.showToast('Update failed', 'error');
        }
    }
    
    checkOnlineStatus() {
        // Ping a small resource to verify actual connectivity
        this.pingServer().then(isOnline => {
            if (isOnline !== this.isOnline) {
                this.isOnline = isOnline;
                this.onOnlineStatusChange(isOnline);
            }
        });
    }
    
    async pingServer() {
        try {
            // Try to fetch a small resource
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('/manifest.webmanifest', {
                method: 'HEAD',
                cache: 'no-cache',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response.ok;
        } catch (error) {
            console.log('Ping failed:', error.message);
            return false;
        }
    }
    
    // Background sync management
    async triggerPendingSync() {
        if (!this.isOnline) return;
        
        console.log('Triggering pending sync operations...');
        
        // Here you would typically:
        // 1. Get pending operations from IndexedDB
        // 2. Send them to the server
        // 3. Mark them as completed
        
        // For now, we'll just simulate this
        try {
            // Simulate API calls for pending operations
            await this.simulatePendingSync();
            console.log('Pending sync completed');
        } catch (error) {
            console.error('Pending sync failed:', error);
        }
    }
    
    async simulatePendingSync() {
        // Placeholder for actual sync implementation
        // This would integrate with Firebase/Supabase when implemented
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Data backup and restoration
    async createOfflineBackup() {
        try {
            // This would typically save to a different storage mechanism
            // or prepare data for manual export
            console.log('Creating offline backup...');
            
            const backupData = {
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href,
                // Add app-specific data here
            };
            
            // Save to localStorage as fallback
            localStorage.setItem('tripPlannerBackup', JSON.stringify(backupData));
            
            return backupData;
        } catch (error) {
            console.error('Failed to create offline backup:', error);
            throw error;
        }
    }
    
    async restoreOfflineBackup() {
        try {
            const backupData = localStorage.getItem('tripPlannerBackup');
            if (!backupData) {
                throw new Error('No backup found');
            }
            
            const parsedData = JSON.parse(backupData);
            console.log('Restoring from backup:', parsedData.timestamp);
            
            // Implement restoration logic here
            return parsedData;
        } catch (error) {
            console.error('Failed to restore offline backup:', error);
            throw error;
        }
    }
    
    // Storage management
    async checkStorageQuota() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                const usedMB = (estimate.usage / 1024 / 1024).toFixed(1);
                const quotaMB = (estimate.quota / 1024 / 1024).toFixed(1);
                const usagePercent = ((estimate.usage / estimate.quota) * 100).toFixed(1);
                
                console.log(`Storage: ${usedMB}MB / ${quotaMB}MB (${usagePercent}%)`);
                
                // Warn if storage is getting full
                if (usagePercent > 80) {
                    this.showToast('Storage space is low', 'warning');
                }
                
                return {
                    used: estimate.usage,
                    quota: estimate.quota,
                    usagePercent: parseFloat(usagePercent)
                };
            } catch (error) {
                console.error('Failed to check storage quota:', error);
                return null;
            }
        }
        
        return null;
    }
    
    async requestPersistentStorage() {
        if ('storage' in navigator && 'persist' in navigator.storage) {
            try {
                const persistent = await navigator.storage.persist();
                console.log(`Persistent storage: ${persistent ? 'granted' : 'denied'}`);
                return persistent;
            } catch (error) {
                console.error('Failed to request persistent storage:', error);
                return false;
            }
        }
        
        return false;
    }
    
    // Performance monitoring
    measurePerformance(operation, startTime) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`${operation} took ${duration.toFixed(2)}ms`);
        
        // Log slow operations
        if (duration > 1000) {
            console.warn(`Slow operation detected: ${operation} (${duration.toFixed(2)}ms)`);
        }
        
        return duration;
    }
    
    // App lifecycle management
    handleAppStateChange() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log('App hidden - preparing for background');
                this.onAppBackground();
            } else {
                console.log('App visible - resuming from background');
                this.onAppForeground();
            }
        });
        
        window.addEventListener('beforeunload', (e) => {
            this.onAppBeforeUnload();
        });
    }
    
    onAppBackground() {
        // Save any pending changes
        // Pause non-essential operations
        console.log('App moved to background');
    }
    
    onAppForeground() {
        // Resume operations
        // Check for updates
        // Sync data if online
        console.log('App returned to foreground');
        
        if (this.isOnline) {
            this.triggerPendingSync();
        }
    }
    
    onAppBeforeUnload() {
        // Save any pending changes
        console.log('App is being unloaded');
    }
    
    // Feature detection
    checkPWAFeatures() {
        const features = {
            serviceWorker: 'serviceWorker' in navigator,
            indexedDB: 'indexedDB' in window,
            webShare: 'share' in navigator,
            notifications: 'Notification' in window,
            backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
            persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
            installPrompt: 'BeforeInstallPromptEvent' in window,
            offlineDetection: 'onLine' in navigator,
            fileSystemAccess: 'showOpenFilePicker' in window,
            clipboard: 'clipboard' in navigator,
            webLocks: 'locks' in navigator
        };
        
        console.log('PWA features available:', features);
        return features;
    }
    
    // Native sharing
    async shareTrip(tripData) {
        if (!('share' in navigator)) {
            // Fallback to clipboard
            return this.copyToClipboard(tripData.url);
        }
        
        try {
            await navigator.share({
                title: `${tripData.name} - Trip Plan`,
                text: `Check out my trip plan for ${tripData.name}`,
                url: tripData.url
            });
            
            console.log('Trip shared successfully');
            return true;
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Share was cancelled');
                return false;
            } else {
                console.error('Share failed:', error);
                // Fallback to clipboard
                return this.copyToClipboard(tripData.url);
            }
        }
    }
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Copied to clipboard', 'success');
            return true;
        } catch (error) {
            console.error('Clipboard copy failed:', error);
            
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            
            try {
                document.execCommand('copy');
                this.showToast('Copied to clipboard', 'success');
                return true;
            } catch (fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                this.showToast('Copy failed', 'error');
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }
    
    // File system access (where supported)
    async saveToFile(data, suggestedName) {
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: suggestedName,
                    types: [{
                        description: 'JSON files',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
                
                const writable = await fileHandle.createWritable();
                await writable.write(data);
                await writable.close();
                
                this.showToast('File saved', 'success');
                return true;
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.log('Save was cancelled');
                    return false;
                } else {
                    console.error('Save failed:', error);
                    this.showToast('Save failed', 'error');
                    return false;
                }
            }
        } else {
            // Fallback to download
            return this.downloadFile(data, suggestedName);
        }
    }
    
    downloadFile(data, filename) {
        try {
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.showToast('Download started', 'success');
            return true;
        } catch (error) {
            console.error('Download failed:', error);
            this.showToast('Download failed', 'error');
            return false;
        }
    }
    
    // Notifications (if user grants permission)
    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return false;
        }
        
        if (Notification.permission === 'granted') {
            return true;
        } else if (Notification.permission === 'denied') {
            return false;
        } else {
            try {
                const permission = await Notification.requestPermission();
                return permission === 'granted';
            } catch (error) {
                console.error('Notification pe
