// Управление пользователями
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeUserManagement();
    initializeSearch();
    loadUsers();
    loadSensors();
    loadHierarchy();

    // Загрузка данных для селектов
    loadUsersForAssignment();
    loadUsersForHierarchy();
});

function initializeTabs() {
    const tabs = document.querySelectorAll('.dashboard-tabs .tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Загружаем данные для активной вкладки
            switch(targetTab) {
                case 'user-list':
                    loadUsers();
                    break;
                case 'sensor-management':
                    loadSensorsForManagement();
                    break;
                case 'sensor-assignment':
                    loadUsersForAssignment();
                    break;
                case 'hierarchy-management':
                    loadHierarchy();
                    break;
            }
        });
    });
}

function initializeUserManagement() {
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

function loadUserData(userId) {
    fetch(`/api/users/${userId}`)
        .then(response => response.json())
        .then(user => {
            document.getElementById('new-username').value = user.username;
            document.getElementById('new-email').value = user.email;
            document.getElementById('new-role').value = user.role;
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-new-password').value = '';

            // Устанавливаем назначенные датчики
            const checkboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = user.sensors.includes(parseInt(checkbox.value));
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки данных пользователя:', error);
        });
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

    const method = userId ? 'PUT' : 'POST';
    const url = userId ? `/api/users/${userId}` : '/api/users';

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            loadUsers();
            clearUserForm();
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка сохранения пользователя:', error);
    });
}

function deleteUser() {
    const userId = document.getElementById('user-select').value;
    if (!userId) return;

    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                loadUsers();
                clearUserForm();
                document.getElementById('user-select').value = '';
                document.getElementById('delete-user-btn').style.display = 'none';
            } else {
                alert('Ошибка: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка удаления пользователя:', error);
        });
    }
}

function clearUserForm() {
    document.getElementById('new-username').value = '';
    document.getElementById('new-email').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-new-password').value = '';
    document.getElementById('new-role').value = 'admin';

    const checkboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
}

