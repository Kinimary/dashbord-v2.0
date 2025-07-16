
document.addEventListener("DOMContentLoaded", function () {
    const userId = 1; // пока «жёсткий» пользователь

    // Инициализация переключателей из localStorage
    initializeToggles();
    
    // Инициализация языка
    initializeLanguage();

    // --- GET ---
    fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
            document.getElementById("theme-select").value =
                data.theme || "dark";
            document.getElementById("lang-select").value = data.lang || "ru";
            document.getElementById("email-notify").checked = data.email_notify;
            document.getElementById("push-notify").checked = data.push_notify;
            // Заполняем историю входов (заглушка)
            document.getElementById("login-history").innerHTML =
                "<ul><li>2024-07-14 (127.0.0.1)</li></ul>";
        })
        .catch(() => {
            // Если API недоступен, используем localStorage
            loadSettingsFromStorage();
        });

    // --- PUT ---
    function sendSettings() {
        const theme = document.getElementById("theme-select").value;
        const lang = document.getElementById("lang-select").value;
        const email = document.getElementById("email-notify").checked;
        const push = document.getElementById("push-notify").checked;

        fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                theme,
                lang,
                email_notify: email,
                push_notify: push,
            }),
        })
            .then((r) => r.json())
            .then((d) => alert(d.message || "Настройки сохранены"))
            .catch(() => {
                // Сохраняем в localStorage если API недоступен
                saveSettingsToStorage();
                alert("Настройки сохранены локально");
            });
    }

    // Обработчики для элементов страницы настроек
    const themeSelect = document.getElementById("theme-select");
    const langSelect = document.getElementById("lang-select");
    const emailNotify = document.getElementById("email-notify");
    const pushNotify = document.getElementById("push-notify");

    if (themeSelect) themeSelect.onchange = sendSettings;
    if (langSelect) langSelect.onchange = sendSettings;
    if (emailNotify) emailNotify.onchange = sendSettings;
    if (pushNotify) pushNotify.onchange = sendSettings;

    // --- RESET ---
    const resetButton = document.getElementById("reset-settings");
    if (resetButton) {
        resetButton.onclick = () => {
            fetch("/api/settings/reset", { method: "POST" })
                .then((r) => r.json())
                .then((d) => {
                    alert(d.message || "Настройки сброшены");
                    localStorage.clear();
                    window.location.reload();
                })
                .catch(() => {
                    localStorage.clear();
                    alert("Настройки сброшены");
                    window.location.reload();
                });
        };
    }

    function initializeToggles() {
        // Инициализация всех переключателей
        const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
        
        toggles.forEach(toggle => {
            const setting = toggle.getAttribute('data-setting');
            const savedValue = localStorage.getItem(setting);
            
            // Устанавливаем сохраненное значение
            if (savedValue !== null) {
                toggle.checked = savedValue === 'true';
            }
            
            // Применяем начальное состояние
            applyToggleSetting(toggle);
            
            // Добавляем обработчик изменения
            toggle.addEventListener('change', function() {
                localStorage.setItem(setting, this.checked);
                applyToggleSetting(this);
            });
        });
    }

    function applyToggleSetting(toggle) {
        const setting = toggle.getAttribute('data-setting');
        const isChecked = toggle.checked;
        
        switch(setting) {
            case 'darkMode':
                handleThemeToggle(!isChecked); // Инвертируем для темной темы
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

    function handleThemeToggle(isDark) {
        const body = document.body;
        const themeIcon = document.getElementById('theme-icon');
        
        if (isDark) {
            body.classList.remove('light-mode');
            body.classList.add('dark-mode');
            if (themeIcon) themeIcon.className = 'fas fa-moon';
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            body.classList.add('light-mode');
            if (themeIcon) themeIcon.className = 'fas fa-sun';
            localStorage.setItem('theme', 'light');
        }
        
        showNotification(isDark ? 'Темная тема включена' : 'Светлая тема включена', 'success');
    }

    function handleNotificationsToggle(enabled) {
        window.notificationsEnabled = enabled;
        showNotification(enabled ? 'Уведомления включены' : 'Уведомления отключены', 'info');
    }

    function handleAutoRefreshToggle(enabled) {
        if (enabled) {
            startAutoRefresh();
            showNotification('Авто-обновление включено', 'success');
        } else {
            stopAutoRefresh();
            showNotification('Авто-обновление отключено', 'info');
        }
    }

    function handleSoundToggle(enabled) {
        window.soundEnabled = enabled;
        showNotification(enabled ? 'Звуки включены' : 'Звуки отключены', 'info');
    }

    function handleAutoSaveToggle(enabled) {
        window.autoSaveEnabled = enabled;
        showNotification(enabled ? 'Авто-сохранение включено' : 'Авто-сохранение отключено', 'info');
    }

    function initializeLanguage() {
        const languageSelect = document.getElementById('language-select');
        if (languageSelect) {
            const savedLang = localStorage.getItem('language') || 'ru';
            languageSelect.value = savedLang;
            applyLanguage(savedLang);
            
            languageSelect.addEventListener('change', function() {
                const selectedLang = this.value;
                localStorage.setItem('language', selectedLang);
                applyLanguage(selectedLang);
                showNotification('Язык изменен', 'success');
            });
        }
    }

    function applyLanguage(lang) {
        // Здесь можно добавить логику для смены языка интерфейса
        document.documentElement.lang = lang;
        
        // Пример базовой локализации
        const translations = {
            'ru': {
                'dashboard': 'Панель управления',
                'users': 'Пользователи',
                'sensors': 'Датчики',
                'reports': 'Отчеты',
                'settings': 'Настройки'
            },
            'en': {
                'dashboard': 'Dashboard',
                'users': 'Users',
                'sensors': 'Sensors',
                'reports': 'Reports',
                'settings': 'Settings'
            },
            'be': {
                'dashboard': 'Панэль кіравання',
                'users': 'Карыстальнікі',
                'sensors': 'Датчыкі',
                'reports': 'Справаздачы',
                'settings': 'Налады'
            }
        };

        if (translations[lang]) {
            updatePageTexts(translations[lang]);
        }
    }

    function updatePageTexts(texts) {
        // Обновляем тексты в меню
        const menuItems = document.querySelectorAll('.menu a span');
        menuItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            if (texts[text]) {
                item.textContent = texts[text];
            }
        });
    }

    function loadSettingsFromStorage() {
        const theme = localStorage.getItem('theme') || 'dark';
        const lang = localStorage.getItem('language') || 'ru';
        
        const themeSelect = document.getElementById("theme-select");
        const langSelect = document.getElementById("lang-select");
        
        if (themeSelect) themeSelect.value = theme;
        if (langSelect) langSelect.value = lang;
    }

    function saveSettingsToStorage() {
        const themeSelect = document.getElementById("theme-select");
        const langSelect = document.getElementById("lang-select");
        
        if (themeSelect) localStorage.setItem('theme', themeSelect.value);
        if (langSelect) localStorage.setItem('language', langSelect.value);
    }

    function showNotification(message, type) {
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
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        `;
        
        if (type === 'error') {
            notification.style.background = '#e74c3c';
        } else if (type === 'info') {
            notification.style.background = '#3498db';
        }
        
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
            // Здесь можно добавить логику обновления данных
        }, 30000);
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
});
