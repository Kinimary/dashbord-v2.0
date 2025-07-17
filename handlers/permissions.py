
from flask import Blueprint, render_template, jsonify, request, session
import sqlite3
import os
from datetime import datetime

permissions = Blueprint('permissions', __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'visitor_data.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Определение системы прав доступа
PERMISSIONS_MATRIX = {
    'admin': {
        'users': ['create', 'read', 'update', 'delete', 'manage_hierarchy'],
        'sensors': ['create', 'read', 'update', 'delete', 'assign'],
        'reports': ['create', 'read', 'update', 'delete', 'export'],
        'stores': ['create', 'read', 'update', 'delete', 'assign'],
        'hierarchy': ['create', 'read', 'update', 'delete'],
        'settings': ['read', 'update'],
        'system': ['backup', 'restore', 'logs', 'maintenance']
    },
    'manager': {
        'users': ['create', 'read', 'update', 'delete'],
        'sensors': ['create', 'read', 'update', 'delete', 'assign'],
        'reports': ['create', 'read', 'update', 'export'],
        'stores': ['create', 'read', 'update', 'assign'],
        'hierarchy': ['create', 'read', 'update', 'delete'],
        'settings': ['read'],
        'system': ['logs']
    },
    'rd': {
        'users': ['read'],
        'sensors': ['read'],
        'reports': ['read', 'export'],
        'stores': ['read'],
        'hierarchy': ['read'],
        'settings': ['read'],
        'system': []
    },
    'tu': {
        'users': ['read'],
        'sensors': ['read'],
        'reports': ['read', 'export'],
        'stores': ['read'],
        'hierarchy': ['read'],
        'settings': ['read'],
        'system': []
    },
    'store': {
        'users': [],
        'sensors': ['read'],
        'reports': ['read'],
        'stores': ['read'],
        'hierarchy': [],
        'settings': ['read'],
        'system': []
    }
}

@permissions.route('/api/permissions/matrix')
def get_permissions_matrix():
    """Получить матрицу прав доступа"""
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    return jsonify(PERMISSIONS_MATRIX)

@permissions.route('/api/permissions/check')
def check_permission():
    """Проверить конкретное право доступа"""
    user_role = session.get('role')
    resource = request.args.get('resource')
    action = request.args.get('action')
    
    if not user_role or not resource or not action:
        return jsonify({'allowed': False}), 400
    
    user_permissions = PERMISSIONS_MATRIX.get(user_role, {})
    resource_permissions = user_permissions.get(resource, [])
    
    allowed = action in resource_permissions
    return jsonify({'allowed': allowed})

@permissions.route('/api/permissions/custom', methods=['GET'])
def get_custom_permissions():
    """Получить настройки пользовательских прав"""
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT * FROM custom_permissions
            ORDER BY user_id, resource, action
        ''')
        
        permissions = cursor.fetchall()
        return jsonify([dict(row) for row in permissions])
    except Exception as e:
        return jsonify({'error': 'Ошибка базы данных'}), 500
    finally:
        conn.close()

@permissions.route('/api/permissions/custom', methods=['POST'])
def create_custom_permission():
    """Создать пользовательское право доступа"""
    user_role = session.get('role')
    if user_role != 'admin':
        return jsonify({'error': 'Только администратор может создавать пользовательские права'}), 403
    
    data = request.get_json()
    required_fields = ['user_id', 'resource', 'action', 'granted']
    
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Отсутствуют обязательные поля'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT OR REPLACE INTO custom_permissions 
            (user_id, resource, action, granted, granted_by, granted_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            data['user_id'],
            data['resource'],
            data['action'],
            data['granted'],
            session.get('user_id'),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        return jsonify({'message': 'Пользовательское право создано'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Ошибка базы данных'}), 500
    finally:
        conn.close()

@permissions.route('/api/permissions/user/<int:user_id>')
def get_user_permissions(user_id):
    """Получить все права конкретного пользователя"""
    current_user_role = session.get('role')
    current_user_id = session.get('user_id')
    
    # Проверка прав доступа
    if current_user_role not in ['admin', 'manager'] and current_user_id != user_id:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Получаем роль пользователя
        cursor.execute('SELECT role FROM users WHERE id = ?', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'error': 'Пользователь не найден'}), 404
        
        user_role = user['role']
        
        # Базовые права по роли
        base_permissions = PERMISSIONS_MATRIX.get(user_role, {})
        
        # Пользовательские права
        cursor.execute('''
            SELECT resource, action, granted
            FROM custom_permissions
            WHERE user_id = ?
        ''', (user_id,))
        
        custom_permissions = cursor.fetchall()
        
        # Объединяем права
        final_permissions = {}
        for resource, actions in base_permissions.items():
            final_permissions[resource] = list(actions)
        
        # Применяем пользовательские настройки
        for perm in custom_permissions:
            resource = perm['resource']
            action = perm['action']
            granted = perm['granted']
            
            if resource not in final_permissions:
                final_permissions[resource] = []
            
            if granted and action not in final_permissions[resource]:
                final_permissions[resource].append(action)
            elif not granted and action in final_permissions[resource]:
                final_permissions[resource].remove(action)
        
        return jsonify({
            'user_id': user_id,
            'role': user_role,
            'permissions': final_permissions,
            'custom_permissions': [dict(row) for row in custom_permissions]
        })
    
    except Exception as e:
        return jsonify({'error': 'Ошибка базы данных'}), 500
    finally:
        conn.close()

@permissions.route('/api/permissions/hierarchy/<int:user_id>')
def get_hierarchy_permissions(user_id):
    """Получить права доступа к иерархии для пользователя"""
    current_user_role = session.get('role')
    if current_user_role not in ['admin', 'manager', 'rd', 'tu']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Получаем пользователей, к которым у данного пользователя есть доступ
        cursor.execute('''
            SELECT 
                u.id,
                u.username,
                u.role,
                u.email,
                uh.hierarchy_type,
                'direct' as access_type
            FROM users u
            JOIN user_hierarchy uh ON u.id = uh.child_id
            WHERE uh.parent_id = ?
            
            UNION
            
            SELECT 
                u.id,
                u.username,
                u.role,
                u.email,
                'inherited' as hierarchy_type,
                'inherited' as access_type
            FROM users u
            JOIN user_hierarchy uh1 ON u.id = uh1.child_id
            JOIN user_hierarchy uh2 ON uh1.parent_id = uh2.child_id
            WHERE uh2.parent_id = ?
            
            ORDER BY username
        ''', (user_id, user_id))
        
        accessible_users = cursor.fetchall()
        
        # Получаем датчики, к которым есть доступ через иерархию
        cursor.execute('''
            SELECT DISTINCT
                s.id,
                s.name,
                s.location,
                s.status,
                us.user_id as owner_id,
                u.username as owner_name
            FROM sensors s
            JOIN user_sensors us ON s.id = us.sensor_id
            JOIN users u ON us.user_id = u.id
            WHERE us.user_id IN (
                SELECT child_id FROM user_hierarchy WHERE parent_id = ?
            )
        ''', (user_id,))
        
        accessible_sensors = cursor.fetchall()
        
        return jsonify({
            'accessible_users': [dict(row) for row in accessible_users],
            'accessible_sensors': [dict(row) for row in accessible_sensors]
        })
    
    except Exception as e:
        return jsonify({'error': 'Ошибка базы данных'}), 500
    finally:
        conn.close()

@permissions.route('/api/permissions/audit', methods=['GET'])
def get_permissions_audit():
    """Получить аудит прав доступа"""
    user_role = session.get('role')
    if user_role != 'admin':
        return jsonify({'error': 'Только администратор может просматривать аудит'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT 
                cp.id,
                cp.user_id,
                u.username,
                u.role,
                cp.resource,
                cp.action,
                cp.granted,
                cp.granted_by,
                admin.username as granted_by_name,
                cp.granted_at
            FROM custom_permissions cp
            JOIN users u ON cp.user_id = u.id
            LEFT JOIN users admin ON cp.granted_by = admin.id
            ORDER BY cp.granted_at DESC
        ''')
        
        audit_log = cursor.fetchall()
        return jsonify([dict(row) for row in audit_log])
    
    except Exception as e:
        return jsonify({'error': 'Ошибка базы данных'}), 500
    finally:
        conn.close()
