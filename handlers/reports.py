from flask import Blueprint, render_template, jsonify, request
from datetime import datetime
import os
import sqlite3
import csv
import xlsxwriter

reports = Blueprint('reports', __name__)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'visitor_data.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    return conn

@reports.route('/api/reports', methods=['GET'])
def get_reports_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT device_id, location, status, received_at
        FROM visitor_counts
        ORDER BY received_at DESC
    ''')
    
    data = []
    for row in cursor.fetchall():
        data.append({
            'device_id': row[0],
            'location': row[1],
            'status': row[2],
            'received_at': row[3]
        })
    
    conn.close()
    return jsonify(data)

@reports.route('/api/export', methods=['POST'])
def export_data():
    import io
    from flask import Response
    
    data_format = request.form.get('format', 'csv')
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT device_id, count, timestamp, status, received_at, location
        FROM visitor_counts
        WHERE 1=1
    '''
    
    params = []
    if start_date:
        query += ' AND DATE(received_at) >= ?'
        params.append(start_date)
    
    if end_date:
        query += ' AND DATE(received_at) <= ?'
        params.append(end_date)
    
    query += ' ORDER BY received_at DESC'
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if data_format == 'csv':
        filename = f'report_{timestamp}.csv'
        filepath = os.path.join('static', filename)
        
        # Создаем директорию static если её нет
        os.makedirs('static', exist_ok=True)
        
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Device ID', 'Count', 'Timestamp', 'Status', 'Received At', 'Location'])
            for row in rows:
                writer.writerow(row)
                
    elif data_format == 'xlsx':
        filename = f'report_{timestamp}.xlsx'
        filepath = os.path.join('static', filename)
        
        # Создаем директорию static если её нет
        os.makedirs('static', exist_ok=True)
        
        workbook = xlsxwriter.Workbook(filepath)
        worksheet = workbook.add_worksheet()
        
        # Заголовки
        headers = ['Device ID', 'Count', 'Timestamp', 'Status', 'Received At', 'Location']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)
        
        # Данные
        for row_idx, row in enumerate(rows, start=1):
            for col, value in enumerate(row):
                worksheet.write(row_idx, col, value)
        
        workbook.close()
        
    elif data_format == 'pdf':
        # Базовая поддержка PDF (можно расширить)
        filename = f'report_{timestamp}.txt'
        filepath = os.path.join('static', filename)
        
        os.makedirs('static', exist_ok=True)
        
        with open(filepath, 'w', encoding='utf-8') as txtfile:
            txtfile.write('BELWEST - Отчет по посещаемости\n')
            txtfile.write('=' * 50 + '\n\n')
            txtfile.write(f'Период: {start_date} - {end_date}\n')
            txtfile.write(f'Дата создания: {datetime.now().strftime("%d.%m.%Y %H:%M:%S")}\n\n')
            txtfile.write('Device ID\tCount\tTimestamp\tStatus\tReceived At\tLocation\n')
            txtfile.write('-' * 80 + '\n')
            for row in rows:
                txtfile.write('\t'.join(str(x) for x in row) + '\n')
    else:
        return jsonify({'error': 'Неподдерживаемый формат'}), 400
    
    return jsonify({
        'message': 'Отчет успешно сгенерирован',
        'filename': filename,
        'format': data_format
    })
def export_data():
    data_format = request.form.get('format', 'csv')
    start_date = request.form.get('start_date')
    end_date = request.form.get('end_date')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT device_id, count, timestamp, status, received_at, location
        FROM visitor_counts
        WHERE received_at BETWEEN ? AND ?
    '''
    cursor.execute(query, (start_date, end_date))
    
    rows = cursor.fetchall()
    conn.close()
    
    if data_format == 'csv':
        filename = 'reports.csv'
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', filename)
        with open(filepath, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Device ID', 'Count', 'Timestamp', 'Status', 'Received At', 'Location'])
            for row in rows:
                writer.writerow(row)
    elif data_format == 'xlsx':
        filename = 'reports.xlsx'
        filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', filename)
        workbook = xlsxwriter.Workbook(filepath)
        worksheet = workbook.add_worksheet()
        worksheet.write_row(0, 0, ['Device ID', 'Count', 'Timestamp', 'Status', 'Received At', 'Location'])
        for row_idx, row in enumerate(rows, start=1):
            worksheet.write_row(row_idx, 0, row)
        workbook.close()
    else:
        return jsonify({'error': 'Unsupported format'}), 400
    
    return jsonify({
        'message': 'Data exported successfully',
        'filename': filename,
        'format': data_format
    })