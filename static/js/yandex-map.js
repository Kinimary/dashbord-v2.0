
let yandexMap;
let storesData = [];
let activeHeatmap = false;
let selectedStore = null;

// Инициализация карты
ymaps.ready(function() {
    initializeMap();
    loadStoresData();
    setupMapControls();
});

function initializeMap() {
    yandexMap = new ymaps.Map("yandex-map", {
        center: [53.9, 27.5667], // Координаты Минска
        zoom: 11,
        controls: ['zoomControl', 'fullscreenControl', 'geolocationControl']
    }, {
        searchControlProvider: 'yandex#search'
    });

    // Добавляем кластеризатор для меток
    window.clusterer = new ymaps.Clusterer({
        preset: 'islands#invertedVioletClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false
    });

    yandexMap.geoObjects.add(clusterer);
}

function loadStoresData() {
    fetch('/api/stores-map-data')
        .then(response => response.json())
        .then(data => {
            storesData = data;
            updateMapMarkers();
        })
        .catch(error => {
            console.error('Error loading stores data:', error);
            // Fallback данные для демонстрации
            storesData = [
                {
                    id: 1,
                    name: 'Магазин №1 Центр',
                    address: 'пр. Независимости, 25',
                    coordinates: [53.9045, 27.5615],
                    visitors_today: 156,
                    visitors_week: 1089,
                    conversion: 12.5,
                    revenue: 45000,
                    active_sensors: 4,
                    total_sensors: 5,
                    peak_hour: '14:30',
                    status: 'active'
                },
                {
                    id: 2,
                    name: 'Магазин №2 Восток',
                    address: 'ул. Гагарина, 12',
                    coordinates: [53.9167, 27.6167],
                    visitors_today: 89,
                    visitors_week: 623,
                    conversion: 8.7,
                    revenue: 28000,
                    active_sensors: 3,
                    total_sensors: 4,
                    peak_hour: '16:45',
                    status: 'active'
                },
                {
                    id: 3,
                    name: 'Магазин №3 Запад',
                    address: 'ул. Мира, 78',
                    coordinates: [53.8833, 27.4833],
                    visitors_today: 134,
                    visitors_week: 938,
                    conversion: 15.2,
                    revenue: 52000,
                    active_sensors: 5,
                    total_sensors: 5,
                    peak_hour: '13:15',
                    status: 'active'
                },
                {
                    id: 4,
                    name: 'Магазин №4 Север',
                    address: 'ул. Победы, 23',
                    coordinates: [53.9333, 27.5333],
                    visitors_today: 67,
                    visitors_week: 469,
                    conversion: 6.8,
                    revenue: 19000,
                    active_sensors: 2,
                    total_sensors: 3,
                    peak_hour: '12:00',
                    status: 'warning'
                }
            ];
            updateMapMarkers();
        });
}

function updateMapMarkers() {
    // Очищаем существующие метки
    clusterer.removeAll();
    
    const period = document.getElementById('period-filter').value;
    const metric = document.getElementById('metric-filter').value;
    
    storesData.forEach(store => {
        const placemark = createStorePlacemark(store, metric, period);
        clusterer.add(placemark);
    });
}

function createStorePlacemark(store, metric, period) {
    const color = getStoreColor(store, metric);
    const size = getStoreSize(store, metric);
    
    let balloonContent = `
        <div style="padding: 15px; min-width: 250px;">
            <h4 style="margin: 0 0 10px 0; color: #1f2937;">${store.name}</h4>
            <p style="margin: 0 0 15px 0; color: #6b7280; font-size: 14px;">${store.address}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
                    <div style="font-size: 18px; font-weight: 600; color: #22c55e;">${store.visitors_today}</div>
                    <div style="font-size: 12px; color: #6b7280;">Посетители сегодня</div>
                </div>
                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px;">
                    <div style="font-size: 18px; font-weight: 600; color: #3b82f6;">${store.conversion}%</div>
                    <div style="font-size: 12px; color: #6b7280;">Конверсия</div>
                </div>
            </div>
            <button onclick="showStoreDetails(${store.id})" style="
                width: 100%; 
                padding: 8px 16px; 
                background: linear-gradient(135deg, #22c55e, #16a34a); 
                color: white; 
                border: none; 
                border-radius: 6px; 
                cursor: pointer;
                font-weight: 600;
            ">Подробнее</button>
        </div>
    `;

    const placemark = new ymaps.Placemark(store.coordinates, {
        balloonContent: balloonContent,
        hintContent: store.name
    }, {
        preset: 'islands#dotIcon',
        iconColor: color,
        iconSize: size
    });

    placemark.events.add('click', function() {
        showStoreDetails(store.id);
    });

    return placemark;
}

