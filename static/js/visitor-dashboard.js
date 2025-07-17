// Глобальные переменные
let visitorsChart;
let isActivityPaused = false;
let activityUpdateInterval;

// Функция инициализации
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadDashboardData();
    initializeChart();
    startRealTimeUpdates();
    setupEventListeners();
});

// Инициализация дашборда
function initializeDashboard() {
    console.log('Initializing dashboard...');

    // Проверяем авторизацию
    checkAuthStatus();

    // Инициализируем элементы управления
    initializeControls();
}

// Проверка статуса авторизации
function checkAuthStatus() {
    // Здесь можно добавить проверку токена или сессии
    console.log('Checking auth status...');
}

// Инициализация элементов управления
function initializeControls() {
    const hierarchySelect = document.getElementById('hierarchy-type');
    const entitySelect = document.getElementById('entity-selector');
    const periodSelect = document.getElementById('period-select');
    const refreshBtn = document.getElementById('refresh-data');

    if (hierarchySelect) {
        hierarchySelect.addEventListener('change', handleHierarchyChange);
    }

    if (entitySelect) {
        entitySelect.addEventListener('change', handleEntityChange);
    }

    if (periodSelect) {
        periodSelect.addEventListener('change', handlePeriodChange);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshDashboardData);
    }
}

// Обработчик изменения иерархии
function handleHierarchyChange(event) {
    const hierarchyType = event.target.value;
    const entitySelect = document.getElementById('entity-selector');

    if (hierarchyType) {
        entitySelect.style.display = 'block';
        loadHierarchyOptions(hierarchyType);
    } else {
        entitySelect.style.display = 'none';
        loadDashboardData();
    }
}

// Обработчик изменения сущности
function handleEntityChange() {
    loadDashboardData();
}

// Обработчик изменения периода
function handlePeriodChange() {
    loadDashboardData();
}

// Загрузка опций иерархии
async function loadHierarchyOptions(hierarchyType) {
    try {
        const response = await fetch(`/api/hierarchy/${hierarchyType}`);
        const options = await response.json();

        const entitySelect = document.getElementById('entity-selector');
        entitySelect.innerHTML = '<option value="">Выберите...</option>';

        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.id;
            optionElement.textContent = option.name;
            entitySelect.appendChild(optionElement);
        });

    } catch (error) {
        console.error('Error loading hierarchy options:', error);
    }
}

