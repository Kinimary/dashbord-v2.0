
let map;
let stores = [];
let clusterer;
let heatmap;
let isHeatmapActive = false;

// Инициализация карты
function initMap() {
    console.log('Initializing Yandex Map...');
    
    // Проверяем наличие контейнера карты
    const mapContainer = document.getElementById('yandex-map');
    if (!mapContainer) {
        console.error('Map container not found');
        showMapError();
        return;
    }

    if (typeof ymaps === 'undefined') {
        console.error('Yandex Maps API not loaded');
        showMapErrorWithFallback('Яндекс.Карты недоступны');
        return;
    }

    ymaps.ready(function () {
        try {
            // Инициализируем карту
            map = new ymaps.Map('yandex-map', {
                center: [53.9045, 27.5615], // Минск
                zoom: 11,
                controls: ['zoomControl', 'fullscreenControl']
            });

            // Создаем кластеризатор
            clusterer = new ymaps.Clusterer({
                preset: 'islands#greenClusterIcons',
                groupByCoordinates: false,
                clusterDisableClickZoom: false,
                clusterHideIconOnBalloonOpen: false,
                geoObjectHideIconOnBalloonOpen: false
            });

            map.geoObjects.add(clusterer);

            console.log('Map and clusterer created successfully');

            // Загружаем данные магазинов
            loadStoresData();

            console.log('Yandex Map initialized successfully');
            showNotification('Карта загружена успешно', 'success');
        } catch (error) {
            console.error('Error initializing map:', error);
            showMapErrorWithFallback('Ошибка загрузки карты');
        }
    });
}

