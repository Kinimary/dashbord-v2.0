from flask import Blueprint, render_template, jsonify, request
import sqlite3
import os
from datetime import datetime

sensors = Blueprint('sensors', __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'visitor_data.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    return conn

@sensors.route('/api/sensors', methods=['GET'])
def get_sensors():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT DISTINCT device_id, location, status, received_at
        FROM visitor_counts
    ''')
    
    sensors = []
    for row in cursor.fetchall():
        sensors.append({
            'id': row[0],
            'name': f"Датчик {row[0]}",
            'location': row[1] or 'Не указано',
            'status': row[2] or 'unknown',
            'last_updated': row[3] or '-'
        })
    
    conn.close()
    return jsonify(sensors)

@sensors.route('/api/sensors/<sensor_id>', methods=['GET'])
def get_sensor(sensor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT device_id, location, status, received_at
        FROM visitor_counts
        WHERE device_id = ?
        ORDER BY received_at DESC
        LIMIT 1
    ''', (sensor_id,))
    
    sensor = cursor.fetchone()
    
    if sensor:
        sensor_data = {
            'id': sensor[0],
            'name': f"Датчик {sensor[0]}",
            'location': sensor[1] or 'Не указано',
            'status': sensor[2] or 'unknown',
            'last_updated': sensor[3] or '-'
        }
        conn.close()
        return jsonify(sensor_data)
    else:
        conn.close()
        return jsonify({'error': 'Sensor not found'}), 404

@sensors.route('/api/sensors', methods=['POST'])
def create_sensor():
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    required_fields = ['id', 'name']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    sensor_id = data['id']
    name = data['name']
    location = data.get('location', '')
    status = data.get('status', 'unknown')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO visitor_counts (device_id, location, status, received_at)
            VALUES (?, ?, ?, ?)
        ''', (sensor_id, location, status, datetime.now().isoformat()))
        
        conn.commit()
        return jsonify({'message': 'Sensor created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@sensors.route('/api/sensors/<sensor_id>', methods=['PUT'])
def update_sensor(sensor_id):
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            UPDATE visitor_counts
            SET location = ?, status = ?, received_at = ?
            WHERE device_id = ?
        ''', (data.get('location', ''), data.get('status', 'unknown'), datetime.now().isoformat(), sensor_id))
        
        conn.commit()
        return jsonify({'message': 'Sensor updated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@sensors.route('/api/sensors/<sensor_id>', methods=['DELETE'])
def delete_sensor(sensor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            DELETE FROM visitor_counts WHERE device_id = ?
        ''', (sensor_id,))
        
        # Also delete sensor assignments
        cursor.execute('''
            DELETE FROM user_sensors WHERE sensor_id = ?
        ''', (sensor_id,))
        
        conn.commit()
        return jsonify({'message': 'Sensor deleted'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()