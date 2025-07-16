
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация настроек
    initializeSettings();
    
    // Обработчики событий для переключателей
    const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
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
        });
    });
    
    // Обработчик для выбора языка
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            saveSetting('language', this.value);
            showSettingFeedback('language', this.value);
        });
    }
    
    // Обработчик для dropdown настроек в сайдбаре
    const settingsBtn = document.getElementById('settings-btn');
    const settingsMenu = document.querySelector('.settings-menu');
    
    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = settingsMenu.classList.contains('show');
            
            // Закрываем все открытые меню
            document.querySelectorAll('.settings-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            // Переключаем текущее меню
            if (!isOpen) {
                settingsMenu.classList.add('show');
                settingsBtn.classList.add('active');
            } else {
                settingsBtn.classList.remove('active');
            }
        });
        
        // Закрытие при клике вне меню
        document.addEventListener('click', function(e) {
            if (!settingsBtn.contains(e.target) && !settingsMenu.contains(e.target)) {
                settingsMenu.classList.remove('show');
                settingsBtn.classList.remove('active');
            }
        });
    }
});

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
}

function getSettings() {
    // Получаем настройки из localStorage
    const savedSettings = localStorage.getItem('belwest_settings');
    const defaultSettings = {
        darkMode: false,
        notifications: true,
        autoRefresh: true,
        sound: false,
        language: 'ru'
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
        case 'language':
            applyLanguage(value);
            break;
    }
}

function applyDarkMode(enabled) {
    const body = document.body;
    const root = document.documentElement;
    
    if (enabled) {
        body.classList.add('dark-theme');
        root.style.setProperty('--bg-primary', '#1a1d29');
        root.style.setProperty('--bg-secondary', '#25293a');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--text-secondary', '#b8bcc8');
        root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.03)');
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.1)');
    } else {
        body.classList.remove('dark-theme');
        root.style.setProperty('--bg-primary', '#f8fafc');
        root.style.setProperty('--bg-secondary', '#ffffff');
        root.style.setProperty('--text-primary', '#1a202c');
        root.style.setProperty('--text-secondary', '#718096');
        root.style.setProperty('--glass-bg', 'rgba(255, 255, 255, 0.25)');
        root.style.setProperty('--glass-border', 'rgba(255, 255, 255, 0.3)');
    }
    
    console.log('Темная тема:', enabled ? 'включена' : 'выключена');
}

function applyNotifications(enabled) {
    if (enabled) {
        // Включаем уведомления
        if ('Notification' in window && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
        console.log('Уведомления включены');
    } else {
        console.log('Уведомления выключены');
    }
    
    // Сохраняем настройку в глобальную переменную
    window.notificationsEnabled = enabled;
}

function applyAutoRefresh(enabled) {
    if (enabled) {
        // Запускаем автообновление каждые 30 секунд
        if (window.autoRefreshInterval) {
            clearInterval(window.autoRefreshInterval);
        }
        
        window.autoRefreshInterval = setInterval(() => {
            // Обновляем данные на странице
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
        // Проигрываем тестовый звук
        playNotificationSound();
    }
}

function applyLanguage(language) {
    // Здесь можно добавить логику смены языка
    console.log('Язык изменен на:', language);
}

function showSettingFeedback(setting, value) {
    // Создаем уведомление об изменении настройки
    const settingNames = {
        darkMode: 'Темная тема',
        notifications: 'Уведомления',
        autoRefresh: 'Автообновление',
        sound: 'Звук',
        language: 'Язык'
    };
    
    const settingName = settingNames[setting] || setting;
    let message;
    
    if (typeof value === 'boolean') {
        message = `${settingName} ${value ? 'включена' : 'выключена'}`;
    } else {
        message = `${settingName} изменен на: ${value}`;
    }
    
    // Показываем уведомление
    showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.className = `setting-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--belwest-green);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Удаление через 3 секунды
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
    // Простой звук с помощью Web Audio API
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
