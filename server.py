
from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_file, Response
from flask_session import Session
import sqlite3
import os
import hashlib
from datetime import datetime, timedelta
import json
import csv
import io
from handlers.users import users
from handlers.sensors import sensors as sensors_bp
from handlers.reports import reports

app = Flask(__name__)

# Конфигурация сессий
app.config['SECRET_KEY'] = 'belwest-visitor-management-2024'
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_FILE_DIR'] = './flask_session'
app.config['SESSION_PERMANENT'] = False
app.config['SESSION_USE_SIGNER'] = True
app.config['SESSION_KEY_PREFIX'] = 'belwest:'
app.config['SESSION_FILE_THRESHOLD'] = 100

Session(app)

# Регистрация blueprint'ов
app.register_blueprint(users, url_prefix='/')
app.register_blueprint(sensors_bp, url_prefix='/')
app.register_blueprint(reports, url_prefix='/')

# Путь к базе данных
DB_PATH = 'visitor_data.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Создание таблицы пользователей
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
    
    # Создание таблицы датчиков
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sensors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            visitor_count INTEGER DEFAULT 0,
            user_id INTEGER,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Создание таблицы данных посетителей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visitor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id INTEGER,
            visitor_count INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sensor_id) REFERENCES sensors (id)
        )
    ''')
    
    # Создание таблицы магазинов
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            manager_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manager_id) REFERENCES users (id)
        )
    ''')
    
    # Создание таблицы привязки датчиков к магазинам
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS store_sensors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER,
            sensor_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (store_id) REFERENCES stores (id),
            FOREIGN KEY (sensor_id) REFERENCES sensors (id)
        )
    ''')
    
    # Создание таблицы для иерархии пользователей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_hierarchy (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER,
            child_id INTEGER,
            hierarchy_type TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES users (id),
            FOREIGN KEY (child_id) REFERENCES users (id)
        )
    ''')
    
    # Проверяем, есть ли пользователь admin
    cursor.execute('SELECT COUNT(*) FROM users WHERE username = ?', ('admin',))
    if cursor.fetchone()[0] == 0:
        hashed_password = hash_password('admin123')
        cursor.execute('''
            INSERT INTO users (username, password, email, role)
            VALUES (?, ?, ?, ?)
        ''', ('admin', hashed_password, 'admin@belwest.com', 'admin'))
    
    # Добавляем тестовые данные датчиков
    cursor.execute('SELECT COUNT(*) FROM sensors')
    if cursor.fetchone()[0] == 0:
        test_sensors = [
            ('Главный вход', 'Центральный вход магазина', 'active'),
            ('Боковой вход', 'Дополнительный вход', 'active'),
            ('VIP зона', 'Премиум отдел', 'active'),
            ('Касса №1', 'Основная касса', 'active'),
            ('Касса №2', 'Дополнительная касса', 'inactive')
        ]
        
        cursor.executemany('''
            INSERT INTO sensors (name, location, status)
            VALUES (?, ?, ?)
        ''', test_sensors)
    
    # Добавляем тестовые данные магазинов
    cursor.execute('SELECT COUNT(*) FROM stores')
    if cursor.fetchone()[0] == 0:
        test_stores = [
            ('BELWEST ТРЦ Галерея', 'г. Минск, пр. Независимости, 25', 53.9045, 27.5615),
            ('BELWEST Dana Mall', 'г. Минск, пр. Независимости, 154', 53.9311, 27.6469),
            ('BELWEST Palazzo', 'г. Минск, ул. Свердлова, 22', 53.8893, 27.5444),
            ('BELWEST Arena City', 'г. Минск, пр. Победителей, 84', 53.9232, 27.5820),
            ('BELWEST Столица', 'г. Минск, ул. Сурганова, 57Б', 53.9268, 27.5918)
        ]
        
        cursor.executemany('''
            INSERT INTO stores (name, address, latitude, longitude)
            VALUES (?, ?, ?, ?)
        ''', test_stores)
    
    conn.commit()
    conn.close()

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            return render_template('login.html', error='Пожалуйста, заполните все поля')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        hashed_password = hash_password(password)
        cursor.execute('SELECT * FROM users WHERE username = ? AND password = ?', 
                      (username, hashed_password))
        user = cursor.fetchone()
        conn.close()
        
        if user:
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            return redirect(url_for('index'))
        else:
            return render_template('login.html', error='Неверный логин или пароль')
    
    return render_template('login.html')

@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True, 'redirect': '/login'})

@app.route('/users')
def users_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('users.html')

@app.route('/sensors')
def sensors_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('sensors.html')

@app.route('/reports')
def reports_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('reports.html')

@app.route('/settings')
def settings_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('settings.html')

@app.route('/profile')
def profile_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('profile.html')

@app.route('/map')
def map_page():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('map.html')

