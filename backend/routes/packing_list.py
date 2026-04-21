from flask import Blueprint, Response, jsonify, request
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime, date
from collections import OrderedDict
import os
import base64

packing_list_bp = Blueprint("packing_list_bp", __name__)


def _load_logo_b64():
    try:
        for path in [
            os.path.join(os.path.dirname(__file__), "..", "ALOK_Logo.png"),
            os.path.join(os.path.dirname(__file__), "..", "static", "ALOK_Logo.png"),
            "ALOK_Logo.png"
        ]:
            if os.path.exists(path):
                with open(path, "rb") as f:
                    return base64.b64encode(f.read()).decode()
        return ""
    except:
        return ""

ALOK_LOGO_B64 = _load_logo_b64()


def safe(v, default=""):
    if v is None or str(v).strip() == "":
        return default
    return str(v).strip()


def fmt_date(d):
    if not d:
        return ""
    if isinstance(d, (datetime, date)):
        return d.strftime("%d.%m.%Y")
    try:
        return datetime.strptime(str(d)[:10], "%Y-%m-%d").strftime("%d.%m.%Y")
    except:
        return str(d)


def fmt_num(v, decimals=3):
    if v is None or v == "":
        return ""
    try:
        return f"{float(v):,.{decimals}f}"
    except:
        return str(v)


def fmt_int(v):
    if v is None or v == "":
        return ""
    try:
        return f"{int(v):,}"
    except:
        return str(v)


def generate_pl_number(pl_type, year=None):
    conn = get_db(); cur = conn.cursor()
    prefix = "EXP" if pl_type == "Export" else "DOM"
    if not year:
        today = datetime.now()
        if today.month >= 4:
            year = f"{today.year}-{str(today.year + 1)[-2:]}"
        else:
            year = f"{today.year - 1}-{str(today.year)[-2:]}"

    cur.execute("""SELECT pl_number FROM packing_lists
                   WHERE pl_number LIKE %s ORDER BY id DESC LIMIT 1""",
                (f"AIMPL/PL/{prefix}/%/{year}",))
    row = cur.fetchone()
    cur.close(); conn.close()

    if row:
        try:
            last_num = int(row[0].split("/")[3])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    return f"AIMPL/PL/{prefix}/{next_num:03d}/{year}"


