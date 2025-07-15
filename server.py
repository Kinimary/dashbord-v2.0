from flask import Flask, render_template, request, jsonify, redirect, url_for, session, flash
from flask_session import Session
from werkzeug.middleware.proxy_fix import ProxyFix
import sqlite3
import hashlib
import os
from datetime import datetime, timedelta
import json
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

    # Create tables
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

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS visitor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id INTEGER,
            visitor_count INTEGER DEFAULT 0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sensor_id) REFERENCES sensors (id)
        )
    ''')

    # Create default admin user
    admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
    cursor.execute('''
        INSERT OR IGNORE INTO users (username, password, email, role) 
        VALUES (?, ?, ?, ?)
    ''', ('admin', admin_password, 'admin@belwest.com', 'admin'))

    # Create sample sensors
    sample_sensors = [
        ('Главный вход', 'Центральный вход в здание', 'active'),
        ('Боковой вход', 'Боковой вход со стороны парковки', 'active'),
        ('Офис менеджера', 'Вход в офис менеджера', 'inactive'),
        ('Склад', 'Вход на склад', 'active')
    ]

    for sensor in sample_sensors:
        cursor.execute('''
            INSERT OR IGNORE INTO sensors (name, location, status) 
            VALUES (?, ?, ?)
        ''', sensor)

    conn.commit()
    conn.close()

# Authentication decorator
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    # If user is already logged in, redirect to dashboard
    if 'user_id' in session:
        return redirect(url_for('index'))
        
    if request.method == 'POST':
        username = request.form['username']
        password = hashlib.sha256(request.form['password'].encode()).hexdigest()

        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()
        cursor.execute('SELECT id, username, role FROM users WHERE username = ? AND password = ?', 
                      (username, password))
        user = cursor.fetchone()
        conn.close()

        if user:
            session['user_id'] = user[0]
            session['username'] = user[1]
            session['role'] = user[2]
            session.permanent = True
            return redirect(url_for('index'))
        else:
            flash('Неверный логин или пароль')
            return render_template('login.html'), 401

    return render_template('login.html')

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = hashlib.sha256(data.get('password').encode()).hexdigest()

    conn = sqlite3.connect('visitor_data.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, role FROM users WHERE username = ? AND password = ?', 
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
def settings_page():
    return render_template('settings.html')

@app.route('/profile')
@login_required
def profile_page():
    return render_template('profile.html')

@app.route('/api/sensor-data')
@login_required
def get_sensor_data():
    try:
        conn = sqlite3.connect('visitor_data.db')
        cursor = conn.cursor()

        # Get sensor statistics
        cursor.execute('''
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
                   SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive
            FROM sensors
        ''')
        sensors_stats = cursor.fetchone()

        # Get today's visitors
        cursor.execute('''
            SELECT COALESCE(SUM(visitor_count), 0) as today_visitors
            FROM visitor_data 
            WHERE DATE(timestamp) = DATE('now')
        ''')
        today_visitors = cursor.fetchone()[0]

        # Get sensors data
        cursor.execute('''
            SELECT s.name, s.location, s.status, s.visitor_count,
                   COALESCE(s.last_update, 'Никогда') as last_update
            FROM sensors s
            ORDER BY s.name
        ''')
        sensors_data = cursor.fetchall()

        # Generate sample hourly data
        import random
        hourly_visitors = [random.randint(0, 50) for _ in range(24)]

        # Generate sample recent activity
        recent_activity = [
            {
                'type': 'visitor',
                'title': 'Новый посетитель',
                'description': 'Зарегистрирован через главный вход',
                'time': '5 минут назад'
            },
            {
                'type': 'sensor',
                'title': 'Датчик подключен',
                'description': 'Боковой вход - статус онлайн',
                'time': '10 минут назад'
            },
            {
                'type': 'system',
                'title': 'Система обновлена',
                'description': 'Обновление до версии 2.1.4',
                'time': '1 час назад'
            }
        ]

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
            'today_visitors': today_visitors,
            'active_sensors': sensors_stats[1] if sensors_stats else 0,
            'avg_hourly': round(today_visitors / 24, 1) if today_visitors > 0 else 0,
            'peak_time': '14:30',
            'peak_count': max(hourly_visitors) if hourly_visitors else 0,
            'today_change': random.randint(-5, 15),
            'sensors_status': 'online' if sensors_stats and sensors_stats[1] > 0 else 'offline',
            'new_visitors': random.randint(10, 50),
            'returning_visitors': random.randint(20, 80),
            'new_visitors_change': random.randint(-10, 20),
            'returning_visitors_change': random.randint(-15, 25),
            'hourly_visitors': hourly_visitors,
            'sensors_stats': {
                'online': sensors_stats[1] if sensors_stats else 0,
                'offline': sensors_stats[2] if sensors_stats else 0
            },
            'recent_activity': recent_activity,
            'sensors': sensors_formatted
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
            'sensors_stats': {'online': 0, 'offline': 0},
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