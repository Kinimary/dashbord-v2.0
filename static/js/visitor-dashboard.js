// BELWEST - Modern Visitor Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadDashboardData();
    initializeCharts();
    setupRealTimeUpdates();
});

// Глобальные переменные для графиков
let mainChart, storesChart, miniCharts = {};

function initializeDashboard() {
    // Анимация карточек при загрузке
    const cards = document.querySelectorAll('.metric-card, .chart-card, .detail-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'all 0.6s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function loadDashboardData() {
    const location = document.getElementById('location-filter').value;
    const period = document.getElementById('period-select').value;

    fetch(`/api/sensor-data?location=${location}&period=${period}`)
        .then(response => response.json())
        .then(data => {
            updateMetrics(data);
            updateMainChart(data);
            updateStoresChart(data);
            updateSensorsOverview(data);
            updateActivityStream(data);
            updateDowntimeList(data);
        })
        .catch(error => {
            console.error('Ошибка загрузки данных:', error);
            showNotification('Ошибка загрузки данных', 'error');
        });
}

function updateMetrics(data) {
    // Обновление основных метрик
    const metrics = {
        'today-visitors': data.today_visitors || 0,
        'active-sensors': data.active_sensors || 0,
        'peak-time': data.peak_time || '00:00',
        'hourly-avg': data.hourly_avg || 0
    };

    const changes = {
        'visitors-change': data.visitors_change || '+0%',
        'sensors-change': data.sensors_change || '+0',
        'peak-change': data.peak_period || 'Будни',
        'avg-change': data.avg_change || '+0%'
    };

    Object.entries(metrics).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            animateValue(element, parseInt(element.textContent) || 0, value, 1000);
        }
    });

    Object.entries(changes).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;

            // Определение цвета изменения
            if (value.startsWith('+')) {
                element.className = 'metric-change positive';
            } else if (value.startsWith('-')) {
                element.className = 'metric-change negative';
            } else {
                element.className = 'metric-change neutral';
            }
        }
    });

    // Обновление мини-графиков
    updateMiniCharts(data);
}

function animateValue(element, start, end, duration) {
    const startTime = performance.now();
    const isNumber = typeof end === 'number';

    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        if (isNumber) {
            const current = Math.round(start + (end - start) * progress);
            element.textContent = current.toLocaleString();
        } else {
            element.textContent = end;
        }

        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }

    requestAnimationFrame(updateValue);
}

function initializeCharts() {
    // Инициализация главного графика
    const mainCtx = document.getElementById('main-visitors-chart');
    if (mainCtx) {
        mainChart = new Chart(mainCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Посетители',
                    data: [],
                    borderColor: '#2E8B57',
                    backgroundColor: 'rgba(46, 139, 87, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointBackgroundColor: '#2E8B57',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#2E8B57',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#A8D8A8'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#A8D8A8'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    // Инициализация графика распределения по локациям
    const storesCtx = document.getElementById('stores-distribution-chart');
    if (storesCtx) {
        storesChart = new Chart(storesCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#2E8B57',
                        '#20B2AA',
                        '#FF6B35',
                        '#8B45FF',
                        '#4FACFE',
                        '#FFD700',
                        '#FF4757',
                        '#32CD32'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#2E8B57',
                        borderWidth: 1
                    }
                },
                cutout: '60%'
            }
        });
    }

    // Инициализация мини-графиков
    initializeMiniCharts();
}

function initializeMiniCharts() {
    const miniChartIds = ['visitors-mini-chart', 'sensors-mini-chart', 'peak-mini-chart', 'avg-mini-chart'];

    miniChartIds.forEach(id => {
        const ctx = document.getElementById(id);
        if (ctx) {
            miniCharts[id] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['', '', '', '', '', '', ''],
                    datasets: [{
                        data: [0, 0, 0, 0, 0, 0, 0],
                        borderColor: '#2E8B57',
                        backgroundColor: 'rgba(46, 139, 87, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: { enabled: false }
                    },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    elements: {
                        line: { tension: 0.4 },
                        point: { radius: 0 }
                    }
                }
            });
        }
    });
}

function updateMiniCharts(data) {
    // Обновление мини-графиков случайными данными для демонстрации
    Object.keys(miniCharts).forEach(chartId => {
        const chart = miniCharts[chartId];
        const newData = Array.from({length: 7}, () => Math.floor(Math.random() * 100));

        chart.data.datasets[0].data = newData;
        chart.update('none');
    });
}

