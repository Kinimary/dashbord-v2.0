
class NotificationSystem {
    constructor() {
        this.notifications = [];
        this.createNotificationContainer();
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }

    show(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Add to array
        this.notifications.push(notification);

        // Auto remove
        setTimeout(() => this.remove(notification), duration);

        // Manual close
        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.remove(notification);
        });

        // Animate in
        setTimeout(() => notification.classList.add('show'), 100);
    }

    getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    remove(notification) {
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            this.notifications = this.notifications.filter(n => n !== notification);
        }, 300);
    }
}

// Initialize notification system
const notifications = new NotificationSystem();
// Notification system
document.addEventListener('DOMContentLoaded', function() {
    initializeNotificationActions();
    initializeSettings();
});

function initializeNotificationActions() {
    // Mark all as read
    const markAllRead = document.querySelector('.mark-all-read');
    if (markAllRead) {
        markAllRead.addEventListener('click', function() {
            const unreadItems = document.querySelectorAll('.notification-item.unread');
            unreadItems.forEach(item => {
                item.classList.remove('unread');
            });
            updateNotificationBadge();
        });
    }
    
    // Click notification items
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(item => {
        item.addEventListener('click', function() {
            this.classList.remove('unread');
            updateNotificationBadge();
        });
    });
}

function initializeSettings() {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDropdown = document.getElementById('settings-dropdown');
    const themeToggle = document.getElementById('theme-toggle-checkbox');
    
    if (!settingsBtn || !settingsDropdown) return;
    
    // Load saved settings
    const savedTheme = localStorage.getItem('theme');
    if (themeToggle) {
        themeToggle.checked = savedTheme === 'light';
    }
    
    settingsBtn.addEventListener('click', function(e) {
        e.preventDefault();
        settingsDropdown.classList.toggle('active');
    });
    
    // Theme toggle
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            const body = document.body;
            if (this.checked) {
                body.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            } else {
                body.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
            }
        });
    }
    
    // Other toggles
    const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggles.forEach(toggle => {
        const savedState = localStorage.getItem(toggle.id);
        if (savedState !== null) {
            toggle.checked = savedState === 'true';
        }
        
        toggle.addEventListener('change', function() {
            localStorage.setItem(this.id, this.checked);
            
            // Handle specific settings
            if (this.id === 'notifications-toggle') {
                // Handle notifications toggle
                console.log('Notifications:', this.checked ? 'enabled' : 'disabled');
            } else if (this.id === 'auto-refresh-toggle') {
                // Handle auto-refresh toggle
                console.log('Auto-refresh:', this.checked ? 'enabled' : 'disabled');
            } else if (this.id === 'sound-toggle') {
                // Handle sound toggle
                console.log('Sound:', this.checked ? 'enabled' : 'disabled');
            }
        });
    });
}

function updateNotificationBadge() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const badge = document.getElementById('notification-count');
    
    if (badge) {
        if (unreadCount > 0) {
            badge.textContent = unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

function addNotification(title, text, type = 'info') {
    const notificationList = document.querySelector('.notification-list');
    if (!notificationList) return;
    
    const iconMap = {
        success: 'fa-check-circle text-success',
        warning: 'fa-exclamation-triangle text-warning',
        error: 'fa-exclamation-circle text-error',
        info: 'fa-info-circle'
    };
    
    const notificationHTML = `
        <div class="notification-item unread">
            <div class="notification-icon">
                <i class="fas ${iconMap[type] || iconMap.info}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-text">${text}</div>
                <div class="notification-time">Только что</div>
            </div>
        </div>
    `;
    
    notificationList.insertAdjacentHTML('afterbegin', notificationHTML);
    updateNotificationBadge();
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        window.location.href = '/login';
    }
}
