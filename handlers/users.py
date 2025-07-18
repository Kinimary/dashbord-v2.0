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
    from flask import session

    # Устанавливаем фиктивную сессию для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'

    # Check if user has permission to view users
    user_role = session.get('role')
    user_id = session.get('user_id')

    if user_role not in ['admin', 'manager', 'rd', 'tu']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    # Get role filter from query parameters
    role_filter = request.args.get('role')

    conn = get_db_connection()
    cursor = conn.cursor()

    # Build query based on permissions and filters
    if user_role == 'admin':
        if role_filter:
            cursor.execute('''
                SELECT id, username, email, role, created_at 
                FROM users
                WHERE role = ?
            ''', (role_filter,))
        else:
            cursor.execute('''
                SELECT id, username, email, role, created_at 
                FROM users
            ''')
    elif user_role == 'manager':
        if role_filter and role_filter in ['rd', 'tu', 'store']:
            cursor.execute('''
                SELECT id, username, email, role, created_at 
                FROM users
                WHERE role = ?
            ''', (role_filter,))
        else:
            cursor.execute('''
                SELECT id, username, email, role, created_at 
                FROM users
                WHERE role IN ('rd', 'tu', 'store')
            ''')
    elif user_role == 'rd':
        if role_filter and role_filter in ['tu', 'store']:
            cursor.execute('''
                SELECT id, username, email, role, created_at 
                FROM users
                WHERE role = ?
            ''', (role_filter,))
        else:
            cursor.execute('''
                SELECT id, username, email, role, created_at 
                FROM users
                WHERE role IN ('tu', 'store')
            ''')
    elif user_role == 'tu':
        cursor.execute('''
            SELECT id, username, email, role, created_at 
            FROM users
            WHERE role = 'store'
        ''')

    users_list = []
    for row in cursor.fetchall():
        # Get sensors for each user
        cursor.execute('''
            SELECT s.id, s.name FROM sensors s
            JOIN user_sensors us ON s.id = us.sensor_id
            WHERE us.user_id = ?
        ''', (row[0],))
        sensors = [{'id': s[0], 'name': s[1]} for s in cursor.fetchall()]

        users_list.append({
            'id': row[0],
            'username': row[1],
            'email': row[2],
            'role': row[3],
            'created_at': row[4],
            'sensors': sensors
        })

    conn.close()
    return jsonify(users_list)

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
    from flask import session

    # Устанавливаем фиктивную сессию для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'

    # Check permissions
    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()

    required_fields = ['username', 'email', 'role']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    username = data['username']
    email = data['email']
    role = data['role']
    password = data.get('password', '')

    # Password is required for new users
    if not password or password.strip() == '':
        return jsonify({'error': 'Password is required for new users'}), 400

    # Role restrictions
    if user_role == 'manager' and role == 'admin':
        return jsonify({'error': 'Менеджер не может создавать администраторов'}), 403

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
    from flask import session

    # Устанавливаем фиктивную сессию для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'

    # Check permissions
    user_role = session.get('role')
    current_user_id = session.get('user_id')

    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 400

    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Проверка существования пользователя и его роли
        cursor.execute('SELECT id, role FROM users WHERE id = ?', (user_id,))
        target_user = cursor.fetchone()
        if not target_user:
            return jsonify({'error': 'User not found'}), 404

        target_user_role = target_user[1]

        # Prevent self-modification of critical fields for non-admins
        if user_role == 'manager':
            if target_user_role == 'admin':
                return jsonify({'error': 'Менеджер не может изменять администраторов'}), 403
            if 'role' in data and data['role'] == 'admin':
                return jsonify({'error': 'Менеджер не может назначать роль администратора'}), 403

        # Prevent users from changing their own role (except admin)
        if user_id == current_user_id and user_role != 'admin' and 'role' in data:
            return jsonify({'error': 'Нельзя изменить собственную роль'}), 403

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
    from flask import session

    # Устанавливаем фиктивную сессию для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('DELETE FROM user_sensors WHERE user_id = ?', (user_id,))
        cursor.execute('DELETE FROM user_hierarchy WHERE parent_id = ? OR child_id = ?', (user_id, user_id))
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
    """Get all sensors for assignment"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            SELECT id, name, location, status, last_update
            FROM sensors
            ORDER BY name
        ''')

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
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/sensors', methods=['POST'])
def create_sensor():
    """Create a new sensor"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    data = request.get_json()

    if not data.get('name') or not data.get('location'):
        return jsonify({'error': 'Название и местоположение обязательны'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO sensors (name, location, status, last_update)
            VALUES (?, ?, ?, ?)
        ''', (data['name'], data['location'], data.get('status', 'active'), datetime.now().isoformat()))

        sensor_id = cursor.lastrowid
        conn.commit()
        return jsonify({'message': 'Sensor created', 'id': sensor_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/sensors/<int:sensor_id>', methods=['PUT'])
def update_sensor(sensor_id):
    """Update sensor information"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    data = request.get_json()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        update_fields = []
        update_values = []

        if 'name' in data:
            update_fields.append('name = ?')
            update_values.append(data['name'])

        if 'location' in data:
            update_fields.append('location = ?')
            update_values.append(data['location'])

        if 'status' in data:
            update_fields.append('status = ?')
            update_values.append(data['status'])

        update_fields.append('last_update = ?')
        update_values.append(datetime.now().isoformat())

        update_values.append(sensor_id)

        if update_fields:
            cursor.execute(f'''
                UPDATE sensors
                SET {', '.join(update_fields)}
                WHERE id = ?
            ''', update_values)

        conn.commit()
        return jsonify({'message': 'Sensor updated'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/sensors/<int:sensor_id>', methods=['DELETE'])
def delete_sensor(sensor_id):
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Remove sensor assignments first
        cursor.execute('DELETE FROM user_sensors WHERE sensor_id = ?', (sensor_id,))

        # Remove sensor data
        cursor.execute('DELETE FROM visitor_data WHERE sensor_id = ?', (sensor_id,))
        cursor.execute('DELETE FROM hourly_statistics WHERE sensor_id = ?', (sensor_id,))
        cursor.execute('DELETE FROM sensor_downtime WHERE sensor_id = ?', (sensor_id,))

        # Remove sensor itself
        cursor.execute('DELETE FROM sensors WHERE id = ?', (sensor_id,))

        conn.commit()
        return jsonify({'message': 'Sensor deleted'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/user-hierarchy', methods=['GET'])
def get_user_hierarchy():
    """Get all hierarchy relationships"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            SELECT 
                uh.id,
                uh.parent_id,
                uh.child_id,
                uh.hierarchy_type,
                parent.username as parent_name,
                parent.role as parent_role,
                child.username as child_name,
                child.role as child_role
            FROM user_hierarchy uh
            JOIN users parent ON uh.parent_id = parent.id
            JOIN users child ON uh.child_id = child.id
            ORDER BY parent.username, child.username
        ''')

        hierarchies = []
        for row in cursor.fetchall():
            hierarchies.append({
                'id': row[0],
                'parent_id': row[1],
                'child_id': row[2],
                'hierarchy_type': row[3],
                'parent_name': row[4],
                'parent_role': row[5],
                'child_name': row[6],
                'child_role': row[7]
            })

        return jsonify(hierarchies)
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/user-hierarchy', methods=['POST'])
def create_user_hierarchy():
    """Create hierarchy relationship between users"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    data = request.get_json()

    if not data.get('parent_id') or not data.get('child_id'):
        return jsonify({'error': 'Parent ID и Child ID обязательны'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Проверяем роли пользователей для валидации иерархии
        cursor.execute('SELECT role FROM users WHERE id = ?', (data['parent_id'],))
        parent_role = cursor.fetchone()

        cursor.execute('SELECT role FROM users WHERE id = ?', (data['child_id'],))
        child_role = cursor.fetchone()

        if not parent_role or not child_role:
            return jsonify({'error': 'Пользователь не найден'}), 404

        parent_role = parent_role[0]
        child_role = child_role[0]

        # Валидация иерархии ролей
        valid_hierarchies = {
            'manager': ['rd', 'tu', 'store'],
            'rd': ['tu', 'store'],
            'tu': ['store']
        }

        if parent_role not in valid_hierarchies or child_role not in valid_hierarchies[parent_role]:
            return jsonify({'error': 'Недопустимая иерархия ролей'}), 400

        # Проверяем, не существует ли уже такая связь
        cursor.execute('''
            SELECT id FROM user_hierarchy 
            WHERE parent_id = ? AND child_id = ?
        ''', (data['parent_id'], data['child_id']))

        if cursor.fetchone():
            return jsonify({'error': 'Иерархическая связь уже существует'}), 400

        hierarchy_type = f"{parent_role}-{child_role}"

        cursor.execute('''
            INSERT INTO user_hierarchy (parent_id, child_id, hierarchy_type, created_at)
            VALUES (?, ?, ?, ?)
        ''', (data['parent_id'], data['child_id'], hierarchy_type, datetime.now().isoformat()))

        hierarchy_id = cursor.lastrowid
        conn.commit()

        return jsonify({'message': 'Иерархическая связь создана', 'id': hierarchy_id}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/user-hierarchy/<int:hierarchy_id>', methods=['DELETE'])
def delete_user_hierarchy(hierarchy_id):
    """Delete hierarchy relationship"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('DELETE FROM user_hierarchy WHERE id = ?', (hierarchy_id,))
        conn.commit()
        return jsonify({'message': 'Иерархическая связь удалена'}), 200
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/accessible-users/<int:user_id>', methods=['GET'])
def get_accessible_users(user_id):
    """Get users accessible to a specific user based on hierarchy"""
    from flask import session

    user_role = session.get('role')
    current_user_id = session.get('user_id')

    if user_role not in ['admin', 'manager', 'rd', 'tu'] and current_user_id != user_id:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Получаем пользователей, доступных данному пользователю через иерархию
        cursor.execute('''
            SELECT 
                u.id,
                u.username,
                u.email,
                u.role,
                u.created_at
            FROM users u
            JOIN user_hierarchy uh ON u.id = uh.child_id
            WHERE uh.parent_id = ?
            ORDER BY u.username
        ''', (user_id,))

        accessible_users = []
        for row in cursor.fetchall():
            accessible_users.append({
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'role': row[3],
                'created_at': row[4]
            })

        return jsonify(accessible_users)
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/hierarchy-candidates/<int:parent_id>', methods=['GET'])
def get_hierarchy_candidates(parent_id):
    """Get potential child users for hierarchy based on parent role"""
    from flask import session

    # Устанавливаем фиктивную сессию для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Получаем роль родительского пользователя
        cursor.execute('SELECT role FROM users WHERE id = ?', (parent_id,))
        parent_user = cursor.fetchone()

        if not parent_user:
            return jsonify({'error': 'Родительский пользователь не найден'}), 404

        parent_role = parent_user[0]

        # Определяем допустимые роли для подчиненных
        valid_child_roles = {
            'manager': ['rd', 'tu', 'store'],
            'rd': ['tu', 'store'],
            'tu': ['store']
        }

        if parent_role not in valid_child_roles:
            return jsonify([])

        roles_filter = "', '".join(valid_child_roles[parent_role])

        # Получаем пользователей, которые могут быть подчиненными и еще не связаны
        cursor.execute(f'''
            SELECT u.id, u.username, u.email, u.role
            FROM users u
            WHERE u.role IN ('{roles_filter}')
            AND u.id != ?
            AND u.id NOT IN (
                SELECT child_id FROM user_hierarchy WHERE parent_id = ?
            )
            ORDER BY u.username
        ''', (parent_id, parent_id))

        candidates = []
        for row in cursor.fetchall():
            candidates.append({
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'role': row[3]
            })

        return jsonify(candidates)
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

# API для управления ролями и правами доступа
@users.route('/api/user-sensors/<int:user_id>', methods=['GET'])
def get_user_sensors(user_id):
    """Get available and assigned sensors for a user"""
    from flask import session

    # Устанавливаем фиктивную сессию для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get assigned sensors
        cursor.execute('''
            SELECT s.id, s.name, s.location, s.status
            FROM sensors s
            JOIN user_sensors us ON s.id = us.sensor_id
            WHERE us.user_id = ?
        ''', (user_id,))
        
        assigned = []
        for row in cursor.fetchall():
            assigned.append({
                'id': row[0],
                'name': row[1],
                'location': row[2],
                'status': row[3]
            })

        # Get available sensors (not assigned to this user)
        cursor.execute('''
            SELECT s.id, s.name, s.location, s.status
            FROM sensors s
            WHERE s.id NOT IN (
                SELECT sensor_id FROM user_sensors WHERE user_id = ?
            )
        ''', (user_id,))
        
        available = []
        for row in cursor.fetchall():
            available.append({
                'id': row[0],
                'name': row[1],
                'location': row[2],
                'status': row[3]
            })

        return jsonify({
            'assigned': assigned,
            'available': available
        })
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/assign-sensors', methods=['POST'])
def assign_sensors():
    """Assign sensors to a user"""
    from flask import session

    # Устанавливаем фиктивную сессию для отладки
    if 'user_id' not in session:
        session['user_id'] = 1
        session['username'] = 'admin'
        session['role'] = 'admin'

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    data = request.get_json()
    user_id = data.get('user_id')
    sensor_ids = data.get('sensor_ids', [])

    if not user_id or not sensor_ids:
        return jsonify({'error': 'Missing required data'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        for sensor_id in sensor_ids:
            cursor.execute('''
                INSERT OR IGNORE INTO user_sensors (user_id, sensor_id)
                VALUES (?, ?)
            ''', (user_id, sensor_id))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Sensors assigned successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/unassign-sensors', methods=['POST'])
def unassign_sensors():
    """Unassign sensors from a user"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    data = request.get_json()
    user_id = data.get('user_id')
    sensor_ids = data.get('sensor_ids', [])

    if not user_id or not sensor_ids:
        return jsonify({'error': 'Missing required data'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        for sensor_id in sensor_ids:
            cursor.execute('''
                DELETE FROM user_sensors 
                WHERE user_id = ? AND sensor_id = ?
            ''', (user_id, sensor_id))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Sensors unassigned successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/hierarchy', methods=['GET'])
def get_hierarchy():
    """Get hierarchy relationships"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            SELECT 
                uh.parent_id,
                uh.child_id,
                parent.username as parent_username,
                parent.role as parent_role,
                child.username as child_username,
                child.role as child_role
            FROM user_hierarchy uh
            JOIN users parent ON uh.parent_id = parent.id
            JOIN users child ON uh.child_id = child.id
            ORDER BY parent.username, child.username
        ''')

        hierarchy = []
        for row in cursor.fetchall():
            hierarchy.append({
                'parent_id': row[0],
                'child_id': row[1],
                'parent_username': row[2],
                'parent_role': row[3],
                'child_username': row[4],
                'child_role': row[5]
            })

        return jsonify(hierarchy)
    except Exception as e:
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/hierarchy', methods=['POST'])
def create_hierarchy():
    """Create hierarchy relationship"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    data = request.get_json()
    parent_id = data.get('parent_id')
    child_id = data.get('child_id')

    if not parent_id or not child_id:
        return jsonify({'error': 'Missing required data'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT OR IGNORE INTO user_hierarchy (parent_id, child_id, hierarchy_type, created_at)
            VALUES (?, ?, 'hierarchical', ?)
        ''', (parent_id, child_id, datetime.now().isoformat()))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Hierarchy created successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/hierarchy', methods=['DELETE'])
def delete_hierarchy():
    """Delete hierarchy relationship"""
    from flask import session

    user_role = session.get('role')
    if user_role not in ['admin', 'manager']:
        return jsonify({'error': 'Недостаточно прав доступа'}), 403

    data = request.get_json()
    parent_id = data.get('parent_id')
    child_id = data.get('child_id')

    if not parent_id or not child_id:
        return jsonify({'error': 'Missing required data'}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            DELETE FROM user_hierarchy 
            WHERE parent_id = ? AND child_id = ?
        ''', (parent_id, child_id))
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Hierarchy deleted successfully'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': 'Database error'}), 500
    finally:
        conn.close()

@users.route('/api/user-permissions', methods=['GET'])
def get_user_permissions():
    """Get detailed user permissions based on role"""
    from flask import session

    user_role = session.get('role')
    user_id = session.get('user_id')

    if not user_role:
        return jsonify({'error': 'Не авторизован'}), 401

    permissions = {
        'admin': {
            'can_create_users': True,
            'can_edit_users': True,
            'can_delete_users': True,
            'can_manage_sensors': True,
            'can_view_reports': True,
            'can_manage_hierarchy': True,
            'accessible_roles': ['admin', 'manager', 'rd', 'tu', 'store']
        },
        'manager': {
            'can_create_users': True,
            'can_edit_users': True,
            'can_delete_users': True,
            'can_manage_sensors': True,
            'can_view_reports': True,
            'can_manage_hierarchy': True,
            'accessible_roles': ['rd', 'tu', 'store']
        },
        'rd': {
            'can_create_users': False,
            'can_edit_users': False,
            'can_delete_users': False,
            'can_manage_sensors': False,
            'can_view_reports': True,
            'can_manage_hierarchy': False,
            'accessible_roles': ['tu', 'store']
        },
        'tu': {
            'can_create_users': False,
            'can_edit_users': False,
            'can_delete_users': False,
            'can_manage_sensors': False,
            'can_view_reports': True,
            'can_manage_hierarchy': False,
            'accessible_roles': ['store']
        },
        'store': {
            'can_create_users': False,
            'can_edit_users': False,
            'can_delete_users': False,
            'can_manage_sensors': False,
            'can_view_reports': True,
            'can_manage_hierarchy': False,
            'accessible_roles': []
        }
    }

    return jsonify({
        'user_id': user_id,
        'role': user_role,
        'permissions': permissions.get(user_role, permissions['store'])
    })