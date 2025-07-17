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