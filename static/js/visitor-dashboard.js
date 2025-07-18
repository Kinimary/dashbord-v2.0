// Глобальные переменные
let visitorsChart;
let isActivityPaused = false;
let activityUpdateInterval;

// Функция инициализации
document.addEventListener('DOMContentLoaded', function() {
    console.log('Дашборд загружается...');

    // Показываем начальные данные сразу
    showInitialData();

    initializeDashboard();
    initializeChart();
    loadDashboardData();
    setupEventListeners();
    startRealTimeUpdates();

    console.log('Дашборд инициализирован');
});

// Показ начальных данных
function showInitialData() {
    const demoData = getDemoData();
    updateMetrics(demoData);
    updateChart(demoData.hourly_data);
    updateSensorsList(demoData.sensors);
    updateActivityStream(demoData.sensors);
}

// Инициализация дашборда
function initializeDashboard() {
    console.log('Initializing dashboard...');
    checkAuthStatus();
    initializeControls();
}

// Проверка статуса авторизации
function checkAuthStatus() {
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

        let data;
        try {
            const response = await fetch(`/api/sensor-data?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            data = await response.json();
        } catch (error) {
            console.warn('API недоступен, используем демо данные:', error);
            data = getDemoData();
        }

        updateMetrics(data);
        updateChart(data.hourly_data || []);
        updateSensorsList(data.sensors || []);
        updateActivityStream(data.sensors || []);

        hideLoadingState();

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        const data = getDemoData();
        updateMetrics(data);
        updateChart(data.hourly_data || []);
        updateSensorsList(data.sensors || []);
        updateActivityStream(data.sensors || []);
        hideLoadingState();
    }
}

// Функция получения демо данных
function getDemoData() {
    return {
        total_visitors: 2847,
        active_sensors: 94,
        peak_weekday: '14:30',
        avg_visit_time: 4.2,
        unique_visitors: 1993,
        repeat_visits: 854,
        hourly_data: [
            { hour: 0, visitors: 45 },
            { hour: 1, visitors: 23 },
            { hour: 2, visitors: 12 },
            { hour: 3, visitors: 8 },
            { hour: 4, visitors: 15 },
            { hour: 5, visitors: 35 },
            { hour: 6, visitors: 78 },
            { hour: 7, visitors: 134 },
            { hour: 8, visitors: 187 },
            { hour: 9, visitors: 245 },
            { hour: 10, visitors: 298 },
            { hour: 11, visitors: 342 },
            { hour: 12, visitors: 389 },
            { hour: 13, visitors: 456 },
            { hour: 14, visitors: 489 },
            { hour: 15, visitors: 423 },
            { hour: 16, visitors: 378 },
            { hour: 17, visitors: 334 },
            { hour: 18, visitors: 289 },
            { hour: 19, visitors: 234 },
            { hour: 20, visitors: 178 },
            { hour: 21, visitors: 123 },
            { hour: 22, visitors: 89 },
            { hour: 23, visitors: 67 }
        ],
        sensors: [
            { id: 1, name: 'Датчик-001', location: 'Главный вход', status: 'active', visitors: 142, current_visitors: 142, last_update: new Date().toISOString() },
            { id: 2, name: 'Датчик-002', location: 'Касса №1', status: 'active', visitors: 89, current_visitors: 89, last_update: new Date().toISOString() },
            { id: 3, name: 'Датчик-003', location: 'Касса №2', status: 'offline', visitors: 0, current_visitors: 0, last_update: new Date(Date.now() - 3600000).toISOString() },
            { id: 4, name: 'Датчик-004', location: 'Выход', status: 'active', visitors: 134, current_visitors: 134, last_update: new Date().toISOString() },
            { id: 5, name: 'Датчик-005', location: 'Примерочная', status: 'active', visitors: 67, current_visitors: 67, last_update: new Date().toISOString() },
            { id: 6, name: 'Датчик-006', location: 'Склад', status: 'offline', visitors: 0, current_visitors: 0, last_update: new Date(Date.now() - 7200000).toISOString() }
        ]
    };
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
            value: data.total_visitors || 2847,
            trend: 'up'
        },
        'active-sensors': {
            value: data.active_sensors || 94,
            trend: 'up'
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

        if (element) {
            // Удаляем placeholder если есть
            const placeholder = element.querySelector('.loading-placeholder');
            if (placeholder) {
                element.innerHTML = '';
            }

            // Обновляем значение
            element.textContent = metricData.value;

            // Добавляем анимацию
            element.classList.add('metric-updated');
            setTimeout(() => {
                element.classList.remove('metric-updated');
            }, 1000);
        }
    });

    console.log('Метрики обновлены:', metrics);
}

// Расчет посетителей в минуту
function calculateVisitorsPerMinute(totalVisitors, hourlyData) {
    if (!hourlyData || hourlyData.length === 0) return '0.0';

    const totalMinutes = hourlyData.length * 60;
    const visitorsPerMinute = totalVisitors / totalMinutes;
    return visitorsPerMinute.toFixed(1);
}

// Инициализация графиков
function initializeChart() {
    const ctx = document.getElementById('visitorsChart');
    if (!ctx) return;

    // Проверяем наличие Chart.js
    if (typeof Chart === 'undefined') {
        console.error('Chart.js не загружен');
        return;
    }

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

            const period = this.textContent.toLowerCase();
            updateChartForPeriod(period);
        });
    });

    // Кнопки фильтрации по периодам
    const periodButtons = document.querySelectorAll('[data-period]');
    periodButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            periodButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const period = this.getAttribute('data-period');
            updateChartForPeriod(period);
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

// Обновление графика для конкретного периода
function updateChartForPeriod(period) {
    if (!visitorsChart) return;

    let labels, data;

    switch(period) {
        case 'день':
        case 'day':
            labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
            data = [45, 78, 187, 342, 489, 267];
            break;
        case 'неделя':
        case 'week':
            labels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
            data = [1200, 1900, 1500, 2100, 2400, 1800, 1600];
            break;
        case 'месяц':
        case 'month':
            labels = ['Нед 1', 'Нед 2', 'Нед 3', 'Нед 4'];
            data = [8500, 9200, 8800, 9600];
            break;
        default:
            labels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];
            data = [45, 78, 187, 342, 489, 267];
    }

    visitorsChart.data.labels = labels;
    visitorsChart.data.datasets[0].data = data;
    visitorsChart.update('active');
}

// Функция обновления данных магазинов
function updateStoresData(period) {
    console.log('Updating stores data for period:', period);

    const storesList = document.getElementById('stores-list');
    if (!storesList) return;

    // Демо данные для магазинов
    const storesData = period === 'today' ? [
        { name: 'ТЦ Галерея', visitors: 364, revenue: '89,500₽', trend: 'up', change: '+15%' },
        { name: 'BELWEST Dana Mall', visitors: 298, revenue: '72,400₽', trend: 'up', change: '+8%' },
        { name: 'Магазин на Немиге', visitors: 245, revenue: '58,200₽', trend: 'down', change: '-3%' },
        { name: 'ТЦ Столица', visitors: 189, revenue: '45,800₽', trend: 'up', change: '+12%' },
        { name: 'Магазин на Скорины', visitors: 156, revenue: '38,900₽', trend: 'neutral', change: '0%' }
    ] : [
        { name: 'ТЦ Галерея', visitors: 2547, revenue: '625,300₽', trend: 'up', change: '+23%' },
        { name: 'BELWEST Dana Mall', visitors: 2089, revenue: '507,200₽', trend: 'up', change: '+18%' },
        { name: 'Магазин на Немиге', visitors: 1715, revenue: '407,800₽', trend: 'up', change: '+5%' },
        { name: 'ТЦ Столица', visitors: 1322, revenue: '320,600₽', trend: 'up', change: '+15%' },
        { name: 'Магазин на Скорины', visitors: 1094, revenue: '272,400₽', trend: 'down', change: '-2%' }
    ];

    let html = '';
    storesData.forEach((store, index) => {
        const trendIcon = store.trend === 'up' ? 'fa-arrow-up' : 
                         store.trend === 'down' ? 'fa-arrow-down' : 'fa-minus';
        const trendClass = store.trend === 'up' ? 'trend-up' : 
                          store.trend === 'down' ? 'trend-down' : 'trend-neutral';

        html += `
            <div class="store-item" data-rank="${index + 1}">
                <div class="store-rank">
                    <div class="rank-number">${index + 1}</div>
                    <div class="rank-icon">
                        <i class="fas ${index === 0 ? 'fa-crown' : index === 1 ? 'fa-medal' : 'fa-star'}"></i>
                    </div>
                </div>
                <div class="store-info">
                    <div class="store-name">${store.name}</div>
                    <div class="store-stats">
                        <span class="visitors-count">${store.visitors} чел.</span>
                        <span class="revenue">${store.revenue}</span>
                    </div>
                </div>
                <div class="store-trend ${trendClass}">
                    <i class="fas ${trendIcon}"></i>
                    <span>${store.change}</span>
                </div>
            </div>
        `;
    });

    storesList.innerHTML = html;
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

// Глобальные функции для экспорта
window.refreshDashboardData = refreshDashboardData;
window.filterSensorsList = filterSensorsByStatus;
window.toggleActivityStream = toggleActivityPause;
window.clearActivityStream = clearActivityStream;
window.updateStoresData = updateStoresData;

// Функция фильтрации датчиков
function filterSensorsByStatus(filter) {
    const sensorItems = document.querySelectorAll('.sensor-item');
    sensorItems.forEach(item => {
        const status = item.dataset.status;
        if (filter === 'all' || status === filter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Функция переключения потока активности
function toggleActivityPause() {
    const btn = document.getElementById('pause-activity');
    const icon = btn.querySelector('i');

    if (icon.classList.contains('fa-pause')) {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        // Приостановить обновления
        if (window.activityInterval) {
            clearInterval(window.activityInterval);
        }
    } else {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        // Возобновить обновления
        startActivityUpdates();
    }
}

// Функция очистки активности
function clearActivityStream() {
    const activityStream = document.getElementById('activity-stream');
    if (activityStream) {
        activityStream.innerHTML = '';
    }
}

// Функция запуска обновлений активности
function startActivityUpdates() {
    window.activityInterval = setInterval(() => {
        // Добавляем случайную активность для демонстрации
        addActivityItem();
    }, 5000);
}

// Функция добавления элемента активности
function addActivityItem() {
    const activityStream = document.getElementById('activity-stream');
    if (!activityStream) return;

    const activities = [
        'Новый посетитель в ТЦ Галерея',
        'Датчик #5 обновил статус',
        'Пик активности в BELWEST Dana Mall',
        'Подключен новый датчик',
        'Превышен лимит посетителей в VIP зоне'
    ];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    const time = new Date().toLocaleTimeString();

    const activityItem = document.createElement('div');
    activityItem.className = 'activity-item';
    activityItem.innerHTML = `
        <div class="activity-icon">
            <i class="fas fa-circle"></i>
        </div>
        <div class="activity-content">
            <div class="activity-text">${activity}</div>
            <div class="activity-time">${time}</div>
        </div>
    `;

    activityStream.insertBefore(activityItem, activityStream.firstChild);

    // Ограничиваем количество элементов
    const items = activityStream.querySelectorAll('.activity-item');
    if (items.length > 10) {
        items[items.length - 1].remove();
    }
}