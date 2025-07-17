
class PermissionsManager {
    constructor() {
        this.permissionsMatrix = {};
        this.currentUserId = null;
        this.currentUserPermissions = {};
        this.init();
    }

    init() {
        this.loadPermissionsMatrix();
        this.setupEventListeners();
        this.loadUsersForPermissions();
    }

    setupEventListeners() {
        // Выбор пользователя для настройки прав
        const userSelect = document.getElementById('permissions-user-select');
        if (userSelect) {
            userSelect.addEventListener('change', (e) => {
                this.loadUserPermissions(e.target.value);
            });
        }

        // Сохранение прав доступа
        const saveBtn = document.getElementById('save-permissions-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.savePermissions();
            });
        }

        // Сброс к базовым правам
        const resetBtn = document.getElementById('reset-permissions-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetPermissions();
            });
        }

        // Аудит фильтры
        const auditFilterBtn = document.getElementById('audit-filter-btn');
        if (auditFilterBtn) {
            auditFilterBtn.addEventListener('click', () => {
                this.loadAuditLog();
            });
        }
    }

    async loadPermissionsMatrix() {
        try {
            const response = await fetch('/api/permissions/matrix');
            const data = await response.json();
            
            if (response.ok) {
                this.permissionsMatrix = data;
            } else {
                console.error('Ошибка загрузки матрицы прав:', data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки матрицы прав:', error);
        }
    }

    async loadUsersForPermissions() {
        try {
            const response = await fetch('/api/users');
            const data = await response.json();
            
            if (response.ok) {
                const select = document.getElementById('permissions-user-select');
                if (select) {
                    select.innerHTML = '<option value="">-- Выберите пользователя --</option>';
                    data.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.id;
                        option.textContent = `${user.username} (${this.getRoleText(user.role)})`;
                        select.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
        }
    }

    async loadUserPermissions(userId) {
        if (!userId) {
            document.getElementById('permissions-grid').style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/permissions/user/${userId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.currentUserId = userId;
                this.currentUserPermissions = data;
                this.renderPermissionsGrid();
                document.getElementById('permissions-grid').style.display = 'block';
            } else {
                console.error('Ошибка загрузки прав пользователя:', data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки прав пользователя:', error);
        }
    }

    renderPermissionsGrid() {
        const tbody = document.getElementById('permissions-table-body');
        if (!tbody) return;

        tbody.innerHTML = '';

        const resources = {
            'users': 'Пользователи',
            'sensors': 'Датчики',
            'reports': 'Отчеты',
            'stores': 'Магазины',
            'hierarchy': 'Иерархия',
            'settings': 'Настройки',
            'system': 'Система'
        };

        const actions = {
            'create': 'Создание',
            'read': 'Чтение',
            'update': 'Изменение',
            'delete': 'Удаление'
        };

        const userRole = this.currentUserPermissions.role;
        const basePermissions = this.permissionsMatrix[userRole] || {};
        const customPermissions = this.currentUserPermissions.custom_permissions || [];

        Object.entries(resources).forEach(([resource, resourceName]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${resourceName}</strong></td>
                ${Object.entries(actions).map(([action, actionName]) => {
                    const hasBasePermission = basePermissions[resource] && basePermissions[resource].includes(action);
                    const customPerm = customPermissions.find(p => p.resource === resource && p.action === action);
                    const hasCustomPermission = customPerm ? customPerm.granted : null;
                    
                    let checkboxClass = 'permission-checkbox';
                    let isChecked = hasBasePermission;
                    
                    if (hasCustomPermission === true) {
                        checkboxClass += ' custom-granted';
                        isChecked = true;
                    } else if (hasCustomPermission === false) {
                        checkboxClass += ' custom-denied';
                        isChecked = false;
                    } else if (hasBasePermission) {
                        checkboxClass += ' base-permission';
                    }
                    
                    return `
                        <td>
                            <label class="permission-label">
                                <input type="checkbox" 
                                       class="${checkboxClass}"
                                       data-resource="${resource}"
                                       data-action="${action}"
                                       ${isChecked ? 'checked' : ''}
                                       ${hasBasePermission && hasCustomPermission === null ? 'data-base="true"' : ''}
                                       onchange="permissionsManager.onPermissionChange(this)">
                                <span class="permission-indicator"></span>
                            </label>
                        </td>
                    `;
                }).join('')}
                <td class="special-permissions">
                    ${this.renderSpecialPermissions(resource, basePermissions[resource] || [])}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderSpecialPermissions(resource, permissions) {
        const specialActions = {
            'users': ['manage_hierarchy'],
            'sensors': ['assign'],
            'reports': ['export'],
            'stores': ['assign'],
            'system': ['backup', 'restore', 'logs', 'maintenance']
        };

        const special = specialActions[resource] || [];
        
        return special.map(action => {
            const hasPermission = permissions.includes(action);
            const customPerm = this.currentUserPermissions.custom_permissions?.find(
                p => p.resource === resource && p.action === action
            );
            
            let isChecked = hasPermission;
            let checkboxClass = 'permission-checkbox special';
            
            if (customPerm) {
                isChecked = customPerm.granted;
                checkboxClass += customPerm.granted ? ' custom-granted' : ' custom-denied';
            } else if (hasPermission) {
                checkboxClass += ' base-permission';
            }
            
            return `
                <label class="permission-label special">
                    <input type="checkbox"
                           class="${checkboxClass}"
                           data-resource="${resource}"
                           data-action="${action}"
                           ${isChecked ? 'checked' : ''}
                           onchange="permissionsManager.onPermissionChange(this)">
                    <span class="permission-text">${this.getActionText(action)}</span>
                </label>
            `;
        }).join('');
    }

    onPermissionChange(checkbox) {
        const resource = checkbox.dataset.resource;
        const action = checkbox.dataset.action;
        const granted = checkbox.checked;
        const isBase = checkbox.dataset.base === 'true';
        
        // Если это базовое право и его пытаются отключить
        if (isBase && !granted) {
            checkbox.classList.add('custom-denied');
            checkbox.classList.remove('base-permission');
        } else if (isBase && granted) {
            checkbox.classList.add('base-permission');
            checkbox.classList.remove('custom-denied');
        } else {
            checkbox.classList.toggle('custom-granted', granted);
            checkbox.classList.toggle('custom-denied', !granted);
        }
        
        // Обновляем состояние в памяти
        this.updatePermissionState(resource, action, granted);
    }

    updatePermissionState(resource, action, granted) {
        const userRole = this.currentUserPermissions.role;
        const basePermissions = this.permissionsMatrix[userRole] || {};
        const hasBasePermission = basePermissions[resource] && basePermissions[resource].includes(action);
        
        // Удаляем существующее пользовательское право
        this.currentUserPermissions.custom_permissions = this.currentUserPermissions.custom_permissions.filter(
            p => !(p.resource === resource && p.action === action)
        );
        
        // Добавляем новое пользовательское право только если оно отличается от базового
        if (hasBasePermission !== granted) {
            this.currentUserPermissions.custom_permissions.push({
                resource: resource,
                action: action,
                granted: granted
            });
        }
    }

    async savePermissions() {
        if (!this.currentUserId) return;

        const customPermissions = this.currentUserPermissions.custom_permissions || [];
        
        try {
            const promises = customPermissions.map(perm => {
                return fetch('/api/permissions/custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: this.currentUserId,
                        resource: perm.resource,
                        action: perm.action,
                        granted: perm.granted
                    })
                });
            });

            await Promise.all(promises);
            this.showNotification('Права доступа успешно сохранены', 'success');
            this.loadAuditLog(); // Обновляем аудит
        } catch (error) {
            console.error('Ошибка сохранения прав:', error);
            this.showNotification('Ошибка сохранения прав доступа', 'error');
        }
    }

    async resetPermissions() {
        if (!this.currentUserId) return;

        if (confirm('Вы уверены, что хотите сбросить все пользовательские права к базовым?')) {
            try {
                // Здесь должен быть API endpoint для сброса прав
                await fetch(`/api/permissions/custom/reset/${this.currentUserId}`, {
                    method: 'DELETE'
                });
                
                this.loadUserPermissions(this.currentUserId);
                this.showNotification('Права доступа сброшены к базовым', 'success');
            } catch (error) {
                console.error('Ошибка сброса прав:', error);
                this.showNotification('Ошибка сброса прав доступа', 'error');
            }
        }
    }

    async loadAuditLog() {
        try {
            const response = await fetch('/api/permissions/audit');
            const data = await response.json();
            
            if (response.ok) {
                this.renderAuditLog(data);
            } else {
                console.error('Ошибка загрузки аудита:', data.error);
            }
        } catch (error) {
            console.error('Ошибка загрузки аудита:', error);
        }
    }

    renderAuditLog(auditData) {
        const tbody = document.querySelector('#audit-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        auditData.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(entry.granted_at).toLocaleString('ru-RU')}</td>
                <td>${entry.username}</td>
                <td><span class="role-badge role-${entry.role}">${this.getRoleText(entry.role)}</span></td>
                <td>${entry.granted ? 'Предоставлено' : 'Отозвано'}</td>
                <td>${entry.resource}</td>
                <td>${entry.action}</td>
                <td>${entry.granted_by_name || 'Система'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    getRoleText(role) {
        const roleNames = {
            'admin': 'Администратор',
            'manager': 'Менеджер',
            'rd': 'РД',
            'tu': 'ТУ',
            'store': 'Магазин'
        };
        return roleNames[role] || role;
    }

    getActionText(action) {
        const actionNames = {
            'manage_hierarchy': 'Управление иерархией',
            'assign': 'Назначение',
            'export': 'Экспорт',
            'backup': 'Резервное копирование',
            'restore': 'Восстановление',
            'logs': 'Логи',
            'maintenance': 'Обслуживание'
        };
        return actionNames[action] || action;
    }

    showNotification(message, type = 'info') {
        // Простая система уведомлений
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            notification.style.backgroundColor = '#dc3545';
        } else {
            notification.style.backgroundColor = '#17a2b8';
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    window.permissionsManager = new PermissionsManager();
});
