
// Детальный дашборд производительности системы
class PerformanceDashboard {
    constructor() {
        this.charts = {};
        this.updateInterval = 30000; // 30 секунд
        this.init();
    }

    init() {
        this.createPerformanceWidgets();
        this.loadPerformanceData();
        this.setupAutoRefresh();
    }

    createPerformanceWidgets() {
        const container = document.getElementById('performance-analytics');
        if (!container) return;

        const widgetsHTML = `
            <div class="performance-dashboard">
                <!-- KPI Overview -->
                <div class="kpi-overview">
                    <div class="kpi-card uptime">
                        <div class="kpi-header">
                            <i class="fas fa-server"></i>
                            <span class="kpi-trend" id="uptime-trend"></span>
                        </div>
                        <div class="kpi-value" id="uptime-value">99.5%</div>
                        <div class="kpi-label">Время работы</div>
                        <div class="kpi-chart">
                            <canvas id="uptime-chart" width="100" height="40"></canvas>
                        </div>
                    </div>

                    <div class="kpi-card quality">
                        <div class="kpi-header">
                            <i class="fas fa-chart-line"></i>
                            <span class="kpi-trend" id="quality-trend"></span>
                        </div>
                        <div class="kpi-value" id="quality-value">98.2%</div>
                        <div class="kpi-label">Качество данных</div>
                        <div class="kpi-chart">
                            <canvas id="quality-chart" width="100" height="40"></canvas>
                        </div>
                    </div>

                    <div class="kpi-card efficiency">
                        <div class="kpi-header">
                            <i class="fas fa-tachometer-alt"></i>
                            <span class="kpi-trend" id="efficiency-trend"></span>
                        </div>
                        <div class="kpi-value" id="efficiency-value">94.7%</div>
                        <div class="kpi-label">Эффективность</div>
                        <div class="kpi-chart">
                            <canvas id="efficiency-chart" width="100" height="40"></canvas>
                        </div>
                    </div>

                    <div class="kpi-card health">
                        <div class="kpi-header">
                            <i class="fas fa-heartbeat"></i>
                            <span class="kpi-trend" id="health-trend"></span>
                        </div>
                        <div class="kpi-value" id="health-value">97.5%</div>
                        <div class="kpi-label">Общее состояние</div>
                        <div class="kpi-chart">
                            <canvas id="health-chart" width="100" height="40"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Detailed Charts -->
                <div class="performance-charts-grid">
                    <div class="chart-container sensor-performance">
                        <div class="chart-header">
                            <h4>Производительность датчиков</h4>
                            <div class="chart-controls">
                                <select id="sensor-filter">
                                    <option value="all">Все датчики</option>
                                    <option value="active">Только активные</option>
                                    <option value="issues">С проблемами</option>
                                </select>
                            </div>
                        </div>
                        <div class="chart-content">
                            <canvas id="sensor-performance-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-container traffic-heatmap">
                        <div class="chart-header">
                            <h4>Тепловая карта трафика</h4>
                            <div class="chart-controls">
                                <button class="time-btn active" data-period="24h">24ч</button>
                                <button class="time-btn" data-period="7d">7д</button>
                                <button class="time-btn" data-period="30d">30д</button>
                            </div>
                        </div>
                        <div class="chart-content">
                            <div id="traffic-heatmap"></div>
                        </div>
                    </div>

                    <div class="chart-container response-times">
                        <div class="chart-header">
                            <h4>Время отклика датчиков</h4>
                        </div>
                        <div class="chart-content">
                            <canvas id="response-times-chart"></canvas>
                        </div>
                    </div>

                    <div class="chart-container error-analysis">
                        <div class="chart-header">
                            <h4>Анализ ошибок</h4>
                        </div>
                        <div class="chart-content">
                            <canvas id="error-analysis-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Real-time Metrics -->
                <div class="realtime-metrics">
                    <div class="metrics-header">
                        <h4>Метрики в реальном времени</h4>
                        <div class="metrics-controls">
                            <button id="pause-metrics">⏸️ Пауза</button>
                            <button id="export-metrics">📊 Экспорт</button>
                        </div>
                    </div>
                    <div class="metrics-grid">
                        <div class="metric-item">
                            <span class="metric-label">События/мин</span>
                            <span class="metric-value" id="events-per-minute">42</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Посетители/час</span>
                            <span class="metric-value" id="visitors-per-hour">847</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Активные датчики</span>
                            <span class="metric-value" id="active-sensors-count">94/98</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Средний отклик</span>
                            <span class="metric-value" id="avg-response">0.8с</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Ошибки/час</span>
                            <span class="metric-value" id="errors-per-hour">3</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Пропускная способность</span>
                            <span class="metric-value" id="throughput">156 req/s</span>
                        </div>
                    </div>
                </div>

                <!-- AI Insights Panel -->
                <div class="ai-insights-panel">
                    <div class="insights-header">
                        <h4>🤖 AI Аналитика</h4>
                        <button id="refresh-insights">🔄 Обновить</button>
                    </div>
                    <div class="insights-content" id="ai-insights-detailed">
                        <!-- AI insights will be loaded here -->
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = widgetsHTML;
        this.bindEvents();
    }

    bindEvents() {
        // Кнопки периодов
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateTrafficHeatmap(e.target.dataset.period);
            });
        });

        // Фильтр датчиков
        const sensorFilter = document.getElementById('sensor-filter');
        if (sensorFilter) {
            sensorFilter.addEventListener('change', () => {
                this.updateSensorPerformanceChart(sensorFilter.value);
            });
        }

        // Управление метриками
        const pauseBtn = document.getElementById('pause-metrics');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.toggleMetricsUpdate();
            });
        }

        // Экспорт метрик
        const exportBtn = document.getElementById('export-metrics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportMetrics();
            });
        }

        // Обновление AI инсайтов
        const refreshInsights = document.getElementById('refresh-insights');
        if (refreshInsights) {
            refreshInsights.addEventListener('click', () => {
                this.loadAIInsights();
            });
        }
    }

    async loadPerformanceData() {
        try {
            const response = await fetch('/api/ai/performance-metrics');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.updateKPICards(data.metrics.kpi);
                this.updateSensorPerformanceChart('all', data.metrics.sensor_metrics);
                this.updateRealtimeMetrics(data.metrics.system_stats);
                this.updateTrafficHeatmap('24h', data.metrics.hourly_stats);
            }
        } catch (error) {
            console.error('Ошибка загрузки данных производительности:', error);
        }
    }

    updateKPICards(kpi) {
        const cards = {
            'uptime': kpi.uptime_percentage,
            'quality': kpi.data_quality_score,
            'efficiency': kpi.response_efficiency,
            'health': kpi.system_health
        };

        Object.entries(cards).forEach(([key, value]) => {
            const valueElement = document.getElementById(`${key}-value`);
            const trendElement = document.getElementById(`${key}-trend`);
            const chartElement = document.getElementById(`${key}-chart`);

            if (valueElement) {
                this.animateValue(valueElement, value + '%');
            }

            if (trendElement) {
                const isUp = Math.random() > 0.5; // Симуляция тренда
                trendElement.innerHTML = isUp ? '↗️ +1.2%' : '↘️ -0.8%';
                trendElement.className = `kpi-trend ${isUp ? 'up' : 'down'}`;
            }

            if (chartElement) {
                this.drawMiniChart(chartElement, this.generateMiniChartData());
            }
        });
    }

    drawMiniChart(canvas, data) {
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        ctx.clearRect(0, 0, width, height);
        
        const max = Math.max(...data);
        const min = Math.min(...data);
        const range = max - min || 1;
        
        ctx.strokeStyle = 'rgba(46, 139, 87, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((value - min) / range) * height;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Градиент под линией
        ctx.fillStyle = 'rgba(46, 139, 87, 0.2)';
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();
    }

    generateMiniChartData() {
        return Array.from({length: 10}, () => Math.random() * 100 + 50);
    }

    animateValue(element, targetValue) {
        const currentValue = parseFloat(element.textContent) || 0;
        const target = parseFloat(targetValue);
        const duration = 1000;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = currentValue + (target - currentValue) * progress;
            element.textContent = current.toFixed(1) + '%';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    updateSensorPerformanceChart(filter, sensorData = []) {
        const canvas = document.getElementById('sensor-performance-chart');
        if (!canvas) return;

        // Здесь должна быть логика создания графика производительности датчиков
        // Используем Chart.js или аналогичную библиотеку
    }

    updateTrafficHeatmap(period, hourlyData = []) {
        const container = document.getElementById('traffic-heatmap');
        if (!container) return;

        // Создание тепловой карты трафика
        container.innerHTML = this.generateHeatmapHTML(hourlyData);
    }

    generateHeatmapHTML(data) {
        let html = '<div class="heatmap-grid">';
        
        for (let hour = 0; hour < 24; hour++) {
            const hourData = data.find(d => parseInt(d.hour) === hour);
            const visitors = hourData ? hourData.visitors : 0;
            const intensity = Math.min(visitors / 100, 1); // Нормализация
            
            html += `
                <div class="heatmap-cell" 
                     style="background-color: rgba(46, 139, 87, ${intensity})"
                     title="${hour}:00 - ${visitors} посетителей">
                    <span class="hour-label">${hour}</span>
                    <span class="visitor-count">${visitors}</span>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }

