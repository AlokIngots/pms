from flask import Blueprint, jsonify, request, send_file
from urllib.parse import unquote
import io, re, os
from datetime import datetime, date
from db import get_db

so_detail_bp = Blueprint('so_detail', __name__)

def rows_to_list(cur):
    cols = [d[0] for d in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]

def fmt_date(v):
    if not v: return '—'
    try:
        from datetime import datetime
        return datetime.strptime(str(v)[:10], '%Y-%m-%d').strftime('%d.%m.%Y')
    except: return str(v)

def safe(v, default='—'):
    if v is None or str(v).strip() == '':
        return default
    return str(v).strip()

@so_detail_bp.route('/api/so/<path:so_number>', methods=['GET'])
def get_so(so_number):
    so_number = unquote(so_number)
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM sales_orders WHERE so_number = %s", (so_number,))
        rows = rows_to_list(cur)
        if not rows:
            return jsonify({'error': 'SO not found', 'searched': so_number}), 404
        so = rows[0]
        for k, v in so.items():
            if isinstance(v, (date, datetime)):
                so[k] = v.isoformat()
        cur.execute("SELECT * FROM so_line_items WHERE so_id = %s ORDER BY sr_no ASC", (so['id'],))
        items = rows_to_list(cur)
        for item in items:
            for k, v in item.items():
                if isinstance(v, (date, datetime)):
                    item[k] = v.isoformat()
            try:
                cur.execute("SELECT bc.batch_card_no, bc.heat_no, bc.qty_tons FROM batch_cards bc WHERE bc.so_item_id = %s ORDER BY bc.id ASC", (item['id'],))
                item['batches'] = rows_to_list(cur)
            except:
                item['batches'] = []
        so['line_items'] = items
        return jsonify(so)
    finally:
        db.close()

@so_detail_bp.route('/api/so/<path:so_number>', methods=['PUT'])
def save_so(so_number):
    so_number = unquote(so_number)
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data'}), 400
    db = get_db()
    cur = db.cursor()
    try:
        fields = ['po_number','po_date','supplier_no','offer_ref_no','customer_short_code',
                  'so_date','customer_email','customer_tel','customer_fax','kind_attention',
                  'sale_made_through','delivery_address','consignee_address','delivery_instruction',
                  'payment_terms','inco_term','shipment_mode','bank_charges','weight_note',
                  'duty_note','delivery_date','customer','contact_person',
                  'gstin','hsn_code','do_number','cgst_pct','sgst_pct','igst_pct',
                  'packing_forwarding','discount_pct','tc_packing','tc_delivery',
                  'tc_igst','tc_late_payment','tc_fax','terms_conditions']
        updates = {f: data.get(f) for f in fields if f in data}
        if updates:
            set_clause = ', '.join(f"`{k}` = %s" for k in updates)
            values = list(updates.values()) + [so_number]
            cur.execute(f"UPDATE sales_orders SET {set_clause} WHERE so_number = %s", values)
        if 'line_items' in data:
            for item in data['line_items']:
                if 'id' not in item:
                    continue
                cur.execute("UPDATE so_line_items SET grade=%s, size_mm=%s, tolerance=%s, length_mm=%s, qty_tons=%s, rate_per_ton=%s, description=%s WHERE id=%s",
                    (item.get('grade'), item.get('size_mm'), item.get('tolerance'), item.get('length_mm'), item.get('qty_tons'), item.get('rate_per_ton'), item.get('description'), item['id']))
        db.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()

