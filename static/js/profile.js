
document.addEventListener("DOMContentLoaded", function () {
    // Initialize notifications
    initializeNotifications();
    
    // Initialize tabs
    initializeTabs();
    
    // Load users and sensors
    loadUsers();
    loadSensors();
    
    // Initialize form handlers
    initializeFormHandlers();
    
    // Initialize search
    initializeSearch();
    
    // Load stores and managers
    loadStores();
    loadManagers();
    
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
                deleteBtn.style.display = 'inline-block';
            } else {
                clearUserForm();
                deleteBtn.style.display = 'none';
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
        clearBtn.addEventListener('click', clearUserForm);
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
    // Mock data - replace with actual API call
    const users = [
        { id: 1, username: 'admin', email: 'admin@belwest.com', role: 'admin', department: 'IT', phone: '+7 123 456 7890', status: 'active' },
        { id: 2, username: 'john_doe', email: 'john@belwest.com', role: 'user', department: 'Security', phone: '+7 123 456 7891', status: 'active' },
        { id: 3, username: 'jane_smith', email: 'jane@belwest.com', role: 'viewer', department: 'Management', phone: '+7 123 456 7892', status: 'inactive' }
    ];
    
    // Populate user select
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
    
    // Populate users table
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
                <td>${user.department}</td>
                <td><span class="status-badge ${user.status}">${getStatusText(user.status)}</span></td>
                <td>
                    <button class="edit-sensor" onclick="editUser(${user.id})">Редактировать</button>
                    <button class="delete-sensor" onclick="confirmDeleteUser(${user.id})">Удалить</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }
}

function loadSensors() {
    // Mock data - replace with actual API call
    const sensors = [
        { id: 1, name: 'Датчик входа А', location: 'Главный вход' },
        { id: 2, name: 'Датчик входа Б', location: 'Служебный вход' },
        { id: 3, name: 'Датчик зоны 1', location: 'Офисная зона' },
        { id: 4, name: 'Датчик зоны 2', location: 'Складская зона' }
    ];
    
    const sensorsContainer = document.getElementById('sensors-assignment');
    if (sensorsContainer) {
        sensorsContainer.innerHTML = '';
        sensors.forEach(sensor => {
            const checkboxGroup = document.createElement('div');
            checkboxGroup.className = 'checkbox-group';
            checkboxGroup.innerHTML = `
                <input type="checkbox" id="sensor-${sensor.id}" value="${sensor.id}">
                <label for="sensor-${sensor.id}">${sensor.name} - ${sensor.location}</label>
            `;
            sensorsContainer.appendChild(checkboxGroup);
        });
    }
}

function loadUserData(userId) {
    // Mock data - replace with actual API call
    const users = {
        1: { username: 'admin', email: 'admin@belwest.com', role: 'admin', department: 'IT', phone: '+7 123 456 7890', sensors: [1, 2, 3, 4] },
        2: { username: 'john_doe', email: 'john@belwest.com', role: 'user', department: 'Security', phone: '+7 123 456 7891', sensors: [1, 2] },
        3: { username: 'jane_smith', email: 'jane@belwest.com', role: 'viewer', department: 'Management', phone: '+7 123 456 7892', sensors: [3] }
    };
    
    const user = users[userId];
    if (user) {
        document.getElementById('username').value = user.username;
        document.getElementById('email').value = user.email;
        document.getElementById('user-role').value = user.role;
        document.getElementById('department').value = user.department;
        document.getElementById('phone').value = user.phone;
        
        // Clear password fields for security
        document.getElementById('password').value = '';
        document.getElementById('password-confirm').value = '';
        
        // Set assigned sensors
        const sensorCheckboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
        sensorCheckboxes.forEach(checkbox => {
            checkbox.checked = user.sensors.includes(parseInt(checkbox.value));
        });
    }
}

function clearUserForm() {
    document.getElementById('user-management-form').reset();
    document.getElementById('user-select').value = '';
    
    // Uncheck all sensors
    const sensorCheckboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
    sensorCheckboxes.forEach(checkbox => checkbox.checked = false);
}

function saveUser() {
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('password-confirm').value;
    const role = document.getElementById('user-role').value;
    const department = document.getElementById('department').value;
    const phone = document.getElementById('phone').value;
    
    // Validation
    if (!username || !email || !password) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }
    
    if (password !== passwordConfirm) {
        alert('Пароли не совпадают');
        return;
    }
    
    if (password.length < 8) {
        alert('Пароль должен содержать минимум 8 символов');
        return;
    }
    
    // Get assigned sensors
    const assignedSensors = [];
    const sensorCheckboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]:checked');
    sensorCheckboxes.forEach(checkbox => {
        assignedSensors.push(parseInt(checkbox.value));
    });
    
    const userData = {
        username,
        email,
        password,
        role,
        department,
        phone,
        sensors: assignedSensors
    };
    
    // Here you would send the data to your backend
    console.log('Saving user:', userData);
    alert('Пользователь успешно сохранен!');
    
    // Refresh the users list
    loadUsers();
    clearUserForm();
}

