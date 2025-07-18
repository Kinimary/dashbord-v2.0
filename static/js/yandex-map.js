
let map;
let stores = [];
let clusterer;
let heatmap;
let isHeatmapActive = false;

// Инициализация карты
function initMap() {
    ymaps.ready(function () {
        map = new ymaps.Map('yandex-map', {
            center: [53.9045, 27.5615], // Минск
            zoom: 11,
            controls: ['zoomControl', 'fullscreenControl', 'searchControl']
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

        // Загружаем данные магазинов
        loadStoresData();

        // Обновляем данные каждые 30 секунд
        setInterval(loadStoresData, 30000);
    });
}

// Загрузка данных магазинов
function loadStoresData() {
    // Используем тестовые данные если API недоступен
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

    fetch('/api/map-data')
        .then(response => {
            if (!response.ok) {
                console.log('API недоступен, используем тестовые данные');
                return { stores: testStores };
            }
            return response.json();
        })
        .then(data => {
            console.log('Loaded stores data:', data);
            stores = data.stores || testStores;
            displayStoresOnMap();
        })
        .catch(error => {
            console.log('Используем тестовые данные:', error);
            stores = testStores;
            displayStoresOnMap();
        });
}

// Отображение магазинов на карте
function displayStoresOnMap() {
    if (!map || !clusterer) {
        console.log('Map or clusterer not ready');
        return;
    }

    // Очищаем кластеризатор
    clusterer.removeAll();

    if (!stores || stores.length === 0) {
        console.log('No stores data available');
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

        const placemark = new ymaps.Placemark(
            [parseFloat(store.latitude), parseFloat(store.longitude)],
            {
                balloonContentHeader: `<strong>${store.name}</strong>`,
                balloonContentBody: `
                    <div style="padding: 10px;">
                        <p><i class="fas fa-map-marker-alt"></i> ${store.address}</p>
                        <p><i class="fas fa-users"></i> Посетители сегодня: <strong>${visitorCount}</strong></p>
                        <p><i class="fas fa-chart-line"></i> Конверсия: <strong>${store.conversion || 0}%</strong></p>
                        <p><i class="fas fa-ruble-sign"></i> Выручка: <strong>${(store.revenue || 0).toLocaleString()} руб.</strong></p>
                        <button onclick="showStorePanel(${store.id})" style="margin-top: 10px; padding: 5px 10px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Подробнее
                        </button>
                    </div>
                `,
                balloonContentFooter: `<small>Обновлено: ${new Date().toLocaleString('ru-RU')}</small>`,
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
    });

    // Добавляем все метки в кластеризатор
    clusterer.add(placemarks);

    console.log(`Added ${placemarks.length} stores to map`);
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
    alert('Функция детальной статистики в разработке');
}

// Функция тепловой карты
function toggleHeatmap() {
    if (!map) {
        console.log('Карта не инициализирована');
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
        }
        console.log('Тепловая карта выключена');
    } else {
        // Включаем тепловую карту
        if (stores && stores.length > 0) {
            const heatmapData = stores.map(store => [
                parseFloat(store.latitude),
                parseFloat(store.longitude),
                store.visitors_today || 0
            ]);

            // Создание тепловой карты
            try {
                heatmap = new ymaps.Heatmap(heatmapData, {
                    radius: 20,
                    dissipating: false,
                    opacity: 0.8,
                    intensityOfMidpoint: 0.2,
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
                console.log('Тепловая карта включена');
            } catch (error) {
                console.error('Ошибка создания тепловой карты:', error);
                alert('Тепловая карта временно недоступна');
            }
        } else {
            console.log('Нет данных для тепловой карты');
            alert('Нет данных для отображения тепловой карты');
        }
    }
}

// Полноэкранный режим
function toggleFullscreen() {
    const container = document.getElementById('map-container');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const exitBtn = document.getElementById('exit-fullscreen');

    if (container.classList.contains('fullscreen')) {
        // Выходим из полноэкранного режима
        container.classList.remove('fullscreen');
        fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
        fullscreenBtn.title = 'Полноэкранный режим';
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
        fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>';
        fullscreenBtn.title = 'Выйти из полноэкранного режима';
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
        icon.classList.add('fa-spin');
        
        // Загружаем новые данные
        loadStoresData();
        
        // Останавливаем анимацию через 2 секунды
        setTimeout(() => {
            icon.classList.remove('fa-spin');
        }, 2000);
    }
}

// Обработчики событий
document.addEventListener('DOMContentLoaded', function() {
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

    // Инициализация карты после загрузки ymaps
    if (typeof ymaps !== 'undefined') {
        console.log('Инициализация Яндекс.Карт...');
        initMap();
    } else {
        console.error('Yandex Maps API не загружен');
        // Показываем сообщение об ошибке
        const mapContainer = document.getElementById('yandex-map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f5f5f5; color: #666;">
                    <div style="text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #f59e0b; margin-bottom: 16px;"></i>
                        <div>Карта временно недоступна</div>
                        <div style="font-size: 14px; margin-top: 8px;">Проверьте подключение к интернету</div>
                    </div>
                </div>
            `;
        }
    }
});

// Экспортируем функции для глобального доступа
window.showStorePanel = showStorePanel;
window.closeStorePanel = closeStorePanel;
window.viewStoreDetails = viewStoreDetails;
window.toggleHeatmap = toggleHeatmap;
window.toggleFullscreen = toggleFullscreen;
window.refreshMap = refreshMap;
