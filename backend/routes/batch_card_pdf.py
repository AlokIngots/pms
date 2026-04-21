from flask import Blueprint, Response, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime, date
import qrcode
import secrets
import base64
import os
from io import BytesIO

batch_card_bp = Blueprint("batch_card_bp", __name__)

def _load_logo_b64():
    """Load ALOK logo from PNG file automatically."""
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

ALOK_LOGO_B64 = _load_logo_b64()  # ⚠️ KEEP YOUR EXISTING LOGO STRING HERE

# ========== QR GENERATION HELPERS ==========
PMS_SCAN_BASE_URL = "http://localhost:5000"  # Change to your actual domain in production

def generate_qr_token():
    return secrets.token_urlsafe(24)

def generate_qr_base64(batch_id, qr_token):
    """Main batch QR - opens scan form with auto-stage detection."""
    url = f"{PMS_SCAN_BASE_URL}/scan?b={batch_id}&t={qr_token}"
    qr = qrcode.QRCode(version=3, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=8, border=2)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO(); img.save(buf, format="PNG"); buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode()

def generate_stage_qr_base64(batch_id, qr_token, stage_name):
    """Stage-specific QR - opens form for THIS batch + THIS stage directly."""
    url = f"{PMS_SCAN_BASE_URL}/scan?b={batch_id}&t={qr_token}&s={stage_name}"
    qr = qrcode.QRCode(version=2, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=6, border=1)
    qr.add_data(url); qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = BytesIO(); img.save(buf, format="PNG"); buf.seek(0)
    return base64.b64encode(buf.getvalue()).decode()

def ensure_qr_token(conn, cur, batch_id, batch):
    existing_token = batch.get("qr_token")
    if existing_token:
        return existing_token
    new_token = generate_qr_token()
    cur.execute("UPDATE batches SET qr_token=%s WHERE id=%s", (new_token, batch_id))
    conn.commit()
    batch["qr_token"] = new_token
    return new_token

def safe(v, default=""):
    if v is None or str(v).strip() == "": return default
    return str(v).strip()

