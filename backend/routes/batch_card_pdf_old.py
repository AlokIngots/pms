from flask import Blueprint, Response, jsonify, request
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime, date
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
    inv_no = safe(pl.get("invoice_no"))
    so_no = safe(pl.get("so_number"))
    po_no = safe(pl.get("po_number"))
    do_no = safe(pl.get("do_number"))
    customer = safe(pl.get("customer"))
    cust_addr = safe(pl.get("customer_address"))
    cust_gstin = safe(pl.get("customer_gstin"))
    consignee = safe(pl.get("consignee_name"))
    consignee_addr = safe(pl.get("consignee_address"))
    vehicle = safe(pl.get("vehicle_no"))
    transporter = safe(pl.get("transporter"))
    lr_no = safe(pl.get("lr_number"))
    lr_date = fmt_date(pl.get("lr_date"))
    eway = safe(pl.get("remarks"))
    prepared_by = safe(pl.get("prepared_by"), "Manisha Murte")

    rows = ""
    total_pcs = 0
    total_bundles = 0
    total_net_wt = 0.0
    total_gross_wt = 0.0
    for it in items:
        pcs = int(it.get("no_of_pcs") or 0)
        bundles = int(it.get("no_of_bundles") or 0)
        net_wt = float(it.get("net_wt_kg") or 0)
        gross_wt = float(it.get("gross_wt_kg") or 0)
        total_pcs += pcs
        total_bundles += bundles
        total_net_wt += net_wt
        total_gross_wt += gross_wt

        rows += f"""<tr>
            <td>{safe(it.get('heat_no'))}</td>
            <td>{safe(it.get('grade'))}</td>
            <td style="text-align:center;">{safe(it.get('shape'),'Round')}</td>
            <td style="text-align:center;">{fmt_num(it.get('size_mm'), 2)}</td>
            <td style="text-align:center;">{safe(it.get('condition_bhn'))}</td>
            <td style="text-align:right;">{fmt_num(net_wt, 0) if net_wt else ''}</td>
            <td style="text-align:center;">{fmt_int(pcs) if pcs else ''}</td>
            <td style="text-align:center;">{safe(it.get('length_range'))}</td>
            <td>{customer}</td>
            <td>{safe(it.get('colour_code'))}</td>
            <td style="text-align:center;">{do_no}</td>
        </tr>"""

    css = (
        "*{box-sizing:border-box;margin:0;padding:0;}"
        "body{font-family:Arial,sans-serif;font-size:9pt;color:#111;background:#ccc;}"
        ".no-print{position:fixed;top:12px;right:18px;z-index:999;background:#E8642A;color:white;"
        "border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:10pt;font-weight:bold;}"
        ".page{width:210mm;min-height:297mm;background:white;margin:16px auto;padding:10mm 12mm;"
        "box-shadow:0 4px 20px rgba(0,0,0,0.2);}"
        ".title{text-align:center;font-size:18pt;font-weight:bold;letter-spacing:2px;margin:8px 0;}"
        ".subtitle{text-align:center;font-size:9pt;color:#666;margin-bottom:8px;}"
        "table{width:100%;border-collapse:collapse;}"
        "td,th{border:1px solid #333;padding:4px 6px;vertical-align:middle;font-size:8.5pt;}"
        "th{background:#f0f0f0;font-weight:bold;text-align:center;font-size:8pt;}"
        ".lbl{background:#f5f5f5;font-weight:bold;font-size:8.5pt;white-space:nowrap;}"
        ".orange{color:#E8642A;font-weight:bold;}"
        ".section-title{background:#dce8f5;color:#185FA5;font-weight:bold;padding:4px 6px;margin:6px 0 2px;font-size:9pt;}"
        ".footer{border-top:1.5px solid #E8642A;margin-top:16px;padding-top:8px;}"
        ".totals td{font-weight:bold;background:#fff4e6;}"
        "@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}"
        "body{background:white;}.no-print{display:none!important;}"
        ".page{margin:0;padding:8mm 10mm;box-shadow:none;width:100%;min-height:auto;}"
        "@page{size:A4 portrait;margin:0;}}"
    )

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Packing List {pl_no}</title><style>{css}</style></head><body>
<button class="no-print" onclick="window.print()">&#128424; Print / Save PDF</button>
<div class="page">