function getStoreColor(store, metric) {
    let value;
    switch(metric) {
        case 'visitors':
            value = store.visitors_today;
            if (value > 100) return '#22c55e'; // Зеленый
            if (value > 50) return '#f59e0b';  // Оранжевый
            return '#ef4444'; // Красный
        case 'conversion':
            value = store.conversion;
            if (value > 12) return '#22c55e';
            if (value > 8) return '#f59e0b';
            return '#ef4444';
        case 'revenue':
            value = store.revenue;
            if (value > 40000) return '#22c55e';
            if (value > 25000) return '#f59e0b';
            return '#ef4444';
        default:
            return '#6b7280';
    }
}

function getStoreSize(store, metric) {
    let value;
    switch(metric) {
        case 'visitors':
            value = store.visitors_today;
            if (value > 100) return [16, 16];
            if (value > 50) return [14, 14];
            return [12, 12];
        case 'conversion':
            value = store.conversion;
            if (value > 12) return [16, 16];
            if (value > 8) return [14, 14];
            return [12, 12];
        case 'revenue':
            value = store.revenue;
            if (value > 40000) return [16, 16];
            if (value > 25000) return [14, 14];
            return [12, 12];
        default:
            return [12, 12];
    }
}

function showStoreDetails(storeId) {
    const store = storesData.find(s => s.id === storeId);
    if (!store) return;

    selectedStore = store;
    
    // Заполняем панель информации
    document.getElementById('store-title').textContent = store.name;
    document.getElementById('store-address').textContent = store.address;
    document.getElementById('store-visitors').textContent = store.visitors_today;
    document.getElementById('store-conversion').textContent = store.conversion + '%';
    document.getElementById('store-revenue').textContent = '₽' + store.revenue.toLocaleString();
    document.getElementById('store-sensors').textContent = `${store.active_sensors}/${store.total_sensors}`;
    document.getElementById('store-peak').textContent = store.peak_hour;
    
    // Показываем панель
    document.getElementById('store-info-panel').classList.add('active');
    
    // Центрируем карту на магазине
    yandexMap.setCenter(store.coordinates, 15, {
        duration: 1000
    });
}

function closeStorePanel() {
    document.getElementById('store-info-panel').classList.remove('active');
    selectedStore = null;
}

function viewStoreDetails() {
    if (selectedStore) {
        window.location.href = `/?store=${selectedStore.id}`;
    }
}

function setupMapControls() {
    // Обработчики фильтров
    document.getElementById('period-filter').addEventListener('change', function() {
        loadStoresData();
    });
    
    document.getElementById('metric-filter').addEventListener('change', function() {
        updateMapMarkers();
    });
    
    // Обновление карты
    document.getElementById('refresh-map').addEventListener('click', function() {
        const btn = this;
        const icon = btn.querySelector('i');
        
        icon.style.transform = 'rotate(360deg)';
        loadStoresData();
        
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 1000);
    });
    
    // Тепловая карта
    document.getElementById('toggle-heatmap').addEventListener('click', function() {
        toggleHeatmap();
    });
}

function toggleHeatmap() {
    activeHeatmap = !activeHeatmap;
    const btn = document.getElementById('toggle-heatmap');
    
    if (activeHeatmap) {
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-fire"></i> Отключить тепловую карту';
        createHeatmap();
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<i class="fas fa-fire"></i> Тепловая карта';
        removeHeatmap();
    }
}

function createHeatmap() {
    // Создаем данные для тепловой карты
    const heatmapData = storesData.map(store => [
        store.coordinates[0],
        store.coordinates[1],
        store.visitors_today / 10 // Нормализуем значения
    ]);

    window.heatmap = new ymaps.Heatmap(heatmapData, {
        radius: 50,
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

    yandexMap.geoObjects.add(heatmap);
}

function removeHeatmap() {
    if (window.heatmap) {
        yandexMap.geoObjects.remove(heatmap);
        window.heatmap = null;
    }
}

// Функция для получения текущего местоположения
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const coords = [position.coords.latitude, position.coords.longitude];
            yandexMap.setCenter(coords, 15);
            
            const userPlacemark = new ymaps.Placemark(coords, {
                hintContent: 'Ваше местоположение'
            }, {
                preset: 'islands#blueCircleDotIcon'
            });
            
            yandexMap.geoObjects.add(userPlacemark);
        });
    }
}

// Автообновление данных каждые 5 минут
setInterval(function() {
    if (!document.getElementById('store-info-panel').classList.contains('active')) {
        loadStoresData();
    }
}, 5 * 60 * 1000);