// Основная функция загрузки данных дашборда
async function loadDashboardData() {
    try {
        showLoadingState();

        const params = new URLSearchParams();

        const hierarchyType = document.getElementById('hierarchy-type')?.value;
        const entityId = document.getElementById('entity-selector')?.value;
        const period = document.getElementById('period-select')?.value || 'day';

        if (hierarchyType) params.append('hierarchy_type', hierarchyType);
        if (entityId) params.append('entity_id', entityId);
        params.append('period', period);

        const response = await fetch(`/api/sensor-data?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        updateMetrics(data);
        updateChart(data.hourly_data || []);
        updateSensorsList(data.sensors || []);
        updateActivityStream(data.sensors || []);

        hideLoadingState();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorState('Ошибка загрузки данных: ' + error.message);
    }
}

// Обновление метрик
function updateMetrics(data) {
    const period = document.getElementById('period-select')?.value || 'day';
    const periodText = {
        'hour': 'За последний час',
        'day': 'За последние 24 часа', 
        'week': 'За неделю',
        'month': 'За месяц'
    };

    const metrics = {
        'total-visitors': {
            value: data.total_visitors || 0,
            trend: calculateTrend(data.total_visitors, data.previous_visitors)
        },
        'active-sensors': {
            value: data.active_sensors || 0,
            trend: 'neutral'
        },
        'peak-time': {
            value: data.peak_weekday || '14:30',
            trend: 'neutral'
        },
        'visitors-per-minute': {
            value: calculateVisitorsPerMinute(data.total_visitors, data.hourly_data),
            trend: 'up'
        },
        'active-stores': {
            value: data.active_stores || 12,
            trend: 'up'
        },
        'system-health': {
            value: '99.2%',
            trend: 'up'
        }
    };

    // Обновляем период
    const periodElement = document.getElementById('visitors-period');
    if (periodElement) {
        periodElement.textContent = periodText[period];
    }

    Object.entries(metrics).forEach(([id, metricData]) => {
        const element = document.getElementById(id);
        const trendElement = document.getElementById(id.replace('-', '-') + '-trend');

        if (element) {
            // Удаляем placeholder
            const placeholder = element.querySelector('.loading-placeholder');
            if (placeholder) {
                placeholder.remove();
            }

            element.classList.add('updating');
            setTimeout(() => {
                element.textContent = metricData.value;
                element.classList.remove('updating');
                animateCounter(element, metricData.value);
            }, 300);
        }

        // Обновляем тренд если есть элемент
        if (trendElement) {
            trendElement.className = `metric-trend ${metricData.trend}`;
        }
    });
}

// Расчет тренда
function calculateTrend(current, previous) {
    if (!previous || previous === 0) return 'neutral';

    const change = ((current - previous) / previous) * 100;

    if (change > 5) return 'up';
    if (change < -5) return 'down';
    return 'neutral';
}

// Анимация счетчика
function animateCounter(element, finalValue) {
    const numericValue = parseInt(finalValue) || 0;
    if (numericValue === 0) return;

    const increment = Math.ceil(numericValue / 30);
    let currentValue = 0;

    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= numericValue) {
            currentValue = numericValue;
            clearInterval(timer);
        }
        element.textContent = typeof finalValue === 'string' && isNaN(finalValue) ? finalValue : currentValue;
    }, 50);
}

// Расчет посетителей в минуту
function calculateVisitorsPerMinute(totalVisitors, hourlyData) {
    if (!hourlyData || hourlyData.length === 0) return '0.0';

    const totalMinutes = hourlyData.length * 60;
    const visitorsPerMinute = totalVisitors / totalMinutes;
    return visitorsPerMinute.toFixed(1);
}

// Инициализация графика
function initializeChart() {
    const ctx = document.getElementById('visitorsChart');
    if (!ctx) return;

    visitorsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Посетители',
                data: [],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            elements: {
                point: {
                    hoverBackgroundColor: '#4f46e5'
                }
            }
        }
    });
}

// Обновление графика
function updateChart(hourlyData) {
    if (!visitorsChart || !hourlyData) return;

    const labels = hourlyData.map(item => `${item.hour}:00`);
    const data = hourlyData.map(item => item.visitors || 0);

    visitorsChart.data.labels = labels;
    visitorsChart.data.datasets[0].data = data;
    visitorsChart.update('active');
}

// Обновление списка датчиков
function updateSensorsList(sensors) {
    const sensorsList = document.getElementById('sensors-list');
    if (!sensorsList) return;

    sensorsList.innerHTML = '';

    if (!sensors || sensors.length === 0) {
        sensorsList.innerHTML = '<div class="no-data">Нет данных о датчиках</div>';
        return;
    }

    sensors.forEach(sensor => {
        const sensorElement = createSensorElement(sensor);
        sensorsList.appendChild(sensorElement);
    });

    // Обновляем активность датчиков
    updateSensorsActivity(sensors);

    // Сохраняем данные для других функций
    localStorage.setItem('lastSensorsData', JSON.stringify(sensors));
}

// Обновление активности датчиков
function updateSensorsActivity(sensors) {
    const activityList = document.getElementById('sensors-activity-list');
    if (!activityList) return;

    activityList.innerHTML = '';

    sensors.forEach(sensor => {
        const activityItem = createSensorActivityItem(sensor);
        activityList.appendChild(activityItem);
    });
}

// Создание элемента активности датчика
function createSensorActivityItem(sensor) {
    const activityDiv = document.createElement('div');
    activityDiv.className = 'sensor-activity-item';

    const statusClass = sensor.status === 'active' ? 'online' : 'offline';
    const visitors = sensor.visitors || sensor.visitor_count || sensor.current_visitors || 0;
    const lastUpdate = sensor.last_update ? new Date(sensor.last_update).toLocaleTimeString() : 'Неизвестно';

    activityDiv.innerHTML = `
        <div class="activity-sensor-info">
            <div class="sensor-name">${sensor.name || 'Неизвестный датчик'}</div>
            <div class="sensor-location">${sensor.location || 'Не указано'}</div>
        </div>
        <div class="activity-metrics">
            <div class="activity-visitors">
                <span class="visitors-count">${visitors}</span>
                <span class="visitors-label">посетителей</span>
            </div>
            <div class="activity-status ${statusClass}">
                <i class="fas fa-circle"></i>
                <span>${sensor.status === 'active' ? 'Онлайн' : 'Офлайн'}</span>
            </div>
            <div class="activity-time">
                <i class="fas fa-clock"></i>
                <span>${lastUpdate}</span>
            </div>
        </div>
        <div class="activity-chart">
            <div class="mini-chart" data-sensor-id="${sensor.id}">
                <canvas width="60" height="30"></canvas>
            </div>
        </div>
    `;

    return activityDiv;
}

// Создание элемента датчика
function createSensorElement(sensor) {
    const sensorDiv = document.createElement('div');
    sensorDiv.className = 'sensor-item';
    sensorDiv.setAttribute('data-status', sensor.status || 'offline');

    const statusClass = sensor.status === 'active' ? 'online' : 'offline';
    const statusText = sensor.status === 'active' ? 'Онлайн' : 'Офлайн';
    const visitors = sensor.visitors || sensor.visitor_count || sensor.current_visitors || 0;

    sensorDiv.innerHTML = `
        <div class="sensor-info">
            <div class="sensor-name">${sensor.name || 'Неизвестный датчик'}</div>
            <div class="sensor-location">${sensor.location || 'Не указано'}</div>
        </div>
        <div class="sensor-metrics">
            <div class="sensor-visitors">${visitors}</div>
            <div class="sensor-status ${statusClass}">${statusText}</div>
        </div>
        <div class="sensor-indicator ${statusClass}"></div>
    `;

    return sensorDiv;
}

// Обновление потока активности
function updateActivityStream(sensors) {
    if (isActivityPaused) return;

    const activityStream = document.getElementById('activity-stream');
    if (!activityStream) return;

    // Создаем активность на основе данных датчиков
    sensors.forEach(sensor => {
        if (sensor.status === 'active' && Math.random() > 0.7) {
            addActivityItem(sensor);
        }
    });

    // Ограничиваем количество элементов активности
    const items = activityStream.querySelectorAll('.activity-item');
    if (items.length > 10) {
        for (let i = 10; i < items.length; i++) {
            items[i].remove();
        }
    }
}

// Добавление элемента активности
function addActivityItem(sensor) {
    const activityStream = document.getElementById('activity-stream');
    if (!activityStream) return;

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';

    const time = new Date().toLocaleTimeString();
    const visitors = sensor.visitors || sensor.visitor_count || 0;

    activityItem.innerHTML = `
        <div class="activity-time">${time}</div>
        <div class="activity-content">
            <span class="activity-sensor">${sensor.name}</span>
            <span class="activity-action">зарегистрировал ${visitors} посетителей</span>
        </div>
        <div class="activity-indicator active"></div>
    `;

    activityStream.insertBefore(activityItem, activityStream.firstChild);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки фильтра статуса датчиков
    const statusFilters = document.querySelectorAll('.status-filter .filter-btn');
    statusFilters.forEach(btn => {
        btn.addEventListener('click', function() {
            statusFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterSensorsByStatus(this.dataset.filter);
        });
    });

    // Фильтры активности датчиков
    const activityFilters = document.querySelectorAll('.activity-filter-controls .filter-btn');
    activityFilters.forEach(btn => {
        btn.addEventListener('click', function() {
            activityFilters.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterSensorsActivity(this.dataset.filter);
        });
    });

    // Кнопки периода графика
    const chartButtons = document.querySelectorAll('.chart-btn');
    chartButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            chartButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            loadDashboardData();
        });
    });

    // Управление активностью
    const pauseBtn = document.getElementById('pause-activity');
    const clearBtn = document.getElementById('clear-activity');

    if (pauseBtn) {
        pauseBtn.addEventListener('click', toggleActivityPause);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearActivityStream);
    }

    // Меню пользователя
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', function() {
            userDropdown.classList.remove('show');
        });
    }

    // Поиск по дашборду
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', handleDashboardSearch);
    }
}

// Обработчик поиска по дашборду
function handleDashboardSearch(event) {
    const searchTerm = event.target.value.toLowerCase();

    // Фильтруем датчики
    const sensorItems = document.querySelectorAll('.sensor-item');
    sensorItems.forEach(item => {
        const sensorName = item.querySelector('.sensor-name')?.textContent.toLowerCase() || '';
        const sensorLocation = item.querySelector('.sensor-location')?.textContent.toLowerCase() || '';

        if (sensorName.includes(searchTerm) || sensorLocation.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });

    // Фильтруем активность
    const activityItems = document.querySelectorAll('.sensor-activity-item');
    activityItems.forEach(item => {
        const sensorName = item.querySelector('.sensor-name')?.textContent.toLowerCase() || '';

        if (sensorName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Фильтрация активности датчиков
function filterSensorsActivity(filter) {
    const activityItems = document.querySelectorAll('.sensor-activity-item');

    activityItems.forEach(item => {
        const statusElement = item.querySelector('.activity-status');
        const isOnline = statusElement?.classList.contains('online');

        if (filter === 'all') {
            item.style.display = 'flex';
        } else if (filter === 'online' && isOnline) {
            item.style.display = 'flex';
        } else if (filter === 'offline' && !isOnline) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Фильтрация датчиков по статусу
function filterSensorsByStatus(status) {
    const sensors = document.querySelectorAll('.sensor-item');

    sensors.forEach(sensor => {
        if (status === 'all') {
            sensor.style.display = 'flex';
        } else {
            const sensorStatus = sensor.dataset.status;
            sensor.style.display = (status === 'online' && sensorStatus === 'active') || 
                                   (status === 'offline' && sensorStatus !== 'active') ? 'flex' : 'none';
        }
    });
}

// Переключение паузы активности
function toggleActivityPause() {
    isActivityPaused = !isActivityPaused;
    const pauseBtn = document.getElementById('pause-activity');

    if (pauseBtn) {
        const icon = pauseBtn.querySelector('i');
        if (isActivityPaused) {
            icon.className = 'fas fa-play';
            pauseBtn.title = 'Возобновить';
        } else {
            icon.className = 'fas fa-pause';
            pauseBtn.title = 'Приостановить';
        }
    }
}

// Очистка потока активности
function clearActivityStream() {
    const activityStream = document.getElementById('activity-stream');
    if (activityStream) {
        activityStream.innerHTML = '<div class="no-activity">Нет активности</div>';
    }
}

// Обновление данных
function refreshDashboardData() {
    const refreshBtn = document.getElementById('refresh-data');
    if (refreshBtn) {
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('fa-spin');

        setTimeout(() => {
            icon.classList.remove('fa-spin');
        }, 1000);
    }

    loadDashboardData();
}

// Запуск обновлений в реальном времени
function startRealTimeUpdates() {
    // Обновляем данные каждые 30 секунд
    setInterval(loadDashboardData, 30000);

    // Обновляем активность каждые 5 секунд
    setInterval(() => {
        if (!isActivityPaused) {
            const sensors = JSON.parse(localStorage.getItem('lastSensorsData') || '[]');
            updateActivityStream(sensors);
        }
    }, 5000);
}

// Отображение состояния загрузки
function showLoadingState() {
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        if (!metric.classList.contains('loading')) {
            metric.classList.add('loading');
        }
    });
}

// Скрытие состояния загрузки
function hideLoadingState() {
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        metric.classList.remove('loading');
    });
}

// Отображение состояния ошибки
function showErrorState(message) {
    console.error('Dashboard error:', message);

    // Показываем уведомление об ошибке
    const notification = document.createElement('div');
    notification.className = 'error-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);

    hideLoadingState();
}

// Функция выхода
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
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

// Глобальные функции
window.refreshAIInsights = refreshAIInsights;
window.showAIRecommendations = showAIRecommendations;
window.showAIPredictions = showAIPredictions;
window.closeAIModal = closeAIModal;

function setupActivityFilters() {
    const filterBtns = document.querySelectorAll('.activity-filter-controls .filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Убираем активный класс у всех кнопок
            filterBtns.forEach(b => b.classList.remove('active'));
            // Добавляем активный класс к нажатой кнопке
            this.classList.add('active');
            // Перезагружаем активность датчиков с новым фильтром
            loadDashboardData();
        });
    });
}

// Инициализация дашборда
document.addEventListener('DOMContentLoaded', function() {
    console.log('Дашборд загружается...');

    // Инициализация основных компонентов
    initializeCharts();
    loadDashboardData();
    setupEventListeners();
    initializeSensorsData();
    startRealTimeUpdates();

    console.log('Дашборд инициализирован');
});

// Инициализация данных датчиков
function initializeSensorsData() {
    // Загрузка списка датчиков
    loadSensorsList();
    loadSensorsActivity();
    loadRealtimeActivity();
}

// Загрузка списка датчиков
function loadSensorsList() {
    const sensorsList = document.getElementById('sensors-list');
    if (!sensorsList) return;

    // Симуляция данных датчиков
    const sensors = [
        { id: 1, name: 'Датчик-001', location: 'Главный вход', status: 'online', visitors: 142 },
        { id: 2, name: 'Датчик-002', location: 'Касса №1', status: 'online', visitors: 89 },
        { id: 3, name: 'Датчик-003', location: 'Касса №2', status: 'offline', visitors: 0 },
        { id: 4, name: 'Датчик-004', location: 'Выход', status: 'online', visitors: 134 },
        { id: 5, name: 'Датчик-005', location: 'Примерочная', status: 'online', visitors: 67 },
        { id: 6, name: 'Датчик-006', location: 'Склад', status: 'offline', visitors: 0 }
    ];

    let html = '';
    sensors.forEach(sensor => {
        html += `
            <div class="sensor-list-item">
                <div class="sensor-status-icon ${sensor.status}">
                    <i class="fas ${sensor.status === 'online' ? 'fa-wifi' : 'fa-exclamation-triangle'}"></i>
                </div>
                <div class="sensor-list-info">
                    <div class="sensor-list-name">${sensor.name}</div>
                    <div class="sensor-list-details">${sensor.location}</div>
                </div>
                <div class="sensor-list-stats">
                    <div class="sensor-list-visitors">${sensor.visitors}</div>
                    <div class="sensor-list-label">посетителей</div>
                </div>
            </div>
        `;
    });

    sensorsList.innerHTML = html;
}

// Загрузка активности датчиков
function loadSensorsActivity() {
    const activityList = document.getElementById('sensors-activity-list');
    if (!activityList) return;

    const activities = [
        { sensor: 'Датчик-001', status: 'active', message: 'Высокая активность', time: '2 мин назад', type: 'visitor' },
        { sensor: 'Датчик-002', status: 'active', message: 'Нормальная работа', time: '5 мин назад', type: 'system' },
        { sensor: 'Датчик-003', status: 'inactive', message: 'Соединение потеряно', time: '1 час назад', type: 'alert' },
        { sensor: 'Датчик-004', status: 'active', message: 'Пиковое время', time: '10 мин назад', type: 'visitor' },
        { sensor: 'Датчик-005', status: 'warning', message: 'Низкий заряд', time: '30 мин назад', type: 'sensor' }
    ];

    let html = '';
    activities.forEach(activity => {
        html += `
            <div class="sensor-activity-item">
                <div class="sensor-activity-info">
                    <div class="sensor-activity-icon ${activity.status}">
                        <i class="fas ${getActivityIcon(activity.type)}"></i>
                    </div>
                    <div class="sensor-activity-details">
                        <h4>${activity.sensor}</h4>
                        <p>${activity.message}</p>
                    </div>
                </div>
                <div class="sensor-activity-status">
                    <span class="sensor-activity-badge ${activity.status}">${getStatusText(activity.status)}</span>
                    <div class="sensor-activity-time">${activity.time}</div>
                </div>
            </div>
        `;
    });

    activityList.innerHTML = html;
}

// Загрузка активности в реальном времени
function loadRealtimeActivity() {
    const activityStream = document.getElementById('activity-stream');
    if (!activityStream) return;

    const realtimeActivities = [
        { type: 'visitor', title: 'Новый посетитель', description: 'Датчик-001: обнаружен вход', time: '30 сек назад' },
        { type: 'sensor', title: 'Статус датчика', description: 'Датчик-002: соединение восстановлено', time: '2 мин назад' },
        { type: 'alert', title: 'Предупреждение', description: 'Датчик-003: нет сигнала', time: '5 мин назад' },
        { type: 'system', title: 'Системное событие', description: 'Обновление конфигурации', time: '10 мин назад' }
    ];

    let html = '';
    realtimeActivities.forEach(activity => {
        html += `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas ${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `;
    });

    activityStream.innerHTML = html;
}

function getActivityIcon(type) {
    const icons = {
        visitor: 'fa-user',
        sensor: 'fa-wifi',
        alert: 'fa-exclamation-triangle',
        system: 'fa-cog'
    };
    return icons[type] || 'fa-info-circle';
}

function getStatusText(status) {
    const texts = {
        active: 'Активен',
        inactive: 'Офлайн',
        warning: 'Предупреждение'
    };
    return texts[status] || 'Неизвестно';
}

// Загрузка данных дашборда
async function loadDashboardData() {
    try {
        showLoadingState();

        const params = new URLSearchParams();

        const hierarchyType = document.getElementById('hierarchy-type')?.value;
        const entityId = document.getElementById('entity-selector')?.value;
        const period = document.getElementById('period-select')?.value || 'day';

        if (hierarchyType) params.append('hierarchy_type', hierarchyType);
        if (entityId) params.append('entity_id', entityId);
        params.append('period', period);

        const response = await fetch(`/api/sensor-data?${params.toString()}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        updateMetrics(data);
        updateChart(data.hourly_data || []);
        updateSensorsList(data.sensors || []);
        updateActivityStream(data.sensors || []);

        hideLoadingState();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorState('Ошибка загрузки данных: ' + error.message);
    }
}

// Загрузка демо данных
function loadDemoData() {
    console.log('Загрузка демо данных...');

    // Обновляем метрики демо данными
    const demoMetrics = {
        totalVisitors: 2847,
        activeSensors: 94,
        peakTime: '14:30',
        visitorsPerMinute: 8.7,
        activeStores: 12,
        systemHealth: 99.2
    };

    updateMetrics(demoMetrics);

    // Обновляем график демо данными
    updateChart({
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
        data: [45, 23, 187, 342, 489, 267]
    });
}

// Обновление метрик
function updateMetrics(metrics) {
    if (!metrics) return;

    // Обновляем значения метрик с анимацией
    const elements = {
        'total-visitors': metrics.totalVisitors || 2847,
        'active-sensors': metrics.activeSensors || 94,
        'peak-time': metrics.peakTime || '14:30',
        'visitors-per-minute': metrics.visitorsPerMinute || 8.7,
        'active-stores': metrics.activeStores || 12,
        'system-health': metrics.systemHealth || '99.2%'
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            // Удаляем класс loading-placeholder если есть
            const placeholder = element.querySelector('.loading-placeholder');
            if (placeholder) {
                element.innerHTML = value;
            } else {
                animateCounter(element, value);
            }
        }
    });

    // Обновляем подписи периодов
    updatePeriodLabels();
}