<table style="border:none;margin-bottom:6px;"><tr>
  <td style="border:none;width:60mm;vertical-align:middle;">
    <img src="data:image/png;base64,{ALOK_LOGO_B64}" style="height:55px;width:auto;">
  </td>
  <td style="border:none;text-align:center;vertical-align:middle;">
    <div style="font-size:12pt;font-weight:bold;">ALOK INGOTS (MUMBAI) PVT. LTD.</div>
    <div style="font-size:8pt;color:#444;">Plot No.95/3/2, Vijaypur Village (Kone), Taluka Wada, Dist. Palghar, Maharashtra - 421303</div>
    <div style="font-size:8pt;color:#444;">Tel: 09987770330/34 · E-Mail: invoices@alokindia.com · Web: www.alokindia.com</div>
    <div style="font-size:8pt;color:#444;">GSTIN: 27AAECA7915K1ZF · PAN: AAECA7915K · CIN: U27100MH2004PTC147383</div>
  </td>
  <td style="border:none;width:30mm;text-align:right;vertical-align:middle;">
    <div style="font-size:7.5pt;color:#888;">Format No:</div>
    <div style="font-size:8pt;font-weight:bold;">DI/QAD/08</div>
  </td>
</tr></table>

<div style="border-top:2px solid #E8642A;margin-bottom:6px;"></div>
<div class="title">PACKING LIST</div>
<div class="subtitle">(Domestic)</div>

<table style="margin-bottom:6px;">
  <tr>
    <td class="lbl" style="width:28mm;">PL No.</td>
    <td style="width:48mm;"><span class="orange">{pl_no}</span></td>
    <td class="lbl" style="width:22mm;">PL Date</td>
    <td style="width:30mm;">{pl_date}</td>
    <td class="lbl" style="width:22mm;">Invoice No.</td>
    <td>{inv_no}</td>
  </tr>
  <tr>
    <td class="lbl">SO No.</td>
    <td>{so_no}</td>
    <td class="lbl">PO No.</td>
    <td>{po_no}</td>
    <td class="lbl">DO No.</td>
    <td>{do_no}</td>
  </tr>
</table>

<div class="section-title">BILLED TO</div>
<table style="margin-bottom:6px;">
  <tr>
    <td class="lbl" style="width:28mm;">Name</td>
    <td style="width:70mm;"><b>{customer}</b></td>
    <td class="lbl" style="width:22mm;">GSTIN</td>
    <td>{cust_gstin}</td>
  </tr>
  <tr>
    <td class="lbl">Address</td>
    <td colspan="3">{cust_addr}</td>
  </tr>
</table>

<div class="section-title">SHIPPED TO / CONSIGNEE</div>
<table style="margin-bottom:6px;">
  <tr>
    <td class="lbl" style="width:28mm;">Name</td>
    <td><b>{consignee or customer}</b></td>
  </tr>
  <tr>
    <td class="lbl">Address</td>
    <td>{consignee_addr or cust_addr}</td>
  </tr>
</table>

<div class="section-title">TRANSPORT DETAILS</div>
<table style="margin-bottom:8px;">
  <tr>
    <td class="lbl" style="width:28mm;">Vehicle No.</td>
    <td style="width:40mm;">{vehicle}</td>
    <td class="lbl" style="width:26mm;">Transporter</td>
    <td>{transporter}</td>
  </tr>
  <tr>
    <td class="lbl">LR Number</td>
    <td>{lr_no}</td>
    <td class="lbl">LR Date</td>
    <td>{lr_date}</td>
  </tr>
</table>

<div class="section-title">PACKING DETAILS</div>
<table style="margin-bottom:8px;">
  <tr>
    <th style="width:18mm;">Heat No.</th>
    <th style="width:18mm;">Grade</th>
    <th style="width:14mm;">Shape</th>
    <th style="width:14mm;">Size (mm)</th>
    <th style="width:18mm;">Cond. (BHN)</th>
    <th style="width:20mm;">Packed Qty (kgs)</th>
    <th style="width:12mm;">PCS</th>
    <th style="width:20mm;">Length (mm)</th>
    <th>Customer</th>
    <th style="width:22mm;">Colour Code</th>
    <th style="width:14mm;">DO No.</th>
  </tr>
  {rows}
  <tr class="totals">
    <td colspan="5" style="text-align:right;">TOTAL</td>
    <td style="text-align:right;">{fmt_num(total_net_wt, 0)}</td>
    <td style="text-align:center;">{fmt_int(total_pcs)}</td>
    <td colspan="4"></td>
  </tr>
</table>

