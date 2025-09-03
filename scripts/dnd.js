// dnd.js - Drag and Drop Management
export class DragDropManager {
    constructor() {
        this.app = null;
        this.draggedElement = null;
        this.draggedActivity = null;
        this.isDragging = false;
        this.dropZones = [];
        
        // Touch support
        this.touchStartPos = { x: 0, y: 0 };
        this.touchDragThreshold = 10;
        
        // Bound event handlers for proper cleanup
        this.boundHandlers = {
            dragOver: this.handleDragOver.bind(this),
            dragEnter: this.handleDragEnter.bind(this),
            dragLeave: this.handleDragLeave.bind(this),
        };
    }
    
    init(app) {
        this.app = app;
        console.log('Drag and drop manager initialized');
    }
    
    setupBankDraggers() {
        const bankActivities = document.querySelectorAll('#bank-activities .activity-item');
        
        bankActivities.forEach(element => {
            this.setupDragElement(element);
        });
    }
    
    setupCalendarDropZones() {
    // Remove existing drop zone listeners safely
    this.cleanupDropZones();
    
    // Setup new drop zones based on current view
    const view = this.app.currentView;
    
    switch (view) {
        case 'day':
            this.setupDayDropZones();
            break;
        case 'week':
            this.setupWeekDropZones();
            break;
        case 'month':
            this.setupMonthDropZones();
            break;
    }
    
    // Setup calendar activity draggers - IMPROVED VERSION
    this.setupAllCalendarActivityDraggers();
    
    // Setup bank as drop zone for returning activities
    const bankContainer = document.getElementById('bank-activities');
    if (bankContainer) {
        this.setupDropZone(bankContainer, this.handleBankDrop.bind(this));
    }
}

// הוסף פונקציה חדשה:
setupAllCalendarActivityDraggers() {
    const calendarActivities = document.querySelectorAll('.calendar-activity, .month-activity');
    calendarActivities.forEach(element => {
        // Remove existing listeners to avoid duplicates
        if (element._dragHandlers) {
            this.removeDragListeners(element);
        }
        this.setupDragElement(element);
    });
}
    
    cleanupDropZones() {
        // Safely remove event listeners from existing drop zones
        this.dropZones.forEach(zone => {
            if (zone && zone.parentNode) {
                this.removeDragListeners(zone);
            }
        });
        this.dropZones = [];
    }
    