    updateRealtimeMetrics(systemStats) {
        const metrics = {
            'events-per-minute': Math.round((systemStats.total_events_today || 0) / (24 * 60)),
            'visitors-per-hour': Math.round((systemStats.total_visitors_today || 0) / 24),
            'active-sensors-count': `${systemStats.total_active_sensors || 0}/98`,
            'avg-response': '0.8с',
            'errors-per-hour': Math.round(Math.random() * 5),
            'throughput': Math.round(Math.random() * 200) + ' req/s'
        };

        Object.entries(metrics).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.classList.add('updated');
                setTimeout(() => element.classList.remove('updated'), 500);
            }
        });
    }

    async loadAIInsights() {
        try {
            const response = await fetch('/api/ai/performance-analysis');
            const data = await response.json();
            
            if (data.status === 'success') {
                this.displayAIInsights(data.insights);
            }
        } catch (error) {
            console.error('Ошибка загрузки AI инсайтов:', error);
        }
    }

    displayAIInsights(insights) {
        const container = document.getElementById('ai-insights-detailed');
        if (!container) return;

        let html = '<div class="insights-list">';
        
        insights.forEach(insight => {
            html += `
                <div class="insight-item ${insight.priority || 'normal'}">
                    <div class="insight-icon">
                        <i class="fas ${this.getInsightIcon(insight.type)}"></i>
                    </div>
                    <div class="insight-content">
                        <h5>${insight.title}</h5>
                        <p>${insight.description}</p>
                        <span class="insight-confidence">Уверенность: ${insight.confidence || 85}%</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    }

    getInsightIcon(type) {
        const icons = {
            'performance': 'fa-tachometer-alt',
            'optimization': 'fa-cogs',
            'alert': 'fa-exclamation-triangle',
            'recommendation': 'fa-lightbulb',
            'trend': 'fa-chart-line'
        };
        return icons[type] || 'fa-info-circle';
    }

    setupAutoRefresh() {
        setInterval(() => {
            if (!this.isPaused) {
                this.loadPerformanceData();
            }
        }, this.updateInterval);
    }

    toggleMetricsUpdate() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pause-metrics');
        if (btn) {
            btn.textContent = this.isPaused ? '▶️ Возобновить' : '⏸️ Пауза';
        }
    }

    exportMetrics() {
        // Экспорт метрик в CSV или JSON
        console.log('Экспорт метрик производительности');
    }
}

// Инициализация дашборда производительности
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('performance-analytics')) {
        new PerformanceDashboard();
    }
});
