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





# ─────────────────────────────────────────
# GET /api/batches/<id>/context
# Returns everything an operator needs to see when moving a stage:
#  - order_details: what the customer ordered (from SO)
#  - previous_stage: what the last operator recorded
#  - stage_history: full movement history
# ─────────────────────────────────────────
@batches_bp.route('/api/batches/<int:bid>/context', methods=['GET'])
def batch_context(bid):
    db = get_db()
    cur = db.cursor()
    try:
        # 1. Batch + SO line item data
        cur.execute("""
            SELECT b.id, b.batch_card_no, b.so_number, b.grade_code, b.size_mm,
                   b.tolerance, b.weight_kg, b.no_of_pcs, b.current_stage, b.customer,
                   b.ht_process, b.priority, b.status
            FROM batches b
            WHERE b.id = %s
        """, (bid,))
        batch = row_to_dict(cur, cur.fetchone())
        if not batch:
            return jsonify({'error': 'Batch not found'}), 404

        # 2. Original SO line item (what was ordered)
        order_details = None
        if batch.get('so_number'):
            cur.execute("""
                SELECT sli.grade, sli.size_mm, sli.length_mm, sli.tolerance,
                       sli.finish, sli.ends_finish, sli.qty_tons, sli.rate_per_ton,
                       sli.description,
                       so.customer, so.so_date, so.delivery_date, so.inco_term,
                       so.payment_terms, so.order_type, so.currency, so.po_number
                FROM so_line_items sli
                LEFT JOIN sales_orders so ON so.so_number = sli.so_number
                WHERE sli.batch_card_no = %s
                LIMIT 1
            """, (batch['batch_card_no'],))
            order_details = row_to_dict(cur, cur.fetchone())
            # Convert date/datetime to ISO strings for JSON
            if order_details:
                for k, v in list(order_details.items()):
                    if isinstance(v, (date, datetime)):
                        order_details[k] = v.isoformat()

        # 3. Previous stage log (most recent machine_log entry for this batch)
        cur.execute("""
            SELECT stage_name, machine_code, operator_name, shift,
                   qty_pcs_in, qty_pcs_out, qty_rejected,
                   weight_kg_in, weight_kg_out, remarks, logged_at
            FROM machine_log
            WHERE batch_card_no = %s
            ORDER BY logged_at DESC
            LIMIT 1
        """, (batch['batch_card_no'],))
        previous_stage = row_to_dict(cur, cur.fetchone())
        if previous_stage and isinstance(previous_stage.get('logged_at'), (date, datetime)):
            previous_stage['logged_at'] = previous_stage['logged_at'].isoformat()

        # 4. Full stage movement history
        cur.execute("""
            SELECT from_stage, to_stage, moved_by, notes, moved_at
            FROM batch_stage_history
            WHERE batch_card_no = %s
            ORDER BY moved_at ASC
        """, (batch['batch_card_no'],))
        history = rows_to_list(cur)
        for h in history:
            if isinstance(h.get('moved_at'), (date, datetime)):
                h['moved_at'] = h['moved_at'].isoformat()

        return jsonify({
            'batch': batch,
            'order_details': order_details,
            'previous_stage': previous_stage,
            'stage_history': history,
        })
    finally:
        db.close()
