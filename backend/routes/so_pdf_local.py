from flask import Blueprint, request, make_response
from db import get_db, row_to_dict, rows_to_list
from datetime import datetime

so_pdf_local_bp = Blueprint('so_pdf_local', __name__)

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
    ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
            'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
    tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
    def w(x):
        if x == 0: return ''
        if x < 20: return ones[x] + ' '
        if x < 100: return tens[x//10] + ' ' + (ones[x%10] + ' ' if x%10 else '')
        return ones[x//100] + ' Hundred ' + w(x % 100)
    n = int(n); r = ''
    if n >= 10000000: r += w(n // 10000000) + 'Crore '; n %= 10000000
    if n >= 100000:   r += w(n // 100000) + 'Lakh '; n %= 100000
    if n >= 1000:     r += w(n // 1000) + 'Thousand '; n %= 1000
    return (r + w(n)).strip() or 'Zero'

@so_pdf_local_bp.route('/api/pdf/local/<path:so_number>')
def so_pdf_local(so_number):
    copy = request.args.get('copy', 'customer').lower()
    db   = get_db()
    cur  = db.cursor()
    cur.execute('SELECT * FROM sales_orders WHERE so_number = %s', (so_number,))
    so_row = cur.fetchone()
    if not so_row:
        db.close()
        return make_response('<h2 style="font-family:sans-serif;padding:40px;color:red">SO not found</h2>', 404)
    so    = row_to_dict(cur, so_row)
    cur.execute('SELECT * FROM so_line_items WHERE so_id = %s ORDER BY sr_no', (so['id'],))
    lines = rows_to_list(cur)
    db.close()
    html = _render_local(so, lines, copy, so_number)
    response = make_response(html)
    response.headers['Content-Type'] = 'text/html; charset=utf-8'
    return response

def _render_local(so, lines, copy, so_number):
    show_price = (copy == 'customer')

    cgst_pct = _num(so.get('cgst_pct', 9))
    sgst_pct = _num(so.get('sgst_pct', 9))
    igst_pct = _num(so.get('igst_pct', 0))
    disc_pct = _num(so.get('discount_pct', 0))
    pf_amt   = _num(so.get('packing_forwarding', 0))
    hsn_code = _safe(so.get('hsn_code', '7222/7221'))

    line_rows = ''
    grand_qty = 0.0
    sub_total = 0.0
    compact   = len(lines) >= 6

    for i, line in enumerate(lines, 1):
        qty_t  = _num(line.get('qty_tons'))
        qty_kg = qty_t * 1000
        price  = _num(line.get('rate_per_ton')) / 1000
        l_disc = _num(line.get('discount_pct', disc_pct))
        amt    = qty_kg * price * (1 - l_disc / 100)
        grand_qty += qty_kg
        sub_total += amt

        grade  = _safe(line.get('grade'))
        tol    = _safe(line.get('tolerance', ''))
        length = _safe(line.get('length_mm', '3000'))
        ends   = _safe(line.get('ends_finish', 'Chamfered'))
        finish = _safe(line.get('finish', ''))
        size   = _safe(line.get('size_mm'))

        qty_s  = '{:,.0f}'.format(qty_kg)
        rate_s = '{:,.2f}'.format(price)
        disc_s = '{:.2f}'.format(l_disc)
        amt_s  = '{:,.2f}'.format(amt)

        if compact:
            parts = []
            if tol    != '&mdash;': parts.append('Tol: ' + tol)
            if length != '&mdash;': parts.append('L: ' + length + 'mm')
            if finish != '&mdash;': parts.append(finish)
            if ends   != '&mdash;': parts.append(ends)
            desc = '<b>SS ' + grade + ' Bright Round Bar</b>'
            if parts:
                desc += ' &nbsp;|&nbsp; <span style="font-size:8pt">' + ' &nbsp;|&nbsp; '.join(parts) + '</span>'
        else:
            parts = []
            if tol    != '&mdash;': parts.append('Tol: ' + tol)
            if length != '&mdash;': parts.append('L: ' + length + ' MM')
            if finish != '&mdash;': parts.append(finish)
            if ends   != '&mdash;': parts.append(ends)
            desc = '<b style="font-size:9.5pt">SS ' + grade + ' Bright Round Bar</b>'
            if parts:
                desc += '<br><span style="font-size:8pt;color:#111">' + ' &nbsp;|&nbsp; '.join(parts) + '</span>'
        p_td = '<td class="tc">' + rate_s + '</td><td class="tc">' + disc_s + '%</td>' if show_price else ''
        a_td = '<td class="tr">' + amt_s  + '</td>' if show_price else ''

        line_rows += (
            '\n        <tr>'
            '\n          <td class="tc">' + str(i) + '</td>'
            '\n          <td style="padding:4px 6px">' + desc + '</td>'
            '\n          <td class="tc">' + size + '</td>'
            '\n          <td class="tc">' + qty_s + '</td>'
            '\n          ' + p_td +
            '\n          ' + a_td +
            '\n        </tr>'
        )


    cgst_amt    = sub_total * cgst_pct / 100
    sgst_amt    = sub_total * sgst_pct / 100
    igst_amt    = sub_total * igst_pct / 100
    grand_total = sub_total + cgst_amt + sgst_amt + igst_amt + pf_amt

    sub_s   = '{:,.2f}'.format(sub_total)
    cgst_s  = '{:,.2f}'.format(cgst_amt)
    sgst_s  = '{:,.2f}'.format(sgst_amt)
    igst_s  = '{:,.2f}'.format(igst_amt)
    pf_s    = '{:,.2f}'.format(pf_amt)
    grand_s = '{:,.2f}'.format(grand_total)
    qty_tot = '{:,.0f}'.format(grand_qty)
    words   = _num_words(grand_total) + ' Only.'

    tax_rows = ''
    if show_price:
        tax_rows  = '<tr style="font-weight:700;background:#f5f5f5"><td colspan="3" class="tr">Total</td><td class="tc">' + qty_tot + '</td><td></td><td></td><td class="tr"><b>' + sub_s + '</b></td></tr>'
        tax_rows += '<tr><td colspan="6" class="tr" style="font-size:8pt;color:#555">Sub Total</td><td class="tr">' + sub_s + '</td></tr>'
        if cgst_pct > 0:
            tax_rows += '<tr><td colspan="6" class="tr">CGST ' + str(int(cgst_pct)) + '%</td><td class="tr">' + cgst_s + '</td></tr>'
        if sgst_pct > 0:
            tax_rows += '<tr><td colspan="6" class="tr">SGST ' + str(int(sgst_pct)) + '%</td><td class="tr">' + sgst_s + '</td></tr>'
        if igst_pct > 0:
            tax_rows += '<tr><td colspan="6" class="tr">IGST ' + str(int(igst_pct)) + '%</td><td class="tr">' + igst_s + '</td></tr>'
        if pf_amt > 0:
            tax_rows += '<tr><td colspan="6" class="tr">Packing &amp; Forwarding</td><td class="tr">' + pf_s + '</td></tr>'
        tax_rows += (
            '<tr style="background:#1A2B4A;color:#fff;font-weight:700;-webkit-print-color-adjust:exact;print-color-adjust:exact;">'
            '<td colspan="3" style="padding:5px 8px;font-size:9pt">GRAND TOTAL (Rs.)</td>'
            '<td class="tc" style="padding:5px 8px">' + qty_tot + '</td>'
            '<td></td><td></td>'
            '<td class="tr" style="padding:5px 8px;font-size:10pt">' + grand_s + '</td>'
            '</tr>'
        )
    else:
        tax_rows = '<tr style="font-weight:700;background:#f5f5f5"><td colspan="2" class="tr">Total</td><td class="tc">' + qty_tot + '</td><td></td></tr>'

    so_num     = _safe(so.get('so_number'))
    do_num     = _safe(so.get('do_number'))
    so_date    = _fmt_date(so.get('so_date'))
    po_date    = _fmt_date(so.get('po_date'))
    cust_name  = _safe(so.get('customer'))
    cust_addr  = _safe(so.get('delivery_address'))
    gstin      = _safe(so.get('gstin'))
    cust_email = _safe(so.get('customer_email'))
    cust_tel   = _safe(so.get('customer_tel'))
    cust_fax   = _safe(so.get('customer_fax'))
    sale_thru  = _safe(so.get('sale_made_through'))
    del_instr  = _safe(so.get('delivery_instruction'))
    pay_terms  = _safe(so.get('payment_terms'))
    kind_attn  = _safe(so.get('kind_attention'))
    co_gstin   = '27AAECA7915K1ZF'
    co_cin     = _safe(so.get('cin', 'U27100MH2004PTC147383'))
    co_range   = _safe(so.get('gst_range', 'Kalyan - II'))
    co_div     = _safe(so.get('gst_division', 'Thane - Rural'))
    co_comm    = _safe(so.get('gst_commissionerate', '&mdash;'))

    tc_default = ('Packing &amp; Forwarding : Loose\n'
                  'Delivery               : Ex. Wada\n'
                  'IGST                   : As Applicable\n'
                  'Interest of 18% p.a. to be applicable for late payment\n'
                  'Please fax acceptance of this Sales Order on (0251) 243 2200.')
    tc_text = _safe(so.get('terms_conditions'), tc_default).replace('\n', '<br>')

    HDR  = 'background:#1A2B4A;color:#fff;font-size:8.5pt;font-weight:700;padding:4px 8px;-webkit-print-color-adjust:exact;print-color-adjust:exact;'
    p_th = '<th style="width:65px">Per/K.G</th><th style="width:65px">Discount</th>' if show_price else ''
    a_th = '<th style="width:80px">Amount</th>' if show_price else ''
    words_row = '<div style="border:1px solid #bbb;padding:5px 8px;font-size:8pt;margin-top:4px"><b>AMOUNT IN WORDS :</b> &nbsp;' + words + '</div>' if show_price else ''

    return (
        '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n'
        '<title>Sales Order - ' + so_num + '</title>\n'
        '<style>\n'
        '  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n'
        '  body { font-family: Calibri, Segoe UI, Arial, sans-serif; font-size: 9pt; color: #111; background: #fff; padding: 6mm 8mm; -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n'
        '  @media print { body { padding: 4mm 6mm; } .no-print { display: none !important; } tr { page-break-inside: avoid; } }\n'
        '  .lh { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #C8521A; padding-bottom:6px; margin-bottom:8px; }\n'
        '  .lh-logo img { height:60px; width:auto; }\n'
        '  .lh-co { flex:1; padding-left:12px; }\n'
        '  .lh-co .cn { font-size:14pt; font-weight:700; color:#111; }\n'
        '  .lh-co .ca { font-size:7pt; color:#444; line-height:1.6; margin-top:2px; }\n'
        '  .tbar { background:#1A2B4A; color:#fff; text-align:center; font-size:12pt; font-weight:700; letter-spacing:2px; padding:5px 0; margin:6px 0; -webkit-print-color-adjust:exact; print-color-adjust:exact; }\n'
        '  .ht { width:100%; border-collapse:collapse; border:1px solid #999; margin-bottom:6px; }\n'
        '  .ht td { border:1px solid #999; padding:3px 6px; font-size:8.5pt; vertical-align:top; color:#111; }\n'
        '  .ht .lb { background:#f0f0f0; font-weight:700; white-space:nowrap; -webkit-print-color-adjust:exact; print-color-adjust:exact; }\n'
        '  .it { width:100%; border-collapse:collapse; }\n'
        '  .it th { background:#1A2B4A; color:#fff; font-size:8pt; font-weight:700; padding:4px 5px; border:1px solid #1A2B4A; text-align:center; -webkit-print-color-adjust:exact; print-color-adjust:exact; }\n'
        '  .it td { border:1px solid #bbb; padding:3px 5px; font-size:8.5pt; vertical-align:top; color:#111; }\n'
        '  .it tr:nth-child(even) td { background:#fafafa; }\n'
        '  .tc { text-align:center; } .tr { text-align:right; }\n'
        '  .bt { width:100%; border-collapse:collapse; margin-top:8px; }\n'
        '  .bt td { border:1px solid #bbb; padding:4px 8px; font-size:8pt; vertical-align:top; color:#111; }\n'
        '  .pf { display:flex; justify-content:space-between; border-top:1px solid #aaa; margin-top:6px; padding-top:4px; font-size:7pt; color:#555; }\n'
        '  .np { position:fixed; top:10px; right:12px; z-index:999; }\n'
        '  .bp { background:#1A2B4A; color:#fff; border:none; padding:7px 16px; font-size:9pt; border-radius:3px; cursor:pointer; font-weight:600; }\n'
        '</style>\n</head>\n<body>\n\n'
        '<div class="np"><button class="bp" onclick="window.print()">&#128424; Print / Save PDF</button></div>\n\n'
        '<div class="lh">\n'
        '  <div class="lh-logo"><img src="http://localhost:5000/static/ALOK_Logo.png" onerror="this.style.display=\'none\'" alt="Alok Ingots"></div>\n'
        '  <div class="lh-co">\n'
        '    <div class="cn">Alok Ingots (Mumbai) Pvt. Ltd.</div>\n'
        '    <div class="ca">\n'
        '      Plot 95/3/2, Vijaypur Village, Near Kone Gaon, Taluka Wada, District Thane, Pin 421 303, Maharashtra - India<br>\n'
        '      Fact. Tel: +91 (2526) 211 492 &nbsp;|&nbsp; H.o. Tel: +91 (22) 22080516 / 22080815 &nbsp;|&nbsp; Fax: +91 (22) 22060813<br>\n'
        '      E-mail: mumbai@alokindia.com &amp; wada@alokindia.com &nbsp;|&nbsp; http://www.alokindia.com<br>\n'
        '      ISO 9001:2008 &nbsp;|&nbsp; PED 97/23/EC &nbsp;|&nbsp; AD 2000 MERKBLATT W0 &nbsp;|&nbsp; STEELMAKER (MARITIME) &nbsp;|&nbsp; ISO/TS 16949:2009\n'
        '    </div>\n'
        '  </div>\n'
        '</div>\n\n'
        '<div class="tbar">S A L E S &nbsp; O R D E R</div>\n\n'
        '<table class="ht">\n'
        '  <tr>\n'
        '    <td class="lb" style="width:140px">D.O Number</td>\n'
        '    <td style="width:180px">' + do_num + '</td>\n'
        '    <td class="lb" style="width:140px">Purchase Order No :</td>\n'
        '    <td>' + so_num + '</td>\n'
        '  </tr>\n'
        '  <tr>\n'
        '    <td class="lb" rowspan="5">CUSTOMER\'S NAME :</td>\n'
        '    <td rowspan="5" style="vertical-align:top;padding:5px 8px">\n'
        '      <div style="font-size:11pt;font-weight:700;color:#111;margin-bottom:4px">' + cust_name + '</div>\n'
        '      <div style="font-size:8pt;color:#111;line-height:1.7">' + cust_addr + '</div>\n'
        '    </td>\n'
        '    <td class="lb">D.O.Date</td>\n'
        '    <td>' + so_date + '</td>\n'
        '  </tr>\n'
        '  <tr><td class="lb">P.O.Date</td><td>' + po_date + '</td></tr>\n'
        '  <tr><td class="lb">GST No</td><td>' + gstin + '</td></tr>\n'
        '  <tr><td class="lb">E-mail</td><td>' + cust_email + '</td></tr>\n'
        '  <tr><td class="lb">Tel No / Fax No</td><td>' + cust_tel + ' / ' + cust_fax + '</td></tr>\n'
        '  <tr><td class="lb">SALE MADE THROUGH :</td><td colspan="3">' + sale_thru + '</td></tr>\n'
        '  <tr><td class="lb">DELIVERY INSTRUCTION :</td><td colspan="3">' + del_instr + '</td></tr>\n'
        '  <tr><td class="lb">TERMS OF PAYMENT :</td><td colspan="3">' + pay_terms + '</td></tr>\n'
'  <tr><td class="lb">HSN CODE :</td><td colspan="3">' + hsn_code + '</td></tr>\n'
        '</table>\n\n'
        '<table class="it">\n'
        '  <thead>\n'
        '    <tr>\n'
        '      <th style="width:30px">Sr.No.</th>\n'
        '      <th style="text-align:left">Items Description</th>\n'
        '      <th style="width:60px">Size(mm)</th>\n'
        '      <th style="width:65px">QTY/K.G</th>\n'
        '      ' + p_th + '\n'
        '      ' + a_th + '\n'
        '    </tr>\n'
        '  </thead>\n'
        '  <tbody>\n'
        + line_rows + '\n'
        + tax_rows + '\n'
        '  </tbody>\n'
        '</table>\n\n'
        + words_row + '\n\n'
        '<table class="bt">\n'
        '  <tr>\n'
        '    <td style="width:48%;vertical-align:top">\n'
        '      <div style="' + HDR + '">Terms &amp; Conditions</div>\n'
        '      <div style="border:1px solid #bbb;border-top:none;padding:6px 8px;font-size:8pt;line-height:1.8;color:#111">' + tc_text + '</div>\n'
        '    </td>\n'
        '    <td style="width:52%;vertical-align:top;padding-left:8px">\n'
        '      <table style="width:100%;border-collapse:collapse;font-size:8pt">\n'
        '        <tr><td style="width:150px;font-weight:700;padding:2px 0">GST No.</td><td>' + co_gstin + '</td></tr>\n'
        '        <tr><td style="font-weight:700;padding:2px 0">CIN</td><td>' + co_cin + '</td></tr>\n'
        '        <tr><td style="font-weight:700;padding:2px 0">Range</td><td>' + co_range + '</td></tr>\n'
        '        <tr><td style="font-weight:700;padding:2px 0">Division</td><td>' + co_div + '</td></tr>\n'
        '        <tr><td style="font-weight:700;padding:2px 0">Commissionerate</td><td>' + co_comm + '</td></tr>\n'
        '        <tr><td style="font-weight:700;padding:2px 0">Kind Attention :</td><td>' + kind_attn + '</td></tr>\n'
        '      </table>\n'
        '      <div style="margin-top:20px;text-align:right">\n'
        '        <b>For, Alok Ingots (Mumbai) Pvt Ltd.</b><br><br><br>\n'
        '        <div style="border-top:1px solid #333;display:inline-block;min-width:180px;text-align:center;padding-top:3px;font-size:8pt">Executive Director</div>\n'
        '      </div>\n'
        '      <div style="font-size:7.5pt;color:#555;margin-top:6px;text-align:right">Subject to Mumbai Jurisdiction</div>\n'
        '    </td>\n'
        '  </tr>\n'
        '</table>\n\n'
        '<div class="pf">\n'
        '  <div><b>ALOK INGOTS (MUMBAI) PVT LTD</b> &nbsp;|&nbsp; Plot 95/3/2, Vijaypur Village, Taluka Wada, Dist Palghar 421303 &nbsp;|&nbsp; Tel: +91 22 40220080 &nbsp;|&nbsp; www.alokindia.com</div>\n'
        '</div>\n\n'
        '</body>\n</html>'
    )