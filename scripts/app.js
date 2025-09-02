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
            
            // Setup drag and drop for the rendered activities
            this.dragDrop.setupCalendarDropZones();
            
        } catch (error) {
            console.error('Failed to render calendar:', error);
            this.showToast('Failed to update calendar', 'error');
        }
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
        
        if (activity) {
            // Populate with activity data
            const fields = [
                'title', 'description', 'locationUrl', 'openingHours', 'notes'
            ];
            
            fields.forEach(field => {
                const input = document.getElementById(`activity-${field}`);
                if (input && activity[field]) {
                    input.value = activity[field];
                }
            });
            
            // Handle datetime fields
            if (activity.start) {
                const startInput = document.getElementById('activity-start');
                if (startInput) {
                    startInput.value = new Date(activity.start).toISOString().slice(0, 16);
                }
            }
            
            if (activity.end) {
                const endInput = document.getElementById('activity-end');
                if (endInput) {
                    endInput.value = new Date(activity.end).toISOString().slice(0, 16);
                }
            }
            
            // Handle tags
            if (activity.tags) {
                const tagsInput = document.getElementById('activity-tags');
                if (tagsInput) {
                    tagsInput.value = activity.tags.join(', ');
                }
            }
            
            // Show delete button for existing activities
            if (this.elements['delete-activity-btn']) {
                this.elements['delete-activity-btn'].style.display = 'block';
            }
        } else {
            // Hide delete button for new activities
            if (this.elements['delete-activity-btn']) {
                this.elements['delete-activity-btn'].style.display = 'none';
            }
        }
    }
    
    async handleActivitySubmit(e) {
        e.preventDefault()
