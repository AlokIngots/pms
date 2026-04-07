from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime

so_creation_bp = Blueprint('so_creation', __name__)

def nd(v):
    if v == '' or v is None:
        return None
    return v

def generate_so_number(cur):
    cur.execute("SELECT * FROM so_number_sequence ORDER BY id DESC LIMIT 1")
    seq = row_to_dict(cur, cur.fetchone())
    if not seq:
        return "AIMPL/S.O/EXP/001/2025-26"
    next_num = seq['last_number'] + 1
    so_number = f"{seq['prefix']}/{str(next_num).zfill(3)}/{seq['financial_year']}"
    cur.execute("UPDATE so_number_sequence SET last_number=%s WHERE id=%s", (next_num, seq['id']))
    return so_number

def create_batch_cards(cur, so_id, so_number, customer, line_items):
    batch_nos = []
    for item in line_items:
        line_no = item.get('sr_no') or item.get('line_no') or 1
        so_parts = so_number.split('/')
        serial = so_parts[3] if len(so_parts) > 3 else so_number[-3:]
        batch_card_no = f"BC-{serial}-L{line_no}"
        grade     = item.get('grade', '')
        size_mm   = item.get('size_mm', 0)
        qty_tons  = item.get('qty_tons', 0)
        tolerance = item.get('tolerance', 'h9')
        cur.execute("""
            INSERT INTO batches (
                batch_card_no, so_number, grade_code,
                size_mm, tolerance, weight_kg,
                no_of_pcs, customer, current_stage,
                ht_process, priority, created_at
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,NOW())
        """, (
            batch_card_no, so_number, grade,
            size_mm, tolerance, float(qty_tons) * 1000,
            0, customer, 'RM Receive', 'Annealed', 'Normal',
        ))
        cur.execute("""
            UPDATE so_line_items SET batch_card_no=%s WHERE so_id=%s AND sr_no=%s
        """, (batch_card_no, so_id, line_no))
        cur.execute("""
            INSERT INTO batch_stage_history (batch_card_no, from_stage, to_stage, moved_by, notes, moved_at)
            VALUES (%s,%s,%s,%s,%s,NOW())
        """, (batch_card_no, None, 'RM Receive', 'System', f'Auto created from SO {so_number}'))
        batch_nos.append(batch_card_no)
    return batch_nos

@so_creation_bp.route('/api/so', methods=['GET'])
def get_all_so():
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM sales_orders ORDER BY created_at DESC")
        orders = rows_to_list(cur)
        for order in orders:
            cur.execute("SELECT * FROM so_line_items WHERE so_id=%s ORDER BY sr_no", (order['id'],))
            order['line_items'] = rows_to_list(cur)
            for field in ['so_date', 'po_date', 'delivery_date', 'created_at', 'updated_at']:
                if isinstance(order.get(field), datetime):
                    order[field] = order[field].isoformat()
        return jsonify(orders)
    finally:
        db.close()

