from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_session import Session
from werkzeug.middleware.proxy_fix import ProxyFix
import sqlite3
import hashlib
import os
import sys
from datetime import timedelta, datetime

# Добавляем текущую директорию в Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

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

    # Create stores table for hierarchy
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            tu_id INTEGER,
            rd_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tu_id) REFERENCES users (id),
            FOREIGN KEY (rd_id) REFERENCES users (id)
        )
    ''')

    # Create sensor_downtime table for tracking sensor disconnections
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensor_downtime (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id INTEGER,
            store_id INTEGER,
            disconnected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reconnected_at TIMESTAMP,
            duration_minutes INTEGER,
            FOREIGN KEY (sensor_id) REFERENCES sensors (id),
            FOREIGN KEY (store_id) REFERENCES stores (id)
        )
    ''')

    # Create hourly_statistics table for detailed analytics
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hourly_statistics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER,
            sensor_id INTEGER,
            hour INTEGER,
            day_of_week INTEGER,
            visitor_count INTEGER DEFAULT 0,
            date DATE,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES stores (id),
            FOREIGN KEY (sensor_id) REFERENCES sensors (id)
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

    # Create sample TU and RD users
    tu_password = hashlib.sha256('tu123'.encode()).hexdigest()
    rd_password = hashlib.sha256('rd123'.encode()).hexdigest()
    
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, password, email, role) 
        VALUES (?, ?, ?, ?)
    ''', ('tu_manager', tu_password, 'tu@belwest.com', 'tu'))
    
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, password, email, role) 
        VALUES (?, ?, ?, ?)
    ''', ('rd_manager', rd_password, 'rd@belwest.com', 'rd'))

    # Create sample stores
    sample_stores = [
        ('Магазин №1 Центр', 'ул. Ленина, 45', 2, 3),
        ('Магазин №2 Восток', 'ул. Гагарина, 12', 2, 3),
        ('Магазин №3 Запад', 'ул. Мира, 78', 2, 3),
        ('Магазин №4 Север', 'ул. Победы, 23', 2, 3)
    ]

    for store in sample_stores:
        cursor.execute('''
            INSERT OR IGNORE INTO stores (name, address, tu_id, rd_id) 
            VALUES (?, ?, ?, ?)
        ''', store)

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

    # Create sample hourly statistics
    import random
    from datetime import datetime, timedelta
    
    for store_id in range(1, 5):
        for sensor_id in range(1, 5):
            for day_offset in range(30):
                date = datetime.now() - timedelta(days=day_offset)
                for hour in range(24):
                    visitor_count = random.randint(0, 50)
                    cursor.execute('''
                        INSERT OR IGNORE INTO hourly_statistics 
                        (store_id, sensor_id, hour, day_of_week, visitor_count, date) 
                        VALUES (?, ?, ?, ?, ?, ?)
                    ''', (store_id, sensor_id, hour, date.weekday(), visitor_count, date.date()))

    # Create sample sensor downtime records
    sample_downtimes = [
        (1, 1, datetime.now() - timedelta(hours=5), datetime.now() - timedelta(hours=3), 120),
        (2, 2, datetime.now() - timedelta(hours=2), None, None),
        (3, 3, datetime.now() - timedelta(days=1), datetime.now() - timedelta(hours=23), 60)
    ]

    for downtime in sample_downtimes:
        cursor.execute('''
            INSERT OR IGNORE INTO sensor_downtime 
            (sensor_id, store_id, disconnected_at, reconnected_at, duration_minutes) 
            VALUES (?, ?, ?, ?, ?)
        ''', downtime)

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


