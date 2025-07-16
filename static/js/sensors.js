document.addEventListener("DOMContentLoaded", function () {
    function loadSensors() {
        fetch("/api/sensors")
            .then((response) => response.json())
            .then((sensors) => {
                const tbody = document.getElementById("sensors-table-body");

                if (sensors.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px;">
                                <i class="fas fa-robot" style="font-size: 48px; color: var(--belwest-green); margin-bottom: 16px;"></i>
                                <br>
                                Датчики не найдены
                            </td>
                        </tr>
                    `;
                } else {
                    tbody.innerHTML = sensors.map(sensor => `
                        <tr>
                            <td>${sensor.id}</td>
                            <td>${sensor.name}</td>
                            <td>${sensor.location}</td>
                            <td><span class="status-badge ${sensor.status === 'active' ? 'online' : 'offline'}">${sensor.status === 'active' ? 'Активен' : 'Неактивен'}</span></td>
                            <td>${sensor.last_updated}</td>
                            <td>
                                <button class="edit-sensor" data-id="${sensor.id}">
                                    <i class="fas fa-edit"></i> Редактировать
                                </button>
                                <button class="delete-sensor" data-id="${sensor.id}">
                                    <i class="fas fa-trash"></i> Удалить
                                </button>
                            </td>
                        </tr>
                    `).join('');

                    // Добавляем обработчики для кнопок редактирования и удаления
                    document.querySelectorAll('.edit-sensor').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const sensorId = this.getAttribute('data-id');
                            editSensor(sensorId);
                        });
                    });

                    document.querySelectorAll('.delete-sensor').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const sensorId = this.getAttribute('data-id');
                            deleteSensor(sensorId);
                        });
                    });
                }
            })
            .catch((error) => {
                console.error('Ошибка загрузки датчиков:', error);
                const tbody = document.getElementById("sensors-table-body");
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: var(--error-color);">
                            <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 16px;"></i>
                            <br>
                            Ошибка загрузки данных
                        </td>
                    </tr>
                `;
            });
    }

    function editSensor(sensorId) {
        // Получаем данные датчика
        fetch(`/api/sensors/${sensorId}`)
            .then(response => response.json())
            .then(sensor => {
                // Заполняем форму данными датчика
                document.getElementById('sensor-id').value = sensor.id;
                document.getElementById('sensor-name').value = sensor.name;
                document.getElementById('sensor-location').value = sensor.location;
                document.getElementById('sensor-status').value = sensor.status;

                // Переключаемся на вкладку редактирования
                document.querySelector('.tab[data-tab="add-sensor"]').click();
                document.getElementById('form-title').textContent = 'Редактировать датчик';
            })
            .catch(error => {
                console.error('Ошибка загрузки данных датчика:', error);
                alert('Ошибка загрузки данных датчика');
            });
    }

    function deleteSensor(sensorId) {
        if (confirm('Вы уверены, что хотите удалить этот датчик?')) {
            fetch(`/api/sensors/${sensorId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert('Датчик успешно удален');
                    loadSensors();
                } else {
                    alert('Ошибка при удалении датчика');
                }
            })
            .catch(error => {
                console.error('Ошибка при удалении датчика:', error);
                alert('Ошибка при удалении датчика');
            });
        }
    }

    // Поиск датчиков
    const searchInput = document.getElementById("sensor-search");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll("#sensors-table-body tr");
            rows.forEach((row) => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(filter) ? "" : "none";
            });
        });
    }

    // Обработка отправки формы
    const sensorForm = document.getElementById('sensor-form');
    if (sensorForm) {
        sensorForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = {
                id: document.getElementById('sensor-id').value,
                name: document.getElementById('sensor-name').value,
                location: document.getElementById('sensor-location').value,
                status: document.getElementById('sensor-status').value
            };

            const method = document.getElementById('form-title').textContent === 'Добавить датчик' ? 'POST' : 'PUT';
            const url = method === 'POST' ? '/api/sensors' : `/api/sensors/${formData.id}`;

            fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert('Датчик успешно сохранен');
                    // Очищаем форму
                    sensorForm.reset();
                    document.getElementById('form-title').textContent = 'Добавить датчик';
                    document.getElementById('sensor-id').value = '';
                    
                    // Перезагружаем список датчиков
                    loadSensors();
                } else {
                    alert('Ошибка: ' + (data.error || 'Неизвестная ошибка'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Ошибка при сохранении датчика');
            });
        });
    }
}
                    // Возвращаемся к списку
                    document.querySelector('.tab[data-tab="sensors-list"]').click();
                    // Обновляем список
                    loadSensors();
                } else {
                    alert('Ошибка при сохранении датчика');
                }
            })
            .catch(error => {
                console.error('Ошибка при сохранении датчика:', error);
                alert('Ошибка при сохранении датчика');
            });
        });
    }

    // Загружаем датчики при загрузке страницы
    loadSensors();
});
// Функции для работы с датчиками
let editingSensorId = null;

function editSensor(id) {
    editingSensorId = id;

    // Switch to add sensor tab
    document.querySelector('[data-tab="add-sensor"]').click();

    // Load sensor data (mock data)
    const sensors = {
        1: { name: 'Датчик входа А', location: 'Главный вход', type: 'motion', status: 'active' },
        2: { name: 'Датчик входа Б', location: 'Служебный вход', type: 'proximity', status: 'active' },
        3: { name: 'Датчик зоны 1', location: 'Офисная зона', type: 'motion', status: 'offline' }
    };

    const sensor = sensors[id];
    if (sensor) {
        document.getElementById('sensor-name').value = sensor.name;
        document.getElementById('sensor-location').value = sensor.location;
        document.getElementById('sensor-type').value = sensor.type;
        document.getElementById('sensor-status').value = sensor.status;

        // Change button text
        const saveBtn = document.getElementById('save-sensor');
        if (saveBtn) {
            saveBtn.textContent = 'Обновить датчик';
        }

        // Show cancel button
        showCancelEditButton();
    }
}

function deleteSensor(id) {
    if (confirm('Вы уверены, что хотите удалить этот датчик?')) {
        // Here you would send delete request to backend
        console.log(`Deleting sensor ${id}`);
        alert(`Датчик ${id} удален`);

        // Refresh sensors list
        loadSensorsList();
    }
}

function showCancelEditButton() {
    let cancelBtn = document.getElementById('cancel-edit-sensor');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-sensor';
        cancelBtn.type = 'button';
        cancelBtn.textContent = 'Отменить редактирование';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.style.marginLeft = '10px';
        cancelBtn.onclick = cancelSensorEdit;

        const saveBtn = document.getElementById('save-sensor');
        if (saveBtn && saveBtn.parentNode) {
            saveBtn.parentNode.insertBefore(cancelBtn, saveBtn.nextSibling);
        }
    }
    cancelBtn.style.display = 'inline-block';
}

function cancelSensorEdit() {
    editingSensorId = null;

    // Clear form
    document.getElementById('sensor-form').reset();

    // Reset button text
    const saveBtn = document.getElementById('save-sensor');
    if (saveBtn) {
        saveBtn.textContent = 'Добавить датчик';
    }

    // Hide cancel button
    const cancelBtn = document.getElementById('cancel-edit-sensor');
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
}

function loadSensorsList() {
    // Mock data - replace with actual API call
    const sensors = [
        { id: 1, name: 'Датчик входа А', location: 'Главный вход', type: 'motion', status: 'active' },
        { id: 2, name: 'Датчик входа Б', location: 'Служебный вход', type: 'proximity', status: 'active' },
        { id: 3, name: 'Датчик зоны 1', location: 'Офисная зона', type: 'motion', status: 'offline' }
    ];

    const tableBody = document.querySelector('#sensors-table tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
        sensors.forEach(sensor => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${sensor.id}</td>
                <td>${sensor.name}</td>
                <td>${sensor.location}</td>
                <td>${getSensorTypeText(sensor.type)}</td>
                <td><span class="status-badge ${sensor.status}">${getStatusText(sensor.status)}</span></td>
                <td>
                    <button class="edit-sensor" onclick="editSensor(${sensor.id})">Редактировать</button>
                    <button class="delete-sensor" onclick="deleteSensor(${sensor.id})">Удалить</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
}

function getSensorTypeText(type) {
    const types = {
        'motion': 'Движение',
        'proximity': 'Приближение',
        'door': 'Дверной',
        'temperature': 'Температура'
    };
    return types[type] || type;
}

function getStatusText(status) {
    const statuses = {
        'active': 'Активен',
        'offline': 'Офлайн',
        'maintenance': 'Обслуживание'
    };
    return statuses[status] || status;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Load sensors on page load
    loadSensors();

    // Initialize search
    const searchInput = document.getElementById('sensor-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterSensors(this.value);
        });
    }

    // Form submission
    const sensorForm = document.getElementById('sensor-form');
    if (sensorForm) {
        sensorForm.addEventListener('submit', handleSensorSubmit);
    }

    // Initialize notifications
    initializeNotifications();

    // Initialize user menu
    initializeUserMenu();
});

let editingSensorId = null;

function editSensor(sensorId) {
    editingSensorId = sensorId;

    // Fetch sensor data
    fetch(`/api/sensors/${sensorId}`)
        .then(response => response.json())
        .then(sensor => {
            // Fill form with sensor data
            document.getElementById('sensor-id').value = sensor.id;
            document.getElementById('sensor-name').value = sensor.name;
            document.getElementById('sensor-location').value = sensor.location;
            document.getElementById('sensor-status').value = sensor.status;

            // Update form title
            document.getElementById('form-title').textContent = 'Редактировать датчик';

            // Switch to form tab
            document.querySelector('[data-tab="add-sensor"]').click();

            // Make ID field readonly
            document.getElementById('sensor-id').readOnly = true;
        })
        .catch(error => {
            console.error('Error loading sensor:', error);
            showNotification('Ошибка загрузки данных датчика', 'error');
        });
}

function deleteSensor(sensorId) {
    if (confirm('Вы уверены, что хотите удалить этот датчик?')) {
        fetch(`/api/sensors/${sensorId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            showNotification('Датчик успешно удален', 'success');
            loadSensors();
        })
        .catch(error => {
            console.error('Error deleting sensor:', error);
            showNotification('Ошибка удаления датчика', 'error');
        });
    }
}

function initializeNotifications() {
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const markAllRead = document.querySelector('.mark-all-read');

    if (!notificationsBtn || !notificationDropdown) return;

    notificationsBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = notificationsBtn.classList.contains('active');

        // Close user menu if open
        const userMenu = document.getElementById('user-menu-btn');
        if (userMenu) userMenu.classList.remove('active');

        // Toggle notifications
        if (isActive) {
            notificationsBtn.classList.remove('active');
            notificationDropdown.style.display = 'none';
        } else {
            notificationsBtn.classList.add('active');
            notificationDropdown.style.display = 'block';
        }
    });

    // Mark all as read functionality
    if (markAllRead) {
        markAllRead.addEventListener('click', function() {
            const unreadItems = document.querySelectorAll('.notification-item.unread');
            unreadItems.forEach(item => {
                item.classList.remove('unread');
            });

            const badge = document.getElementById('notification-count');
            if (badge) {
                badge.textContent = '0';
                badge.style.display = 'none';
            }
        });
    }

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!notificationsBtn.contains(e.target)) {
            notificationsBtn.classList.remove('active');
            notificationDropdown.style.display = 'none';
        }
    });
}