@so_creation_bp.route('/api/so', methods=['POST'])
def create_so():
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        so_number = nd(d.get('so_number')) or generate_so_number(cur)
        customer  = d.get('customer', '')
        cur.execute("""
            INSERT INTO sales_orders (
                so_number, so_date, po_number, po_date,
                supplier_no, order_type, currency,
                customer, customer_short_code, contact_person,
                salesperson, delivery_address, consignee_address,
                kind_attention, sale_made_through,
                delivery_instruction, payment_terms,
                inco_term, delivery_date,
                shipment_mode, bank_charges, notes,
                total_qty_tons, total_amount_euro, status
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            so_number, nd(d.get('so_date')), nd(d.get('po_number')), nd(d.get('po_date')),
            nd(d.get('supplier_no')), d.get('order_type','Export'), d.get('currency','EUR'),
            customer, nd(d.get('customer_short_code')), nd(d.get('contact_person')),
            nd(d.get('sale_made_through')), nd(d.get('delivery_address')), nd(d.get('consignee_address')),
            nd(d.get('kind_attention')), nd(d.get('sale_made_through')),
            nd(d.get('delivery_instruction')), nd(d.get('payment_terms')),
            nd(d.get('inco_term')), nd(d.get('delivery_date')),
            nd(d.get('shipment_mode')), nd(d.get('bank_charges')), nd(d.get('notes')),
            d.get('total_qty_tons', 0), d.get('total_amount_euro', 0), 'Pending',
        ))
        so_id = cur.lastrowid
        line_items = d.get('line_items', [])
        for i, item in enumerate(line_items, 1):
            item['sr_no'] = i
            cur.execute("""
                INSERT INTO so_line_items (
                    so_id, so_number, sr_no, description,
                    grade, size_mm, finish, tolerance,
                    length_mm, length_tolerance, ends_finish,
                    qty_tons, rate_per_ton, amount,
                    wooden_box, rm_max_n_mm2, line_status
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                so_id, so_number, i, item.get('description',''),
                item.get('grade',''), item.get('size_mm',0),
                item.get('finish',''), item.get('tolerance','h9'),
                item.get('length_mm',3000), item.get('length_tolerance','-0/+100'),
                item.get('ends_finish','Chamfered'),
                item.get('qty_tons',0), item.get('rate_per_ton') or item.get('eur_per_ton',0),
                item.get('amount',0),
                1 if item.get('wooden_box') else 0,
                nd(item.get('rm_max_n_mm2')), 'Pending',
            ))
        specs = d.get('quality_specs')
        if specs:
            cur.execute("""
                INSERT INTO so_quality_specs (
                    so_number, product_standard, heat_treatment,
                    tolerance_class, packing_spec, ut_standard,
                    ut_class_notes, surface_test, mechanical_test,
                    mtc_standard, radioactivity_free, sulphur_min,
                    weight_tolerance_pct, cbam_applicable,
                    cbam_liability, cbam_data_provided, short_code_on_docs
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                so_number,
                specs.get('product_standard','EN 10088-3-2014'),
                nd(specs.get('heat_treatment')),
                specs.get('tolerance_class','h9'),
                nd(specs.get('packing_spec')),
                nd(specs.get('ut_standard')),
                nd(specs.get('ut_class_notes')),
                nd(specs.get('surface_test')),
                specs.get('mechanical_test','100% UT/MPI'),
                specs.get('mtc_standard','EN 10204/3.1'),
                1 if specs.get('radioactivity_free') else 0,
                nd(specs.get('sulphur_min')),
                specs.get('weight_tolerance_pct',10),
                1 if specs.get('cbam_applicable') else 0,
                nd(specs.get('cbam_liability')),
                1 if specs.get('cbam_data_provided') else 0,
                nd(specs.get('short_code_on_docs')),
            ))
        batch_nos = create_batch_cards(cur, so_id, so_number, customer, line_items)
        cur.execute("UPDATE sales_orders SET status='In Production' WHERE id=%s", (so_id,))
        db.commit()
        return jsonify({
            'success': True,
            'so_number': so_number,
            'so_id': so_id,
            'batch_cards_created': batch_nos,
            'message': f'SO {so_number} created with {len(batch_nos)} batch cards'
        })
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@so_creation_bp.route('/api/so/<path:so_number>', methods=['GET'])
def get_so_detail(so_number):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM sales_orders WHERE so_number=%s", (so_number,))
        order = row_to_dict(cur, cur.fetchone())
        if not order:
            return jsonify({'error': 'SO not found'}), 404
        cur.execute("SELECT * FROM so_line_items WHERE so_number=%s ORDER BY sr_no", (so_number,))
        order['line_items'] = rows_to_list(cur)
        cur.execute("SELECT * FROM so_quality_specs WHERE so_number=%s", (so_number,))
        order['quality_specs'] = row_to_dict(cur, cur.fetchone())
        cur.execute("""
            SELECT b.*, sc.capacity_mt_per_day, sc.is_fixed_days, sc.fixed_days
            FROM batches b
            LEFT JOIN stage_capacity sc ON sc.stage_name = b.current_stage
            WHERE b.so_number=%s
        """, (so_number,))
        order['batch_cards'] = rows_to_list(cur)
        for field in ['so_date','po_date','delivery_date','created_at','updated_at']:
            if isinstance(order.get(field), datetime):
                order[field] = order[field].isoformat()
        return jsonify(order)
    finally:
        db.close()

@so_creation_bp.route('/api/so/<path:so_number>/lead-time', methods=['GET'])
def get_lead_time(so_number):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM sales_orders WHERE so_number=%s", (so_number,))
        order = row_to_dict(cur, cur.fetchone())
        if not order:
            return jsonify({'error': 'SO not found'}), 404
        cur.execute("SELECT * FROM so_line_items WHERE so_number=%s", (so_number,))
        line_items = rows_to_list(cur)
        cur.execute("SELECT * FROM stage_capacity ORDER BY id")
        stages = rows_to_list(cur)
        STAGES = [
            'RM Receive','UT Inspection','HT Process',
            'Black Bar Str.','Peeling','Bright Bar Str.',
            'Grinding','Cutting','Chamfering',
            'Polishing','MPI Final','Packing','Dispatch'
        ]
        stage_cap = {s['stage_name']: s for s in stages}
        result = []
        for item in line_items:
            qty = float(item.get('qty_tons') or 0)
            stage_breakdown = []
            total_days = 0
            for stage_name in STAGES:
                cap = stage_cap.get(stage_name, {})
                is_fixed   = cap.get('is_fixed_days', 0)
                fixed_days = cap.get('fixed_days', 0)
                capacity   = float(cap.get('capacity_mt_per_day') or 25)
                if is_fixed:
                    days = fixed_days
                else:
                    days = round(qty / capacity, 1) if capacity > 0 else 0
                    days = max(1, days)
                total_days += days
                stage_breakdown.append({'stage': stage_name, 'days': days, 'is_fixed': bool(is_fixed)})
            result.append({
                'line_no': item.get('sr_no'), 'grade': item.get('grade'),
                'size_mm': item.get('size_mm'), 'qty_tons': qty,
                'total_days': total_days, 'stages': stage_breakdown,
            })
        return jsonify({'so_number': so_number, 'delivery_date': order.get('delivery_date'), 'lead_time_per_line': result})
    finally:
        db.close()

@so_creation_bp.route('/api/customers', methods=['GET'])
def get_customers():
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM customers WHERE is_active=1 ORDER BY customer_name")
        return jsonify(rows_to_list(cur))
    finally:
        db.close()

@so_creation_bp.route('/api/grades', methods=['GET'])
def get_grades():
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM grades ORDER BY grade_code")
        return jsonify(rows_to_list(cur))
    finally:
        db.close()

@so_creation_bp.route('/api/machines/<stage_name>', methods=['GET'])
def get_machines_for_stage(stage_name):
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM machines WHERE stage_name=%s AND is_active=1", (stage_name,))
        return jsonify(rows_to_list(cur))
    finally:
        db.close()