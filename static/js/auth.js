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
    // Перенаправляем на logout endpoint для очистки куки
    window.location.href = '/logout';
}

// Функция для отправки authenticated запросов с токеном из localStorage (для совместимости)
function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('jwt_token');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    // Добавляем токен в заголовок если он есть
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers
    }).then(response => {
        if (response.status === 401) {
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }
        return response;
    });
}