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