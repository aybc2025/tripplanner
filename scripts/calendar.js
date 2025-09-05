// calendar.js - Calendar Views and Rendering
export class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.currentView = 'day';
        this.timeSlots = this.generateTimeSlots();
        this.isMobile = window.innerWidth <= 768;
    }
    
    async init(date = new Date(), view = 'day') {
        this.currentDate = new Date(date);
        this.currentView = view;
        
        // Update mobile detection on resize
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 768;
        });
        
        console.log('Calendar manager initialized');
    }
    
    setDate(date) {
        this.currentDate = new Date(date);
    }
    
    setView(view) {
        this.currentView = view;
    }
    
    getCurrentDate() {
        return new Date(this.currentDate);
    }
    
    getDisplayTitle() {
        const options = { month: 'long', year: 'numeric' };
        
        switch (this.currentView) {
            case 'day':
                return this.currentDate.toLocaleDateString('en-US', { 
                    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
                });
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekEnd = this.getWeekEnd(this.currentDate);
                if (weekStart.getMonth() === weekEnd.getMonth()) {
                    return `${weekStart.toLocaleDateString('en-US', options)}`;
                } else {
                    return `${weekStart.toLocaleDateString('en-US', { month: 'short' })} - ${weekEnd.toLocaleDateString('en-US', options)}`;
                }
            case 'month':
                return this.currentDate.toLocaleDateString('en-US', options);
            default:
                return '';
        }
    }
    
    navigatePrevious() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() - 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() - 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() - 1);
                break;
        }
    }
    
    navigateNext() {
        switch (this.currentView) {
            case 'day':
                this.currentDate.setDate(this.currentDate.getDate() + 1);
                break;
            case 'week':
                this.currentDate.setDate(this.currentDate.getDate() + 7);
                break;
            case 'month':
                this.currentDate.setMonth(this.currentDate.getMonth() + 1);
                break;
        }
    }
    
    async render(activities = []) {
        switch (this.currentView) {
            case 'day':
                await this.renderDayView(activities);
                break;
            case 'week':
                await this.renderWeekView(activities);
                break;
            case 'month':
                await this.renderMonthView(activities);
                break;
        }
    }
    
    async renderDayView(activities) {
        const dayContainer = document.getElementById('day-view-container');
        if (!dayContainer) return;
        
        // Update day header
        this.updateDayHeader();
        
        // Render time slots
        this.renderTimeSlots('time-slots');
        this.renderTimeSlots('day-activities', true);
        
        // Render activities for this day
        const dayActivities = this.getActivitiesForDate(activities, this.currentDate);
        this.renderDayActivities(dayActivities);
    }
    
    updateDayHeader() {
        const dayLabel = document.getElementById('day-label');
        const dayDate = document.getElementById('day-date');
        
        if (dayLabel) {
            const today = new Date();
            const isToday = this.isSameDate(this.currentDate, today);
            const isTomorrow = this.isSameDate(this.currentDate, new Date(today.getTime() + 24 * 60 * 60 * 1000));
            const isYesterday = this.isSameDate(this.currentDate, new Date(today.getTime() - 24 * 60 * 60 * 1000));
            
            if (isToday) {
                dayLabel.textContent = 'Today';
            } else if (isTomorrow) {
                dayLabel.textContent = 'Tomorrow';
            } else if (isYesterday) {
                dayLabel.textContent = 'Yesterday';
            } else {
                dayLabel.textContent = this.currentDate.toLocaleDateString('en-US', { weekday: 'long' });
            }
        }
        
        if (dayDate) {
            dayDate.textContent = this.currentDate.toLocaleDateString('en-US', { 
                month: 'short', day: 'numeric' 
            });
        }
    }
    
    renderTimeSlots(containerId, isDropZone = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    this.timeSlots.forEach(timeSlot => {
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        
        if (isDropZone) {
            slotElement.classList.add('drop-zone');
            slotElement.dataset.date = this.formatDateForStorage(this.currentDate);
            slotElement.dataset.time = timeSlot.time;
            
            // Add mobile-specific styling
            if (this.isMobile) {
                slotElement.style.minHeight = '50px'; // Larger touch targets
                slotElement.classList.add('mobile-drop-zone');
            }
        
            // Show abbreviated time labels on mobile to save space
            } else {
    // Always show all time labels
    slotElement.textContent = timeSlot.display;
}
        
        container.appendChild(slotElement);
    });
}
    
    renderDayActivities(activities) {
        const container = document.getElementById('day-activities');
        if (!container) return;
        
        // Clear existing activities
        const existingActivities = container.querySelectorAll('.calendar-activity');
        existingActivities.forEach(el => el.remove());
        
        activities.forEach(activity => {
            if (activity.start && activity.end) {
                const activityElement = this.createCalendarActivityElement(activity);
                this.positionDayActivity(activityElement, activity);
                container.appendChild(activityElement);
            }
        });
    }
    
    async renderWeekView(activities) {
        const weekContainer = document.getElementById('week-view-container');
        if (!weekContainer) return;
        
        // Generate week dates
        const weekStart = this.getWeekStart(this.currentDate);
        const weekDays = [];
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            weekDays.push(day);
        }
        
        // Update week header
        this.updateWeekHeader(weekDays);
        
        // Render time slots
        this.renderTimeSlots('week-time-slots');
        
        // Render week grid
        this.renderWeekGrid(weekDays, activities);
    }
    
    updateWeekHeader(weekDays) {
        const weekDaysContainer = document.getElementById('week-days');
        if (!weekDaysContainer) return;
        
        weekDaysContainer.innerHTML = '';
        
        weekDays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'week-day';
            
            const label = document.createElement('div');
            label.className = 'week-day-label';
            label.textContent = day.toLocaleDateString('en-US', { weekday: 'short' });
            
            const date = document.createElement('div');
            date.className = 'week-day-date';
            date.textContent = day.getDate();
            
            // Highlight today
            const today = new Date();
            if (this.isSameDate(day, today)) {
                dayElement.classList.add('today');
            }
            
            dayElement.appendChild(label);
            dayElement.appendChild(date);
            weekDaysContainer.appendChild(dayElement);
        });
    }
    
    renderWeekGrid(weekDays, activities) {
        const weekActivitiesContainer = document.getElementById('week-activities');
        if (!weekActivitiesContainer) return;
        
        weekActivitiesContainer.innerHTML = '';
        
        weekDays.forEach((day, dayIndex) => {
            const dayColumn = document.createElement('div');
            dayColumn.className = 'week-day-column drop-zone';
            dayColumn.dataset.date = day.toISOString().split('T')[0];
            
            // Add time slot dividers
            this.timeSlots.forEach(timeSlot => {
                const slotDiv = document.createElement('div');
                slotDiv.className = 'time-slot drop-zone';
                slotDiv.dataset.date = day.toISOString().split('T')[0];
                slotDiv.dataset.time = timeSlot.time;
                dayColumn.appendChild(slotDiv);
            });
            
            // Add activities for this day
            const dayActivities = this.getActivitiesForDate(activities, day);
            dayActivities.forEach(activity => {
                if (activity.start && activity.end) {
                    const activityElement = this.createCalendarActivityElement(activity);
                    this.positionWeekActivity(activityElement, activity, dayIndex);
                    dayColumn.appendChild(activityElement);
                }
            });
            
            weekActivitiesContainer.appendChild(dayColumn);
        });
    }
    
    async renderMonthView(activities) {
    const monthContainer = document.getElementById('month-grid');
    if (!monthContainer) return;
    
    monthContainer.innerHTML = '';
    
    const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
    const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
    
    // Calculate start and end of month grid (including partial weeks)
    const gridStart = this.getWeekStart(firstDay);
    const gridEnd = this.getWeekEnd(lastDay);
    
    const current = new Date(gridStart);
    const today = new Date();
    
    while (current <= gridEnd) {
        const dayElement = document.createElement('div');
        dayElement.className = 'month-day drop-zone';
        dayElement.dataset.date = this.formatDateForStorage(current);
        
        // Check if day is in current month
        if (current.getMonth() !== this.currentDate.getMonth()) {
            dayElement.classList.add('other-month');
        }
        
        // Highlight today
        if (this.isSameDate(current, today)) {
            dayElement.classList.add('today');
        }
        
        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'month-day-number';
        dayNumber.textContent = current.getDate();
        dayElement.appendChild(dayNumber);
        
        // Activities container
        const activitiesContainer = document.createElement('div');
        activitiesContainer.className = 'month-activities';
        
        // Add activities for this day
        const dayActivities = this.getActivitiesForDate(activities, current);
        const maxActivitiesToShow = this.isMobile ? 2 : 3; // Show fewer on mobile
        
        dayActivities.slice(0, maxActivitiesToShow).forEach(activity => {
            const activityElement = document.createElement('div');
            activityElement.className = 'month-activity';
            activityElement.draggable = true;
            activityElement.textContent = activity.title;
            activityElement.dataset.activityId = activity.id;
            
            // Mobile-specific improvements
            if (this.isMobile) {
                activityElement.style.minHeight = '24px'; // Better touch target
                activityElement.style.fontSize = '11px';
                activityElement.style.lineHeight = '1.2';
            }
            
            // Add click handler - IMPROVED
            activityElement.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const event = new CustomEvent('activityClick', { 
                    detail: { activity },
                    bubbles: true
                });
                document.dispatchEvent(event);
            });
            
            activitiesContainer.appendChild(activityElement);
        });
        
        if (dayActivities.length > maxActivitiesToShow) {
            const moreElement = document.createElement('div');
            moreElement.className = 'month-activity more-activities';
            moreElement.textContent = `+${dayActivities.length - maxActivitiesToShow} more`;
            moreElement.style.opacity = '0.7';
            
            // Mobile-specific styling for "more" element
            if (this.isMobile) {
                moreElement.style.minHeight = '20px';
                moreElement.style.fontSize = '10px';
            }
            
            // Add click handler for "more" element too
            moreElement.addEventListener('click', (e) => {
                e.stopPropagation();
                // Could show a popup with all activities for this day
                console.log(`Show all ${dayActivities.length} activities for ${current.toDateString()}`);
            });
            
            activitiesContainer.appendChild(moreElement);
        }
        
        dayElement.appendChild(activitiesContainer);
        monthContainer.appendChild(dayElement);
        
        // Move to next day
        current.setDate(current.getDate() + 1);
    }
}
    
    createCalendarActivityElement(activity) {
    const element = document.createElement('div');
    element.className = 'calendar-activity';
    element.draggable = true;
    element.dataset.activityId = activity.id;
    element.textContent = activity.title;
    
    // Add click handler for details - IMPROVED
    element.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Don't open if we're dragging
        if (!element.classList.contains('dragging')) {
            const event = new CustomEvent('activityClick', { 
                detail: { activity },
                bubbles: true
            });
            document.dispatchEvent(event);
        }
    });
    
    return element;
}
    
    positionDayActivity(element, activity) {
    const startTime = new Date(activity.start);
    const endTime = new Date(activity.end);
    
    // Calculate position based on time
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    const duration = endMinutes - startMinutes;
    
    // Each hour is 60px, starting from 6 AM (360 minutes)
    // Handle activities that go past midnight (24:00 = 1440 minutes)
    const startOffset = Math.max(0, startMinutes - 360); // 6 AM = 360 minutes
    const slotHeight = this.isMobile ? 50 : 60; // Mobile uses 50px slots
    const top = (startOffset / 60) * slotHeight;
    const height = Math.max(30, (duration / 60) * slotHeight); // Minimum 30px height
    
    element.style.top = `${top}px`;
    element.style.height = `${height}px`;
    
    // Add time to activity if not too small
    if (height >= 40) {
        const timeSpan = document.createElement('div');
        timeSpan.style.fontSize = '11px';
        timeSpan.style.opacity = '0.8';
        timeSpan.textContent = `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
        element.appendChild(timeSpan);
    }
}
    
    positionWeekActivity(element, activity, dayIndex) {
        const startTime = new Date(activity.start);
        const endTime = new Date(activity.end);
        
        const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
        
        const startOffset = Math.max(0, startMinutes - 360); // 6 AM = 360 minutes
        const top = (startOffset / 60) * 60; // 60px per hour
        const height = Math.max(20, (duration / 60) * 60);
        
        element.style.position = 'absolute';
        element.style.top = `${top}px`;
        element.style.height = `${height}px`;
        element.style.left = '2px';
        element.style.right = '2px';
        element.style.fontSize = '11px';
        element.style.padding = '2px 4px';
    }
    
    generateTimeSlots() {
    const slots = [];
    
    // Generate slots from 6 AM to 12 AM (midnight) in 1-hour increments
    for (let hour = 6; hour <= 24; hour++) {
        const displayHour = hour === 24 ? 0 : hour; // Show 12 AM for hour 24
        const time24 = hour === 24 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`;
        const hour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
        const ampm = displayHour < 12 ? 'AM' : 'PM';
        const display = displayHour === 12 ? '12 PM' : displayHour === 0 ? '12 AM' : `${hour12} ${ampm}`;
        
        slots.push({
            time: time24,
            display: display,
            hour: displayHour
        });
    }
    
    return slots;
}
    
    getActivitiesForDate(activities, date) {
        return activities.filter(activity => {
            if (!activity.start) return false;
            const activityDate = new Date(activity.start);
            return this.isSameDate(activityDate, date);
        }).sort((a, b) => {
            const aTime = new Date(a.start);
            const bTime = new Date(b.start);
            return aTime - bTime;
        });
    }
    
    getWeekStart(date) {
        const start = new Date(date);
        const day = start.getDay();
        const diff = start.getDate() - day;
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        return start;
    }
    
    getWeekEnd(date) {
        const end = new Date(this.getWeekStart(date));
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return end;
    }
    
    getMonthStart(date) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
    
    getMonthEnd(date) {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    }
    
    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
    
    formatTime(date) {
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    }
    
    formatDate(date) {
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    }
    
    // Utility methods for drag and drop
    getTimeSlotFromPosition(y, containerElement) {
        const containerRect = containerElement.getBoundingClientRect();
        const relativeY = y - containerRect.top;
        const slotHeight = 60; // Each time slot is 60px
        const slotIndex = Math.floor(relativeY / slotHeight);
        
        if (slotIndex >= 0 && slotIndex < this.timeSlots.length) {
            return this.timeSlots[slotIndex];
        }
        
        return null;
    }
    
    getDateFromElement(element) {
        // Look for date in element or parent elements
        let current = element;
        while (current && !current.dataset.date) {
            current = current.parentElement;
        }
        return current ? current.dataset.date : null;
    }
    
    getTimeFromElement(element) {
        // Look for time in element or parent elements
        let current = element;
        while (current && !current.dataset.time) {
            current = current.parentElement;
        }
        return current ? current.dataset.time : null;
    }
    
    // Helper method to check if date is within trip range
    isDateInTripRange(date, trip) {
        if (!trip || !trip.dateRange) return true;
        
        const checkDate = new Date(date);
        const startDate = new Date(trip.dateRange.start);
        const endDate = new Date(trip.dateRange.end);
        
        return checkDate >= startDate && checkDate <= endDate;
    }
    
    // Get all dates for current view (useful for rendering)
    getCurrentViewDates() {
        switch (this.currentView) {
            case 'day':
                return [new Date(this.currentDate)];
            case 'week':
                const weekStart = this.getWeekStart(this.currentDate);
                const weekDates = [];
                for (let i = 0; i < 7; i++) {
                    const day = new Date(weekStart);
                    day.setDate(weekStart.getDate() + i);
                    weekDates.push(day);
                }
                return weekDates;
            case 'month':
                const monthStart = this.getMonthStart(this.currentDate);
                const monthEnd = this.getMonthEnd(this.currentDate);
                const gridStart = this.getWeekStart(monthStart);
                const gridEnd = this.getWeekEnd(monthEnd);
                
                const monthDates = [];
                const current = new Date(gridStart);
                while (current <= gridEnd) {
                    monthDates.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }
                return monthDates;
            default:
                return [];
        }
    }
    
    // Calculate optimal activity positioning to avoid overlaps
    calculateActivityPositions(activities) {
        const positioned = [];
        
        activities.forEach(activity => {
            if (!activity.start || !activity.end) return;
            
            const startTime = new Date(activity.start);
            const endTime = new Date(activity.end);
            
            // Find column (to avoid overlaps)
            let column = 0;
            let maxColumn = 0;
            
            for (const existing of positioned) {
                const existingStart = new Date(existing.activity.start);
                const existingEnd = new Date(existing.activity.end);
                
                // Check for time overlap
                if (startTime < existingEnd && endTime > existingStart) {
                    if (existing.column >= column) {
                        column = existing.column + 1;
                    }
                    maxColumn = Math.max(maxColumn, existing.column);
                }
            }
            
            positioned.push({
                activity,
                column,
                totalColumns: Math.max(maxColumn + 1, column + 1)
            });
        });
        
        return positioned;
    }
    
// Date formatting utilities to avoid timezone issues
formatDateForStorage(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

parseDateFromStorage(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}
}
