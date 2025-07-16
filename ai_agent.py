
"""
AI Agent for BELWEST Visitor Management Dashboard
Предоставляет интеллектуальную аналитику и рекомендации для системы управления посетителями
"""

import sqlite3
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import statistics
import re

class BelwestAIAgent:
    def __init__(self, db_path: str = 'visitor_data.db'):
        """
        Инициализация AI агента
        
        Args:
            db_path: Путь к базе данных
        """
        self.db_path = db_path
        self.insights_cache = {}
        self.last_analysis = None
        
    def get_db_connection(self):
        """Получение соединения с базой данных"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def analyze_visitor_patterns(self, days: int = 30) -> Dict[str, Any]:
        """
        Анализ паттернов посещаемости
        
        Args:
            days: Количество дней для анализа
            
        Returns:
            Dict с результатами анализа
        """
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Получаем данные за последние дни
        cursor.execute('''
            SELECT 
                DATE(timestamp) as date,
                strftime('%H', timestamp) as hour,
                strftime('%w', timestamp) as day_of_week,
                SUM(visitor_count) as total_visitors,
                sensor_id
            FROM visitor_data
            WHERE timestamp > datetime('now', '-{} days')
            GROUP BY DATE(timestamp), strftime('%H', timestamp), sensor_id
            ORDER BY timestamp
        '''.format(days))
        
        data = cursor.fetchall()
        conn.close()
        
        if not data:
            return {'error': 'Недостаточно данных для анализа'}
        
        # Анализ пиковых часов
        hourly_traffic = {}
        daily_traffic = {}
        sensor_performance = {}
        
        for row in data:
            hour = int(row['hour'])
            day_of_week = int(row['day_of_week'])
            visitors = row['total_visitors']
            sensor_id = row['sensor_id']
            
            if hour not in hourly_traffic:
                hourly_traffic[hour] = []
            hourly_traffic[hour].append(visitors)
            
            if day_of_week not in daily_traffic:
                daily_traffic[day_of_week] = []
            daily_traffic[day_of_week].append(visitors)
            
            if sensor_id not in sensor_performance:
                sensor_performance[sensor_id] = []
            sensor_performance[sensor_id].append(visitors)
        
        # Вычисляем статистику
        peak_hours = []
        for hour, visitors_list in hourly_traffic.items():
            avg_visitors = statistics.mean(visitors_list)
            peak_hours.append({'hour': hour, 'avg_visitors': avg_visitors})
        
        peak_hours.sort(key=lambda x: x['avg_visitors'], reverse=True)
        
        # Дни недели (0 = воскресенье, 1 = понедельник, ...)
        day_names = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
        peak_days = []
        for day, visitors_list in daily_traffic.items():
            avg_visitors = statistics.mean(visitors_list)
            peak_days.append({'day': day_names[day], 'avg_visitors': avg_visitors})
        
        peak_days.sort(key=lambda x: x['avg_visitors'], reverse=True)
        
        return {
            'peak_hours': peak_hours[:3],
            'peak_days': peak_days[:3],
            'sensor_performance': sensor_performance,
            'total_analyzed_days': days,
            'analysis_timestamp': datetime.now().isoformat()
        }
    
    def generate_recommendations(self, store_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Генерация рекомендаций для улучшения работы
        
        Args:
            store_id: ID магазина для специфических рекомендаций
            
        Returns:
            Список рекомендаций
        """
        recommendations = []
        
        # Анализ паттернов посещаемости
        patterns = self.analyze_visitor_patterns()
        
        if 'error' not in patterns:
            # Рекомендации по пиковым часам
            peak_hours = patterns['peak_hours']
            if peak_hours:
                recommendations.append({
                    'type': 'staffing',
                    'priority': 'high',
                    'title': 'Оптимизация штата в пиковые часы',
                    'description': f'Пиковые часы: {", ".join([f"{h["hour"]}:00" for h in peak_hours])}. Рекомендуется увеличить количество персонала в эти часы.',
                    'impact': 'Улучшение обслуживания клиентов',
                    'category': 'operations'
                })
            
            # Рекомендации по дням недели
            peak_days = patterns['peak_days']
            if peak_days:
                recommendations.append({
                    'type': 'promotion',
                    'priority': 'medium',
                    'title': 'Специальные акции в менее загруженные дни',
                    'description': f'Самые загруженные дни: {", ".join([d["day"] for d in peak_days])}. Рекомендуется проводить акции в менее загруженные дни.',
                    'impact': 'Равномерное распределение нагрузки',
                    'category': 'marketing'
                })
        
        # Анализ датчиков
        sensor_recommendations = self.analyze_sensor_health()
        recommendations.extend(sensor_recommendations)
        
        # Рекомендации по безопасности
        security_recommendations = self.analyze_security_risks()
        recommendations.extend(security_recommendations)
        
        return recommendations
    
    def analyze_sensor_health(self) -> List[Dict[str, Any]]:
        """Анализ состояния датчиков"""
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем датчики, которые не передавали данные последние 2 часа
        cursor.execute('''
            SELECT s.id, s.name, s.location, s.last_update
            FROM sensors s
            WHERE s.last_update < datetime('now', '-2 hours')
            AND s.status = 'active'
        ''')
        
        offline_sensors = cursor.fetchall()
        recommendations = []
        
        for sensor in offline_sensors:
            recommendations.append({
                'type': 'maintenance',
                'priority': 'high',
                'title': f'Датчик "{sensor["name"]}" не отвечает',
                'description': f'Датчик в локации "{sensor["location"]}" не передает данные с {sensor["last_update"]}. Требуется проверка.',
                'impact': 'Потеря данных о посетителях',
                'category': 'technical',
                'sensor_id': sensor['id']
            })
        
        conn.close()
        return recommendations
    
    def analyze_security_risks(self) -> List[Dict[str, Any]]:
        """Анализ рисков безопасности"""
        recommendations = []
        
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Проверяем необычную активность (слишком много посетителей за короткий период)
        cursor.execute('''
            SELECT sensor_id, COUNT(*) as event_count
            FROM visitor_data
            WHERE timestamp > datetime('now', '-1 hour')
            GROUP BY sensor_id
            HAVING COUNT(*) > 50
        ''')
        
        high_activity = cursor.fetchall()
        
        for activity in high_activity:
            recommendations.append({
                'type': 'security',
                'priority': 'medium',
                'title': 'Высокая активность датчика',
                'description': f'Датчик {activity["sensor_id"]} зафиксировал {activity["event_count"]} событий за последний час. Возможна неисправность или необычная ситуация.',
                'impact': 'Потенциальная угроза безопасности',
                'category': 'security'
            })
        
        conn.close()
        return recommendations
    
    def predict_visitor_flow(self, hours_ahead: int = 24) -> Dict[str, Any]:
        """
        Прогнозирование потока посетителей
        
        Args:
            hours_ahead: Количество часов для прогноза
            
        Returns:
            Dict с прогнозом
        """
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        # Получаем исторические данные
        cursor.execute('''
            SELECT 
                strftime('%H', timestamp) as hour,
                strftime('%w', timestamp) as day_of_week,
                AVG(visitor_count) as avg_visitors
            FROM visitor_data
            WHERE timestamp > datetime('now', '-30 days')
            GROUP BY strftime('%H', timestamp), strftime('%w', timestamp)
        ''')
        
        historical_data = cursor.fetchall()
        conn.close()
        
        # Создаем прогноз на основе исторических данных
        predictions = []
        current_time = datetime.now()
        
        for i in range(hours_ahead):
            future_time = current_time + timedelta(hours=i)
            hour = future_time.hour
            day_of_week = future_time.weekday() + 1  # Преобразуем в формат SQLite
            
            # Ищем соответствующие исторические данные
            matching_data = [
                row for row in historical_data 
                if int(row['hour']) == hour and int(row['day_of_week']) == day_of_week
            ]
            
            if matching_data:
                predicted_visitors = int(matching_data[0]['avg_visitors'])
            else:
                predicted_visitors = 0
            
            predictions.append({
                'datetime': future_time.isoformat(),
                'hour': hour,
                'predicted_visitors': predicted_visitors,
                'confidence': 0.8 if matching_data else 0.3
            })
        
        return {
            'predictions': predictions,
            'generated_at': datetime.now().isoformat(),
            'confidence_note': 'Прогноз основан на исторических данных за последние 30 дней'
        }
    
    def generate_insights_report(self) -> Dict[str, Any]:
        """Генерация полного отчета с аналитикой"""
        
        # Собираем все данные
        patterns = self.analyze_visitor_patterns()
        recommendations = self.generate_recommendations()
        predictions = self.predict_visitor_flow()
        
        # Общая статистика
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                COUNT(DISTINCT sensor_id) as total_sensors,
                SUM(visitor_count) as total_visitors_today,
                COUNT(*) as total_events_today
            FROM visitor_data
            WHERE DATE(timestamp) = DATE('now')
        ''')
        
        today_stats = cursor.fetchone()
        
        cursor.execute('''
            SELECT COUNT(*) as active_sensors
            FROM sensors
            WHERE status = 'active'
        ''')
        
        active_sensors = cursor.fetchone()
        
        conn.close()
        
        report = {
            'generated_at': datetime.now().isoformat(),
            'summary': {
                'total_sensors': today_stats['total_sensors'] if today_stats else 0,
                'active_sensors': active_sensors['active_sensors'] if active_sensors else 0,
                'visitors_today': today_stats['total_visitors_today'] if today_stats else 0,
                'events_today': today_stats['total_events_today'] if today_stats else 0
            },
            'visitor_patterns': patterns,
            'recommendations': recommendations,
            'predictions': predictions,
            'ai_status': 'active',
            'last_update': datetime.now().isoformat()
        }
        
        return report
    
    def get_quick_insights(self) -> List[str]:
        """Получение быстрых инсайтов для отображения в дашборде"""
        insights = []
        
        # Анализ данных за сегодня
        conn = self.get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                strftime('%H', timestamp) as hour,
                SUM(visitor_count) as hourly_visitors
            FROM visitor_data
            WHERE DATE(timestamp) = DATE('now')
            GROUP BY strftime('%H', timestamp)
            ORDER BY hourly_visitors DESC
            LIMIT 1
        ''')
        
        peak_hour = cursor.fetchone()
        if peak_hour:
            insights.append(f"Пиковый час сегодня: {peak_hour['hour']}:00 ({peak_hour['hourly_visitors']} посетителей)")
        
        # Проверка датчиков
        cursor.execute('''
            SELECT COUNT(*) as offline_count
            FROM sensors
            WHERE last_update < datetime('now', '-2 hours')
            AND status = 'active'
        ''')
        
        offline_sensors = cursor.fetchone()
        if offline_sensors and offline_sensors['offline_count'] > 0:
            insights.append(f"⚠️ {offline_sensors['offline_count']} датчиков не отвечают")
        
        # Сравнение с вчерашним днем
        cursor.execute('''
            SELECT 
                (SELECT SUM(visitor_count) FROM visitor_data WHERE DATE(timestamp) = DATE('now')) as today,
                (SELECT SUM(visitor_count) FROM visitor_data WHERE DATE(timestamp) = DATE('now', '-1 day')) as yesterday
        ''')
        
        comparison = cursor.fetchone()
        if comparison and comparison['today'] and comparison['yesterday']:
            change = ((comparison['today'] - comparison['yesterday']) / comparison['yesterday']) * 100
            trend = "↑" if change > 0 else "↓"
            insights.append(f"Посетители {trend} {abs(change):.1f}% по сравнению с вчера")
        
        conn.close()
        
        return insights