@app.route('/logout', methods=['GET', 'POST'])
def logout():
    session.clear()
    if request.method == 'POST':
        return jsonify({'success': True, 'redirect': '/login'})
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
        period = request.args.get('period', 'day')  # hour, day, week, month, year
        hierarchy_type = request.args.get('hierarchy_type', '')
        entity_id = request.args.get('entity_id', '')
        
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()

        # Build store filter based on role and hierarchy selection
        store_filter = ""
        filter_params = []
        
        # Если выбрана конкретная иерархия
        if hierarchy_type and entity_id:
            if hierarchy_type == 'manager':
                # Показать все магазины, привязанные к менеджеру
                cursor.execute('''
                    SELECT DISTINCT s.id FROM stores s
                    JOIN users tu ON s.tu_id = tu.id
                    JOIN users rd ON s.rd_id = rd.id
                    WHERE tu.id = ? OR rd.id = ? OR ? IN (
                        SELECT user_id FROM user_sensors WHERE sensor_id IN (
                            SELECT id FROM sensors WHERE id IN (
                                SELECT sensor_id FROM visitor_data WHERE sensor_id IN (
                                    SELECT id FROM sensors
                                )
                            )
                        )
                    )
                ''', (entity_id, entity_id, entity_id))
                user_stores = [row[0] for row in cursor.fetchall()]
                if user_stores:
                    placeholders = ','.join(['?' for _ in user_stores])
                    store_filter = f" WHERE hs.store_id IN ({placeholders})"
                    filter_params = user_stores
                else:
                    store_filter = " WHERE 1=0"
                    
            elif hierarchy_type == 'rd':
                # Показать магазины конкретного РД
                cursor.execute('SELECT id FROM stores WHERE rd_id = ?', (entity_id,))
                user_stores = [row[0] for row in cursor.fetchall()]
                if user_stores:
                    placeholders = ','.join(['?' for _ in user_stores])
                    store_filter = f" WHERE hs.store_id IN ({placeholders})"
                    filter_params = user_stores
                else:
                    store_filter = " WHERE 1=0"
                    
            elif hierarchy_type == 'tu':
                # Показать магазины конкретного ТУ
                cursor.execute('SELECT id FROM stores WHERE tu_id = ?', (entity_id,))
                user_stores = [row[0] for row in cursor.fetchall()]
                if user_stores:
                    placeholders = ','.join(['?' for _ in user_stores])
                    store_filter = f" WHERE hs.store_id IN ({placeholders})"
                    filter_params = user_stores
                else:
                    store_filter = " WHERE 1=0"
                    
            elif hierarchy_type == 'store':
                # Показать данные конкретного магазина
                store_filter = " WHERE hs.store_id = ?"
                filter_params = [entity_id]
        
        elif user_role == 'store':
            # Store managers see only their store
            cursor.execute('SELECT id FROM stores WHERE tu_id = ? OR rd_id = ?', (user_id, user_id))
            user_stores = [row[0] for row in cursor.fetchall()]
            if user_stores:
                placeholders = ','.join(['?' for _ in user_stores])
                store_filter = f" WHERE hs.store_id IN ({placeholders})"
                filter_params = user_stores
            else:
                store_filter = " WHERE 1=0"
        elif user_role == 'tu':
            # TU managers see stores assigned to them
            cursor.execute('SELECT id FROM stores WHERE tu_id = ?', (user_id,))
            user_stores = [row[0] for row in cursor.fetchall()]
            if user_stores:
                placeholders = ','.join(['?' for _ in user_stores])
                store_filter = f" WHERE hs.store_id IN ({placeholders})"
                filter_params = user_stores
            else:
                store_filter = " WHERE 1=0"
        elif user_role == 'rd':
            # RD managers see stores under their TU managers
            cursor.execute('SELECT id FROM stores WHERE rd_id = ?', (user_id,))
            user_stores = [row[0] for row in cursor.fetchall()]
            if user_stores:
                placeholders = ','.join(['?' for _ in user_stores])
                store_filter = f" WHERE hs.store_id IN ({placeholders})"
                filter_params = user_stores
            else:
                store_filter = " WHERE 1=0"

        # Get time-based statistics
        time_condition = ""
        if period == 'hour':
            time_condition = "AND hs.timestamp >= datetime('now', '-1 hour')"
        elif period == 'day':
            time_condition = "AND hs.date = date('now')"
        elif period == 'week':
            time_condition = "AND hs.date >= date('now', '-7 days')"
        elif period == 'month':
            time_condition = "AND hs.date >= date('now', '-30 days')"
        elif period == 'year':
            time_condition = "AND hs.date >= date('now', '-365 days')"

        # Get visitor statistics
        visitors_query = f'''
            SELECT COALESCE(SUM(hs.visitor_count), 0) as total_visitors
            FROM hourly_statistics hs
            JOIN stores s ON hs.store_id = s.id
            {store_filter} {time_condition}
        '''
        cursor.execute(visitors_query, filter_params)
        total_visitors = cursor.fetchone()[0]

        # Get hourly breakdown for charts
        hourly_query = f'''
            SELECT hs.hour, SUM(hs.visitor_count) as visitors
            FROM hourly_statistics hs
            JOIN stores s ON hs.store_id = s.id
            {store_filter} {time_condition}
            GROUP BY hs.hour
            ORDER BY hs.hour
        '''
        cursor.execute(hourly_query, filter_params)
        hourly_data = cursor.fetchall()
        hourly_visitors = [0] * 24
        for hour, visitors in hourly_data:
            hourly_visitors[hour] = visitors

        # Get peak times for weekdays and weekends
        peak_weekday_query = f'''
            SELECT hs.hour, AVG(hs.visitor_count) as avg_visitors
            FROM hourly_statistics hs
            JOIN stores s ON hs.store_id = s.id
            {store_filter} AND hs.day_of_week < 5 {time_condition}
            GROUP BY hs.hour
            ORDER BY avg_visitors DESC
            LIMIT 1
        '''
        cursor.execute(peak_weekday_query, filter_params)
        peak_weekday = cursor.fetchone()

        peak_weekend_query = f'''
            SELECT hs.hour, AVG(hs.visitor_count) as avg_visitors
            FROM hourly_statistics hs
            JOIN stores s ON hs.store_id = s.id
            {store_filter} AND hs.day_of_week >= 5 {time_condition}
            GROUP BY hs.hour
            ORDER BY avg_visitors DESC
            LIMIT 1
        '''
        cursor.execute(peak_weekend_query, filter_params)
        peak_weekend = cursor.fetchone()

        # Get store statistics for hierarchy view
        store_stats_query = f'''
            SELECT s.name, s.address, SUM(hs.visitor_count) as total_visitors
            FROM stores s
            LEFT JOIN hourly_statistics hs ON s.id = hs.store_id {time_condition}
            {store_filter.replace('hs.', 's.')}
            GROUP BY s.id, s.name, s.address
            ORDER BY total_visitors DESC
        '''
        cursor.execute(store_stats_query, filter_params)
        store_stats = cursor.fetchall()

        # Get sensor status
        sensors_query = f'''
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                   SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
            FROM sensors
        '''
        cursor.execute(sensors_query)
        sensors_stats = cursor.fetchone()

        # Format store statistics
        stores_formatted = []
        for store in store_stats:
            stores_formatted.append({
                'name': store[0],
                'address': store[1],
                'visitors': store[2] if store[2] else 0
            })

        data = {
            'total_visitors': total_visitors,
            'active_sensors': sensors_stats[1] if sensors_stats else 0,
            'avg_hourly': round(total_visitors / 24, 1) if total_visitors > 0 else 0,
            'peak_weekday': f"{peak_weekday[0]:02d}:00" if peak_weekday else '--:--',
            'peak_weekend': f"{peak_weekend[0]:02d}:00" if peak_weekend else '--:--',
            'peak_weekday_count': round(peak_weekday[1]) if peak_weekday else 0,
            'peak_weekend_count': round(peak_weekend[1]) if peak_weekend else 0,
            'sensors_status': 'online' if sensors_stats and sensors_stats[1] > 0 else 'offline',
            'hourly_visitors': hourly_visitors,
            'sensors_stats': {
                'online': sensors_stats[1] if sensors_stats else 0,
                'offline': sensors_stats[2] if sensors_stats else 0
            },
            'stores': stores_formatted,
            'period': period,
            'user_role': user_role
        }

        conn.close()
        return jsonify(data)

    except Exception as e:
        print(f"Error in get_sensor_data: {e}")
        return jsonify({
            'total_visitors': 0,
            'active_sensors': 0,
            'avg_hourly': 0,
            'peak_weekday': '--:--',
            'peak_weekend': '--:--',
            'peak_weekday_count': 0,
            'peak_weekend_count': 0,
            'sensors_status': 'offline',
            'hourly_visitors': [0] * 24,
            'sensors_stats': {'online': 0, 'offline': 0},
            'stores': [],
            'period': 'day',
            'user_role': user_role
        })


