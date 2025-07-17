document.addEventListener('DOMContentLoaded', function() {
    loadSensors();
    loadStores();
    setupEventListeners();
});

function setupEventListeners() {
    // Форма привязки датчика к магазину
    const assignmentForm = document.getElementById('sensor-assignment-form');
    if (assignmentForm) {
        assignmentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            assignSensorToStore();
        });
    }

    // Поиск датчиков
    const searchInput = document.getElementById('sensor-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterSensors(this.value);
        });
    }

    // Настройка пользовательского меню
    setupUserMenu();
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

function loadSensors() {
    fetch('/api/sensors')
        .then(response => response.json())
        .then(sensors => {
            updateSensorsTable(sensors);
            updateSensorSelect(sensors);
            updateMetrics(sensors);
        })
        .catch(error => {
            console.error('Ошибка загрузки датчиков:', error);
            showError('Ошибка загрузки датчиков');
        });
}

function updateSensorsTable(sensors) {
    const tableBody = document.querySelector('#sensors-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    sensors.forEach(sensor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sensor.id}</td>
            <td>
                <div class="sensor-name">${sensor.name}</div>
            </td>
            <td>${sensor.location}</td>
            <td>
                <span class="status-badge ${sensor.status}">
                    ${getStatusText(sensor.status)}
                </span>
            </td>
            <td>
                <span class="store-info">
                    ${sensor.store_name || 'Не привязан'}
                </span>
            </td>
            <td>${formatDateTime(sensor.last_update)}</td>
            <td>
                <span class="visitors-count">${sensor.visitor_count || 0}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-info" onclick="showSensorInfo(${sensor.id})" title="Подробная информация">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    ${sensor.store_id ? 
                        `<button class="btn btn-sm btn-warning" onclick="unassignSensor(${sensor.id})" title="Отвязать от магазина">
                            <i class="fas fa-unlink"></i>
                        </button>` : ''
                    }
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateSensorSelect(sensors) {
    const sensorSelect = document.getElementById('sensor-select');
    if (!sensorSelect) return;

    // Очищаем и добавляем опцию по умолчанию
    sensorSelect.innerHTML = '<option value="">Выберите датчик...</option>';

    // Добавляем только непривязанные датчики
    sensors.filter(sensor => !sensor.store_id).forEach(sensor => {
        const option = document.createElement('option');
        option.value = sensor.id;
        option.textContent = `${sensor.name} (${sensor.location})`;
        sensorSelect.appendChild(option);
    });
}

function loadStores() {
    fetch('/api/stores')
        .then(response => response.json())
        .then(stores => {
            updateStoreSelect(stores);
        })
        .catch(error => {
            console.error('Ошибка загрузки магазинов:', error);
        });
}

function updateStoreSelect(stores) {
    const storeSelect = document.getElementById('store-select');
    if (!storeSelect) return;

    storeSelect.innerHTML = '<option value="">Выберите магазин...</option>';

    stores.forEach(store => {
        const option = document.createElement('option');
        option.value = store.id;
        option.textContent = `${store.name} - ${store.address}`;
        storeSelect.appendChild(option);
    });
}

function updateMetrics(sensors) {
    const totalSensors = sensors.length;
    const activeSensors = sensors.filter(s => s.status === 'active').length;
    const offlineSensors = sensors.filter(s => s.status === 'inactive').length;
    const assignedSensors = sensors.filter(s => s.store_id).length;

    document.getElementById('total-sensors').textContent = totalSensors;
    document.getElementById('active-sensors').textContent = activeSensors;
    document.getElementById('offline-sensors').textContent = offlineSensors;
    document.getElementById('assigned-sensors').textContent = assignedSensors;
}

function assignSensorToStore() {
    const sensorId = document.getElementById('sensor-select').value;
    const storeId = document.getElementById('store-select').value;

    if (!sensorId || !storeId) {
        alert('Пожалуйста, выберите датчик и магазин');
        return;
    }

    fetch('/api/sensor-assignment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sensor_id: sensorId,
            store_id: storeId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Датчик успешно привязан к магазину!');
            loadSensors(); // Обновляем список датчиков
            clearAssignmentForm();
        } else {
            alert('Ошибка при привязке датчика: ' + (data.error || 'Неизвестная ошибка'));
        }
    })
    .catch(error => {
        console.error('Ошибка при привязке датчика:', error);
        alert('Ошибка при привязке датчика');
    });
}