function initializeUserMenu() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (!userMenuBtn || !userDropdown) return;

    userMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isActive = userMenuBtn.classList.contains('active');

        // Close notifications if open
        const notificationsBtn = document.getElementById('notifications-btn');
        if (notificationsBtn) {
            notificationsBtn.classList.remove('active');
            document.getElementById('notification-dropdown').style.display = 'none';
        }

        // Toggle user menu
        if (isActive) {
            userMenuBtn.classList.remove('active');
        } else {
            userMenuBtn.classList.add('active');
        }
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!userMenuBtn.contains(e.target)) {
            userMenuBtn.classList.remove('active');
        }
    });
}

function showNotification(message, type) {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: var(--belwest-green);
        color: white;
        border-radius: 8px;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    if (type === 'error') {
        notification.style.background = 'var(--error-color)';
    }

    document.body.appendChild(notification);

    setTimeout(() => notification.style.opacity = '1', 100);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function handleSensorSubmit(e) {
    e.preventDefault();

    const sensorData = {
        id: document.getElementById('sensor-id').value,
        name: document.getElementById('sensor-name').value,
        location: document.getElementById('sensor-location').value,
        status: document.getElementById('sensor-status').value
    };

    const method = editingSensorId ? 'PUT' : 'POST';
    const url = editingSensorId ? `/api/sensors/${editingSensorId}` : '/api/sensors';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensorData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
        } else {
            const message = editingSensorId ? 'Датчик успешно обновлен' : 'Датчик успешно добавлен';
            showNotification(message, 'success');
            resetForm();
            loadSensors();
            // Return to sensors list
            document.querySelector('[data-tab="sensors-list"]').click();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Произошла ошибка при сохранении датчика', 'error');
    });
}

function resetForm() {
    editingSensorId = null;
    document.getElementById('sensor-form').reset();
    document.getElementById('form-title').textContent = 'Добавить датчик';
    document.getElementById('sensor-id').readOnly = false;
}