# Функция для интеграции с Flask приложением
def create_ai_endpoints(app):
    """Создание API endpoints для AI агента"""
    
    agent = BelwestAIAgent()
    
    @app.route('/api/ai/insights')
    def get_ai_insights():
        try:
            insights = agent.get_quick_insights()
            return {'insights': insights, 'status': 'success'}
        except Exception as e:
            return {'error': str(e), 'status': 'error'}, 500
    
    @app.route('/api/ai/recommendations')
    def get_ai_recommendations():
        try:
            recommendations = agent.generate_recommendations()
            return {'recommendations': recommendations, 'status': 'success'}
        except Exception as e:
            return {'error': str(e), 'status': 'error'}, 500
    
    @app.route('/api/ai/report')
    def get_ai_report():
        try:
            report = agent.generate_insights_report()
            return {'report': report, 'status': 'success'}
        except Exception as e:
            return {'error': str(e), 'status': 'error'}, 500
    
    @app.route('/api/ai/predictions')
    def get_ai_predictions():
        try:
            hours = request.args.get('hours', 24, type=int)
            predictions = agent.predict_visitor_flow(hours)
            return {'predictions': predictions, 'status': 'success'}
        except Exception as e:
            return {'error': str(e), 'status': 'error'}, 500

if __name__ == '__main__':
    # Тестирование AI агента
    agent = BelwestAIAgent()
    
    print("=== AI Agent Test ===")
    print("\n1. Quick Insights:")
    insights = agent.get_quick_insights()
    for insight in insights:
        print(f"  - {insight}")
    
    print("\n2. Recommendations:")
    recommendations = agent.generate_recommendations()
    for rec in recommendations[:3]:  # Показать первые 3
        print(f"  - {rec['title']}: {rec['description']}")
    
    print("\n3. Visitor Patterns:")
    patterns = agent.analyze_visitor_patterns(7)
    if 'peak_hours' in patterns:
        print(f"  - Peak hours: {[h['hour'] for h in patterns['peak_hours']]}")
    
    print("\n=== AI Agent Ready ===")
