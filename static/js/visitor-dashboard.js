// BELWEST - Visitor Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadDashboardData();
    setupPeriodicUpdates();
    initializeCharts();
});

function initializeDashboard() {
    // Add smooth loading animation
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

function loadDashboardData() {
    // Show loading state
    showLoadingState();

    // Load sensor data
    const period = document.getElementById('period-select').value;
    fetch(`/api/sensor-data?period=${period}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            updateDashboard(data);
            hideLoadingState();
        })
        .catch(error => {
            console.error('Ошибка загрузки данных:', error);
            showErrorState();
            hideLoadingState();
        });
}

function updateDashboard(data) {
    try {
        // Update main statistics
        updateMainStats(data);

        // Update additional statistics
        updateAdditionalStats(data);

        // Update recent activity
        updateRecentActivity(data);

        // Update sensors overview
        updateSensorsOverview(data);

        // Update charts
        updateCharts(data);

    } catch (error) {
        console.error('Ошибка обновления дашборда:', error);
        showErrorState();
    }
}

function updateMainStats(data) {
    const defaultData = {
        today_visitors: 0,
        active_sensors: 0,
        avg_hourly: 0,
        peak_time: '--:--',
        peak_count: 0,
        today_change: 0,
        sensors_status: 'offline'
    };

    const stats = { ...defaultData, ...data };

    // Update today's visitors
    const todayElement = document.getElementById('today-visitors');
    if (todayElement) {
        todayElement.textContent = stats.today_visitors;
    }

    const changeElement = document.getElementById('today-change');
    if (changeElement) {
        const changeText = stats.today_change > 0 ? 
            `+${stats.today_change}% за сегодня` : 
            `${stats.today_change}% за сегодня`;
        changeElement.textContent = changeText;
    }

    // Update active sensors
    const sensorsElement = document.getElementById('active-sensors');
    if (sensorsElement) {
        sensorsElement.textContent = stats.active_sensors;
    }

    const statusElement = document.getElementById('sensors-status');
    if (statusElement) {
        statusElement.textContent = stats.sensors_status === 'online' ? 
            'Все датчики онлайн' : 'Проверьте соединение';
    }

    // Update average hourly
    const avgElement = document.getElementById('avg-hourly');
    if (avgElement) {
        avgElement.textContent = stats.avg_hourly;
    }

    const hourlyChangeElement = document.getElementById('hourly-change');
    if (hourlyChangeElement) {
        hourlyChangeElement.textContent = 'За последний час';
    }

    // Update peak time
    const peakTimeElement = document.getElementById('peak-time');
    if (peakTimeElement) {
        peakTimeElement.textContent = stats.peak_time;
    }

    const peakCountElement = document.getElementById('peak-count');
    if (peakCountElement) {
        peakCountElement.textContent = `${stats.peak_count} посетителей`;
    }
}

function updateAdditionalStats(data) {
    try {
        const defaultData = {
            new_visitors: 0,
            returning_visitors: 0,
            new_visitors_change: 0,
            returning_visitors_change: 0
        };

        const stats = { ...defaultData, ...data };

        // Update new visitors
        const newVisitorsElement = document.getElementById('new-visitors');
        if (newVisitorsElement) {
            newVisitorsElement.textContent = stats.new_visitors;
        }

        const newVisitorsChangeElement = document.getElementById('new-visitors-change');
        if (newVisitorsChangeElement) {
            const changeText = stats.new_visitors_change > 0 ? 
                `+${stats.new_visitors_change}% сегодня` : 
                `${stats.new_visitors_change}% сегодня`;
            newVisitorsChangeElement.textContent = changeText;
        }

        // Update returning visitors
        const returningElement = document.getElementById('returning-visitors');
        if (returningElement) {
            returningElement.textContent = stats.returning_visitors;
        }

        const returningChangeElement = document.getElementById('returning-visitors-change');
        if (returningChangeElement) {
            const changeText = stats.returning_visitors_change > 0 ? 
                `+${stats.returning_visitors_change}% сегодня` : 
                `${stats.returning_visitors_change}% сегодня`;
            returningChangeElement.textContent = changeText;
        }

    } catch (error) {
        console.error('Ошибка обновления дополнительных статистик:', error);
    }
}

function updateRecentActivity(data) {
    const activityContainer = document.getElementById('recent-data');
    if (!activityContainer) return;

    const activities = data.recent_activity || [];

    if (activities.length === 0) {
        activityContainer.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">📊</div>
                <div class="activity-content">
                    <div class="activity-title">Нет данных</div>
                    <div class="activity-meta">
                        Данные о посетителях отсутствуют
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const activityHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">${getActivityIcon(activity.type)}</div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-meta">
                    ${activity.description} • ${activity.time}
                </div>
            </div>
        </div>
    `).join('');

    activityContainer.innerHTML = activityHTML;
}

function updateSensorsOverview(data) {
    const sensorsContainer = document.getElementById('sensors-grid');
    if (!sensorsContainer) return;

    const sensors = data.sensors || [];

    if (sensors.length === 0) {
        sensorsContainer.innerHTML = `
            <div class="sensor-card">
                <div class="sensor-header">
                    <h4>Нет датчиков</h4>
                    <span class="status-indicator offline"></span>
                </div>
                <div class="sensor-info">
                    <div class="sensor-location">Датчики не настроены</div>
                    <div class="sensor-count">0 посетителей</div>
                    <div class="sensor-update">Настройте датчики в разделе "Датчики"</div>
                </div>
            </div>
        `;
        return;
    }

    const sensorsHTML = sensors.map(sensor => `
        <div class="sensor-card">
            <div class="sensor-header">
                <h4>${sensor.name}</h4>
                <span class="status-indicator ${sensor.status}"></span>
            </div>
            <div class="sensor-info">
                <div class="sensor-location">${sensor.location}</div>
                <div class="sensor-count">${sensor.count} посетителей</div>
                <div class="sensor-update">Обновлено: ${sensor.last_update}</div>
            </div>
        </div>
    `).join('');

    sensorsContainer.innerHTML = sensorsHTML;
}

function initializeCharts() {
    // Initialize visitors chart
    const visitorsCtx = document.getElementById('visitors-chart');
    if (visitorsCtx) {
        window.visitorsChart = new Chart(visitorsCtx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Посетители',
                    data: Array(24).fill(0),
                    borderColor: '#2E8B57',
                    backgroundColor: 'rgba(46, 139, 87, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: '#A8D8A8'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#A8D8A8'
                        }
                    }
                }
            }
        });
    }

    // Initialize sensors chart
    const sensorsCtx = document.getElementById('sensors-chart');
    if (sensorsCtx) {
        window.sensorsChart = new Chart(sensorsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Онлайн', 'Офлайн'],
                datasets: [{
                    data: [0, 0],
                    backgroundColor: ['#2E8B57', '#FF4757']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#A8D8A8'
                        }
                    }
                }
            }
        });
    }
}

