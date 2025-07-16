Modified profile.js to include sensor management functionality and update tab switching logic.
```

```javascript
document.addEventListener("DOMContentLoaded", function () {
    // Initialize notifications
    initializeNotifications();

    // Initialize tabs
    initializeTabs();

    // Load data
    loadUsers();
    loadSensors();
    loadStores();
    loadManagers();

    // Initialize form handlers
    initializeFormHandlers();

    // Initialize search
    initializeSearch();

    // Initialize store management
    initializeStoreManagement();

    // Initialize sensor assignment
    initializeSensorAssignment();

    function initializeNotifications() {
        const notificationsBtn = document.getElementById('notifications-btn');
        const notificationDropdown = document.getElementById('notification-dropdown');
        const markAllRead = document.getElementById('mark-all-read');

        if (notificationsBtn) {
            notificationsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                notificationDropdown.style.display = notificationDropdown.style.display === 'block' ? 'none' : 'block';
            });
        }

        if (markAllRead) {
            markAllRead.addEventListener('click', function() {
                const unreadItems = document.querySelectorAll('.notification-item.unread');
                unreadItems.forEach(item => item.classList.remove('unread'));
                updateNotificationBadge();
            });
        }

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!notificationsBtn?.contains(e.target)) {
                if (notificationDropdown) {
                    notificationDropdown.style.display = 'none';
                }
            }
        });
    }

    function initializeTabs() {
        const tabs = document.querySelectorAll('.tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');

                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                // Add active class to current tab
                this.classList.add('active');

                // Show corresponding content
                const targetContent = document.getElementById(tabName);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    function initializeFormHandlers() {
        const userSelect = document.getElementById('user-select');
        const saveBtn = document.getElementById('save-user-btn');
        const deleteBtn = document.getElementById('delete-user-btn');
        const clearBtn = document.getElementById('clear-form-btn');

        if (userSelect) {
            userSelect.addEventListener('change', function() {
                const userId = this.value;
                if (userId) {
                    loadUserData(userId);
                    if (deleteBtn) deleteBtn.style.display = 'inline-block';
                } else {
                    clearUserForm();
                    if (deleteBtn) deleteBtn.style.display = 'none';
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', saveUser);
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', deleteUser);
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                clearUserForm();
                document.getElementById('user-select').value = '';
                if (deleteBtn) deleteBtn.style.display = 'none';
            });
        }
    }

    function initializeSearch() {
        const searchInput = document.getElementById('user-search');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const rows = document.querySelectorAll('#users-table tbody tr');

                rows.forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(searchTerm) ? '' : 'none';
                });
            });
        }
    }

    function loadUsers() {
        fetch('/api/users')
            .then(response => response.json())
            .then(users => {
                const userSelect = document.getElementById('user-select');
                if (userSelect) {
                    userSelect.innerHTML = '<option value="">-- Создать нового --</option>';

                    users.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = `${user.username} (${user.email})`;
                        userSelect.appendChild(option);
                    });
                }

                updateUsersTable(users);
            })
            .catch(error => {
                console.error('Ошибка загрузки пользователей:', error);
            });
    }

    function updateUsersTable(users) {
        const tableBody = document.querySelector('#users-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            users.forEach(user => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${getRoleText(user.role)}</td>
                    <td>${user.sensors ? user.sensors.join(', ') : '-'}</td>
                    <td>
                        <button class="edit-sensor" onclick="editUserFromTable(${user.id})">Редактировать</button>
                        <button class="delete-sensor" onclick="confirmDeleteUserFromTable(${user.id})">Удалить</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function loadSensors() {
        fetch('/api/sensors')
            .then(response => response.json())
            .then(sensors => {
                const sensorsContainer = document.getElementById('sensors-assignment');
                if (sensorsContainer) {
                    sensorsContainer.innerHTML = '';

                    sensors.forEach(sensor => {
                        const checkboxDiv = document.createElement('div');
                        checkboxDiv.className = 'checkbox-group';
                        checkboxDiv.innerHTML = `
                            <input type="checkbox" id="sensor-${sensor.id}" value="${sensor.id}">
                            <label for="sensor-${sensor.id}">${sensor.name} (${sensor.location})</label>
                        `;
                        sensorsContainer.appendChild(checkboxDiv);
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки датчиков:', error);
            });
    }

    function loadUserData(userId) {
        fetch(`/api/users/${userId}`)
            .then(response => response.json())
            .then(user => {
                document.getElementById('new-username').value = user.username;
                document.getElementById('new-email').value = user.email;
                document.getElementById('new-role').value = user.role;
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-new-password').value = '';

                const checkboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);

                if (user.sensors) {
                    user.sensors.forEach(sensorId => {
                        const checkbox = document.getElementById(`sensor-${sensorId}`);
                        if (checkbox) {
                            checkbox.checked = true;
                        }
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки данных пользователя:', error);
            });
    }

    function clearUserForm() {
        document.getElementById('new-username').value = '';
        document.getElementById('new-email').value = '';
        document.getElementById('new-role').value = 'admin';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';

        const checkboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }

    function saveUser() {
        const userId = document.getElementById('user-select').value;
        const username = document.getElementById('new-username').value;
        const email = document.getElementById('new-email').value;
        const role = document.getElementById('new-role').value;
        const password = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;

        if (!username || !email || !role) {
            alert('Заполните все обязательные поля!');
            return;
        }

        if (password && password !== confirmPassword) {
            alert('Пароли не совпадают!');
            return;
        }

        if (!userId && !password) {
            alert('Для нового пользователя необходимо указать пароль!');
            return;
        }

        const selectedSensors = [];
        const checkboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            selectedSensors.push(parseInt(checkbox.value));
        });

        const userData = {
            username: username,
            email: email,
            role: role,
            sensor_ids: selectedSensors
        };

        if (password) {
            userData.password = password;
        }

        const url = userId ? `/api/users/${userId}` : '/api/users';
        const method = userId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Ошибка: ' + data.error);
            } else {
                alert(userId ? 'Пользователь обновлен!' : 'Пользователь создан!');
                loadUsers();
                if (!userId) {
                    clearUserForm();
                }
            }
        })
        .catch(error => {
            console.error('Ошибка сохранения пользователя:', error);
            alert('Ошибка сохранения пользователя');
        });
    }

    function deleteUser() {
        const userId = document.getElementById('user-select').value;
        if (!userId) return;

        if (confirm('Вы уверены, что хотите удалить пользователя?')) {
            fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Ошибка: ' + data.error);
                } else {
                    alert('Пользователь удален!');
                    loadUsers();
                    clearUserForm();
                    document.getElementById('user-select').value = '';
                    document.getElementById('delete-user-btn').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Ошибка удаления пользователя:', error);
                alert('Ошибка удаления пользователя');
            });
        }
    }

    function loadStores() {
        fetch('/api/stores')
            .then(response => response.json())
            .then(stores => {
                const storeSelect = document.getElementById('store-select');
                const assignmentStoreSelect = document.getElementById('assignment-store-select');

                if (storeSelect) {
                    storeSelect.innerHTML = '<option value="">-- Создать новый --</option>';
                    stores.forEach(store => {
                        const option = document.createElement('option');
                        option.value = store.id;
                        option.textContent = `${store.name} (${store.address})`;
                        storeSelect.appendChild(option);
                    });
                }

                if (assignmentStoreSelect) {
                    assignmentStoreSelect.innerHTML = '<option value="">-- Выберите магазин --</option>';
                    stores.forEach(store => {
                        const option = document.createElement('option');
                        option.value = store.id;
                        option.textContent = store.name;
                        assignmentStoreSelect.appendChild(option);
                    });
                }

                updateStoresTable(stores);
            })
            .catch(error => {
                console.error('Ошибка загрузки магазинов:', error);
            });
    }

    function loadManagers() {
        fetch('/api/users')
            .then(response => response.json())
            .then(users => {
                const tuSelect = document.getElementById('store-tu');
                const rdSelect = document.getElementById('store-rd');

                if (tuSelect) {
                    tuSelect.innerHTML = '<option value="">-- Не назначен --</option>';
                    users.filter(user => user.role === 'tu').forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.username;
                        tuSelect.appendChild(option);
                    });
                }

                if (rdSelect) {
                    rdSelect.innerHTML = '<option value="">-- Не назначен --</option>';
                    users.filter(user => user.role === 'rd').forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = user.username;
                        rdSelect.appendChild(option);
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки менеджеров:', error);
            });
    }

    function updateStoresTable(stores) {
        const tableBody = document.querySelector('#stores-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            stores.forEach(store => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${store.id}</td>
                    <td>${store.name}</td>
                    <td>${store.address}</td>
                    <td>${store.tu_name || '-'}</td>
                    <td>${store.rd_name || '-'}</td>
                    <td>
                        <button class="edit-sensor" onclick="editStore(${store.id})">Редактировать</button>
                        <button class="delete-sensor" onclick="confirmDeleteStore(${store.id})">Удалить</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function initializeStoreManagement() {
        const storeSelect = document.getElementById('store-select');
        const saveStoreBtn = document.getElementById('save-store-btn');
        const deleteStoreBtn = document.getElementById('delete-store-btn');
        const clearStoreFormBtn = document.getElementById('clear-store-form-btn');

        if (storeSelect) {
            storeSelect.addEventListener('change', function() {
                const storeId = this.value;
                if (storeId) {
                    loadStoreData(storeId);
                    if (deleteStoreBtn) deleteStoreBtn.style.display = 'inline-block';
                } else {
                    clearStoreForm();
                    if (deleteStoreBtn) deleteStoreBtn.style.display = 'none';
                }
            });
        }

        if (saveStoreBtn) {
            saveStoreBtn.addEventListener('click', saveStore);
        }

        if (deleteStoreBtn) {
            deleteStoreBtn.addEventListener('click', deleteStore);
        }

        if (clearStoreFormBtn) {
            clearStoreFormBtn.addEventListener('click', clearStoreForm);
        }
    }

    function loadStoreData(storeId) {
        fetch(`/api/stores`)
            .then(response => response.json())
            .then(stores => {
                const store = stores.find(s => s.id == storeId);
                if (store) {
                    document.getElementById('store-name').value = store.name;
                    document.getElementById('store-address').value = store.address;
                    document.getElementById('store-tu').value = store.tu_id || '';
                    document.getElementById('store-rd').value = store.rd_id || '';
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки данных магазина:', error);
            });
    }

    function clearStoreForm() {
        document.getElementById('store-name').value = '';
        document.getElementById('store-address').value = '';
        document.getElementById('store-tu').value = '';
        document.getElementById('store-rd').value = '';
        document.getElementById('store-select').value = '';
    }

    function saveStore() {
        const storeId = document.getElementById('store-select').value;
        const name = document.getElementById('store-name').value;
        const address = document.getElementById('store-address').value;
        const tuId = document.getElementById('store-tu').value || null;
        const rdId = document.getElementById('store-rd').value || null;

        if (!name || !address) {
            alert('Заполните все обязательные поля!');
            return;
        }

        const storeData = {
            name: name,
            address: address,
            tu_id: tuId,
            rd_id: rdId
        };

        const url = storeId ? `/api/stores/${storeId}` : '/api/stores';
        const method = storeId ? 'PUT' : 'POST';

        fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(storeData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Ошибка: ' + data.error);
            } else {
                alert(storeId ? 'Магазин обновлен!' : 'Магазин создан!');
                loadStores();
                if (!storeId) {
                    clearStoreForm();
                }
            }
        })
        .catch(error => {
            console.error('Ошибка сохранения магазина:', error);
            alert('Ошибка сохранения магазина');
        });
    }

    function deleteStore() {
        const storeId = document.getElementById('store-select').value;
        if (!storeId) return;

        if (confirm('Вы уверены, что хотите удалить магазин?')) {
            fetch(`/api/stores/${storeId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Ошибка: ' + data.error);
                } else {
                    alert('Магазин удален!');
                    loadStores();
                    clearStoreForm();
                    document.getElementById('delete-store-btn').style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Ошибка удаления магазина:', error);
                alert('Ошибка удаления магазина');
            });
        }
    }

    function initializeSensorAssignment() {
        const assignmentStoreSelect = document.getElementById('assignment-store-select');
        const assignBtn = document.getElementById('assign-sensor-btn');
        const unassignBtn = document.getElementById('unassign-sensor-btn');
        const deleteSensorBtn = document.getElementById('delete-sensor-btn');

        if (assignmentStoreSelect) {
            assignmentStoreSelect.addEventListener('change', function() {
                const storeId = this.value;
                if (storeId) {
                    loadSensorAssignment(storeId);
                } else {
                    clearSensorAssignment();
                }
            });
        }

        if (assignBtn) {
            assignBtn.addEventListener('click', assignSelectedSensor);
        }

        if (unassignBtn) {
            unassignBtn.addEventListener('click', unassignSelectedSensor);
        }

        if (deleteSensorBtn) {
            deleteSensorBtn.addEventListener('click', deleteSelectedSensor);
        }

        loadAllSensors();
    }

    function loadAllSensors() {
        fetch('/api/sensors')
            .then(response => response.json())
            .then(sensors => {
                const availableList = document.getElementById('available-sensors-list');
                if (availableList) {
                    availableList.innerHTML = '';
                    sensors.forEach(sensor => {
                        const sensorItem = createSensorItem(sensor, 'available');
                        availableList.appendChild(sensorItem);
                    });
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки датчиков:', error);
            });
    }

    function loadSensorAssignment(storeId) {
        Promise.all([
            fetch('/api/sensors'),
            fetch(`/api/store-sensors/${storeId}`)
        ])
        .then(responses => Promise.all(responses.map(r => r.json())))
        .then(([allSensors, storeSensors]) => {
            const availableList = document.getElementById('available-sensors-list');
            const assignedList = document.getElementById('assigned-sensors-list');

            if (availableList && assignedList) {
                availableList.innerHTML = '';
                assignedList.innerHTML = '';

                const assignedIds = storeSensors.map(s => s.id);

                allSensors.forEach(sensor => {
                    const sensorItem = createSensorItem(sensor, 
                        assignedIds.includes(sensor.id) ? 'assigned' : 'available');

                    if (assignedIds.includes(sensor.id)) {
                        assignedList.appendChild(sensorItem);
                    } else {
                        availableList.appendChild(sensorItem);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки привязок датчиков:', error);
        });
    }

    function createSensorItem(sensor, type) {
        const div = document.createElement('div');
        div.className = 'sensor-item';
        div.dataset.sensorId = sensor.id;
        div.dataset.type = type;

        div.innerHTML = `
            <div class="sensor-item-info">
                <div class="sensor-item-name">${sensor.name || sensor.id}</div>
                <div class="sensor-item-location">${sensor.location || 'Не указано'}</div>
            </div>
            <div class="sensor-status ${sensor.status || 'unknown'}">${sensor.status || 'unknown'}</div>
        `;

        div.addEventListener('click', function() {
            const container = this.closest('.sensors-list');
            container.querySelectorAll('.sensor-item').forEach(item => {
                item.classList.remove('selected');
            });

            this.classList.add('selected');
            updateAssignmentButtons();
        });

        return div;
    }

    function updateAssignmentButtons() {
        const assignBtn = document.getElementById('assign-sensor-btn');
        const unassignBtn = document.getElementById('unassign-sensor-btn');
        const deleteSensorBtn = document.getElementById('delete-sensor-btn');
        const storeId = document.getElementById('assignment-store-select').value;

        const selectedAvailable = document.querySelector('#available-sensors-list .sensor-item.selected');
        const selectedAssigned = document.querySelector('#assigned-sensors-list .sensor-item.selected');
        const anySelected = selectedAvailable || selectedAssigned;

        if (assignBtn) assignBtn.disabled = !selectedAvailable || !storeId;
        if (unassignBtn) unassignBtn.disabled = !selectedAssigned || !storeId;
        if (deleteSensorBtn) deleteSensorBtn.disabled = !anySelected;
    }

    function assignSelectedSensor() {
        const storeId = document.getElementById('assignment-store-select').value;
        const selectedSensor = document.querySelector('#available-sensors-list .sensor-item.selected');

        if (!storeId || !selectedSensor) return;

        const sensorId = selectedSensor.dataset.sensorId;

        fetch(`/api/store-sensors/${storeId}/${sensorId}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Ошибка: ' + data.error);
            } else {
                loadSensorAssignment(storeId);
            }
        })
        .catch(error => {
            console.error('Ошибка привязки датчика:', error);
            alert('Ошибка привязки датчика');
        });
    }

    function unassignSelectedSensor() {
        const storeId = document.getElementById('assignment-store-select').value;
        const selectedSensor = document.querySelector('#assigned-sensors-list .sensor-item.selected');

        if (!storeId || !selectedSensor) return;

        const sensorId = selectedSensor.dataset.sensorId;

        fetch(`/api/store-sensors/${storeId}/${sensorId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Ошибка: ' + data.error);
            } else {
                loadSensorAssignment(storeId);
            }
        })
        .catch(error => {
            console.error('Ошибка отвязки датчика:', error);
            alert('Ошибка отвязки датчика');
        });
    }

    function deleteSelectedSensor() {
        const selectedSensor = document.querySelector('.sensor-item.selected');

        if (!selectedSensor) return;

        const sensorId = selectedSensor.dataset.sensorId;
        const sensorName = selectedSensor.querySelector('.sensor-item-name').textContent;

        if (confirm(`Вы уверены, что хотите удалить датчик "${sensorName}"?`)) {
            fetch(`/api/sensors/${sensorId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Ошибка: ' + data.error);
                } else {
                    alert('Датчик удален!');
                    const storeId = document.getElementById('assignment-store-select').value;
                    if (storeId) {
                        loadSensorAssignment(storeId);
                    } else {
                        loadAllSensors();
                    }
                }
            })
            .catch(error => {
                console.error('Ошибка удаления датчика:', error);
                alert('Ошибка удаления датчика');
            });
        }
    }

    function clearSensorAssignment() {
        const assignedList = document.getElementById('assigned-sensors-list');

        if (assignedList) assignedList.innerHTML = '';
        loadAllSensors();
        updateAssignmentButtons();
    }

    function getRoleText(role) {
        const roles = {
            'admin': 'Администратор',
            'manager': 'Менеджер',
            'rd': 'РД',
            'tu': 'ТУ',
            'store': 'Магазин',
            'user': 'Пользователь',
            'viewer': 'Наблюдатель'
        };
        return roles[role] || role;
    }

    function updateNotificationBadge() {
        const unreadCount = document.querySelectorAll('.notification-item.unread').length;
        const badge = document.getElementById('notification-count');
        if (badge) {
            badge.textContent = unreadCount;
            badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    // Глобальные функции для таблиц
    window.editStore = function(storeId) {
        document.querySelector('[data-tab="store-management"]').click();
        document.getElementById('store-select').value = storeId;
        document.getElementById('store-select').dispatchEvent(new Event('change'));
    };

    window.confirmDeleteStore = function(storeId) {
        if (confirm('Вы уверены, что хотите удалить этот магазин?')) {
            fetch(`/api/stores/${storeId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Ошибка: ' + data.error);
                } else {
                    alert('Магазин удален!');
                    loadStores();
                }
            })
            .catch(error => {
                console.error('Ошибка удаления магазина:', error);
                alert('Ошибка удаления магазина');
            });
        }
    };

    window.editUserFromTable = function(userId) {
        const userFormTab = document.querySelector('[data-tab="user-form"]');
        if (userFormTab) {
            userFormTab.click();

            setTimeout(() => {
                const userSelect = document.getElementById('user-select');
                if (userSelect) {
                    userSelect.value = userId;
                    userSelect.dispatchEvent(new Event('change'));
                }
            }, 100);
        }
    };

    window.confirmDeleteUserFromTable = function(userId) {
        if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
            fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert('Ошибка: ' + data.error);
                } else {
                    alert('Пользователь удален!');
                    loadUsers();
                }
            })
            .catch(error => {
                console.error('Ошибка удаления пользователя:', error);
                alert('Ошибка удаления пользователя');
            });
        }
    };
});
    }

    // Sensor management functions
    function loadSensorsForManagement() {
        fetch('/api/sensors')
            .then(response => response.json())
            .then(sensors => {
                updateSensorsTable(sensors);
                updateSensorSelect(sensors);
            })
            .catch(error => {
                console.error('Ошибка загрузки датчиков:', error);
            });
    }

    function updateSensorsTable(sensors) {
        const tableBody = document.querySelector('#sensors-table tbody');
        if (tableBody) {
            tableBody.innerHTML = '';
            sensors.forEach(sensor => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${sensor.id}</td>
                    <td>${sensor.name}</td>
                    <td>${sensor.location}</td>
                    <td><span class="status-badge ${sensor.status}">${getStatusText(sensor.status)}</span></td>
                    <td>${formatDateTime(sensor.last_update)}</td>
                    <td>
                        <button class="edit-sensor" onclick="editSensor(${sensor.id})">Редактировать</button>
                        <button class="delete-sensor" onclick="deleteSensor(${sensor.id})">Удалить</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
    }

    function updateSensorSelect(sensors) {
        const sensorSelect = document.getElementById('sensor-select');
        if (sensorSelect) {
            sensorSelect.innerHTML = '<option value="">-- Создать новый --</option>';
            sensors.forEach(sensor => {
                const option = document.createElement('option');
                option.value = sensor.id;
                option.textContent = `${sensor.name} (${sensor.location})`;
                sensorSelect.appendChild(option);
            });
        }
    }

    function getStatusText(status) {
        const statusMap = {
            'active': 'Активен',
            'inactive': 'Неактивен',
            'maintenance': 'Обслуживание'
        };
        return statusMap[status] || status;
    }

    function formatDateTime(dateTime) {
        if (!dateTime) return '-';
        const date = new Date(dateTime);
        return date.toLocaleString('ru-RU');
    }

    // Global functions for sensor management
    window.editSensor = function(sensorId) {
        fetch(`/api/sensors/${sensorId}`)
            .then(response => response.json())
            .then(sensor => {
                document.getElementById('sensor-select').value = sensorId;
                document.getElementById('sensor-name').value = sensor.name;
                document.getElementById('sensor-location').value = sensor.location;
                document.getElementById('sensor-status').value = sensor.status;
                document.getElementById('delete-sensor-btn').style.display = 'inline-block';
            })
            .catch(error => {
                console.error('Ошибка загрузки датчика:', error);
            });
    };

    window.deleteSensor = function(sensorId) {
        if (confirm('Вы уверены, что хотите удалить этот датчик?')) {
            fetch(`/api/sensors/${sensorId}`, { method: 'DELETE' })
                .then(response => response.json())
                .then(data => {
                    if (data.message) {
                        alert(data.message);
                        loadSensorsForManagement();
                        clearSensorForm();
                    } else {
                        alert('Ошибка: ' + data.error);
                    }
                })
                .catch(error => {
                    console.error('Ошибка удаления датчика:', error);
                });
        }
    };

    function clearSensorForm() {
        document.getElementById('sensor-select').value = '';
        document.getElementById('sensor-name').value = '';
        document.getElementById('sensor-location').value = '';
        document.getElementById('sensor-status').value = 'active';
        document.getElementById('delete-sensor-btn').style.display = 'none';
    }

    // Event listeners for sensor management
    document.getElementById('save-sensor-btn')?.addEventListener('click', function() {
        const sensorId = document.getElementById('sensor-select').value;
        const sensorData = {
            name: document.getElementById('sensor-name').value,
            location: document.getElementById('sensor-location').value,
            status: document.getElementById('sensor-status').value
        };

        if (!sensorData.name || !sensorData.location) {
            alert('Пожалуйста, заполните все обязательные поля');
            return;
        }

        const method = sensorId ? 'PUT' : 'POST';
        const url = sensorId ? `/api/sensors/${sensorId}` : '/api/sensors';

        fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sensorData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                loadSensorsForManagement();
                clearSensorForm();
            } else {
                alert('Ошибка: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка сохранения датчика:', error);
        });
    });

    document.getElementById('clear-sensor-form-btn')?.addEventListener('click', clearSensorForm);

// Функция выхода
function logout() {
    fetch('/logout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirect;
        }
    })
    .catch(error => {
        console.error('Ошибка при выходе:', error);
    });
}

// Управление иерархическими правами
class HierarchyManager {
    constructor() {
        this.initEventListeners();
        this.loadHierarchy();
        this.loadUsersForHierarchy();
        this.loadUserPermissions();
    }

    initEventListeners() {
        // Обработчик выбора родительского пользователя
        const parentSelect = document.getElementById('hierarchy-parent-select');
        if (parentSelect) {
            parentSelect.addEventListener('change', (e) => {
                this.loadChildCandidates(e.target.value);
            });
        }

        // Обработчик создания иерархической связи
        const createBtn = document.getElementById('create-hierarchy-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.createHierarchy();
            });
        }

        // Обработчик предварительного просмотра доступа
        const previewSelect = document.getElementById('access-preview-user');
        if (previewSelect) {
            previewSelect.addEventListener('change', (e) => {
                this.loadAccessPreview(e.target.value);
            });
        }

        // Обработчик выбора подчиненного пользователя
        const childSelect = document.getElementById('hierarchy-child-select');
        if (childSelect) {
            childSelect.addEventListener('change', () => {
                this.updateCreateButton();
            });
        }
    }

    async loadUsersForHierarchy() {
        try {
            const response = await fetch('/api/users');
            const users = await response.json();

            const parentSelect = document.getElementById('hierarchy-parent-select');
            const previewSelect = document.getElementById('access-preview-user');

            if (parentSelect) {
                parentSelect.innerHTML = '<option value="">-- Выберите пользователя --</option>';
                users.filter(user => ['manager', 'rd', 'tu'].includes(user.role))
                     .forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username} (${this.getRoleDisplayName(user.role)})`;
                    parentSelect.appendChild(option);
                });
            }

            if (previewSelect) {
                previewSelect.innerHTML = '<option value="">-- Выберите пользователя --</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username} (${this.getRoleDisplayName(user.role)})`;
                    previewSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
        }
    }

    async loadChildCandidates(parentId) {
        const childSelect = document.getElementById('hierarchy-child-select');

        if (!parentId) {
            childSelect.innerHTML = '<option value="">-- Сначала выберите родительского пользователя --</option>';
            childSelect.disabled = true;
            this.updateCreateButton();
            return;
        }

        try {
            const response = await fetch(`/api/hierarchy-candidates/${parentId}`);
            const candidates = await response.json();

            childSelect.innerHTML = '<option value="">-- Выберите подчиненного пользователя --</option>';

            candidates.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} (${this.getRoleDisplayName(user.role)})`;
                childSelect.appendChild(option);
            });

            childSelect.disabled = false;
            this.updateCreateButton();
        } catch (error) {
            console.error('Ошибка загрузки кандидатов:', error);
            childSelect.innerHTML = '<option value="">-- Ошибка загрузки --</option>';
            childSelect.disabled = true;
        }
    }

    updateCreateButton() {
        const parentId = document.getElementById('hierarchy-parent-select').value;
        const childId = document.getElementById('hierarchy-child-select').value;
        const createBtn = document.getElementById('create-hierarchy-btn');

        if (createBtn) {
            createBtn.disabled = !parentId || !childId;
        }
    }

    async createHierarchy() {
        const parentId = document.getElementById('hierarchy-parent-select').value;
        const childId = document.getElementById('hierarchy-child-select').value;

        if (!parentId || !childId) {
            this.showMessage('Выберите родительского и подчиненного пользователя', 'error');
            return;
        }

        try {
            const response = await fetch('/api/user-hierarchy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    parent_id: parseInt(parentId),
                    child_id: parseInt(childId)
                })
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Иерархическая связь успешно создана', 'success');
                this.loadHierarchy();
                this.loadChildCandidates(parentId); // Обновляем список кандидатов
                document.getElementById('hierarchy-child-select').value = '';
                this.updateCreateButton();
            } else {
                this.showMessage(result.error || 'Ошибка создания связи', 'error');
            }
        } catch (error) {
            console.error('Ошибка создания иерархии:', error);
            this.showMessage('Ошибка создания иерархической связи', 'error');
        }
    }

    async loadHierarchy() {
        try {
            const response = await fetch('/api/user-hierarchy');
            const hierarchies = await response.json();

            const tableBody = document.querySelector('#hierarchy-table tbody');
            if (!tableBody) return;

            tableBody.innerHTML = '';

            hierarchies.forEach(hierarchy => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${hierarchy.parent_name}</td>
                    <td><span class="role-badge role-${hierarchy.parent_role}">${this.getRoleDisplayName(hierarchy.parent_role)}</span></td>
                    <td>${hierarchy.child_name}</td>
                    <td><span class="role-badge role-${hierarchy.child_role}">${this.getRoleDisplayName(hierarchy.child_role)}</span></td>
                    <td>${hierarchy.hierarchy_type}</td>
                    <td>
                        <button onclick="hierarchyManager.deleteHierarchy(${hierarchy.id})" class="btn-danger">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Ошибка загрузки иерархии:', error);
        }
    }

    async deleteHierarchy(hierarchyId) {
        if (!confirm('Вы уверены, что хотите удалить эту иерархическую связь?')) {
            return;
        }

        try {
            const response = await fetch(`/api/user-hierarchy/${hierarchyId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (response.ok) {
                this.showMessage('Иерархическая связь удалена', 'success');
                this.loadHierarchy();
            } else {
                this.showMessage(result.error || 'Ошибка удаления связи', 'error');
            }
        } catch (error) {
            console.error('Ошибка удаления иерархии:', error);
            this.showMessage('Ошибка удаления иерархической связи', 'error');
        }
    }

    async loadAccessPreview(userId) {
        const previewContent = document.getElementById('access-preview-content');

        if (!userId) {
            previewContent.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`/api/accessible-users/${userId}`);
            const accessibleUsers = await response.json();

            if (accessibleUsers.length === 0) {
                previewContent.innerHTML = '<p style="color: var(--text-secondary);">Этот пользователь не имеет доступа к информации других пользователей</p>';
                return;
            }

            let html = '<div class="access-preview-list">';
            html += '<h5 style="color: var(--belwest-green-light); margin-bottom: 10px;">Пользователи, к которым есть доступ:</h5>';

            accessibleUsers.forEach(user => {
                html += `
                    <div class="access-item" style="display: flex; align-items: center; gap: 10px; padding: 8px; background: var(--glass-bg); border-radius: 6px; margin-bottom: 8px;">
                        <span class="role-badge role-${user.role}">${this.getRoleDisplayName(user.role)}</span>
                        <span style="color: var(--text-primary);">${user.username}</span>
                        <span style="color: var(--text-secondary); font-size: 12px;">(${user.email})</span>
                    </div>
                `;
            });

            html += '</div>';
            previewContent.innerHTML = html;
        } catch (error) {
            console.error('Ошибка загрузки предварительного просмотра:', error);
            previewContent.innerHTML = '<p style="color: var(--danger);">Ошибка загрузки информации о доступе</p>';
        }
    }

    getRoleDisplayName(role) {
        const roleNames = {
            'admin': 'Администратор',
            'manager': 'Менеджер',
            'rd': 'РД',
            'tu': 'ТУ',
            'store': 'Магазин'
        };
        return roleNames[role] || role;
    }

    async loadUserPermissions() {
        try {
            const response = await fetch('/api/user-permissions');
            const data = await response.json();
            
            if (response.ok) {
                this.userPermissions = data.permissions;
                this.currentUserRole = data.role;
                this.updateUIBasedOnPermissions();
            }
        } catch (error) {
            console.error('Ошибка загрузки прав пользователя:', error);
        }
    }

    updateUIBasedOnPermissions() {
        // Скрыть/показать элементы интерфейса в зависимости от прав
        const hierarchyTab = document.querySelector('[data-tab="hierarchy-management"]');
        const userFormTab = document.querySelector('[data-tab="user-form"]');
        const sensorManagementTab = document.querySelector('[data-tab="sensor-management"]');
        
        if (!this.userPermissions.can_manage_hierarchy && hierarchyTab) {
            hierarchyTab.style.display = 'none';
        }
        
        if (!this.userPermissions.can_create_users && userFormTab) {
            userFormTab.style.display = 'none';
        }
        
        if (!this.userPermissions.can_manage_sensors && sensorManagementTab) {
            sensorManagementTab.style.display = 'none';
        }

        // Обновить роли в выпадающих списках
        this.updateRoleSelectors();
    }

    updateRoleSelectors() {
        const roleSelect = document.getElementById('new-role');
        if (roleSelect && this.userPermissions) {
            // Очищаем текущие опции
            roleSelect.innerHTML = '';
            
            // Добавляем только доступные роли
            const roleNames = {
                'admin': 'Администратор',
                'manager': 'Менеджер',
                'rd': 'РД',
                'tu': 'ТУ',
                'store': 'Магазин'
            };

            this.userPermissions.accessible_roles.forEach(role => {
                if (this.currentUserRole !== 'manager' || role !== 'admin') {
                    const option = document.createElement('option');
                    option.value = role;
                    option.textContent = roleNames[role];
                    roleSelect.appendChild(option);
                }
            });
        }
    }

    showMessage(message, type) {
        // Создаем временное уведомление
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            background: ${type === 'success' ? 'var(--belwest-green)' : 'var(--danger)'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Инициализация менеджера иерархии при загрузке страницы
let hierarchyManager;
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, находимся ли мы на странице пользователей
    if (document.getElementById('hierarchy-management')) {
        // Проверяем права доступа перед инициализацией
        fetch('/api/user-permissions')
            .then(response => response.json())
            .then(data => {
                if (data.permissions && data.permissions.can_manage_hierarchy) {
                    hierarchyManager = new HierarchyManager();
                } else {
                    // Скрыть вкладку управления иерархией, если нет прав
                    const hierarchyTab = document.querySelector('[data-tab="hierarchy-management"]');
                    if (hierarchyTab) {
                        hierarchyTab.style.display = 'none';
                    }
                }
            })
            .catch(error => {
                console.error('Ошибка проверки прав:', error);
            });
    }
});