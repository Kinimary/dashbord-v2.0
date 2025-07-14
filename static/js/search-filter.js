
class SearchFilter {
    constructor() {
        this.initializeSearch();
        this.initializeFilters();
    }

    initializeSearch() {
        const searchInput = document.querySelector('.search-bar input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.performSearch(e.target.value);
            });
        }
    }

    initializeFilters() {
        // Role filter
        const roleFilter = document.getElementById('role-filter');
        if (roleFilter) {
            roleFilter.addEventListener('change', (e) => {
                this.filterByRole(e.target.value);
            });
        }

        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterByStatus(e.target.value);
            });
        }
    }

    performSearch(query) {
        const rows = document.querySelectorAll('.user-row, .sensor-row');
        const searchTerm = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            const match = text.includes(searchTerm);
            row.style.display = match ? '' : 'none';
        });

        // Show no results message if needed
        this.showNoResultsMessage(query, rows);
    }

    filterByRole(role) {
        const rows = document.querySelectorAll('.user-row');
        
        rows.forEach(row => {
            const userRole = row.dataset.role;
            const match = role === 'all' || userRole === role;
            row.style.display = match ? '' : 'none';
        });
    }

    filterByStatus(status) {
        const rows = document.querySelectorAll('.sensor-row');
        
        rows.forEach(row => {
            const sensorStatus = row.dataset.status;
            const match = status === 'all' || sensorStatus === status;
            row.style.display = match ? '' : 'none';
        });
    }

    showNoResultsMessage(query, rows) {
        const visibleRows = Array.from(rows).filter(row => row.style.display !== 'none');
        const container = document.querySelector('.table-container');
        
        let noResultsMsg = document.querySelector('.no-results');
        
        if (visibleRows.length === 0 && query.trim() !== '') {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results';
                noResultsMsg.innerHTML = `
                    <div class="no-results-content">
                        <i class="fas fa-search"></i>
                        <h3>Ничего не найдено</h3>
                        <p>Попробуйте изменить условия поиска</p>
                    </div>
                `;
                container.appendChild(noResultsMsg);
            }
        } else if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }
}

// Initialize search and filter
document.addEventListener('DOMContentLoaded', () => {
    new SearchFilter();
});
