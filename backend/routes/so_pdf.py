from flask import Blueprint, request, make_response
from db import get_db, row_to_dict, rows_to_list
from datetime import datetime

so_pdf_bp = Blueprint('so_pdf', __name__)

def _fmt_date(val):
    if not val:
        return '&mdash;'
    if isinstance(val, str):
        try:
            return datetime.strptime(val[:10], '%Y-%m-%d').strftime('%d.%m.%Y')
        except Exception:
            return val
    try:
        return val.strftime('%d.%m.%Y')
    except Exception:
        return str(val)

def _safe(val, default='&mdash;'):
    return str(val).strip() if val not in (None, '', 'None') else default

def _num(val, default=0):
    try:
        return float(val)
    except Exception:
        return default

def _num_words(n):
    ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    def w(x):
        if x == 0: return ''
        if x < 20: return ones[x] + ' '
        if x < 100: return tens[x//10] + ' ' + (ones[x%10] + ' ' if x%10 else '')
        return ones[x//100] + ' Hundred ' + w(x % 100)
    n = int(n); r = ''
    if n >= 1000000: r += w(n // 1000000) + 'Million '; n %= 1000000
    if n >= 1000:    r += w(n // 1000) + 'Thousand '; n %= 1000
    return (r + w(n)).strip() or 'Zero'

@so_pdf_bp.route('/api/pdf/so/<path:so_number>')
def so_pdf(so_number):
    so_type    = request.args.get('type', 'export').lower()
    copy       = request.args.get('copy', 'customer').lower()
    show_price = (copy == 'customer')
    unit       = 'kg' if so_type == 'local' else 'tons'
    db  = get_db()
    cur = db.cursor()
    cur.execute('SELECT * FROM sales_orders WHERE so_number = %s', (so_number,))
    so_row = cur.fetchone()
    if not so_row:
        db.close()
        return make_response('<h2 style="font-family:sans-serif;padding:40px;color:red">SO not found</h2>', 404)
    so    = row_to_dict(cur, so_row)
    cur.execute('SELECT * FROM so_line_items WHERE so_id = %s ORDER BY sr_no', (so['id'],))
    lines = rows_to_list(cur)
    db.close()
    html = _render_html(so, lines, so_type, copy, show_price, unit, so_number)
    response = make_response(html)
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
    return response

def _render_html(so, lines, so_type, copy, show_price, unit, so_number):
    is_export = (so_type == 'export')
    is_plant  = (copy == 'plant')

    so_currency = _safe(so.get('currency', 'EUR')).upper()
    if not is_export:
        so_currency = 'INR'

    if is_export:
        qty_col  = 'QTY/TONS'
        rate_col = so_currency + '/TONS'
        amt_col  = 'AMOUNT IN (' + so_currency + ')'
    else:
        qty_col  = 'QTY/KG'
        rate_col = 'INR/KG'
        amt_col  = 'AMOUNT (INR)'

    line_rows = ''
    grand_qty = 0.0
    grand_amt = 0.0

    for i, line in enumerate(lines, 1):
        qty   = _num(line.get('qty_tons'))
        price = _num(line.get('rate_per_ton'))
        amt   = qty * price
        grand_qty += qty
        grand_amt += amt

        grade  = _safe(line.get('grade'))
        tol    = _safe(line.get('tolerance', ''))
        length = _safe(line.get('length_mm', '3000'))
        l_tol  = _safe(line.get('length_tolerance', '-0/+100'))
        ends   = _safe(line.get('ends_finish', 'Chamfered ends'))
        size   = _safe(line.get('size_mm'))

        qty_disp  = '{:,.3f}'.format(qty) if is_export else '{:,.2f}'.format(qty)
        price_str = '{:,.2f}'.format(price)
        amt_str   = '{:,.3f}'.format(amt)

        desc_html = 'SS Round Bright Bar ' + grade + ', ' + tol + ' Tol<br><span style="font-size:7pt;color:#444">Length ' + length + ' ' + l_tol + ' MM / ' + ends + '</span>'

        price_td = '<td class="tc">' + price_str + '</td>' if show_price else ''
        amt_td   = '<td class="tr"><b>' + amt_str + '</b></td>' if show_price else ''

        line_rows += '''
        <tr>
          <td class="tc">''' + str(i) + '''</td>
          <td style="padding:4px 6px">''' + desc_html + '''</td>
          <td class="tc">''' + size + '''</td>
          <td class="tc">''' + qty_disp + '''</td>
          ''' + price_td + '''
          ''' + amt_td + '''
        </tr>'''

    grand_qty_disp = '{:,.3f}'.format(grand_qty) if is_export else '{:,.2f}'.format(grand_qty)
    grand_amt_str  = '{:,.3f}'.format(grand_amt)
    words_cell = 'AMOUNT IN WORDS: ' + _num_words(grand_amt) + ' ' + so_currency + ' Only' if show_price else 'AMOUNT IN WORDS: &mdash;&mdash;'

    if show_price:
        total_price_td = '<td></td>'
        total_amt_td   = '<td class="tr"><b style="font-size:10pt">' + grand_amt_str + '</b></td>'
    else:
        total_price_td = ''
        total_amt_td   = ''

    total_row = '''
    <tr style="background:#f5f5f5;font-weight:700">
      <td colspan="2" class="tr" style="font-size:7.5pt;color:#555">''' + words_cell + '''</td>
      <td class="tc"><b>Total</b></td>
      <td class="tc"><b>''' + grand_qty_disp + '''</b></td>
      ''' + total_price_td + '''
      ''' + total_amt_td + '''
    </tr>'''

    price_th = '<th>' + rate_col + '</th>' if show_price else ''
    amt_th   = '<th>' + amt_col + '</th>' if show_price else ''

    watermark = ''
    if is_plant:
        watermark = '<div style="position:fixed;top:35%;left:50%;transform:translateX(-50%) rotate(-35deg);font-size:80pt;font-weight:900;color:rgba(200,50,50,0.06);z-index:0;pointer-events:none;white-space:nowrap;letter-spacing:6px;">FACTORY COPY</div>'

    cbam = ''
    if is_export:
        cbam = '''<div style="background:#1A2B4A;color:#fff;font-size:8.5pt;font-weight:700;padding:5px 8px;margin:10px 0 0;letter-spacing:0.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact;">NOTE : CBAM COMPLIANCE AND LIABILITY CLAUSE</div>
        <div class="cbam-box">
          <p>1. As of January 1st, following the implementation of the European Union&#39;s Carbon Border Adjustment Mechanism (CBAM), Alok Ingots Pvt. Ltd. provides all customers, to the best of its knowledge and ability, with accurate carbon emissions data. This information is independently verified by a certified third-party auditor to ensure transparency and compliance.</p>
          <p style="margin-top:6px">2. All obligations, costs, levies, duties, or charges arising from the application or enforcement of CBAM within the European Union shall be the sole responsibility of the customer.</p>
        </div>'''

    plant_note = ''
    if is_plant:
        bank_rows = '''
        <tr><td class="lbl">Import/Export Code :</td><td>030 407 9421</td></tr>
        <tr><td class="lbl">Bank&#39;s Name :</td><td>STATE BANK OF INDIA, Commercial Branch</td></tr>
        <tr><td class="lbl">Bank&#39;s Address :</td><td>1st Floor, Majestic Shopping Centre, 144, JSS Marg, Girgaon, Mumbai, Maharashtra &mdash; 400004</td></tr>
        <tr><td class="lbl">ACCOUNT NUMBER :</td><td><b>1027 166 7742</b></td></tr>
        <tr><td class="lbl">SWIFT CODE :</td><td><b>SBIN INBB 516</b></td></tr>'''
    else:
        bank_rows = '''
        <tr><td class="lbl">Bank&#39;s Name :</td><td>STATE BANK OF INDIA, Commercial Branch</td></tr>
        <tr><td class="lbl">Bank&#39;s Address :</td><td>1st Floor, Majestic Shopping Centre, 144, JSS Marg, Girgaon, Mumbai, Maharashtra &mdash; 400004</td></tr>
        <tr><td class="lbl">ACCOUNT NUMBER :</td><td><b>1027 166 7742</b></td></tr>
        <tr><td class="lbl">IFSC CODE :</td><td><b>SBIN0003594</b></td></tr>'''

    so_num     = _safe(so.get('so_number'))
    so_date    = _fmt_date(so.get('so_date'))
    po_num     = _safe(so.get('po_number'))
    po_date    = _fmt_date(so.get('po_date'))
    sup_no     = _safe(so.get('supplier_no'))
    offer_ref  = _safe(so.get('offer_ref_no'))
    cust_name  = _safe(so.get('customer'))
    cust_email = _safe(so.get('customer_email'))
    kind_attn  = _safe(so.get('kind_attention'))
    cust_tel   = _safe(so.get('customer_tel'))
    cust_fax   = _safe(so.get('customer_fax'))
    del_addr   = _safe(so.get('delivery_address'))
    cons_addr  = _safe(so.get('consignee_address'))
    sale_thru  = _safe(so.get('sale_made_through'))
    del_instr  = _safe(so.get('delivery_instruction'))
    pay_terms  = _safe(so.get('payment_terms'))
    inco_term  = _safe(so.get('inco_term'))
    ship_mode  = _safe(so.get('shipment_mode'))
    bank_chg   = _safe(so.get('bank_charges'), "Any Bank Charges Inside India will be at Alok&#39;s Account &amp; Outside India Shall Be At Buyers Account.")
    cust_code  = _safe(so.get('customer_short_code'))

    HDR_STYLE = 'background:#1A2B4A;color:#fff;font-size:8.5pt;font-weight:700;padding:5px 8px;margin:10px 0 0;letter-spacing:0.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact;'

    return '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Sales Contract</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Calibri, Segoe UI, Arial, sans-serif; font-size: 9pt; color: #111; background: #fff; padding: 8mm 10mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  @media print { body { padding: 5mm 8mm; } .no-print { display: none !important; } tr { page-break-inside: avoid; } }
  .lh { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #1A2B4A; padding-bottom: 8px; margin-bottom: 10px; }
  .lh-left .co-name { font-size:16pt; font-weight:700; color:#1A2B4A; }
  .lh-left .co-tag  { font-size:7.5pt; letter-spacing:2px; color:#555; text-transform:uppercase; margin:1px 0 4px; }
  .lh-left .co-addr { font-size:7.5pt; color:#444; line-height:1.7; }
  .lh-right img { height:56px; width:auto; }
  .hdr-table { width:100%; border-collapse:collapse; border:1px solid #999; }
  .hdr-table td { border:1px solid #999; padding:4px 7px; font-size:8.5pt; vertical-align:top; color:#111; }
  .hdr-table .lbl { background:#f0f0f0; font-weight:700; width:140px; white-space:nowrap; color:#111; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .items-wrap { margin:10px 0 0; }
  .items-table { width:100%; border-collapse:collapse; }
  .items-table th { background:#1A2B4A; color:#fff; font-size:8pt; font-weight:700; padding:5px 6px; border:1px solid #1A2B4A; text-align:center; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .items-table td { border:1px solid #bbb; padding:4px 6px; font-size:8.5pt; vertical-align:top; color:#111; }
  .items-table tr:nth-child(even) td { background:#fafafa; }
  .tc { text-align:center; }
  .tr { text-align:right; }
  .terms-table { width:100%; border-collapse:collapse; border:1px solid #bbb; }
  .terms-table td { border:1px solid #bbb; padding:4px 8px; font-size:8.5pt; vertical-align:top; color:#111; }
  .terms-table .lbl { background:#f0f0f0; font-weight:700; width:160px; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .cbam-box { border:1px solid #bbb; padding:8px 10px; font-size:8pt; color:#333; line-height:1.6; }
  .bank-table { width:100%; border-collapse:collapse; border:1px solid #bbb; }
  .bank-table td { border:1px solid #bbb; padding:4px 8px; font-size:8.5pt; color:#111; }
  .bank-table .lbl { background:#f0f0f0; font-weight:700; width:180px; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .sig-table { width:100%; border-collapse:collapse; margin-top:10px; }
  .sig-table td { border:1px solid #bbb; padding:8px 12px 6px; width:50%; vertical-align:top; }
  .sig-for { font-weight:700; font-size:9pt; margin-bottom:30px; }
  .sig-line { border-bottom:1px solid #333; margin-bottom:3px; }
  .sig-sub { font-size:7pt; color:#666; }
  .pg-footer { display:flex; justify-content:space-between; border-top:1px solid #aaa; margin-top:8px; padding-top:5px; font-size:7pt; color:#555; }
  .no-print { position:fixed; top:10px; right:12px; z-index:999; }
  .btn-print { background:#1A2B4A; color:#fff; border:none; padding:7px 16px; font-size:9pt; border-radius:3px; cursor:pointer; font-weight:600; }
</style>
</head>
<body>

''' + watermark + '''

<div class="no-print">
  <button class="btn-print" onclick="window.print()">&#128424; Print / Save PDF</button>
</div>

<div class="lh">
  <div class="lh-left">
    <div class="co-name">Alok Ingots (Mumbai) Pvt. Ltd.</div>
    <div class="co-tag">Steel Re-Engineered &nbsp;|&nbsp; Tel: +91 22 40220080 &nbsp;|&nbsp; www.alokindia.com</div>
    <div class="co-addr">
      602, Raheja Chambers, 213 Free Press, Journal Marg, Nariman Point 400021, India<br>
      ISO 9001:2015 &nbsp;|&nbsp; IATF 16949:2016 &nbsp;|&nbsp; PED 2014/68/EU &nbsp;|&nbsp; AD 2000 Merkblatt W0
    </div>
  </div>
  <div class="lh-right">
    <img src="http://localhost:5000/static/ALOK_Logo.png" onerror="this.style.display=\'none\'" alt="Alok Ingots">
  </div>
</div>

<div style="background:#1A2B4A;color:#fff;text-align:center;font-size:13pt;font-weight:700;letter-spacing:3px;padding:7px 0;margin:8px 0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">S A L E S &nbsp;&nbsp; C O N T R A C T</div>
''' + plant_note + '''

<table class="hdr-table" style="margin-top:6px">
  <tr>
    <td class="lbl">Sales Contract No</td>
    <td colspan="2"><b>''' + so_num + '''</b></td>
    <td class="lbl" style="width:90px">S.O. Date:</td>
    <td style="width:110px">''' + so_date + '''</td>
  </tr>
  <tr>
    <td class="lbl">Purchase Order No</td>
    <td colspan="2">''' + po_num + '''</td>
    <td class="lbl">P.O. Date:</td>
    <td>''' + po_date + '''</td>
  </tr>
  <tr>
    <td class="lbl">Supplier No</td>
    <td colspan="4">''' + sup_no + '''</td>
  </tr>
  <tr>
    <td class="lbl">Offer Ref No</td>
    <td colspan="4">''' + offer_ref + '''</td>
  </tr>
  <tr>
    <td class="lbl">Customer\'s Name</td>
    <td><b>''' + cust_name + '''</b></td>
    <td class="lbl" style="width:60px">E-mail:</td>
    <td colspan="2">''' + cust_email + '''</td>
  </tr>
  <tr>
    <td class="lbl"></td>
    <td>''' + kind_attn + '''</td>
    <td class="lbl">Tel No:</td>
    <td colspan="2">''' + cust_tel + '''</td>
  </tr>
  <tr>
    <td class="lbl"></td>
    <td></td>
    <td class="lbl">Fax No:</td>
    <td colspan="2">''' + cust_fax + '''</td>
  </tr>
  <tr>
    <td class="lbl">Delivery Address</td>
    <td colspan="4">''' + del_addr + '''</td>
  </tr>
  <tr>
    <td class="lbl">Consignee Address</td>
    <td colspan="4">''' + cons_addr + '''</td>
  </tr>
  <tr>
    <td class="lbl">Kind Attention:</td>
    <td colspan="4">''' + kind_attn + '''</td>
  </tr>
  <tr>
    <td class="lbl">Sale made through:</td>
    <td colspan="4">''' + sale_thru + '''</td>
  </tr>
  <tr>
    <td class="lbl">Delivery Instruction:</td>
    <td colspan="4">''' + del_instr + '''</td>
  </tr>
  <tr>
    <td class="lbl">Terms of payment:</td>
    <td colspan="4">''' + pay_terms + '''</td>
  </tr>
</table>

<div class="items-wrap">
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:32px">SR. NO.</th>
        <th style="text-align:left">ITEMS DESCRIPTION</th>
        <th style="width:75px">SIZE (MM)</th>
        <th style="width:80px">''' + qty_col + '''</th>
        ''' + price_th + '''
        ''' + amt_th + '''
      </tr>
    </thead>
    <tbody>
      ''' + line_rows + '''
      ''' + total_row + '''
    </tbody>
  </table>
</div>

<div style="''' + HDR_STYLE + '''">Terms &amp; Conditions :</div>
<table class="terms-table">
  <tr><td class="lbl">Weight of goods</td><td>shall be Max ''' + grand_qty_disp + ''' (+ /&#8211;10%) in each size</td></tr>
  <tr><td class="lbl">Inco Term</td><td>''' + inco_term + '''</td></tr>
  <tr><td class="lbl">Duty</td><td>Export duty will be charged if still applicable. 15% or whatever applicable at the time of shipment.</td></tr>
  <tr><td class="lbl">Shipment</td><td>''' + ship_mode + '''</td></tr>
  <tr><td class="lbl">Bank Charges</td><td>''' + bank_chg + '''</td></tr>
  <tr><td class="lbl">Customer Short Code</td><td>''' + cust_code + '''</td></tr>
</table>

''' + cbam + '''

<div style="''' + HDR_STYLE + '''">BANK DETAILS :</div>
<table class="bank-table">
  ''' + bank_rows + '''
</table>

<table class="sig-table">
  <tr>
    <td>
      <div class="sig-for">For ''' + cust_name + '''</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Authorised Signatory</div>
    </td>
    <td>
      <div class="sig-for">For, Alok Ingots (Mumbai) Pvt. Ltd.</div>
      <div class="sig-line"></div>
      <div class="sig-sub">Authorised Signatory</div>
    </td>
  </tr>
</table>

<div class="pg-footer">
  <div>
    <b>ALOK INGOTS (MUMBAI) PVT LTD</b><br>
    602, Raheja Chambers, 213 Free Press, Journal Marg, Nariman Point 400021, India<br>
    Tel: +91 22 40220080 &nbsp; www.alokindia.com
  </div>
  <div style="text-align:right">
    Bank name&mdash; State Bank of India<br>
    144, Jss Marg, Girgaon, Mumbai: 400004<br>
    A/C No: 10271667742 &nbsp; Swift Code: SBININBB516
  </div>
</div>

</body>
</html>'''