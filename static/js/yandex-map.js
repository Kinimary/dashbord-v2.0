
let map;
let stores = [];
let clusterer;

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
    fetch('/api/map-data')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Loaded stores data:', data);
            stores = data;
            displayStoresOnMap();
        })
        .catch(error => {
            console.error('Error loading stores data:', error);
            showErrorMessage('Ошибка загрузки данных карты. Попробуйте обновить страницу.');
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
        showErrorMessage('Нет данных о магазинах для отображения');
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
    if (visitorCount > 100) return '#22c55e'; // Зеленый - высокая активность
    if (visitorCount > 50) return '#f59e0b';  // Оранжевый - средняя активность
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
    if (sensors) sensors.textContent = Math.floor(Math.random() * 5) + 1; // Случайное число датчиков
    if (peak) peak.textContent = '14:30'; // Фиксированное пиковое время

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

// Показать сообщение об ошибке
function showErrorMessage(message) {
    const mapContainer = document.querySelector('.map-container');
    if (mapContainer) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(239, 68, 68, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 1000;
        `;
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
            <p>${message}</p>
            <button onclick="this.parentElement.remove(); loadStoresData();" style="margin-top: 10px; padding: 5px 15px; background: white; color: #ef4444; border: none; border-radius: 4px; cursor: pointer;">
                Повторить попытку
            </button>
        `;
        mapContainer.style.position = 'relative';
        mapContainer.appendChild(errorDiv);
    }
}

// Обработчики фильтров карты
document.addEventListener('DOMContentLoaded', function() {
    // Фильтр периода
    const periodFilter = document.getElementById('period-filter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            console.log('Period changed to:', this.value);
            loadStoresData();
        });
    }

    // Фильтр метрики
    const metricFilter = document.getElementById('metric-filter');
    if (metricFilter) {
        metricFilter.addEventListener('change', function() {
            console.log('Metric changed to:', this.value);
            loadStoresData();
        });
    }

    // Кнопка обновления
    const refreshBtn = document.getElementById('refresh-map');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            console.log('Refreshing map data');
            loadStoresData();
        });
    }

    // Кнопка тепловой карты
    const heatmapBtn = document.getElementById('toggle-heatmap');
    if (heatmapBtn) {
        heatmapBtn.addEventListener('click', function() {
            console.log('Toggle heatmap');
            // Функционал тепловой карты можно добавить позже
            alert('Функция тепловой карты в разработке');
        });
    }

    // Инициализация карты
    if (typeof ymaps !== 'undefined') {
        initMap();
    } else {
        console.error('Yandex Maps API not loaded');
        showErrorMessage('Ошибка загрузки Yandex Maps API. Проверьте подключение к интернету.');
    }
});