function deleteUser() {
    const userId = document.getElementById('user-select').value;
    if (!userId) return;
    
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        // Here you would send delete request to your backend
        console.log('Deleting user:', userId);
        alert('Пользователь удален!');
        
        // Refresh the users list
        loadUsers();
        clearUserForm();
    }
}

function editUser(userId) {
    // Switch to user form tab
    document.querySelector('[data-tab="user-form"]').click();
    
    // Select the user in dropdown
    document.getElementById('user-select').value = userId;
    document.getElementById('user-select').dispatchEvent(new Event('change'));
}

function confirmDeleteUser(userId) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        // Here you would send delete request to your backend
        console.log('Deleting user:', userId);
        alert('Пользователь удален!');
        loadUsers();
    }
}

function getRoleText(role) {
    const roles = {
        'admin': 'Администратор',
        'user': 'Пользователь',
        'viewer': 'Наблюдатель'
    };
    return roles[role] || role;
}

function getStatusText(status) {
    const statuses = {
        'active': 'Активен',
        'inactive': 'Неактивен'
    };
    return statuses[status] || status;
}

function updateNotificationBadge() {
    const unreadCount = document.querySelectorAll('.notification-item.unread').length;
    const badge = document.getElementById('notification-count');
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

    // Load users for selection
    function loadUsers() {
        fetch('/api/users')
            .then(response => response.json())
            .then(users => {
                const userSelect = document.getElementById('user-select');
                userSelect.innerHTML = '<option value="">Создать нового пользователя</option>';
                
                users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = `${user.username} (${user.email})`;
                    userSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка загрузки пользователей:', error);
            });
    }

    // Load sensors for assignment
    function loadSensors() {
        fetch('/api/sensors')
            .then(response => response.json())
            .then(sensors => {
                const sensorsContainer = document.getElementById('sensors-assignment');
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
            })
            .catch(error => {
                console.error('Ошибка загрузки датчиков:', error);
            });
    }

    // Load user data for editing
    function loadUserData(userId) {
        fetch(`/api/users/${userId}`)
            .then(response => response.json())
            .then(user => {
                document.getElementById('new-username').value = user.username;
                document.getElementById('new-email').value = user.email;
                document.getElementById('new-role').value = user.role;
                document.getElementById('new-password').value = '';
                document.getElementById('confirm-new-password').value = '';
                
                // Clear all sensor checkboxes
                const checkboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
                checkboxes.forEach(checkbox => checkbox.checked = false);
                
                // Check assigned sensors
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

    // Clear user form
    function clearUserForm() {
        document.getElementById('new-username').value = '';
        document.getElementById('new-email').value = '';
        document.getElementById('new-role').value = 'admin';
        document.getElementById('new-password').value = '';
        document.getElementById('confirm-new-password').value = '';
        
        const checkboxes = document.querySelectorAll('#sensors-assignment input[type="checkbox"]');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }

    // Save user handler
    document.getElementById('save-user-btn').addEventListener('click', function() {
        const userId = document.getElementById('user-select').value;
        const username = document.getElementById('new-username').value;
        const email = document.getElementById('new-email').value;
        const role = document.getElementById('new-role').value;
        const password = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-new-password').value;
        
        // Validation
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
        
        // Get selected sensors
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
    });

    // Delete user handler
    document.getElementById('delete-user-btn').addEventListener('click', function() {
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
    });

    // Clear form handler
    document.getElementById('clear-form-btn').addEventListener('click', function() {
        clearUserForm();
        document.getElementById('user-select').value = '';
        document.getElementById('delete-user-btn').style.display = 'none';
    });

    // Save profile handler
    document.getElementById('save-profile').addEventListener('click', function() {
        const username = document.getElementById('username').value;
        const email = document.getElementById('email').value;
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        // Validate passwords
        if (newPassword && newPassword !== confirmPassword) {
            alert('Пароли не совпадают!');
            return;
        }
        
        console.log('Saving profile:', {
            username,
            email,
            theme: themeSelect.value,
            language: document.getElementById('language-select').value,
            notifications: document.getElementById('notifications-toggle').checked
        });
        
        alert('Настройки сохранены!');
    });

    // Reset profile handler
    document.getElementById('reset-profile').addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите сбросить настройки?')) {
            document.getElementById('profile-form').reset();
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        }
    });

    // Функции для управления магазинами
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
                    deleteStoreBtn.style.display = 'inline-block';
                } else {
                    clearStoreForm();
                    deleteStoreBtn.style.display = 'none';
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

    // Функции для привязки датчиков
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
            // Убираем выделение с других элементов в той же группе
            const container = this.closest('.sensors-list');
            container.querySelectorAll('.sensor-item').forEach(item => {
                item.classList.remove('selected');
            });
            
            // Выделяем текущий элемент
            this.classList.add('selected');
            
            // Обновляем состояние кнопок
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
        const availableList = document.getElementById('available-sensors-list');
        const assignedList = document.getElementById('assigned-sensors-list');
        
        if (assignedList) assignedList.innerHTML = '';
        loadAllSensors();
        updateAssignmentButtons();
    }

    // Глобальные функции для таблицы магазинов
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
});
