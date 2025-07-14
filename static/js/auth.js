// Функции авторизации удалены - приложение теперь работает без логина

function logout() {
    // Простой редирект на главную страницу
    window.location.href = '/';
}

// Функция для отправки запросов без токенов
function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    return fetch(url, {
        ...options,
        headers
    });
}