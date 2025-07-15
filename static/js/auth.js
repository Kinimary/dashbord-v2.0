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
    // Показать админ информацию если есть
    if (window.location.pathname !== "/login") {
        showAdminInfo();
    }
});
