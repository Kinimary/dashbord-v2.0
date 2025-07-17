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
    setupActivityFilters();
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
    loadSensorsActivity();
}

function loadSensorsActivity() {
    fetch('/api/sensors')
        .then(response => response.json())
        .then(sensors => {
            const sensorsActivityList = document.getElementById('sensors-activity-list');
            if (sensorsActivityList) {
                const activeFilter = document.querySelector('.activity-filter-controls .filter-btn.active').getAttribute('data-filter');

                let filteredSensors = sensors;
                if (activeFilter === 'online') {
                    filteredSensors = sensors.filter(s => s.status === 'active');
                } else if (activeFilter === 'offline') {
                    filteredSensors = sensors.filter(s => s.status !== 'active');
                }

                if (filteredSensors.length === 0) {
                    sensorsActivityList.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-robot" style="font-size: 48px; color: var(--text-tertiary); margin-bottom: 16px;"></i>
                            <p>Датчики не найдены</p>
                        </div>
                    `;
                } else {
                    sensorsActivityList.innerHTML = filteredSensors.map(sensor => {
                        const statusInfo = getSensorStatusInfo(sensor.status);
                        const timeAgo = getTimeAgo(sensor.last_updated);

                        return `
                            <div class="sensor-activity-item">
                                <div class="sensor-activity-info">
                                    <div class="sensor-activity-icon ${statusInfo.class}">
                                        <i class="fas ${statusInfo.icon}"></i>
                                    </div>
                                    <div class="sensor-activity-details">
                                        <h4>${sensor.name}</h4>
                                        <p>${sensor.location}</p>
                                    </div>
                                </div>
                                <div class="sensor-activity-status">
                                    <span class="sensor-activity-badge ${statusInfo.class}">${statusInfo.text}</span>
                                    <div class="sensor-activity-time">${timeAgo}</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки активности датчиков:', error);
            const sensorsActivityList = document.getElementById('sensors-activity-list');
            if (sensorsActivityList) {
                sensorsActivityList.innerHTML = `
                    <div class="error-state">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--error-color); margin-bottom: 16px;"></i>
                        <p>Ошибка загрузки данных</p>
                    </div>
                `;
            }
        });
}

function getSensorStatusInfo(status) {
    switch (status) {
        case 'active':
            return { class: 'online', text: 'Активен', icon: 'fa-check-circle' };
        case 'inactive':
            return { class: 'offline', text: 'Неактивен', icon: 'fa-times-circle' };
        case 'maintenance':
            return { class: 'warning', text: 'Обслуживание', icon: 'fa-tools' };
        default:
            return { class: 'offline', text: 'Неизвестно', icon: 'fa-question-circle' };
    }
}

function getTimeAgo(timestamp) {
    if (!timestamp || timestamp === '-') {
        return 'Неизвестно';
    }

    try {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Только что';
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        return `${diffDays} дн назад`;
    } catch (e) {
        return 'Неизвестно';
    }
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

// Функция для обновления данных
    function updateDashboard() {
        loadSensorData();
        loadRecentAlerts();
        updateDateTime();
        loadAIInsights();
    }

    // AI функциональность
    function loadAIInsights() {
        fetch('/api/ai/insights')
            .then(response => response.json())
            .then(data => {
                const container = document.getElementById('ai-insights');
                if (data.status === 'success' && data.insights) {
                    container.innerHTML = '';
                    data.insights.forEach(insight => {
                        const insightDiv = document.createElement('div');
                        insightDiv.className = 'ai-insight-item';
                        insightDiv.innerHTML = `
                            <i class="fas fa-lightbulb"></i>
                            <span>${insight}</span>
                        `;
                        container.appendChild(insightDiv);
                    });
                } else {
                    container.innerHTML = '<div class="ai-error">Не удалось загрузить AI аналитику</div>';
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки AI аналитики:', error);
                document.getElementById('ai-insights').innerHTML = '<div class="ai-error">Ошибка загрузки</div>';
            });
    }

    function refreshAIInsights() {
        const container = document.getElementById('ai-insights');
        container.innerHTML = '<div class="loading-placeholder"><i class="fas fa-spinner fa-spin"></i> Обновление...</div>';
        loadAIInsights();
    }

    function showAIRecommendations() {
        fetch('/api/ai/recommendations')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showAIModal('Рекомендации AI', formatRecommendations(data.recommendations));
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки рекомендаций:', error);
            });
    }

    function showAIPredictions() {
        fetch('/api/ai/predictions?hours=12')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    showAIModal('Прогнозы AI', formatPredictions(data.predictions));
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки прогнозов:', error);
            });
    }

    function formatRecommendations(recommendations) {
        if (!recommendations || recommendations.length === 0) {
            return '<p>Нет рекомендаций на данный момент</p>';
        }

        let html = '<div class="recommendations-list">';
        recommendations.forEach(rec => {
            const priorityClass = rec.priority === 'high' ? 'high-priority' : 
                                 rec.priority === 'medium' ? 'medium-priority' : 'low-priority';
            html += `
                <div class="recommendation-item ${priorityClass}">
                    <div class="rec-header">
                        <h4>${rec.title}</h4>
                        <span class="priority-badge ${priorityClass}">${rec.priority}</span>
                    </div>
                    <p>${rec.description}</p>
                    <div class="rec-impact">
                        <i class="fas fa-arrow-right"></i>
                        <span>${rec.impact}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    function formatPredictions(predictions) {
        if (!predictions || predictions.predictions.length === 0) {
            return '<p>Нет данных для прогноза</p>';
        }

        let html = '<div class="predictions-list">';
        predictions.predictions.slice(0, 6).forEach(pred => {
            const date = new Date(pred.datetime);
            const confidence = Math.round(pred.confidence * 100);
            html += `
                <div class="prediction-item">
                    <div class="pred-time">${date.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'})}</div>
                    <div class="pred-visitors">${pred.predicted_visitors} посетителей</div>
                    <div class="pred-confidence">Уверенность: ${confidence}%</div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    function showAIModal(title, content) {
        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content">
                <div class="ai-modal-header">
                    <h3>${title}</h3>
                    <button class="ai-modal-close" onclick="closeAIModal()">&times;</button>
                </div>
                <div class="ai-modal-body">
                    ${content}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Показываем модальное окно
        setTimeout(() => modal.classList.add('show'), 10);
    }

    function closeAIModal() {
        const modal = document.querySelector('.ai-modal');
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
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
            loadSensorsActivity();
        });
    });
}