function updateCharts(data) {
    // Update visitors chart
    if (window.visitorsChart && data.hourly_visitors) {
        window.visitorsChart.data.datasets[0].data = data.hourly_visitors;
        window.visitorsChart.update();
    }

    // Update sensors chart
    if (window.sensorsChart && data.sensors_stats) {
        window.sensorsChart.data.datasets[0].data = [
            data.sensors_stats.online || 0,
            data.sensors_stats.offline || 0
        ];
        window.sensorsChart.update();
    }
}

function setupPeriodicUpdates() {
    // Update data every 30 seconds
    setInterval(loadDashboardData, 30000);
}

function showLoadingState() {
    const cards = document.querySelectorAll('.card .stat-value');
    cards.forEach(card => {
        card.textContent = '...';
    });
}

function hideLoadingState() {
    // Loading state is automatically hidden when data is updated
}

function showErrorState() {
    const cards = document.querySelectorAll('.card .stat-change');
    cards.forEach(card => {
        card.textContent = 'Ошибка загрузки';
        card.style.color = '#FF4757';
    });
}

function getActivityIcon(type) {
    const icons = {
        'visitor': '👤',
        'sensor': '📡',
        'system': '⚙️',
        'alert': '⚠️',
        'success': '✅'
    };
    return icons[type] || '📊';
}

// Export functions for global use
window.loadDashboardData = loadDashboardData;
window.updateDashboard = updateDashboard;

// Загрузка данных датчиков
function loadSensorData() {
    const period = document.getElementById('period-select').value;
    fetch(`/api/sensor-data?period=${period}`)
        .then(response => response.json())
        .then(data => {
            updateDashboard(data);
            updateChart(data.hourly_visitors);
            updateStoresChart(data.stores);
            updateStoresList(data.stores);
        })
        .catch(error => {
            console.error('Error loading sensor data:', error);
        });
}

