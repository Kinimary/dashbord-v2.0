from functools import wraps
import os
import sqlite3
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, render_template, redirect, url_for
from handlers.reports import reports
from handlers.users import users
from handlers.sensors import sensors

app = Flask(__name__, static_folder='static', template_folder='templates')

app.register_blueprint(reports, url_prefix='/reports')
app.register_blueprint(users, url_prefix='/users')
app.register_blueprint(sensors, url_prefix='/sensors')

DB_FILENAME = 'visitor_data.db'
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), DB_FILENAME)

def init_db():
    if not os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS visitor_counts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT NOT NULL,
                count INTEGER NOT NULL,
                timestamp INTEGER NOT NULL,
                status TEXT,
                received_at TEXT NOT NULL,
                location TEXT
            )
        ''')

        cursor.execute(''' 
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                email TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_sensors (
                user_id INTEGER NOT NULL,
                sensor_id TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (sensor_id) REFERENCES visitor_counts (device_id),
                PRIMARY KEY (user_id, sensor_id)
            )
        ''')

        conn.commit()
        conn.close()
        print(f"Database created at: {DB_PATH}")

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    # Optional login page for admin functions
    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    """Optional login for administrative functions"""
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Simple hardcoded admin credentials (можно расширить)
    if username == 'admin' and password == 'admin123':
        return jsonify({
            'success': True, 
            'message': 'Login successful',
            'user': {'username': 'admin', 'role': 'admin'}
        })
    else:
        return jsonify({'success': False, 'message': 'Неверные учетные данные'})

@app.route('/api/logout', methods=['POST'])
def api_logout():
    return jsonify({'success': True, 'message': 'Logged out successfully'})

@app.route('/users')
def users_page():
    return render_template('users.html')

@app.route('/sensors')
def sensors_page():
    return render_template('sensors.html')

@app.route('/reports')
def reports_page():
    return render_template('reports.html')

@app.route('/api/visitor-count', methods=['POST'])
def visitor_count():
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()

    try:
        device_id = data['device_id']
        count = int(data['count'])
        timestamp = int(data['timestamp'])
        status = data.get('status', 'unknown').lower()
        location = data.get('location', None)
    except (KeyError, ValueError, TypeError) as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO visitor_counts (device_id, count, timestamp, status, received_at, location)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (device_id, count, timestamp, status, datetime.now().isoformat(), location))
        conn.commit()
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

    return jsonify({'message': 'Data saved'}), 200

@app.route('/api/users', methods=['GET'])
def get_users():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('SELECT id, username, email, role, created_at FROM users')

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

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('SELECT id, username, email, role, created_at FROM users WHERE id = ?', (user_id,))

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

        cursor.execute('SELECT sensor_id FROM user_sensors WHERE user_id = ?', (user_id,))

        sensors = [row[0] for row in cursor.fetchall()]
        user_data['sensors'] = sensors

        conn.close()
        return jsonify(user_data)
    else:
        conn.close()
        return jsonify({'error': 'User not found'}), 404

@app.route('/api/users', methods=['POST'])
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

    conn = sqlite3.connect(DB_PATH)
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

@app.route('/api/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()

    conn = sqlite3.connect(DB_PATH)
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

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = sqlite3.connect(DB_PATH)
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

@app.route('/api/users/<int:user_id>/sensors', methods=['GET'])
def get_user_sensors(user_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('SELECT sensor_id FROM user_sensors WHERE user_id = ?', (user_id,))

    sensors = [row[0] for row in cursor.fetchall()]

    conn.close()
    return jsonify(sensors)

@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('SELECT DISTINCT device_id, location FROM visitor_counts')

    sensors = []
    for row in cursor.fetchall():
        sensors.append({
            'id': row[0],
            'name': f"Датчик {row[0]}",
            'location': row[1] or 'Не указано'
        })

    conn.close()
    return jsonify(sensors)

@app.route('/api/sensor-data', methods=['GET'])
def sensor_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        SELECT device_id, timestamp, count, status, received_at, location
        FROM visitor_counts
        ORDER BY received_at DESC
        LIMIT 100
    ''')

    rows = cursor.fetchall()
    conn.close()

    return jsonify([{
        'device_id': row[0],
        'timestamp': row[1],
        'count': row[2],
        'status': row[3],
        'received_at': row[4],
        'location': row[5] if len(row) > 5 else None
    } for row in rows])

@app.route('/api/dashboard-stats', methods=['GET'])
def dashboard_stats():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Статистика за сегодня
    cursor.execute('''
        SELECT 
            COUNT(DISTINCT device_id) as sensors_count,
            SUM(count) as total_visitors,
            AVG(count) as avg_visitors
        FROM visitor_counts
        WHERE DATE(received_at) = DATE('now')
    ''')
    
    today_stats = cursor.fetchone()
    
    # Статистика по часам
    cursor.execute('''
        SELECT 
            strftime('%H', received_at) as hour,
            SUM(count) as hourly_count
        FROM visitor_counts
        WHERE DATE(received_at) = DATE('now')
        GROUP BY strftime('%H', received_at)
        ORDER BY hour
    ''')
    
    hourly_stats = cursor.fetchall()
    
    # Активные датчики
    cursor.execute('''
        SELECT device_id, MAX(received_at) as last_update
        FROM visitor_counts
        GROUP BY device_id
        HAVING datetime(last_update) > datetime('now', '-1 hour')
    ''')
    
    active_sensors = cursor.fetchall()
    
    conn.close()
    
    return jsonify({
        'today': {
            'sensors_count': today_stats[0] or 0,
            'total_visitors': today_stats[1] or 0,
            'avg_visitors': round(today_stats[2] or 0, 2)
        },
        'hourly': [{'hour': row[0], 'count': row[1]} for row in hourly_stats],
        'active_sensors': len(active_sensors)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1521, debug=True)