<table style="margin-bottom:6px;border:none;">
  <tr>
    <td style="border:none;width:50%;vertical-align:top;">
      <div style="font-size:8pt;color:#666;">Total Bundles: <b>{fmt_int(total_bundles)}</b></div>
      <div style="font-size:8pt;color:#666;">Total Pieces: <b>{fmt_int(total_pcs)}</b></div>
      <div style="font-size:8pt;color:#666;">Total Net Weight: <b>{fmt_num(total_net_wt, 3)} kgs</b></div>
      <div style="font-size:8pt;color:#666;">Total Gross Weight: <b>{fmt_num(total_gross_wt, 3) if total_gross_wt > 0 else fmt_num(total_net_wt, 3)} kgs</b></div>
    </td>
    <td style="border:none;vertical-align:top;text-align:right;">
      <div style="font-size:8pt;color:#666;">E-Way Bill No: {eway}</div>
    </td>
  </tr>
</table>

<table style="margin-top:20mm;border:none;">
  <tr>
    <td style="border:none;width:50%;">
      <div style="font-size:8pt;color:#666;">Prepared by</div>
      <div style="margin-top:12mm;font-weight:bold;">{prepared_by}</div>
      <div style="font-size:7.5pt;color:#666;">Customer Relationship Management</div>
    </td>
    <td style="border:none;width:50%;text-align:right;">
      <div style="font-size:8pt;color:#666;">For ALOK INGOTS (MUMBAI) PVT. LTD.</div>
      <div style="margin-top:12mm;font-weight:bold;">Authorised Signatory</div>
    </td>
  </tr>
</table>

<div class="footer">
  <div style="text-align:center;font-size:7.5pt;color:#888;">
    Regd. Office: 119, Dady Sheth Agyari Lane, 1st Floor, Office 6, Kalbadevi, Mumbai-400002 |
    Works: Plot 95/3/2, Vijaypur Village, Taluka Wada, Dist. Palghar, 421303
  </div>
  <div style="text-align:center;font-size:7pt;color:#888;margin-top:2px;">
    ISO 9001:2015 | IATF 16949:2016 | PED 2014/68/EU | AD 2000 Merkblatt W0
  </div>
</div>

</div></body></html>"""


def build_export_packing_list_html(pl, items):
    pl_no = safe(pl.get("pl_number"))
    pl_date = fmt_date(pl.get("pl_date"))
    inv_no = safe(pl.get("invoice_no"))
    so_no = safe(pl.get("so_number"))
    po_no = safe(pl.get("po_number"))
    customer = safe(pl.get("customer"))
    cust_addr = safe(pl.get("customer_address"))
    consignee = safe(pl.get("consignee_name"))
    consignee_addr = safe(pl.get("consignee_address"))
    container = safe(pl.get("container_no"))
    seal = safe(pl.get("seal_no"))
    vessel = safe(pl.get("vessel_name"))
    bl = safe(pl.get("bl_number"))
    pol = safe(pl.get("port_loading"))
    pod = safe(pl.get("port_discharge"))
    final_dest = safe(pl.get("final_destination"))
    prepared_by = safe(pl.get("prepared_by"), "Manisha Murte")

    rows = ""
    total_pcs = 0
    total_bundles = 0
    total_net_wt = 0.0
    total_gross_wt = 0.0
    for it in items:
        pcs = int(it.get("no_of_pcs") or 0)
        bundles = int(it.get("no_of_bundles") or 0)
        net_wt = float(it.get("net_wt_kg") or 0)
        gross_wt = float(it.get("gross_wt_kg") or 0)
        total_pcs += pcs
        total_bundles += bundles
        total_net_wt += net_wt
        total_gross_wt += gross_wt

        rows += f"""<tr>
            <td style="text-align:center;">{safe(it.get('line_no'))}</td>
            <td>{safe(it.get('heat_no'))}</td>
            <td>{safe(it.get('grade'))}</td>
            <td style="text-align:center;">{safe(it.get('shape'),'Round')}</td>
            <td style="text-align:center;">{fmt_num(it.get('size_mm'), 2)}</td>
            <td style="text-align:center;">{safe(it.get('length_range'))}</td>
            <td style="text-align:center;">{safe(it.get('colour_code'))}</td>
            <td style="text-align:center;">{fmt_int(bundles) if bundles else ''}</td>
            <td style="text-align:center;">{fmt_int(pcs) if pcs else ''}</td>
            <td style="text-align:right;">{fmt_num(net_wt, 3) if net_wt else ''}</td>
            <td style="text-align:right;">{fmt_num(gross_wt, 3) if gross_wt else ''}</td>
        </tr>"""

    css = (
        "*{box-sizing:border-box;margin:0;padding:0;}"
        "body{font-family:Arial,sans-serif;font-size:9pt;color:#111;background:#ccc;}"
        ".no-print{position:fixed;top:12px;right:18px;z-index:999;background:#E8642A;color:white;"
        "border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:10pt;font-weight:bold;}"
        ".page{width:210mm;min-height:297mm;background:white;margin:16px auto;padding:10mm 12mm;"
        "box-shadow:0 4px 20px rgba(0,0,0,0.2);}"
        ".title{text-align:center;font-size:20pt;font-weight:bold;letter-spacing:2px;margin:8px 0;}"
        ".subtitle{text-align:center;font-size:10pt;color:#666;margin-bottom:8px;font-weight:bold;}"
        "table{width:100%;border-collapse:collapse;}"
        "td,th{border:1px solid #333;padding:4px 6px;vertical-align:middle;font-size:8.5pt;}"
        "th{background:#f0f0f0;font-weight:bold;text-align:center;font-size:8pt;}"
        ".lbl{background:#f5f5f5;font-weight:bold;font-size:8.5pt;white-space:nowrap;}"
        ".orange{color:#E8642A;font-weight:bold;}"
        ".section-title{background:#dce8f5;color:#185FA5;font-weight:bold;padding:4px 6px;margin:6px 0 2px;font-size:9pt;}"
        ".footer{border-top:1.5px solid #E8642A;margin-top:16px;padding-top:8px;}"
        ".totals td{font-weight:bold;background:#fff4e6;}"
        "@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}"
        "body{background:white;}.no-print{display:none!important;}"
        ".page{margin:0;padding:8mm 10mm;box-shadow:none;width:100%;min-height:auto;}"
        "@page{size:A4 portrait;margin:0;}}"
    )

    return f"""<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Packing List {pl_no}</title><style>{css}</style></head><body>
