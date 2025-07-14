
let visitorsChart;
let sensorsChart;

// Загрузка данных при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
    initCharts();
    
    // Обновление данных каждые 30 секунд
    setInterval(loadDashboardData, 30000);
});

async function loadDashboardData() {
    try {
        const response = await fetch('/api/sensor-data');
        const data = await response.json();
        
        updateStats(data);
        updateRecentActivity(data);
        updateSensorsOverview(data);
        updateCharts(data);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

function updateStats(data) {
    const today = new Date().toDateString();
    const todayData = data.filter(item => new Date(item.timestamp * 1000).toDateString() === today);
    
    // Подсчет посетителей за сегодня
    const todayVisitors = todayData.reduce((sum, item) => sum + item.count, 0);
    document.getElementById('today-visitors').textContent = todayVisitors;
    
    // Активные датчики
    const uniqueSensors = [...new Set(data.map(item => item.device_id))];
    const activeSensors = uniqueSensors.filter(sensorId => {
        const sensorData = data.filter(item => item.device_id === sensorId);
        const latestData = sensorData[0];
        return latestData && latestData.status === 'online';
    });
    
    document.getElementById('active-sensors').textContent = activeSensors.length;
    document.getElementById('sensors-status').textContent = `из ${uniqueSensors.length} датчиков`;
    
    // Средний поток в час
    const hourlyData = getHourlyData(todayData);
    const avgHourly = hourlyData.length > 0 ? 
        Math.round(hourlyData.reduce((sum, val) => sum + val, 0) / hourlyData.length) : 0;
    document.getElementById('avg-hourly').textContent = avgHourly;
    
    // Пиковое время
    const peakHour = findPeakHour(todayData);
    document.getElementById('peak-time').textContent = peakHour.hour || '-';
    document.getElementById('peak-count').textContent = peakHour.count ? `${peakHour.count} посетителей` : '-';
}

function getHourlyData(data) {
    const hourlyCount = {};
    
    data.forEach(item => {
        const hour = new Date(item.timestamp * 1000).getHours();
        hourlyCount[hour] = (hourlyCount[hour] || 0) + item.count;
    });
    
    return Object.values(hourlyCount);
}

function findPeakHour(data) {
    const hourlyCount = {};
    
    data.forEach(item => {
        const hour = new Date(item.timestamp * 1000).getHours();
        hourlyCount[hour] = (hourlyCount[hour] || 0) + item.count;
    });
    
    let maxCount = 0;
    let peakHour = null;
    
    for (const [hour, count] of Object.entries(hourlyCount)) {
        if (count > maxCount) {
            maxCount = count;
            peakHour = `${hour}:00`;
        }
    }
    
    return { hour: peakHour, count: maxCount };
}

function updateRecentActivity(data) {
    const recentData = data.slice(0, 10);
    const activityList = document.getElementById('recent-data');
    
    activityList.innerHTML = recentData.map(item => `
        <div class="activity-item">
            <div class="activity-icon">📊</div>
            <div class="activity-content">
                <div class="activity-title">Датчик ${item.device_id}</div>
                <div class="activity-meta">
                    ${item.count} посетителей • ${formatTime(item.timestamp)}
                    <span class="status-badge ${item.status === 'online' ? 'online' : 'offline'}">
                        ${item.status === 'online' ? 'Онлайн' : 'Оффлайн'}
                    </span>
                </div>
            </div>
        </div>
    `).join('');
}

function updateSensorsOverview(data) {
    const sensorsGrid = document.getElementById('sensors-grid');
    const sensorGroups = {};
    
    data.forEach(item => {
        if (!sensorGroups[item.device_id]) {
            sensorGroups[item.device_id] = {
                id: item.device_id,
                location: item.location || 'Не указано',
                status: item.status,
                count: 0,
                lastUpdate: item.timestamp
            };
        }
        sensorGroups[item.device_id].count += item.count;
    });
    
    sensorsGrid.innerHTML = Object.values(sensorGroups).map(sensor => `
        <div class="sensor-card">
            <div class="sensor-header">
                <h4>Датчик ${sensor.id}</h4>
                <span class="status-indicator ${sensor.status === 'online' ? 'online' : 'offline'}"></span>
            </div>
            <div class="sensor-info">
                <div class="sensor-location">${sensor.location}</div>
                <div class="sensor-count">${sensor.count} посетителей</div>
                <div class="sensor-update">Обновлено: ${formatTime(sensor.lastUpdate)}</div>
            </div>
        </div>
    `).join('');
}

function initCharts() {
    // График посетителей по часам
    const visitorsCtx = document.getElementById('visitors-chart').getContext('2d');
    visitorsChart = new Chart(visitorsCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Посетители',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    // График данных с датчиков
    const sensorsCtx = document.getElementById('sensors-chart').getContext('2d');
    sensorsChart = new Chart(sensorsCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Показания датчиков',
                data: [],
                backgroundColor: '#2196F3',
                borderColor: '#1976D2',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateCharts(data) {
    // Обновление графика посетителей по часам
    const today = new Date().toDateString();
    const todayData = data.filter(item => new Date(item.timestamp * 1000).toDateString() === today);
    
    const hourlyData = {};
    for (let i = 0; i < 24; i++) {
        hourlyData[i] = 0;
    }
    
    todayData.forEach(item => {
        const hour = new Date(item.timestamp * 1000).getHours();
        hourlyData[hour] += item.count;
    });
    
    visitorsChart.data.labels = Object.keys(hourlyData).map(hour => `${hour}:00`);
    visitorsChart.data.datasets[0].data = Object.values(hourlyData);
    visitorsChart.update();
    
    // Обновление графика датчиков
    const sensorData = {};
    data.forEach(item => {
        if (!sensorData[item.device_id]) {
            sensorData[item.device_id] = 0;
        }
        sensorData[item.device_id] += item.count;
    });
    
    sensorsChart.data.labels = Object.keys(sensorData).map(id => `Датчик ${id}`);
    sensorsChart.data.datasets[0].data = Object.values(sensorData);
    sensorsChart.update();
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
    });
}
