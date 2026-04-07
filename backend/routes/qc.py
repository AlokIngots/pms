from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime

qc_bp = Blueprint('qc', __name__)

@qc_bp.route('/api/qc', methods=['GET'])
def get_qc():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM qc_records ORDER BY created_at DESC")
    records = rows_to_list(cur)
    for r in records:
        for field in ['date', 'created_at']:
            if isinstance(r.get(field), datetime):
                r[field] = r[field].isoformat()
    db.close()
    return jsonify(records)

@qc_bp.route('/api/qc', methods=['POST'])
def create_qc():
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO qc_records (
                batch_id, batch_card_no, heat_no, grade,
                size_mm, check_type, date, inspector,
                pcs_received, ut_ok, ut_reject, mpi_reject,
                total_ok_pcs, end_cut_wt, ok_wt_mt, rej_wt_mt,
                furnace_no, hardness, tensile, result, remarks
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            d.get('batch_id'),
            d.get('batch_card_no'),
            d.get('heat_no'),
            d.get('grade'),
            d.get('size_mm'),
            d.get('check_type'),
            d.get('date'),
            d.get('inspector'),
            d.get('pcs_received'),
            d.get('ut_ok'),
            d.get('ut_reject'),
            d.get('mpi_reject'),
            d.get('total_ok_pcs'),
            d.get('end_cut_wt'),
            d.get('ok_wt_mt'),
            d.get('rej_wt_mt'),
            d.get('furnace_no'),
            d.get('hardness'),
            d.get('tensile'),
            d.get('result', 'Pending'),
            d.get('remarks'),
        ))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@qc_bp.route('/api/qc/<int:qid>', methods=['PUT'])
def update_qc(qid):
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE qc_records SET result=%s, remarks=%s WHERE id=%s
        """, (d.get('result'), d.get('remarks'), qid))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()