@so_detail_bp.route('/api/so/<path:so_number>/pdf', methods=['GET'])
def so_pdf(so_number):
    so_number = unquote(so_number)
    copy_type = request.args.get('copy', 'customer')
    db = get_db()
    cur = db.cursor()
    try:
        cur.execute("SELECT * FROM sales_orders WHERE so_number = %s", (so_number,))
        rows = rows_to_list(cur)
        if not rows:
            return jsonify({'error': 'SO not found'}), 404
        so = rows[0]
        for k, v in so.items():
            if isinstance(v, (date, datetime)):
                so[k] = v.isoformat()
        cur.execute("SELECT * FROM so_line_items WHERE so_id = %s ORDER BY sr_no ASC", (so['id'],))
        items = rows_to_list(cur)
    finally:
        db.close()

    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable, Image as RLImage
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=10*mm, bottomMargin=10*mm, leftMargin=12*mm, rightMargin=12*mm)

    NAVY   = colors.HexColor('#1A2B4A')
    ORANGE = colors.HexColor('#C8521A')
    LGREY  = colors.HexColor('#F5F5F5')
    MGREY  = colors.HexColor('#DDDDDD')
    WHITE  = colors.white

    styles = getSampleStyleSheet()
    def ps(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    W = A4[0] - 24*mm
    elements = []
    show_price = copy_type == 'customer'
    cust = safe(so.get('customer'))
    copy_label = '(Customer Copy)' if copy_type == 'customer' else '(Plant Copy)'

    logo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'ALOK_Logo.png')
    if os.path.exists(logo_path):
        logo_cell = RLImage(logo_path, width=30*mm, height=18*mm)
    else:
        logo_cell = Paragraph('<b>ALOK INGOTS</b>', ps('lg', fontSize=12, fontName='Helvetica-Bold', alignment=TA_RIGHT))

    hd = [[
        Paragraph('<font size="13"><b>Alok Ingots (Mumbai) Pvt. Ltd.</b></font><br/>'
                  '<font size="6.5" color="#666666">STEEL RE-ENGINEERED | TEL: +91 22 40220080 | WWW.ALOKINDIA.COM<br/>'
                  '602, Raheja Chambers, 213 Free Press, Journal Marg, Nariman Point 400021, India<br/>'
                  'ISO 9001:2015 | IATF 16949:2016 | PED 2014/68/EU | AD 2000 Merkblatt W0</font>',
                  ps('h', fontSize=8, leading=11)),
        logo_cell,
    ]]
    ht = Table(hd, colWidths=[W*0.72, W*0.28])
    ht.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('ALIGN',(1,0),(1,0),'RIGHT'),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    elements.append(ht)
    elements.append(HRFlowable(width='100%', thickness=1.5, color=ORANGE))
    elements.append(Spacer(1, 3*mm))

    tt = Table([[Paragraph(f'<b>SALES CONTRACT</b>  <font size="7" color="#888888">{copy_label}</font>',
                ps('t', fontSize=12, leading=14, fontName='Helvetica-Bold', alignment=TA_CENTER))]], colWidths=[W])
    tt.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),NAVY),('TEXTCOLOR',(0,0),(-1,-1),WHITE),
                             ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
                             ('BOX',(0,0),(-1,-1),1.5,ORANGE)]))
    elements.append(tt)
    elements.append(Spacer(1, 1*mm))

    lbl = ps('lb', fontSize=7.5, leading=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#333333'))
    val = ps('vl', fontSize=8, leading=10)
    vb  = ps('vb', fontSize=8, leading=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#C8521A'))

    def row2(l1,v1,l2,v2):
        return [Paragraph(l1,lbl), Paragraph(safe(v1),vb if l1=='Sales Contract No' else val),
                Paragraph(l2,lbl), Paragraph(safe(v2),val)]

    ref = [
        row2('Sales Contract No', so.get('so_number'), 'S.O. Date:', fmt_date(so.get('so_date'))),
        row2('Purchase Order No', so.get('po_number'), 'P.O. Date:', fmt_date(so.get('po_date'))),
        row2('Supplier No', so.get('supplier_no'), '', ''),
        row2('Offer Ref No', so.get('offer_ref_no'), '', ''),
    ]
    rt = Table(ref, colWidths=[W*0.18,W*0.32,W*0.15,W*0.35])
    rt.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('INNERGRID',(0,0),(-1,-1),0.3,MGREY),
                             ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
                             ('LEFTPADDING',(0,0),(-1,-1),6)]))
    elements.append(rt)

    cd = [
        [Paragraph("Customer's Name",lbl), Paragraph(f'<b>{cust}</b>',ps('cn',fontSize=8,leading=10,fontName='Helvetica-Bold')),
         Paragraph('E-mail:',lbl), Paragraph(safe(so.get('customer_email')) if show_price else '***',val)],
        ['', Paragraph(safe(so.get('kind_attention')),val), Paragraph('Tel No:',lbl), Paragraph(safe(so.get('customer_tel')) if show_price else '***',val)],
        ['', '', Paragraph('Fax No:',lbl), Paragraph(safe(so.get('customer_fax')) if show_price else '***',val)],
    ]
    ct = Table(cd, colWidths=[W*0.18,W*0.32,W*0.15,W*0.35])
    ct.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('INNERGRID',(0,0),(-1,-1),0.3,MGREY),
                             ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
                             ('LEFTPADDING',(0,0),(-1,-1),6),('SPAN',(0,0),(0,2)),('SPAN',(1,0),(1,2))]))
    elements.append(ct)

    addr_rows = [
        ('Delivery Address', so.get('delivery_address')),
        ('Consignee Address', so.get('consignee_address')),
        ('Kind Attention:', so.get('kind_attention')),
        ('Sale made through:', so.get('sale_made_through')),
        ('Delivery Instruction:', so.get('delivery_instruction')),
        ('Terms of payment:', so.get('payment_terms')),
    ]
    at = Table([[Paragraph(r[0],lbl), Paragraph(safe(r[1]),val)] for r in addr_rows], colWidths=[W*0.18,W*0.82])
    at.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('INNERGRID',(0,0),(-1,-1),0.3,MGREY),
                             ('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),
                             ('LEFTPADDING',(0,0),(-1,-1),6)]))
    elements.append(at)
    elements.append(Spacer(1,1*mm))

    ch  = ps('ch', fontSize=7.5, fontName='Helvetica-Bold', alignment=TA_CENTER, textColor=WHITE)
    chl = ps('chl', fontSize=7.5, fontName='Helvetica-Bold', textColor=WHITE)
    cv  = ps('cv', fontSize=8, alignment=TA_CENTER)
    cr  = ps('cr', fontSize=8, alignment=TA_RIGHT)
    ca  = ps('ca', fontSize=8, alignment=TA_RIGHT, fontName='Helvetica-Bold', textColor=ORANGE)

    li_rows = [[Paragraph('SR. NO.',ch), Paragraph('ITEMS DESCRIPTION',chl),
                Paragraph('SIZE (MM)',ch), Paragraph('QTY/TONS',ch),
                Paragraph('EURO/TONS',ch), Paragraph('AMOUNT IN (EURO)',ch)]]
    total_qty = 0.0
    total_amt = 0.0
    for item in items:
        qty  = float(item.get('qty_tons') or 0)
        rate = float(item.get('rate_per_ton') or 0)
        amt  = qty * rate
        total_qty += qty
        total_amt += amt
        desc = safe(item.get('description') or
                    f"SS Round Bright Bar {item.get('grade','')}, {item.get('tolerance','')} Tol\n"
                    f"Length {item.get('length_mm','')} -{item.get('length_tolerance','0/+100')} MM / {item.get('ends_finish','Chamfered')} ends")
        li_rows.append([Paragraph(str(item.get('sr_no','1')),cv), Paragraph(desc,ps('dl',fontSize=7.5,leading=10)),
                        Paragraph(str(item.get('size_mm','')),cv), Paragraph(f'{qty:.3f}',cv),
                        Paragraph(f'{rate:,.2f}' if show_price else '***',cr),
                        Paragraph(f'{amt:,.3f}' if show_price else '***',ca)])

    def num_words(n):
        ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']
        tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']
        def w(x):
            if x==0: return ''
            if x<20: return ones[x]+' '
            if x<100: return tens[x//10]+' '+(ones[x%10]+' ' if x%10 else '')
            return ones[x//100]+' Hundred '+w(x%100)
        n=int(n); r=''
        if n>=1000000: r+=w(n//1000000)+'Million '; n%=1000000
        if n>=1000: r+=w(n//1000)+'Thousand '; n%=1000
        return (r+w(n)).strip() or 'Zero'

    li_rows.append([
        Paragraph('',cv),
        Paragraph(f'AMOUNT IN WORDS: {num_words(total_amt)} Euros Only' if show_price else '',
                  ps('aw',fontSize=7,fontName='Helvetica-BoldOblique')),
        Paragraph('<b>Total</b>',ps('tb',fontSize=9,fontName='Helvetica-Bold',alignment=TA_CENTER)),
        Paragraph(f'<b>{total_qty:.3f}</b>',ps('tq',fontSize=9,fontName='Helvetica-Bold',alignment=TA_CENTER)),
        Paragraph('AMOUNT\nIN (EURO)',ps('ai',fontSize=7,alignment=TA_CENTER)),
        Paragraph(f'<b>{total_amt:,.3f}</b>' if show_price else '***',
                  ps('ta',fontSize=9,fontName='Helvetica-Bold',alignment=TA_RIGHT,textColor=ORANGE)),
    ])

    lt = Table(li_rows, colWidths=[W*0.07,W*0.40,W*0.09,W*0.10,W*0.12,W*0.14])
    lt.setStyle(TableStyle([
        ('BOX',(0,0),(-1,-1),0.5,MGREY),('INNERGRID',(0,0),(-1,-1),0.3,MGREY),
        ('BACKGROUND',(0,0),(-1,0),NAVY),('TOPPADDING',(0,0),(-1,-1),3),
        ('BOTTOMPADDING',(0,0),(-1,-1),3),('LEFTPADDING',(0,0),(-1,-1),4),
        ('VALIGN',(0,0),(-1,-1),'MIDDLE'),('BACKGROUND',(0,-1),(-1,-1),LGREY),
    ]))
    elements.append(lt)
    elements.append(Spacer(1,2*mm))

    tc_h = Table([[Paragraph('<b>Terms &amp; Conditions :</b>',ps('tch',fontSize=8,fontName='Helvetica-Bold',textColor=WHITE))]], colWidths=[W])
    tc_h.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),NAVY),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LEFTPADDING',(0,0),(-1,-1),6)]))
    elements.append(tc_h)
    tc_rows = [
        ('Weight of goods', so.get('weight_note') or 'shall be Max (+ /-10%) in each size'),
        ('Inco Term', so.get('inco_term')),
        ('Duty', so.get('duty_note') or 'Export duty will be charged if still applicable.'),
        ('Shipment', so.get('shipment_mode')),
        ('Bank Charges', so.get('bank_charges') or "Any Bank Charges Inside India will be at Alok's Account & Outside India Shall Be At Buyers Account."),
        ('Customer Short Code', so.get('customer_short_code')),
    ]
    tct = Table([[Paragraph(r[0],lbl),Paragraph(safe(r[1]),val)] for r in tc_rows], colWidths=[W*0.2,W*0.8])
    tct.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('INNERGRID',(0,0),(-1,-1),0.3,MGREY),
                              ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),('LEFTPADDING',(0,0),(-1,-1),6)]))
    elements.append(tct)
    elements.append(Spacer(1,2*mm))

    cbam_h = Table([[Paragraph('<b>NOTE : CBAM COMPLIANCE AND LIABILITY CLAUSE</b>',ps('ch2',fontSize=7.5,fontName='Helvetica-Bold'))]], colWidths=[W])
    cbam_h.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),('LEFTPADDING',(0,0),(-1,-1),6),('BACKGROUND',(0,0),(-1,-1),LGREY)]))
    elements.append(cbam_h)
    cbam_t = Table([[Paragraph("1. As of January 1st, following the implementation of the European Union's Carbon Border Adjustment Mechanism (CBAM), Alok Ingots Pvt. Ltd. provides all customers, to the best of its knowledge and ability, with accurate carbon emissions data. This information is independently verified by a certified third-party auditor to ensure transparency and compliance.\n\n2. All obligations, costs, levies, duties, or charges arising from the application or enforcement of CBAM within the European Union shall be the sole responsibility of the customer.", ps('ct',fontSize=7,leading=10))]], colWidths=[W])
    cbam_t.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6)]))
    elements.append(cbam_t)
    elements.append(Spacer(1,2*mm))

    bh = Table([[Paragraph('<b>BANK DETAILS :</b>',ps('bh',fontSize=8,fontName='Helvetica-Bold',textColor=WHITE))]], colWidths=[W])
    bh.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),NAVY),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4),('LEFTPADDING',(0,0),(-1,-1),6)]))
    elements.append(bh)
    bank = [('Import/Export Code :','030 407 9421'),("Bank's Name :",'STATE BANK OF INDIA, Commercial Branch'),
            ("Bank's Address :",'1st Floor, Majestic Shopping Centre, 144, JSS Marg, Girgaon, Mumbai, Maharashtra - 400004'),
            ('ACCOUNT NUMBER :','1027 166 7742'),('SWIFT CODE :','SBIN INBB 516')]
    bt = Table([[Paragraph(r[0],lbl),Paragraph(r[1],val)] for r in bank], colWidths=[W*0.22,W*0.78])
    bt.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('INNERGRID',(0,0),(-1,-1),0.3,MGREY),
                             ('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3),('LEFTPADDING',(0,0),(-1,-1),6)]))
    elements.append(bt)
    elements.append(Spacer(1,3*mm))

    sig = Table([[
        Paragraph(f'<b>For {cust}</b><br/><br/><br/>________________________<br/><font size="7">Authorised Signatory</font>',ps('sl',fontSize=8,leading=12)),
        Paragraph('<b>For, Alok Ingots (Mumbai) Pvt. Ltd.</b><br/><br/><br/>________________________<br/><font size="7">Authorised Signatory</font>',ps('sr',fontSize=8,leading=12)),
    ]], colWidths=[W*0.5,W*0.5])
    sig.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,MGREY),('INNERGRID',(0,0),(-1,-1),0.3,MGREY),
                              ('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('LEFTPADDING',(0,0),(-1,-1),8)]))
    elements.append(sig)
    elements.append(Spacer(1,2*mm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=MGREY))
    ft = Table([[
        Paragraph('<b>ALOK INGOTS (MUMBAI) PVT LTD</b><br/>602, Raheja Chambers, 213 Free Press, Journal Marg, Nariman Point 400021, India<br/>Tel: +91 22 40220080  www.alokindia.com', ps('fl',fontSize=6.5,leading=9)),
        Paragraph('Bank name — State Bank of India<br/>144, Jss Marg, Girgaon, Mumbai: 400004<br/>A/C No: 10271667742  Swift Code: SBININBB516', ps('fr',fontSize=6.5,leading=9,alignment=TA_RIGHT)),
    ]], colWidths=[W*0.55,W*0.45])
    ft.setStyle(TableStyle([('TOPPADDING',(0,0),(-1,-1),3),('VALIGN',(0,0),(-1,-1),'TOP')]))
    elements.append(ft)

    doc.build(elements)
    buf.seek(0)
    safe_so = re.sub(r'[/\\]', '_', so_number)
    return send_file(buf, mimetype='application/pdf', download_name=f'SalesContract_{safe_so}_{copy_type}.pdf', as_attachment=False)



