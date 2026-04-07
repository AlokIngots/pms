from flask import Blueprint, request, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime, date
import json

operator_logs_bp = Blueprint('operator_logs', __name__)

@operator_logs_bp.route('/api/operator-logs', methods=['GET'])
def get_logs():
    db  = get_db()
    cur = db.cursor()
    date_from = request.args.get('from')
    date_to   = request.args.get('to')
    operator  = request.args.get('operator')
    machine   = request.args.get('machine')
    process   = request.args.get('process')

    query  = "SELECT * FROM operator_logs WHERE 1=1"
    params = []
    if date_from: query += " AND log_date >= %s"; params.append(date_from)
    if date_to:   query += " AND log_date <= %s"; params.append(date_to)
    if operator:  query += " AND operator_name = %s"; params.append(operator)
    if machine:   query += " AND machine_name = %s";  params.append(machine)
    if process:   query += " AND process = %s";       params.append(process)
    query += " ORDER BY log_date DESC, shift, operator_name"

    cur.execute(query, params)
    data = rows_to_list(cur)
    for r in data:
        for f in ['log_date','created_at']:
            if isinstance(r.get(f), (datetime, date)):
                r[f] = r[f].isoformat()
    db.close()
    return jsonify(data)

@operator_logs_bp.route('/api/operator-logs', methods=['POST'])
def create_log():
    d   = request.json
    db  = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            INSERT INTO operator_logs (
                log_date, shift, operator_name, emp_id, machine_name, process,
                grade, heat_no, input_size, output_size, finish_size,
                no_of_pcs, black_qty_mt, bright_qty_mt,
                target_pcs_12hr, actual_efficiency, target_efficiency,
                breakdown_mins, downtime_mins, delay_remarks, customer, source
            ) VALUES (
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """, (
            d.get('log_date',   date.today().isoformat()),
            d.get('shift',      'DAY'),
            d.get('operator_name'),
            d.get('emp_id',     ''),
            d.get('machine_name'),
            d.get('process',    ''),
            d.get('grade',      ''),
            d.get('heat_no',    ''),
            d.get('input_size',  0),
            d.get('output_size', 0),
            d.get('finish_size', 0),
            d.get('no_of_pcs',   0),
            d.get('black_qty_mt',  0),
            d.get('bright_qty_mt', 0),
            d.get('target_pcs_12hr', 0),
            d.get('actual_efficiency', 0),
            d.get('target_efficiency', 100),
            d.get('breakdown_mins', 0),
            d.get('downtime_mins',  0),
            d.get('delay_remarks',  ''),
            d.get('customer',       ''),
            d.get('source',         'manual'),
        ))
        db.commit()
        return jsonify({'success': True, 'id': cur.lastrowid})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@operator_logs_bp.route('/api/operator-logs/<int:lid>', methods=['PUT'])
def update_log(lid):
    d   = request.json
    db  = get_db()
    cur = db.cursor()
    try:
        cur.execute("""
            UPDATE operator_logs SET
                log_date=%s, shift=%s, operator_name=%s, emp_id=%s,
                machine_name=%s, process=%s, grade=%s, heat_no=%s,
                input_size=%s, output_size=%s, finish_size=%s,
                no_of_pcs=%s, black_qty_mt=%s, bright_qty_mt=%s,
                target_pcs_12hr=%s, actual_efficiency=%s, target_efficiency=%s,
                breakdown_mins=%s, downtime_mins=%s, delay_remarks=%s, customer=%s
            WHERE id=%s
        """, (
            d.get('log_date'), d.get('shift'), d.get('operator_name'),
            d.get('emp_id',''), d.get('machine_name'), d.get('process',''),
            d.get('grade',''), d.get('heat_no',''),
            d.get('input_size',0), d.get('output_size',0), d.get('finish_size',0),
            d.get('no_of_pcs',0), d.get('black_qty_mt',0), d.get('bright_qty_mt',0),
            d.get('target_pcs_12hr',0), d.get('actual_efficiency',0),
            d.get('target_efficiency',100), d.get('breakdown_mins',0),
            d.get('downtime_mins',0), d.get('delay_remarks',''), d.get('customer',''),
            lid,
        ))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@operator_logs_bp.route('/api/operator-logs/<int:lid>', methods=['DELETE'])
def delete_log(lid):
    db  = get_db()
    cur = db.cursor()
    try:
        cur.execute("DELETE FROM operator_logs WHERE id=%s", (lid,))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

# Summary stats for dashboard
@operator_logs_bp.route('/api/operator-logs/summary', methods=['GET'])
def summary():
    db  = get_db()
    cur = db.cursor()
    today = date.today().isoformat()
    cur.execute("""
        SELECT
            COUNT(*)                    as total_logs,
            SUM(no_of_pcs)              as total_pcs,
            SUM(bright_qty_mt)          as total_mt,
            AVG(actual_efficiency)      as avg_efficiency,
            SUM(breakdown_mins)         as total_breakdown_mins,
            COUNT(DISTINCT operator_name) as operators_today
        FROM operator_logs WHERE log_date = %s
    """, (today,))
    row = row_to_dict(cur, cur.fetchone()) or {}
    db.close()
    return jsonify(row)

# Excel import endpoint
@operator_logs_bp.route('/api/operator-logs/import', methods=['POST'])
def import_excel():
    data   = request.json.get('rows', [])
    source = request.json.get('source', 'excel')
    db     = get_db()
    cur    = db.cursor()
    inserted = 0
    errors   = []
    try:
        for r in data:
            try:
                cur.execute("""
                    INSERT INTO operator_logs (
                        log_date, shift, operator_name, machine_name, process,
                        grade, heat_no, input_size, output_size, finish_size,
                        no_of_pcs, black_qty_mt, bright_qty_mt,
                        target_pcs_12hr, actual_efficiency,
                        breakdown_mins, downtime_mins, delay_remarks, customer, source
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """, (
                    r.get('log_date'),    r.get('shift','DAY'),
                    r.get('operator_name'), r.get('machine_name'),
                    r.get('process',''),  r.get('grade',''),
                    r.get('heat_no',''),  r.get('input_size',0),
                    r.get('output_size',0), r.get('finish_size',0),
                    r.get('no_of_pcs',0), r.get('black_qty_mt',0),
                    r.get('bright_qty_mt',0), r.get('target_pcs_12hr',0),
                    r.get('actual_efficiency',0), r.get('breakdown_mins',0),
                    r.get('downtime_mins',0), r.get('delay_remarks',''),
                    r.get('customer',''), source,
                ))
                inserted += 1
            except Exception as e:
                errors.append(str(e))
        db.commit()
        return jsonify({'success': True, 'inserted': inserted, 'errors': errors})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()