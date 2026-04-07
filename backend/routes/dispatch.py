from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime

dispatch_bp = Blueprint('dispatch', __name__)

@dispatch_bp.route('/api/dispatch', methods=['GET'])
def get_dispatches():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM dispatches ORDER BY created_at DESC")
    dispatches = rows_to_list(cur)
    for d in dispatches:
        cur.execute("SELECT * FROM dispatch_batches WHERE dispatch_id=%s", (d['id'],))
        d['batches'] = rows_to_list(cur)
        for field in ['dispatch_date','etd','eta','created_at']:
            if isinstance(d.get(field), datetime):
                d[field] = d[field].isoformat()
    db.close()
    return jsonify(dispatches)

@dispatch_bp.route('/api/dispatch', methods=['POST'])
def create_dispatch():
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO dispatches (
                invoice_no, dispatch_date, dispatch_type,
                customer, country, vessel_name,
                container_no, seal_no, bl_number,
                port_loading, port_discharge, final_destination,
                etd, eta, vehicle_no, transporter,
                eway_bill_no, total_net_wt_kg, total_gross_wt_kg,
                mtc_cert_no, status
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            d.get('invoice_no'),
            d.get('dispatch_date'),
            d.get('dispatch_type', 'Export'),
            d.get('customer'),
            d.get('country'),
            d.get('vessel_name'),
            d.get('container_no'),
            d.get('seal_no'),
            d.get('bl_number'),
            d.get('port_loading'),
            d.get('port_discharge'),
            d.get('final_destination'),
            d.get('etd'),
            d.get('eta'),
            d.get('vehicle_no'),
            d.get('transporter'),
            d.get('eway_bill_no'),
            d.get('total_net_wt_kg'),
            d.get('total_gross_wt_kg'),
            d.get('mtc_cert_no'),
            d.get('status', 'Dispatched'),
        ))
        dispatch_id = cur.lastrowid
        for batch in d.get('batches', []):
            cur.execute("""
                INSERT INTO dispatch_batches (
                    dispatch_id, batch_card_no, heat_no,
                    grade, size_mm, no_of_pcs, net_wt_kg
                ) VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (
                dispatch_id,
                batch.get('batch_card_no'),
                batch.get('heat_no'),
                batch.get('grade'),
                batch.get('size_mm'),
                batch.get('no_of_pcs'),
                batch.get('net_wt_kg'),
            ))
        db.commit()
        return jsonify({'success': True, 'id': dispatch_id})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()