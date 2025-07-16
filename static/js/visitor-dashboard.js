let visitorsChart;
let activityPaused = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    initializeChart();
    loadDashboardData();
    loadSensorsData();
    loadActivityStream();

    // Обновление данных каждые 30 секунд
    setInterval(loadDashboardData, 30000);
    setInterval(loadActivityStream, 15000);

    // Event listeners
    document.getElementById('refresh-data')?.addEventListener('click', refreshAllData);
    document.getElementById('period-select')?.addEventListener('change', loadDashboardData);

    // Chart controls
    document.querySelectorAll('.chart-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.chart-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            updateChart(this.dataset.period);
        });
    });

    // Activity controls
    document.getElementById('pause-activity')?.addEventListener('click', toggleActivityPause);
    document.getElementById('clear-activity')?.addEventListener('click', clearActivity);

    // Filter controls
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterSensors(this.dataset.filter);
        });
    });
});

function initializeDashboard() {
    console.log('Initializing BELWEST Dashboard...');

    // Анимация загрузки карточек метрик
    const metricCards = document.querySelectorAll('.metric-card');
    metricCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function initializeChart() {
    const ctx = document.getElementById('visitorsChart');
    if (!ctx) return;

    visitorsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: generateTimeLabels(),
            datasets: [{
                label: 'Посетители',
                data: generateChartData(),
                borderColor: '#4ade80',
                backgroundColor: 'rgba(74, 222, 128, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#4ade80',
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
                x: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                },
                y: {
                    display: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            elements: {
                point: {
                    hoverBackgroundColor: '#22c55e'
                }
            }
        }
    });
}

function generateTimeLabels() {
    const labels = [];
    for (let i = 0; i < 24; i++) {
        labels.push(`${i.toString().padStart(2, '0')}:00`);
    }
    return labels;
}

function generateChartData() {
    const data = [];
    for (let i = 0; i < 24; i++) {
        // Имитация реальных данных с пиками в часы активности
        let value = Math.random() * 20 + 10;
        if (i >= 9 && i <= 18) {
            value += Math.random() * 30 + 20; // Рабочие часы
        }
        if (i >= 19 && i <= 22) {
            value += Math.random() * 25 + 15; // Вечерние часы
        }
        data.push(Math.round(value));
    }
    return data;
}

function loadDashboardData() {
    const period = document.getElementById('period-select')?.value || 'day';

    fetch(`/api/sensor-data?period=${period}`)
        .then(response => response.json())
        .then(data => {
            updateMetrics(data);
            updateChart('day', data.hourly_visitors || []);
        })
        .catch(error => {
            console.error('Ошибка загрузки данных дашборда:', error);
        });
}

function updateMetrics(data) {
    // Обновляем метрики с анимацией
    animateCounter('total-visitors', data.total_visitors || 141);
    animateCounter('active-sensors', data.active_sensors || 90);

    const peakTime = data.peak_weekday || '05:00';
    document.getElementById('peak-time').textContent = peakTime;

    const visitorsPerMinute = Math.round((data.total_visitors || 0) / (24 * 60));
    animateCounter('visitors-per-minute', visitorsPerMinute);
}

function animateCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const currentValue = parseInt(element.textContent) || 0;
    const increment = (targetValue - currentValue) / 30;
    let current = currentValue;

    const timer = setInterval(() => {
        current += increment;
        if (
            (increment > 0 && current >= targetValue) ||
            (increment < 0 && current <= targetValue)
        ) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.round(current);
        }
    }, 50);
}

function loadSensorsData() {
    fetch('/api/sensors')
        .then(response => response.json())
        .then(sensors => {
            updateSensorsList(sensors);
        })
        .catch(error => {
            console.error('Ошибка загрузки датчиков:', error);
            // Показываем демо-данные
            updateSensorsList([
                { id: 1, name: 'Sensor Zone A', location: 'Главный вход', status: 'active', visitors: 45 },
                { id: 2, name: 'Sensor Zone B', location: 'Боковой вход', status: 'active', visitors: 23 },
                { id: 3, name: 'Sensor Zone C', location: 'Офис менеджера', status: 'inactive', visitors: 0 },
                { id: 4, name: 'Sensor Zone D', location: 'Склад', status: 'active', visitors: 12 },
                { id: 5, name: 'Sensor Zone E', location: 'Касса №1', status: 'active', visitors: 67 }
            ]);
        });
}

