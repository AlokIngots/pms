from flask import Blueprint, jsonify
from db import get_db, rows_to_list
from datetime import datetime

logs_bp = Blueprint('logs', __name__)

@logs_bp.route('/api/production-log', methods=['GET'])
def get_production_log():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT sl.*, b.batch_card_no, b.grade_code,
               b.size_mm, b.customer, b.priority,
               b.weight_kg, b.no_of_pcs
        FROM stage_logs sl
        JOIN batches b ON b.id = sl.batch_id
        ORDER BY sl.logged_at DESC
    """)
    logs = rows_to_list(cur)
    for log in logs:
        for field in ['started_at','completed_at','logged_at']:
            if isinstance(log.get(field), datetime):
                log[field] = log[field].isoformat()
    db.close()
    return jsonify(logs)

@logs_bp.route('/api/material-log', methods=['GET'])
def get_material_log():
    db = get_db()
    cur = db.cursor()
    cur.execute("""
        SELECT * FROM batches
        ORDER BY current_stage_index ASC, created_at DESC
    """)
    batches = rows_to_list(cur)
    for b in batches:
        for field in ['created_at']:
            if isinstance(b.get(field), datetime):
                b[field] = b[field].isoformat()
        if b.get('weight_kg'):
            b['weight_kg'] = float(b['weight_kg'])
        if b.get('size_mm'):
            b['size_mm'] = float(b['size_mm'])
    db.close()
    return jsonify(batches)

@logs_bp.route('/api/alerts', methods=['GET'])
def get_alerts():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM alerts ORDER BY created_at DESC")
    alerts = rows_to_list(cur)
    for a in alerts:
        if isinstance(a.get('created_at'), datetime):
            a['created_at'] = a['created_at'].isoformat()
        if isinstance(a.get('acknowledged_at'), datetime):
            a['acknowledged_at'] = a['acknowledged_at'].isoformat()
    db.close()
    return jsonify(alerts)

@logs_bp.route('/api/alerts/<int:aid>/acknowledge', methods=['PUT'])
def acknowledge_alert(aid):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE alerts
            SET acknowledged=1, acknowledged_at=%s
            WHERE id=%s
        """, (datetime.now(), aid))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()