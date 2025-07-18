document.addEventListener('DOMContentLoaded', function() {
    initializeSettingsNavigation();
    initializeSettings();
    setupEventListeners();
});

function initializeSettingsNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.settings-section');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');

            // Убираем активный класс со всех элементов навигации
            navItems.forEach(nav => nav.classList.remove('active'));

            // Скрываем все секции
            sections.forEach(section => section.classList.remove('active'));

            // Активируем текущий элемент навигации
            this.classList.add('active');

            // Показываем соответствующую секцию
            const targetSection = document.getElementById(sectionId + '-section');
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });
}

function initializeSettings() {
    // Загружаем сохраненные настройки
    const settings = getSettings();

    // Применяем настройки к интерфейсу
    Object.keys(settings).forEach(setting => {
        const element = document.querySelector(`[data-setting="${setting}"]`);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = settings[setting] === true || settings[setting] === 'true';
            } else {
                element.value = settings[setting];
            }

            // Применяем настройку
            applySetting(setting, settings[setting]);
        }
    });

    // Загружаем настройки селектов
    const timezoneSelect = document.getElementById('timezone-select');
    const languageSelect = document.getElementById('language-select');
    const systemName = document.getElementById('system-name');

    if (timezoneSelect && settings.timezone) {
        timezoneSelect.value = settings.timezone;
    }

    if (languageSelect && settings.language) {
        languageSelect.value = settings.language;
    }

    if (systemName && settings.systemName) {
        systemName.value = settings.systemName;
    }
}

function setupEventListeners() {
    // Обработчики для переключателей
    const toggles = document.querySelectorAll('.setting-toggle input[type="checkbox"]');
    toggles.forEach(toggle => {
        toggle.addEventListener('change', function() {
            const setting = this.getAttribute('data-setting');
            const isEnabled = this.checked;

            // Сохранение настройки
            saveSetting(setting, isEnabled);

            // Применение настройки
            applySetting(setting, isEnabled);

            // Визуальная обратная связь
            showSettingFeedback(setting, isEnabled);

            // Отмечаем изменения
            markSettingsChanged();
        });
    });

    // Обработчики для селектов
    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        select.addEventListener('change', function() {
            const setting = this.id.replace('-select', '').replace('-', '');
            saveSetting(setting, this.value);
            applySetting(setting, this.value);
            showSettingFeedback(setting, this.value);
            markSettingsChanged();
        });
    });

    // Обработчик для текстовых полей
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            const setting = this.id.replace('-', '');
            saveSetting(setting, this.value);
            markSettingsChanged();
        });
    });

    // Обработчик кнопки сохранения
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveAllSettings);
    }

    // Обработчик кнопки сброса
    const resetBtn = document.getElementById('reset-settings-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetSettings);
    }
}

function getSettings() {
    // Получаем настройки из localStorage
    const savedSettings = localStorage.getItem('belwest_settings');
    const defaultSettings = {
        darkMode: false,
        notifications: true,
        autoRefresh: true,
        sound: false,
        autosave: true,
        animations: true,
        emailNotifications: false,
        smsNotifications: false,
        criticalNotifications: true,
        visitorManagement: true,
        dataAnalytics: true,
        autoReports: false,
        security: true,
        language: 'ru',
        timezone: 'UTC+3',
        systemName: 'Система управления посетителями'
    };

    if (savedSettings) {
        return { ...defaultSettings, ...JSON.parse(savedSettings) };
    }

    return defaultSettings;
}

function saveSetting(setting, value) {
    const settings = getSettings();
    settings[setting] = value;
    localStorage.setItem('belwest_settings', JSON.stringify(settings));
    console.log(`Настройка ${setting} сохранена:`, value);
}

function applySetting(setting, value) {
    switch (setting) {
        case 'darkMode':
            applyDarkMode(value);
            break;
        case 'notifications':
            applyNotifications(value);
            break;
        case 'autoRefresh':
            applyAutoRefresh(value);
            break;
        case 'sound':
            applySound(value);
            break;
        case 'animations':
            applyAnimations(value);
            break;
        case 'language':
            applyLanguage(value);
            break;
        case 'timezone':
            applyTimezone(value);
            break;
        default:
            console.log(`Настройка ${setting} применена:`, value);
    }
}

function applyDarkMode(enabled) {
    const body = document.body;
    const root = document.documentElement;

    if (enabled) {
        body.classList.add('dark-theme');
        root.style.setProperty('--bg-primary', '#0a0a0a');
        root.style.setProperty('--bg-secondary', '#1a1a1a');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#b8bcc8');
    } else {
        body.classList.remove('dark-theme');
        root.style.setProperty('--bg-primary', '#f8fafc');
        root.style.setProperty('--bg-secondary', '#ffffff');
        root.style.setProperty('--text-primary', '#1a202c');
        root.style.setProperty('--text-secondary', '#718096');
    }

    console.log('Темная тема:', enabled ? 'включена' : 'выключена');
}