<button class="no-print" onclick="window.print()">&#128424; Print / Save PDF</button>
<div class="page">

<table style="border:none;margin-bottom:6px;"><tr>
  <td style="border:none;width:60mm;vertical-align:middle;">
    <img src="data:image/png;base64,{ALOK_LOGO_B64}" style="height:55px;width:auto;">
  </td>
  <td style="border:none;text-align:center;vertical-align:middle;">
    <div style="font-size:12pt;font-weight:bold;">ALOK INGOTS (MUMBAI) PVT. LTD.</div>
    <div style="font-size:8pt;color:#444;">Plot No.95/3/2, Vijaypur Village (Kone), Taluka Wada, Dist. Palghar, Maharashtra - 421303, India</div>
    <div style="font-size:8pt;color:#444;">IEC: 0304079421 · GSTIN: 27AAECA7915K1ZF · www.alokindia.com</div>
  </td>
  <td style="border:none;width:30mm;text-align:right;vertical-align:middle;">
    <div style="font-size:7.5pt;color:#888;">Format No:</div>
    <div style="font-size:8pt;font-weight:bold;">DI/QAD/08</div>
  </td>
</tr></table>

<div style="border-top:2px solid #E8642A;margin-bottom:6px;"></div>
<div class="title">PACKING LIST</div>
<div class="subtitle">(Export)</div>

<table style="margin-bottom:6px;">
  <tr>
    <td class="lbl" style="width:30mm;">PL No.</td>
    <td style="width:44mm;"><span class="orange">{pl_no}</span></td>
    <td class="lbl" style="width:22mm;">PL Date</td>
    <td style="width:30mm;">{pl_date}</td>
    <td class="lbl" style="width:26mm;">Invoice No.</td>
    <td>{inv_no}</td>
  </tr>
  <tr>
    <td class="lbl">SO No.</td>
    <td>{so_no}</td>
    <td class="lbl">PO No.</td>
    <td>{po_no}</td>
    <td class="lbl">Country of Origin</td>
    <td>India</td>
  </tr>
</table>

<div class="section-title">EXPORTER</div>
<table style="margin-bottom:6px;">
  <tr>
    <td><b>ALOK INGOTS (MUMBAI) PVT. LTD.</b><br>
    Plot No.95/3/2, Vijaypur Village (Kone), Taluka Wada, Dist. Palghar, Maharashtra - 421303, India<br>
    IEC: 0304079421 | GSTIN: 27AAECA7915K1ZF</td>
  </tr>
