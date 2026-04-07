from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime

orders_bp = Blueprint('orders', __name__)

@orders_bp.route('/api/orders', methods=['GET'])
def get_orders():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM sales_orders ORDER BY created_at DESC")
    orders = rows_to_list(cur)
    for order in orders:
        cur.execute("SELECT * FROM so_line_items WHERE so_id=%s ORDER BY sr_no", (order['id'],))
        order['line_items'] = rows_to_list(cur)
        for field in ['so_date','po_date','delivery_date','created_at']:
            if isinstance(order.get(field), datetime):
                order[field] = order[field].isoformat()
    db.close()
    return jsonify(orders)

@orders_bp.route('/api/orders', methods=['POST'])
def create_order():
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO sales_orders (
                so_number, so_date, po_number, po_date,
                supplier_no, order_type, currency,
                customer, delivery_address, consignee_address,
                kind_attention, sale_made_through,
                delivery_instruction, payment_terms,
                inco_term, delivery_date, status
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            d.get('so_number'),
            d.get('so_date'),
            d.get('po_number'),
            d.get('po_date'),
            d.get('supplier_no'),
            d.get('order_type', 'Export'),
            d.get('currency', 'EUR'),
            d.get('customer'),
            d.get('delivery_address'),
            d.get('consignee_address'),
            d.get('kind_attention'),
            d.get('sale_made_through'),
            d.get('delivery_instruction'),
            d.get('payment_terms'),
            d.get('inco_term'),
            d.get('delivery_date'),
            d.get('status', 'Pending'),
        ))
        so_id = cur.lastrowid
        for i, item in enumerate(d.get('line_items', []), 1):
            cur.execute("""
                INSERT INTO so_line_items (
                    so_id, sr_no, description,
                    size_mm, qty_tons, rate_per_ton, amount
                ) VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (
                so_id, i,
                item.get('description'),
                item.get('size_mm'),
                item.get('qty_tons'),
                item.get('eur_per_ton'),
                item.get('amount'),
            ))
        db.commit()
        return jsonify({'success': True, 'id': so_id})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@orders_bp.route('/api/orders/<int:oid>', methods=['GET'])
def get_order(oid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM sales_orders WHERE id=%s", (oid,))
    order = row_to_dict(cur, cur.fetchone())
    if not order:
        return jsonify({'error': 'Not found'}), 404
    cur.execute("SELECT * FROM so_line_items WHERE so_id=%s ORDER BY sr_no", (oid,))
    order['line_items'] = rows_to_list(cur)
    db.close()
    return jsonify(order)

@orders_bp.route('/api/orders/<int:oid>', methods=['PUT'])
def update_order(oid):
    d = request.json
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("UPDATE sales_orders SET status=%s WHERE id=%s", (d.get('status'), oid))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()