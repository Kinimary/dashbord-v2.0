// Глобальные переменные
let currentEditingUser = null;
let currentEditingSensor = null;
let currentEditingStore = null;
let availableSensors = [];
let assignedSensors = [];
let selectedAvailableSensors = [];
let selectedAssignedSensors = [];

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('Загрузка страницы управления пользователями...');

    initializeTabs();
    initializeUserManagement();
    initializeSensorManagement();
    initializeStoreManagement();
    initializeSensorAssignment();
    initializeHierarchyManagement();
    loadUsers();
    loadSensors();
    loadStores();
    setupUserMenu();
});

// Инициализация табов
function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Убираем активный класс у всех табов
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            // Добавляем активный класс к выбранному табу
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Загружаем данные для активного таба
            switch(targetTab) {
                case 'user-list':
                    loadUsers();
                    break;
                case 'store-management':
                    loadStores();
                    break;
                case 'sensor-management':
                    loadSensors();
                    break;
                case 'sensor-assignment':
                    loadUsersForAssignment();
                    break;
                case 'hierarchy-management':
                    loadUsersForHierarchy();
                    break;
            }
        });
    });
}

// Инициализация управления пользователями
function initializeUserManagement() {
    // Селектор пользователей
    const userSelect = document.getElementById('user-select');
    if (userSelect) {
        userSelect.addEventListener('change', function() {
            if (this.value) {
                loadUserForEdit(this.value);
            } else {
                clearUserForm();
            }
        });
    }

    // Кнопки управления пользователем
    const saveBtn = document.getElementById('save-user-btn');
    const deleteBtn = document.getElementById('delete-user-btn');
    const clearBtn = document.getElementById('clear-form-btn');

    if (saveBtn) {
        saveBtn.addEventListener('click', saveUser);
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteUser);
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', clearUserForm);
    }
}

// Инициализация управления датчиками
function initializeSensorManagement() {
    const sensorSelect = document.getElementById('sensor-select');
    if (sensorSelect) {
        sensorSelect.addEventListener('change', function() {
            if (this.value) {
                loadSensorForEdit(this.value);
            } else {
                clearSensorForm();
            }
        });
    }

    const saveSensorBtn = document.getElementById('save-sensor-btn');
    const deleteSensorBtn = document.getElementById('delete-sensor-btn');
    const clearSensorBtn = document.getElementById('clear-sensor-form-btn');

    if (saveSensorBtn) {
        saveSensorBtn.addEventListener('click', saveSensor);
    }

    if (deleteSensorBtn) {
        deleteSensorBtn.addEventListener('click', deleteSensor);
    }

    if (clearSensorBtn) {
        clearSensorBtn.addEventListener('click', clearSensorForm);
    }
}

// Инициализация управления магазинами
function initializeStoreManagement() {
    const storeSelect = document.getElementById('store-select');
    if (storeSelect) {
        storeSelect.addEventListener('change', function() {
            if (this.value) {
                loadStoreForEdit(this.value);
            } else {
                clearStoreForm();
            }
        });
    }

    const saveStoreBtn = document.getElementById('save-store-btn');
    const deleteStoreBtn = document.getElementById('delete-store-btn');
    const clearStoreBtn = document.getElementById('clear-store-form-btn');

    if (saveStoreBtn) {
        saveStoreBtn.addEventListener('click', saveStore);
    }

    if (deleteStoreBtn) {
        deleteStoreBtn.addEventListener('click', deleteStore);
    }

    if (clearStoreBtn) {
        clearStoreBtn.addEventListener('click', clearStoreForm);
    }
}

// Инициализация привязки датчиков
function initializeSensorAssignment() {
    const userSelect = document.getElementById('assignment-user-select');
    if (userSelect) {
        userSelect.addEventListener('change', function() {
            if (this.value) {
                loadSensorsForAssignment(this.value);
            } else {
                clearSensorAssignmentLists();
            }
        });
    }

    const assignBtn = document.getElementById('assign-sensor-btn');
    const unassignBtn = document.getElementById('unassign-sensor-btn');

    if (assignBtn) {
        assignBtn.addEventListener('click', assignSelectedSensors);
    }

    if (unassignBtn) {
        unassignBtn.addEventListener('click', unassignSelectedSensors);
    }
}

