// app.js - Main Application Entry Point
import { TripDatabase } from './db.js';
import { CalendarManager } from './calendar.js';
import { DragDropManager } from './dnd.js';
import { PWAManager } from './pwa.js';

class TripPlannerApp {
    constructor() {
        this.db = new TripDatabase();
        this.calendar = new CalendarManager();
        this.dragDrop = new DragDropManager();
        this.pwa = new PWAManager();
        
        // App state
        this.currentTrip = null;
        this.currentView = 'day';
        this.currentDate = new Date();
        this.activities = [];
        this.bankActivities = [];
        
        // DOM elements
        this.elements = {};
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('Initializing Trip Planner App...');
        
        try {
            // Cache DOM elements
            this.cacheElements();
            
            // Initialize database
            await this.db.init();
            
            // Initialize components
            await this.calendar.init(this.currentDate, this.currentView);
            this.dragDrop.init(this);
            this.pwa.init();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to load app', 'error');
        }
    }
    
    cacheElements() {
        const elementIds = [
            'app', 'loading-screen', 'trip-selector-btn', 'current-trip-name',
            'day-view', 'week-view', 'month-view', 'today-btn', 'prev-btn', 'next-btn',
            'menu-btn', 'activity-bank', 'bank-activities', 'bank-empty', 'add-activity-btn',
            'calendar-title', 'day-view-container', 'week-view-container', 'month-view-container',
            'trip-modal', 'close-trip-modal', 'trips-list', 'new-trip-btn',
            'activity-modal', 'close-activity-modal', 'activity-form', 'delete-activity-btn',
            'cancel-activity-btn', 'save-activity-btn',
            'menu-modal', 'close-menu-modal', 'import-btn', 'export-btn', 'share-btn',
            'sync-btn', 'settings-btn', 'file-input', 'toast-container'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id]) {
                console.warn(`Element with id '${id}' not found`);
            }
        });
    }
    
    setupEventListeners() {
         // Custom event listener for activity clicks (ADD THIS)
    document.addEventListener('activityClick', (e) => {
        const activity = e.detail.activity;
        this.showActivityModal(activity);
    });
        
        // View switcher
        const viewButtons = ['day-view', 'week-view', 'month-view'];
        viewButtons.forEach(id => {
            if (this.elements[id]) {
                this.elements[id].addEventListener('click', (e) => {
                    const view = e.target.dataset.view;
                    this.switchView(view);
                });
            }
        });
        
        // Navigation
        if (this.elements['today-btn']) {
            this.elements['today-btn'].addEventListener('click', () => this.goToToday());
        }
        if (this.elements['prev-btn']) {
            this.elements['prev-btn'].addEventListener('click', () => this.navigatePrevious());
        }
        if (this.elements['next-btn']) {
            this.elements['next-btn'].addEventListener('click', () => this.navigateNext());
        }
        
        // Trip management
        if (this.elements['trip-selector-btn']) {
            this.elements['trip-selector-btn'].addEventListener('click', () => this.showTripModal());
        }
        if (this.elements['close-trip-modal']) {
            this.elements['close-trip-modal'].addEventListener('click', () => this.hideTripModal());
        }
        if (this.elements['new-trip-btn']) {
            this.elements['new-trip-btn'].addEventListener('click', () => this.createNewTrip());
        }
        
        // Activity management
        if (this.elements['add-activity-btn']) {
            this.elements['add-activity-btn'].addEventListener('click', () => this.showActivityModal());
        }
        if (this.elements['close-activity-modal']) {
            this.elements['close-activity-modal'].addEventListener('click', () => this.hideActivityModal());
        }
        if (this.elements['cancel-activity-btn']) {
            this.elements['cancel-activity-btn'].addEventListener('click', () => this.hideActivityModal());
        }
        if (this.elements['activity-form']) {
            this.elements['activity-form'].addEventListener('submit', (e) => this.handleActivitySubmit(e));
        }
        if (this.elements['delete-activity-btn']) {
            this.elements['delete-activity-btn'].addEventListener('click', () => this.deleteCurrentActivity());
        }
        
        // Menu
        if (this.elements['menu-btn']) {
            this.elements['menu-btn'].addEventListener('click', () => this.showMenuModal());
        }
        if (this.elements['close-menu-modal']) {
            this.elements['close-menu-modal'].addEventListener('click', () => this.hideMenuModal());
        }
        
        // Import/Export
        if (this.elements['import-btn']) {
            this.elements['import-btn'].addEventListener('click', () => this.importData());
        }
        if (this.elements['export-btn']) {
            this.elements['export-btn'].addEventListener('click', () => this.exportData());
        }
        if (this.elements['file-input']) {
            this.elements['file-input'].addEventListener('change', (e) => this.handleFileImport(e));
        }
        
        // Share and sync
        if (this.elements['share-btn']) {
            this.elements['share-btn'].addEventListener('click', () => this.shareTrip());
        }
        if (this.elements['sync-btn']) {
            this.elements['sync-btn'].addEventListener('click', () => this.toggleSync());
        }
        
        // Modal close on backdrop click
        const modals = ['trip-modal', 'activity-modal', 'menu-modal'];
        modals.forEach(modalId => {
            if (this.elements[modalId]) {
                this.elements[modalId].addEventListener('click', (e) => {
                    if (e.target === this.elements[modalId]) {
                        this.hideModal(modalId);
                    }
                });
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }
    
    async loadInitialData() {
        try {
            // Load or create default trip
            const trips = await this.db.getAllTrips();
            
            if (trips.length === 0) {
                // Create a default trip
                const defaultTrip = {
                    id: this.generateId(),
                    name: 'My First Trip',
                    dateRange: {
                        start: new Date().toISOString().split('T')[0],
                        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                    },
                    share: { mode: 'private', token: null, allowComments: false },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                await this.db.saveTrip(defaultTrip);
                this.currentTrip = defaultTrip;
            } else {
                this.currentTrip = trips[0];
            }
            
            // Update UI with current trip
            this.updateCurrentTripDisplay();
            
            // Load activities for current trip
            await this.loadTripActivities();
            
            // Render initial calendar view
            await this.renderCalendar();
            
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load trip data', 'error');
        }
    }
    
    async loadTripActivities() {
        if (!this.currentTrip) return;
        
        try {
            this.activities = await this.db.getActivitiesByTrip(this.currentTrip.id);
            this.bankActivities = this.activities.filter(activity => activity.source === 'bank');
            
            this.renderActivityBank();
        } catch (error) {
            console.error('Failed to load activities:', error);
            this.showToast('Failed to load activities', 'error');
        }
    }
    
    hideLoadingScreen() {
        if (this.elements['loading-screen']) {
            this.elements['loading-screen'].classList.add('hidden');
        }
        if (this.elements['app']) {
            this.elements['app'].classList.remove('hidden');
        }
    }
    
    // View Management
    switchView(view) {
        this.currentView = view;
        
        // Update view buttons
        const viewButtons = ['day-view', 'week-view', 'month-view'];
        viewButtons.forEach(id => {
            if (this.elements[id]) {
                this.elements[id].classList.toggle('active', id === `${view}-view`);
            }
        });
        
        // Show/hide view containers
        const containers = ['day-view-container', 'week-view-container', 'month-view-container'];
        containers.forEach(id => {
            if (this.elements[id]) {
                this.elements[id].classList.toggle('hidden', id !== `${view}-view-container`);
            }
        });
        
        // Re-render calendar for new view
        this.calendar.setView(view);
        this.renderCalendar();
    }
    
    goToToday() {
        this.currentDate = new Date();
        this.calendar.setDate(this.currentDate);
        this.renderCalendar();
    }
    
    navigatePrevious() {
        this.calendar.navigatePrevious();
        this.currentDate = this.calendar.getCurrentDate();
        this.renderCalendar();
    }
    
    navigateNext() {
        this.calendar.navigateNext();
        this.currentDate = this.calendar.getCurrentDate();
        this.renderCalendar();
    }
    
    async renderCalendar() {
    try {
        // Update calendar title
        const title = this.calendar.getDisplayTitle();
        if (this.elements['calendar-title']) {
            this.elements['calendar-title'].textContent = title;
        }
        
        // Render the current view
        const calendarActivities = this.activities.filter(activity => activity.source === 'calendar');
        await this.calendar.render(calendarActivities);
        
        // Setup drag and drop for ALL rendered activities (IMPORTANT FIX)
        this.dragDrop.setupCalendarDropZones();
        this.setupCalendarActivityDraggers(); // NEW LINE
        
    } catch (error) {
        console.error('Failed to render calendar:', error);
        this.showToast('Failed to update calendar', 'error');
    }
}

// הוסף פונקציה חדשה:
setupCalendarActivityDraggers() {
    // Setup draggers for all calendar activities
    const calendarActivities = document.querySelectorAll('.calendar-activity');
    calendarActivities.forEach(element => {
        this.dragDrop.setupDragElement(element);
    });
}
    
    // Activity Bank Management
    renderActivityBank() {
        if (!this.elements['bank-activities'] || !this.elements['bank-empty']) return;
        
        const bankContainer = this.elements['bank-activities'];
        bankContainer.innerHTML = '';
        
        if (this.bankActivities.length === 0) {
            this.elements['bank-empty'].classList.remove('hidden');
        } else {
            this.elements['bank-empty'].classList.add('hidden');
            
            this.bankActivities.forEach(activity => {
                const activityElement = this.createActivityElement(activity);
                bankContainer.appendChild(activityElement);
            });
        }
        
        // Setup drag and drop
        this.dragDrop.setupBankDraggers();
    }
    
    createActivityElement(activity) {
        const element = document.createElement('div');
        element.className = 'activity-item';
        element.draggable = true;
        element.dataset.activityId = activity.id;
        
        const title = document.createElement('div');
        title.className = 'activity-title';
        title.textContent = activity.title;
        
        const meta = document.createElement('div');
        meta.className = 'activity-meta';
        
        if (activity.start && activity.end) {
            const startTime = new Date(activity.start).toLocaleTimeString('en-US', { 
                hour: 'numeric', minute: '2-digit' 
            });
            const endTime = new Date(activity.end).toLocaleTimeString('en-US', { 
                hour: 'numeric', minute: '2-digit' 
            });
            meta.textContent = `${startTime} - ${endTime}`;
        }
        
        if (activity.tags && activity.tags.length > 0) {
            const tagsContainer = document.createElement('div');
            tagsContainer.className = 'activity-tags';
            
            activity.tags.slice(0, 3).forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'activity-tag';
                tagElement.textContent = tag;
                tagsContainer.appendChild(tagElement);
            });
            
            element.appendChild(tagsContainer);
        }
        
        element.appendChild(title);
        element.appendChild(meta);
        
        // Add click handler to open details
        element.addEventListener('click', (e) => {
            if (!e.target.closest('.dragging')) {
                this.showActivityModal(activity);
            }
        });
        
        return element;
    }
    
    // Trip Management
    updateCurrentTripDisplay() {
        if (this.elements['current-trip-name'] && this.currentTrip) {
            this.elements['current-trip-name'].textContent = this.currentTrip.name;
        }
    }
    
    showTripModal() {
        if (this.elements['trip-modal']) {
            this.elements['trip-modal'].classList.remove('hidden');
            this.loadTripsInModal();
        }
    }
    
    hideTripModal() {
        this.hideModal('trip-modal');
    }
    
    async loadTripsInModal() {
        if (!this.elements['trips-list']) return;
        
        try {
            const trips = await this.db.getAllTrips();
            const listContainer = this.elements['trips-list'];
            listContainer.innerHTML = '';
            
            trips.forEach(trip => {
                const tripElement = this.createTripElement(trip);
                listContainer.appendChild(tripElement);
            });
        } catch (error) {
            console.error('Failed to load trips:', error);
            this.showToast('Failed to load trips', 'error');
        }
    }
    
    createTripElement(trip) {
        const element = document.createElement('div');
        element.className = 'trip-item';
        if (this.currentTrip && trip.id === this.currentTrip.id) {
            element.classList.add('active');
        }
        
        const info = document.createElement('div');
        info.className = 'trip-info';
        
        const name = document.createElement('h4');
        name.textContent = trip.name;
        
        const dates = document.createElement('div');
        dates.className = 'trip-dates';
        dates.textContent = `${trip.dateRange.start} - ${trip.dateRange.end}`;
        
        info.appendChild(name);
        info.appendChild(dates);
        element.appendChild(info);
        
        // Add click handler to switch trip
        element.addEventListener('click', () => this.switchTrip(trip));
        
        return element;
    }
    
    async switchTrip(trip) {
        this.currentTrip = trip;
        this.updateCurrentTripDisplay();
        await this.loadTripActivities();
        await this.renderCalendar();
        this.hideTripModal();
        this.showToast(`Switched to ${trip.name}`, 'success');
    }
    
    async createNewTrip() {
        const name = prompt('Enter trip name:');
        if (!name) return;
        
        const startDate = prompt('Start date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!startDate) return;
        
        const endDate = prompt('End date (YYYY-MM-DD):', 
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        if (!endDate) return;
        
        const newTrip = {
            id: this.generateId(),
            name: name.trim(),
            dateRange: { start: startDate, end: endDate },
            share: { mode: 'private', token: null, allowComments: false },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        try {
            await this.db.saveTrip(newTrip);
            await this.switchTrip(newTrip);
            this.showToast(`Created ${newTrip.name}`, 'success');
        } catch (error) {
            console.error('Failed to create trip:', error);
            this.showToast('Failed to create trip', 'error');
        }
    }
    
    // Activity Management
    showActivityModal(activity = null) {
        if (!this.elements['activity-modal']) return;
        
        this.currentEditingActivity = activity;
        this.populateActivityForm(activity);
        this.elements['activity-modal'].classList.remove('hidden');
        
        // Focus on title field
        const titleField = document.getElementById('activity-title');
        if (titleField) {
            setTimeout(() => titleField.focus(), 100);
        }
    }
    
    hideActivityModal() {
        this.hideModal('activity-modal');
        this.currentEditingActivity = null;
    }
    
    populateActivityForm(activity) {
    const form = this.elements['activity-form'];
    if (!form) return;
    
    // Clear form
    form.reset();
    
    // Debug logging
    console.log('Populating form with activity:', activity);
    
    if (activity) {
        // Populate with activity data - Fix field name mapping
        const fieldMap = {
            'title': 'activity-title',
            'description': 'activity-description', 
            'locationUrl': 'activity-location',  // Fix: HTML field is 'activity-location'
            'openingHours': 'activity-hours',    // Fix: HTML field is 'activity-hours'
            'notes': 'activity-notes'
        };
        
        Object.entries(fieldMap).forEach(([activityField, inputId]) => {
            const input = document.getElementById(inputId);
            if (input && activity[activityField] !== undefined && activity[activityField] !== null) {
                console.log(`Setting ${inputId} = ${activity[activityField]}`);
                input.value = activity[activityField];
            }
        });
        
        // Handle datetime fields - FIX timezone issue
        if (activity.start) {
            const startInput = document.getElementById('activity-start');
            if (startInput) {
                // Convert to local time for datetime-local input
                const startDate = new Date(activity.start);
                const localStart = new Date(startDate.getTime() - startDate.getTimezoneOffset() * 60000);
                const localStartString = localStart.toISOString().slice(0, 16);
                console.log(`Setting start time: ${activity.start} -> ${localStartString}`);
                startInput.value = localStartString;
            }
        }
        
        if (activity.end) {
            const endInput = document.getElementById('activity-end');
            if (endInput) {
                // Convert to local time for datetime-local input
                const endDate = new Date(activity.end);
                const localEnd = new Date(endDate.getTime() - endDate.getTimezoneOffset() * 60000);
                const localEndString = localEnd.toISOString().slice(0, 16);
                console.log(`Setting end time: ${activity.end} -> ${localEndString}`);
                endInput.value = localEndString;
            }
        }
        
        // Handle tags
        if (activity.tags && Array.isArray(activity.tags)) {
            const tagsInput = document.getElementById('activity-tags');
            if (tagsInput) {
                const tagsString = activity.tags.join(', ');
                console.log(`Setting tags: ${tagsString}`);
                tagsInput.value = tagsString;
            }
        }
        
        // Show delete button for existing activities
        if (this.elements['delete-activity-btn']) {
            this.elements['delete-activity-btn'].style.display = 'block';
        }
    } else {
        console.log('Creating new activity - form cleared');
        // Hide delete button for new activities
        if (this.elements['delete-activity-btn']) {
            this.elements['delete-activity-btn'].style.display = 'none';
        }
    }
}
    
   async handleActivitySubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const activityData = Object.fromEntries(formData.entries());
    
    // Debug logging to see what we're getting from the form
    console.log('Form data received:', activityData);
    
    // Process tags
    if (activityData.tags) {
        activityData.tags = activityData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    } else {
        activityData.tags = [];
    }
    
    // Create activity object
    const activity = {
        id: this.currentEditingActivity ? this.currentEditingActivity.id : this.generateId(),
        tripId: this.currentTrip.id,
        title: activityData.title || '',
        description: activityData.description || '',
        locationUrl: activityData.location || '',  // Note: form field is 'location'
        openingHours: activityData.hours || '',    // Note: form field is 'hours'
        start: null,
        end: null,
        tags: activityData.tags,
        notes: activityData.notes || '',
        links: [],
        attachments: [],
        source: 'bank' // Default to bank, will update below
    };
    
    // Handle datetime fields - FIX timezone conversion
    if (activityData.start) {
        // The datetime-local value is in local time, convert to UTC for storage
        const localDate = new Date(activityData.start);
        activity.start = localDate.toISOString();
    }
    
    if (activityData.end) {
        // The datetime-local value is in local time, convert to UTC for storage
        const localDate = new Date(activityData.end);
        activity.end = localDate.toISOString();
    }
    
    // Smart source detection: if has date/time → calendar, otherwise → bank
    if (this.currentEditingActivity) {
        // Keep existing source for edited activities
        activity.source = this.currentEditingActivity.source;
    } else {
        // For new activities: if has both start and end time → calendar, otherwise → bank
        activity.source = (activity.start && activity.end) ? 'calendar' : 'bank';
    }
    
    // Debug logging to see final activity object
    console.log('Final activity object:', activity);
    
    try {
        await this.db.saveActivity(activity);
        
        // Update local activities array
        if (this.currentEditingActivity) {
            const index = this.activities.findIndex(a => a.id === activity.id);
            if (index !== -1) {
                this.activities[index] = activity;
            } else {
                this.activities.push(activity);
            }
        } else {
            this.activities.push(activity);
        }
        
        // Update bankActivities array if needed
        this.bankActivities = this.activities.filter(a => a.source === 'bank');
        
        // Refresh UI
        this.renderActivityBank();
        await this.renderCalendar();
        
        this.hideActivityModal();
        this.showToast('Activity saved successfully', 'success');
        
    } catch (error) {
        console.error('Failed to save activity:', error);
        this.showToast('Failed to save activity', 'error');
    }
}
    
    async deleteCurrentActivity() {
        if (!this.currentEditingActivity) return;
        
        if (!confirm('Are you sure you want to delete this activity?')) {
            return;
        }
        
        try {
            await this.db.deleteActivity(this.currentEditingActivity.id);
            
            // Remove from local arrays
            this.activities = this.activities.filter(a => a.id !== this.currentEditingActivity.id);
            this.bankActivities = this.bankActivities.filter(a => a.id !== this.currentEditingActivity.id);
            
            // Refresh UI
            this.renderActivityBank();
            await this.renderCalendar();
            
            this.hideActivityModal();
            this.showToast('Activity deleted', 'success');
            
        } catch (error) {
            console.error('Failed to delete activity:', error);
            this.showToast('Failed to delete activity', 'error');
        }
    }
    
    // Menu and Actions
    showMenuModal() {
        if (this.elements['menu-modal']) {
            this.elements['menu-modal'].classList.remove('hidden');
        }
    }
    
    hideMenuModal() {
        this.hideModal('menu-modal');
    }
    
    // Import/Export
    importData() {
        if (this.elements['file-input']) {
            this.elements['file-input'].click();
        }
    }
    
    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                let data;
                if (file.name.endsWith('.json')) {
                    data = JSON.parse(event.target.result);
                    await this.importJSON(data);
                } else if (file.name.endsWith('.csv')) {
                    await this.importCSV(event.target.result);
                } else {
                    this.showToast('Unsupported file format', 'error');
                    return;
                }
                
                this.showToast('Import completed', 'success');
                await this.loadTripActivities();
                await this.renderCalendar();
                
            } catch (error) {
                console.error('Import failed:', error);
                this.showToast('Import failed', 'error');
            }
        };
        
        reader.readAsText(file);
        e.target.value = ''; // Reset file input
    }
    
    async importJSON(data) {
        // Import trip data
        if (data.trip) {
            data.trip.id = this.generateId();
            
            // Handle sharing settings to avoid shareToken conflicts
            if (data.trip.share && data.trip.share.mode !== 'private') {
                // Generate new shareToken if trip was shared
                data.trip.share.token = this.generateShareToken();
            } else {
                // Reset to private if wasn't shared
                data.trip.share = {
                    mode: 'private',
                    token: null,
                    allowComments: false
                };
            }
            
            // Update timestamps
            data.trip.updatedAt = new Date().toISOString();
            
            await this.db.saveTrip(data.trip);
        }
        
        // Import activities
        if (data.activities && Array.isArray(data.activities)) {
            const tripId = data.trip ? data.trip.id : this.currentTrip.id;
            
            for (const activity of data.activities) {
                activity.id = this.generateId();
                activity.tripId = tripId;
                activity.updatedAt = new Date().toISOString();
                await this.db.saveActivity(activity);
            }
        }
    }
    
    async importCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) {
            throw new Error('CSV must have header row and at least one data row');
        }
        
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const activity = {
                id: this.generateId(),
                tripId: this.currentTrip.id,
                title: '',
                description: '',
                locationUrl: '',
                openingHours: '',
                start: null,
                end: null,
                tags: [],
                notes: '',
                links: [],
                attachments: [],
                source: 'bank'
            };
            
            // Map CSV columns to activity fields
            headers.forEach((header, index) => {
                const value = values[index] || '';
                
                switch (header.toLowerCase()) {
                    case 'title':
                        activity.title = value;
                        break;
                    case 'description':
                        activity.description = value;
                        break;
                    case 'locationurl':
                    case 'location':
                        activity.locationUrl = value;
                        break;
                    case 'openinghours':
                    case 'hours':
                        activity.openingHours = value;
                        break;
                    case 'starttime':
                    case 'start':
                        if (value) activity.start = new Date(value).toISOString();
                        break;
                    case 'endtime':
                    case 'end':
                        if (value) activity.end = new Date(value).toISOString();
                        break;
                    case 'tags':
                        if (value) activity.tags = value.split(';').map(t => t.trim());
                        break;
                    case 'notes':
                        activity.notes = value;
                        break;
                }
            });
            
            if (activity.title) {
                await this.db.saveActivity(activity);
            }
        }
    }
    
    async exportData() {
        if (!this.currentTrip) return;
        
        try {
            const tripData = {
                trip: this.currentTrip,
                activities: this.activities,
                exportedAt: new Date().toISOString()
            };
            
            const jsonData = JSON.stringify(tripData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentTrip.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            URL.revokeObjectURL(url);
            
            this.showToast('Export completed', 'success');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Export failed', 'error');
        }
    }
    
    // Sharing
    async shareTrip() {
        if (!this.currentTrip) return;
        
        // Generate share token if not exists
        if (!this.currentTrip.share.token) {
            this.currentTrip.share.token = this.generateShareToken();
            this.currentTrip.share.mode = 'view';
            this.currentTrip.share.allowComments = true;
            this.currentTrip.updatedAt = new Date().toISOString();
            
            await this.db.saveTrip(this.currentTrip);
        }
        
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${this.currentTrip.share.token}`;
        
        try {
            await navigator.clipboard.writeText(shareUrl);
            this.showToast('Share link copied to clipboard', 'success');
        } catch (error) {
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            this.showToast('Share link copied', 'success');
        }
    }
    
    // Sync placeholder
    async toggleSync() {
        this.showToast('Cloud sync coming soon!', 'warning');
    }
    
    // Utility Methods
    hideModal(modalId) {
        if (this.elements[modalId]) {
            this.elements[modalId].classList.add('hidden');
        }
    }
    
    generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
    
    generateShareToken() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16)), 
            b => b.toString(16).padStart(2, '0')).join('');
    }
    
    showToast(message, type = 'info') {
        if (!this.elements['toast-container']) return;
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.elements['toast-container'].appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
    }
    
    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when no modals are open and not in input fields
        if (document.querySelector('.modal:not(.hidden)') || 
            e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (e.key.toLowerCase()) {
            case 'd':
                e.preventDefault();
                this.switchView('day');
                break;
            case 'w':
                e.preventDefault();
                this.switchView('week');
                break;
            case 'm':
                e.preventDefault();
                this.switchView('month');
                break;
            case 'n':
                e.preventDefault();
                this.showActivityModal();
                break;
            case 't':
                e.preventDefault();
                this.goToToday();
                break;
            case 'arrowleft':
                e.preventDefault();
                this.navigatePrevious();
                break;
            case 'arrowright':
                e.preventDefault();
                this.navigateNext();
                break;
            case '/':
                e.preventDefault();
                // TODO: Implement search
                break;
            case 'escape':
                // Close any open modal
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    openModal.classList.add('hidden');
                }
                break;
        }
    }
    
    // Public API for drag and drop
    async moveActivityToBank(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) return;
        
        activity.source = 'bank';
        activity.start = null;
        activity.end = null;
        
        try {
            await this.db.saveActivity(activity);
            await this.loadTripActivities();
            await this.renderCalendar();
        } catch (error) {
            console.error('Failed to move activity to bank:', error);
            this.showToast('Failed to move activity', 'error');
        }
    }
    
    async moveActivityToCalendar(activityId, date, time = null) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) return;
        
        console.log(`Moving activity "${activity.title}" to date: ${date}, time: ${time}`);
        
        activity.source = 'calendar';
        
        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            const startDate = this.calendar.parseDateFromStorage(date);
            console.log('Parsed start date (before setting time):', startDate);
            startDate.setHours(hours, minutes, 0, 0);
            console.log('Start date (after setting time):', startDate);
            
            const endDate = new Date(startDate);
            endDate.setHours(hours + 1, minutes, 0, 0); // Default 1 hour duration
            
            activity.start = startDate.toISOString();
            activity.end = endDate.toISOString();
        } else {
            // All day event
            const startDate = this.calendar.parseDateFromStorage(date);
            console.log('Parsed start date (all day):', startDate);
            startDate.setHours(9, 0, 0, 0); // Default 9 AM
            const endDate = new Date(startDate);
            endDate.setHours(10, 0, 0, 0); // Default 1 hour
            
            activity.start = startDate.toISOString();
            activity.end = endDate.toISOString();
        }
        
        console.log('Final activity start:', activity.start);
        console.log('Final activity end:', activity.end);
        
        try {
            await this.db.saveActivity(activity);
            await this.loadTripActivities();
            await this.renderCalendar();
        } catch (error) {
            console.error('Failed to move activity to calendar:', error);
            this.showToast('Failed to move activity', 'error');
        }
    }
} // End of TripPlannerApp class

// Initialize app when script loads
const app = new TripPlannerApp();

// Export for potential use by other modules
export { TripPlannerApp };