function applyNotifications(enabled) {
    if (enabled) {
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        console.log('Уведомления включены');
    } else {
        console.log('Уведомления выключены');
    }

    window.notificationsEnabled = enabled;
}

function applyAutoRefresh(enabled) {
    if (enabled) {
        if (window.autoRefreshInterval) {
            clearInterval(window.autoRefreshInterval);
        }

        window.autoRefreshInterval = setInterval(() => {
            if (typeof refreshDashboardData === 'function') {
                refreshDashboardData();
            }
            console.log('Автообновление данных');
        }, 30000);

        console.log('Автообновление включено');
    } else {
        if (window.autoRefreshInterval) {
            clearInterval(window.autoRefreshInterval);
            window.autoRefreshInterval = null;
        }
        console.log('Автообновление выключено');
    }
}

function applySound(enabled) {
    window.soundEnabled = enabled;
    console.log('Звук:', enabled ? 'включен' : 'выключен');

    if (enabled) {
        playNotificationSound();
    }
}

function applyAnimations(enabled) {
    const root = document.documentElement;
    if (enabled) {
        root.style.setProperty('--transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');
    } else {
        root.style.setProperty('--transition', 'none');
    }
    console.log('Анимации:', enabled ? 'включены' : 'выключены');
}

function applyLanguage(language) {
    console.log('Язык изменен на:', language);
    // Здесь можно добавить логику смены языка
}

function applyTimezone(timezone) {
    console.log('Часовой пояс изменен на:', timezone);
    // Здесь можно добавить логику смены часового пояса
}

function markSettingsChanged() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn && !saveBtn.classList.contains('has-changes')) {
        saveBtn.classList.add('has-changes');
        saveBtn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Сохранить изменения';
        saveBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)';
    }
}

function saveAllSettings() {
    const saveBtn = document.getElementById('save-settings-btn');

    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    saveBtn.disabled = true;

    // Симулируем сохранение на сервере
    setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-check"></i> Настройки сохранены!';
        saveBtn.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
        saveBtn.classList.remove('has-changes');

        showNotification('Все настройки успешно сохранены', 'success');

        setTimeout(() => {
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить настройки';
            saveBtn.style.background = 'linear-gradient(135deg, var(--belwest-green) 0%, var(--belwest-green-light) 100%)';
            saveBtn.disabled = false;
        }, 2000);
    }, 1000);
}

function resetSettings() {
    if (confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
        localStorage.removeItem('belwest_settings');
        location.reload();
    }
}

function showSettingFeedback(setting, value) {
    const settingNames = {
        darkMode: 'Темная тема',
        notifications: 'Уведомления',
        autoRefresh: 'Автообновление',
        sound: 'Звук',
        autosave: 'Автосохранение',
        animations: 'Анимации',
        emailNotifications: 'Email уведомления',
        smsNotifications: 'SMS уведомления',
        criticalNotifications: 'Критические уведомления',
        visitorManagement: 'Управление посетителями',
        dataAnalytics: 'Аналитика данных',
        autoReports: 'Автоматические отчеты',
        security: 'Безопасность',
        language: 'Язык',
        timezone: 'Часовой пояс'
    };

    const settingName = settingNames[setting] || setting;
    let message;

    if (typeof value === 'boolean') {
        message = `${settingName} ${value ? 'включена' : 'выключена'}`;
    } else {
        message = `${settingName} изменен на: ${value}`;
    }

    showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentNode.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--glass-bg);
        backdrop-filter: var(--blur);
        border: 2px solid ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
        border-radius: 12px;
        padding: 16px 20px;
        color: var(--text-primary);
        box-shadow: 0 8px 32px var(--shadow-medium);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 300px;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function playNotificationSound() {
    if (window.soundEnabled && 'AudioContext' in window) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
}

// Экспорт функций для использования в других скриптах
window.settingsManager = {
    getSetting: function(setting) {
        const settings = getSettings();
        return settings[setting];
    },
    setSetting: function(setting, value) {
        saveSetting(setting, value);
        applySetting(setting, value);
        showSettingFeedback(setting, value);
    }
};
function applyTheme(theme) {
    const body = document.body;
    
    if (theme === 'Светлая') {
        body.classList.add('light-mode');
    } else {
        body.classList.remove('light-mode');
    }
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти из системы?')) {
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = data.redirect || '/login';
            }
        })
        .catch(error => {
            console.error('Logout error:', error);
            window.location.href = '/login';
        });
    }
}