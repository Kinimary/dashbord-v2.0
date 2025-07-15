from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_session import Session
from werkzeug.middleware.proxy_fix import ProxyFix
import sqlite3
import hashlib
import os
from datetime import timedelta
from handlers import users, sensors, reports

app = Flask(__name__)
app.secret_key = 'belwest_secret_key_2024'

# Fix for Replit proxy
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Session configuration
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = './flask_session'
app.config['SESSION_COOKIE_NAME'] = 'visitor_session'
app.config['SESSION_COOKIE_SECURE'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

# Ensure session directory exists
session_dir = './flask_session'
if not os.path.exists(session_dir):
    os.makedirs(session_dir)

Session(app)


# Database initialization
def init_db():
    conn = sqlite3.connect('visitor_data.db')
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            role TEXT DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create sensors table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            visitor_count INTEGER DEFAULT 0
        )
    ''')

    # Create visitor_data table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visitor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id INTEGER,
            visitor_count INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sensor_id) REFERENCES sensors (id)
        )
    ''')

    # Create visitor_counts table (for handlers compatibility)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visitor_counts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            location TEXT,
            status TEXT DEFAULT 'active',
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create user_sensors table for many-to-many relationship
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_sensors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            sensor_id TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    # Create default admin user
    admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
    cursor.execute(
        '''
        INSERT OR IGNORE INTO users (username, password, email, role) 
        VALUES (?, ?, ?, ?)
    ''', ('admin', admin_password, 'admin@belwest.com', 'admin'))

    # Create sample sensors
    sample_sensors = [('Главный вход', 'Центральный вход в здание', 'active'),
                      ('Боковой вход', 'Боковой вход со стороны парковки',
                       'active'),
                      ('Офис менеджера', 'Вход в офис менеджера', 'inactive'),
                      ('Склад', 'Вход на склад', 'active')]

    for sensor in sample_sensors:
        cursor.execute(
            '''
            INSERT OR IGNORE INTO sensors (name, location, status) 
            VALUES (?, ?, ?)
        ''', sensor)

    # Create sample visitor_counts data
    sample_visitor_counts = [('SENSOR_001', 15, 'Главный вход', 'active'),
                             ('SENSOR_002', 8, 'Боковой вход', 'active'),
                             ('SENSOR_003', 0, 'Офис менеджера', 'inactive'),
                             ('SENSOR_004', 12, 'Склад', 'active')]

    for count_data in sample_visitor_counts:
        cursor.execute(
            '''
            INSERT OR IGNORE INTO visitor_counts (device_id, count, location, status) 
            VALUES (?, ?, ?, ?)
        ''', count_data)

    conn.commit()
    conn.close()
    print("База данных успешно инициализирована!")


# Authentication decorator
def login_required(f):
    from functools import wraps

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)

    return decorated_function