// Загрузка данных об отключениях датчиков
function loadDowntimeData() {
    fetch('/api/sensor-downtimes')
        .then(response => response.json())
        .then(data => {
            updateDowntimeList(data.downtimes);
        })
        .catch(error => {
            console.error('Error loading downtime data:', error);
        });
}

// Обновление элементов дашборда
function updateDashboard(data) {
    // Обновляем статистику
    document.getElementById('total-visitors').textContent = data.total_visitors;
    document.getElementById('active-sensors').textContent = data.active_sensors;

    // Обновляем период
    const periodLabels = {
        'hour': 'за час',
        'day': 'за день',
        'week': 'за неделю',
        'month': 'за месяц',
        'year': 'за год'
    };
    document.getElementById('period-label').textContent = periodLabels[data.period];

    // Обновляем статус датчиков
    const sensorsStatusElement = document.getElementById('sensors-status');
    sensorsStatusElement.textContent = data.sensors_status;
    sensorsStatusElement.className = `stat-status ${data.sensors_status}`;

    // Обновляем пиковые времена
    document.getElementById('peak-weekday').textContent = data.peak_weekday;
    document.getElementById('peak-weekend').textContent = data.peak_weekend;
    document.getElementById('peak-weekday-count').textContent = `${data.peak_weekday_count} посетителей`;
    document.getElementById('peak-weekend-count').textContent = `${data.peak_weekend_count} посетителей`;
}

// Обновление диаграммы магазинов
function updateStoresChart(stores) {
    const canvas = document.getElementById('storesChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // Уничтожаем предыдущий график если он существует
    if (window.storesChart) {
        window.storesChart.destroy();
    }

    const labels = stores.map(store => store.name);
    const data = stores.map(store => store.visitors);

    window.storesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Посетители',
                data: data,
                backgroundColor: [
                    '#4f46e5',
                    '#06b6d4',
                    '#10b981',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderColor: [
                    '#4338ca',
                    '#0891b2',
                    '#059669',
                    '#d97706',
                    '#dc2626'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Обновление списка магазинов
function updateStoresList(stores) {
    const container = document.getElementById('stores-list-container');
    if (!container) return;

    container.innerHTML = '';

    stores.forEach(store => {
        const storeElement = document.createElement('div');
        storeElement.className = 'store-item';
        storeElement.innerHTML = `
            <div class="store-info">
                <h4>${store.name}</h4>
                <p>${store.address}</p>
            </div>
            <div class="store-visitors">
                <span class="visitors-count">${store.visitors}</span>
                <span class="visitors-label">посетителей</span>
            </div>
        `;
        container.appendChild(storeElement);
    });
}

// Обновление списка отключений датчиков
function updateDowntimeList(downtimes) {
    const container = document.getElementById('downtime-list');
    if (!container) return;

    container.innerHTML = '';

    if (downtimes.length === 0) {
        container.innerHTML = '<p>Отключений не зарегистрировано</p>';
        return;
    }

    downtimes.forEach(downtime => {
        const downtimeElement = document.createElement('div');
        downtimeElement.className = `downtime-item ${downtime.status}`;
        downtimeElement.innerHTML = `
            <div class="downtime-icon">
                <i class="fas fa-${downtime.status === 'offline' ? 'exclamation-triangle' : 'check-circle'}"></i>
            </div>
            <div class="downtime-content">
                <h4>${downtime.sensor_name}</h4>
                <p>${downtime.store_name}</p>
                <div class="downtime-time">
                    <span>Отключен: ${new Date(downtime.disconnected_at).toLocaleString()}</span>
                    ${downtime.reconnected_at ? 
                        `<span>Подключен: ${new Date(downtime.reconnected_at).toLocaleString()}</span>
                         <span>Длительность: ${downtime.duration_minutes} мин.</span>` : 
                        '<span class="offline-status">Сейчас отключен</span>'
                    }
                </div>
            </div>
        `;
        container.appendChild(downtimeElement);
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadSensorData();
    loadDowntimeData();

    // Обработчик изменения периода
    document.getElementById('period-select').addEventListener('change', function() {
        loadSensorData();
    });

    // Обновляем данные каждые 30 секунд
    setInterval(() => {
        loadSensorData();
        loadDowntimeData();
    }, 30000);
});