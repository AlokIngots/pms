from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime, date

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
def get_batch_old(bid):
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
            # Convert empty strings to None for numeric columns (MySQL won't accept '' for DECIMAL)
            def _num(v):
                return None if v in (None, '', 'null') else v
            cur.execute("""
                INSERT INTO stage_logs (batch_id, stage, operator, machine, shift, input_size, output_size, ovality, remarks, logged_at)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (bid, log.get('stage'), log.get('operator'), log.get('machine'), log.get('shift'), _num(log.get('input_size')), _num(log.get('output_size')), _num(log.get('ovality')), log.get('remarks'), datetime.now()))
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

@batches_bp.route('/api/batches/no/<batch_no>', methods=['GET'])
def get_batch(batch_no):
    db = get_db()
    cur = db.cursor()
    cur.execute('SELECT * FROM batches WHERE batch_card_no = %s', (batch_no,))
    rows = rows_to_list(cur)
    if not rows:
        db.close()
        return jsonify({'error': 'Batch not found'}), 404
    batch = rows[0]
    if isinstance(batch.get('created_at'), datetime):
        batch['created_at'] = batch['created_at'].isoformat()
    if isinstance(batch.get('updated_at'), datetime):
        batch['updated_at'] = batch['updated_at'].isoformat()
    if batch.get('weight_kg'): batch['weight_kg'] = float(batch['weight_kg'])
    if batch.get('size_mm'):   batch['size_mm']   = float(batch['size_mm'])
    cur.execute('SELECT * FROM batch_stage_history WHERE batch_card_no = %s ORDER BY moved_at ASC', (batch_no,))
    history = rows_to_list(cur)
    for h in history:
        if isinstance(h.get('moved_at'), datetime):
            h['moved_at'] = h['moved_at'].isoformat()
    batch['history'] = history
    db.close()
    return jsonify(batch)


@batches_bp.route('/api/batches/no/<batch_no>/move', methods=['POST'])
def move_batch_stage(batch_no):
    data = request.get_json()
    to_stage = data.get('to_stage')
    moved_by = data.get('moved_by', 'Operator')
    notes    = data.get('notes', '')
    STAGES = ['RM Receive','UT Inspection','HT Process','Black Bar Str.','Peeling','Bright Bar Str.','Grinding','Cutting','Chamfering','Polishing','MPI Final','Packing','Dispatch']
    if not to_stage or to_stage not in STAGES:
        return jsonify({'error': 'Invalid stage'}), 400
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute('SELECT current_stage FROM batches WHERE batch_card_no = %s', (batch_no,))
        row = cur.fetchone()
        if not row: return jsonify({'error': 'Not found'}), 404
        from_stage = row[0]
        stage_idx  = STAGES.index(to_stage)
        cur.execute('UPDATE batches SET current_stage=%s, current_stage_index=%s, updated_at=NOW() WHERE batch_card_no=%s', (to_stage, stage_idx, batch_no))
        cur.execute('INSERT INTO batch_stage_history (batch_card_no, from_stage, to_stage, moved_by, notes, moved_at) VALUES (%s,%s,%s,%s,%s,NOW())', (batch_no, from_stage, to_stage, moved_by, notes))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()


@batches_bp.route('/api/batches/<int:batch_id>/context', methods=['GET'])
def batch_context(batch_id):
    db = get_db()
    cur = db.cursor(dictionary=True)
    try:
        cur.execute("""
            SELECT
                b.id, b.batch_card_no, b.grade_code, b.size_mm, b.length_mm,
                b.heat_no, b.no_of_pcs, b.weight_kg, b.tolerance, b.ht_process,
                b.bb_process, b.ends_finish, b.customer, b.shed, b.current_stage,
                b.status, b.priority, b.so_id, b.so_number, b.line_no, b.created_at,
                so.order_type, so.delivery_date, so.salesperson,
                so.customer_short_code, so.total_qty_tons
            FROM batches b
            LEFT JOIN sales_orders so ON b.so_id = so.id
            WHERE b.id = %s
        """, (batch_id,))
        batch = cur.fetchone()
        if not batch:
            return jsonify({'error': 'Batch not found'}), 404

        batch_card_no = batch['batch_card_no']

        cur.execute("""
            SELECT stage_name, machine_code, operator_name, shift,
                   qty_pcs_in, qty_pcs_out, qty_rejected,
                   weight_kg_in, weight_kg_out, remarks,
                   start_time, end_time, logged_at
            FROM machine_log
            WHERE batch_card_no = %s
            ORDER BY logged_at ASC
        """, (batch_card_no,))
        history = cur.fetchall()

        total_rejected = sum((h.get('qty_rejected') or 0) for h in history)
        first_stage = history[0] if history else None
        last_stage = history[-1] if history else None
        pcs_originally_in = first_stage.get('qty_pcs_in') if first_stage else None
        pcs_currently_out = last_stage.get('qty_pcs_out') if last_stage else None
        pcs_accepted_forward = (pcs_originally_in - total_rejected) if pcs_originally_in is not None else None

        prev_stage = None
        if last_stage:
            prev_stage = {
                'stage_name': last_stage.get('stage_name'),
                'operator_name': last_stage.get('operator_name'),
                'machine_code': last_stage.get('machine_code'),
                'shift': last_stage.get('shift'),
                'pcs_out': last_stage.get('qty_pcs_out'),
                'weight_kg_out': float(last_stage['weight_kg_out']) if last_stage.get('weight_kg_out') else None,
                'qty_rejected': last_stage.get('qty_rejected'),
                'completed_at': str(last_stage.get('end_time') or last_stage.get('logged_at')),
            }

        def _f(v):
            return float(v) if v is not None else None

        return jsonify({
            'batch': {
                'id': batch['id'],
                'batch_card_no': batch['batch_card_no'],
                'grade': batch['grade_code'],
                'size_mm': _f(batch['size_mm']),
                'length_mm': batch['length_mm'],
                'heat_no': batch['heat_no'],
                'no_of_pcs': batch['no_of_pcs'],
                'weight_kg': _f(batch['weight_kg']),
                'tolerance': batch['tolerance'],
                'ht_process': batch['ht_process'],
                'bb_process': batch['bb_process'],
                'ends_finish': batch['ends_finish'],
                'customer': batch['customer'],
                'shed': batch['shed'],
                'current_stage': batch['current_stage'],
                'status': batch['status'],
                'priority': batch['priority'],
            },
            'sales_order': {
                'so_id': batch['so_id'],
                'so_number': batch['so_number'],
                'line_no': batch['line_no'],
                'order_type': batch['order_type'],
                'delivery_date': batch['delivery_date'].isoformat() if batch.get('delivery_date') else None,
                'salesperson': batch['salesperson'],
                'customer_short_code': batch['customer_short_code'],
                'total_qty_tons': _f(batch['total_qty_tons']),
            },
            'summary': {
                'pcs_ordered': batch['no_of_pcs'],
                'weight_ordered_kg': _f(batch['weight_kg']),
                'pcs_originally_in': pcs_originally_in,
                'pcs_currently_out': pcs_currently_out,
                'pcs_accepted_forward': pcs_accepted_forward,
                'total_rejected': total_rejected,
                'stages_completed': len(history),
            },
            'previous_stage': prev_stage,
        })
    finally:
        cur.close()
