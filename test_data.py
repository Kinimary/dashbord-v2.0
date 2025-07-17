
#!/usr/bin/env python3
import sqlite3
import random
from datetime import datetime, timedelta

def create_test_data():
    """Создает тестовые данные для демонстрации системы"""
    
    conn = sqlite3.connect('visitor_data.db')
    cursor = conn.cursor()
    
    # Очищаем старые тестовые данные
    cursor.execute('DELETE FROM visitor_data WHERE sensor_id IN (SELECT id FROM sensors WHERE name LIKE "TEST_%")')
    cursor.execute('DELETE FROM sensors WHERE name LIKE "TEST_%"')
    
    # Создаем тестовые датчики
    test_sensors = [
        ('TEST_Entrance_Main', 'Главный вход', 'active'),
        ('TEST_Entrance_Side', 'Боковой вход', 'active'),
        ('TEST_Hall_Central', 'Центральный зал', 'active'),
        ('TEST_Cashier_1', 'Касса 1', 'active'),
        ('TEST_Cashier_2', 'Касса 2', 'inactive'),
        ('TEST_VIP_Area', 'VIP зона', 'active'),
    ]
    
    sensor_ids = []
    for name, location, status in test_sensors:
        cursor.execute('''
            INSERT INTO sensors (name, location, status, last_update, visitor_count)
            VALUES (?, ?, ?, ?, ?)
        ''', (name, location, status, datetime.now(), random.randint(0, 500)))
        sensor_ids.append(cursor.lastrowid)
    
    # Создаем тестовые данные посетителей за последние 24 часа
    base_time = datetime.now() - timedelta(hours=24)
    
    for sensor_id in sensor_ids:
        for hour in range(24):
            # Имитируем разную активность в разное время
            if 9 <= hour <= 12 or 14 <= hour <= 18:  # Пиковые часы
                visitor_count = random.randint(15, 45)
            elif 19 <= hour <= 21:  # Вечерние часы
                visitor_count = random.randint(8, 25)
            else:  # Ночные и ранние утренние часы
                visitor_count = random.randint(0, 10)
            
            timestamp = base_time + timedelta(hours=hour, minutes=random.randint(0, 59))
            
            cursor.execute('''
                INSERT INTO visitor_data (sensor_id, visitor_count, timestamp)
                VALUES (?, ?, ?)
            ''', (sensor_id, visitor_count, timestamp))
    
    # Обновляем счетчики датчиков
    for sensor_id in sensor_ids:
        cursor.execute('''
            UPDATE sensors 
            SET visitor_count = (
                SELECT COALESCE(SUM(visitor_count), 0) 
                FROM visitor_data 
                WHERE sensor_id = ? AND timestamp > datetime('now', '-1 day')
            )
            WHERE id = ?
        ''', (sensor_id, sensor_id))
    
    conn.commit()
    conn.close()
    
    print("Тестовые данные созданы успешно!")
    print(f"Создано {len(test_sensors)} тестовых датчиков")
    print("Данные за последние 24 часа добавлены")

if __name__ == '__main__':
    create_test_data()