</table>

<div class="section-title">CONSIGNEE / BUYER</div>
<table style="margin-bottom:6px;">
  <tr>
    <td><b>{consignee or customer}</b><br>{consignee_addr or cust_addr}</td>
  </tr>
</table>

<div class="section-title">SHIPMENT DETAILS</div>
<table style="margin-bottom:8px;">
  <tr>
    <td class="lbl" style="width:30mm;">Vessel / Voyage</td>
    <td style="width:45mm;">{vessel}</td>
    <td class="lbl" style="width:28mm;">B/L Number</td>
    <td>{bl}</td>
  </tr>
  <tr>
    <td class="lbl">Container No.</td>
    <td>{container}</td>
    <td class="lbl">Seal No.</td>
    <td>{seal}</td>
  </tr>
  <tr>
    <td class="lbl">Port of Loading</td>
    <td>{pol}</td>
    <td class="lbl">Port of Discharge</td>
    <td>{pod}</td>
  </tr>
  <tr>
    <td class="lbl">Final Destination</td>
    <td colspan="3">{final_dest}</td>
  </tr>
</table>

<div class="section-title">PACKING DETAILS</div>
<table style="margin-bottom:8px;">
  <tr>
    <th style="width:8mm;">Sr.</th>
    <th style="width:18mm;">Heat No.</th>
    <th style="width:18mm;">Grade</th>
    <th style="width:14mm;">Shape</th>
    <th style="width:14mm;">Size (mm)</th>
    <th style="width:22mm;">Length (mm)</th>
    <th style="width:22mm;">Colour Code</th>
    <th style="width:14mm;">Bundles</th>
    <th style="width:14mm;">Pcs</th>
    <th style="width:22mm;">Net Wt (kg)</th>
    <th style="width:22mm;">Gross Wt (kg)</th>
  </tr>
  {rows}
  <tr class="totals">
    <td colspan="7" style="text-align:right;">TOTAL</td>
    <td style="text-align:center;">{fmt_int(total_bundles)}</td>
    <td style="text-align:center;">{fmt_int(total_pcs)}</td>
    <td style="text-align:right;">{fmt_num(total_net_wt, 3)}</td>
    <td style="text-align:right;">{fmt_num(total_gross_wt, 3)}</td>
  </tr>
</table>

<table style="margin-bottom:6px;">
  <tr>
    <td class="lbl" style="width:35mm;">Total Bundles</td>
    <td style="width:35mm;"><b>{fmt_int(total_bundles)}</b></td>
    <td class="lbl" style="width:35mm;">Total Pieces</td>
    <td><b>{fmt_int(total_pcs)}</b></td>
  </tr>
  <tr>
    <td class="lbl">Total Net Weight</td>
    <td><b>{fmt_num(total_net_wt, 3)} kg</b></td>
    <td class="lbl">Total Gross Weight</td>
    <td><b>{fmt_num(total_gross_wt, 3)} kg</b></td>
  </tr>
</table>

<div style="font-size:8pt;color:#444;margin-top:8px;">
  <b>Declaration:</b> We declare that this packing list shows the true and correct particulars of the goods.
  The goods are of Indian Origin. Material is free from Mercury, Cobalt or any Radioactive Contamination.
</div>

<table style="margin-top:15mm;border:none;">
  <tr>
    <td style="border:none;width:50%;">
      <div style="font-size:8pt;color:#666;">Prepared by</div>
      <div style="margin-top:12mm;font-weight:bold;">{prepared_by}</div>
    </td>
    <td style="border:none;width:50%;text-align:right;">
      <div style="font-size:8pt;color:#666;">For ALOK INGOTS (MUMBAI) PVT. LTD.</div>
      <div style="margin-top:12mm;font-weight:bold;">Authorised Signatory</div>
    </td>
  </tr>
</table>

<div class="footer">
  <div style="text-align:center;font-size:7.5pt;color:#888;">
    Regd. Office: 119, Dady Sheth Agyari Lane, 1st Floor, Office 6, Kalbadevi, Mumbai-400002, India |
    Works: Plot 95/3/2, Vijaypur Village, Taluka Wada, Dist. Palghar, 421303
  </div>
  <div style="text-align:center;font-size:7pt;color:#888;margin-top:2px;">
    ISO 9001:2015 | IATF 16949:2016 | PED 2014/68/EU | AD 2000 Merkblatt W0
  </div>
</div>

</div></body></html>"""