@app.route('/api/notifications')
@login_required
def get_notifications():
    """API для получения уведомлений пользователя"""
    try:
        user_id = session.get('user_id')
        user_role = session.get('role')
        
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()
        
        # Создаем таблицу уведомлений если она не существует
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        
        # Генерируем уведомления на основе данных
        notifications = []
        
        # Проверяем офлайн датчики
        cursor.execute('''
            SELECT name, last_update 
            FROM sensors 
            WHERE status = 'inactive' OR last_update < datetime('now', '-1 hour')
        ''')
        offline_sensors = cursor.fetchall()
        
        for sensor in offline_sensors:
            notifications.append({
                'id': f'sensor_offline_{sensor[0]}',
                'title': 'Датчик офлайн',
                'message': f'Датчик "{sensor[0]}" не отвечает',
                'type': 'sensor_offline',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            })
        
        # Проверяем высокую нагрузку
        cursor.execute('''
            SELECT SUM(visitor_count) as total 
            FROM hourly_statistics 
            WHERE date = date('now') AND hour = ?
        ''', (datetime.now().hour,))
        current_hour_traffic = cursor.fetchone()[0] or 0
        
        if current_hour_traffic > 100:
            notifications.append({
                'id': 'high_traffic',
                'title': 'Высокая нагрузка',
                'message': f'Текущий поток: {current_hour_traffic} посетителей/час',
                'type': 'high_traffic',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            })
        
        # Проверяем длительные отключения
        cursor.execute('''
            SELECT COUNT(*) 
            FROM sensor_downtime 
            WHERE reconnected_at IS NULL AND 
                  disconnected_at < datetime('now', '-2 hours')
        ''')
        long_downtimes = cursor.fetchone()[0] or 0
        
        if long_downtimes > 0:
            notifications.append({
                'id': 'long_downtime',
                'title': 'Длительные отключения',
                'message': f'{long_downtimes} датчиков отключены более 2 часов',
                'type': 'sensor_offline',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            })
        
        # Добавляем системные уведомления
        if user_role == 'admin':
            notifications.append({
                'id': 'system_status',
                'title': 'Система работает',
                'message': 'Все сервисы функционируют нормально',
                'type': 'system_update',
                'is_read': False,
                'created_at': datetime.now().isoformat()
            })
        
        conn.close()
        
        return jsonify({
            'notifications': notifications[:10],  # Последние 10 уведомлений
            'unread_count': len([n for n in notifications if not n['is_read']])
        })
        
    except Exception as e:
        print(f"Error in get_notifications: {e}")
        return jsonify({'notifications': [], 'unread_count': 0})


