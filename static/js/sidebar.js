// Universal sidebar and theme functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar and theme functionality if elements exist
    initializeSidebar();
    initializeTheme();
	initializeNotifications();
    initializeUserMenu();
});

function initializeSidebar() {
    // Sidebar now uses CSS hover functionality
    // No JavaScript needed for expand/collapse
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

    if (!notificationsBtn || !notificationDropdown) return;

    notificationsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        notificationsBtn.classList.toggle('active');
    });

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
        userMenuBtn.classList.toggle('active');
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!userMenuBtn.contains(e.target)) {
            userMenuBtn.classList.remove('active');
        }
    });
}

// Global logout function
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        window.location.href = '/login';
    }
}