function updateUsersTable(users) {
    const tbody = document.querySelector('#users-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td><span class="role-badge role-${user.role}">${getRoleText(user.role)}</span></td>
            <td>
                ${user.sensors ? user.sensors.map(sensor => 
                    `<span class="sensor-tag">${sensor.name}</span>`
                ).join('') : 'Нет'}
            </td>
            <td>
                <button onclick="editUser(${user.id})" class="btn-edit">Редактировать</button>
                <button onclick="confirmDeleteUser(${user.id})" class="btn-delete">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadSensors() {
    fetch('/api/sensors')
        .then(response => response.json())
        .then(sensors => {
            const sensorsContainer = document.getElementById('sensors-assignment');
            if (!sensorsContainer) return;

            sensorsContainer.innerHTML = '';

            sensors.forEach(sensor => {
                const label = document.createElement('label');
                label.className = 'sensor-checkbox';
                label.innerHTML = `
                    <input type="checkbox" value="${sensor.id}">
                    <span>${sensor.name} (${sensor.location})</span>
                `;
                sensorsContainer.appendChild(label);
            });
        })
        .catch(error => {
            console.error('Ошибка загрузки датчиков:', error);
        });
}

// Управление датчиками
function loadSensorsForManagement() {
    fetch('/api/sensors')
        .then(response => response.json())
        .then(sensors => {
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

            updateSensorsTable(sensors);
        })
        .catch(error => {
            console.error('Ошибка загрузки датчиков:', error);
        });
}

function updateSensorsTable(sensors) {
    const tbody = document.querySelector('#sensors-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    sensors.forEach(sensor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sensor.id}</td>
            <td>${sensor.name}</td>
            <td>${sensor.location}</td>
            <td><span class="status-badge status-${sensor.status}">${getStatusText(sensor.status)}</span></td>
            <td>${sensor.last_update ? new Date(sensor.last_update).toLocaleString() : 'Никогда'}</td>
            <td>
                <button onclick="editSensor(${sensor.id})" class="btn-edit">Редактировать</button>
                <button onclick="confirmDeleteSensor(${sensor.id})" class="btn-delete">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Управление иерархией
function loadHierarchy() {
    fetch('/api/user-hierarchy')
        .then(response => response.json())
        .then(hierarchies => {
            updateHierarchyTable(hierarchies);
        })
        .catch(error => {
            console.error('Ошибка загрузки иерархии:', error);
        });
}

function loadUsersForHierarchy() {
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            const parentSelect = document.getElementById('hierarchy-parent-select');
            const childSelect = document.getElementById('hierarchy-child-select');

            if (parentSelect) {
                parentSelect.innerHTML = '<option value="">-- Выберите пользователя --</option>';
                users.forEach(user => {
                    if (user.role !== 'store') { // Только пользователи, которые могут быть родителями
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = `${user.username} (${getRoleText(user.role)})`;
                        parentSelect.appendChild(option);
                    }
                });

                parentSelect.addEventListener('change', function() {
                    const parentId = this.value;
                    if (parentId) {
                        loadHierarchyCandidates(parentId);
                    } else {
                        childSelect.innerHTML = '<option value="">-- Сначала выберите родительского пользователя --</option>';
                        childSelect.disabled = true;
                    }
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки пользователей для иерархии:', error);
        });
}

function loadHierarchyCandidates(parentId) {
    fetch(`/api/hierarchy-candidates/${parentId}`)
        .then(response => response.json())
        .then(candidates => {
            const childSelect = document.getElementById('hierarchy-child-select');
            if (childSelect) {
                childSelect.innerHTML = '<option value="">-- Выберите подчиненного --</option>';
                candidates.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username} (${getRoleText(user.role)})`;
                    childSelect.appendChild(option);
                });
                childSelect.disabled = false;
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки кандидатов:', error);
        });
}

function updateHierarchyTable(hierarchies) {
    const tbody = document.querySelector('#hierarchy-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    hierarchies.forEach(hierarchy => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${hierarchy.parent_name}</td>
            <td><span class="role-badge role-${hierarchy.parent_role}">${getRoleText(hierarchy.parent_role)}</span></td>
            <td>${hierarchy.child_name}</td>
            <td><span class="role-badge role-${hierarchy.child_role}">${getRoleText(hierarchy.child_role)}</span></td>
            <td>${hierarchy.hierarchy_type}</td>
            <td>
                <button onclick="deleteHierarchy(${hierarchy.id})" class="btn-delete">Удалить связь</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadUsersForAssignment() {
    fetch('/api/users')
        .then(response => response.json())
        .then(users => {
            const userSelect = document.getElementById('assignment-user-select');
            if (userSelect) {
                userSelect.innerHTML = '<option value="">-- Выберите пользователя --</option>';
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username} (${getRoleText(user.role)})`;
                    userSelect.appendChild(option);
                });

                userSelect.addEventListener('change', function() {
                    if (this.value) {
                        loadSensorAssignment(this.value);
                    }
                });
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки пользователей для назначения:', error);
        });

    // Инициализация обработчиков для управления датчиками
    initializeSensorManagement();
    
    // Инициализация обработчиков для создания иерархии
    initializeHierarchyManagement();
}

function initializeSensorManagement() {
    const sensorSelect = document.getElementById('sensor-select');
    const saveSensorBtn = document.getElementById('save-sensor-btn');
    const deleteSensorBtn = document.getElementById('delete-sensor-btn');
    const clearSensorBtn = document.getElementById('clear-sensor-form-btn');

    if (sensorSelect) {
        sensorSelect.addEventListener('change', function() {
            const sensorId = this.value;
            if (sensorId) {
                loadSensorData(sensorId);
                if (deleteSensorBtn) deleteSensorBtn.style.display = 'inline-block';
            } else {
                clearSensorForm();
                if (deleteSensorBtn) deleteSensorBtn.style.display = 'none';
            }
        });
    }

    if (saveSensorBtn) {
        saveSensorBtn.addEventListener('click', saveSensor);
    }

    if (deleteSensorBtn) {
        deleteSensorBtn.addEventListener('click', function() {
            const sensorId = document.getElementById('sensor-select').value;
            if (sensorId) {
                confirmDeleteSensor(sensorId);
            }
        });
    }

    if (clearSensorBtn) {
        clearSensorBtn.addEventListener('click', function() {
            clearSensorForm();
            document.getElementById('sensor-select').value = '';
            if (deleteSensorBtn) deleteSensorBtn.style.display = 'none';
        });
    }
}

function initializeHierarchyManagement() {
    const createHierarchyBtn = document.getElementById('create-hierarchy-btn');
    const parentSelect = document.getElementById('hierarchy-parent-select');
    const childSelect = document.getElementById('hierarchy-child-select');

    if (createHierarchyBtn) {
        createHierarchyBtn.addEventListener('click', createHierarchy);
    }

    if (parentSelect && childSelect) {
        function updateCreateButton() {
            const canCreate = parentSelect.value && childSelect.value;
            createHierarchyBtn.disabled = !canCreate;
        }

        parentSelect.addEventListener('change', updateCreateButton);
        childSelect.addEventListener('change', updateCreateButton);
    }
}

function loadSensorData(sensorId) {
    fetch(`/api/sensors/${sensorId}`)
        .then(response => response.json())
        .then(sensor => {
            document.getElementById('sensor-name').value = sensor.name;
            document.getElementById('sensor-location').value = sensor.location;
            document.getElementById('sensor-status').value = sensor.status;
        })
        .catch(error => {
            console.error('Ошибка загрузки данных датчика:', error);
        });
}

function saveSensor() {
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
}

function clearSensorForm() {
    document.getElementById('sensor-name').value = '';
    document.getElementById('sensor-location').value = '';
    document.getElementById('sensor-status').value = 'active';
}

function createHierarchy() {
    const parentId = document.getElementById('hierarchy-parent-select').value;
    const childId = document.getElementById('hierarchy-child-select').value;

    if (!parentId || !childId) {
        alert('Пожалуйста, выберите родительского и подчиненного пользователей');
        return;
    }

    const hierarchyData = {
        parent_id: parseInt(parentId),
        child_id: parseInt(childId)
    };

    fetch('/api/user-hierarchy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hierarchyData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);
            loadHierarchy();
            // Очищаем селекты
            document.getElementById('hierarchy-parent-select').value = '';
            document.getElementById('hierarchy-child-select').value = '';
            document.getElementById('hierarchy-child-select').disabled = true;
            document.getElementById('create-hierarchy-btn').disabled = true;
        } else {
            alert('Ошибка: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка создания иерархии:', error);
    });
}

function loadSensorAssignment(userId) {
    Promise.all([
        fetch('/api/sensors').then(r => r.json()),
        fetch(`/api/users/${userId}`).then(r => r.json())
    ])
    .then(([sensors, user]) => {
        const availableList = document.getElementById('available-sensors-list');
        const assignedList = document.getElementById('assigned-sensors-list');

        if (availableList && assignedList) {
            availableList.innerHTML = '';
            assignedList.innerHTML = '';

            const userSensorIds = user.sensors || [];

            sensors.forEach(sensor => {
                const sensorDiv = document.createElement('div');
                sensorDiv.className = 'sensor-item';
                sensorDiv.dataset.sensorId = sensor.id;
                sensorDiv.innerHTML = `
                    <span>${sensor.name}</span>
                    <small>${sensor.location}</small>
                `;

                if (userSensorIds.includes(sensor.id)) {
                    assignedList.appendChild(sensorDiv);
                } else {
                    availableList.appendChild(sensorDiv);
                }
            });

            // Добавляем обработчики кликов
            document.querySelectorAll('.sensor-item').forEach(item => {
                item.addEventListener('click', function() {
                    this.classList.toggle('selected');
                });
            });
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки назначений датчиков:', error);
    });
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

function getStatusText(status) {
    const statuses = {
        'active': 'Активен',
        'inactive': 'Неактивен',
        'maintenance': 'Обслуживание'
    };
    return statuses[status] || status;
}

// Глобальные функции для таблиц
window.editUser = function(userId) {
    document.querySelector('[data-tab="user-form"]').click();
    document.getElementById('user-select').value = userId;
    document.getElementById('user-select').dispatchEvent(new Event('change'));
};

window.confirmDeleteUser = function(userId) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        fetch(`/api/users/${userId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                loadUsers();
            } else {
                alert('Ошибка: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка удаления пользователя:', error);
        });
    }
};

window.editSensor = function(sensorId) {
    document.querySelector('[data-tab="sensor-management"]').click();
    document.getElementById('sensor-select').value = sensorId;
    document.getElementById('sensor-select').dispatchEvent(new Event('change'));
};

window.confirmDeleteSensor = function(sensorId) {
    if (confirm('Вы уверены, что хотите удалить этот датчик?')) {
        fetch(`/api/sensors/${sensorId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                loadSensorsForManagement();
            } else {
                alert('Ошибка: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка удаления датчика:', error);
        });
    }
};

window.deleteHierarchy = function(hierarchyId) {
    if (confirm('Вы уверены, что хотите удалить эту иерархическую связь?')) {
        fetch(`/api/user-hierarchy/${hierarchyId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.message) {
                alert(data.message);
                loadHierarchy();
            } else {
                alert('Ошибка: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Ошибка удаления иерархии:', error);
        });
    }
};

// Функция переключения меню пользователя
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Закрытие меню при клике вне его
document.addEventListener('click', function(event) {
    const userMenu = document.getElementById('user-menu-btn');
    const dropdown = document.getElementById('user-dropdown');
    
    if (userMenu && dropdown && !userMenu.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

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
        console.error('Ошибка выхода:', error);
    });
}