
document.addEventListener("DOMContentLoaded", function () {
    // Theme toggle functionality
    const themeSelect = document.getElementById("theme-select");
    const themeToggle = document.getElementById("dark-mode-toggle");
    
    // Load saved preferences
    const savedTheme = localStorage.getItem('theme') || 'dark-mode';
    const savedLanguage = localStorage.getItem('language') || 'ru';
    
    document.body.className = savedTheme;
    themeSelect.value = savedTheme;
    document.getElementById('language-select').value = savedLanguage;
    updateThemeIcon(savedTheme);

    // Theme selection handler
    themeSelect.addEventListener("change", function () {
        const selectedTheme = this.value;
        document.body.className = selectedTheme;
        localStorage.setItem('theme', selectedTheme);
        updateThemeIcon(selectedTheme);
    });

    // Language selection handler
    document.getElementById('language-select').addEventListener("change", function () {
        localStorage.setItem('language', this.value);
        // Here you could add logic to change the interface language
    });

    // Theme toggle button
    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            const currentTheme = document.body.classList.contains('dark-mode') ? 'light-mode' : 'dark-mode';
            document.body.className = currentTheme;
            themeSelect.value = currentTheme;
            localStorage.setItem('theme', currentTheme);
            updateThemeIcon(currentTheme);
        });
    }

    function updateThemeIcon(theme) {
        const icon = document.getElementById("dark-mode-toggle");
        if (icon) {
            if (theme === 'dark-mode') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
    }

    // Save profile handler
    document.getElementById('save-profile').addEventListener('click', function() {
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Validate passwords
        if (newPassword && newPassword !== confirmPassword) {
            alert('Пароли не совпадают!');
            return;
        }
        
        // Here you would typically send the data to the server
        console.log('Saving profile:', {
            username,
            email,
            theme: themeSelect.value,
            language: document.getElementById('language-select').value,
            notifications: document.getElementById('notifications-toggle').checked
        });
        
        alert('Настройки сохранены!');
    });

    // Reset profile handler
    document.getElementById('reset-profile').addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите сбросить настройки?')) {
            document.getElementById('profile-form').reset();
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        }
    });
});
