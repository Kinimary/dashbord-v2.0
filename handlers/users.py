from flask import Blueprint, render_template, jsonify, request
import sqlite3
import os
from datetime import datetime

users = Blueprint('users', __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'visitor_data.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    return conn

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
    
    required_fields = ['username', 'email', 'role']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    username = data['username']
    email = data['email']
    role = data['role']
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO users (username, email, role, created_at)
            VALUES (?, ?, ?, ?)
        ''', (username, email, role, datetime.now().isoformat()))
        
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
        cursor.execute('''
            UPDATE users
            SET username = ?, email = ?, role = ?
            WHERE id = ?
        ''', (data.get('username', ''), data.get('email', ''), data.get('role', ''), user_id))
        
        cursor.execute('''
            DELETE FROM user_sensors WHERE user_id = ?
        ''', (user_id,))
        
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