function updateSensorsList(sensors) {
    const sensorsList = document.getElementById('sensors-list');
    if (!sensorsList) return;

    sensorsList.innerHTML = sensors.map(sensor => `
        <div class="sensor-item" data-status="${sensor.status}">
            <div class="sensor-status ${sensor.status}"></div>
            <div class="sensor-info">
                <div class="sensor-name">${sensor.name}</div>
                <div class="sensor-location">${sensor.location}</div>
            </div>
            <div class="sensor-visitors">
                <span style="color: #4ade80; font-weight: 600;">${sensor.visitors || 0}</span>
            </div>
        </div>
    `).join('');
}

function loadActivityStream() {
    if (activityPaused) return;

    const activities = [
        {
            type: 'visitor',
            icon: 'fa-user-plus',
            title: 'Новый посетитель',
            description: 'Вход через главный вход',
            time: 'Только что',
            color: '#4ade80'
        },
        {
            type: 'sensor',
            icon: 'fa-wifi',
            title: 'Датчик восстановлен',
            description: 'Sensor Zone C снова онлайн',
            time: '2 мин назад',
            color: '#3b82f6'
        },
        {
            type: 'alert',
            icon: 'fa-exclamation-triangle',
            title: 'Высокая нагрузка',
            description: 'Превышен лимит в Zone A',
            time: '5 мин назад',
            color: '#f59e0b'
        },
        {
            type: 'visitor',
            icon: 'fa-user-minus',
            title: 'Посетитель покинул',
            description: 'Выход через боковой вход',
            time: '7 мин назад',
            color: '#ef4444'
        },
        {
            type: 'system',
            icon: 'fa-cog',
            title: 'Система обновлена',
            description: 'Версия 2.1.4 установлена',
            time: '1 час назад',
            color: '#8b5cf6'
        }
    ];

    updateActivityStream(activities);
}

function updateActivityStream(activities) {
    const activityStream = document.getElementById('activity-stream');
    if (!activityStream) return;

    activityStream.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon" style="color: ${activity.color}">
                <i class="fas ${activity.icon}"></i>
            </div>
            <div class="activity-info">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

function updateChart(period, data = null) {
    if (!visitorsChart) return;

    let newData, newLabels;

    if (data) {
        newData = data;
        newLabels = generateTimeLabels();
    } else {
        switch (period) {
            case 'week':
                newLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
                newData = [120, 150, 180, 220, 190, 160, 140];
                break;
            case 'month':
                newLabels = [];
                newData = [];
                for (let i = 1; i <= 30; i++) {
                    newLabels.push(i.toString());
                    newData.push(Math.random() * 200 + 50);
                }
                break;
            default:
                newLabels = generateTimeLabels();
                newData = generateChartData();
        }
    }

    visitorsChart.data.labels = newLabels;
    visitorsChart.data.datasets[0].data = newData;
    visitorsChart.update('active');
}

function filterSensors(filter) {
    const sensorItems = document.querySelectorAll('.sensor-item');

    sensorItems.forEach(item => {
        const status = item.dataset.status;
        let show = false;

        switch (filter) {
            case 'all':
                show = true;
                break;
            case 'online':
                show = status === 'active';
                break;
            case 'offline':
                show = status === 'inactive';
                break;
        }

        item.style.display = show ? 'flex' : 'none';
    });
}

function toggleActivityPause() {
    activityPaused = !activityPaused;
    const btn = document.getElementById('pause-activity');
    const icon = btn.querySelector('i');

    if (activityPaused) {
        icon.className = 'fas fa-play';
        btn.style.background = '#ef4444';
    } else {
        icon.className = 'fas fa-pause';
        btn.style.background = '';
    }
}

function clearActivity() {
    const activityStream = document.getElementById('activity-stream');
    if (activityStream) {
        activityStream.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">Активность очищена</div>';
    }
}

function refreshAllData() {
    const refreshBtn = document.getElementById('refresh-data');
    const icon = refreshBtn.querySelector('i');

    icon.style.transform = 'rotate(360deg)';

    loadDashboardData();
    loadSensorsData();
    loadActivityStream();

    setTimeout(() => {
        icon.style.transform = 'rotate(0deg)';
    }, 1000);
}

// Функции для интерактивности
function showSensorDetails(sensorId) {
    console.log('Показать детали датчика:', sensorId);
    // Здесь можно добавить модальное окно с деталями
}

function exportData(format) {
    console.log('Экспорт данных в формате:', format);
    // Здесь можно добавить функционал экспорта
}

// Обработка ошибок соединения
window.addEventListener('online', function() {
    console.log('Соединение восстановлено');
    refreshAllData();
});

window.addEventListener('offline', function() {
    console.log('Соединение потеряно');
});