    setupDayDropZones() {
        const dayActivities = document.getElementById('day-activities');
        if (!dayActivities) return;
        
        const timeSlots = dayActivities.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            this.setupDropZone(slot, this.handleCalendarDrop.bind(this));
        });
    }
    
    setupWeekDropZones() {
        const weekColumns = document.querySelectorAll('.week-day-column .time-slot');
        weekColumns.forEach(slot => {
            this.setupDropZone(slot, this.handleCalendarDrop.bind(this));
        });
    }
    
    setupMonthDropZones() {
        const monthDays = document.querySelectorAll('.month-day');
        monthDays.forEach(day => {
            this.setupDropZone(day, this.handleCalendarDrop.bind(this));
        });
    }
    
    setupDragElement(element) {
        if (!element) return;
        
        // Store reference to bound handlers for cleanup
        element._dragHandlers = {
            dragStart: this.handleDragStart.bind(this),
            dragEnd: this.handleDragEnd.bind(this),
            touchStart: this.handleTouchStart.bind(this),
            touchMove: this.handleTouchMove.bind(this),
            touchEnd: this.handleTouchEnd.bind(this)
        };
        
        // Mouse events
        element.addEventListener('dragstart', element._dragHandlers.dragStart);
        element.addEventListener('dragend', element._dragHandlers.dragEnd);
        
        // Touch events for mobile
        element.addEventListener('touchstart', element._dragHandlers.touchStart, { passive: false });
        element.addEventListener('touchmove', element._dragHandlers.touchMove, { passive: false });
        element.addEventListener('touchend', element._dragHandlers.touchEnd, { passive: false });
        
        // Make element draggable
        element.draggable = true;
        
        // Prevent default drag behavior on images and other elements
        element.addEventListener('dragstart', (e) => {
            if (e.target !== element) {
                e.preventDefault();
            }
        });
    }
    
    setupDropZone(element, dropHandler) {
        if (!element) return;
        
        // Store original handler for cleanup
        element._dropHandler = dropHandler;
        element.classList.add('drop-zone');
        
        // Mouse events
        element.addEventListener('dragover', this.boundHandlers.dragOver);
        element.addEventListener('dragenter', this.boundHandlers.dragEnter);
        element.addEventListener('dragleave', this.boundHandlers.dragLeave);
        element.addEventListener('drop', dropHandler);
        
        this.dropZones.push(element);
    }
    
    removeDragListeners(element) {
    if (!element || !element.parentNode) return;
    
    // Clean up drag element listeners
    if (element._dragHandlers) {
        Object.keys(element._dragHandlers).forEach(eventType => {
            const handler = element._dragHandlers[eventType];
            switch(eventType) {
                case 'dragStart':
                    element.removeEventListener('dragstart', handler);
                    break;
                case 'dragEnd':
                    element.removeEventListener('dragend', handler);
                    break;
                case 'touchStart':
                    element.removeEventListener('touchstart', handler);
                    break;
                case 'touchMove':
                    element.removeEventListener('touchmove', handler);
                    break;
                case 'touchEnd':
                    element.removeEventListener('touchend', handler);
                    break;
            }
        });
        delete element._dragHandlers;
    }
    
    // Clean up drop zone listeners
    element.removeEventListener('dragover', this.boundHandlers.dragOver);
    element.removeEventListener('dragenter', this.boundHandlers.dragEnter);
    element.removeEventListener('dragleave', this.boundHandlers.dragLeave);
    
    if (element._dropHandler) {
        element.removeEventListener('drop', element._dropHandler);
        delete element._dropHandler;
    }
    
    element.classList.remove('drop-zone');
}
    
    // Mouse drag handlers
    handleDragStart(e) {
        this.draggedElement = e.target;
        this.draggedActivity = this.getActivityFromElement(e.target);
        this.isDragging = true;
        
        if (!this.draggedActivity) {
            e.preventDefault();
            return;
        }
        
        // Set drag image and data
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.draggedActivity.id);
        
        // Add visual feedback
        e.target.classList.add('dragging');
        
        console.log('Drag started:', this.draggedActivity.title);
    }
    
    handleDragEnd(e) {
        // Clean up
        e.target.classList.remove('dragging');
        this.clearDropZoneHighlights();
        
        this.draggedElement = null;
        this.draggedActivity = null;
        this.isDragging = false;
        
        console.log('Drag ended');
    }
    
    handleDragOver(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    handleDragEnter(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        e.target.classList.add('drag-over');
    }
    
    handleDragLeave(e) {
        if (!this.isDragging) return;
        
        // Only remove highlight if we're actually leaving the element
        if (!e.currentTarget.contains(e.relatedTarget)) {
            e.target.classList.remove('drag-over');
        }
    }
    
    // Touch drag handlers
    handleTouchStart(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        this.touchStartPos = { x: touch.clientX, y: touch.clientY };
        this.touchStartTime = Date.now();
        
        // Prevent default to allow custom drag behavior
        e.preventDefault();
    }
    
    handleTouchMove(e) {
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartPos.x;
        const deltaY = touch.clientY - this.touchStartPos.y;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        
        // Start drag if moved beyond threshold
        if (!this.isDragging && distance > this.touchDragThreshold) {
            this.startTouchDrag(e.target, touch);
        }
        
        if (this.isDragging) {
            this.updateTouchDrag(touch);
            e.preventDefault();
        }
    }
    
    handleTouchEnd(e) {
        if (this.isDragging) {
            this.endTouchDrag(e.changedTouches[0]);
            e.preventDefault();
        }
        
        this.isDragging = false;
    }
    
    startTouchDrag(element, touch) {
        this.draggedElement = element;
        this.draggedActivity = this.getActivityFromElement(element);
        this.isDragging = true;
        
        if (!this.draggedActivity) return;
        
        // Create drag preview
        this.createTouchDragPreview(element, touch);
        
        // Add visual feedback
        element.classList.add('dragging');
        
        console.log('Touch drag started:', this.draggedActivity.title);
    }
    
    createTouchDragPreview(element, touch) {
        // Create a clone of the element to follow the finger
        this.dragPreview = element.cloneNode(true);
        this.dragPreview.style.position = 'fixed';
        this.dragPreview.style.pointerEvents = 'none';
        this.dragPreview.style.zIndex = '1000';
        this.dragPreview.style.opacity = '0.8';
        this.dragPreview.style.transform = 'scale(1.05) rotate(5deg)';
        this.dragPreview.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
        
        // Position at touch point
        const rect = element.getBoundingClientRect();
        this.dragPreview.style.left = `${touch.clientX - rect.width / 2}px`;
        this.dragPreview.style.top = `${touch.clientY - rect.height / 2}px`;
        this.dragPreview.style.width = `${rect.width}px`;
        
        document.body.appendChild(this.dragPreview);
    }
    
    updateTouchDrag(touch) {
        if (!this.dragPreview) return;
        
        // Update preview position
        const rect = this.draggedElement.getBoundingClientRect();
        this.dragPreview.style.left = `${touch.clientX - rect.width / 2}px`;
        this.dragPreview.style.top = `${touch.clientY - rect.height / 2}px`;
        
        // Highlight drop zones
        this.highlightDropZoneAtPoint(touch.clientX, touch.clientY);
    }
    
    endTouchDrag(touch) {
        // Find drop target
        const dropTarget = this.getDropTargetAtPoint(touch.clientX, touch.clientY);
        
        if (dropTarget) {
            // Simulate drop event with proper structure
            const dropEvent = new Event('drop');
            dropEvent.preventDefault = () => {};
            dropEvent.currentTarget = dropTarget;
            dropEvent.dataTransfer = {
                getData: () => this.draggedActivity.id
            };
            
            if (dropTarget._dropHandler) {
                dropTarget._dropHandler(dropEvent);
            }
        }
        
        // Clean up
        if (this.dragPreview && this.dragPreview.parentNode) {
            document.body.removeChild(this.dragPreview);
            this.dragPreview = null;
        }
        
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        
        this.clearDropZoneHighlights();
        this.draggedElement = null;
        this.draggedActivity = null;
        
        console.log('Touch drag ended');
    }
    
    highlightDropZoneAtPoint(x, y) {
        // Clear existing highlights
        this.clearDropZoneHighlights();
        
        // Find element at point
        if (this.dragPreview) {
            this.dragPreview.style.display = 'none';
        }
        
        const elementAtPoint = document.elementFromPoint(x, y);
        
        if (this.dragPreview) {
            this.dragPreview.style.display = 'block';
        }
        
        // Find drop zone
        const dropZone = this.findDropZone(elementAtPoint);
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }
    
    getDropTargetAtPoint(x, y) {
        if (this.dragPreview) {
            this.dragPreview.style.display = 'none';
        }
        
        const elementAtPoint = document.elementFromPoint(x, y);
        
        if (this.dragPreview) {
            this.dragPreview.style.display = 'block';
        }
        
        return this.findDropZone(elementAtPoint);
    }
    
    findDropZone(element) {
        let current = element;
        while (current && !current.classList.contains('drop-zone')) {
            current = current.parentElement;
        }
        return current;
    }
    
    // Drop handlers
    async handleCalendarDrop(e) {
    e.preventDefault();
    
    const activityId = e.dataTransfer.getData('text/plain');
    if (!activityId || !this.app) return;
    
    const dropTarget = e.currentTarget;
    const date = dropTarget.dataset.date;
    const time = dropTarget.dataset.time;
    
    if (!date) {
        console.warn('No date found on drop target');
        return;
    }
    
    console.log(`Dropping activity ${activityId} on ${date} at ${time || 'all day'}`);
    console.log('Drop target element:', dropTarget);
    console.log('Drop target dataset:', dropTarget.dataset);
    
    try {
        await this.app.moveActivityToCalendar(activityId, date, time);
        this.app.showToast('Activity scheduled', 'success');
    } catch (error) {
        console.error('Failed to drop activity on calendar:', error);
        this.app.showToast('Failed to schedule activity', 'error');
    }
    
    // Clean up visual feedback
    dropTarget.classList.remove('drag-over');
}
    
    async handleBankDrop(e) {
        e.preventDefault();
        
        const activityId = e.dataTransfer.getData('text/plain');
        if (!activityId || !this.app) return;
        
        console.log(`Dropping activity ${activityId} back to bank`);
        
        try {
            await this.app.moveActivityToBank(activityId);
            this.app.showToast('Activity moved to bank', 'success');
        } catch (error) {
            console.error('Failed to drop activity on bank:', error);
            this.app.showToast('Failed to move activity', 'error');
        }
        
        // Clean up visual feedback
        e.currentTarget.classList.remove('drag-over');
    }
    
    // Utility methods
    getActivityFromElement(element) {
        const activityId = element.dataset.activityId;
        if (!activityId || !this.app) return null;
        
        return this.app.activities.find(activity => activity.id === activityId);
    }
    
    clearDropZoneHighlights() {
        const highlightedZones = document.querySelectorAll('.drag-over');
        highlightedZones.forEach(zone => {
            zone.classList.remove('drag-over');
        });
    }
    
    // Advanced drag features
    enableSortableWithinBank() {
        const bankContainer = document.getElementById('bank-activities');
        if (!bankContainer) return;
        
        bankContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            if (!this.isDragging || !this.draggedElement) return;
            
            const afterElement = this.getDragAfterElement(bankContainer, e.clientY);
            
            if (afterElement == null) {
                bankContainer.appendChild(this.draggedElement);
            } else {
                bankContainer.insertBefore(this.draggedElement, afterElement);
            }
        });
    }
    
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.activity-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // Visual feedback during drag
    addDragVisualFeedback() {
        if (!this.draggedElement) return;
        
        // Add a subtle animation to show the item is being dragged
        this.draggedElement.style.transition = 'none';
        this.draggedElement.style.transform = 'rotate(5deg) scale(1.05)';
        this.draggedElement.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
        this.draggedElement.style.zIndex = '1000';
    }
    
    removeDragVisualFeedback() {
        if (!this.draggedElement) return;
        
        this.draggedElement.style.transition = '';
        this.draggedElement.style.transform = '';
        this.draggedElement.style.boxShadow = '';
        this.draggedElement.style.zIndex = '';
    }
    
    // Keyboard accessibility for drag and drop
    setupKeyboardDragDrop() {
        document.addEventListener('keydown', (e) => {
            const activeElement = document.activeElement;
            
            if (!activeElement || !activeElement.classList.contains('activity-item')) {
                return;
            }
            
            switch (e.key) {
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    this.startKeyboardDrag(activeElement);
                    break;
                case 'Escape':
                    this.cancelKeyboardDrag();
                    break;
            }
        });
    }
    
    startKeyboardDrag(element) {
        // Implementation for keyboard-only drag and drop
        // This would show a special UI for keyboard users to select drop targets
        console.log('Keyboard drag started for:', element.dataset.activityId);
        
        // Show available drop targets
        this.showKeyboardDropTargets();
    }
    
    showKeyboardDropTargets() {
        const dropZones = document.querySelectorAll('.drop-zone');
        dropZones.forEach((zone, index) => {
            // Add keyboard navigation hints
            zone.setAttribute('tabindex', '0');
            zone.setAttribute('data-drop-index', index);
            
            // Add visual indicator
            const indicator = document.createElement('div');
            indicator.className = 'keyboard-drop-indicator';
            indicator.textContent = `Press Enter to drop here (${index + 1})`;
            zone.appendChild(indicator);
        });
    }
    
    cancelKeyboardDrag() {
        // Remove keyboard drop indicators
        const indicators = document.querySelectorAll('.keyboard-drop-indicator');
        indicators.forEach(indicator => indicator.remove());
        
        const dropZones = document.querySelectorAll('.drop-zone');
        dropZones.forEach(zone => {
            zone.removeAttribute('tabindex');
            zone.removeAttribute('data-drop-index');
        });
    }
    
    // Conflict resolution for overlapping activities
    detectTimeConflicts(newActivity, existingActivities) {
        if (!newActivity.start || !newActivity.end) return [];
        
        const newStart = new Date(newActivity.start);
        const newEnd = new Date(newActivity.end);
        
        return existingActivities.filter(activity => {
            if (!activity.start || !activity.end || activity.id === newActivity.id) return false;
            
            const existingStart = new Date(activity.start);
            const existingEnd = new Date(activity.end);
            
            // Check for time overlap
            return newStart < existingEnd && newEnd > existingStart;
        });
    }
    
    async resolveTimeConflict(newActivity, conflictingActivities) {
        // Simple resolution: offset the new activity by 15 minutes
        const start = new Date(newActivity.start);
        const end = new Date(newActivity.end);
        const duration = end - start;
        
        // Find next available slot
        let attempts = 0;
        const maxAttempts = 20; // Prevent infinite loop
        
        while (attempts < maxAttempts) {
            const conflicts = this.detectTimeConflicts(newActivity, conflictingActivities);
            if (conflicts.length === 0) break;
            
            // Move activity 15 minutes later
            start.setMinutes(start.getMinutes() + 15);
            end.setTime(start.getTime() + duration);
            
            newActivity.start = start.toISOString();
            newActivity.end = end.toISOString();
            
            attempts++;
        }
        
        if (attempts >= maxAttempts) {
            throw new Error('Could not find available time slot');
        }
        
        return newActivity;
    }
    
    // Smart snapping to time slots
    snapToTimeSlot(dateTime, granularity = 15) {
        const date = new Date(dateTime);
        const minutes = date.getMinutes();
        const snappedMinutes = Math.round(minutes / granularity) * granularity;
        
        date.setMinutes(snappedMinutes);
        date.setSeconds(0);
        date.setMilliseconds(0);
        
        return date;
    }
    
    // Batch operations for multiple activities
    async moveMultipleActivities(activityIds, targetDate, targetTime) {
        const results = [];
        
        for (const activityId of activityIds) {
            try {
                await this.app.moveActivityToCalendar(activityId, targetDate, targetTime);
                results.push({ activityId, success: true });
                
                // Offset time for next activity to avoid conflicts
                if (targetTime) {
                    const [hours, minutes] = targetTime.split(':').map(Number);
                    const nextTime = new Date();
                    nextTime.setHours(hours, minutes + 60); // 1 hour offset
                    targetTime = `${nextTime.getHours().toString().padStart(2, '0')}:${nextTime.getMinutes().toString().padStart(2, '0')}`;
                }
            } catch (error) {
                console.error(`Failed to move activity ${activityId}:`, error);
                results.push({ activityId, success: false, error: error.message });
            }
        }
        
        return results;
    }
    
    // Accessibility helpers
    announceDropResult(success, activityTitle, targetDescription) {
        // Create announcement for screen readers
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        
        if (success) {
            announcement.textContent = `${activityTitle} moved to ${targetDescription}`;
        } else {
            announcement.textContent = `Failed to move ${activityTitle}`;
        }
        
        document.body.appendChild(announcement);
        
        // Remove after announcement
        setTimeout(() => {
            if (announcement.parentNode) {
                document.body.removeChild(announcement);
            }
        }, 1000);
    }
    
    // Debug utilities
    logDragState() {
        console.log('Drag State:', {
            isDragging: this.isDragging,
            draggedElement: this.draggedElement?.dataset.activityId,
            draggedActivity: this.draggedActivity?.title,
            dropZonesCount: this.dropZones.length
        });
    }
    
    // Complete cleanup when destroyed
    destroy() {
        this.cleanupDropZones();
        
        // Clean up any remaining drag previews
        if (this.dragPreview && this.dragPreview.parentNode) {
            document.body.removeChild(this.dragPreview);
        }
        
        // Reset state
        this.draggedElement = null;
        this.draggedActivity = null;
        this.isDragging = false;
        this.dropZones = [];
        this.dragPreview = null;
        
        console.log('DragDropManager destroyed');
    }
}