// Инициализация управления иерархией
function initializeHierarchyManagement() {
    const parentSelect = document.getElementById('hierarchy-parent-select');
    const childSelect = document.getElementById('hierarchy-child-select');
    const createBtn = document.getElementById('create-hierarchy-btn');

    if (parentSelect) {
        parentSelect.addEventListener('change', function() {
            if (this.value) {
                loadHierarchyCandidates(this.value);
                childSelect.disabled = false;
                updateCreateHierarchyButton();
            } else {
                childSelect.disabled = true;
                childSelect.innerHTML = '<option value="">-- Сначала выберите родительского пользователя --</option>';
                updateCreateHierarchyButton();
            }
        });
    }

    if (childSelect) {
        childSelect.addEventListener('change', updateCreateHierarchyButton);
    }

    if (createBtn) {
        createBtn.addEventListener('click', createHierarchy);
    }

    loadHierarchy();
}

// Загрузка пользователей
function loadUsers() {
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            updateUsersList(users);
            updateUserSelects(users);
        })
        .catch(error => {
            console.error('Ошибка загрузки пользователей:', error);
        });
}

// Загрузка датчиков
function loadSensors() {
    fetch('/api/sensors')
        .then(response => response.json())
        .then(sensors => {
            updateSensorsList(sensors);
            updateSensorSelects(sensors);
        })
        .catch(error => {
            console.error('Ошибка загрузки датчиков:', error);
        });
}

// Загрузка магазинов
function loadStores() {
    fetch('/api/stores')
        .then(response => response.json())
        .then(stores => {
            updateStoresList(stores);
            updateStoreSelects(stores);
        })
        .catch(error => {
            console.error('Ошибка загрузки магазинов:', error);
        });
}

