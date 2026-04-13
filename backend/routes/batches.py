from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime

batches_bp = Blueprint('batches', __name__)

STAGE_ORDER = [
    'RM Receive', 'UT Inspection', 'HT Process', 'Black Bar Str.',
    'Peeling', 'Bright Bar Str.', 'Grinding', 'Cutting',
    'Chamfering', 'Polishing', 'MPI Final', 'Packing', 'Dispatch'
]

@batches_bp.route('/api/batches', methods=['GET'])
def get_batches():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM batches ORDER BY created_at DESC")
    batches = rows_to_list(cur)
    for batch in batches:
        cur.execute("SELECT * FROM stage_logs WHERE batch_id=%s ORDER BY logged_at", (batch['id'],))
        batch['stage_logs'] = rows_to_list(cur)
        if isinstance(batch.get('created_at'), datetime):
            batch['created_at'] = batch['created_at'].isoformat()
        if batch.get('weight_kg'):
            batch['weight_kg'] = float(batch['weight_kg'])
        if batch.get('size_mm'):
            batch['size_mm'] = float(batch['size_mm'])
    db.close()
    return jsonify(batches)

@batches_bp.route('/api/batches', methods=['POST'])
def create_batch():
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO batches (
                batch_card_no, so_id, heat_no, grade_code,
                size_mm, no_of_pcs, weight_kg,
                ht_process, bb_process, tolerance,
                colour_code, prepared_by, customer,
                shed, current_stage, current_stage_index,
                status, priority
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            d.get('batch_card_no'), d.get('so_id'), d.get('heat_no'), d.get('grade_code'),
            d.get('size_mm'), d.get('no_of_pcs'), d.get('weight_kg'),
            d.get('ht_process'), d.get('bb_process'), d.get('tolerance'),
            d.get('colour_code'), d.get('prepared_by'), d.get('customer'),
            d.get('shed'), d.get('current_stage', 'RM Receive'),
            d.get('current_stage_index', 0), d.get('status', 'In Progress'), d.get('priority', 'On Track'),
        ))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@batches_bp.route('/api/batches/<int:bid>', methods=['GET'])
def get_batch(bid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM batches WHERE id=%s", (bid,))
    batch = row_to_dict(cur, cur.fetchone())
    if not batch:
        return jsonify({'error': 'Not found'}), 404
    cur.execute("SELECT * FROM stage_logs WHERE batch_id=%s ORDER BY logged_at", (bid,))
    batch['stage_logs'] = rows_to_list(cur)
    db.close()
    return jsonify(batch)

@batches_bp.route('/api/batches/<int:bid>/stage', methods=['PUT'])
def update_stage(bid):
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        stage = d.get('current_stage')
        stage_idx = STAGE_ORDER.index(stage) if stage in STAGE_ORDER else 0
        cur.execute("""
            UPDATE batches SET current_stage=%s, current_stage_index=%s, priority=%s, status=%s WHERE id=%s
        """, (stage, stage_idx, d.get('priority', 'On Track'), d.get('status', 'In Progress'), bid))
        if d.get('log'):
            log = d['log']
            cur.execute("""
                INSERT INTO stage_logs (batch_id, stage, operator, machine, shift, input_size, output_size, ovality, remarks, logged_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (bid, log.get('stage'), log.get('operator'), log.get('machine'), log.get('shift'), log.get('input_size'), log.get('output_size'), log.get('ovality'), log.get('remarks'), datetime.now()))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@batches_bp.route('/api/batches/<int:bid>/priority', methods=['PUT'])
def update_priority(bid):
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("UPDATE batches SET priority=%s WHERE id=%s", (d.get('priority'), bid))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@batches_bp.route('/api/batches/<int:bid>/machine-log', methods=['POST'])
def add_machine_log(bid):
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO machine_log (batch_card_no, stage_name, machine_code, operator_name, shift, qty_pcs_in, qty_pcs_out, qty_rejected, weight_kg_in, weight_kg_out, remarks, logged_at)
            SELECT batch_card_no, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW() FROM batches WHERE id=%s
        """, (d.get('stage_name'), d.get('machine_code'), d.get('operator_name'), d.get('shift'), d.get('qty_pcs_in') or None, d.get('qty_pcs_out') or None, d.get('qty_rejected') or 0, d.get('weight_kg_in') or None, d.get('weight_kg_out') or None, d.get('remarks'), bid))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@batches_bp.route('/api/batches/<int:bid>/machine-log', methods=['GET'])
def get_machine_log(bid):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            SELECT ml.* FROM machine_log ml
            JOIN batches b ON b.batch_card_no = ml.batch_card_no
            WHERE b.id = %s ORDER BY ml.logged_at ASC
        """, (bid,))
        logs = rows_to_list(cur)
        for log in logs:
            if isinstance(log.get('logged_at'), datetime):
                log['logged_at'] = log['logged_at'].isoformat()
        return jsonify(logs)
    finally:
        db.close()