function unassignSensor(sensorId) {
    if (!confirm('Вы уверены, что хотите отвязать этот датчик от магазина?')) {
        return;
    }

    fetch('/api/sensor-assignment', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            sensor_id: sensorId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Датчик успешно отвязан от магазина!');
            loadSensors(); // Обновляем список датчиков
        } else {
            alert('Ошибка при отвязке датчика: ' + (data.error || 'Неизвестная ошибка'));
        }
    })
    .catch(error => {
        console.error('Ошибка при отвязке датчика:', error);
        alert('Ошибка при отвязке датчика');
    });
}

function showSensorInfo(sensorId) {
    fetch(`/api/sensors/${sensorId}`)
        .then(response => response.json())
        .then(sensor => {
            const modalContent = document.getElementById('sensor-info-content');
            modalContent.innerHTML = `
                <div class="sensor-details">
                    <div class="detail-group">
                        <label>ID датчика:</label>
                        <span>${sensor.id}</span>
                    </div>
                    <div class="detail-group">
                        <label>Название:</label>
                        <span>${sensor.name}</span>
                    </div>
                    <div class="detail-group">
                        <label>Местоположение:</label>
                        <span>${sensor.location}</span>
                    </div>
                    <div class="detail-group">
                        <label>Статус:</label>
                        <span class="status-badge ${sensor.status}">${getStatusText(sensor.status)}</span>
                    </div>
                    <div class="detail-group">
                        <label>Магазин:</label>
                        <span>${sensor.store_name || 'Не привязан'}</span>
                    </div>
                    <div class="detail-group">
                        <label>Посетители:</label>
                        <span>${sensor.visitor_count || 0}</span>
                    </div>
                    <div class="detail-group">
                        <label>Последнее обновление:</label>
                        <span>${formatDateTime(sensor.last_update)}</span>
                    </div>
                    <div class="detail-group">
                        <label>Создан:</label>
                        <span>${formatDateTime(sensor.created_at)}</span>
                    </div>
                </div>
            `;
            document.getElementById('sensor-info-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('Ошибка загрузки информации о датчике:', error);
            alert('Ошибка загрузки информации о датчике');
        });
}

function closeSensorModal() {
    document.getElementById('sensor-info-modal').style.display = 'none';
}

function clearAssignmentForm() {
    document.getElementById('sensor-select').value = '';
    document.getElementById('store-select').value = '';
}

function refreshSensors() {
    const refreshBtn = document.querySelector('.btn[onclick="refreshSensors()"]');
    const icon = refreshBtn.querySelector('i');

    // Анимация вращения
    icon.style.animation = 'spin 1s linear infinite';

    loadSensors();

    setTimeout(() => {
        icon.style.animation = '';
    }, 1000);
}

function filterSensors(searchTerm) {
    const rows = document.querySelectorAll('#sensors-table tbody tr');

    rows.forEach(row => {
        const sensorName = row.cells[1].textContent.toLowerCase();
        const sensorLocation = row.cells[2].textContent.toLowerCase();
        const storeName = row.cells[4].textContent.toLowerCase();

        const matches = sensorName.includes(searchTerm.toLowerCase()) ||
                       sensorLocation.includes(searchTerm.toLowerCase()) ||
                       storeName.includes(searchTerm.toLowerCase());

        row.style.display = matches ? '' : 'none';
    });
}

function getStatusText(status) {
    switch(status) {
        case 'active': return 'Активен';
        case 'inactive': return 'Неактивен';
        case 'maintenance': return 'Обслуживание';
        default: return 'Неизвестно';
    }
}

function formatDateTime(dateString) {
    if (!dateString) return 'Не указано';

    try {
        const date = new Date(dateString);
        return date.toLocaleString('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return 'Неверный формат';
    }
}

function showError(message) {
    alert(message);
}

// Закрытие модального окна при клике вне его
window.addEventListener('click', function(event) {
    const modal = document.getElementById('sensor-info-modal');
    if (event.target === modal) {
        closeSensorModal();
    }
});

// CSS для анимации вращения
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);