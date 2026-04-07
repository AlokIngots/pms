from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime

batch_cards_bp = Blueprint('batch_cards', __name__)

@batch_cards_bp.route('/api/batch-cards/next-no', methods=['GET'])
def next_batch_no():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT IFNULL(MAX(CAST(batch_card_no AS UNSIGNED)), 1072) + 1 FROM batches")
    no = cur.fetchone()[0]
    db.close()
    return jsonify({'next_no': no})

@batch_cards_bp.route('/api/batch-cards', methods=['POST'])
def create_batch_card():
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT IFNULL(MAX(CAST(batch_card_no AS UNSIGNED)), 1072) + 1 FROM batches")
        batch_no = str(cur.fetchone()[0])
        cur.execute("""
            INSERT INTO batches (
                batch_card_no, heat_no, grade_code,
                size_mm, no_of_pcs, weight_kg,
                ht_process, bb_process, tolerance,
                colour_code, prepared_by, customer,
                current_stage, current_stage_index,
                status, priority
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            batch_no,
            d.get('heat_no'),
            d.get('grade_code'),
            d.get('size_mm'),
            d.get('no_of_pcs'),
            d.get('weight_kg'),
            d.get('ht_process'),
            d.get('bb_process'),
            d.get('tolerance'),
            d.get('colour_code'),
            d.get('prepared_by'),
            d.get('customer'),
            'RM Receive', 0,
            'In Progress', 'On Track',
        ))
        batch_id = cur.lastrowid
        cur.execute("""
            INSERT INTO batch_cards (
                batch_id, batch_card_no, date, do_year,
                prepared_by, heat_no, grade,
                black_size_mm, black_length_mm,
                no_of_pcs, weight_mtm, ht_process,
                bright_bar_process, finish_size_tol,
                customer_name, customer_do_no, item_no,
                length_mm, colour_code, chamfering,
                bundle_weight_kg, ra_value, ovality,
                straightness, remark
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            batch_id, batch_no,
            d.get('date'), d.get('do_year'),
            d.get('prepared_by'), d.get('heat_no'),
            d.get('grade_code'), d.get('size_mm'),
            d.get('black_length_mm'), d.get('no_of_pcs'),
            d.get('weight_mtm'), d.get('ht_process'),
            d.get('bb_process'), d.get('tolerance'),
            d.get('customer'), d.get('customer_do_no'),
            d.get('item_no'), d.get('length_mm'),
            d.get('colour_code'), d.get('chamfering'),
            d.get('bundle_weight_kg'), d.get('ra_value'),
            d.get('ovality'), d.get('straightness'),
            d.get('remark'),
        ))
        db.commit()
        return jsonify({'success': True, 'batch_id': batch_id, 'batch_card_no': batch_no})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@batch_cards_bp.route('/api/batch-cards/<int:bid>/stage/start', methods=['POST'])
def start_stage(bid):
    d = request.json
    now = datetime.now()
    db = get_db()
    cur = db.cursor()
    try:
        stage = d['stage']
        if stage == 'inspection':
            cur.execute("""
                INSERT INTO batch_inspection (batch_id, operator_name, started_at, date)
                VALUES (%s,%s,%s,%s)
            """, (bid, d.get('operator_name'), now, now.date()))
        elif stage == 'ht':
            cur.execute("""
                INSERT INTO batch_ht_process (batch_id, operator_name, started_at, date)
                VALUES (%s,%s,%s,%s)
            """, (bid, d.get('operator_name'), now, now.date()))
        else:
            cur.execute("""
                INSERT INTO batch_process_route (batch_id, stage, operator_name, started_at, date)
                VALUES (%s,%s,%s,%s,%s)
            """, (bid, stage, d.get('operator_name'), now, now.date()))
        row_id = cur.lastrowid
        cur.execute("UPDATE batches SET status='In Progress' WHERE id=%s", (bid,))
        db.commit()
        return jsonify({'success': True, 'row_id': row_id, 'started_at': now.isoformat()})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@batch_cards_bp.route('/api/batch-cards/<int:bid>/stage/end', methods=['POST'])
def end_stage(bid):
    d = request.json
    now = datetime.now()
    db = get_db()
    cur = db.cursor()
    try:
        stage  = d['stage']
        row_id = d['row_id']
        if stage == 'inspection':
            cur.execute("""
                UPDATE batch_inspection SET
                    completed_at=%s, pcs_received=%s, ut_ok=%s,
                    ut_reject=%s, mpi_reject=%s, end_cut_wt=%s,
                    total_ok_pcs=%s, ok_wt=%s, rej_wt=%s, remark=%s
                WHERE id=%s AND batch_id=%s
            """, (
                now, d.get('pcs_received'), d.get('ut_ok'),
                d.get('ut_reject'), d.get('mpi_reject'), d.get('end_cut_wt'),
                d.get('total_ok_pcs'), d.get('ok_wt'), d.get('rej_wt'),
                d.get('remark'), row_id, bid
            ))
        elif stage == 'ht':
            cur.execute("""
                UPDATE batch_ht_process SET
                    completed_at=%s, furnace_no=%s, no_of_pcs=%s,
                    qty=%s, ht_process=%s, hardness=%s,
                    tensile=%s, ok_not_ok=%s, remark=%s
                WHERE id=%s AND batch_id=%s
            """, (
                now, d.get('furnace_no'), d.get('no_of_pcs'),
                d.get('qty'), d.get('ht_process'), d.get('hardness'),
                d.get('tensile'), d.get('ok_not_ok'),
                d.get('remark'), row_id, bid
            ))
        else:
            mins = int((now - datetime.fromisoformat(d.get('started_at', now.isoformat()))).total_seconds() / 60)
            cur.execute("""
                UPDATE batch_process_route SET
                    completed_at=%s, shift=%s, no_of_pcs=%s,
                    input_size=%s, output_size=%s,
                    input_length=%s, finish_length=%s,
                    ovality=%s, loss_weight=%s,
                    remarks=%s, name_sign=%s
                WHERE id=%s AND batch_id=%s
            """, (
                now, d.get('shift'), d.get('no_of_pcs'),
                d.get('input_size'), d.get('output_size'),
                d.get('input_length'), d.get('finish_length'),
                d.get('ovality'), d.get('loss_weight'),
                d.get('remarks'), d.get('name_sign'),
                row_id, bid
            ))
            cur.execute("""
                INSERT INTO stage_logs (
                    batch_id, stage, operator, shift,
                    input_size, output_size, ovality,
                    remarks, started_at, completed_at, duration_mins
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                bid, stage, d.get('operator_name'), d.get('shift'),
                d.get('input_size'), d.get('output_size'),
                d.get('ovality'), d.get('remarks'),
                d.get('started_at'), now, mins
            ))
        db.commit()
        return jsonify({'success': True, 'completed_at': now.isoformat()})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()