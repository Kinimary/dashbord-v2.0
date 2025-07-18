// Необязательные функции аутентификации для админ панели

function isAdminLoggedIn() {
    const adminUser = localStorage.getItem("adminUser");
    return adminUser !== null;
}

function getAdminUser() {
    const adminUser = localStorage.getItem("adminUser");
    return adminUser ? JSON.parse(adminUser) : null;
}

function logout() {
    localStorage.removeItem("adminUser");
    alert("Вы вышли из админ панели");
    window.location.href = "/";
}

// Функция для отправки запросов (без обязательной авторизации)
function fetchWithAuth(url, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    return fetch(url, {
        ...options,
        headers,
    });
}

// Показать информацию об админе если залогинен
function showAdminInfo() {
    const adminUser = getAdminUser();
    if (adminUser) {
        const adminInfo = document.createElement("div");
        adminInfo.className = "admin-info";
        adminInfo.innerHTML = `
            <span>Админ: ${adminUser.username}</span>
            <button onclick="logout()">Выйти</button>
        `;
        document.body.prepend(adminInfo);
    }
}

// Инициализация при загрузке страницы
document.addEventListener("DOMContentLoaded", function () {
    // Проверяем авторизацию для всех страниц кроме логина
    if (window.location.pathname !== "/login") {
        checkAuth();
        showAdminInfo();
    }

    // Обработчик формы логина
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

// Проверка авторизации
function checkAuth() {
    fetch('/api/sensor-data?period=day')
        .then(response => {
            if (response.status === 401 || response.redirected) {
                window.location.href = '/login';
            }
        })
        .catch(() => {
            // Если есть ошибка сети, перенаправляем на логин
            window.location.href = '/login';
        });
}

// Обработчик формы логина
function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };

    const errorDiv = document.getElementById('error-message');
    
    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = data.redirect || '/';
        } else {
            errorDiv.textContent = data.error;
            errorDiv.style.display = 'block';
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        errorDiv.textContent = 'Ошибка входа в систему';
        errorDiv.style.display = 'block';
    });
}
