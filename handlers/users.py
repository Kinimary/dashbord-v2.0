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
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, username, email, role, created_at 
        FROM users
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
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    required_fields = ['username', 'email', 'role', 'password']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    username = data['username']
    email = data['email']
    role = data['role']
    password = data['password']
    
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
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Проверка существования пользователя
        cursor.execute('SELECT id FROM users WHERE id = ?', (user_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'User not found'}), 404
        
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