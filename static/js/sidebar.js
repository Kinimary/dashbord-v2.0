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
    const menuItems = document.querySelectorAll('.menu li');
    
    menuItems.forEach(item => {
        const page = item.getAttribute('data-page');
        const link = item.querySelector('a')?.getAttribute('href');
        
        if (page === currentPath || link === currentPath || (currentPath === '/' && (page === '/' || link === '/'))) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
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
        
        // Close any other open dropdowns
        document.querySelectorAll('.user-info.active').forEach(menu => {
            if (menu !== userMenuBtn) {
                menu.classList.remove('active');
            }
        });
        
        // Toggle user menu with animation
        if (isActive) {
            userMenuBtn.classList.remove('active');
        } else {
            userMenuBtn.classList.add('active');
            
            // Animate dropdown items
            const items = userDropdown.querySelectorAll('.dropdown-item');
            items.forEach((item, index) => {
                item.style.animationDelay = `${index * 0.05}s`;
            });
        }
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!userMenuBtn.contains(e.target)) {
            userMenuBtn.classList.remove('active');
        }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            userMenuBtn.classList.remove('active');
        }
    });

    // Add hover effects to dropdown items
    const dropdownItems = userDropdown.querySelectorAll('.dropdown-item');
    dropdownItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(8px)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0)';
        });
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

    // Initialize toggle switches with proper state management
    const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
    toggles.forEach(toggle => {
        const settingName = toggle.getAttribute('data-setting');
        const savedValue = localStorage.getItem(settingName);
        
        // Set initial state
        if (savedValue !== null) {
            toggle.checked = savedValue === 'true';
        } else {
            // Default values
            if (settingName === 'notifications' || settingName === 'autoUpdate' || settingName === 'autosave') {
                toggle.checked = true;
                localStorage.setItem(settingName, 'true');
            }
        }
        
        // Apply initial setting
        applySettingChange(toggle, settingName, toggle.checked);
        
        toggle.addEventListener('change', function() {
            localStorage.setItem(settingName, this.checked);
            applySettingChange(this, settingName, this.checked);
        });
    });

    // Initialize language selector
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        const savedLang = localStorage.getItem('language') || 'ru';
        languageSelect.value = savedLang;
        
        languageSelect.addEventListener('change', function() {
            localStorage.setItem('language', this.value);
            applyLanguageChange(this.value);
            showNotification('Язык изменен', 'success');
        });
    }
}

function applySettingChange(toggle, settingName, isChecked) {
    switch(settingName) {
        case 'darkMode':
            handleThemeToggle(!isChecked); // Инвертируем логику для темной темы
            break;
        case 'notifications':
            handleNotificationsToggle(isChecked);
            break;
        case 'autoUpdate':
        case 'autoRefresh':
            handleAutoRefreshToggle(isChecked);
            break;
        case 'sounds':
            handleSoundToggle(isChecked);
            break;
        case 'autosave':
            handleAutoSaveToggle(isChecked);
            break;
    }
}

function applyLanguageChange(lang) {
    document.documentElement.lang = lang;
    
    const translations = {
        'ru': {
            'dashboard': 'Панель управления',
            'users': 'Пользователи', 
            'sensors': 'Датчики',
            'reports': 'Отчеты',
            'settings': 'Настройки',
            'dark_theme': 'Темная тема',
            'notifications': 'Уведомления',
            'auto_update': 'Авто-обновление',
            'language': 'Язык',
            'sounds': 'Звуки',
            'auto_save': 'Авто-сохранение'
        },
        'en': {
            'dashboard': 'Dashboard',
            'users': 'Users',
            'sensors': 'Sensors', 
            'reports': 'Reports',
            'settings': 'Settings',
            'dark_theme': 'Dark Theme',
            'notifications': 'Notifications',
            'auto_update': 'Auto Update',
            'language': 'Language',
            'sounds': 'Sounds',
            'auto_save': 'Auto Save'
        },
        'be': {
            'dashboard': 'Панэль кіравання',
            'users': 'Карыстальнікі',
            'sensors': 'Датчыкі',
            'reports': 'Справаздачы', 
            'settings': 'Налады',
            'dark_theme': 'Цёмная тэма',
            'notifications': 'Паведамленні',
            'auto_update': 'Аўта-абнаўленне',
            'language': 'Мова',
            'sounds': 'Гукі',
            'auto_save': 'Аўта-захаванне'
        }
    };

    if (translations[lang]) {
        updateInterfaceTexts(translations[lang]);
    }
}

function updateInterfaceTexts(texts) {
    // Обновляем меню
    const menuLinks = {
        '/': 'dashboard',
        '/users': 'users', 
        '/sensors': 'sensors',
        '/reports': 'reports',
        '/settings': 'settings'
    };
    
    Object.entries(menuLinks).forEach(([href, key]) => {
        const link = document.querySelector(`a[href="${href}"] span`);
        if (link && texts[key]) {
            link.textContent = texts[key];
        }
    });
    
    // Обновляем настройки в боковой панели
    const settingLabels = document.querySelectorAll('.setting-label span');
    settingLabels.forEach(label => {
        const text = label.textContent.toLowerCase();
        const key = text.replace(/\s+/g, '_').replace(/[^\w]/g, '');
        if (texts[key]) {
            label.textContent = texts[key];
        }
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
    showNotification(enabled ? 'Звуки включены' : 'Звуки отключены', 'info');
}

function handleAutoSaveToggle(enabled) {
    console.log('Auto-save:', enabled ? 'enabled' : 'disabled');
    window.autoSaveEnabled = enabled;
    
    if (enabled) {
        startAutoSave();
        showNotification('Авто-сохранение включено', 'success');
    } else {
        stopAutoSave();
        showNotification('Авто-сохранение отключено', 'info');
    }
}

let autoSaveInterval;

function startAutoSave() {
    if (autoSaveInterval) clearInterval(autoSaveInterval);
    autoSaveInterval = setInterval(() => {
        console.log('Auto-saving...');
        // Здесь можно добавить логику автосохранения
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            localStorage.setItem('autosave_' + form.id, JSON.stringify(data));
        });
    }, 60000); // Автосохранение каждую минуту
}

function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
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

// Global logout function
function logout() {
    if (confirm('Вы уверены, что хотите выйти из системы?')) {
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Redirect to logout route which will clear session and redirect to login
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        }).then(() => {
            window.location.href = '/login';
        }).catch(() => {
            // Fallback if fetch fails
            window.location.href = '/logout';
        });
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