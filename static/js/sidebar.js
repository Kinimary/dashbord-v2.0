
// Universal sidebar and theme functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sidebar and theme functionality if elements exist
    initializeSidebar();
    initializeTheme();
});

function initializeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    
    if (!sidebar || !sidebarToggle) return;
    
    // Load saved sidebar state
    const isCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (isCollapsed) {
        sidebar.classList.add('collapsed');
        const icon = sidebarToggle.querySelector('i');
        icon.className = 'fas fa-chevron-right';
    }
    
    // Toggle sidebar
    sidebarToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        const icon = this.querySelector('i');
        const collapsed = sidebar.classList.contains('collapsed');
        
        if (collapsed) {
            icon.className = 'fas fa-chevron-right';
            localStorage.setItem('sidebarCollapsed', 'true');
        } else {
            icon.className = 'fas fa-chevron-left';
            localStorage.setItem('sidebarCollapsed', 'false');
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