# Role-based access control decorator
def role_required(*allowed_roles):
    from functools import wraps
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('login'))
            
            user_role = session.get('role')
            if user_role not in allowed_roles:
                return jsonify({'error': 'Недостаточно прав доступа'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    # Если пользователь уже вошел в систему, просто отобразите страницу входа
    if 'user_id' in session:
        return render_template('login.html')  # Отображение страницы логина
    if request.method == 'POST':
        username = request.form['username']
        password = hashlib.sha256(
            request.form['password'].encode()).hexdigest()
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
            (username, password))
        user = cursor.fetchone()
        conn.close()

        if user:
            session['user_id'] = user[0]
            session['username'] = user[1]
            session['role'] = user[2]
            session.permanent = True
            return redirect(
                url_for('index'))  # Перенаправление на главную страницу
    return render_template('login.html')  # Отображение страницы логина


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = hashlib.sha256(data.get('password').encode()).hexdigest()

    conn = sqlite3.connect('visitor_data.db')
    cursor = conn.cursor()
    cursor.execute(
        'SELECT id, username, role FROM users WHERE username = ? AND password = ?',
        (username, password))
    user = cursor.fetchone()
    conn.close()

    if user:
        session['user_id'] = user[0]
        session['username'] = user[1]
        session['role'] = user[2]
        return jsonify({
            'success': True,
            'user': {
                'id': user[0],
                'username': user[1],
                'role': user[2]
            }
        })
    else:
        return jsonify({
            'success': False,
            'message': 'Неверный логин или пароль'
        }), 401


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/users')
@login_required
@role_required('admin', 'manager')
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


@app.route('/settings')
@login_required
@role_required('admin')
def settings_page():
    return render_template('settings.html')


@app.route('/profile')
@login_required
def profile_page():
    return render_template('profile.html')


@app.route('/api/user-profile')
@login_required
def get_user_profile():
    try:
        user_id = session.get('user_id')
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT username, email, role, created_at 
            FROM users 
            WHERE id = ?
        ''', (user_id,))
        
        user = cursor.fetchone()
        conn.close()
        
        if user:
            return jsonify({
                'username': user[0],
                'email': user[1],
                'role': user[2],
                'created_at': user[3],
                'role_name': get_role_name(user[2])
            })
        else:
            return jsonify({'error': 'User not found'}), 404
            
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500


def get_role_name(role):
    role_names = {
        'admin': 'Администратор',
        'manager': 'Менеджер',
        'rd': 'РД',
        'tu': 'ТУ',
        'store': 'Магазин'
    }
    return role_names.get(role, role)


@app.route('/api/sensor-data')
@login_required
def get_sensor_data():
    try:
        user_role = session.get('role')
        user_id = session.get('user_id')
        
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()

        # Build sensor filter based on role
        sensor_filter = ""
        filter_params = []
        
        if user_role not in ['admin', 'manager']:
            # For non-admin users, filter by assigned sensors
            cursor.execute('SELECT sensor_id FROM user_sensors WHERE user_id = ?', (user_id,))
            user_sensors = [row[0] for row in cursor.fetchall()]
            
            if user_sensors:
                placeholders = ','.join(['?' for _ in user_sensors])
                sensor_filter = f" WHERE s.id IN ({placeholders})"
                filter_params = user_sensors
            else:
                # No sensors assigned, return empty data
                sensor_filter = " WHERE 1=0"

        # Get sensor statistics
        stats_query = f'''
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                   SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
            FROM sensors s{sensor_filter}
        '''
        cursor.execute(stats_query, filter_params)
        sensors_stats = cursor.fetchone()

        # Get today's visitors
        visitors_query = f'''
            SELECT COALESCE(SUM(visitor_count), 0) as today_visitors
            FROM visitor_data vd
            JOIN sensors s ON vd.sensor_id = s.id
            WHERE DATE(vd.timestamp) = DATE('now'){sensor_filter.replace('s.', 's.')}
        '''
        if sensor_filter:
            visitors_query = f'''
                SELECT COALESCE(SUM(vd.visitor_count), 0) as today_visitors
                FROM visitor_data vd
                JOIN sensors s ON vd.sensor_id = s.id
                WHERE DATE(vd.timestamp) = DATE('now') AND s.id IN ({','.join(['?' for _ in filter_params])})
            '''
        else:
            visitors_query = '''
                SELECT COALESCE(SUM(visitor_count), 0) as today_visitors
                FROM visitor_data 
                WHERE DATE(timestamp) = DATE('now')
            '''
        
        cursor.execute(visitors_query, filter_params if sensor_filter else [])
        today_visitors = cursor.fetchone()[0]

        # Get sensors data
        sensors_query = f'''
            SELECT s.name, s.location, s.status, s.visitor_count,
                   COALESCE(s.last_update, 'Никогда') as last_update
            FROM sensors s{sensor_filter}
            ORDER BY s.name
        '''
        cursor.execute(sensors_query, filter_params)
        sensors_data = cursor.fetchall()

        # Generate sample hourly data
        import random
        hourly_visitors = [random.randint(0, 50) for _ in range(24)]

        # Generate sample recent activity
        recent_activity = [{
            'type': 'visitor',
            'title': 'Новый посетитель',
            'description': 'Зарегистрирован через главный вход',
            'time': '5 минут назад'
        }, {
            'type': 'sensor',
            'title': 'Датчик подключен',
            'description': 'Боковой вход - статус онлайн',
            'time': '10 минут назад'
        }, {
            'type': 'system',
            'title': 'Система обновлена',
            'description': 'Обновление до версии 2.1.4',
            'time': '1 час назад'
        }]

        # Format sensors data
        sensors_formatted = []
        for sensor in sensors_data:
            sensors_formatted.append({
                'name': sensor[0],
                'location': sensor[1],
                'status': sensor[2],
                'count': sensor[3],
                'last_update': sensor[4]
            })

        data = {
            'today_visitors':
            today_visitors,
            'active_sensors':
            sensors_stats[1] if sensors_stats else 0,
            'avg_hourly':
            round(today_visitors / 24, 1) if today_visitors > 0 else 0,
            'peak_time':
            '14:30',
            'peak_count':
            max(hourly_visitors) if hourly_visitors else 0,
            'today_change':
            random.randint(-5, 15),
            'sensors_status':
            'online' if sensors_stats and sensors_stats[1] > 0 else 'offline',
            'new_visitors':
            random.randint(10, 50),
            'returning_visitors':
            random.randint(20, 80),
            'new_visitors_change':
            random.randint(-10, 20),
            'returning_visitors_change':
            random.randint(-15, 25),
            'hourly_visitors':
            hourly_visitors,
            'sensors_stats': {
                'online': sensors_stats[1] if sensors_stats else 0,
                'offline': sensors_stats[2] if sensors_stats else 0
            },
            'recent_activity':
            recent_activity,
            'sensors':
            sensors_formatted
        }

        conn.close()
        return jsonify(data)

    except Exception as e:
        print(f"Error in get_sensor_data: {e}")
        return jsonify({
            'today_visitors': 0,
            'active_sensors': 0,
            'avg_hourly': 0,
            'peak_time': '--:--',
            'peak_count': 0,
            'today_change': 0,
            'sensors_status': 'offline',
            'new_visitors': 0,
            'returning_visitors': 0,
            'new_visitors_change': 0,
            'returning_visitors_change': 0,
            'hourly_visitors': [0] * 24,
            'sensors_stats': {
                'online': 0,
                'offline': 0
            },
            'recent_activity': [],
            'sensors': []
        })


# Register blueprints
app.register_blueprint(users.users)
app.register_blueprint(sensors.sensors)
app.register_blueprint(reports.reports)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=1521, debug=True)