@packing_list_bp.route("/api/packing-list/create", methods=["POST"])
def create_packing_list():
    data = request.get_json() or {}
    dispatch_id = data.get("dispatch_id")
    so_number = data.get("so_number")

    if not dispatch_id and not so_number:
        return jsonify({"error": "dispatch_id or so_number required"}), 400

    try:
        conn = get_db(); cur = conn.cursor()
        dispatch = None
        if dispatch_id:
            cur.execute("SELECT * FROM dispatches WHERE id=%s", (dispatch_id,))
            dispatch = row_to_dict(cur, cur.fetchone())
            if not dispatch:
                cur.close(); conn.close()
                return jsonify({"error": "Dispatch not found"}), 404
            if not so_number:
                cur.execute("""SELECT DISTINCT b.so_number FROM dispatch_batches db
                               JOIN batches b ON db.batch_card_no = b.batch_card_no
                               WHERE db.dispatch_id=%s LIMIT 1""", (dispatch_id,))
                r = cur.fetchone()
                so_number = r[0] if r else None

        so = None
        if so_number:
            cur.execute("SELECT * FROM sales_orders WHERE so_number=%s", (so_number,))
            so = row_to_dict(cur, cur.fetchone())

        pl_type = "Export"
        if dispatch and dispatch.get("dispatch_type"):
            pl_type = dispatch["dispatch_type"]
        elif so and so.get("order_type"):
            pl_type = so["order_type"]

        pl_number = generate_pl_number(pl_type)
        pl_date = datetime.now().date()

        customer = (dispatch.get("customer") if dispatch else None) or (so.get("customer") if so else None) or ""
        customer_short = so.get("customer_short_code") if so else None
        cust_addr = so.get("delivery_address") if so else None
        cust_gstin = so.get("gstin") if so else None
        consignee = so.get("consignee") if so else None
        consignee_addr = so.get("consignee_address") if so else None

        cur.execute("""INSERT INTO packing_lists (
            pl_number, pl_date, pl_type, dispatch_id, invoice_no, so_number,
            customer, customer_short_code, customer_address, customer_gstin,
            consignee_name, consignee_address,
            po_number, po_date, do_number,
            vehicle_no, transporter,
            container_no, seal_no, vessel_name, bl_number,
            port_loading, port_discharge, final_destination,
            total_net_wt_kg, total_gross_wt_kg,
            status
        ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (
            pl_number, pl_date, pl_type, dispatch_id,
            dispatch.get("invoice_no") if dispatch else None,
            so_number,
            customer, customer_short, cust_addr, cust_gstin,
            consignee, consignee_addr,
            so.get("po_number") if so else None,
            so.get("po_date") if so else None,
            so.get("do_number") if so else None,
            dispatch.get("vehicle_no") if dispatch else None,
            dispatch.get("transporter") if dispatch else None,
            dispatch.get("container_no") if dispatch else None,
            dispatch.get("seal_no") if dispatch else None,
            dispatch.get("vessel_name") if dispatch else None,
            dispatch.get("bl_number") if dispatch else None,
            dispatch.get("port_loading") if dispatch else None,
            dispatch.get("port_discharge") if dispatch else None,
            dispatch.get("final_destination") if dispatch else None,
            dispatch.get("total_net_wt_kg") if dispatch else 0,
            dispatch.get("total_gross_wt_kg") if dispatch else 0,
            "Draft"
        ))
        pl_id = cur.lastrowid

        if dispatch_id:
            cur.execute("""SELECT db.*, b.colour_code, b.tolerance, b.ht_process, b.bb_process
                           FROM dispatch_batches db
                           LEFT JOIN batches b ON db.batch_card_no = b.batch_card_no
                           WHERE db.dispatch_id=%s
                           ORDER BY db.id""", (dispatch_id,))
            items = rows_to_list(cur)
            for i, it in enumerate(items, 1):
                cur.execute("""INSERT INTO packing_list_items (
                    packing_list_id, line_no, heat_no, grade, shape, size_mm,
                    length_range, condition_bhn, colour_code,
                    no_of_bundles, no_of_pcs, net_wt_kg, gross_wt_kg
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""", (
                    pl_id, i,
                    it.get("heat_no"),
                    it.get("grade"),
                    "Round",
                    it.get("size_mm"),
                    it.get("length_range"),
                    it.get("condition_bhn"),
                    it.get("colour_code"),
                    it.get("no_of_bundles"),
                    it.get("no_of_pcs"),
                    it.get("net_wt_kg"),
                    it.get("gross_wt_kg")
                ))

        conn.commit()
        cur.close(); conn.close()
        return jsonify({
            "status": "ok",
            "pl_id": pl_id,
            "pl_number": pl_number,
            "pl_type": pl_type,
            "message": f"Packing List {pl_number} created"
        })
    except Exception as e:
        import traceback
        try: conn.rollback()
        except: pass
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


@packing_list_bp.route("/api/packing-list/list", methods=["GET"])
def list_packing_lists():
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("""SELECT id, pl_number, pl_date, pl_type, invoice_no, so_number,
                       customer, total_net_wt_kg, status, created_at
                       FROM packing_lists ORDER BY created_at DESC""")
        lists = rows_to_list(cur)
        cur.close(); conn.close()
        return jsonify({"status": "ok", "packing_lists": lists})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@packing_list_bp.route("/api/packing-list/<int:pl_id>", methods=["GET"])
def get_packing_list(pl_id):
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("SELECT * FROM packing_lists WHERE id=%s", (pl_id,))
        pl = row_to_dict(cur, cur.fetchone())
        if not pl:
            cur.close(); conn.close()
            return jsonify({"error": "Packing list not found"}), 404
        cur.execute("SELECT * FROM packing_list_items WHERE packing_list_id=%s ORDER BY line_no", (pl_id,))
        items = rows_to_list(cur)
        cur.close(); conn.close()
        return jsonify({"status": "ok", "packing_list": pl, "items": items})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@packing_list_bp.route("/api/pdf/packing-list/<int:pl_id>", methods=["GET"])
def packing_list_pdf(pl_id):
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("SELECT * FROM packing_lists WHERE id=%s", (pl_id,))
        pl = row_to_dict(cur, cur.fetchone())
        if not pl:
            cur.close(); conn.close()
            return jsonify({"error": "Packing list not found"}), 404
        cur.execute("SELECT * FROM packing_list_items WHERE packing_list_id=%s ORDER BY line_no", (pl_id,))
        items = rows_to_list(cur)
        cur.close(); conn.close()

        if pl.get("pl_type") == "Domestic":
            html = build_domestic_packing_list_html(pl, items)
        else:
            html = build_export_packing_list_html(pl, items)
        return Response(html, mimetype="text/html")
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500


def build_domestic_packing_list_html(pl, items):
    pl_no = safe(pl.get("pl_number"))
    pl_date = fmt_date(pl.get("pl_date"))
    customer = safe(pl.get("customer"), "Customer")
    customer_short = safe(pl.get("customer_short_code"), customer)
    prepared_by = safe(pl.get("prepared_by"), "Manisha Murte")
    do_no = safe(pl.get("do_number"))

    heat_groups = OrderedDict()
    for it in items:
        h = safe(it.get("heat_no"), "-")
        if h not in heat_groups:
            heat_groups[h] = []
        heat_groups[h].append(it)

    rows_html = ""
    grand_qty = 0.0
    grand_pcs = 0

    for heat_no, heat_items in heat_groups.items():
        heat_qty = 0.0
        heat_pcs = 0
        for i, it in enumerate(heat_items):
            qty = float(it.get("net_wt_kg") or 0)
            pcs = int(it.get("no_of_pcs") or 0)
            heat_qty += qty
            heat_pcs += pcs
            heat_cell = heat_no if i == 0 else ""

            rows_html += f"""<tr>
                <td style="font-weight:bold;">{heat_cell}</td>
                <td>{safe(it.get('grade'))}</td>
                <td style="text-align:center;">{safe(it.get('shape'), 'Round')}</td>
                <td style="text-align:center;">{fmt_num(it.get('size_mm'), 2)}</td>
                <td style="text-align:center;">{safe(it.get('condition_bhn'))}</td>
                <td style="text-align:right;">{fmt_num(qty, 0) if qty else ''}</td>
                <td style="text-align:center;">{pcs if pcs else ''}</td>
                <td style="text-align:center;">{safe(it.get('length_range'))}</td>
                <td>{customer_short}</td>
                <td>{safe(it.get('colour_code'))}</td>
                <td style="text-align:center;">{do_no}</td>
            </tr>"""

        rows_html += f"""<tr class="subtotal">
            <td colspan="5"></td>
            <td style="text-align:right;font-weight:bold;">{fmt_num(heat_qty, 0)}</td>
            <td style="text-align:center;font-weight:bold;">{heat_pcs}</td>
            <td colspan="4"></td>
        </tr>"""

        grand_qty += heat_qty
        grand_pcs += heat_pcs

    rows_html += f"""<tr class="grand-total">
        <td colspan="5"></td>
        <td style="text-align:right;font-weight:bold;font-size:10.5pt;">{fmt_num(grand_qty, 0)}</td>
        <td style="text-align:center;font-weight:bold;font-size:10.5pt;">{grand_pcs}</td>
        <td colspan="4"></td>
    </tr>"""

    css = (
        "*{box-sizing:border-box;margin:0;padding:0;}"
        "body{font-family:'Calibri','Arial',sans-serif;font-size:11pt;color:#111;background:#ccc;}"
        ".no-print{position:fixed;top:12px;right:18px;z-index:999;background:#E8642A;color:white;"
        "border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:10pt;font-weight:bold;}"
        ".page{width:210mm;min-height:297mm;background:white;margin:16px auto;padding:15mm 18mm;"
        "box-shadow:0 4px 20px rgba(0,0,0,0.2);}"
        ".title{font-size:14pt;font-weight:bold;margin:8px 0 4px;}"
        ".subtitle{font-size:10.5pt;font-weight:bold;margin-bottom:6px;}"
        "table.data{width:100%;border-collapse:collapse;margin-bottom:8px;}"
        "table.data td,table.data th{border:1px solid #000;padding:5px 6px;vertical-align:middle;font-size:9.5pt;}"
        "table.data th{background:#f0f0f0;font-weight:bold;text-align:center;font-size:9pt;}"
        "table.data tr.subtotal td{background:#f9f9f9;}"
        "table.data tr.grand-total td{background:#fff4e6;border-top:2px solid #E8642A;}"
        ".signature-block{margin-top:20mm;font-size:10.5pt;line-height:1.5;}"
        ".signature-block i{font-style:italic;}"
        ".footer{margin-top:25mm;padding-top:10mm;border-top:1px solid #ccc;}"
        ".footer-logo img{height:55px;display:block;}"
        ".footer-tag{color:#E8642A;font-size:10pt;font-weight:500;font-style:italic;margin:6px 0 10px;}"
        ".footer-contact{font-size:9.5pt;margin-bottom:6px;color:#333;}"
        ".footer-contact span{margin-right:18px;}"
        ".footer-address{font-size:9pt;color:#222;line-height:1.5;margin-bottom:4px;}"
        ".footer-tel{font-size:9pt;color:#222;margin-bottom:10px;}"
        ".footer-cert{font-size:8.5pt;color:#222;line-height:1.5;}"
        "@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}"
        "body{background:white;}.no-print{display:none!important;}"
        ".page{margin:0;padding:12mm 15mm;box-shadow:none;width:100%;min-height:auto;}"
        "@page{size:A4 portrait;margin:0;}}"
    )

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Packing List {pl_no}</title><style>{css}</style></head><body>
<button class="no-print" onclick="window.print()">&#128424; Print / Save PDF</button>
<div class="page">

<div class="title">Packing List</div>
<div class="subtitle">{customer_short} Packing List {pl_date}</div>

<table class="data">
  <tr>
    <th style="width:10%;">H No</th>
    <th style="width:10%;">Grade</th>
    <th style="width:7%;">Shape</th>
    <th style="width:7%;">Size</th>
    <th style="width:9%;">Cond.</th>
    <th style="width:10%;">Packed Qty(kgs)</th>
    <th style="width:6%;">PCS</th>
    <th style="width:11%;">Length(mm)</th>
    <th style="width:10%;">Customer</th>
    <th style="width:12%;">Colour Code</th>
    <th style="width:8%;">Do No</th>
  </tr>
  {rows_html}
</table>

<div class="signature-block">
  <i>Regards,</i><br>
  <i><b>{prepared_by}</b></i><br>
  <i>Customer Relationship Management</i><br>
  <i>For Alok Ingots (Mumbai) Pvt. Ltd.</i>
</div>

<div class="footer">
  <div class="footer-logo">
    <img src="data:image/png;base64,{ALOK_LOGO_B64}" alt="Alok Ingots">
  </div>
  <div class="footer-tag">&#10022; See How Your Steel Made</div>
  <div class="footer-contact">
    <span>&#9993; crm1@alokindia.com</span>
    <span>&#9742; +91 98338 81775</span>
    <span>&#127760; www.alokindia.com</span>
  </div>
  <div class="footer-address"><b>Office:</b> 602, Raheja Chambers, 213 Free Press Journal Marg, Nariman Point, Mumbai &ndash; 400021, India</div>
  <div class="footer-address"><b>Works:</b> 95/3/2, Vijaypur Village, Taluka Wada, District Palghar, Maharashtra &ndash; 421303, India</div>
  <div class="footer-tel"><b>Telephone:</b> +91 (22) 2208 0815 | +91 (22) 2208 0516  &nbsp; <b>Fax:</b> +91 (22) 2208 0813</div>
  <div class="footer-cert">
    <b>Certifications:</b> ISO 9001:2008 | PED 97/23/EC | AD 2000 MERKBLATT W0 | STEELMAKER (MARITIME) | ISO/TS 16949:2009 | IBR Approved
  </div>
</div>

</div></body></html>"""


def build_export_packing_list_html(pl, items):
    return build_domestic_packing_list_html(pl, items)