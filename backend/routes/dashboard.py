from flask import Blueprint, jsonify
from db import get_db, rows_to_list
from datetime import datetime

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard/summary', methods=['GET'])
def get_summary():
    db = get_db()
    cur = db.cursor()

    cur.execute("SELECT COUNT(*) FROM batches")
    total_batches = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM batches WHERE priority='Critical'")
    critical = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM batches WHERE priority='Warning'")
    warning = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM batches WHERE priority='On Track'")
    on_track = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM sales_orders")
    total_orders = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM dispatches")
    total_dispatches = cur.fetchone()[0]

    cur.execute("SELECT COALESCE(SUM(weight_kg),0) FROM batches")
    total_mt = float(cur.fetchone()[0]) / 1000

    cur.execute("""
        SELECT current_stage, COUNT(*) as count
        FROM batches
        GROUP BY current_stage
    """)
    stage_dist = {row[0]: row[1] for row in cur.fetchall()}

    cur.execute("""
        SELECT * FROM batches
        WHERE priority='Critical'
        ORDER BY created_at DESC
        LIMIT 10
    """)
    critical_batches = rows_to_list(cur)
    for b in critical_batches:
        if isinstance(b.get('created_at'), datetime):
            b['created_at'] = b['created_at'].isoformat()
        if b.get('weight_kg'):
            b['weight_kg'] = float(b['weight_kg'])
        if b.get('size_mm'):
            b['size_mm'] = float(b['size_mm'])

    cur.execute("""
        SELECT * FROM batches
        ORDER BY created_at DESC
        LIMIT 20
    """)
    recent_batches = rows_to_list(cur)
    for b in recent_batches:
        if isinstance(b.get('created_at'), datetime):
            b['created_at'] = b['created_at'].isoformat()
        if b.get('weight_kg'):
            b['weight_kg'] = float(b['weight_kg'])
        if b.get('size_mm'):
            b['size_mm'] = float(b['size_mm'])

    db.close()
    return jsonify({
        'total_batches':      total_batches,
        'critical':           critical,
        'warning':            warning,
        'on_track':           on_track,
        'total_orders':       total_orders,
        'total_dispatches':   total_dispatches,
        'total_mt':           round(total_mt, 3),
        'stage_distribution': stage_dist,
        'critical_batches':   critical_batches,
        'recent_batches':     recent_batches,
    })