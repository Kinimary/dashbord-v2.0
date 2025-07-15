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
    loadSensorsList();

    // Handle save sensor button
    const saveBtn = document.getElementById('save-sensor');
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            const name = document.getElementById('sensor-name').value;
            const location = document.getElementById('sensor-location').value;
            const type = document.getElementById('sensor-type').value;
            const status = document.getElementById('sensor-status').value;

            if (!name || !location) {
                alert('Пожалуйста, заполните все обязательные поля');
                return;
            }

            const sensorData = { name, location, type, status };

            if (editingSensorId) {
                console.log('Updating sensor:', editingSensorId, sensorData);
                alert('Датчик обновлен!');
                cancelSensorEdit();
            } else {
                console.log('Adding sensor:', sensorData);
                alert('Датчик добавлен!');
                document.getElementById('sensor-form').reset();
            }

            loadSensorsList();
        });
    }
});