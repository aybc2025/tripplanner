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
            // Also show help banner
            this.showPWAHelpBanner();
            
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
        // Show different install prompts based on device type
        if (window.innerWidth <= 768) {
            this.showMobileInstallBanner();
        } else {
            this.showDesktopInstallNotification();
        }
        
        // Also show header button for quick access
        this.showHeaderInstallButton();
    }

    showMobileInstallBanner() {
        const existingBanner = document.getElementById('install-banner');
        if (existingBanner) existingBanner.remove();
        
        const banner = document.createElement('div');
        banner.id = 'install-banner';
        banner.className = 'install-banner';
        banner.innerHTML = `
            <button class="install-banner-close" onclick="this.parentElement.remove()">×</button>
            <div class="install-banner-content">
                <div class="install-banner-icon">📱</div>
                <div class="install-banner-text">
                    <div class="install-banner-title">Install Trip Planner</div>
                    <div class="install-banner-subtitle">Access your trips offline and get a native app experience</div>
                </div>
            </div>
            <div class="install-banner-actions">
                <button class="install-banner-btn primary" onclick="window.app?.pwa?.promptInstall?.()">Install Now</button>
                <button class="install-banner-btn secondary" onclick="this.parentElement.parentElement.remove()">Maybe Later</button>
            </div>
        `;
        
        document.body.appendChild(banner);
        setTimeout(() => banner.classList.add('show'), 100);
        setTimeout(() => { if (banner?.parentNode) banner.remove(); }, 10000);
    }
    
    showDesktopInstallNotification() {
        const existingNotification = document.getElementById('install-notification');
        if (existingNotification) existingNotification.remove();
        
        const notification = document.createElement('div');
        notification.id = 'install-notification';
        notification.className = 'install-notification';
        notification.innerHTML = `
            <div class="install-notification-title">📱 Install Trip Planner</div>
            <div class="install-notification-text">Get the full app experience with offline access and native features.</div>
            <div class="install-banner-actions">
                <button class="install-banner-btn primary" onclick="window.app?.pwa?.promptInstall?.()">Install App</button>
                <button class="install-banner-btn secondary" onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => { if (notification?.parentNode) notification.remove(); }, 8000);
    }
    
    showHeaderInstallButton() {
        const header = document.querySelector('.app-header .header-right');
        if (!header) return;
        
        let installBtn = header.querySelector('.header-install-btn');
        if (installBtn) return;
        
        installBtn = document.createElement('button');
        installBtn.className = 'header-install-btn';
        installBtn.innerHTML = `<span class="install-icon">📱</span>Install`;
        installBtn.title = 'Install app on your device';
        installBtn.addEventListener('click', () => this.promptInstall());
        header.insertBefore(installBtn, header.firstChild);
    }
    
    showPWAHelpBanner() {
        const helpBanner = document.getElementById('pwa-help-banner');
        if (helpBanner && !localStorage.getItem('pwa-help-dismissed')) {
            helpBanner.style.display = 'block';
            setTimeout(() => {
                if (helpBanner.style.display !== 'none') {
                    helpBanner.style.display = 'none';
                    localStorage.setItem('pwa-help-dismissed', 'true');
                }
            }, 8000);
        }
    }
    
    hideInstallOption() {
        const headerInstallBtn = document.querySelector('.header-install-btn');
        if (headerInstallBtn) headerInstallBtn.remove();
        
        const installBanner = document.getElementById('install-banner');
        if (installBanner) installBanner.remove();
        
        const installNotification = document.getElementById('install-notification');
        if (installNotification) installNotification.remove();
        
        const helpBanner = document.getElementById('pwa-help-banner');
        if (helpBanner) helpBanner.style.display = 'none';
    }
    
    async promptInstall() {
        if (!this.installPrompt) {
            this.showToast('Install option not available. Try using browser menu → "Install app" or "Add to Home Screen"', 'info');
            return;
        }
        
        try {
            const result = await this.installPrompt.prompt();
            console.log('Install prompt result:', result.outcome);
            
            if (result.outcome === 'accepted') {
                console.log('User accepted install prompt');
                this.showToast('Installing app...', 'success');
            } else {
                console.log('User dismissed install prompt');
            }
            
        } catch (error) {
            console.error('Install prompt failed:', error);
            this.showToast('Install failed. Try using browser menu instead.', 'error');
        } finally {
            this.installPrompt = null;
            this.hideInstallOption();
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
            // Try to fetch a small resource - use a more reliable endpoint
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            // Try multiple endpoints to check connectivity
            const endpoints = [
                './manifest.webmanifest',  // Relative path
                './index.html',            // Fallback to main page
                './',                      // Root directory
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'HEAD',
                        cache: 'no-cache',
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    if (response.ok) {
                        return true;
                    }
                } catch (endpointError) {
                    // Continue to next endpoint
                    continue;
                }
            }
            
            clearTimeout(timeoutId);
            return false;
            
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
                console.error('Notification permission request failed:', error);
                return false;
            }
        }
    }
    
    async showNotification(title, options = {}) {
        const hasPermission = await this.requestNotificationPermission();
        if (!hasPermission) return;
        
        const notification = new Notification(title, {
            icon: 'assets/icon-192x192.png',
            badge: 'assets/icon-192x192.png',
            ...options
        });
        
        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        return notification;
    }
    
    // Utility methods
    showToast(message, type = 'info') {
        // Use the app's toast system if available
        if (this.app && this.app.showToast) {
            this.app.showToast(message, type);
        } else {
            // Fallback console log
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
    
    // Haptic feedback for mobile interactions
    hapticFeedback(type = 'light') {
        if (!navigator.vibrate) return;
        
        switch (type) {
            case 'light':
                navigator.vibrate(50);
                break;
            case 'medium':
                navigator.vibrate(100);
                break;
            case 'heavy':
                navigator.vibrate([100, 50, 100]);
                break;
            case 'success':
                navigator.vibrate([50, 25, 50]);
                break;
            case 'error':
                navigator.vibrate([100, 50, 100, 50, 100]);
                break;
        }
    }
    
    // Debug and diagnostics
    async generateDiagnosticReport() {
        const features = this.checkPWAFeatures();
        const storage = await this.checkStorageQuota();
        
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            online: this.isOnline,
            features,
            storage,
            serviceWorker: {
                registered: !!this.registration,
                updateAvailable: this.updateAvailable
            },
            performance: {
                memory: performance.memory ? {
                    used: performance.memory.usedJSHeapSize,
                    total: performance.memory.totalJSHeapSize,
                    limit: performance.memory.jsHeapSizeLimit
                } : null
            }
        };
        
        console.log('Diagnostic report:', report);
        return report;
    }
}
