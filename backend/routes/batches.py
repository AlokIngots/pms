# ── Add these 2 routes to the bottom of batches.py ──

@batches_bp.route('/api/batches/<int:bid>/machine-log', methods=['POST'])
def add_machine_log(bid):
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO machine_log (
                batch_card_no, stage_name, machine_code,
                operator_name, shift,
                qty_pcs_in, qty_pcs_out, qty_rejected,
                weight_kg_in, weight_kg_out,
                remarks, logged_at
            ) SELECT batch_card_no, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
            FROM batches WHERE id=%s
        """, (
            d.get('stage_name'),
            d.get('machine_code'),
            d.get('operator_name'),
            d.get('shift'),
            d.get('qty_pcs_in')    or None,
            d.get('qty_pcs_out')   or None,
            d.get('qty_rejected')  or 0,
            d.get('weight_kg_in')  or None,
            d.get('weight_kg_out') or None,
            d.get('remarks'),
            bid,
        ))
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
            WHERE b.id = %s
            ORDER BY ml.logged_at ASC
        """, (bid,))
        logs = rows_to_list(cur)
        for log in logs:
            if isinstance(log.get('logged_at'), datetime):
                log['logged_at'] = log['logged_at'].isoformat()
        return jsonify(logs)
    finally:
        db.close()