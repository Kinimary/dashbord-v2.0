
document.addEventListener("DOMContentLoaded", function () {
    // Theme toggle functionality
    const themeSelect = document.getElementById("theme-select");
    const themeToggle = document.getElementById("dark-mode-toggle");
    
    // Load saved preferences
    const savedTheme = localStorage.getItem('theme') || 'dark-mode';
    const savedLanguage = localStorage.getItem('language') || 'ru';
    
    document.body.className = savedTheme;
    themeSelect.value = savedTheme;
    document.getElementById('language-select').value = savedLanguage;
    updateThemeIcon(savedTheme);

    // Load users and sensors
    loadUsers();
    loadSensors();

    // Theme selection handler
    themeSelect.addEventListener("change", function () {
        const selectedTheme = this.value;
        document.body.className = selectedTheme;
        localStorage.setItem('theme', selectedTheme);
        updateThemeIcon(selectedTheme);
    });

    // Language selection handler
    document.getElementById('language-select').addEventListener("change", function () {
        localStorage.setItem('language', this.value);
    });

    // Theme toggle button
    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            const currentTheme = document.body.classList.contains('dark-mode') ? 'light-mode' : 'dark-mode';
            document.body.className = currentTheme;
            themeSelect.value = currentTheme;
            localStorage.setItem('theme', currentTheme);
            updateThemeIcon(currentTheme);
        });
    }

    function updateThemeIcon(theme) {
        const icon = document.getElementById("dark-mode-toggle");
        if (icon) {
            if (theme === 'dark-mode') {
                icon.className = 'fas fa-sun';
            } else {
                icon.className = 'fas fa-moon';
            }
        }
    }

    // User selection handler
    document.getElementById('user-select').addEventListener('change', function() {
        const userId = this.value;
        if (userId) {
            loadUserData(userId);
            document.getElementById('delete-user-btn').style.display = 'inline-block';
        } else {
            clearUserForm();
            document.getElementById('delete-user-btn').style.display = 'none';
        }
    });

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
});
