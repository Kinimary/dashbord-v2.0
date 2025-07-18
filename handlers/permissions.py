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

# Матрица прав доступа по ролям
PERMISSIONS_MATRIX = {
    'admin': {
        'users': ['read', 'create', 'update', 'delete'],
        'sensors': ['read', 'create', 'update', 'delete'],
        'stores': ['read', 'create', 'update', 'delete'],
        'reports': ['read', 'create', 'export'],
        'settings': ['read', 'update'],
        'permissions': ['read', 'update']
    },
    'manager': {
        'users': ['read', 'create', 'update'],
        'sensors': ['read', 'create', 'update'],
        'stores': ['read', 'update'],
        'reports': ['read', 'create', 'export'],
        'settings': ['read']
    },
    'rd': {
        'users': ['read'],
        'sensors': ['read'],
        'stores': ['read'],
        'reports': ['read', 'export']
    },
    'tu': {
        'sensors': ['read'],
        'stores': ['read'],
        'reports': ['read']
    },
    'user': {
        'sensors': ['read'],
        'reports': ['read']
    }
}

@permissions.route('/api/permissions/matrix')
def get_permissions_matrix():
    """Получить матрицу прав доступа"""
    # Временно отключаем проверку для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'
    
    user_role = session.get('role', 'admin')
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

        return jsonify({
            'user_id': user_id,
            'role': user_role,
            'permissions': base_permissions
        })

    except Exception as e:
        return jsonify({'error': 'Ошибка базы данных'}), 500
    finally:
        conn.close()