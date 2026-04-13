from flask import Blueprint, Response, jsonify
from db import get_db, rows_to_list, row_to_dict
from datetime import datetime, date

so_pdf_bp = Blueprint("so_pdf_bp", __name__)

def fmt_date(d):
    if not d:
        return '—'
    if isinstance(d, (datetime, date)):
        return d.strftime('%d.%m.%Y')
    try:
        return datetime.strptime(str(d)[:10], '%Y-%m-%d').strftime('%d.%m.%Y')
    except:
        return str(d)

def fmt_num(v, dec=3):
    try:
        return f"{float(v):,.{dec}f}"
    except:
        return '—'

def safe(v, default='—'):
    if v is None or str(v).strip() == '':
        return default
    return str(v).strip()

@so_pdf_bp.route("/api/pdf/so/<path:so_number>", methods=["GET"])
def generate_sales_contract_pdf(so_number):
    try:
        conn = get_db()
        cur  = conn.cursor()

        # Get SO
        cur.execute("SELECT * FROM sales_orders WHERE so_number=%s", (so_number,))
        order = row_to_dict(cur, cur.fetchone())
        if not order:
            return jsonify({'error': 'SO not found'}), 404

        # Get line items
        cur.execute("""
            SELECT * FROM so_line_items
            WHERE so_number=%s ORDER BY sr_no ASC
        """, (so_number,))
        items = rows_to_list(cur)

        # Get quality specs
        cur.execute("SELECT * FROM so_quality_specs WHERE so_number=%s", (so_number,))
        specs = row_to_dict(cur, cur.fetchone()) or {}

        cur.close()
        conn.close()

        total_qty    = sum(float(i.get('qty_tons') or 0) for i in items)
        total_amount = sum(float(i.get('amount') or 0) for i in items)

        # ── Build line items rows ──────────────────────────────
        items_html = ''
        for i, item in enumerate(items, 1):
            grade       = safe(item.get('grade'))
            size        = safe(item.get('size_mm'))
            tol         = safe(item.get('tolerance','h9'))
            finish      = safe(item.get('finish',''))
            length      = safe(item.get('length_mm'))
            len_tol     = safe(item.get('length_tolerance','-0/+100'))
            ends        = safe(item.get('ends_finish','Chamfered'))
            qty         = fmt_num(item.get('qty_tons'), 3)
            rate        = fmt_num(item.get('rate_per_ton'), 2)
            amount      = fmt_num(item.get('amount'), 3)
            desc        = safe(item.get('description',''))
            ht          = safe(item.get('heat_treatment',''))
            notes       = safe(item.get('notes',''), '')

            # Build description line
            desc_line = desc if desc and desc != '—' else f"SS Round Bright Bar {grade}"
            if finish and finish != '—':
                desc_line += f" + {finish}"
            desc_line += f", {tol} Tol"

            sub_line = f"Length {length} {len_tol} MM / {ends} ends"
            if ht and ht != '—':
                sub_line2 = ht
            else:
                sub_line2 = ''
            if notes:
                sub_line2 += (' / ' if sub_line2 else '') + notes

            items_html += f"""
            <tr>
              <td style="text-align:center;padding:4px 5px;">{i}</td>
              <td style="text-align:left;padding:4px 6px;">
                {desc_line}<br>
                <span style="font-size:7pt;color:#555;">{sub_line}</span>
                {'<br><span style="font-size:7pt;color:#555;font-style:italic;">'+sub_line2+'</span>' if sub_line2 else ''}
              </td>
              <td style="text-align:center;padding:4px 5px;font-weight:700;">{size}</td>
              <td style="text-align:center;padding:4px 5px;font-weight:700;">{qty}</td>
              <td style="text-align:center;padding:4px 5px;">{rate}</td>
              <td style="text-align:center;padding:4px 5px;font-weight:700;color:#C8521A;">{amount}</td>
            </tr>"""

        # ── Build spec rows ────────────────────────────────────
        def spec_row(label, value):
            return f'<tr><td class="tl">{label}</td><td class="tv">{safe(value)}</td></tr>'

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sales Contract — {so_number}</title>
<link href="https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
*{{margin:0;padding:0;box-sizing:border-box;}}
:root{{--orange:#C8521A;--navy:#1A2B4A;--blue:#1E4E8C;--grey:#555;--border:#AAAAAA;--text:#111;}}
body{{font-family:'DM Sans',sans-serif;font-size:8.5pt;color:var(--text);background:#D1D5DB;}}
.page{{width:210mm;min-height:297mm;background:white;margin:0 auto;padding:8mm 10mm;box-shadow:0 2px 12px rgba(0,0,0,0.15);}}.letterhead{{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:6px;margin-bottom:0;border-bottom:3px solid var(--orange);}}
.lh-logo{{width:46px;height:46px;background:var(--navy);border-radius:4px;display:flex;align-items:center;justify-content:center;color:white;font-family:'Crimson Pro',serif;font-weight:700;font-size:14pt;flex-shrink:0;}}
.lh-name{{font-family:'Crimson Pro',serif;font-size:14pt;font-weight:700;color:var(--navy);line-height:1.1;}}
.lh-sub{{font-size:6.5pt;color:var(--grey);letter-spacing:1.5px;text-transform:uppercase;margin-top:1px;}}
.lh-addr{{font-size:7pt;color:var(--grey);line-height:1.55;margin-top:3px;}}
.lh-right{{text-align:right;}}
.lh-brand{{font-family:'Crimson Pro',serif;font-size:22pt;font-weight:700;color:var(--orange);letter-spacing:2px;line-height:1;}}
.lh-brand-sub{{font-size:7pt;letter-spacing:3px;color:var(--grey);text-transform:uppercase;}}
.lh-contact{{font-size:7pt;color:var(--grey);line-height:1.7;margin-top:2px;text-align:right;}}
.title-bar{{background:var(--navy);color:white;text-align:center;padding:5px 0;font-family:'Crimson Pro',serif;font-size:14pt;font-weight:700;letter-spacing:3px;text-transform:uppercase;}}
.main-table{{width:100%;border-collapse:collapse;border:1px solid var(--border);}}
.main-table td{{border:1px solid var(--border);padding:3px 6px;vertical-align:top;font-size:8pt;}}
.fl{{font-weight:600;color:var(--navy);white-space:nowrap;width:110px;background:#F8F9FC;font-size:7.5pt;}}
.fv{{color:var(--text);font-size:8pt;}}
.fv.bold{{font-weight:700;}}
.fv.orange{{color:var(--orange);font-weight:700;}}
.items-wrap{{border:1px solid var(--border);border-top:none;}}
.it{{width:100%;border-collapse:collapse;}}
.it th{{background:var(--navy);color:white;padding:4px 5px;font-size:7pt;font-weight:600;letter-spacing:0.3px;text-transform:uppercase;border-right:1px solid #2D3F5F;text-align:center;white-space:nowrap;}}
.it th.left{{text-align:left;}}
.it th:last-child{{border-right:none;}}
.it td{{padding:4px 5px;border-bottom:1px solid #E5E7EB;border-right:1px solid #E5E7EB;vertical-align:top;font-size:7.5pt;}}
.it td:last-child{{border-right:none;}}
.it tr:nth-child(even) td{{background:#FAFBFC;}}
.it .tot td{{background:#FFF4EE;font-weight:700;font-size:8.5pt;border-top:2px solid var(--orange);}}
.terms-table{{width:100%;border-collapse:collapse;border:1px solid var(--border);border-top:none;}}
.terms-table td{{border:1px solid var(--border);padding:3px 6px;font-size:7.5pt;vertical-align:top;}}
.tl{{font-weight:600;color:var(--navy);width:120px;background:#F8F9FC;white-space:nowrap;}}
.tv{{color:var(--text);}}
.sec-hdr{{background:var(--navy);color:white;padding:3px 6px;font-size:8pt;font-weight:700;letter-spacing:0.5px;}}
.sbox{{border:1px solid var(--border);border-top:none;}}
.sbox-hdr{{background:#F0F4FF;padding:3px 6px;font-size:7pt;font-weight:700;color:var(--navy);text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid var(--border);}}
.sbox-body{{padding:5px 8px;font-size:7.5pt;line-height:1.7;}}
.bank-table{{width:100%;border-collapse:collapse;border:1px solid var(--border);margin-top:6px;}}
.bank-table th{{background:var(--navy);color:white;padding:3px 6px;font-size:7.5pt;font-weight:700;letter-spacing:0.5px;text-align:left;}}
.bank-table td{{border:1px solid var(--border);padding:3px 6px;font-size:7.5pt;}}
.bl{{font-weight:600;color:var(--navy);background:#F8F9FC;width:140px;}}
.sig-row{{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--border);margin-top:10px;}}
.sig-cell{{padding:8px 12px 12px;border-right:1px solid var(--border);}}
.sig-cell:last-child{{border-right:none;}}
.sig-for{{font-weight:700;font-size:8.5pt;color:var(--navy);margin-bottom:28px;}}
.sig-line{{border-top:1px solid var(--text);margin-bottom:2px;}}
.sig-sub{{font-size:7pt;color:var(--grey);}}
.page-footer{{display:flex;justify-content:space-between;align-items:flex-end;margin-top:8px;padding-top:5px;border-top:2px solid var(--orange);}}
.footer-left{{font-size:7pt;color:var(--grey);line-height:1.6;}}
.footer-right{{font-size:7pt;color:var(--grey);text-align:right;line-height:1.6;}}
.footer-name{{font-weight:700;font-size:8pt;color:var(--navy);}}
.page-break{{page-break-before:always;}}
.chem-table{{width:100%;border-collapse:collapse;border:1px solid var(--border);}}
.chem-table th{{background:var(--navy);color:white;padding:3px 4px;font-size:7pt;font-weight:600;text-align:center;border-right:1px solid #2D3F5F;}}
.chem-table td{{border:1px solid var(--border);padding:3px 5px;font-size:7.5pt;text-align:center;vertical-align:middle;}}
.chem-table td.gc{{font-weight:700;color:var(--blue);background:#F8F9FC;}}
.chem-table td.sc{{font-size:7pt;color:var(--grey);background:#FAFAFA;}}
.ann-title{{background:var(--navy);color:white;text-align:center;padding:4px;font-family:'Crimson Pro',serif;font-size:11pt;font-weight:700;letter-spacing:2px;margin-top:10px;}}
.comm-box{{border:1px solid var(--border);margin-top:6px;}}
.comm-hdr{{background:var(--navy);color:white;padding:3px 6px;font-size:7.5pt;font-weight:700;letter-spacing:0.5px;}}
.comm-body{{padding:5px 8px;font-size:7.5pt;line-height:1.8;}}
@media print {{
  * {{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
  body {{ background: white !important; margin: 0; }}
  .no-print {{ display: none !important; }}
  .page {{
    width: 100% !important;
    margin: 0 !important;
    padding: 10mm 12mm !important;
    box-shadow: none !important;
  }}
  @page {{
    size: A4 portrait;
    margin: 0;
  }}
  table {{ page-break-inside: avoid; }}
  .section {{ page-break-inside: avoid; }}
}}
.controls{{position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:100;}}
.btn{{background:var(--navy);color:white;border:none;padding:9px 18px;border-radius:5px;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.25);}}
.btn:hover{{background:var(--orange);}}
</style>
</head>
<body>
<button class="no-print" onclick="window.print()" 
  style="position:fixed;top:16px;right:24px;...">
  🖨 Print / Save PDF
</button>
<!-- PAGE 1 -->
<div class="page">
 <div class="letterhead" style="display:flex;justify-content:space-between;align-items:center;">
    <div>
      <div class="lh-name">Alok Ingots (Mumbai) Pvt. Ltd.</div>
      <div class="lh-sub">Steel Re-Engineered &nbsp;|&nbsp; Tel: +91 22 40220080 &nbsp;|&nbsp; www.alokindia.com</div>
      <div class="lh-addr">602, Raheja Chambers, 213 Free Press, Journal Marg, Nariman Point 400021, India<br>
      ISO 9001:2015 &nbsp;|&nbsp; IATF 16949:2016 &nbsp;|&nbsp; PED 2014/68/EU &nbsp;|&nbsp; AD 2000 Merkblatt W0</div>
    </div>
    <img src="http://localhost:5173/ALOK_Logo.png" style="height:54px;width:auto;" onerror="this.style.display='none'">
  </div>

  <div class="title-bar">Sales Contract</div>

  <table class="main-table">
    <tr>
      <td class="fl">Sales Contract No</td>
      <td class="fv orange bold" colspan="3">{safe(order.get('so_number'))}</td>
      <td class="fl" style="width:70px;">S.O. Date:</td>
      <td class="fv bold">{fmt_date(order.get('so_date'))}</td>
    </tr>
    <tr>
      <td class="fl">Purchase Order No</td>
      <td class="fv bold" colspan="3">{safe(order.get('po_number'))}</td>
      <td class="fl">P.O. Date:</td>
      <td class="fv">{fmt_date(order.get('po_date'))}</td>
    </tr>
    <tr>
      <td class="fl">Supplier No</td>
      <td class="fv" colspan="3">{safe(order.get('supplier_no'))}</td>
      <td class="fl"></td><td class="fv"></td>
    </tr>
    <tr>
      <td class="fl">Offer Ref No</td>
      <td class="fv" colspan="5"></td>
    </tr>
    <tr>
      <td class="fl">Customer's Name</td>
      <td class="fv bold" colspan="2">{safe(order.get('customer'))}</td>
      <td class="fl" style="width:55px;">E-mail:</td>
      <td class="fv" colspan="2" style="font-size:7.5pt;">{safe(order.get('contact_email',''))}</td>
    </tr>
    <tr>
      <td class="fl"></td>
      <td class="fv" colspan="2">{safe(order.get('delivery_address',''))}</td>
      <td class="fl">Tel No:</td>
      <td class="fv" colspan="2">{safe(order.get('contact_phone',''))}</td>
    </tr>
    <tr>
      <td class="fl"></td>
      <td class="fv" colspan="2"></td>
      <td class="fl">Fax No:</td>
      <td class="fv" colspan="2">{safe(order.get('contact_fax',''))}</td>
    </tr>
    <tr>
      <td class="fl">Delivery Address</td>
      <td class="fv bold" colspan="5">{safe(order.get('delivery_address',''))}</td>
    </tr>
    <tr>
      <td class="fl">Consignee Address</td>
      <td class="fv" colspan="5">{safe(order.get('consignee_address',''))}</td>
    </tr>
    <tr><td class="fl"></td><td class="fv" colspan="5"></td></tr>
    <tr>
      <td class="fl">Kind Attention:</td>
      <td class="fv" colspan="5">{safe(order.get('kind_attention',''))}</td>
    </tr>
    <tr>
      <td class="fl">Sale made through:</td>
      <td class="fv" colspan="5">{safe(order.get('sale_made_through',''))}</td>
    </tr>
    <tr>
      <td class="fl">Delivery Instruction:</td>
      <td class="fv" colspan="5">{safe(order.get('delivery_instruction',''))}</td>
    </tr>
    <tr>
      <td class="fl">Terms of payment:</td>
      <td class="fv" colspan="5">{safe(order.get('payment_terms',''))}</td>
    </tr>
  </table>

  <div class="items-wrap">
    <table class="it">
      <thead>
        <tr>
          <th style="width:28px;">Sr. No.</th>
          <th class="left" style="min-width:200px;">Items Description</th>
          <th style="width:55px;">Size (mm)</th>
          <th style="width:55px;">Qty/tons</th>
          <th style="width:70px;">EURO/tons</th>
          <th style="width:85px;">Amount in (EURO)</th>
        </tr>
      </thead>
      <tbody>
        {items_html}
        <tr class="tot">
          <td colspan="2" style="text-align:right;font-size:8pt;color:var(--grey);">AMOUNT IN WORDS: <em>——</em></td>
          <td style="text-align:right;font-weight:700;">Total</td>
          <td style="font-size:10pt;font-weight:800;color:var(--navy);text-align:center;">{fmt_num(total_qty,3)}</td>
          <td style="font-size:8pt;font-weight:700;color:var(--grey);text-align:center;">AMOUNT IN (EURO)</td>
          <td style="font-size:11pt;font-weight:800;color:var(--orange);text-align:center;">{fmt_num(total_amount,3)}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-top:8px;">
    <div class="sec-hdr">Terms &amp; Conditions :</div>
    <table class="terms-table">
      {spec_row('Weight of goods', f"shall be Max {fmt_num(total_qty,3)} (+ /-10%) in each size")}
      {spec_row('Inco Term', order.get('inco_term'))}
      {spec_row('Duty', 'Export duty will be charged if still applicable. 15% or whatever applicable at the time of shipment.')}
      {spec_row('Shipment', order.get('shipment_mode'))}
      {spec_row('Bank Charges', order.get('bank_charges') or "Any Bank Charges Inside India will be at Alok's Account & Outside India Shall Be At Buyers Account.")}
      {spec_row('Customer Short Code', order.get('customer_short_code'))}
    </table>
  </div>

  <div class="sbox" style="margin-top:6px;">
    <div class="sbox-hdr">Note : CBAM Compliance and Liability Clause</div>
    <div class="sbox-body">
      1. As of January 1st, following the implementation of the European Union's Carbon Border Adjustment Mechanism (CBAM), Alok Ingots Pvt. Ltd. provides all customers, to the best of its knowledge and ability, with accurate carbon emissions data. This information is independently verified by a certified third-party auditor to ensure transparency and compliance.<br><br>
      2. All obligations, costs, levies, duties, or charges arising from the application or enforcement of CBAM within the European Union shall be the sole responsibility of the customer.
    </div>
  </div>

  <table class="bank-table">
    <tr><th colspan="2">BANK DETAILS :</th></tr>
    <tr><td class="bl">Import/Export Code :</td><td>030 407 9421</td></tr>
    <tr><td class="bl">Bank's Name :</td><td>STATE BANK OF INDIA, Commercial Branch</td></tr>
    <tr><td class="bl">Bank's Address :</td><td>1st Floor, Majestic Shopping Centre, 144, JSS Marg, Girgaon, Mumbai, Maharashtra – 400004</td></tr>
    <tr><td class="bl">ACCOUNT NUMBER :</td><td style="font-weight:700;">1027 166 7742</td></tr>
    <tr><td class="bl">SWIFT CODE :</td><td style="font-weight:700;">SBIN INBB 516</td></tr>
  </table>

  <div class="sig-row">
    <div class="sig-cell">
      <div class="sig-for">For {safe(order.get('customer','Customer'))}</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Authorised Signatory</div>
    </div>
    <div class="sig-cell">
      <div class="sig-for">For, Alok Ingots (Mumbai) Pvt. Ltd.</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Authorised Signatory</div>
    </div>
  </div>

  <div class="page-footer">
    <div class="footer-left">
      <div class="footer-name">ALOK INGOTS (MUMBAI) PVT LTD</div>
      602, Raheja Chambers, 213 Free Press, Journal Marg, Nariman Point 400021, India<br>
      Tel: +91 22 40220080 &nbsp; www.alokindia.com
    </div>
    <div class="footer-right">
      Bank name- State Bank of India<br>
      144, Jss Marg, Girgaon, Mumbai: 400004<br>
      A/C No: 10271667742 &nbsp; Swift Code: SBININBB516
    </div>
  </div>
</div>

</body>
</html>"""

        return Response(html, mimetype='text/html')

    except Exception as e:
        return jsonify({'error': str(e)}), 500