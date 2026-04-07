from flask import Blueprint, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime
import threading
import requests
import time
import os

crm_sync_bp = Blueprint('crm_sync', __name__)

# ─────────────────────────────────────────
# CRM URL — update this to your CRM VPS URL
# ─────────────────────────────────────────
CRM_BASE_URL = os.getenv('CRM_BASE_URL', 'https://crm.alokindia.co.in')
CRM_WON_ENDPOINT = f"{CRM_BASE_URL}/api/offers/won"
POLL_INTERVAL = 60  # seconds


# ─────────────────────────────────────────
# HELPER: Generate next SO number
# ─────────────────────────────────────────
def generate_so_number(cur):
    cur.execute("SELECT * FROM so_number_sequence ORDER BY id DESC LIMIT 1")
    seq = row_to_dict(cur, cur.fetchone())
    if not seq:
        return "AIMPL/S.O/EXP/001/2025-26"
    next_num = seq['last_number'] + 1
    so_number = f"{seq['prefix']}/{str(next_num).zfill(3)}/{seq['financial_year']}"
    cur.execute(
        "UPDATE so_number_sequence SET last_number=%s WHERE id=%s",
        (next_num, seq['id'])
    )
    return so_number


# ─────────────────────────────────────────
# HELPER: Create batch cards from line items
# ─────────────────────────────────────────
def create_batch_cards(cur, so_id, so_number, customer, line_items):
    batch_nos = []
    for i, item in enumerate(line_items, 1):
        line_no = item.get('sr_no') or item.get('line_no') or i
        batch_card_no = f"BC-{so_number.replace('/', '-')}-L{line_no}"

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
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, NOW()
            )
        """, (
            batch_card_no, so_number, grade,
            size_mm, tolerance,
            float(qty_tons) * 1000,
            0, customer,
            'RM Receive',
            'Annealed', 'Normal',
        ))

        cur.execute("""
            UPDATE so_line_items
            SET batch_card_no=%s
            WHERE so_id=%s AND sr_no=%s
        """, (batch_card_no, so_id, line_no))

        cur.execute("""
            INSERT INTO batch_stage_history (
                batch_card_no, from_stage, to_stage,
                moved_by, notes, moved_at
            ) VALUES (%s, %s, %s, %s, %s, NOW())
        """, (
            batch_card_no, None, 'RM Receive',
            'CRM Sync', f'Auto created from CRM Won offer → SO {so_number}',
        ))

        batch_nos.append(batch_card_no)
    return batch_nos


# ─────────────────────────────────────────
# CORE: Process one Won offer from CRM
# ─────────────────────────────────────────
def process_won_offer(offer):
    crm_offer_id = str(offer.get('id') or offer.get('offer_id') or '')
    if not crm_offer_id:
        print(f"[CRM SYNC] Skipping offer with no ID")
        return

    db = get_db()
    cur = db.cursor()
    try:
        # Check if already synced
        cur.execute(
            "SELECT id FROM crm_sync_log WHERE crm_offer_id=%s",
            (crm_offer_id,)
        )
        if cur.fetchone():
            return  # already processed

        # Generate SO number
        so_number = generate_so_number(cur)
        customer  = offer.get('customer_name') or offer.get('customer', '')

        # Insert SO header
        cur.execute("""
            INSERT INTO sales_orders (
                so_number, so_date, po_number,
                order_type, currency,
                customer, customer_short_code,
                contact_person, sale_made_through,
                delivery_address, consignee_address,
                payment_terms, inco_term,
                delivery_date, status
            ) VALUES (
                %s, NOW(), %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s,
                %s, %s
            )
        """, (
            so_number,
            offer.get('po_number'),
            offer.get('sale_type', 'Export'),
            offer.get('currency', 'EUR'),
            customer,
            offer.get('customer_short_code'),
            offer.get('contact_person'),
            offer.get('salesperson'),
            offer.get('delivery_address'),
            offer.get('consignee_address'),
            offer.get('payment_terms'),
            offer.get('incoterms'),
            offer.get('delivery_date'),
            'In Production',
        ))
        so_id = cur.lastrowid

        # Insert line items
        line_items = offer.get('line_items') or offer.get('items') or []
        if not line_items:
            # Build single line item from flat offer fields
            line_items = [{
                'sr_no':      1,
                'grade':      offer.get('grade', ''),
                'size_mm':    offer.get('size_mm') or offer.get('size', 0),
                'tolerance':  offer.get('tolerance', 'h9'),
                'length_mm':  offer.get('length_mm', 3000),
                'ends_finish':offer.get('chamfering', 'Chamfered'),
                'qty_tons':   offer.get('qty') or offer.get('quantity', 0),
                'rate_per_ton': offer.get('price', 0),
                'finish':     offer.get('surface', ''),
                'amount':     0,
            }]

        for i, item in enumerate(line_items, 1):
            item['sr_no'] = i
            cur.execute("""
                INSERT INTO so_line_items (
                    so_id, so_number, sr_no, description,
                    grade, size_mm, finish, tolerance,
                    length_mm, ends_finish,
                    qty_tons, rate_per_ton, amount,
                    line_status
                ) VALUES (
                    %s,%s,%s,%s,
                    %s,%s,%s,%s,
                    %s,%s,
                    %s,%s,%s,
                    %s
                )
            """, (
                so_id, so_number, i,
                item.get('description', ''),
                item.get('grade', ''),
                item.get('size_mm', 0),
                item.get('finish', ''),
                item.get('tolerance', 'h9'),
                item.get('length_mm', 3000),
                item.get('ends_finish', 'Chamfered'),
                item.get('qty_tons') or item.get('qty', 0),
                item.get('rate_per_ton') or item.get('price', 0),
                item.get('amount', 0),
                'Pending',
            ))

        # Auto create batch cards
        batch_nos = create_batch_cards(cur, so_id, so_number, customer, line_items)

        # Log sync
        cur.execute("""
            INSERT INTO crm_sync_log (
                crm_offer_id, so_number, status, synced_at
            ) VALUES (%s, %s, 'Success', NOW())
        """, (crm_offer_id, so_number))

        db.commit()
        print(f"[CRM SYNC] ✅ Created SO {so_number} with {len(batch_nos)} batch cards from CRM offer {crm_offer_id}")

    except Exception as e:
        db.rollback()
        # Log failure
        try:
            cur.execute("""
                INSERT INTO crm_sync_log (
                    crm_offer_id, so_number, status, error_message, synced_at
                ) VALUES (%s, %s, 'Failed', %s, NOW())
            """, (crm_offer_id, None, str(e)))
            db.commit()
        except:
            pass
        print(f"[CRM SYNC] ❌ Failed to process offer {crm_offer_id}: {e}")
    finally:
        db.close()


# ─────────────────────────────────────────
# BACKGROUND THREAD: Poll CRM every 60s
# ─────────────────────────────────────────
def poll_crm():
    print(f"[CRM SYNC] Started polling {CRM_WON_ENDPOINT} every {POLL_INTERVAL}s")
    while True:
        try:
            response = requests.get(CRM_WON_ENDPOINT, timeout=15)
            if response.status_code == 200:
                offers = response.json()
                if offers:
                    print(f"[CRM SYNC] Found {len(offers)} won offer(s)")
                    for offer in offers:
                        process_won_offer(offer)
                else:
                    print(f"[CRM SYNC] No new won offers")
            else:
                print(f"[CRM SYNC] CRM returned status {response.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"[CRM SYNC] Cannot reach CRM — will retry in {POLL_INTERVAL}s")
        except Exception as e:
            print(f"[CRM SYNC] Poll error: {e}")
        time.sleep(POLL_INTERVAL)


# ─────────────────────────────────────────
# Start polling thread (called from app.py)
# ─────────────────────────────────────────
def start_crm_polling():
    t = threading.Thread(target=poll_crm, daemon=True)
    t.start()


# ─────────────────────────────────────────
# GET /api/crm-sync/status — Check sync status
# ─────────────────────────────────────────
@crm_sync_bp.route('/api/crm-sync/status', methods=['GET'])
def crm_sync_status():
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            SELECT * FROM crm_sync_log 
            ORDER BY synced_at DESC 
            LIMIT 20
        """)
        logs = rows_to_list(cur)
        for log in logs:
            if isinstance(log.get('synced_at'), datetime):
                log['synced_at'] = log['synced_at'].isoformat()

        cur.execute("SELECT COUNT(*) as total FROM crm_sync_log WHERE status='Success'")
        success = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) as total FROM crm_sync_log WHERE status='Failed'")
        failed = cur.fetchone()[0]

        return jsonify({
            'total_synced': success,
            'total_failed': failed,
            'crm_url': CRM_WON_ENDPOINT,
            'poll_interval_seconds': POLL_INTERVAL,
            'recent_logs': logs,
        })
    finally:
        db.close()


# ─────────────────────────────────────────
# POST /api/crm-sync/manual — Trigger manual sync
# ─────────────────────────────────────────
@crm_sync_bp.route('/api/crm-sync/manual', methods=['POST'])
def manual_sync():
    try:
        response = requests.get(CRM_WON_ENDPOINT, timeout=15)
        if response.status_code != 200:
            return jsonify({'error': f'CRM returned {response.status_code}'}), 400
        offers = response.json()
        count = 0
        for offer in offers:
            process_won_offer(offer)
            count += 1
        return jsonify({
            'success': True,
            'offers_processed': count,
            'message': f'Processed {count} won offer(s) from CRM'
        })
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Cannot reach CRM. Check CRM_BASE_URL in .env'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        