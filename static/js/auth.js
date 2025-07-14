
// Функции для работы с аутентификацией

function getToken() {
    return localStorage.getItem('jwt_token');
}

function removeToken() {
    localStorage.removeItem('jwt_token');
}

function isAuthenticated() {
    return !!getToken();
}

function logout() {
    removeToken();
    window.location.href = '/login';
}

// Функция для отправки authenticated запросов
function fetchWithAuth(url, options = {}) {
    const token = getToken();
    
    if (!token) {
        window.location.href = '/login';
        return Promise.reject('No token found');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };
    
    return fetch(url, {
        ...options,
        headers
    }).then(response => {
        if (response.status === 401) {
            removeToken();
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        return response;
    });
}

// Проверка аутентификации при загрузке страницы
function checkAuth() {
    if (!isAuthenticated() && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
    }
}

// Автоматическая проверка при загрузке
document.addEventListener('DOMContentLoaded', checkAuth);
