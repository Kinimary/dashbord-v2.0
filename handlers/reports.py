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
    data = request.get_json()
    export_format = data.get('format', 'csv')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = '''
        SELECT 
            s.name as sensor_name,
            s.location,
            vd.visitor_count,
            vd.timestamp
        FROM visitor_data vd
        JOIN sensors s ON vd.sensor_id = s.id
        WHERE 1=1
    '''
    
    params = []
    if start_date:
        query += ' AND DATE(vd.timestamp) >= ?'
        params.append(start_date)
    
    if end_date:
        query += ' AND DATE(vd.timestamp) <= ?'
        params.append(end_date)
    
    query += ' ORDER BY vd.timestamp DESC'
    
    cursor.execute(query, params)
    results = cursor.fetchall()
    conn.close()
    
    if export_format == 'csv':
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Заголовки
        writer.writerow(['Датчик', 'Местоположение', 'Количество посетителей', 'Время'])
        
        # Данные
        for row in results:
            writer.writerow([row[0], row[1], row[2], row[3]])
        
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment;filename=report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'}
        )
    
    elif export_format == 'excel':
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output)
        worksheet = workbook.add_worksheet()
        
        # Заголовки
        headers = ['Датчик', 'Местоположение', 'Количество посетителей', 'Время']
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)
        
        # Данные
        for row_num, row_data in enumerate(results, 1):
            for col, value in enumerate(row_data):
                worksheet.write(row_num, col, value)
        
        workbook.close()
        output.seek(0)
        
        return Response(
            output.getvalue(),
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment;filename=report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'}
        )
    
    return jsonify({'error': 'Неподдерживаемый формат экспорта'}), 400
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