@app.route('/api/notifications/<notification_id>/read', methods=['POST'])
@login_required
def mark_notification_read(notification_id):
    """Отметить уведомление как прочитанное"""
    return jsonify({'success': True})


@app.route('/api/notifications/mark-all-read', methods=['POST'])
@login_required
def mark_all_notifications_read():
    """Отметить все уведомления как прочитанные"""
    return jsonify({'success': True})


@app.route('/api/hierarchy/<hierarchy_type>')
@login_required
def get_hierarchy_options(hierarchy_type):
    """API для получения опций иерархии"""
    try:
        user_role = session.get('role')
        user_id = session.get('user_id')
        
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()
        
        options = []
        
        if hierarchy_type == 'manager':
            # Получить всех менеджеров
            cursor.execute('''
                SELECT id, username FROM users 
                WHERE role IN ('manager', 'admin')
                ORDER BY username
            ''')
            options = [{'id': row[0], 'name': f"Менеджер: {row[1]}"} for row in cursor.fetchall()]
            
        elif hierarchy_type == 'rd':
            # Получить всех РД
            cursor.execute('''
                SELECT id, username FROM users 
                WHERE role = 'rd'
                ORDER BY username
            ''')
            options = [{'id': row[0], 'name': f"РД: {row[1]}"} for row in cursor.fetchall()]
            
        elif hierarchy_type == 'tu':
            # Получить всех ТУ
            cursor.execute('''
                SELECT id, username FROM users 
                WHERE role = 'tu'
                ORDER BY username
            ''')
            options = [{'id': row[0], 'name': f"ТУ: {row[1]}"} for row in cursor.fetchall()]
            
        elif hierarchy_type == 'store':
            # Получить все магазины
            cursor.execute('''
                SELECT s.id, s.name, s.address, tu.username as tu_name, rd.username as rd_name
                FROM stores s
                LEFT JOIN users tu ON s.tu_id = tu.id
                LEFT JOIN users rd ON s.rd_id = rd.id
                ORDER BY s.name
            ''')
            options = [{'id': row[0], 'name': f"{row[1]} ({row[2]})", 'tu': row[3], 'rd': row[4]} for row in cursor.fetchall()]
        
        conn.close()
        return jsonify(options)
        
    except Exception as e:
        print(f"Error in get_hierarchy_options: {e}")
        return jsonify([])


