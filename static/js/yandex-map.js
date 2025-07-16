let map;
let stores = [];

function initMap() {
    // Initialize Yandex Map
    ymaps.ready(function() {
        map = new ymaps.Map('map', {
            center: [53.9045, 27.5615], // Minsk coordinates
            zoom: 11,
            controls: ['zoomControl', 'fullscreenControl', 'searchControl']
        });

        // Load stores data
        loadStoresData();
    });
}

function loadStoresData() {
    fetch('/api/map-data')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            stores = data;
            displayStoresOnMap();
            updateStoresList();
        })
        .catch(error => {
            console.error('Error loading stores data:', error);
            // Show error message to user
            const errorDiv = document.getElementById('map-error');
            if (errorDiv) {
                errorDiv.innerHTML = 'Ошибка загрузки данных карты. Попробуйте обновить страницу.';
                errorDiv.style.display = 'block';
            }
        });
}

function displayStoresOnMap() {
    if (!map) return;

    // Clear existing placemarks
    map.geoObjects.removeAll();

    stores.forEach(store => {
        if (!store.latitude || !store.longitude) return;

        // Create placemark for each store
        const placemark = new ymaps.Placemark([store.latitude, store.longitude], {
            balloonContentHeader: `<strong>${store.name}</strong>`,
            balloonContentBody: `
                <div class="store-info">
                    <p><i class="fas fa-map-marker-alt"></i> ${store.address}</p>
                    <p><i class="fas fa-users"></i> Посетители сегодня: <strong>${store.visitors_today}</strong></p>
                    <p><i class="fas fa-chart-line"></i> Конверсия: <strong>${store.conversion}%</strong></p>
                    <p><i class="fas fa-ruble-sign"></i> Выручка: <strong>${store.revenue.toLocaleString()} руб.</strong></p>
                </div>
            `,
            balloonContentFooter: `<small>Обновлено: ${new Date().toLocaleString('ru-RU')}</small>`
        }, {
            preset: 'islands#greenShoppingIcon',
            iconColor: getStoreColor(store.visitors_today),
            iconImageSize: [30, 42],
            iconImageOffset: [-15, -42]
        });

        // Add click event
        placemark.events.add('click', function() {
            showStoreDetails(store);
        });

        map.geoObjects.add(placemark);
    });
}

function getStoreColor(visitorCount) {
    if (visitorCount > 100) return '#27ae60'; // Green for high traffic
    if (visitorCount > 50) return '#f39c12';  // Orange for medium traffic
    return '#e74c3c'; // Red for low traffic
}

function updateStoresList() {
    const storesList = document.getElementById('stores-list');
    if (storesList) {
        storesList.innerHTML = '';
        stores.forEach(store => {
            const storeItem = document.createElement('div');
            storeItem.className = 'store-item';
            storeItem.innerHTML = `
                <div class="store-item-header">
                    <h4>${store.name}</h4>
                    <span class="visitor-count">${store.visitors_today}</span>
                </div>
                <div class="store-item-body">
                    <p><i class="fas fa-map-marker-alt"></i> ${store.address}</p>
                    <div class="store-stats">
                        <span class="stat">
                            <i class="fas fa-chart-line"></i>
                            ${store.conversion}%
                        </span>
                        <span class="stat">
                            <i class="fas fa-ruble-sign"></i>
                            ${store.revenue.toLocaleString()}
                        </span>
                    </div>
                </div>
            `;
            storeItem.addEventListener('click', () => {
                if (store.latitude && store.longitude) {
                    map.setCenter([store.latitude, store.longitude], 15);
                    showStoreDetails(store);
                }
            });
            storesList.appendChild(storeItem);
        });
    }
}

function showStoreDetails(store) {
    const detailsContainer = document.getElementById('store-details');
    if (detailsContainer) {
        detailsContainer.innerHTML = `
            <div class="store-details-header">
                <h3>${store.name}</h3>
                <button class="close-btn" onclick="hideStoreDetails()">×</button>
            </div>
            <div class="store-details-body">
                <p><i class="fas fa-map-marker-alt"></i> <strong>Адрес:</strong> ${store.address}</p>
                <p><i class="fas fa-users"></i> <strong>Посетители сегодня:</strong> ${store.visitors_today}</p>
                <p><i class="fas fa-chart-line"></i> <strong>Конверсия:</strong> ${store.conversion}%</p>
                <p><i class="fas fa-ruble-sign"></i> <strong>Выручка:</strong> ${store.revenue.toLocaleString()} руб.</p>
                <div class="store-actions">
                    <button onclick="viewStoreReports(${store.id})">Отчеты</button>
                    <button onclick="viewStoreSensors(${store.id})">Датчики</button>
                </div>
            </div>
        `;
        detailsContainer.style.display = 'block';
    }
}

function hideStoreDetails() {
    const detailsContainer = document.getElementById('store-details');
    if (detailsContainer) {
        detailsContainer.style.display = 'none';
    }
}

function viewStoreReports(storeId) {
    window.location.href = `/reports?store_id=${storeId}`;
}

function viewStoreSensors(storeId) {
    window.location.href = `/sensors?store_id=${storeId}`;
}

// Auto-refresh map data every 5 minutes
setInterval(loadStoresData, 5 * 60 * 1000);

// Initialize map when page loads
document.addEventListener('DOMContentLoaded', function() {
    if (typeof ymaps !== 'undefined') {
        initMap();
    } else {
        console.error('Yandex Maps API not loaded');
        const errorDiv = document.getElementById('map-error');
        if (errorDiv) {
            errorDiv.innerHTML = 'Ошибка загрузки Yandex Maps API. Проверьте подключение к интернету.';
            errorDiv.style.display = 'block';
        }
    }
});