from flask import Blueprint, render_template, jsonify, request
import sqlite3
import os
from datetime import datetime
import hashlib

users = Blueprint('users', __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'visitor_data.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    return conn

def hash_password(password):
    """Хеширование пароля с использованием SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

@users.route('/api/users', methods=['GET'])
def get_users():
    from flask import session
    
    # Check if user has permission to view users
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Admin can see all users, manager can see non-admin users
    if user_role == 'admin':
        cursor.execute('''
            SELECT id, username, email, role, created_at 
            FROM users
        ''')
    else:  # manager
        cursor.execute('''
            SELECT id, username, email, role, created_at 
            FROM users
            WHERE role != 'admin'
        ''')
    
    users = []
    for row in cursor.fetchall():
        users.append({
            'id': row[0],
            'username': row[1],
            'email': row[2],
            'role': row[3],
            'created_at': row[4]
        })
    
    conn.close()
    return jsonify(users)

@users.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, email, role, created_at 
        FROM users 
        WHERE id = ?
    ''', (user_id,))
    
    user = cursor.fetchone()
    
    if user:
        user_data = {
            'id': user[0],
            'username': user[1],
            'email': user[2],
            'role': user[3],
            'created_at': user[4],
            'sensors': []
        }
        
        cursor.execute('''
            SELECT sensor_id FROM user_sensors WHERE user_id = ?
        ''', (user_id,))
        
        sensors = [row[0] for row in cursor.fetchall()]
        user_data['sensors'] = sensors
        
        conn.close()
        return jsonify(user_data)
    else:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

@users.route('/api/users', methods=['POST'])
def create_user():
    from flask import session
    
    # Check permissions
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    required_fields = ['username', 'email', 'role']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    username = data['username']
    email = data['email']
    role = data['role']
    password = data.get('password', '')
    
    # Password is required for new users
    if not password or password.strip() == '':
        return jsonify({'error': 'Password is required for new users'}), 400
    
    # Role restrictions
    if user_role == 'manager' and role == 'admin':
        return jsonify({'error': 'Менеджер не может создавать администраторов'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверка на существование пользователя
        cursor.execute('SELECT id FROM users WHERE username = ? OR email = ?', (username, email))
        if cursor.fetchone():
            return jsonify({'error': 'User with this username or email already exists'}), 400
        
        # Хеширование пароля
        hashed_password = hash_password(password)
        
        cursor.execute('''
            INSERT INTO users (username, email, role, password, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (username, email, role, hashed_password, datetime.now().isoformat()))
        
        user_id = cursor.lastrowid
        
        if 'sensor_ids' in data:
            sensor_ids = data['sensor_ids']
            for sensor_id in sensor_ids:
                cursor.execute('''
                    INSERT INTO user_sensors (user_id, sensor_id)
                    VALUES (?, ?)
                ''', (user_id, sensor_id))
        
        conn.commit()
        return jsonify({'message': 'User created', 'id': user_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    from flask import session
    
    # Check permissions
    user_role = session.get('role')
    current_user_id = session.get('user_id')
    
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверка существования пользователя и его роли
        cursor.execute('SELECT id, role FROM users WHERE id = ?', (user_id,))
        target_user = cursor.fetchone()
        if not target_user:
            return jsonify({'error': 'User not found'}), 404
        
        target_user_role = target_user[1]
        
        # Prevent self-modification of critical fields for non-admins
        if user_role == 'manager':
            if target_user_role == 'admin':
                return jsonify({'error': 'Менеджер не может изменять администраторов'}), 403
            if 'role' in data and data['role'] == 'admin':
                return jsonify({'error': 'Менеджер не может назначать роль администратора'}), 403
        
        # Prevent users from changing their own role (except admin)
        if user_id == current_user_id and user_role != 'admin' and 'role' in data:
            return jsonify({'error': 'Нельзя изменить собственную роль'}), 403
        
        # Подготовка SQL запроса
        update_fields = []
        update_values = []
        
        if 'username' in data:
            update_fields.append('username = ?')
            update_values.append(data['username'])
        
        if 'email' in data:
            update_fields.append('email = ?')
            update_values.append(data['email'])
        
        if 'role' in data:
            update_fields.append('role = ?')
            update_values.append(data['role'])
        
        if 'password' in data and data['password']:
            update_fields.append('password = ?')
            update_values.append(hash_password(data['password']))
        
        update_values.append(user_id)
        
        if update_fields:
            cursor.execute(f'''
                UPDATE users
                SET {', '.join(update_fields)}
                WHERE id = ?
            ''', update_values)
        
        # Обновление датчиков
        cursor.execute('DELETE FROM user_sensors WHERE user_id = ?', (user_id,))
        
        if 'sensor_ids' in data:
            sensor_ids = data['sensor_ids']
            for sensor_id in sensor_ids:
                cursor.execute('''
                    INSERT INTO user_sensors (user_id, sensor_id)
                    VALUES (?, ?)
                ''', (user_id, sensor_id))
        
        conn.commit()
        return jsonify({'message': 'User updated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()


@users.route('/api/stores', methods=['GET'])
def get_stores():
    from flask import session
    
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT s.id, s.name, s.address, s.tu_id, s.rd_id, 
                   tu.username as tu_name, rd.username as rd_name
            FROM stores s
            LEFT JOIN users tu ON s.tu_id = tu.id
            LEFT JOIN users rd ON s.rd_id = rd.id
            ORDER BY s.name
        ''')
        
        stores = []
        for row in cursor.fetchall():
            stores.append({
                'id': row[0],
                'name': row[1],
                'address': row[2],
                'tu_id': row[3],
                'rd_id': row[4],
                'tu_name': row[5],
                'rd_name': row[6]
            })
        
        return jsonify(stores)
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/stores', methods=['POST'])
def create_store():
    from flask import session
    
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    data = request.get_json()
    
    if not data.get('name') or not data.get('address'):
        return jsonify({'error': 'Название и адрес обязательны'}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO stores (name, address, tu_id, rd_id, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['name'], data['address'], data.get('tu_id'), data.get('rd_id'), datetime.now().isoformat()))
        
        store_id = cursor.lastrowid
        conn.commit()
        return jsonify({'message': 'Store created', 'id': store_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/stores/<int:store_id>', methods=['PUT'])
def update_store(store_id):
    from flask import session
    
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE stores
            SET name = ?, address = ?, tu_id = ?, rd_id = ?
            WHERE id = ?
        ''', (data['name'], data['address'], data.get('tu_id'), data.get('rd_id'), store_id))
        
        conn.commit()
        return jsonify({'message': 'Store updated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/stores/<int:store_id>', methods=['DELETE'])
def delete_store(store_id):
    from flask import session
    
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM stores WHERE id = ?', (store_id,))
        conn.commit()
        return jsonify({'message': 'Store deleted'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/store-sensors/<int:store_id>', methods=['GET'])
def get_store_sensors(store_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT s.id, s.name, s.location, s.status
            FROM sensors s
            JOIN user_sensors us ON s.id = us.sensor_id
            JOIN stores st ON st.id = ?
            WHERE us.user_id IN (st.tu_id, st.rd_id)
        ''', (store_id,))
        
        sensors = []
        for row in cursor.fetchall():
            sensors.append({
                'id': row[0],
                'name': row[1],
                'location': row[2],
                'status': row[3]
            })
        
        return jsonify(sensors)
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/store-sensors/<int:store_id>/<int:sensor_id>', methods=['POST'])
def assign_sensor_to_store(store_id, sensor_id):
    from flask import session
    
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get store's TU and RD
        cursor.execute('SELECT tu_id, rd_id FROM stores WHERE id = ?', (store_id,))
        store = cursor.fetchone()
        
        if not store:
            return jsonify({'error': 'Store not found'}), 404
        
        # Assign sensor to TU and RD if they exist
        if store[0]:  # tu_id
            cursor.execute('''
                INSERT OR IGNORE INTO user_sensors (user_id, sensor_id)
                VALUES (?, ?)
            ''', (store[0], sensor_id))
        
        if store[1]:  # rd_id
            cursor.execute('''
                INSERT OR IGNORE INTO user_sensors (user_id, sensor_id)
                VALUES (?, ?)
            ''', (store[1], sensor_id))
        
        conn.commit()
        return jsonify({'message': 'Sensor assigned to store'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/store-sensors/<int:store_id>/<int:sensor_id>', methods=['DELETE'])
def unassign_sensor_from_store(store_id, sensor_id):
    from flask import session
    
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get store's TU and RD
        cursor.execute('SELECT tu_id, rd_id FROM stores WHERE id = ?', (store_id,))
        store = cursor.fetchone()
        
        if not store:
            return jsonify({'error': 'Store not found'}), 404
        
        # Remove sensor from TU and RD
        if store[0]:  # tu_id
            cursor.execute('''
                DELETE FROM user_sensors 
                WHERE user_id = ? AND sensor_id = ?
            ''', (store[0], sensor_id))
        
        if store[1]:  # rd_id
            cursor.execute('''
                DELETE FROM user_sensors 
                WHERE user_id = ? AND sensor_id = ?
            ''', (store[1], sensor_id))
        
        conn.commit()
        return jsonify({'message': 'Sensor unassigned from store'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/sensors/<int:sensor_id>', methods=['DELETE'])
def delete_sensor(sensor_id):
    from flask import session
    
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Remove sensor assignments first
        cursor.execute('DELETE FROM user_sensors WHERE sensor_id = ?', (sensor_id,))
        
        # Remove sensor data
        cursor.execute('DELETE FROM visitor_data WHERE sensor_id = ?', (sensor_id,))
        cursor.execute('DELETE FROM hourly_statistics WHERE sensor_id = ?', (sensor_id,))
        cursor.execute('DELETE FROM sensor_downtime WHERE sensor_id = ?', (sensor_id,))
        
        # Remove sensor itself
        cursor.execute('DELETE FROM sensors WHERE id = ?', (sensor_id,))
        
        conn.commit()
        return jsonify({'message': 'Sensor deleted'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()


@users.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('DELETE FROM user_sensors WHERE user_id = ?', (user_id,))
        cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        conn.commit()
        return jsonify({'message': 'User deleted'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/sensors', methods=['GET'])
def get_sensors():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, name, location, type, status
            FROM sensors
        ''')
        
        sensors = []
        for row in cursor.fetchall():
            sensors.append({
                'id': row[0],
                'name': row[1],
                'location': row[2],
                'type': row[3],
                'status': row[4]
            })
        
        return jsonify(sensors)
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()