// Анимация счетчика
function animateCounter(element, targetValue) {
    const currentValue = parseInt(element.textContent) || 0;
    const target = typeof targetValue === 'string' ? parseInt(targetValue) : targetValue;

    if (isNaN(target)) {
        element.textContent = targetValue;
        return;
    }

    const duration = 1000;
    const startTime = performance.now();
```python
// The code updates the dashboard initialization, data loading, metrics updating, and chart functionalities.
    const startValue = currentValue;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const current = startValue + (target - startValue) * easeOutQuart(progress);
        element.textContent = Math.round(current);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            element.textContent = targetValue;
        }
    }

    requestAnimationFrame(animate);
}

// Функция плавности анимации
function easeOutQuart(t) {
    return 1 - (--t) * t * t * t;
}

// Обновление подписей периодов
function updatePeriodLabels() {
    const periodSelect = document.getElementById('period-select');
    if (!periodSelect) return;

    const period = periodSelect.value;
    const periodLabels = {
        'hour': 'За последний час',
        'day': 'За последние 24 часа',
        'week': 'За последнюю неделю',
        'month': 'За последний месяц'
    };

    const visitorsLabel = document.getElementById('visitors-period');
    if (visitorsLabel) {
        visitorsLabel.textContent = periodLabels[period] || 'За последние 24 часа';
    }
}

// Инициализация графиков
function initializeChart() {
    const ctx = document.getElementById('visitorsChart');
    if (!ctx) return;

    visitorsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Посетители',
                data: [],
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            elements: {
                point: {
                    hoverBackgroundColor: '#4f46e5'
                }
            }
        }
    });
}

// Обновление графика
function updateChart(hourlyData) {
    if (!visitorsChart || !hourlyData) return;

    const labels = hourlyData.map(item => `${item.hour}:00`);
    const data = hourlyData.map(item => item.visitors || 0);

    visitorsChart.data.labels = labels;
    visitorsChart.data.datasets[0].data = data;
    visitorsChart.update('active');
}