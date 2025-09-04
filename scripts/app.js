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
        this.currentEditingTrip = null;
        this.currentEditingActivity = null;
        
        // Mobile state
        this.isMobile = window.innerWidth <= 768;
        this.activityBankOpen = false;
        
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
            // Make PWA available globally for install buttons
            window.app = this;
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            // Hide loading screen and show app
            this.hideLoadingScreen();
            // Show PWA install prompt after a delay if available
            setTimeout(() => {
                if (this.pwa && this.pwa.installPrompt) {
                    this.showToast('💡 Tip: You can install this app for offline use!', 'info');
                }
            }, 5000);
            
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
            'trip-edit-modal', 'close-trip-edit-modal', 'trip-form', 'trip-edit-title',
            'trip-name', 'trip-start', 'trip-end', 'delete-trip-btn', 'cancel-trip-btn', 'save-trip-btn',
            'activity-modal', 'close-activity-modal', 'activity-form', 'delete-activity-btn',
            'cancel-activity-btn', 'save-activity-btn',
            'menu-modal', 'close-menu-modal', 'import-btn', 'export-btn', 'share-btn',
            'sync-btn', 'settings-btn', 'file-input', 'toast-container',
            'mobile-menu-btn', 'mobile-fab', 'mobile-overlay'
        ];
        
        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
            if (!this.elements[id]) {
                console.warn(`Element with id '${id}' not found`);
            }
        });
    }
    
    setupEventListeners() {
        // Custom event listener for activity clicks
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
        
        // Trip edit modal
        if (this.elements['close-trip-edit-modal']) {
            this.elements['close-trip-edit-modal'].addEventListener('click', () => this.hideTripEditModal());
        }
        if (this.elements['cancel-trip-btn']) {
            this.elements['cancel-trip-btn'].addEventListener('click', () => this.hideTripEditModal());
        }
        if (this.elements['trip-form']) {
            this.elements['trip-form'].addEventListener('submit', (e) => this.handleTripSubmit(e));
        }
        if (this.elements['delete-trip-btn']) {
            this.elements['delete-trip-btn'].addEventListener('click', () => this.deleteCurrentTrip());
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
        const modals = ['trip-modal', 'trip-edit-modal', 'activity-modal', 'menu-modal'];
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
        
        // Mobile functionality
        if (this.elements['mobile-menu-btn']) {
            this.elements['mobile-menu-btn'].addEventListener('click', () => this.toggleActivityBank());
        }
        if (this.elements['mobile-fab']) {
            this.elements['mobile-fab'].addEventListener('click', () => this.showActivityModal());
        }
        if (this.elements['mobile-overlay']) {
            this.elements['mobile-overlay'].addEventListener('click', () => this.closeActivityBank());
        }
        
        // Handle window resize for mobile detection
        window.addEventListener('resize', () => this.handleResize());
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
    
    // Mobile Management
    handleResize() {
        const wasMobile = this.isMobile;
        this.isMobile = window.innerWidth <= 768;
        
        // If switched from mobile to desktop, close activity bank
        if (wasMobile && !this.isMobile) {
            this.closeActivityBank();
        }
    }
    
    toggleActivityBank() {
        if (this.activityBankOpen) {
            this.closeActivityBank();
        } else {
            this.openActivityBank();
        }
    }
    
    openActivityBank() {
        if (!this.elements['activity-bank'] || !this.elements['mobile-overlay'] || !this.elements['mobile-menu-btn']) return;
        
        this.activityBankOpen = true;
        this.elements['activity-bank'].classList.add('open');
        this.elements['mobile-overlay'].style.display = 'block';
        this.elements['mobile-menu-btn'].classList.add('open');
        
        // Add overlay active class after display
        setTimeout(() => {
            if (this.elements['mobile-overlay']) {
                this.elements['mobile-overlay'].classList.add('active');
            }
        }, 10);
        
        // Prevent body scroll when sidebar is open
        document.body.style.overflow = 'hidden';
    }
    
    closeActivityBank() {
        if (!this.elements['activity-bank'] || !this.elements['mobile-overlay'] || !this.elements['mobile-menu-btn']) return;
        
        this.activityBankOpen = false;
        this.elements['activity-bank'].classList.remove('open');
        this.elements['mobile-overlay'].classList.remove('active');
        this.elements['mobile-menu-btn'].classList.remove('open');
        
        // Hide overlay after transition
        setTimeout(() => {
            if (this.elements['mobile-overlay']) {
                this.elements['mobile-overlay'].style.display = 'none';
            }
        }, 300);
        
        // Restore body scroll
        document.body.style.overflow = '';
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
                // Auto-close activity bank on mobile after selecting activity
                if (this.isMobile && this.activityBankOpen) {
                    this.closeActivityBank();
                }
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
        
        // Format dates nicely
        const startDate = this.formatDisplayDate(trip.dateRange.start);
        const endDate = this.formatDisplayDate(trip.dateRange.end);
        dates.textContent = `${startDate} - ${endDate}`;
        
        info.appendChild(name);
        info.appendChild(dates);
        element.appendChild(info);
        
        // Add action buttons
        const actions = document.createElement('div');
        actions.className = 'trip-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'trip-action-btn edit-btn';
        editBtn.innerHTML = '✏️';
        editBtn.title = 'Edit Trip';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent trip selection
            this.showTripEditModal(trip);
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'trip-action-btn delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Delete Trip';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent trip selection
            this.confirmDeleteTrip(trip);
        });
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        element.appendChild(actions);
        
        // Add click handler to switch trip (only on the info area)
        info.addEventListener('click', () => this.switchTrip(trip));
        
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
    
    createNewTrip() {
        this.showTripEditModal();
    }
    
    showTripEditModal(trip = null) {
        if (!this.elements['trip-edit-modal']) return;
        
        this.currentEditingTrip = trip;
        this.populateTripForm(trip);
        this.elements['trip-edit-modal'].classList.remove('hidden');
        
        // Update modal title
        if (this.elements['trip-edit-title']) {
            this.elements['trip-edit-title'].textContent = trip ? 'Edit Trip' : 'New Trip';
        }
        
        // Focus on name field
        const nameField = this.elements['trip-name'];
        if (nameField) {
            setTimeout(() => nameField.focus(), 100);
        }
    }
    
    hideTripEditModal() {
        this.hideModal('trip-edit-modal');
        this.currentEditingTrip = null;
        this.clearTripFormErrors();
    }
    
    populateTripForm(trip) {
        const form = this.elements['trip-form'];
        if (!form) return;
        
        // Clear form and errors
        form.reset();
        this.clearTripFormErrors();
        
        if (trip) {
            // Populate with trip data
            if (this.elements['trip-name']) {
                this.elements['trip-name'].value = trip.name || '';
            }
            if (this.elements['trip-start']) {
                this.elements['trip-start'].value = trip.dateRange.start || '';
            }
            if (this.elements['trip-end']) {
                this.elements['trip-end'].value = trip.dateRange.end || '';
            }
            
            // Show delete button for existing trips
            if (this.elements['delete-trip-btn']) {
                this.elements['delete-trip-btn'].style.display = 'block';
            }
        } else {
            // Hide delete button for new trips
            if (this.elements['delete-trip-btn']) {
                this.elements['delete-trip-btn'].style.display = 'none';
            }
            
            // Set default dates (today + 7 days)
            const today = new Date().toISOString().split('T')[0];
            const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            
            if (this.elements['trip-start']) {
                this.elements['trip-start'].value = today;
            }
            if (this.elements['trip-end']) {
                this.elements['trip-end'].value = nextWeek;
            }
        }
    }
    
    async handleTripSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const tripData = Object.fromEntries(formData.entries());
        
        // Validation
        const errors = this.validateTripForm(tripData);
        if (errors.length > 0) {
            this.displayTripFormErrors(errors);
            return;
        }
        
        // Create trip object
        const trip = {
            id: this.currentEditingTrip ? this.currentEditingTrip.id : this.generateId(),
            name: tripData.name.trim(),
            dateRange: {
                start: tripData.startDate,
                end: tripData.endDate
            },
            share: this.currentEditingTrip ? this.currentEditingTrip.share : {
                mode: 'private',
                token: null,
                allowComments: false
            },
            createdAt: this.currentEditingTrip ? this.currentEditingTrip.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        try {
            await this.db.saveTrip(trip);
            
            // If this is a new trip or we're editing the current trip, switch to it
            if (!this.currentEditingTrip || this.currentEditingTrip.id === this.currentTrip?.id) {
                await this.switchTrip(trip);
            }
            
            this.hideTripEditModal();
            this.loadTripsInModal(); // Refresh the trips list
            
            const action = this.currentEditingTrip ? 'updated' : 'created';
            this.showToast(`Trip "${trip.name}" ${action} successfully`, 'success');
            
        } catch (error) {
            console.error('Failed to save trip:', error);
            this.showToast('Failed to save trip', 'error');
        }
    }
    
    validateTripForm(tripData) {
        const errors = [];
        
        if (!tripData.name || tripData.name.trim().length === 0) {
            errors.push({ field: 'name', message: 'Trip name is required' });
        }
        
        if (!tripData.startDate) {
            errors.push({ field: 'startDate', message: 'Start date is required' });
        }
        
        if (!tripData.endDate) {
            errors.push({ field: 'endDate', message: 'End date is required' });
        }
        
        // Check if end date is after start date
        if (tripData.startDate && tripData.endDate) {
            const startDate = new Date(tripData.startDate);
            const endDate = new Date(tripData.endDate);
            
            if (endDate < startDate) {
                errors.push({ field: 'endDate', message: 'End date must be after start date' });
            }
        }
        
        return errors;
    }
    
    displayTripFormErrors(errors) {
        // Clear previous errors
        this.clearTripFormErrors();
        
        errors.forEach(error => {
            const fieldMap = {
                'name': 'trip-name',
                'startDate': 'trip-start',
                'endDate': 'trip-end'
            };
            
            const fieldId = fieldMap[error.field];
            const fieldElement = document.getElementById(fieldId);
            
            if (fieldElement) {
                const formGroup = fieldElement.closest('.form-group');
                if (formGroup) {
                    formGroup.classList.add('error');
                    
                    // Add error message
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'form-error';
                    errorDiv.textContent = error.message;
                    formGroup.appendChild(errorDiv);
                }
            }
        });
    }
    
    clearTripFormErrors() {
        const formGroups = document.querySelectorAll('#trip-form .form-group');
        formGroups.forEach(group => {
            group.classList.remove('error');
            const errorDiv = group.querySelector('.form-error');
            if (errorDiv) {
                errorDiv.remove();
            }
        });
    }
    
    confirmDeleteTrip(trip) {
        const message = `Are you sure you want to delete the trip "${trip.name}"?\n\nThis action will also delete all activities in the trip and cannot be undone.`;
        
        if (confirm(message)) {
            this.deleteTrip(trip);
        }
    }
    
    async deleteTrip(trip) {
        try {
            await this.db.deleteTrip(trip.id);
            
            // If we deleted the current trip, switch to another trip or create a new one
            if (this.currentTrip && this.currentTrip.id === trip.id) {
                const remainingTrips = await this.db.getAllTrips();
                
                if (remainingTrips.length > 0) {
                    await this.switchTrip(remainingTrips[0]);
                } else {
                    // Create a default trip if no trips remain
                    const defaultTrip = {
                        id: this.generateId(),
                        name: 'My Trip',
                        dateRange: {
                            start: new Date().toISOString().split('T')[0],
                            end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                        },
                        share: { mode: 'private', token: null, allowComments: false },
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    await this.db.saveTrip(defaultTrip);
                    await this.switchTrip(defaultTrip);
                }
            }
            
            this.loadTripsInModal(); // Refresh the trips list
            this.showToast(`Trip "${trip.name}" deleted`, 'success');
            
        } catch (error) {
            console.error('Failed to delete trip:', error);
            this.showToast('Failed to delete trip', 'error');
        }
    }
    
    deleteCurrentTrip() {
        if (this.currentEditingTrip) {
            this.confirmDeleteTrip(this.currentEditingTrip);
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
            
            // Handle datetime fields - FIX timezone conversion
            if (activity.start) {
                const startInput = document.getElementById('activity-start');
                if (startInput) {
                    // Convert UTC time back to local datetime-local format
                    const startDate = new Date(activity.start);
                    // Format: YYYY-MM-DDTHH:MM
                    const year = startDate.getFullYear();
                    const month = String(startDate.getMonth() + 1).padStart(2, '0');
                    const day = String(startDate.getDate()).padStart(2, '0');
                    const hours = String(startDate.getHours()).padStart(2, '0');
                    const minutes = String(startDate.getMinutes()).padStart(2, '0');
                    const localStartString = `${year}-${month}-${day}T${hours}:${minutes}`;
                    
                    console.log(`Setting start time: ${activity.start} -> ${localStartString}`);
                    startInput.value = localStartString;
                }
            }
            
            if (activity.end) {
                const endInput = document.getElementById('activity-end');
                if (endInput) {
                    // Convert UTC time back to local datetime-local format
                    const endDate = new Date(activity.end);
                    const year = endDate.getFullYear();
                    const month = String(endDate.getMonth() + 1).padStart(2, '0');
                    const day = String(endDate.getDate()).padStart(2, '0');
                    const hours = String(endDate.getHours()).padStart(2, '0');
                    const minutes = String(endDate.getMinutes()).padStart(2, '0');
                    const localEndString = `${year}-${month}-${day}T${hours}:${minutes}`;
                    
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
            locationUrl: activityData.locationUrl || '',  // FIXED: use correct field name
            openingHours: activityData.openingHours || '',    // FIXED: use correct field name
            start: null,
            end: null,
            tags: activityData.tags,
            notes: activityData.notes || '',
            links: [],
            attachments: [],
            source: 'bank' // Default to bank, will update below
        };
        
        // Handle datetime fields - FIX timezone conversion properly
        if (activityData.start) {
            // datetime-local gives us a string like "2025-10-14T09:30"
            // We need to treat this as local time, not convert it
            const localDateStr = activityData.start;
            if (localDateStr.length === 16) { // "YYYY-MM-DDTHH:MM" format
                activity.start = new Date(localDateStr).toISOString();
            }
        }
        
        if (activityData.end) {
            // datetime-local gives us a string like "2025-10-14T10:30"
            const localDateStr = activityData.end;
            if (localDateStr.length === 16) { // "YYYY-MM-DDTHH:MM" format
                activity.end = new Date(localDateStr).toISOString();
            }
        }
        
        // Smart source detection: if has date/time → calendar, otherwise → bank
if (this.currentEditingActivity) {
    // For edited activities: check if they should change source based on new data
    const hadDateTime = this.currentEditingActivity.start && this.currentEditingActivity.end;
    const hasDateTime = activity.start && activity.end;
    
    if (hadDateTime && !hasDateTime) {
        // Had time before, now doesn't - move to bank
        activity.source = 'bank';
    } else if (!hadDateTime && hasDateTime) {
        // Didn't have time before, now does - move to calendar
        activity.source = 'calendar';
    } else {
        // Keep existing source
        activity.source = this.currentEditingActivity.source;
    }
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
    formatDisplayDate(dateString) {
        if (!dateString) return '';
        
        // Parse as local date without timezone conversion
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        
        return date.toLocaleDateString('en-US');
    }
    
    hideModal(modalId) {
        if (this.elements[modalId]) {
            this.elements[modalId].classList.add('hidden');
        }
        
        // Special cleanup for specific modals
        if (modalId === 'trip-edit-modal') {
            this.currentEditingTrip = null;
            this.clearTripFormErrors();
        }
        
        if (modalId === 'activity-modal') {
            this.currentEditingActivity = null;
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
        
        // Add haptic feedback for mobile
        if (this.pwa && this.pwa.hapticFeedback) {
            this.pwa.hapticFeedback(type === 'success' ? 'success' : type === 'error' ? 'error' : 'light');
        }
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 3000);
        
        // Link PWA manager back to app
        if (this.pwa && this.pwa.showToast) {
            this.pwa.app = this;
        }
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
                const openModals = ['trip-modal', 'trip-edit-modal', 'activity-modal', 'menu-modal'];
                const openModal = openModals.find(modalId => 
                    this.elements[modalId] && !this.elements[modalId].classList.contains('hidden')
                );
                if (openModal) {
                    this.hideModal(openModal);
                } else if (this.isMobile && this.activityBankOpen) {
                    // Close activity bank on mobile if open
                    this.closeActivityBank();
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
        // All day event - use sensible default time based on current time or 9 AM
        const startDate = this.calendar.parseDateFromStorage(date);
        console.log('Parsed start date (all day):', startDate);
        
        const now = new Date();
        const defaultHour = now.getHours() >= 9 && now.getHours() <= 20 ? now.getHours() : 9;
        
        startDate.setHours(defaultHour, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setHours(defaultHour + 1, 0, 0, 0); // Default 1 hour
        
        activity.start = startDate.toISOString();
        activity.end = endDate.toISOString();
    }
    
    console.log('Final activity start:', activity.start);
    console.log('Final activity end:', activity.end);
    
    try {
        await this.db.saveActivity(activity);
        await this.loadTripActivities();
        await this.renderCalendar();
        
        // Show helpful message
        const timeStr = time ? `at ${time}` : `at ${new Date(activity.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
        this.showToast(`"${activity.title}" scheduled for ${date} ${timeStr}`, 'success');
        
    } catch (error) {
        console.error('Failed to move activity to calendar:', error);
        this.showToast('Failed to move activity', 'error');
    }
}
// Initialize app when script loads
const app = new TripPlannerApp();

// Export for potential use by other modules
export { TripPlannerApp };
