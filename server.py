from functools import wraps
import os
import sqlite3
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from flask_session import Session
from handlers.reports import reports
from handlers.users import users
from handlers.sensors import sensors

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'your-secret-key-change-in-production'
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

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
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                level INTEGER NOT NULL
            )
        ''')
        
        roles = [
            ('admin', 5),
            ('manager', 4),
            ('rd', 3),
            ('tu', 2),
            ('store', 1)
        ]
        
        cursor.executemany('''
            INSERT OR IGNORE INTO roles (name, level)
            VALUES (?, ?)
        ''', roles)
        
        conn.commit()
        conn.close()
        print(f"Database created at: {DB_PATH}")

init_db()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

def check_permission():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': 'Unauthorized'}), 401

            user_role = session.get('user_role', 'store')

            required_role = getattr(f, 'required_role', None)

            if required_role:
                conn = sqlite3.connect(DB_PATH)
                cursor = conn.cursor()

                cursor.execute('SELECT level FROM roles WHERE name = ?', (user_role,))
                user_level = cursor.fetchone()

                cursor.execute('SELECT level FROM roles WHERE name = ?', (required_role,))
                required_level = cursor.fetchone()

                conn.close()

                if not user_level or not required_level:
                    return jsonify({'error': 'Invalid role'}), 403

                if user_level[0] < required_level[0]:
                    return jsonify({'error': 'Insufficient permissions'}), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator

def set_required_role(role):
    def decorator(f):
        f.required_role = role
        return f
    return decorator

@app.route('/login')
def login():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Простая проверка для демонстрации
    # В реальном приложении используйте хэширование паролей
    if username == 'admin' and password == 'admin':
        session['user_id'] = 1
        session['username'] = username
        session['user_role'] = 'admin'
        return jsonify({'success': True})
    elif username == 'manager' and password == 'manager':
        session['user_id'] = 2
        session['username'] = username
        session['user_role'] = 'manager'
        return jsonify({'success': True})
    else:
        return jsonify({'success': False, 'message': 'Неверные учетные данные'})

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.route('/users')
@login_required
def users_page():
    return render_template('users.html')

@app.route('/sensors')
@login_required
def sensors_page():
    return render_template('sensors.html')

@app.route('/reports')
@login_required
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
@set_required_role('manager')
@check_permission()
def sensor_data():
    user_role = session.get('user_role', 'store')
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    if user_role == 'admin':
        cursor.execute('''
            SELECT device_id, timestamp, count, status, received_at, location
            FROM visitor_counts
            ORDER BY received_at DESC
            LIMIT 10
        ''')
    elif user_role == 'manager':
        cursor.execute('''
            SELECT vc.device_id, vc.timestamp, vc.count, vc.status, vc.received_at, vc.location
            FROM visitor_counts vc
            JOIN user_sensors us ON vc.device_id = us.sensor_id
            WHERE us.user_id IN (
                SELECT id FROM users WHERE role IN ('rd', 'tu', 'store')
            )
            ORDER BY vc.received_at DESC
            LIMIT 10
        ''')
    elif user_role == 'rd':
        cursor.execute('''
            SELECT vc.device_id, vc.timestamp, vc.count, vc.status, vc.received_at, vc.location
            FROM visitor_counts vc
            JOIN user_sensors us ON vc.device_id = us.sensor_id
            WHERE us.user_id IN (
                SELECT id FROM users WHERE role IN ('tu', 'store')
            )
            ORDER BY vc.received_at DESC
            LIMIT 10
        ''')
    elif user_role == 'tu':
        cursor.execute('''
            SELECT vc.device_id, vc.timestamp, vc.count, vc.status, vc.received_at, vc.location
            FROM visitor_counts vc
            JOIN user_sensors us ON vc.device_id = us.sensor_id
            WHERE us.user_id IN (
                SELECT id FROM users WHERE role = 'store'
            )
            ORDER BY vc.received_at DESC
            LIMIT 10
        ''')
    elif user_role == 'store':
        cursor.execute('''
            SELECT vc.device_id, vc.timestamp, vc.count, vc.status, vc.received_at, vc.location
            FROM visitor_counts vc
            JOIN user_sensors us ON vc.device_id = us.sensor_id
            WHERE us.user_id = ?
            ORDER BY vc.received_at DESC
            LIMIT 10
        ''', (1,))  # В реальном приложении使用当前用户ID
    
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

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1521, debug=True)