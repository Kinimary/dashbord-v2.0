
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
    fetch('/api/sensor-data')
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