function updateMainChart(data) {
    if (!mainChart) return;

    const period = document.getElementById('period-select').value;
    const chartData = data.chart_data || generateSampleData(period);

    mainChart.data.labels = chartData.labels;
    mainChart.data.datasets[0].data = chartData.data;
    mainChart.update('active');
}

function updateStoresChart(data) {
    if (!storesChart) return;

    const stores = data.stores || [
        { name: 'Магазин 1', visitors: 150 },
        { name: 'Магазин 2', visitors: 120 },
        { name: 'Магазин 3', visitors: 90 },
        { name: 'ТУ Центр', visitors: 200 },
        { name: 'РД Восток', visitors: 300 }
    ];

    storesChart.data.labels = stores.map(store => store.name);
    storesChart.data.datasets[0].data = stores.map(store => store.visitors);
    storesChart.update('active');

    // Обновление легенды
    updateStoresLegend(stores);
}

function updateStoresLegend(stores) {
    const legendContainer = document.getElementById('stores-legend');
    if (!legendContainer) return;

    const colors = ['#2E8B57', '#20B2AA', '#FF6B35', '#8B45FF', '#4FACFE', '#FFD700', '#FF4757', '#32CD32'];

    legendContainer.innerHTML = stores.map((store, index) => `
        <div class="legend-item">
            <div class="legend-color" style="background-color: ${colors[index % colors.length]}"></div>
            <span>${store.name}: ${store.visitors}</span>
        </div>
    `).join('');
}

function updateSensorsOverview(data) {
    const sensors = data.sensors || generateSampleSensors();

    // Обновление сетки датчиков
    updateSensorsGrid(sensors);

    // Обновление списка датчиков
    updateSensorsList(sensors);
}

function updateSensorsGrid(sensors) {
    const gridContainer = document.getElementById('sensors-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = sensors.map(sensor => `
        <div class="sensor-grid-item">
            <div class="sensor-status-icon ${sensor.status}">
                <i class="fas fa-wifi"></i>
            </div>
            <div class="sensor-name">${sensor.name}</div>
            <div class="sensor-location">${sensor.location}</div>
            <div class="sensor-visitors">${sensor.visitors || 0}</div>
        </div>
    `).join('');
}

function updateSensorsList(sensors) {
    const listContainer = document.getElementById('sensors-list');
    if (!listContainer) return;

    listContainer.innerHTML = sensors.map(sensor => `
        <div class="sensor-list-item">
            <div class="sensor-status-icon ${sensor.status}">
                <i class="fas fa-wifi"></i>
            </div>
            <div class="sensor-list-info">
                <div class="sensor-list-name">${sensor.name}</div>
                <div class="sensor-list-details">${sensor.location} • ${sensor.status === 'online' ? 'Онлайн' : 'Офлайн'}</div>
            </div>
            <div class="sensor-list-stats">
                <div class="sensor-list-visitors">${sensor.visitors || 0}</div>
                <div class="sensor-list-label">посетителей</div>
            </div>
        </div>
    `).join('');
}

function loadDashboardData() {
    const period = document.getElementById('period-select')?.value || 'day';
    const hierarchyType = document.getElementById('hierarchy-type')?.value || 'all';
    const entityId = document.getElementById('entity-selector')?.value || '';

    let url = `/api/sensor-data?period=${period}`;

    if (hierarchyType !== 'all' && entityId) {
        url += `&hierarchy_type=${hierarchyType}&entity_id=${entityId}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            updateMetrics(data);
            updateMainChart(data);
            updateStoresChart(data);
            updateSensorsOverview(data);
            updateActivityStream(data);
            updateDowntimeList(data);
            updateHierarchyInfo(data);
        })
        .catch(error => {
            console.error('Ошибка загрузки данных:', error);
            showNotification('Ошибка загрузки данных', 'error');
        });
}