// Обновление списка пользователей в таблице
function updateUsersList(users) {
    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${getRoleName(user.role)}</span></td>
            <td>${user.sensors ? user.sensors.map(s => `<span class="sensor-tag">${s}</span>`).join('') : ''}</td>
            <td>
                <button class="btn-edit" onclick="editUser(${user.id})">Редактировать</button>
                <button class="btn-delete" onclick="deleteUserById(${user.id})">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Обновление селектов пользователей
function updateUserSelects(users) {
    const selects = ['user-select', 'assignment-user-select', 'hierarchy-parent-select'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            const currentValue = select.value;
            select.innerHTML = '<option value="">-- Выберите пользователя --</option>';

            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.username} (${getRoleName(user.role)})`;
                select.appendChild(option);
            });

            if (currentValue) {
                select.value = currentValue;
            }
        }
    });
}

// Обновление списка датчиков
function updateSensorsList(sensors) {
    const tbody = document.querySelector('#sensors-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    sensors.forEach(sensor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sensor.id}</td>
            <td>${sensor.name}</td>
            <td>${sensor.location}</td>
            <td><span class="status-badge status-${sensor.status}">${getStatusName(sensor.status)}</span></td>
            <td>${sensor.last_update || 'Никогда'}</td>
            <td>
                <button class="btn-edit" onclick="editSensor(${sensor.id})">Редактировать</button>
                <button class="btn-delete" onclick="deleteSensorById(${sensor.id})">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Обновление селектов датчиков
function updateSensorSelects(sensors) {
    const select = document.getElementById('sensor-select');
    if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Создать новый --</option>';

        sensors.forEach(sensor => {
            const option = document.createElement('option');
            option.value = sensor.id;
            option.textContent = `${sensor.name} (${sensor.location})`;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }
}

// Обновление списка магазинов
function updateStoresList(stores) {
    const tbody = document.querySelector('#stores-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    stores.forEach(store => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${store.id}</td>
            <td>${store.name}</td>
            <td>${store.address}</td>
            <td>${store.tu_name || 'Не назначен'}</td>
            <td>${store.rd_name || 'Не назначен'}</td>
            <td>
                <button class="btn-edit" onclick="editStore(${store.id})">Редактировать</button>
                <button class="btn-delete" onclick="deleteStoreById(${store.id})">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Обновление селектов магазинов
function updateStoreSelects(stores) {
    const select = document.getElementById('store-select');
    if (select) {
        const currentValue = select.value;
        select.innerHTML = '<option value="">-- Создать новый --</option>';

        stores.forEach(store => {
            const option = document.createElement('option');
            option.value = store.id;
            option.textContent = store.name;
            select.appendChild(option);
        });

        if (currentValue) {
            select.value = currentValue;
        }
    }
}

// Загрузка датчиков для привязки
function loadSensorsForAssignment(userId) {
    fetch(`/api/user-sensors/${userId}`)
        .then(response => response.json())
        .then(data => {
            availableSensors = data.available || [];
            assignedSensors = data.assigned || [];
            updateSensorAssignmentLists();
        })
        .catch(error => {
            console.error('Ошибка загрузки датчиков для назначения:', error);
        });
}

// Обновление списков доступных и назначенных датчиков
function updateSensorAssignmentLists() {
    const availableList = document.getElementById('available-sensors-list');
    const assignedList = document.getElementById('assigned-sensors-list');

    if (availableList) {
        availableList.innerHTML = '';
        availableSensors.forEach(sensor => {
            const item = createSensorAssignmentItem(sensor, 'available');
            availableList.appendChild(item);
        });
    }

    if (assignedList) {
        assignedList.innerHTML = '';
        assignedSensors.forEach(sensor => {
            const item = createSensorAssignmentItem(sensor, 'assigned');
            assignedList.appendChild(item);
        });
    }

    updateAssignmentButtons();
}

// Создание элемента датчика для списка привязки
function createSensorAssignmentItem(sensor, type) {
    const item = document.createElement('div');
    item.className = 'sensor-item';
    item.dataset.sensorId = sensor.id;
    item.dataset.type = type;

    item.innerHTML = `
        <span>${sensor.name}</span>
        <small>${sensor.location}</small>
        <input type="checkbox" class="sensor-checkbox" onchange="updateAssignmentButtons()">
    `;

    item.addEventListener('click', function(e) {
        if (e.target.type !== 'checkbox') {
            const checkbox = this.querySelector('.sensor-checkbox');
            checkbox.checked = !checkbox.checked;
            updateAssignmentButtons();
        }
    });

    return item;
}

// Обновление состояния кнопок привязки
function updateAssignmentButtons() {
    const assignBtn = document.getElementById('assign-sensor-btn');
    const unassignBtn = document.getElementById('unassign-sensor-btn');

    const selectedAvailable = document.querySelectorAll('#available-sensors-list .sensor-checkbox:checked').length;
    const selectedAssigned = document.querySelectorAll('#assigned-sensors-list .sensor-checkbox:checked').length;

    if (assignBtn) {
        assignBtn.disabled = selectedAvailable === 0;
    }

    if (unassignBtn) {
        unassignBtn.disabled = selectedAssigned === 0;
    }
}

// Привязка выбранных датчиков
function assignSelectedSensors() {
    const userId = document.getElementById('assignment-user-select').value;
    const selectedItems = document.querySelectorAll('#available-sensors-list .sensor-checkbox:checked');
    const sensorIds = Array.from(selectedItems).map(item => 
        item.closest('.sensor-item').dataset.sensorId
    );

    if (sensorIds.length === 0) return;

    fetch('/api/assign-sensors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            sensor_ids: sensorIds
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadSensorsForAssignment(userId);
        } else {
            alert('Ошибка при привязке датчиков: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при привязке датчиков');
    });
}

// Отвязка выбранных датчиков
function unassignSelectedSensors() {
    const userId = document.getElementById('assignment-user-select').value;
    const selectedItems = document.querySelectorAll('#assigned-sensors-list .sensor-checkbox:checked');
    const sensorIds = Array.from(selectedItems).map(item => 
        item.closest('.sensor-item').dataset.sensorId
    );

    if (sensorIds.length === 0) return;

    fetch('/api/unassign-sensors', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            user_id: userId,
            sensor_ids: sensorIds
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadSensorsForAssignment(userId);
        } else {
            alert('Ошибка при отвязке датчиков: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при отвязке датчиков');
    });
}

// Очистка списков привязки датчиков
function clearSensorAssignmentLists() {
    const availableList = document.getElementById('available-sensors-list');
    const assignedList = document.getElementById('assigned-sensors-list');

    if (availableList) availableList.innerHTML = '';
    if (assignedList) assignedList.innerHTML = '';

    updateAssignmentButtons();
}

// Загрузка пользователей для назначения
function loadUsersForAssignment() {
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            const select = document.getElementById('assignment-user-select');
            if (select) {
                select.innerHTML = '<option value="">-- Выберите пользователя --</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username} (${getRoleName(user.role)})`;
                    select.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки пользователей для назначения:', error);
        });
}