@app.route('/api/sensor-downtimes')
@login_required
def get_sensor_downtimes():
    """API для получения информации об отключениях датчиков"""
    try:
        user_role = session.get('role')
        user_id = session.get('user_id')
        filter_type = request.args.get('filter', 'all')
        period = request.args.get('period', 'today')
        
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()

        # Build filter based on role
        store_filter = ""
        filter_params = []
        
        if user_role == 'store':
            cursor.execute('SELECT id FROM stores WHERE tu_id = ? OR rd_id = ?', (user_id, user_id))
            user_stores = [row[0] for row in cursor.fetchall()]
            if user_stores:
                placeholders = ','.join(['?' for _ in user_stores])
                store_filter = f" WHERE sd.store_id IN ({placeholders})"
                filter_params = user_stores
            else:
                store_filter = " WHERE 1=0"
        elif user_role == 'tu':
            cursor.execute('SELECT id FROM stores WHERE tu_id = ?', (user_id,))
            user_stores = [row[0] for row in cursor.fetchall()]
            if user_stores:
                placeholders = ','.join(['?' for _ in user_stores])
                store_filter = f" WHERE sd.store_id IN ({placeholders})"
                filter_params = user_stores
            else:
                store_filter = " WHERE 1=0"
        elif user_role == 'rd':
            cursor.execute('SELECT id FROM stores WHERE rd_id = ?', (user_id,))
            user_stores = [row[0] for row in cursor.fetchall()]
            if user_stores:
                placeholders = ','.join(['?' for _ in user_stores])
                store_filter = f" WHERE sd.store_id IN ({placeholders})"
                filter_params = user_stores
            else:
                store_filter = " WHERE 1=0"

        # Get sensor downtime data
        downtime_query = f'''
            SELECT s.name as sensor_name, st.name as store_name, st.address,
                   sd.disconnected_at, sd.reconnected_at, sd.duration_minutes
            FROM sensor_downtime sd
            JOIN sensors s ON sd.sensor_id = s.id
            JOIN stores st ON sd.store_id = st.id
            {store_filter}
            ORDER BY sd.disconnected_at DESC
        '''
        cursor.execute(downtime_query, filter_params)
        downtime_data = cursor.fetchall()

        # Format downtime data
        downtimes = []
        for row in downtime_data:
            downtimes.append({
                'sensor_name': row[0],
                'store_name': row[1],
                'store_address': row[2],
                'disconnected_at': row[3],
                'reconnected_at': row[4],
                'duration_minutes': row[5],
                'status': 'reconnected' if row[4] else 'offline'
            })

        conn.close()
        return jsonify({'downtimes': downtimes})

    except Exception as e:
        print(f"Error in get_sensor_downtimes: {e}")
        return jsonify({'downtimes': []})


