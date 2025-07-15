
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