// Загрузка пользователей для иерархии
function loadUsersForHierarchy() {
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            updateHierarchySelects(users);
        })
        .catch(error => {
            console.error('Ошибка загрузки пользователей для иерархии:', error);
        });
}

// Обновление селектов иерархии
function updateHierarchySelects(users) {
    const parentSelect = document.getElementById('hierarchy-parent-select');

    if (parentSelect) {
        parentSelect.innerHTML = '<option value="">-- Выберите пользователя --</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = `${user.username} (${getRoleName(user.role)})`;
            parentSelect.appendChild(option);
        });
    }
}

// Загрузка кандидатов для иерархии
function loadHierarchyCandidates(parentId) {
    fetch(`/api/hierarchy-candidates/${parentId}`)
        .then(response => response.json())
        .then(candidates => {
            const childSelect = document.getElementById('hierarchy-child-select');
            if (childSelect) {
                childSelect.innerHTML = '<option value="">-- Выберите подчиненного --</option>';
                candidates.forEach(candidate => {
                    const option = document.createElement('option');
                    option.value = candidate.id;
                    option.textContent = `${candidate.username} (${getRoleName(candidate.role)})`;
                    childSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки кандидатов:', error);
        });
}

// Загрузка иерархии
function loadHierarchy() {
    fetch('/api/hierarchy')
        .then(response => response.json())
        .then(hierarchy => {
            updateHierarchyTable(hierarchy);
        })
        .catch(error => {
            console.error('Ошибка загрузки иерархии:', error);
        });
}

// Обновление таблицы иерархии
function updateHierarchyTable(hierarchy) {
    const tbody = document.querySelector('#hierarchy-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    hierarchy.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.parent_username}</td>
            <td><span class="role-badge role-${item.parent_role}">${getRoleName(item.parent_role)}</span></td>
            <td>${item.child_username}</td>
            <td><span class="role-badge role-${item.child_role}">${getRoleName(item.child_role)}</span></td>
            <td>Иерархическая</td>
            <td>
                <button class="btn-delete" onclick="deleteHierarchy(${item.parent_id}, ${item.child_id})">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Обновление кнопки создания иерархии
function updateCreateHierarchyButton() {
    const parentSelect = document.getElementById('hierarchy-parent-select');
    const childSelect = document.getElementById('hierarchy-child-select');
    const createBtn = document.getElementById('create-hierarchy-btn');

    if (createBtn && parentSelect && childSelect) {
        createBtn.disabled = !parentSelect.value || !childSelect.value;
    }
}

// Создание иерархии
function createHierarchy() {
    const parentId = document.getElementById('hierarchy-parent-select').value;
    const childId = document.getElementById('hierarchy-child-select').value;

    if (!parentId || !childId) return;

    fetch('/api/hierarchy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            parent_id: parentId,
            child_id: childId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadHierarchy();
            document.getElementById('hierarchy-parent-select').value = '';
            document.getElementById('hierarchy-child-select').value = '';
            document.getElementById('hierarchy-child-select').disabled = true;
            updateCreateHierarchyButton();
        } else {
            alert('Ошибка при создании иерархии: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при создании иерархии');
    });
}

// Сохранение пользователя
function saveUser() {
    const userData = {
        username: document.getElementById('new-username').value,
        email: document.getElementById('new-email').value,
        password: document.getElementById('new-password').value,
        role: document.getElementById('new-role').value
    };

    if (!userData.username || !userData.email || !userData.password) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    const confirmPassword = document.getElementById('confirm-new-password').value;
    if (userData.password !== confirmPassword) {
        alert('Пароли не совпадают');
        return;
    }

    const url = currentEditingUser ? `/api/users/${currentEditingUser}` : '/api/users';
    const method = currentEditingUser ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadUsers();
            clearUserForm();
            alert(currentEditingUser ? 'Пользователь обновлен' : 'Пользователь создан');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при сохранении пользователя');
    });
}

// Удаление пользователя
function deleteUser() {
    if (!currentEditingUser) return;

    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    fetch(`/api/users/${currentEditingUser}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadUsers();
            clearUserForm();
            alert('Пользователь удален');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении пользователя');
    });
}

// Очистка формы пользователя
function clearUserForm() {
    document.getElementById('user-select').value = '';
    document.getElementById('new-username').value = '';
    document.getElementById('new-email').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    document.getElementById('new-role').value = 'admin';
    document.getElementById('delete-user-btn').style.display = 'none';
    currentEditingUser = null;
}

// Загрузка пользователя для редактирования
function loadUserForEdit(userId) {
    fetch(`/api/users/${userId}`)
        .then(response => response.json())
        .then(user => {
            document.getElementById('new-username').value = user.username;
            document.getElementById('new-email').value = user.email;
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';
            document.getElementById('new-role').value = user.role;
            document.getElementById('delete-user-btn').style.display = 'inline-block';
            currentEditingUser = userId;
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Ошибка при загрузке пользователя');
        });
}

// Сохранение датчика
function saveSensor() {
    const sensorData = {
        name: document.getElementById('sensor-name').value,
        location: document.getElementById('sensor-location').value,
        status: document.getElementById('sensor-status').value
    };

    if (!sensorData.name || !sensorData.location) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    const url = currentEditingSensor ? `/api/sensors/${currentEditingSensor}` : '/api/sensors';
    const method = currentEditingSensor ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sensorData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadSensors();
            clearSensorForm();
            alert(currentEditingSensor ? 'Датчик обновлен' : 'Датчик создан');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при сохранении датчика');
    });
}

// Удаление датчика
function deleteSensor() {
    if (!currentEditingSensor) return;

    if (!confirm('Вы уверены, что хотите удалить этот датчик?')) return;

    fetch(`/api/sensors/${currentEditingSensor}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadSensors();
            clearSensorForm();
            alert('Датчик удален');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении датчика');
    });
}

// Очистка формы датчика
function clearSensorForm() {
    document.getElementById('sensor-select').value = '';
    document.getElementById('sensor-name').value = '';
    document.getElementById('sensor-location').value = '';
    document.getElementById('sensor-status').value = 'active';
    document.getElementById('delete-sensor-btn').style.display = 'none';
    currentEditingSensor = null;
}

// Загрузка датчика для редактирования
function loadSensorForEdit(sensorId) {
    fetch(`/api/sensors/${sensorId}`)
        .then(response => response.json())
        .then(sensor => {
            document.getElementById('sensor-name').value = sensor.name;
            document.getElementById('sensor-location').value = sensor.location;
            document.getElementById('sensor-status').value = sensor.status;
            document.getElementById('delete-sensor-btn').style.display = 'inline-block';
            currentEditingSensor = sensorId;
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Ошибка при загрузке датчика');
        });
}

// Сохранение магазина
function saveStore() {
    const storeData = {
        name: document.getElementById('store-name').value,
        address: document.getElementById('store-address').value,
        tu_id: document.getElementById('store-tu').value || null,
        rd_id: document.getElementById('store-rd').value || null
    };

    if (!storeData.name || !storeData.address) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    const url = currentEditingStore ? `/api/stores/${currentEditingStore}` : '/api/stores';
    const method = currentEditingStore ? 'PUT' : 'POST';

    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(storeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadStores();
            clearStoreForm();
            alert(currentEditingStore ? 'Магазин обновлен' : 'Магазин создан');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при сохранении магазина');
    });
}