def fmt_date(d):
    if not d: return ""
    if isinstance(d, (datetime, date)): return d.strftime("%d/%m/%Y")
    try: return datetime.strptime(str(d)[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
    except: return str(d)


def build_batch_card_html(batch, card, so, logs, qr_b64, batch_id, stage_qrs):
    batch_no   = safe(batch.get("batch_card_no"))
    grade      = safe(batch.get("grade_code") or batch.get("grade"))
    size_mm    = safe(batch.get("size_mm"))
    heat_no    = safe(batch.get("heat_no"))
    no_pcs     = safe(batch.get("no_of_pcs"), "0")
    weight_kg  = safe(batch.get("weight_kg") or batch.get("weight_mtm"))
    ht_process = safe(batch.get("ht_process"))
    bb_process = safe(batch.get("bb_process"))
    customer   = safe(batch.get("customer"))
    colour     = safe(batch.get("colour_code"))
    today      = datetime.now().strftime("%d/%m/%Y")
    card_date  = safe(card.get("date"), today)
    do_year    = safe(card.get("do_year"), "2025-26")
    prep_by    = safe(card.get("prepared_by"))
    finish_tol = safe(card.get("finish_size_tol"))
    do_no      = safe(card.get("customer_do_no"))
    item_no    = safe(card.get("item_no"))
    length_mm  = safe(card.get("length_mm") or (so.get("length_mm") if so else ""))
    bundle_wt  = safe(card.get("bundle_weight_kg"))
    ra_val     = safe(card.get("ra_value"))
    ovality    = safe(card.get("ovality"))
    straight   = safe(card.get("straightness"))
    remark     = safe(card.get("remark"))
    black_len  = safe(card.get("black_length_mm"))
    so_number  = safe(so.get("so_number") if so else "")
    po_number  = safe(so.get("po_number") if so else "")
    incoterm   = safe(so.get("incoterm") if so else "")

    css = (
        "*{box-sizing:border-box;margin:0;padding:0;}"
        "body{font-family:Arial,sans-serif;font-size:8.5pt;color:#111;background:#ccc;}"
        ".no-print{position:fixed;top:12px;right:18px;z-index:999;background:#E8642A;color:white;"
        "border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:10pt;font-weight:bold;}"
        ".page{width:210mm;min-height:297mm;background:white;margin:16px auto;padding:7mm 8mm;"
        "box-shadow:0 4px 20px rgba(0,0,0,0.2);}"
        "table{width:100%;border-collapse:collapse;}"
        "td,th{border:1px solid #aaa;padding:3px 5px;vertical-align:middle;font-size:8pt;}"
        "th{background:#f0f0f0;font-weight:bold;text-align:center;font-size:7.5pt;}"
        ".lbl{background:#f0f0f0;font-weight:bold;font-size:7.5pt;white-space:nowrap;}"
        ".s-blue{background:#dce8f5;font-weight:bold;font-size:8.5pt;color:#185FA5;padding:3px 5px;margin-bottom:2px;display:flex;justify-content:space-between;align-items:center;}"
        ".s-green{background:#e6f2e0;font-weight:bold;font-size:8.5pt;color:#3B6D11;padding:3px 5px;margin-bottom:2px;display:flex;justify-content:space-between;align-items:center;}"
        ".s-brown{background:#fdf0e0;font-weight:bold;font-size:8.5pt;color:#854F0B;padding:3px 5px;margin-bottom:2px;display:flex;justify-content:space-between;align-items:center;}"
        ".s-navy{background:#e8edf5;font-weight:bold;font-size:8.5pt;color:#1a3a6b;padding:3px 5px;margin-bottom:2px;display:flex;justify-content:space-between;align-items:center;}"
        ".s-red{background:#f5e8e8;font-weight:bold;font-size:8.5pt;color:#8B1A1A;padding:3px 5px;margin-bottom:2px;display:flex;justify-content:space-between;align-items:center;}"
        ".s-blue-plain{background:#dce8f5;font-weight:bold;font-size:8.5pt;color:#185FA5;padding:3px 5px;margin-bottom:2px;}"
        ".s-green-plain{background:#e6f2e0;font-weight:bold;font-size:8.5pt;color:#3B6D11;padding:3px 5px;margin-bottom:2px;}"
        ".orange{color:#E8642A;font-weight:bold;}"
        ".footer-bar{border-top:1px solid #ccc;margin-top:6px;padding-top:4px;text-align:center;font-size:7pt;color:#888;}"
        ".qr-box{text-align:center;font-size:6pt;color:#666;line-height:1.2;}"
        ".qr-box img{display:block;margin:0 auto;}"
        ".stage-qr{height:13mm;width:13mm;}"
        "@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}"
        "body{background:white;}.no-print{display:none!important;}"
        ".page{margin:0;padding:6mm 8mm;box-shadow:none;width:100%;min-height:auto;}"
        "@page{size:A4 portrait;margin:0;}}"
    )

    pg2_header = f"""<div style="page-break-before:always;"></div>
<table style="margin-bottom:4px;border:none;"><tr>
  <td style="border:none;width:50mm;"><img src="data:image/png;base64,{ALOK_LOGO_B64}" style="height:36px;width:auto;"></td>
  <td style="border:none;text-align:center;font-size:10pt;font-weight:bold;">BATCH CARD
    <span style="color:#E8642A;margin-left:8px;font-size:9pt;">{batch_no}</span>
    <div style="font-size:7.5pt;color:#666;font-weight:normal;">Grade: {grade} | Size: {size_mm}mm | Customer: {customer}</div>
  </td>
  <td style="border:none;width:25mm;text-align:right;vertical-align:top;">
    <img src="data:image/png;base64,{qr_b64}" style="width:18mm;height:18mm;">
    <div style="font-size:6pt;color:#888;">Pg 2</div>
  </td>
</tr></table>
<div style="border-top:1.5px solid #E8642A;margin-bottom:5px;"></div>"""

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Batch Card {batch_no}</title>
<style>{css}</style></head><body>
<button class="no-print" onclick="window.print()">&#128424; Print / Save PDF</button>
<div class="page">

<table style="margin-bottom:4px;border:none;"><tr>
  <td style="border:none;width:55mm;vertical-align:middle;">
    <img src="data:image/png;base64,{ALOK_LOGO_B64}" style="height:42px;width:auto;">
  </td>
  <td style="border:none;text-align:center;vertical-align:middle;">
    <div style="font-size:14pt;font-weight:bold;letter-spacing:2px;">BATCH CARD</div>
    <div style="font-size:7pt;color:#666;margin-top:2px;">Format No: DI PRD - BBD / 07</div>
  </td>
  <td style="border:none;width:55mm;text-align:right;vertical-align:middle;">
    <div class="qr-box">
      <img src="data:image/png;base64,{qr_b64}" style="width:22mm;height:22mm;">
      <div style="margin-top:1px;"><b>Batch {batch_no}</b></div>
      <div style="font-size:5.5pt;color:#888;">Main Batch QR</div>
    </div>
  </td>
</tr></table>
<div style="border-top:1.5px solid #E8642A;margin-bottom:5px;"></div>

<table style="margin-bottom:5px;">
  <tr>
    <td class="lbl" style="width:30mm;">Batch Card No.</td>
    <td style="width:38mm;"><span class="orange">{batch_no}</span></td>
    <td class="lbl" style="width:16mm;">Date</td>
    <td style="width:34mm;">{card_date}</td>
    <td class="lbl" style="width:18mm;">DO Year</td>
    <td style="width:26mm;">{do_year}</td>
    <td class="lbl" style="width:22mm;">Prepared by</td>
    <td>{prep_by}</td>
  </tr>
</table>

<table style="margin-bottom:5px;">
  <tr>
    <td colspan="2" class="s-blue-plain" style="width:50%;">BLACK BAR DETAILS</td>
    <td colspan="2" class="s-green-plain">BRIGHT SUPPLY CONDITION</td>
  </tr>
  <tr><td class="lbl" style="width:30mm;">Heat No.</td><td style="width:45mm;">{heat_no}</td><td class="lbl" style="width:32mm;">Finish Size &amp; Tol.</td><td>{finish_tol}</td></tr>
  <tr><td class="lbl">Grade</td><td><b>{grade}</b></td><td class="lbl">Customer Name</td><td><b>{customer}</b></td></tr>
  <tr><td class="lbl">Black Size (mm)</td><td><b>{size_mm}</b></td><td class="lbl">DO No.</td><td>{do_no}</td></tr>
  <tr><td class="lbl">Black Length</td><td>{black_len}</td><td class="lbl">Item No.</td><td>{item_no}</td></tr>
  <tr><td class="lbl">No. of Pcs</td><td>{no_pcs}</td><td class="lbl">Length (mm)</td><td>{length_mm}</td></tr>
  <tr><td class="lbl">Weight (MTM)</td><td>{weight_kg}</td><td class="lbl">Colour Code</td><td>{colour}</td></tr>
  <tr><td class="lbl">HT Process</td><td>{ht_process}</td><td class="lbl">Bundle Wt (kg)</td><td>{bundle_wt}</td></tr>
  <tr><td class="lbl">Bright Bar Process</td><td>{bb_process}</td><td class="lbl">Ra Value</td><td>{ra_val}</td></tr>
  <tr><td class="lbl">SO Number</td><td>{so_number}</td><td class="lbl">Ovality</td><td>{ovality}</td></tr>
  <tr><td class="lbl">PO Number</td><td>{po_number}</td><td class="lbl">Straightness</td><td>{straight}</td></tr>
  <tr><td class="lbl">Inco Term</td><td>{incoterm}</td><td class="lbl">Remark</td><td>{remark}</td></tr>
</table>

<div class="s-blue">
  <span>BLACK BAR INSPECTION</span>
  <img src="data:image/png;base64,{stage_qrs['Black Bar Inspection']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:13%;">Date</th><th style="width:11%;"># Pcs Rec</th><th style="width:9%;">UT OK</th><th style="width:11%;">UT Reject</th><th style="width:12%;">MPI Reject</th><th style="width:13%;">End Cut WT</th><th style="width:13%;">Total OK Pcs</th><th style="width:9%;">OK WT</th><th style="width:9%;">Rej Wt</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-brown">
  <span>HT PROCESS</span>
  <img src="data:image/png;base64,{stage_qrs['HT Process']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:13%;">Date</th><th style="width:14%;">Furnace No</th><th style="width:11%;">No of PCS</th><th style="width:10%;">QTY</th><th style="width:13%;">HT Process</th><th style="width:10%;">Hardness</th><th style="width:10%;">Tensile</th><th style="width:11%;">Ok/Not Ok</th><th style="width:18%;">Remark</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-navy">
  <span>BLACK BAR STRAIGHTENING</span>
  <img src="data:image/png;base64,{stage_qrs['Black Bar Str.']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:13%;">Date</th><th style="width:9%;">Shift</th><th style="width:11%;">No of Pcs</th><th style="width:11%;">Input Size</th><th style="width:12%;">Output Size</th><th style="width:10%;">Ovality</th><th style="width:22%;">Remarks</th><th style="width:12%;">Name/Sign</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-navy">
  <span>PEELING / DRAWING</span>
  <img src="data:image/png;base64,{stage_qrs['Peeling']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:12%;">Date</th><th style="width:8%;">Shift</th><th style="width:10%;">No of Pcs</th><th style="width:10%;">Input Size</th><th style="width:11%;">Output Size</th><th style="width:9%;">Ovality</th><th style="width:16%;">Turning Loss Wt</th><th style="width:14%;">Remarks</th><th style="width:10%;">Name/Sign</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-navy">
  <span>BRIGHT BAR STRAIGHTENING</span>
  <img src="data:image/png;base64,{stage_qrs['Bright Bar Str.']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:13%;">Date</th><th style="width:9%;">Shift</th><th style="width:11%;">No of Pcs</th><th style="width:11%;">Input Size</th><th style="width:12%;">Output Size</th><th style="width:10%;">Ovality</th><th style="width:22%;">Remarks</th><th style="width:12%;">Name/Sign</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="footer-bar">ALOK INGOTS (MUMBAI) PVT. LTD. &nbsp;|&nbsp; ISO 9001:2015 &nbsp;|&nbsp; IATF 16949:2016 &nbsp;|&nbsp; PED 2014/68/EU &nbsp;|&nbsp; AD 2000 Merkblatt W0</div>

{pg2_header}

<div class="s-navy">
  <span>GRINDING</span>
  <img src="data:image/png;base64,{stage_qrs['Grinding']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:12%;">Date</th><th style="width:8%;">Shift</th><th style="width:10%;">No of Pcs</th><th style="width:10%;">Input Size</th><th style="width:11%;">Output Size</th><th style="width:9%;">Ovality</th><th style="width:16%;">Grinding Loss Wt</th><th style="width:14%;">Remarks</th><th style="width:10%;">Name/Sign</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-navy">
  <span>CUTTING</span>
  <img src="data:image/png;base64,{stage_qrs['Cutting']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:12%;">Date</th><th style="width:8%;">Shift</th><th style="width:10%;">No of Pcs</th><th style="width:12%;">Input Length</th><th style="width:12%;">Finish Length</th><th style="width:9%;">Ovality</th><th style="width:13%;">End Cut Wt</th><th style="width:13%;">Remarks</th><th style="width:11%;">Name/Sign</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-navy">
  <span>CHAMFERING</span>
  <img src="data:image/png;base64,{stage_qrs['Chamfering']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:14%;">Date</th><th style="width:9%;">Shift</th><th style="width:12%;">No of Pcs</th><th style="width:13%;">Input Size</th><th style="width:13%;">Output Size</th><th style="width:22%;">Remarks</th><th style="width:17%;">Name/Sign</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-navy">
  <span>POLISHING / BUFFING</span>
  <img src="data:image/png;base64,{stage_qrs['Polishing']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:14%;">Date</th><th style="width:9%;">Shift</th><th style="width:12%;">No of Pcs</th><th style="width:13%;">Input Size</th><th style="width:13%;">Ra Value</th><th style="width:22%;">Remarks</th><th style="width:17%;">Name/Sign</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-red">
  <span>MPI / FINAL INSPECTION</span>
  <img src="data:image/png;base64,{stage_qrs['MPI Final']}" class="stage-qr">
</div>
<table style="margin-bottom:5px;">
  <tr><th style="width:13%;">Date</th><th style="width:11%;">No of Pcs</th><th style="width:10%;">OK Pcs</th><th style="width:11%;">Reject Pcs</th><th style="width:12%;">OK Weight</th><th style="width:12%;">Rej Weight</th><th style="width:13%;">MPI Result</th><th style="width:18%;">Remarks</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="s-green">
  <span>PACKING</span>
  <img src="data:image/png;base64,{stage_qrs['Packing']}" class="stage-qr">
</div>
<table style="margin-bottom:8px;">
  <tr><th style="width:13%;">Date</th><th style="width:12%;">No of Bundles</th><th style="width:11%;">Pcs/Bundle</th><th style="width:13%;">Bundle Wt (kg)</th><th style="width:13%;">Total Net Wt</th><th style="width:12%;">Gross Wt</th><th style="width:26%;">Remarks / Colour Code</th></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
</table>

<div class="footer-bar">ALOK INGOTS (MUMBAI) PVT. LTD. &nbsp;|&nbsp; ISO 9001:2015 &nbsp;|&nbsp; IATF 16949:2016 &nbsp;|&nbsp; PED 2014/68/EU &nbsp;|&nbsp; AD 2000 Merkblatt W0</div>
</div></body></html>"""


@batch_card_bp.route("/api/pdf/batch-card/<int:bid>", methods=["GET"])
def batch_card_pdf(bid):
    try:
        conn = get_db(); cur = conn.cursor()
        cur.execute("SELECT * FROM batches WHERE id=%s", (bid,))
        batch = row_to_dict(cur, cur.fetchone())
        if not batch:
            cur.close(); conn.close()
            return jsonify({"error": "Batch not found"}), 404
        
        qr_token = ensure_qr_token(conn, cur, bid, batch)
        qr_b64 = generate_qr_base64(bid, qr_token)
        
        # Generate QR for each stage
        stages_list = ["Black Bar Inspection", "HT Process", "Black Bar Str.", 
                       "Peeling", "Bright Bar Str.", "Grinding", "Cutting",
                       "Chamfering", "Polishing", "MPI Final", "Packing"]
        stage_qrs = {s: generate_stage_qr_base64(bid, qr_token, s) for s in stages_list}
        
        cur.execute("SELECT * FROM batch_cards WHERE batch_id=%s ORDER BY created_at DESC LIMIT 1", (bid,))
        card = row_to_dict(cur, cur.fetchone()) or {}
        cur.execute("SELECT * FROM stage_logs WHERE batch_id=%s ORDER BY logged_at", (bid,))
        logs = rows_to_list(cur)
        so = None
        so_number = safe(batch.get("so_number"))
        if so_number:
            cur.execute("SELECT * FROM sales_orders WHERE so_number=%s", (so_number,))
            so = row_to_dict(cur, cur.fetchone())
        cur.close(); conn.close()
        return Response(build_batch_card_html(batch, card, so, logs, qr_b64, bid, stage_qrs), mimetype="text/html")
    except Exception as e:
        import traceback
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500