@app.route('/api/visitor-count', methods=['POST'])
def receive_visitor_count():
    """Endpoint для получения данных от Arduino датчиков"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        device_id = data.get('device_id')
        count = data.get('count', 0)
        timestamp = data.get('timestamp')
        status = data.get('status', 'online')
        
        if not device_id:
            return jsonify({'error': 'device_id is required'}), 400
        
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()
        
        # Check if sensor went offline/online
        cursor.execute('SELECT status FROM sensors WHERE name LIKE ?', (f"%{device_id}%",))
        previous_status = cursor.fetchone()
        
        # Track sensor downtime
        if previous_status and previous_status[0] == 'active' and status == 'offline':
            # Sensor went offline
            cursor.execute('''
                INSERT INTO sensor_downtime (sensor_id, store_id, disconnected_at)
                SELECT s.id, 1, ?
                FROM sensors s
                WHERE s.name LIKE ?
            ''', (datetime.now(), f"%{device_id}%"))
        elif previous_status and previous_status[0] == 'inactive' and status == 'online':
            # Sensor came back online
            cursor.execute('''
                UPDATE sensor_downtime 
                SET reconnected_at = ?, duration_minutes = 
                    (julianday(?) - julianday(disconnected_at)) * 24 * 60
                WHERE sensor_id = (SELECT id FROM sensors WHERE name LIKE ?)
                AND reconnected_at IS NULL
            ''', (datetime.now(), datetime.now(), f"%{device_id}%"))
        
        # Обновляем или создаем запись в visitor_counts
        cursor.execute('''
            INSERT OR REPLACE INTO visitor_counts 
            (device_id, count, status, timestamp, received_at) 
            VALUES (?, ?, ?, ?, ?)
        ''', (device_id, count, status, 
              datetime.fromtimestamp(timestamp) if timestamp else datetime.now(),
              datetime.now()))
        
        # Обновляем таблицу sensors если датчик существует
        cursor.execute('''
            UPDATE sensors 
            SET visitor_count = ?, last_update = ?, status = ?
            WHERE name LIKE ?
        ''', (count, datetime.now(), status, f"%{device_id}%"))
        
        # Add to hourly statistics
        current_time = datetime.now()
        cursor.execute('''
            INSERT OR REPLACE INTO hourly_statistics 
            (store_id, sensor_id, hour, day_of_week, visitor_count, date)
            SELECT 1, s.id, ?, ?, ?, ?
            FROM sensors s
            WHERE s.name LIKE ?
        ''', (current_time.hour, current_time.weekday(), count, current_time.date(), f"%{device_id}%"))
        
        conn.commit()
        conn.close()
        
        print(f"Получены данные от {device_id}: count={count}, status={status}")
        
        return jsonify({
            'success': True, 
            'message': 'Data received successfully',
            'device_id': device_id,
            'count': count
        })
        
    except Exception as e:
        print(f"Ошибка обработки данных от Arduino: {e}")
        return jsonify({'error': 'Server error'}), 500


# Register blueprints
app.register_blueprint(users.users)
app.register_blueprint(sensors.sensors)
app.register_blueprint(reports.reports)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=1521, debug=True)