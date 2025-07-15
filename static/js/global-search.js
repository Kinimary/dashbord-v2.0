
document.addEventListener('DOMContentLoaded', function() {
    const globalSearchInput = document.getElementById('global-search');
    
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.toLowerCase().trim();
            
            // Если поиск пустой, показываем все элементы
            if (query === '') {
                resetSearch();
                return;
            }
            
            // Поиск по карточкам статистики
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                if (text.includes(query)) {
                    card.style.display = 'block';
                    card.style.opacity = '1';
                } else {
                    card.style.opacity = '0.3';
                }
            });
            
            // Поиск по таблицам
            const tableRows = document.querySelectorAll('table tbody tr');
            tableRows.forEach(row => {
                const text = row.textContent.toLowerCase();
                if (text.includes(query)) {
                    row.style.display = 'table-row';
                } else {
                    row.style.display = 'none';
                }
            });
            
            // Поиск по элементам меню
            const menuItems = document.querySelectorAll('.menu li');
            menuItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (text.includes(query)) {
                    item.style.opacity = '1';
                } else {
                    item.style.opacity = '0.5';
                }
            });
        });
        
        // Сброс поиска при очистке поля
        globalSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                resetSearch();
            }
        });
    }
    
    function resetSearch() {
        // Сброс карточек
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.display = 'block';
            card.style.opacity = '1';
        });
        
        // Сброс таблиц
        const tableRows = document.querySelectorAll('table tbody tr');
        tableRows.forEach(row => {
            row.style.display = 'table-row';
        });
        
        // Сброс меню
        const menuItems = document.querySelectorAll('.menu li');
        menuItems.forEach(item => {
            item.style.opacity = '1';
        });
    }
});
