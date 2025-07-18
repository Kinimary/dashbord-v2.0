
document.addEventListener("DOMContentLoaded", function () {
    console.log('Reports page initialized');
    
    // Установка значений по умолчанию
    initializeDates();
    
    // Привязка событий
    bindEvents();
    
    function initializeDates() {
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        
        if (startDateInput) {
            startDateInput.value = weekAgo.toISOString().split('T')[0];
        }
        if (endDateInput) {
            endDateInput.value = today.toISOString().split('T')[0];
        }
    }
    
    function bindEvents() {
        const generateBtn = document.getElementById("generate-report");
        const previewBtn = document.getElementById("preview-report");
        const startDateInput = document.getElementById("start-date");
        const endDateInput = document.getElementById("end-date");
        
        if (generateBtn) {
            generateBtn.addEventListener('click', generateReport);
        }
        
        if (previewBtn) {
            previewBtn.addEventListener('click', showPreview);
        }
        
        if (startDateInput) {
            startDateInput.addEventListener('change', validateDates);
        }
        
        if (endDateInput) {
            endDateInput.addEventListener('change', validateDates);
        }
    }
    
    function validateDates() {
        const startDate = document.getElementById("start-date").value;
        const endDate = document.getElementById("end-date").value;
        
        if (startDate && endDate) {
            if (new Date(startDate) > new Date(endDate)) {
                showNotification('Дата начала не может быть больше даты окончания', 'warning');
                return false;
            }
        }
        return true;
    }
    
    function loadPreview() {
        const start = document.getElementById("start-date").value;
        const end = document.getElementById("end-date").value;
        
        if (!start || !end) {
            return;
        }
        
        if (!validateDates()) {
            return;
        }
        
        const previewContent = document.getElementById("report-preview-content");
        if (!previewContent) return;
        
        previewContent.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Загрузка данных...</div>';
        
        fetch(`/api/reports?start=${start}&end=${end}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data && Array.isArray(data) && data.length > 0) {
                    displayPreviewData(data, start, end);
                } else {
                    previewContent.innerHTML = '<div class="no-data-message"><i class="fas fa-info-circle"></i> Нет данных за выбранный период</div>';
                    updatePreviewStats(0, start, end);
                }
            })
            .catch(error => {
                console.error('Error loading preview:', error);
                previewContent.innerHTML = '<div class="error-message"><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки данных</div>';
            });
    }
    
    function displayPreviewData(data, startDate, endDate) {
        const previewContent = document.getElementById("report-preview-content");
        
        let html = `
            <table class="table">
                <thead>
                    <tr>
                        <th>ID Устройства</th>
                        <th>Количество</th>
                        <th>Время</th>
                        <th>Статус</th>
                        <th>Получено</th>
                        <th>Местоположение</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        const maxRows = Math.min(data.length, 10);
        for (let i = 0; i < maxRows; i++) {
            const row = data[i];
            html += `
                <tr>
                    <td>${row.device_id || 'N/A'}</td>
                    <td>${row.count || 0}</td>
                    <td>${formatDateTime(row.timestamp)}</td>
                    <td><span class="status-badge status-${(row.status || 'active').toLowerCase()}">${row.status || 'Активен'}</span></td>
                    <td>${formatDateTime(row.received_at)}</td>
                    <td>${row.location || 'Неизвестно'}</td>
                </tr>
            `;
        }
        
        html += '</tbody></table>';
        
        if (data.length > 10) {
            html += `<div class="preview-note">Показано первых 10 записей из ${data.length}</div>`;
        }
        
        previewContent.innerHTML = html;
        updatePreviewStats(data.length, startDate, endDate);
    }
    
    function updatePreviewStats(recordCount, startDate, endDate) {
        const recordsElement = document.getElementById('preview-records');
        const periodElement = document.getElementById('preview-period');
        const sizeElement = document.getElementById('preview-size');
        
        if (recordsElement) {
            recordsElement.textContent = recordCount.toLocaleString('ru-RU');
        }
        
        if (periodElement) {
            periodElement.textContent = `${formatDate(startDate)} - ${formatDate(endDate)}`;
        }
        
        if (sizeElement) {
            sizeElement.textContent = estimateFileSize(recordCount);
        }
    }
    
    function formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('ru-RU');
        } catch (e) {
            return dateString;
        }
    }
    
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString('ru-RU');
        } catch (e) {
            return dateString;
        }
    }
    
    function estimateFileSize(recordCount) {
        const avgRecordSize = 200; // bytes per record
        const totalSize = recordCount * avgRecordSize;
        
        if (totalSize < 1024) return totalSize + ' B';
        if (totalSize < 1024 * 1024) return Math.round(totalSize / 1024) + ' KB';
        return (totalSize / (1024 * 1024)).toFixed(1) + ' MB';
    }
    
    function showPreview() {
        const previewCard = document.getElementById('preview-card');
        if (previewCard) {
            previewCard.style.display = 'block';
            loadPreview();
        }
    }
    
    function generateReport() {
        const start = document.getElementById("start-date").value;
        const end = document.getElementById("end-date").value;
        const format = document.getElementById("report-format").value;
        
        if (!start || !end) {
            showNotification("Пожалуйста, укажите даты", 'warning');
            return;
        }
        
        if (!validateDates()) {
            return;
        }
        
        const generateBtn = document.getElementById("generate-report");
        const originalText = generateBtn.innerHTML;
        
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Генерация...';
        generateBtn.disabled = true;
        
        fetch("/api/export", {
            method: "POST",
            headers: { 
                "Content-Type": "application/x-www-form-urlencoded" 
            },
            body: `format=${format}&start_date=${start}&end_date=${end}`,
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.filename) {
                showNotification(`Отчет успешно сгенерирован в формате ${format.toUpperCase()}`, 'success');
                
                // Создаем ссылку для скачивания
                const link = document.createElement('a');
                link.href = `/static/${data.filename}`;
                link.download = data.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                // Добавляем в историю
                addToHistory(data.filename, format, start, end);
            } else {
                showNotification("Ошибка при генерации отчета", 'error');
            }
        })
        .catch(error => {
            console.error("Error generating report:", error);
            showNotification("Произошла ошибка при генерации отчета", 'error');
        })
        .finally(() => {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        });
    }
    
    function addToHistory(filename, format, startDate, endDate) {
        const historyContainer = document.querySelector('.reports-history');
        if (!historyContainer) return;
        
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-info">
                <div class="history-name">Отчет ${formatDate(startDate)} - ${formatDate(endDate)}</div>
                <div class="history-date">${new Date().toLocaleString('ru-RU')}</div>
            </div>
            <div class="history-format">${format.toUpperCase()}</div>
            <div class="history-size">-</div>
            <div class="history-actions">
                <button class="btn-download" onclick="downloadFile('${filename}')">
                    <i class="fas fa-download"></i>
                </button>
                <button class="btn-delete" onclick="deleteHistoryItem(this)">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        historyContainer.insertBefore(historyItem, historyContainer.firstChild);
    }
    
    // Глобальные функции для работы с историей
    window.downloadFile = function(filename) {
        const link = document.createElement('a');
        link.href = `/static/${filename}`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    window.deleteHistoryItem = function(button) {
        if (confirm('Удалить этот элемент из истории?')) {
            button.closest('.history-item').remove();
        }
    };
    
    function showNotification(message, type = 'info') {
        // Удаляем существующие уведомления
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        notification.innerHTML = `
            <i class="fas fa-${iconMap[type] || 'info-circle'}"></i>
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое удаление через 5 секунд
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
    
    // Экспортируем функции для использования в HTML
    window.loadPreview = loadPreview;
    window.showNotification = showNotification;
});
