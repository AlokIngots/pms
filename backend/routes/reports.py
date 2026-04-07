from flask import Blueprint, jsonify
from db import get_db
from datetime import datetime

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/api/reports/production', methods=['GET'])
def production_report():
    db = get_db()
    cur = db.cursor()

    cur.execute("""
        SELECT grade_code, ROUND(SUM(weight_kg)/1000, 3) as total_mt
        FROM batches
        WHERE grade_code IS NOT NULL
        GROUP BY grade_code
        ORDER BY total_mt DESC
    """)
    by_grade = [{'label': r[0], 'value': float(r[1])} for r in cur.fetchall()]

    cur.execute("""
        SELECT customer, ROUND(SUM(weight_kg)/1000, 3) as total_mt
        FROM batches
        WHERE customer IS NOT NULL
        GROUP BY customer
        ORDER BY total_mt DESC
    """)
    by_customer = [{'label': r[0] or 'Unknown', 'value': float(r[1])} for r in cur.fetchall()]

    cur.execute("""
        SELECT DATE(created_at) as date, ROUND(SUM(weight_kg)/1000, 3) as total_mt
        FROM batches
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
    """)
    daily_trend = [
        {
            'label': r[0].strftime('%d %b') if isinstance(r[0], datetime) else str(r[0]),
            'value': float(r[1])
        }
        for r in cur.fetchall()
    ]

    db.close()
    return jsonify({
        'by_grade':    by_grade,
        'by_customer': by_customer,
        'daily_trend': daily_trend,
    })

@reports_bp.route('/api/reports/bottlenecks', methods=['GET'])
def bottleneck_report():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT stage,
               ROUND(AVG(duration_mins)/60, 1) as avg_hrs,
               COUNT(*) as count
        FROM stage_logs
        WHERE duration_mins IS NOT NULL
        GROUP BY stage
        ORDER BY avg_hrs DESC
    """)
    rows = cur.fetchall()
    db.close()
    return jsonify([
        {
            'stage': r[0],
            'avg':   float(r[1] or 0),
            'count': r[2]
        }
        for r in rows
    ])

@reports_bp.route('/api/reports/otd', methods=['GET'])
def otd_report():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT
            customer,
            COUNT(*) as total,
            SUM(CASE WHEN status='Dispatched' THEN 1 ELSE 0 END) as dispatched,
            SUM(CASE WHEN status='Pending' OR status='In Production' THEN 1 ELSE 0 END) as pending
        FROM sales_orders
        WHERE customer IS NOT NULL
        GROUP BY customer
        ORDER BY total DESC
    """)
    rows = cur.fetchall()
    db.close()
    return jsonify([
        {
            'customer':   r[0],
            'onTime':     int(r[2] or 0),
            'beforeTime': 0,
            'delayed':    int(r[3] or 0),
        }
        for r in rows
    ])

@reports_bp.route('/api/reports/quality', methods=['GET'])
def quality_report():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT
            grade,
            COUNT(*) as total,
            SUM(CASE WHEN result='OK' THEN 1 ELSE 0 END) as passed,
            SUM(CASE WHEN result='Not OK' THEN 1 ELSE 0 END) as failed
        FROM qc_records
        WHERE grade IS NOT NULL
        GROUP BY grade
        ORDER BY total DESC
    """)
    rows = cur.fetchall()
    db.close()
    return jsonify([
        {
            'grade':    r[0],
            'produced': int(r[1] or 0),
            'rejected': int(r[3] or 0),
        }
        for r in rows
    ])

@reports_bp.route('/api/reports/alerts', methods=['GET'])
def alerts_report():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT
            stage,
            COUNT(*) as total_alerts,
            AVG(TIMESTAMPDIFF(MINUTE, created_at, acknowledged_at)/60) as avg_ack_hrs,
            SUM(CASE WHEN acknowledged=0 THEN 1 ELSE 0 END) as unresolved
        FROM alerts
        WHERE stage IS NOT NULL
        GROUP BY stage
        ORDER BY total_alerts DESC
    """)
    rows = cur.fetchall()
    db.close()
    return jsonify([
        {
            'stage':           r[0],
            'alerts':          int(r[1] or 0),
            'avgAckHrs':       round(float(r[2] or 0), 1),
            'repeatOffenders': int(r[3] or 0),
        }
        for r in rows
    ])