function updateActivityStream(data) {
    const activities = data.activities || generateSampleActivities();
    const streamContainer = document.getElementById('activity-stream');

    if (!streamContainer) return;

    streamContainer.innerHTML = activities.map(activity => `
        <div class="activity-item" data-type="${activity.type}">
            <div class="activity-icon ${activity.type}">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

function updateDowntimeList(data) {
    const downtimes = data.downtimes || generateSampleDowntimes();
    const listContainer = document.getElementById('downtime-list');

    if (!listContainer) return;

    listContainer.innerHTML = downtimes.map(downtime => `
        <div class="downtime-item ${downtime.status}">
            <div class="downtime-icon">
                <i class="fas fa-${downtime.status === 'offline' ? 'times' : 'check'}"></i>
            </div>
            <div class="downtime-content-info">
                <div class="downtime-sensor-name">${downtime.sensor}</div>
                <div class="downtime-location">${downtime.location}</div>
                <div class="downtime-duration">Длительность: ${downtime.duration}</div>
            </div>
            <div class="downtime-time">
                <div>${downtime.start_time}</div>
                ${downtime.end_time ? `<div>${downtime.end_time}</div>` : ''}
            </div>
        </div>
    `).join('');
}

function setupRealTimeUpdates() {
    // Обновление каждые 30 секунд
    setInterval(() => {
        const autoUpdate = document.getElementById('auto-update-toggle');
        if (autoUpdate && autoUpdate.checked) {
            loadDashboardData();
            updateRealTimeActivity();
        }
    }, 30000);
}

function updateRealTimeActivity() {
    // Добавление новых активностей в реальном времени
    const streamContainer = document.getElementById('activity-stream');
    if (!streamContainer) return;

    const newActivity = {
        type: 'visitor',
        title: 'Новый посетитель',
        description: 'Зарегистрирован через датчик входа',
        time: new Date().toLocaleTimeString('ru-RU')
    };

    const activityHtml = `
        <div class="activity-item" data-type="${newActivity.type}">
            <div class="activity-icon ${newActivity.type}">
                <i class="fas fa-${getActivityIcon(newActivity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${newActivity.title}</div>
                <div class="activity-description">${newActivity.description}</div>
                <div class="activity-time">${newActivity.time}</div>
            </div>
        </div>
    `;

    streamContainer.insertAdjacentHTML('afterbegin', activityHtml);

    // Удаление старых записей (оставляем только 10 последних)
    const items = streamContainer.querySelectorAll('.activity-item');
    if (items.length > 10) {
        items[items.length - 1].remove();
    }
}

function getActivityIcon(type) {
    const icons = {
        'visitor': 'user-plus',
        'sensor': 'wifi',
        'alert': 'exclamation-triangle',
        'system': 'cogs'
    };
    return icons[type] || 'info-circle';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'error' ? '#FF4757' : '#2E8B57'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        z-index: 10000;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        font-weight: 600;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function updateHierarchyInfo(data) {
    // Обновление информации о выбранной иерархии
    const hierarchyType = document.getElementById('hierarchy-type')?.value;
    const entitySelector = document.getElementById('entity-selector');

    if (hierarchyType !== 'all' && entitySelector?.value) {
        const selectedOption = entitySelector.options[entitySelector.selectedIndex];
        if (selectedOption) {
            // Можно добавить отображение информации о выбранной сущности
            console.log(`Данные для ${selectedOption.text}:`, data);
        }
    }
}

// Генерация демонстрационных данных
function generateSampleData(period) {
    const labels = [];
    const data = [];

    const now = new Date();
    let points = 24;

    switch (period) {
        case 'hour':
            points = 60;
            for (let i = points - 1; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 60 * 1000);
                labels.push(time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
                data.push(Math.floor(Math.random() * 10 + 5));
            }
            break;
        case 'day':
            points = 24;
            for (let i = points - 1; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 60 * 60 * 1000);
                labels.push(time.toLocaleTimeString('ru-RU', { hour: '2-digit' }));
                data.push(Math.floor(Math.random() * 100 + 20));
            }
            break;
        case 'week':
            points = 7;
            for (let i = points - 1; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(time.toLocaleDateString('ru-RU', { weekday: 'short' }));
                data.push(Math.floor(Math.random() * 1000 + 500));
            }
            break;
        case 'month':
            points = 30;
            for (let i = points - 1; i >= 0; i--) {
                const time = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                labels.push(time.getDate().toString());
                data.push(Math.floor(Math.random() * 1000 + 300));
            }
            break;
        case 'year':
            points = 12;
            for (let i = points - 1; i >= 0; i--) {
                const time = new Date(now.getFullYear(), now.getMonth() - i, 1);
                labels.push(time.toLocaleDateString('ru-RU', { month: 'short' }));
                data.push(Math.floor(Math.random() * 10000 + 5000));
            }
            break;
    }

    return { labels, data };
}

function generateSampleSensors() {
    return [
        { name: 'Датчик входа А', location: 'Главный вход', status: 'online', visitors: 45 },
        { name: 'Датчик входа Б', location: 'Боковой вход', status: 'online', visitors: 23 },
        { name: 'Датчик зала 1', location: 'Торговый зал', status: 'offline', visitors: 0 },
        { name: 'Датчик зала 2', location: 'Торговый зал', status: 'online', visitors: 67 },
        { name: 'Датчик кассы', location: 'Касса', status: 'online', visitors: 34 },
        { name: 'Датчик склада', location: 'Склад', status: 'online', visitors: 5 }
    ];
}

function generateSampleActivities() {
    return [
        { type: 'visitor', title: 'Новый посетитель', description: 'Зарегистрирован через главный вход', time: '2 минуты назад' },
        { type: 'sensor', title: 'Датчик подключен', description: 'Боковой вход - статус онлайн', time: '5 минут назад' },
        { type: 'alert', title: 'Превышение лимита', description: 'Более 100 посетителей в торговом зале', time: '8 минут назад' },
        { type: 'visitor', title: 'Пик посещаемости', description: 'Зарегистрировано 50 посетителей за час', time: '12 минут назад' },
        { type: 'system', title: 'Система обновлена', description: 'Обновление до версии 2.1.4', time: '1 час назад' }
    ];
}

function generateSampleDowntimes() {
    return [
        { sensor: 'Датчик входа А', location: 'Главный вход', status: 'offline', duration: '45 мин', start_time: '14:30', end_time: null },
        { sensor: 'Датчик зала 1', location: 'Торговый зал', status: 'reconnected', duration: '2ч 15мин', start_time: '11:45', end_time: '14:00' },
        { sensor: 'Датчик кассы', location: 'Касса', status: 'reconnected', duration: '15 мин', start_time: '13:30', end_time: '13:45' }
    ];
}

function switchMainChart(chartType) {
            if (!mainChart) return;

            const period = document.getElementById('period-select')?.value || 'day';

            let chartData;
            switch(chartType) {
                case 'visitors':
                    chartData = generateSampleData(period);
                    mainChart.data.labels = chartData.labels;
                    mainChart.data.datasets = [{
                        label: 'Посетители',
                        data: chartData.data,
                        borderColor: '#2E8B57',
                        backgroundColor: 'rgba(46, 139, 87, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }];
                    break;

                case 'comparison':
                    chartData = generateSampleData(period);
                    const comparisonData = generateSampleData(period);
                    mainChart.data.labels = chartData.labels;
                    mainChart.data.datasets = [
                        {
                            label: 'Текущий период',
                            data: chartData.data,
                            borderColor: '#2E8B57',
                            backgroundColor: 'rgba(46, 139, 87, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Предыдущий период',
                            data: comparisonData.data.map(val => val * 0.8),
                            borderColor: '#20B2AA',
                            backgroundColor: 'rgba(32, 178, 170, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4
                        }
                    ];
                    break;

                case 'trend':
                    chartData = generateTrendData(period);
                    mainChart.data.labels = chartData.labels;
                    mainChart.data.datasets = [{
                        label: 'Тренд',
                        data: chartData.data,
                        borderColor: '#FF6B35',
                        backgroundColor: 'rgba(255, 107, 53, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.1,
                        pointRadius: 4
                    }];
                    break;
            }

            mainChart.update('active');
        }

        function generateTrendData(period) {
            const labels = [];
            const data = [];
            const now = new Date();
            let points = 24;
            let baseValue = 50;

            switch (period) {
                case 'hour':
                    points = 60;
                    for (let i = points - 1; i >= 0; i--) {
                        const time = new Date(now.getTime() - i * 60 * 1000);
                        labels.push(time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }));
                        baseValue += (Math.random() - 0.5) * 5;
                        data.push(Math.max(0, Math.floor(baseValue)));
                    }
                    break;
                default:
                    for (let i = points - 1; i >= 0; i--) {
                        labels.push(i.toString());
                        baseValue += (Math.random() - 0.5) * 20;
                        data.push(Math.max(0, Math.floor(baseValue)));
                    }
            }

            return { labels, data };
        }

function filterActivityStream(filter) {
            const items = document.querySelectorAll('.activity-item');
            items.forEach(item => {
                const itemType = item.dataset.type;
                if (filter === 'all' || itemType === filter) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });

            // Обновляем видимый счетчик активных элементов
            const visibleItems = document.querySelectorAll('.activity-item[style*="flex"], .activity-item:not([style*="none"])');
            console.log(`Показано ${visibleItems.length} элементов для фильтра: ${filter}`);
        }

function switchSensorsView(view) {
            const buttons = document.querySelectorAll('.detail-btn');
            const views = document.querySelectorAll('.sensors-view');

            buttons.forEach(btn => btn.classList.remove('active'));
            views.forEach(view => view.classList.remove('active'));

            document.getElementById(`sensors-${view}-btn`).classList.add('active');
            document.getElementById(`sensors-${view}-view`).classList.add('active');

            if (view === 'map' && typeof ymaps !== 'undefined') {
                initializeMap();
            }
        }

        let sensorsMap = null;

        function initializeMap() {
            if (sensorsMap) return;

            ymaps.ready(function () {
                const mapContainer = document.getElementById('sensors-map');
                const placeholder = document.getElementById('map-placeholder');

                if (placeholder) {
                    placeholder.style.display = 'none';
                }

                sensorsMap = new ymaps.Map('sensors-map', {
                    center: [53.9006, 27.5590], // Минск
                    zoom: 11,
                    controls: ['zoomControl', 'fullscreenControl']
                }, {
                    searchControlProvider: 'yandex#search'
                });

                // Добавляем метки магазинов
                const stores = [
                    { coords: [53.9045, 27.5615], name: 'BELWEST Магазин 1', visitors: 150 },
                    { coords: [53.8978, 27.5665], name: 'BELWEST Магазин 2', visitors: 120 },
                    { coords: [53.9123, 27.5543], name: 'BELWEST ТУ Центр', visitors: 200 },
                    { coords: [53.8876, 27.5432], name: 'BELWEST РД Восток', visitors: 300 }
                ];

                stores.forEach(store => {
                    const placemark = new ymaps.Placemark(store.coords, {
                        balloonContent: `
                            <div style="padding: 10px;">
                                <h4 style="margin: 0 0 8px 0; color: #2E8B57;">${store.name}</h4>
                                <p style="margin: 0; font-size: 14px;">Посетители сегодня: <strong>${store.visitors}</strong></p>
                            </div>
                        `
                    }, {
                        preset: 'islands#greenDotIcon'
                    });

                    sensorsMap.geoObjects.add(placemark);
                });
            });
        }

// Загрузка данных дашборда
function loadDashboardData() {
    const hierarchyType = document.getElementById('hierarchy-type').value;
    const entityId = document.getElementById('entity-selector').value;
    const period = document.getElementById('period-select').value;

    let url = `/api/sensor-data?period=${period}`;
    if (hierarchyType !== 'all' && entityId) {
        url += `&hierarchy_type=${hierarchyType}&entity_id=${entityId}`;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            updateDashboard(data);
        })
        .catch(error => {
            console.error('Ошибка загрузки данных:', error);
        });
}

// Обновление дашборда с новыми данными
function updateDashboard(data) {
    // Обновляем метрики
    document.getElementById('today-visitors').textContent = data.total_visitors || 0;
    document.getElementById('active-sensors').textContent = data.active_sensors || 0;
    document.getElementById('peak-time').textContent = data.peak_weekday || '--:--';
    document.getElementById('hourly-avg').textContent = data.avg_hourly || 0;

    // Обновляем изменения
    document.getElementById('visitors-change').textContent = '+12.5%';
    document.getElementById('sensors-change').textContent = '+2';
    document.getElementById('peak-change').textContent = 'Будни';
    document.getElementById('avg-change').textContent = '+8.3%';

    console.log('Дашборд обновлен с новыми данными');
}

// Экспорт функций для глобального использования
window.loadDashboardData = loadDashboardData;
window.updateDashboard = updateDashboard;