// Удаление магазина
function deleteStore() {
    if (!currentEditingStore) return;

    if (!confirm('Вы уверены, что хотите удалить этот магазин?')) return;

    fetch(`/api/stores/${currentEditingStore}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadStores();
            clearStoreForm();
            alert('Магазин удален');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении магазина');
    });
}

// Очистка формы магазина
function clearStoreForm() {
    document.getElementById('store-select').value = '';
    document.getElementById('store-name').value = '';
    document.getElementById('store-address').value = '';
    document.getElementById('store-tu').value = '';
    document.getElementById('store-rd').value = '';
    document.getElementById('delete-store-btn').style.display = 'none';
    currentEditingStore = null;
}

// Загрузка магазина для редактирования
function loadStoreForEdit(storeId) {
    fetch(`/api/stores/${storeId}`)
        .then(response => response.json())
        .then(store => {
            document.getElementById('store-name').value = store.name;
            document.getElementById('store-address').value = store.address;
            document.getElementById('store-tu').value = store.tu_id || '';
            document.getElementById('store-rd').value = store.rd_id || '';
            document.getElementById('delete-store-btn').style.display = 'inline-block';
            currentEditingStore = storeId;
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Ошибка при загрузке магазина');
        });
}

// Вспомогательные функции
function getRoleName(role) {
    const roles = {
        'admin': 'Администратор',
        'manager': 'Менеджер',
        'rd': 'РД',
        'tu': 'ТУ',
        'store': 'Магазин'
    };
    return roles[role] || role;
}

function getStatusName(status) {
    const statuses = {
        'active': 'Активен',
        'inactive': 'Неактивен',
        'maintenance': 'Обслуживание'
    };
    return statuses[status] || status;
}

// Функции для кнопок в таблицах
function editUser(userId) {
    document.getElementById('user-select').value = userId;
    loadUserForEdit(userId);

    // Переключаемся на первый таб
    document.querySelector('.tab[data-tab="user-form"]').click();
}

function deleteUserById(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    fetch(`/api/users/${userId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadUsers();
            alert('Пользователь удален');
        } else {
            alert('Ошибка: ' + data.error);
}
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении пользователя');
    });
}