# API для данных от Arduino
@app.route('/api/visitor-count', methods=['POST'])
def receive_visitor_count():
    try:
        data = request.get_json()
        if not data:
            data = {
                'device_id': request.form.get('device_id', 'unknown'),
                'visitor_count': int(request.form.get('visitor_count', 0)),
                'status': request.form.get('status', 'active'),
                'location': request.form.get('location', 'unknown')
            }
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Обновляем или создаем датчик
        cursor.execute('''
            INSERT OR REPLACE INTO sensors (name, location, status, last_update, visitor_count)
            VALUES (?, ?, ?, ?, ?)
        ''', (data['device_id'], data['location'], data['status'], 
              datetime.now(), data['visitor_count']))
        
        sensor_id = cursor.lastrowid
        
        # Сохраняем данные посетителей
        cursor.execute('''
            INSERT INTO visitor_data (sensor_id, visitor_count, timestamp)
            VALUES (?, ?, ?)
        ''', (sensor_id, data['visitor_count'], datetime.now()))
        
        conn.commit()
        conn.close()
        
        return jsonify({'status': 'success', 'message': 'Data received'})
        
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 400

# API для получения данных датчиков
@app.route('/api/sensor-data')
def get_sensor_data():
    period = request.args.get('period', 'day')
    hierarchy_type = request.args.get('hierarchy_type', '')
    entity_id = request.args.get('entity_id', '')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Базовый запрос для получения данных
    if period == 'day':
        time_condition = "datetime('now', '-1 day')"
    elif period == 'week':
        time_condition = "datetime('now', '-7 days')"
    elif period == 'month':
        time_condition = "datetime('now', '-30 days')"
    else:
        time_condition = "datetime('now', '-1 hour')"
    
    # Получаем общую статистику
    cursor.execute(f'''
        SELECT 
            COUNT(DISTINCT s.id) as active_sensors,
            COALESCE(SUM(vd.visitor_count), 0) as total_visitors,
            COUNT(vd.id) as total_records
        FROM sensors s
        LEFT JOIN visitor_data vd ON s.id = vd.sensor_id 
        WHERE s.status = 'active' AND vd.timestamp > {time_condition}
    ''')
    
    stats = cursor.fetchone()
    
    # Получаем данные по времени для графика
    cursor.execute(f'''
        SELECT 
            strftime('%H', vd.timestamp) as hour,
            SUM(vd.visitor_count) as visitors
        FROM visitor_data vd
        JOIN sensors s ON vd.sensor_id = s.id
        WHERE vd.timestamp > {time_condition}
        GROUP BY hour
        ORDER BY hour
    ''')
    
    hourly_data = cursor.fetchall()
    
    # Получаем список датчиков
    cursor.execute('''
        SELECT s.*, vd.visitor_count as current_visitors
        FROM sensors s
        LEFT JOIN visitor_data vd ON s.id = vd.sensor_id
        WHERE vd.id = (
            SELECT MAX(id) FROM visitor_data WHERE sensor_id = s.id
        ) OR vd.id IS NULL
    ''')
    
    sensors_list = cursor.fetchall()
    
    conn.close()
    
    return jsonify({
        'total_visitors': stats['total_visitors'] or 0,
        'active_sensors': stats['active_sensors'] or 0,
        'peak_weekday': '14:30',
        'avg_visit_time': 4.2,
        'unique_visitors': int((stats['total_visitors'] or 0) * 0.7),
        'repeat_visits': int((stats['total_visitors'] or 0) * 0.3),
        'hourly_data': [dict(row) for row in hourly_data],
        'sensors': [dict(row) for row in sensors_list]
    })

# API для иерархии
@app.route('/api/hierarchy/<hierarchy_type>')
def get_hierarchy_options(hierarchy_type):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if hierarchy_type == 'store':
        cursor.execute('SELECT id, name FROM stores ORDER BY name')
    elif hierarchy_type in ['manager', 'rd', 'tu']:
        cursor.execute('SELECT id, username as name FROM users WHERE role = ? ORDER BY username', (hierarchy_type,))
    else:
        return jsonify([])
    
    options = cursor.fetchall()
    conn.close()
    
    return jsonify([dict(row) for row in options])

# API для данных карты
@app.route('/api/map-data')
def get_map_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT 
            s.id,
            s.name,
            s.address,
            s.latitude,
            s.longitude,
            COALESCE(COUNT(vd.id), 0) as visitors_today,
            ROUND(RANDOM() * 15 + 5, 1) as conversion,
            ROUND(RANDOM() * 50000 + 20000) as revenue
        FROM stores s
        LEFT JOIN store_sensors ss ON s.id = ss.store_id
        LEFT JOIN visitor_data vd ON ss.sensor_id = vd.sensor_id 
            AND DATE(vd.timestamp) = DATE('now')
        GROUP BY s.id, s.name, s.address, s.latitude, s.longitude
    ''')
    
    stores = cursor.fetchall()
    conn.close()
    
    return jsonify([dict(store) for store in stores])

if __name__ == '__main__':
    if not os.path.exists('flask_session'):
        os.makedirs('flask_session')
    
    init_db()
    app.run(host='0.0.0.0', port=1521, debug=True)