// Показать ошибку карты
function showMapError() {
    const mapContainer = document.getElementById('yandex-map');
    if (mapContainer) {
        mapContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: var(--card-bg); color: var(--text-secondary); border-radius: 12px;">
                <div style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: var(--warning-color); margin-bottom: 16px;"></i>
                    <div style="font-size: 18px; margin-bottom: 8px;">Карта временно недоступна</div>
                    <div style="font-size: 14px; opacity: 0.7;">Проверьте подключение к интернету и перезагрузите страницу</div>
                    <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: var(--belwest-green); color: white; border: none; border-radius: 6px; cursor: pointer;">
                        Перезагрузить
                    </button>
                </div>
            </div>
        `;
    }
}

// Показать ошибку карты с fallback отображением данных
function showMapErrorWithFallback(errorMessage) {
    const mapContainer = document.getElementById('yandex-map');
    if (mapContainer) {
        // Загружаем данные магазинов для отображения в виде списка
        loadStoresData().then(() => {
            mapContainer.innerHTML = `
                <div style="height: 100%; background: var(--card-bg); border-radius: 12px; padding: 20px; overflow-y: auto;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <i class="fas fa-map-marked-alt" style="font-size: 24px; color: var(--warning-color); margin-bottom: 8px;"></i>
                        <div style="font-size: 16px; color: var(--text-secondary);">${errorMessage}</div>
                        <div style="font-size: 14px; opacity: 0.7;">Отображается список магазинов</div>
                    </div>
                    <div id="stores-list" style="display: grid; gap: 15px;">
                        ${stores.map(store => `
                            <div onclick="showStorePanel(${store.id})" style="background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: 8px; padding: 15px; cursor: pointer; transition: var(--transition);" 
                                 onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                                <div style="font-weight: 600; color: var(--belwest-green); margin-bottom: 8px;">${store.name}</div>
                                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">${store.address}</div>
                                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                                    <span>Посетители: <strong style="color: var(--belwest-green);">${store.visitors_today}</strong></span>
                                    <span>Конверсия: <strong style="color: var(--belwest-green);">${store.conversion}%</strong></span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
    }
}

// Загрузка данных магазинов
function loadStoresData() {
    console.log('Loading stores data...');
    
    // Тестовые данные для демонстрации
    const testStores = [
        {
            id: 1,
            name: "BELWEST Arena City",
            address: "г. Минск, пр. Победителей, 84",
            latitude: 53.9045,
            longitude: 27.5615,
            visitors_today: 156,
            conversion: 12.5,
            revenue: 45000
        },
        {
            id: 2,
            name: "BELWEST Столица",
            address: "г. Минск, пр. Независимости, 120",
            latitude: 53.9006,
            longitude: 27.5590,
            visitors_today: 89,
            conversion: 8.3,
            revenue: 32000
        },
        {
            id: 3,
            name: "BELWEST Галерея",
            address: "г. Минск, пр. Притыцкого, 29",
            latitude: 53.9123,
            longitude: 27.4567,
            visitors_today: 234,
            conversion: 15.7,
            revenue: 67000
        },
        {
            id: 4,
            name: "BELWEST Дана Молл",
            address: "г. Минск, пр. Дзержинского, 104",
            latitude: 53.8794,
            longitude: 27.6123,
            visitors_today: 45,
            conversion: 6.2,
            revenue: 18000
        },
        {
            id: 5,
            name: "BELWEST Караван",
            address: "г. Минск, ул. Кульман, 2",
            latitude: 53.8456,
            longitude: 27.5234,
            visitors_today: 178,
            conversion: 11.8,
            revenue: 52000
        }
    ];

    // Возвращаем Promise для правильной обработки в refreshMap
    return fetch('/api/map-data')
        .then(response => {
            if (!response.ok) {
                throw new Error('API unavailable');
            }
            return response.json();
        })
        .then(data => {
            console.log('Loaded stores data from API:', data);
            stores = data;
            if (map && clusterer) {
                displayStoresOnMap();
            }
            return stores;
        })
        .catch(error => {
            console.log('Using test data:', error.message);
            stores = testStores;
            if (map && clusterer) {
                displayStoresOnMap();
            }
            return stores;
        });
}

// Отображение магазинов на карте
function displayStoresOnMap() {
    console.log('Displaying stores on map...', { map: !!map, clusterer: !!clusterer, storesCount: stores.length });
    
    if (!map || !clusterer) {
        console.log('Map or clusterer not ready');
        return;
    }

    try {
        // Очищаем кластеризатор
        clusterer.removeAll();

        if (!stores || stores.length === 0) {
            console.log('No stores data available');
            showNotification('Нет данных о магазинах', 'warning');
            return;
        }

        const placemarks = [];

        stores.forEach((store, index) => {
            if (!store.latitude || !store.longitude) {
                console.log(`Store ${store.name} has no coordinates`);
                return;
            }

            const visitorCount = store.visitors_today || 0;
            const iconColor = getStoreColor(visitorCount);

            try {
                const placemark = new ymaps.Placemark(
                    [parseFloat(store.latitude), parseFloat(store.longitude)],
                    {
                        balloonContentHeader: `<strong style="color: #2E8B57; font-size: 16px;">${store.name}</strong>`,
                        balloonContentBody: `
                            <div style="padding: 12px; font-family: 'Segoe UI', sans-serif; color: #333;">
                                <p style="margin: 8px 0;"><i class="fas fa-map-marker-alt" style="color: #2E8B57; margin-right: 8px;"></i> ${store.address}</p>
                                <p style="margin: 8px 0;"><i class="fas fa-users" style="color: #2E8B57; margin-right: 8px;"></i> Посетители: <strong style="color: #2E8B57;">${visitorCount}</strong></p>
                                <p style="margin: 8px 0;"><i class="fas fa-chart-line" style="color: #2E8B57; margin-right: 8px;"></i> Конверсия: <strong style="color: #2E8B57;">${store.conversion || 0}%</strong></p>
                                <p style="margin: 8px 0;"><i class="fas fa-ruble-sign" style="color: #2E8B57; margin-right: 8px;"></i> Выручка: <strong style="color: #2E8B57;">${(store.revenue || 0).toLocaleString()} руб.</strong></p>
                                <button onclick="showStorePanel(${store.id})" style="margin-top: 12px; padding: 8px 16px; background: #2E8B57; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                    Подробнее
                                </button>
                            </div>
                        `,
                        balloonContentFooter: `<small style="color: #666; font-size: 12px;">Обновлено: ${new Date().toLocaleString('ru-RU')}</small>`,
                        hintContent: `${store.name} - ${visitorCount} посетителей`
                    },
                    {
                        preset: 'islands#icon',
                        iconColor: iconColor,
                        iconImageSize: [30, 42],
                        iconImageOffset: [-15, -42]
                    }
                );

                // Добавляем обработчик клика
                placemark.events.add('click', function() {
                    showStorePanel(store.id);
                });

                placemarks.push(placemark);
                console.log(`Created placemark for ${store.name}`);
            } catch (placemarkError) {
                console.error(`Error creating placemark for ${store.name}:`, placemarkError);
            }
        });

        if (placemarks.length > 0) {
            // Добавляем все метки в кластеризатор
            clusterer.add(placemarks);
            console.log(`Added ${placemarks.length} stores to map`);
            showNotification(`Загружено ${placemarks.length} магазинов`, 'success');
        } else {
            console.log('No valid placemarks created');
            showNotification('Не удалось создать метки магазинов', 'warning');
        }
    } catch (error) {
        console.error('Error displaying stores on map:', error);
        showNotification('Ошибка отображения магазинов на карте', 'error');
    }
}

// Определение цвета маркера в зависимости от количества посетителей
function getStoreColor(visitorCount) {
    if (visitorCount > 150) return '#22c55e'; // Зеленый - высокая активность
    if (visitorCount > 75) return '#f59e0b';  // Оранжевый - средняя активность
    if (visitorCount > 0) return '#ef4444';   // Красный - низкая активность
    return '#6b7280'; // Серый - неактивный
}

// Показать панель информации о магазине
function showStorePanel(storeId) {
    const store = stores.find(s => s.id === storeId);
    if (!store) return;

    const panel = document.getElementById('store-info-panel');
    const title = document.getElementById('store-title');
    const address = document.getElementById('store-address');
    const visitors = document.getElementById('store-visitors');
    const conversion = document.getElementById('store-conversion');
    const revenue = document.getElementById('store-revenue');
    const sensors = document.getElementById('store-sensors');
    const peak = document.getElementById('store-peak');

    if (title) title.textContent = store.name;
    if (address) address.textContent = store.address;
    if (visitors) visitors.textContent = store.visitors_today || 0;
    if (conversion) conversion.textContent = `${store.conversion || 0}%`;
    if (revenue) revenue.textContent = `₽${(store.revenue || 0).toLocaleString()}`;
    if (sensors) sensors.textContent = Math.floor(Math.random() * 5) + 1;
    if (peak) peak.textContent = '14:30';

    if (panel) {
        panel.classList.add('active');
    }

    // Центрируем карту на магазине
    if (map && store.latitude && store.longitude) {
        map.setCenter([parseFloat(store.latitude), parseFloat(store.longitude)], 15);
    }
}

// Закрыть панель информации о магазине
function closeStorePanel() {
    const panel = document.getElementById('store-info-panel');
    if (panel) {
        panel.classList.remove('active');
    }
}

// Просмотр детальной статистики магазина
function viewStoreDetails() {
    showNotification('Функция детальной статистики в разработке', 'info');
}

// Функция тепловой карты
function toggleHeatmap() {
    if (!map) {
        console.log('Карта не инициализирована');
        showNotification('Карта не инициализирована', 'error');
        return;
    }

    const btn = document.getElementById('toggle-heatmap');
    
    if (isHeatmapActive) {
        // Выключаем тепловую карту
        if (heatmap) {
            map.geoObjects.remove(heatmap);
            heatmap = null;
        }
        if (clusterer) {
            clusterer.options.set('visible', true);
        }
        isHeatmapActive = false;

        if (btn) {
            btn.innerHTML = '<i class="fas fa-fire"></i> Тепловая карта';
            btn.classList.remove('active');
            btn.style.background = '';
            btn.style.color = '';
        }
        showNotification('Тепловая карта выключена', 'info');
    } else {
        // Включаем тепловую карту
        if (stores && stores.length > 0) {
            const heatmapData = stores.map(store => [
                parseFloat(store.latitude),
                parseFloat(store.longitude),
                store.visitors_today || 0
            ]);

            try {
                heatmap = new ymaps.Heatmap(heatmapData, {
                    radius: 25,
                    dissipating: false,
                    opacity: 0.8,
                    intensityOfMidpoint: 0.3,
                    gradient: {
                        0.1: 'rgba(128, 255, 0, 0.7)',
                        0.2: 'rgba(255, 255, 0, 0.8)',
                        0.7: 'rgba(234, 72, 58, 0.9)',
                        1.0: 'rgba(162, 36, 25, 1)'
                    }
                });

                map.geoObjects.add(heatmap);
                
                if (clusterer) {
                    clusterer.options.set('visible', false);
                }
                
                isHeatmapActive = true;

                if (btn) {
                    btn.innerHTML = '<i class="fas fa-fire"></i> Выключить тепловую карту';
                    btn.classList.add('active');
                    btn.style.background = 'var(--belwest-green)';
                    btn.style.color = 'white';
                }
                showNotification('Тепловая карта включена', 'success');
            } catch (error) {
                console.error('Ошибка создания тепловой карты:', error);
                showNotification('Тепловая карта временно недоступна', 'error');
            }
        } else {
            showNotification('Нет данных для отображения тепловой карты', 'warning');
        }
    }
}

// Полноэкранный режим
function toggleFullscreen() {
    const container = document.getElementById('map-container');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const exitBtn = document.getElementById('exit-fullscreen');

    if (!container) return;

    if (container.classList.contains('fullscreen')) {
        // Выходим из полноэкранного режима
        container.classList.remove('fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
            fullscreenBtn.title = 'Полноэкранный режим';
        }
        if (exitBtn) exitBtn.style.display = 'none';

        // Перерисовываем карту
        setTimeout(() => {
            if (map) {
                map.container.fitToViewport();
            }
        }, 300);
    } else {
        // Включаем полноэкранный режим
        container.classList.add('fullscreen');
        if (fullscreenBtn) {
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
            fullscreenBtn.title = 'Выйти из полноэкранного режима';
        }
        if (exitBtn) exitBtn.style.display = 'inline-flex';

        // Перерисовываем карту
        setTimeout(() => {
            if (map) {
                map.container.fitToViewport();
            }
        }, 300);
    }
}

// Функция обновления карты
function refreshMap() {
    const refreshBtn = document.getElementById('refresh-map');
    if (refreshBtn) {
        const icon = refreshBtn.querySelector('i');
        if (icon) {
            icon.classList.add('fa-spin');
            refreshBtn.disabled = true;
        }
        
        // Загружаем новые данные
        loadStoresData().then(() => {
            // Останавливаем анимацию после загрузки данных
            if (icon) {
                icon.classList.remove('fa-spin');
                refreshBtn.disabled = false;
            }
            showNotification('Карта обновлена', 'success');
        }).catch(() => {
            // Останавливаем анимацию в случае ошибки
            if (icon) {
                icon.classList.remove('fa-spin');
                refreshBtn.disabled = false;
            }
            showNotification('Ошибка обновления карты', 'error');
        });
    }
}

// Функция показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Автоматически удаляем уведомление через 5 секунд
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Фильтр периода
    const periodFilter = document.getElementById('period-filter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            console.log('Period changed to:', this.value);
            refreshMap();
        });
    }

    // Фильтр метрики
    const metricFilter = document.getElementById('metric-filter');
    if (metricFilter) {
        metricFilter.addEventListener('change', function() {
            console.log('Metric changed to:', this.value);
            refreshMap();
        });
    }

    // Кнопка обновления
    const refreshBtn = document.getElementById('refresh-map');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshMap);
    }

    // Кнопка тепловой карты
    const heatmapBtn = document.getElementById('toggle-heatmap');
    if (heatmapBtn) {
        heatmapBtn.addEventListener('click', toggleHeatmap);
    }

    // Кнопка полноэкранного режима
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }

    // Кнопка выхода из полноэкранного режима
    const exitBtn = document.getElementById('exit-fullscreen');
    if (exitBtn) {
        exitBtn.addEventListener('click', toggleFullscreen);
    }

    // Выход из полноэкранного режима по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const container = document.getElementById('map-container');
            if (container && container.classList.contains('fullscreen')) {
                toggleFullscreen();
            }
        }
    });

    // Инициализация карты
    console.log('Checking for Yandex Maps API...');
    if (typeof ymaps !== 'undefined') {
        console.log('Yandex Maps API found, initializing...');
        initMap();
    } else {
        console.log('Yandex Maps API not found, using fallback...');
        showMapErrorWithFallback('Яндекс.Карты недоступны');
    }
});

// Экспортируем функции для глобального доступа
window.showStorePanel = showStorePanel;
window.closeStorePanel = closeStorePanel;
window.viewStoreDetails = viewStoreDetails;
window.toggleHeatmap = toggleHeatmap;
window.toggleFullscreen = toggleFullscreen;
window.refreshMap = refreshMap;
window.initMap = initMap;