function editSensor(sensorId) {
    document.getElementById('sensor-select').value = sensorId;
    loadSensorForEdit(sensorId);

    // Переключаемся на таб управления датчиками
    document.querySelector('.tab[data-tab="sensor-management"]').click();
}

function deleteSensorById(sensorId) {
    if (!confirm('Вы уверены, что хотите удалить этот датчик?')) return;

    fetch(`/api/sensors/${sensorId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadSensors();
            alert('Датчик удален');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении датчика');
    });
}

function editStore(storeId) {
    document.getElementById('store-select').value = storeId;
    loadStoreForEdit(storeId);

    // Переключаемся на таб управления магазинами
    document.querySelector('.tab[data-tab="store-management"]').click();
}

function deleteStoreById(storeId) {
    if (!confirm('Вы уверены, что хотите удалить этот магазин?')) return;

    fetch(`/api/stores/${storeId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadStores();
            alert('Магазин удален');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении магазина');
    });
}

function deleteHierarchy(parentId, childId) {
    if (!confirm('Вы уверены, что хотите удалить эту иерархическую связь?')) return;

    fetch('/api/hierarchy', {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            parent_id: parentId,
            child_id: childId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            loadHierarchy();
            alert('Иерархическая связь удалена');
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении иерархической связи');
    });
}

// Настройка пользовательского меню
function setupUserMenu() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('show');
        });

        document.addEventListener('click', function() {
            userDropdown.classList.remove('show');
        });
    }
}

// Функция переключения пользовательского меню
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Функция выхода из системы
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        window.location.href = '/logout';
    }
}