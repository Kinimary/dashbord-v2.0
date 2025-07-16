let visitorsChart;
let activityPaused = false;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    loadSensorData('day');
    initializeCharts();
    loadActivityStream();
    setupRefreshHandlers();
    setupHierarchySelectors();
    setupUserMenu();
});

function setupHierarchySelectors() {
    const hierarchySelect = document.getElementById('hierarchy-type');
    const entitySelect = document.getElementById('entity-selector');

    if (hierarchySelect && entitySelect) {
        hierarchySelect.addEventListener('change', function() {
            const hierarchyType = this.value;

            if (hierarchyType) {
                entitySelect.style.display = 'inline-block';
                loadHierarchyOptions(hierarchyType);
            } else {
                entitySelect.style.display = 'none';
                entitySelect.innerHTML = '<option value="">Выберите...</option>';
                // Load all data
                loadSensorData(document.getElementById('period-select').value);
            }
        });

        entitySelect.addEventListener('change', function() {
            const hierarchyType = hierarchySelect.value;
            const entityId = this.value;
            const period = document.getElementById('period-select').value;

            if (hierarchyType && entityId) {
                loadSensorData(period, hierarchyType, entityId);
            }
        });
    }
}

function loadHierarchyOptions(hierarchyType) {
    fetch(`/api/hierarchy/${hierarchyType}`)
        .then(response => response.json())
        .then(options => {
            const entitySelect = document.getElementById('entity-selector');
            entitySelect.innerHTML = '<option value="">Выберите...</option>';

            options.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.id;
                optionElement.textContent = option.name;
                entitySelect.appendChild(optionElement);
            });
        })
        .catch(error => {
            console.error('Error loading hierarchy options:', error);
        });
}

function setupUserMenu() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('active');
        });

        document.addEventListener('click', function() {
            userDropdown.classList.remove('active');
        });
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

function loadSensorData(period, hierarchyType = '', entityId = '') {
    let url = `/api/sensor-data?period=${period}`;

    if (hierarchyType && entityId) {
        url += `&hierarchy_type=${hierarchyType}&entity_id=${entityId}`;
    }

    // Показываем индикатор загрузки
    showLoadingIndicator();

    fetch(url)
        .then(response => response.json())
        .then(data => {
            updateMetrics(data);
            updateCharts(data);
            updateSensorsList(data);
            updateStoreStatistics(data);
            updateEfficiencyAnalytics(data);
            hideLoadingIndicator();
        })
        .catch(error => {
            console.error('Error loading sensor data:', error);
            hideLoadingIndicator();
        });
}

function showLoadingIndicator() {
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        metric.style.opacity = '0.5';
    });
}

function hideLoadingIndicator() {
    const metrics = document.querySelectorAll('.metric-value');
    metrics.forEach(metric => {
        metric.style.opacity = '1';
    });
}

function updateEfficiencyAnalytics(data) {
    // Обновляем аналитику эффективности на основе реальных данных
    const efficiency = calculateEfficiency(data);
    const conversion = calculateConversion(data);
    const engagement = calculateEngagement(data);
    const retention = calculateRetention(data);

    document.querySelector('.analytics-card.efficiency .analytics-title').textContent = efficiency.toFixed(1) + '%';
    document.querySelector('.analytics-card.conversion .analytics-title').textContent = conversion.toFixed(1) + '%';
    document.querySelector('.analytics-card.engagement .analytics-title').textContent = engagement.toFixed(1) + '%';
    document.querySelector('.analytics-card.retention .analytics-title').textContent = retention.toFixed(1) + '%';
}

function calculateEfficiency(data) {
    // Эффективность = (активные датчики / общее количество датчиков) * 100
    const activeSensors = data.active_sensors || 0;
    const totalSensors = data.total_sensors || 100;
    return (activeSensors / totalSensors) * 100;
}

function calculateConversion(data) {
    // Конверсия = (уникальные посетители / общие посетители) * 100
    const uniqueVisitors = data.unique_visitors || data.total_visitors * 0.7;
    const totalVisitors = data.total_visitors || 1;
    return (uniqueVisitors / totalVisitors) * 100;
}

function calculateEngagement(data) {
    // Вовлеченность = среднее время в магазине / целевое время * 100
    const avgTime = data.avg_visit_time || 4.2;
    const targetTime = 6.0;
    return Math.min((avgTime / targetTime) * 100, 100);
}

function calculateRetention(data) {
    // Удержание = повторные визиты / общие визиты * 100
    const repeatVisits = data.repeat_visits || data.total_visitors * 0.3;
    const totalVisits = data.total_visitors || 1;
    return (repeatVisits / totalVisits) * 100;
}

function updateStoreStatistics(data) {
    if (data.stores && data.stores.length > 0) {
        // Показать статистику по магазинам если она есть
        const activityStream = document.getElementById('activity-stream');
        if (activityStream) {
            let storeHtml = '<div class="store-statistics"><h4>Статистика по магазинам:</h4>';
            data.stores.forEach(store => {
                storeHtml += `
                    <div class="store-stat-item">
                        <div class="store-name">${store.name}</div>
                        <div class="store-address">${store.address}</div>
                        <div class="store-visitors">${store.visitors} посетителей</div>
                    </div>
                `;
            });
            storeHtml += '</div>';
            activityStream.innerHTML = storeHtml;
        }
    }
}

function setupRefreshHandlers() {
    const refreshBtn = document.getElementById('refresh-data');
    const periodSelect = document.getElementById('period-select');
    const hierarchySelect = document.getElementById('hierarchy-type');
    const entitySelect = document.getElementById('entity-selector');

    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const period = periodSelect ? periodSelect.value : 'day';
            const hierarchyType = hierarchySelect ? hierarchySelect.value : '';
            const entityId = entitySelect ? entitySelect.value : '';
            loadSensorData(period, hierarchyType, entityId);
        });
    }

    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            const hierarchyType = hierarchySelect ? hierarchySelect.value : '';
            const entityId = entitySelect ? entitySelect.value : '';
            loadSensorData(this.value, hierarchyType, entityId);
        });
    }
}

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

function initializeCharts() {
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

function updateCharts(data) {
    if (!visitorsChart) return;

    let newData, newLabels;
    newLabels = generateTimeLabels();
    newData = generateChartData();

    visitorsChart.data.labels = newLabels;
    visitorsChart.data.datasets[0].data = newData;
    visitorsChart.update('active');
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

    const periodSelect = document.getElementById('period-select');
    const period = periodSelect ? periodSelect.value : 'day';

    loadSensorData(period);
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