
// Universal sidebar and theme functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar and theme functionality if elements exist
    initializeSidebar();
    initializeTheme();
    initializeNotifications();
    initializeUserMenu();
    initializeSettings();
});

function initializeSidebar() {
    // Set active menu item based on current page
    const currentPath = window.location.pathname;
    const menuItems = document.querySelectorAll('.menu li a');
    
    menuItems.forEach(item => {
        const link = item.getAttribute('href');
        if (link === currentPath || (currentPath === '/' && link === '/')) {
            item.parentElement.classList.add('active');
        } else {
            item.parentElement.classList.remove('active');
        }
    });
}

function initializeTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon') || 
                     document.getElementById('dark-mode-toggle');

    if (!themeToggle || !themeIcon) return;

    // Load saved theme
    const savedTheme = localStorage.getItem('theme');
    const body = document.body;

    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        themeIcon.className = 'fas fa-sun';
    } else {
        body.classList.remove('light-mode');
        themeIcon.className = 'fas fa-moon';
    }

    // Theme toggle functionality
    themeToggle.addEventListener('click', function() {
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            themeIcon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.add('light-mode');
            themeIcon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'light');
        }
    });
}

function initializeNotifications() {
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const markAllRead = document.querySelector('.mark-all-read');

    if (!notificationsBtn || !notificationDropdown) return;

    notificationsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = notificationsBtn.classList.contains('active');
        
        // Close user menu if open
        const userMenu = document.getElementById('user-menu-btn');
        if (userMenu) userMenu.classList.remove('active');
        
        // Toggle notifications
        if (isActive) {
            notificationsBtn.classList.remove('active');
        } else {
            notificationsBtn.classList.add('active');
        }
    });

    // Mark all as read functionality
    if (markAllRead) {
        markAllRead.addEventListener('click', function() {
            const unreadItems = document.querySelectorAll('.notification-item.unread');
            unreadItems.forEach(item => {
                item.classList.remove('unread');
            });
            
            const badge = document.getElementById('notification-count');
            if (badge) {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        });
    }

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!notificationsBtn.contains(e.target)) {
            notificationsBtn.classList.remove('active');
        }
    });
}

function initializeUserMenu() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (!userMenuBtn || !userDropdown) return;

    userMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = userMenuBtn.classList.contains('active');
        
        // Close notifications if open
        const notificationsBtn = document.getElementById('notifications-btn');
        if (notificationsBtn) notificationsBtn.classList.remove('active');
        
        // Toggle user menu
        if (isActive) {
            userMenuBtn.classList.remove('active');
        } else {
            userMenuBtn.classList.add('active');
        }
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!userMenuBtn.contains(e.target)) {
            userMenuBtn.classList.remove('active');
        }
    });
}

function initializeSettings() {
    const settingsBtn = document.querySelector('.settings-btn');
    const settingsDropdown = document.querySelector('.settings-dropdown');
    const settingsArrow = document.querySelector('.settings-arrow');

    if (!settingsBtn || !settingsDropdown) return;

    settingsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = settingsDropdown.classList.contains('active');
        
        if (isActive) {
            settingsDropdown.classList.remove('active');
        } else {
            settingsDropdown.classList.add('active');
        }
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!settingsBtn.contains(e.target)) {
            settingsDropdown.classList.remove('active');
        }
    });

    // Initialize toggle switches
    const toggles = document.querySelectorAll('.toggle-switch input');
    toggles.forEach(toggle => {
        const settingName = toggle.getAttribute('data-setting');
        const savedValue = localStorage.getItem(settingName);
        
        if (savedValue === 'true') {
            toggle.checked = true;
        } else if (savedValue === 'false') {
            toggle.checked = false;
        }
        
        toggle.addEventListener('change', function() {
            localStorage.setItem(settingName, this.checked);
            
            // Handle specific settings
            if (settingName === 'darkMode') {
                handleThemeToggle(this.checked);
            } else if (settingName === 'notifications') {
                handleNotificationsToggle(this.checked);
            } else if (settingName === 'autoRefresh') {
                handleAutoRefreshToggle(this.checked);
            } else if (settingName === 'sound') {
                handleSoundToggle(this.checked);
            }
        });
    });
}

function handleThemeToggle(isDark) {
    const body = document.body;
    if (isDark) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
    }
    console.log('Theme changed to:', isDark ? 'dark' : 'light');
}

function handleNotificationsToggle(enabled) {
    console.log('Notifications:', enabled ? 'enabled' : 'disabled');
    if (enabled) {
        // Enable notifications
        showNotification('Уведомления включены', 'success');
    } else {
        // Disable notifications
        showNotification('Уведомления отключены', 'info');
    }
}

function handleAutoRefreshToggle(enabled) {
    console.log('Auto-refresh:', enabled ? 'enabled' : 'disabled');
    if (enabled) {
        // Start auto-refresh
        startAutoRefresh();
    } else {
        // Stop auto-refresh
        stopAutoRefresh();
    }
}

function handleSoundToggle(enabled) {
    console.log('Sound:', enabled ? 'enabled' : 'disabled');
    window.soundEnabled = enabled;
}

function showNotification(message, type) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: var(--belwest-green);
        color: white;
        border-radius: 8px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.style.opacity = '1', 100);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

let autoRefreshInterval;

function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        console.log('Auto-refreshing data...');
        // Refresh data here
    }, 30000); // Refresh every 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}
}

// Global logout function
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to logout route
        window.location.href = '/logout';
    }
}

// Page navigation with smooth transitions
function navigateTo(url) {
    // Add transition overlay
    const overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay active';
    overlay.innerHTML = `
        <div class="transition-spinner"></div>
        <div class="transition-text">Загрузка...</div>
    `;
    document.body.appendChild(overlay);
    
    // Navigate after short delay
    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

// Enhanced search functionality
function initializeSearch() {
    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const searchableElements = document.querySelectorAll('[data-searchable]');
        
        searchableElements.forEach(element => {
            const text = element.textContent.toLowerCase();
            const parent = element.closest('.card, .table tr, .notification-item');
            
            if (text.includes(query)) {
                if (parent) parent.style.display = '';
            } else {
                if (parent) parent.style.display = 'none';
            }
        });
    });
}

// Initialize search on page load
document.addEventListener('DOMContentLoaded', initializeSearch);
