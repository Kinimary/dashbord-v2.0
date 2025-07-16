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
        # Delete from sensors table
        cursor.execute('''
            DELETE FROM sensors WHERE id = ? OR name LIKE ?
        ''', (sensor_id, f"%{sensor_id}%"))
        
        # Delete from visitor_counts
        cursor.execute('''
            DELETE FROM visitor_counts WHERE device_id = ?
        ''', (sensor_id,))
        
        # Delete sensor assignments
        cursor.execute('''
            DELETE FROM user_sensors WHERE sensor_id = ?
        ''', (sensor_id,))
        
        # Delete from hourly_statistics
        cursor.execute('''
            DELETE FROM hourly_statistics WHERE sensor_id = ?
        ''', (sensor_id,))
        
        # Delete from sensor_downtime
        cursor.execute('''
            DELETE FROM sensor_downtime WHERE sensor_id = ?
        ''', (sensor_id,))
        
        conn.commit()
        return jsonify({'message': 'Датчик успешно удален'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Ошибка удаления датчика'}), 500
    finally:
        conn.close()

@sensors.route('/api/stores', methods=['GET'])
def get_stores():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT s.id, s.name, s.address, 
                   tu.username as tu_name, rd.username as rd_name,
                   s.tu_id, s.rd_id
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
                'tu_name': row[3],
                'rd_name': row[4],
                'tu_id': row[5],
                'rd_id': row[6]
            })
        
        return jsonify(stores)
    except Exception as e:
        return jsonify({'error': 'Ошибка получения магазинов'}), 500
    finally:
        conn.close()

@sensors.route('/api/stores', methods=['POST'])
def create_store():
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    required_fields = ['name', 'address']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    name = data['name']
    address = data['address']
    tu_id = data.get('tu_id')
    rd_id = data.get('rd_id')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            INSERT INTO stores (name, address, tu_id, rd_id)
            VALUES (?, ?, ?, ?)
        ''', (name, address, tu_id, rd_id))
        
        conn.commit()
        return jsonify({'message': 'Магазин создан', 'id': cursor.lastrowid}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Ошибка создания магазина'}), 500
    finally:
        conn.close()

@sensors.route('/api/stores/<int:store_id>', methods=['PUT'])
def update_store(store_id):
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        update_fields = []
        update_values = []
        
        if 'name' in data:
            update_fields.append('name = ?')
            update_values.append(data['name'])
        
        if 'address' in data:
            update_fields.append('address = ?')
            update_values.append(data['address'])
        
        if 'tu_id' in data:
            update_fields.append('tu_id = ?')
            update_values.append(data['tu_id'])
        
        if 'rd_id' in data:
            update_fields.append('rd_id = ?')
            update_values.append(data['rd_id'])
        
        update_values.append(store_id)
        
        if update_fields:
            cursor.execute(f'''
                UPDATE stores
                SET {', '.join(update_fields)}
                WHERE id = ?
            ''', update_values)
        
        conn.commit()
        return jsonify({'message': 'Магазин обновлен'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Ошибка обновления магазина'}), 500
    finally:
        conn.close()

@sensors.route('/api/stores/<int:store_id>', methods=['DELETE'])
def delete_store(store_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            DELETE FROM stores WHERE id = ?
        ''', (store_id,))
        
        conn.commit()
        return jsonify({'message': 'Магазин удален'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Ошибка удаления магазина'}), 500
    finally:
        conn.close()

@sensors.route('/api/store-sensors/<int:store_id>', methods=['GET'])
def get_store_sensors(store_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT s.id, s.name, s.location, s.status, s.last_update
            FROM sensors s
            WHERE s.id IN (
                SELECT sensor_id FROM hourly_statistics 
                WHERE store_id = ?
                GROUP BY sensor_id
            )
        ''', (store_id,))
        
        sensors = []
        for row in cursor.fetchall():
            sensors.append({
                'id': row[0],
                'name': row[1],
                'location': row[2],
                'status': row[3],
                'last_update': row[4]
            })
        
        return jsonify(sensors)
    except Exception as e:
        return jsonify({'error': 'Ошибка получения датчиков магазина'}), 500
    finally:
        conn.close()

@sensors.route('/api/store-sensors/<int:store_id>/<int:sensor_id>', methods=['POST'])
def assign_sensor_to_store(store_id, sensor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if assignment already exists
        cursor.execute('''
            SELECT COUNT(*) FROM hourly_statistics 
            WHERE store_id = ? AND sensor_id = ?
        ''', (store_id, sensor_id))
        
        if cursor.fetchone()[0] == 0:
            # Create initial assignment
            cursor.execute('''
                INSERT INTO hourly_statistics (store_id, sensor_id, hour, day_of_week, visitor_count, date)
                VALUES (?, ?, 0, 0, 0, date('now'))
            ''', (store_id, sensor_id))
        
        conn.commit()
        return jsonify({'message': 'Датчик привязан к магазину'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Ошибка привязки датчика'}), 500
    finally:
        conn.close()

@sensors.route('/api/store-sensors/<int:store_id>/<int:sensor_id>', methods=['DELETE'])
def unassign_sensor_from_store(store_id, sensor_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            DELETE FROM hourly_statistics 
            WHERE store_id = ? AND sensor_id = ?
        ''', (store_id, sensor_id))
        
        conn.commit()
        return jsonify({'message': 'Датчик отвязан от магазина'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Ошибка отвязки датчика'}), 500
    finally:
        conn.close()