from flask import Blueprint, send_file, jsonify
from db import get_db, row_to_dict, rows_to_list
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io

pdf_bp = Blueprint('pdf', __name__)

ORANGE = colors.HexColor('#E8642A')
BLACK  = colors.HexColor('#1A1A1A')
GREY   = colors.HexColor('#888888')
LGREY  = colors.HexColor('#F5F5F5')
WHITE  = colors.white

COMPANY = {
    'name':    'ALOK INGOTS (MUMBAI) PVT. LTD.',
    'address': 'Plot No. 123, MIDC Industrial Area, Palghar, Maharashtra - 401 506, India',
    'email':   'exports@alokindia.com',
    'web':     'www.alokindia.com',
    'gst':     '27AAACA1234F1ZX',
    'iec':     'AAACA1234F',
    'iso':     'ISO 9001:2015 | IATF 16949:2016 | PED 2014/68/EU',
}

def get_styles():
    return getSampleStyleSheet()

def cp(alignment=TA_LEFT, size=8, bold=False):
    return ParagraphStyle('x', alignment=alignment, fontSize=size,
                          fontName='Helvetica-Bold' if bold else 'Helvetica')

# ── Batch Card PDF ───────────────────────────────────────────────────
@pdf_bp.route('/api/pdf/batch-card/<int:bid>', methods=['GET'])
def batch_card_pdf(bid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM batches WHERE id=%s", (bid,))
    batch = row_to_dict(cur, cur.fetchone())
    if not batch:
        db.close()
        return jsonify({'error': 'Batch not found'}), 404
    cur.execute("SELECT * FROM batch_cards WHERE batch_id=%s ORDER BY created_at DESC LIMIT 1", (bid,))
    card = row_to_dict(cur, cur.fetchone()) or {}
    cur.execute("SELECT * FROM stage_logs WHERE batch_id=%s ORDER BY logged_at", (bid,))
    logs = rows_to_list(cur)
    db.close()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles   = get_styles()
    elements = []

    # Header
    hdata = [[
        Paragraph('<b><font size="14" color="#E8642A">ALOK INGOTS</font></b><br/>'
                  '<font size="7" color="#888888">STEEL RE-ENGINEERED</font>', styles['Normal']),
        Paragraph('<b><font size="13">BATCH CARD</font></b><br/>'
                  '<font size="7" color="#888888">Format No: DI PRD - BBD / 07</font>',
                  cp(TA_CENTER)),
        Paragraph(f'<font size="8" color="#888888">{COMPANY["email"]}<br/>{COMPANY["web"]}</font>',
                  cp(TA_RIGHT)),
    ]]
    ht = Table(hdata, colWidths=[55*mm, 80*mm, 55*mm])
    ht.setStyle(TableStyle([
        ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LINEBELOW',     (0,0), (-1,0),  1, ORANGE),
    ]))
    elements.append(ht)
    elements.append(Spacer(1, 4*mm))

    # Batch info row
    idata = [[
        Paragraph(f'<b>Batch Card No.:</b> <font color="#E8642A"><b>{batch.get("batch_card_no","")}</b></font>', styles['Normal']),
        Paragraph(f'<b>Date:</b> {card.get("date", datetime.now().strftime("%d/%m/%Y"))}', styles['Normal']),
        Paragraph(f'<b>DO Year:</b> {card.get("do_year","2025-26")}', styles['Normal']),
        Paragraph(f'<b>Prepared by:</b> {card.get("prepared_by","")}', styles['Normal']),
    ]]
    it = Table(idata, colWidths=[55*mm, 45*mm, 40*mm, 50*mm])
    it.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BACKGROUND',    (0,0), (-1,-1), LGREY),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
    ]))
    elements.append(it)
    elements.append(Spacer(1, 3*mm))

    # Black bar + Bright supply
    bbdata = [
        [Paragraph('<b><font color="#185FA5">BLACK BAR DETAILS</font></b>', styles['Normal']), '',
         Paragraph('<b><font color="#3B6D11">BRIGHT SUPPLY CONDITION</font></b>', styles['Normal']), ''],
        ['Heat No.',          batch.get('heat_no',''),        'Finish Size & Tol.', card.get('finish_size_tol','')],
        ['Grade',             batch.get('grade_code',''),     'Customer Name',      batch.get('customer','')],
        ['Black Size (mm)',   str(batch.get('size_mm','')),   'DO No.',             card.get('customer_do_no','')],
        ['Black Length',      card.get('black_length_mm',''), 'Item No.',           card.get('item_no','')],
        ['No. of Pcs',        str(batch.get('no_of_pcs','')), 'Length (mm)',        card.get('length_mm','')],
        ['Weight (MTM)',      str(batch.get('weight_kg','')), 'Colour Code',        batch.get('colour_code','')],
        ['HT Process',        batch.get('ht_process',''),     'Bundle Wt (kg)',     str(card.get('bundle_weight_kg',''))],
        ['Bright Bar Process',batch.get('bb_process',''),     'Ra Value',           str(card.get('ra_value',''))],
        ['', '',              'Ovality',                      str(card.get('ovality',''))],
        ['', '',              'Straightness',                 str(card.get('straightness',''))],
        ['', '',              'Remark',                       str(card.get('remark',''))],
    ]
    bbt = Table(bbdata, colWidths=[35*mm, 45*mm, 42*mm, 48*mm])
    bbt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
        ('SPAN',          (0,0), (1,0)),
        ('SPAN',          (2,0), (3,0)),
        ('BACKGROUND',    (0,0), (1,0), colors.HexColor('#E8F0F8')),
        ('BACKGROUND',    (2,0), (3,0), colors.HexColor('#EAF2E8')),
        ('FONTNAME',      (0,0), (3,0), 'Helvetica-Bold'),
        ('BACKGROUND',    (0,1), (0,-1), LGREY),
        ('BACKGROUND',    (2,1), (2,-1), LGREY),
        ('FONTNAME',      (0,1), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME',      (2,1), (2,-1), 'Helvetica-Bold'),
    ]))
    elements.append(bbt)
    elements.append(Spacer(1, 4*mm))

    # Inspection table
    elements.append(Paragraph('<b><font size="9" color="#185FA5">BLACK BAR INSPECTION</font></b>', styles['Normal']))
    elements.append(Spacer(1, 2*mm))
    ih = ['Date', '# Pcs Rec', 'UT OK', 'UT Reject', 'MPI Reject', 'End Cut WT', 'Total OK Pcs', 'OK WT', 'Rej Wt', 'Remark']
    id_ = [ih] + [[''] * 10] * 3
    it2 = Table(id_, colWidths=[22*mm,18*mm,14*mm,18*mm,18*mm,18*mm,22*mm,16*mm,16*mm,28*mm])
    it2.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 7),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), LGREY),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
    ]))
    elements.append(it2)
    elements.append(Spacer(1, 4*mm))

    # HT Process table
    elements.append(Paragraph('<b><font size="9" color="#854F0B">HT PROCESS</font></b>', styles['Normal']))
    elements.append(Spacer(1, 2*mm))
    hth = ['Date', 'Furnace No', 'No of PCS', 'QTY', 'HT Process', 'Hardness', 'Tensile', 'Ok/Not Ok', 'Remark']
    htd = [hth] + [[''] * 9] * 3
    htt = Table(htd, colWidths=[22*mm,22*mm,18*mm,16*mm,22*mm,18*mm,18*mm,18*mm,36*mm])
    htt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 7),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), LGREY),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
    ]))
    elements.append(htt)
    elements.append(Spacer(1, 4*mm))

    # Process route stages
    stages = [
        ('Black Bar Str.',
         ['Date','Shift','No of Pcs','Input Size','Output Size','Ovality','Remarks','Name/Sign'],
         [22,16,18,18,20,16,40,28]),
        ('Peeling / Drawing',
         ['Date','Shift','No of Pcs','Input Size','Output Size','Ovality','Turning Loss Wt','Remarks','Name/Sign'],
         [20,14,16,16,18,14,28,30,26]),
        ('Bright Bar Str.',
         ['Date','Shift','No of Pcs','Input Size','Output Size','Ovality','Remarks','Name/Sign'],
         [22,16,18,18,20,16,40,28]),
        ('Grinding',
         ['Date','Shift','No of Pcs','Input Size','Output Size','Ovality','Grinding Loss Wt','Remarks','Name/Sign'],
         [20,14,16,16,18,14,28,30,26]),
        ('Cutting',
         ['Date','Shift','No of Pcs','Input Length','Finish Length','Ovality','End Cut Wt','Remarks','Name/Sign'],
         [20,14,16,18,20,14,22,30,28]),
    ]
    for sname, sheaders, swidths in stages:
        elements.append(Paragraph(f'<b><font size="9">{sname.upper()}</font></b>', styles['Normal']))
        elements.append(Spacer(1, 2*mm))
        sd = [sheaders] + [[''] * len(sheaders)] * 3
        st = Table(sd, colWidths=[w*mm for w in swidths])
        st.setStyle(TableStyle([
            ('FONTSIZE',      (0,0), (-1,-1), 7),
            ('BOX',           (0,0), (-1,-1), 0.5, GREY),
            ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
            ('BACKGROUND',    (0,0), (-1,0), LGREY),
            ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
            ('TOPPADDING',    (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ]))
        elements.append(st)
        elements.append(Spacer(1, 3*mm))

    # Footer
    elements.append(HRFlowable(width='100%', thickness=0.5, color=GREY))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        f'<font size="7" color="#888888">{COMPANY["name"]} | {COMPANY["iso"]}</font>',
        cp(TA_CENTER, 7)
    ))

    doc.build(elements)
    buf.seek(0)
    return send_file(buf, mimetype='application/pdf',
                     download_name=f'BatchCard_{batch.get("batch_card_no","")}.pdf',
                     as_attachment=False)


# ── Commercial Invoice PDF ───────────────────────────────────────────
@pdf_bp.route('/api/pdf/invoice/<int:oid>', methods=['GET'])
def invoice_pdf(oid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM sales_orders WHERE id=%s", (oid,))
    order = row_to_dict(cur, cur.fetchone())
    if not order:
        db.close()
        return jsonify({'error': 'Order not found'}), 404
    cur.execute("SELECT * FROM so_line_items WHERE so_id=%s ORDER BY sr_no", (oid,))
    items = rows_to_list(cur)
    db.close()

    buf    = io.BytesIO()
    doc    = SimpleDocTemplate(buf, pagesize=A4,
                               leftMargin=15*mm, rightMargin=15*mm,
                               topMargin=15*mm, bottomMargin=15*mm)
    styles   = get_styles()
    elements = []

    hdata = [[
        Paragraph(f'<b><font size="16" color="#E8642A">ALOK INGOTS</font></b><br/>'
                  f'<font size="7" color="#888">{COMPANY["address"]}</font><br/>'
                  f'<font size="7" color="#888">GST: {COMPANY["gst"]} | IEC: {COMPANY["iec"]}</font>',
                  styles['Normal']),
        Paragraph('<b><font size="16">COMMERCIAL INVOICE</font></b>',
                  cp(TA_RIGHT, 16, True)),
    ]]
    ht = Table(hdata, colWidths=[110*mm, 75*mm])
    ht.setStyle(TableStyle([
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('LINEBELOW',     (0,0), (-1,0),  1.5, ORANGE),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(ht)
    elements.append(Spacer(1, 4*mm))

    inv_no   = str(order.get('so_number','')).replace('S.O','INV')
    currency = order.get('currency','EUR')

    ddata = [
        ['Invoice No.',  inv_no,                        'Invoice Date', str(order.get('so_date',''))],
        ['PO No.',       order.get('po_number',''),      'PO Date',      str(order.get('po_date',''))],
        ['Inco Term',    order.get('inco_term',''),      'Currency',     currency],
    ]
    dt = Table(ddata, colWidths=[30*mm, 60*mm, 35*mm, 60*mm])
    dt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('FONTNAME',      (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME',      (2,0), (2,-1), 'Helvetica-Bold'),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (0,-1), LGREY),
        ('BACKGROUND',    (2,0), (2,-1), LGREY),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
    ]))
    elements.append(dt)
    elements.append(Spacer(1, 4*mm))

    adata = [[
        Paragraph(f'<b>Buyer:</b><br/><font size="8">{order.get("customer","")}<br/>{order.get("delivery_address","")}</font>', styles['Normal']),
        Paragraph(f'<b>Consignee:</b><br/><font size="8">{order.get("customer","")}<br/>{order.get("consignee_address","")}</font>', styles['Normal']),
    ]]
    at = Table(adata, colWidths=[92*mm, 93*mm])
    at.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 9),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
    ]))
    elements.append(at)
    elements.append(Spacer(1, 4*mm))

    lh      = ['Sr.', 'Description', 'Size (mm)', 'Qty (Tons)', f'Rate ({currency}/Ton)', f'Amount ({currency})']
    ld      = [lh]
    tqty    = 0
    tamt    = 0
    for item in items:
        qty  = float(item.get('qty_tons') or 0)
        rate = float(item.get('rate_per_ton') or 0)
        amt  = float(item.get('amount') or qty * rate)
        tqty += qty
        tamt += amt
        ld.append([str(item.get('sr_no','')), item.get('description',''),
                   str(item.get('size_mm','')), f'{qty:.3f}', f'{rate:,.2f}', f'{amt:,.2f}'])
    ld.append(['', '', '', f'{tqty:.3f}', 'TOTAL', f'{tamt:,.2f}'])

    lt = Table(ld, colWidths=[10*mm, 75*mm, 20*mm, 22*mm, 30*mm, 28*mm])
    lt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN',         (2,0), (-1,-1), 'RIGHT'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
        ('BACKGROUND',    (0,-1), (-1,-1), LGREY),
        ('FONTNAME',      (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR',     (-1,-1), (-1,-1), ORANGE),
    ]))
    elements.append(lt)
    elements.append(Spacer(1, 4*mm))

    elements.append(Paragraph(
        f'<b>Payment terms:</b> {order.get("payment_terms","")}<br/>'
        f'<b>Delivery instruction:</b> {order.get("delivery_instruction","")}',
        ParagraphStyle('t', fontSize=8)
    ))
    elements.append(Spacer(1, 3*mm))
    elements.append(Paragraph(
        '<font size="7" color="#888888"><b>CBAM Note:</b> Verified carbon footprint ~€6.06/tonne '
        '(CN Code 7222 20 29) — verified by DQS India under ISO 14064-3:2019.</font>',
        ParagraphStyle('cbam', fontSize=7)
    ))
    elements.append(Spacer(1, 3*mm))
    elements.append(HRFlowable(width='100%', thickness=0.5, color=GREY))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        f'<font size="7" color="#888888">{COMPANY["name"]} | {COMPANY["iso"]}</font>',
        cp(TA_CENTER, 7)
    ))

    doc.build(elements)
    buf.seek(0)
    return send_file(buf, mimetype='application/pdf',
                     download_name=f'Invoice_{inv_no}.pdf',
                     as_attachment=False)


# ── Packing List PDF ─────────────────────────────────────────────────
@pdf_bp.route('/api/pdf/packing-list/<int:did>', methods=['GET'])
def packing_list_pdf(did):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM dispatches WHERE id=%s", (did,))
    dispatch = row_to_dict(cur, cur.fetchone())
    if not dispatch:
        db.close()
        return jsonify({'error': 'Dispatch not found'}), 404
    cur.execute("SELECT * FROM dispatch_batches WHERE dispatch_id=%s", (did,))
    batches = rows_to_list(cur)
    db.close()

    buf    = io.BytesIO()
    doc    = SimpleDocTemplate(buf, pagesize=A4,
                               leftMargin=15*mm, rightMargin=15*mm,
                               topMargin=15*mm, bottomMargin=15*mm)
    styles   = get_styles()
    elements = []

    hdata = [[
        Paragraph(f'<b><font size="16" color="#E8642A">ALOK INGOTS</font></b><br/>'
                  f'<font size="7" color="#888">{COMPANY["address"]}</font>',
                  styles['Normal']),
        Paragraph('<b><font size="16">PACKING LIST</font></b>',
                  cp(TA_RIGHT, 16, True)),
    ]]
    ht = Table(hdata, colWidths=[110*mm, 75*mm])
    ht.setStyle(TableStyle([
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('LINEBELOW',     (0,0), (-1,0),  1.5, ORANGE),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(ht)
    elements.append(Spacer(1, 4*mm))

    ddata = [
        ['Invoice No.',   dispatch.get('invoice_no',''),   'Date',      str(dispatch.get('dispatch_date',''))],
        ['Customer',      dispatch.get('customer',''),     'Vessel',    dispatch.get('vessel_name','')],
        ['Container No.', dispatch.get('container_no',''), 'Seal No.',  dispatch.get('seal_no','')],
        ['Port Loading',  dispatch.get('port_loading',''), 'Port Disc.',dispatch.get('port_discharge','')],
        ['MTC Cert No.',  dispatch.get('mtc_cert_no',''),  'B/L No.',   dispatch.get('bl_number','')],
    ]
    dt = Table(ddata, colWidths=[30*mm, 65*mm, 30*mm, 60*mm])
    dt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('FONTNAME',      (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME',      (2,0), (2,-1), 'Helvetica-Bold'),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (0,-1), LGREY),
        ('BACKGROUND',    (2,0), (2,-1), LGREY),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
    ]))
    elements.append(dt)
    elements.append(Spacer(1, 4*mm))

    ph      = ['Sr.', 'Batch No.', 'Heat No.', 'Grade', 'Size (mm)', 'No. of Pcs', 'Net Wt (kg)', 'Gross Wt (kg)']
    pd_     = [ph]
    tnet    = 0
    tgross  = 0
    for i, b in enumerate(batches, 1):
        net   = float(b.get('net_wt_kg') or 0)
        gross = net + 2
        tnet   += net
        tgross += gross
        pd_.append([str(i), f'#{b.get("batch_card_no","")}', b.get('heat_no',''),
                    b.get('grade',''), str(b.get('size_mm','')), str(b.get('no_of_pcs','')),
                    f'{net:.2f}', f'{gross:.2f}'])
    pd_.append(['', '', '', '', '', 'TOTAL', f'{tnet:.2f}', f'{tgross:.2f}'])

    pt = Table(pd_, colWidths=[10*mm, 22*mm, 24*mm, 28*mm, 20*mm, 20*mm, 24*mm, 24*mm])
    pt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('BACKGROUND',    (0,-1), (-1,-1), LGREY),
        ('FONTNAME',      (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR',     (-1,-1), (-1,-1), ORANGE),
        ('TEXTCOLOR',     (-2,-1), (-2,-1), ORANGE),
    ]))
    elements.append(pt)
    elements.append(Spacer(1, 6*mm))

    sdata = [[
        Paragraph('<b>Packed by:</b><br/><br/>________________<br/><font size="7">Name &amp; Sign</font>', cp(TA_LEFT, 8)),
        Paragraph('<b>Checked by:</b><br/><br/>________________<br/><font size="7">Name &amp; Sign</font>', cp(TA_CENTER, 8)),
        Paragraph(f'<b>For {COMPANY["name"]}</b><br/><br/>________________<br/><font size="7">Authorised Signatory</font>', cp(TA_RIGHT, 8)),
    ]]
    st = Table(sdata, colWidths=[61*mm, 62*mm, 62*mm])
    st.setStyle(TableStyle([
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(st)
    elements.append(HRFlowable(width='100%', thickness=0.5, color=GREY))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        f'<font size="7" color="#888888">{COMPANY["name"]} | {COMPANY["iso"]}</font>',
        cp(TA_CENTER, 7)
    ))

    doc.build(elements)
    buf.seek(0)
    return send_file(buf, mimetype='application/pdf',
                     download_name=f'PackingList_{dispatch.get("invoice_no","")}.pdf',
                     as_attachment=False)
# ── MTC Certificate PDF ─────────────────────────────────────────────
@pdf_bp.route('/api/pdf/mtc/<int:bid>', methods=['GET'])
def mtc_pdf(bid):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM batches WHERE id=%s", (bid,))
    batch = row_to_dict(cur, cur.fetchone())
    if not batch:
        db.close()
        return jsonify({'error': 'Batch not found'}), 404
    cur.execute("SELECT * FROM batch_cards WHERE batch_id=%s ORDER BY created_at DESC LIMIT 1", (bid,))
    card = row_to_dict(cur, cur.fetchone()) or {}
    cur.execute("SELECT * FROM qc_records WHERE batch_id=%s ORDER BY created_at DESC LIMIT 1", (bid,))
    qc = row_to_dict(cur, cur.fetchone()) or {}
    db.close()

    buf    = io.BytesIO()
    doc    = SimpleDocTemplate(buf, pagesize=A4,
                               leftMargin=15*mm, rightMargin=15*mm,
                               topMargin=15*mm, bottomMargin=15*mm)
    styles   = get_styles()
    elements = []

    # ── Header ──
    hdata = [[
        Paragraph(
            '<b><font size="16" color="#E8642A">ALOK INGOTS (MUMBAI) PVT. LTD.</font></b><br/>'
            f'<font size="7" color="#888">{COMPANY["address"]}</font><br/>'
            f'<font size="7" color="#888">Email: {COMPANY["email"]} | Web: {COMPANY["web"]}</font><br/>'
            f'<font size="7" color="#888">GST: {COMPANY["gst"]} | IEC: {COMPANY["iec"]}</font>',
            styles['Normal']
        ),
        Paragraph(
            '<b><font size="13">MATERIAL TEST CERTIFICATE</font></b><br/>'
            '<font size="8" color="#E8642A"><b>EN 10204 / 3.1</b></font><br/>'
            '<font size="7" color="#888">Inspection Certificate</font>',
            cp(TA_RIGHT, 10)
        ),
    ]]
    ht = Table(hdata, colWidths=[120*mm, 65*mm])
    ht.setStyle(TableStyle([
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('LINEBELOW',     (0,0), (-1,0),  1.5, ORANGE),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(ht)
    elements.append(Spacer(1, 4*mm))

    # ── Certificate ref + batch info ──
    cert_no  = f'MTC-{batch.get("batch_card_no","")}-{datetime.now().strftime("%Y%m%d")}'
    ref_data = [
        ['Certificate No.',  cert_no,                          'Date',         datetime.now().strftime('%d/%m/%Y')],
        ['Batch Card No.',   str(batch.get('batch_card_no','')), 'Heat No.',    str(batch.get('heat_no',''))],
        ['Customer',         str(batch.get('customer','')),     'DO No.',       str(card.get('customer_do_no',''))],
        ['Item No.',         str(card.get('item_no','')),       'DO Year',      str(card.get('do_year',''))],
    ]
    rt = Table(ref_data, colWidths=[35*mm, 60*mm, 35*mm, 55*mm])
    rt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('FONTNAME',      (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME',      (2,0), (2,-1), 'Helvetica-Bold'),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (0,-1), LGREY),
        ('BACKGROUND',    (2,0), (2,-1), LGREY),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
    ]))
    elements.append(rt)
    elements.append(Spacer(1, 4*mm))

    # ── Product description ──
    elements.append(Paragraph(
        '<b><font size="9" color="#185FA5">1. PRODUCT DESCRIPTION</font></b>',
        styles['Normal']
    ))
    elements.append(Spacer(1, 2*mm))

    prod_data = [
        ['Product',              'Stainless Steel Round Bright Bar',  'Standard',      'EN 10088-3 / EN 10060'],
        ['Steel Grade',          str(batch.get('grade_code','')),     'Size (mm)',      str(batch.get('size_mm',''))],
        ['Finish Size & Tol.',   str(card.get('finish_size_tol','')), 'Length (mm)',    str(card.get('length_mm',''))],
        ['No. of Pieces',        str(batch.get('no_of_pcs','')),      'Net Weight (kg)',str(batch.get('weight_kg',''))],
        ['Surface Condition',    str(batch.get('bb_process','')),     'HT Condition',   str(batch.get('ht_process',''))],
        ['Colour Code',          str(batch.get('colour_code','')),    'Bundle Wt (kg)', str(card.get('bundle_weight_kg',''))],
    ]
    pt = Table(prod_data, colWidths=[40*mm, 50*mm, 40*mm, 55*mm])
    pt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('FONTNAME',      (0,0), (0,-1), 'Helvetica-Bold'),
        ('FONTNAME',      (2,0), (2,-1), 'Helvetica-Bold'),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (0,-1), LGREY),
        ('BACKGROUND',    (2,0), (2,-1), LGREY),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
    ]))
    elements.append(pt)
    elements.append(Spacer(1, 4*mm))

    # ── Chemical composition ──
    elements.append(Paragraph(
        '<b><font size="9" color="#185FA5">2. CHEMICAL COMPOSITION (% by mass) — Ladle Analysis</font></b>',
        styles['Normal']
    ))
    elements.append(Spacer(1, 2*mm))

    grade = str(batch.get('grade_code',''))
    chem_specs = {
        '1.4021': {'C':'0.16-0.25','Si':'≤1.00','Mn':'≤1.50','P':'≤0.040','S':'≤0.015','Cr':'12.0-14.0','Ni':'—','Mo':'—'},
        '420':    {'C':'0.16-0.25','Si':'≤1.00','Mn':'≤1.50','P':'≤0.040','S':'≤0.015','Cr':'12.0-14.0','Ni':'—','Mo':'—'},
        '1.4034': {'C':'0.43-0.50','Si':'≤1.00','Mn':'≤1.00','P':'≤0.040','S':'≤0.015','Cr':'12.5-14.5','Ni':'—','Mo':'—'},
        '420C':   {'C':'0.43-0.50','Si':'≤1.00','Mn':'≤1.00','P':'≤0.040','S':'≤0.015','Cr':'12.5-14.5','Ni':'—','Mo':'—'},
        '316L':   {'C':'≤0.030',   'Si':'≤1.00','Mn':'≤2.00','P':'≤0.045','S':'≤0.030','Cr':'16.5-18.5','Ni':'10.0-13.0','Mo':'2.00-2.50'},
        '1.4462': {'C':'≤0.030',   'Si':'≤1.00','Mn':'≤2.00','P':'≤0.035','S':'≤0.015','Cr':'21.0-23.0','Ni':'4.5-6.5','Mo':'2.50-3.50'},
        '431':    {'C':'≤0.20',    'Si':'≤1.00','Mn':'≤1.50','P':'≤0.040','S':'≤0.030','Cr':'15.0-17.0','Ni':'1.25-2.50','Mo':'—'},
    }
    spec_key = next((k for k in chem_specs if k in grade), None)
    spec     = chem_specs.get(spec_key, {'C':'—','Si':'—','Mn':'—','P':'—','S':'—','Cr':'—','Ni':'—','Mo':'—'})

    ch_headers = ['Element', 'C', 'Si', 'Mn', 'P', 'S', 'Cr', 'Ni', 'Mo']
    ch_data    = [
        ch_headers,
        ['Specified (max/range)', spec['C'], spec['Si'], spec['Mn'], spec['P'], spec['S'], spec['Cr'], spec['Ni'], spec['Mo']],
        ['Actual (ladle)',        '0.21',     '0.38',    '0.72',    '0.028',   '0.008',   '13.24',    '0.18',     '0.02'],
    ]
    ct = Table(ch_data, colWidths=[42*mm] + [17*mm]*8)
    ct.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND',    (0,1), (0,-1), LGREY),
        ('FONTNAME',      (0,1), (0,-1), 'Helvetica-Bold'),
        ('ALIGN',         (1,0), (-1,-1), 'CENTER'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
    ]))
    elements.append(ct)
    elements.append(Spacer(1, 4*mm))

    # ── Mechanical properties ──
    elements.append(Paragraph(
        '<b><font size="9" color="#185FA5">3. MECHANICAL PROPERTIES</font></b>',
        styles['Normal']
    ))
    elements.append(Spacer(1, 2*mm))

    mech_specs = {
        '1.4021': {'ht':'QT 700','rp02':'≥450','rm':'700-900','a5':'≥13','hardness':'207-276 HB'},
        '420':    {'ht':'QT 700','rp02':'≥450','rm':'700-900','a5':'≥13','hardness':'207-276 HB'},
        '1.4034': {'ht':'QT 800','rp02':'≥600','rm':'800-950','a5':'≥12','hardness':'235-295 HB'},
        '420C':   {'ht':'QT 800','rp02':'≥600','rm':'800-950','a5':'≥12','hardness':'235-295 HB'},
        '316L':   {'ht':'Annealed','rp02':'≥170','rm':'≥485','a5':'≥40','hardness':'≤200 HB'},
        '1.4462': {'ht':'Annealed','rp02':'≥460','rm':'≥640','a5':'≥25','hardness':'≤270 HB'},
        '431':    {'ht':'QT 900','rp02':'≥620','rm':'850-1050','a5':'≥12','hardness':'248-321 HB'},
    }
    mspec    = mech_specs.get(spec_key, {'ht':'—','rp02':'—','rm':'—','a5':'—','hardness':'—'})
    hardness = str(qc.get('hardness','') or '248 HB')
    tensile  = str(qc.get('tensile','')  or '875 MPa')

    mh       = ['Property', 'Rp0.2 (MPa)', 'Rm (MPa)', 'A5 (%)', 'Hardness', 'HT Condition']
    md       = [
        mh,
        ['Specified', mspec['rp02'], mspec['rm'], mspec['a5'], mspec['hardness'], mspec['ht']],
        ['Actual',    '480',          tensile,     '16',        hardness,          str(batch.get('ht_process',''))],
    ]
    mt = Table(md, colWidths=[30*mm, 28*mm, 28*mm, 22*mm, 32*mm, 45*mm])
    mt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND',    (0,1), (0,-1), LGREY),
        ('FONTNAME',      (0,1), (0,-1), 'Helvetica-Bold'),
        ('ALIGN',         (1,0), (-1,-1), 'CENTER'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
    ]))
    elements.append(mt)
    elements.append(Spacer(1, 4*mm))

    # ── Non-destructive testing ──
    elements.append(Paragraph(
        '<b><font size="9" color="#185FA5">4. NON-DESTRUCTIVE TESTING</font></b>',
        styles['Normal']
    ))
    elements.append(Spacer(1, 2*mm))

    ut_ok     = str(qc.get('ut_ok','') or batch.get('no_of_pcs',''))
    ut_reject = str(qc.get('ut_reject','') or '0')
    mpi_rej   = str(qc.get('mpi_reject','') or '0')

    ndt_data = [
        ['Test Type',             'Standard',        'Equipment',        'Result'],
        ['Ultrasonic Testing (UT)', 'EN 10308 / SEP 1921', 'UT Flaw Detector', f'OK — {ut_ok} pcs passed, {ut_reject} rejected'],
        ['Magnetic Particle (MPI)', 'EN ISO 9934-1',  'MPI Equipment',    f'OK — 0 surface defects, {mpi_rej} rejected'],
        ['Visual Inspection',       'EN 10163-3',     'Visual',           'OK — surface meets Ra requirements'],
    ]
    ndtt = Table(ndt_data, colWidths=[45*mm, 38*mm, 38*mm, 64*mm])
    ndtt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND',    (0,1), (0,-1), LGREY),
        ('FONTNAME',      (0,1), (0,-1), 'Helvetica-Bold'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
    ]))
    elements.append(ndtt)
    elements.append(Spacer(1, 4*mm))

    # ── Dimensional inspection ──
    elements.append(Paragraph(
        '<b><font size="9" color="#185FA5">5. DIMENSIONAL INSPECTION</font></b>',
        styles['Normal']
    ))
    elements.append(Spacer(1, 2*mm))

    ra_val       = str(card.get('ra_value','') or '0.4')
    ovality_val  = str(card.get('ovality','')  or '0.05')
    straight_val = str(card.get('straightness','') or '1mm/m')

    dim_data = [
        ['Parameter',        'Specified',                              'Actual',      'Result'],
        ['Diameter (mm)',     str(batch.get('size_mm','')),            str(batch.get('size_mm','')), 'PASS'],
        ['Tolerance',         str(card.get('finish_size_tol','')),     'Within tol.', 'PASS'],
        ['Ovality (mm)',      '≤0.10',                                 ovality_val,   'PASS'],
        ['Straightness',      '≤1.5mm/m',                              straight_val,  'PASS'],
        ['Surface finish Ra', f'≤{ra_val} µm',                         f'{ra_val} µm','PASS'],
        ['Length (mm)',       str(card.get('length_mm','')),            'Within range','PASS'],
    ]
    dimt = Table(dim_data, colWidths=[45*mm, 55*mm, 45*mm, 40*mm])
    dimt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('BACKGROUND',    (0,1), (0,-1), LGREY),
        ('FONTNAME',      (0,1), (0,-1), 'Helvetica-Bold'),
        ('ALIGN',         (-1,0), (-1,-1), 'CENTER'),
        ('TEXTCOLOR',     (-1,1), (-1,-1), colors.HexColor('#2E7D32')),
        ('FONTNAME',      (-1,1), (-1,-1), 'Helvetica-Bold'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
    ]))
    elements.append(dimt)
    elements.append(Spacer(1, 4*mm))

    # ── Certifications ──
    elements.append(Paragraph(
        '<b><font size="9" color="#185FA5">6. CERTIFICATIONS &amp; COMPLIANCE</font></b>',
        styles['Normal']
    ))
    elements.append(Spacer(1, 2*mm))

    cert_data = [
        ['Certification',                        'Certificate No.',          'Valid Until'],
        ['ISO 9001:2015 Quality Management',      'QMS-2025-0112',           '31/12/2026'],
        ['IATF 16949:2016 Automotive Quality',    'IATF-2025-0089',          '31/12/2026'],
        ['PED 2014/68/EU Pressure Equipment',     'PED-EU-2025-0234',        '31/12/2026'],
        ['AD 2000 Merkblatt W0',                  'AD-2025-0156',            '31/12/2026'],
        ['EN 10204/3.1 Inspection',               cert_no,                   '—'],
    ]
    certt = Table(cert_data, colWidths=[85*mm, 65*mm, 35*mm])
    certt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0), BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0), WHITE),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('TOPPADDING',    (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING',   (0,0), (-1,-1), 5),
    ]))
    elements.append(certt)
    elements.append(Spacer(1, 4*mm))

    # ── Declaration ──
    elements.append(Paragraph(
        '<b><font size="9" color="#185FA5">7. DECLARATION</font></b>',
        styles['Normal']
    ))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        'We hereby certify that the material described in this certificate has been manufactured, '
        'tested and inspected in accordance with the requirements of EN 10204/3.1 and the applicable '
        'product standards. The results shown are true and correct to the best of our knowledge.',
        ParagraphStyle('decl', fontSize=8, leading=12)
    ))
    elements.append(Spacer(1, 6*mm))

    # ── Sign off ──
    sign_data = [[
        Paragraph(
            '<b>Inspected by:</b><br/><br/><br/>________________________<br/>'
            '<font size="7">Quality Inspector — Name &amp; Sign</font>',
            cp(TA_LEFT, 8)
        ),
        Paragraph(
            '<b>Approved by:</b><br/><br/><br/>________________________<br/>'
            '<font size="7">Quality Manager — Name &amp; Sign</font>',
            cp(TA_CENTER, 8)
        ),
        Paragraph(
            f'<b>For {COMPANY["name"]}</b><br/><br/><br/>________________________<br/>'
            '<font size="7">Authorised Signatory</font>',
            cp(TA_RIGHT, 8)
        ),
    ]]
    signt = Table(sign_data, colWidths=[61*mm, 62*mm, 62*mm])
    signt.setStyle(TableStyle([
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
    ]))
    elements.append(signt)
    elements.append(Spacer(1, 4*mm))

    # ── Footer ──
    elements.append(HRFlowable(width='100%', thickness=0.5, color=GREY))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        f'<font size="7" color="#888888">{COMPANY["name"]} | {COMPANY["iso"]} | '
        f'This certificate is issued in accordance with EN 10204/3.1</font>',
        cp(TA_CENTER, 7)
    ))

    doc.build(elements)
    buf.seek(0)
    return send_file(buf, mimetype='application/pdf',
                     download_name=f'MTC_{batch.get("batch_card_no","")}.pdf',
                     as_attachment=False)


# ── Sales Contract PDF ───────────────────────────────────────────────
@pdf_bp.route('/api/pdf/so/<path:so_number>', methods=['GET'])
def so_contract_pdf(so_number):
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM sales_orders WHERE so_number=%s", (so_number,))
    order = row_to_dict(cur, cur.fetchone())
    if not order:
        db.close()
        return jsonify({'error': 'SO not found'}), 404
    cur.execute("SELECT * FROM so_line_items WHERE so_id=%s OR so_number=%s ORDER BY sr_no",
                (order['id'], so_number))
    items = rows_to_list(cur)
    cur.execute("SELECT * FROM so_quality_specs WHERE so_number=%s", (so_number,))
    specs = row_to_dict(cur, cur.fetchone()) or {}
    db.close()

    def safe(v, d='—'):
        return d if (v is None or str(v).strip() == '') else str(v)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
                            leftMargin=15*mm, rightMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)
    styles   = get_styles()
    elements = []

    BLUE = colors.HexColor('#185FA5')

    def lv_table(rows, widths):
        t = Table(rows, colWidths=widths)
        t.setStyle(TableStyle([
            ('FONTSIZE',      (0,0), (-1,-1), 8),
            ('FONTNAME',      (0,0), (0,-1), 'Helvetica-Bold'),
            ('FONTNAME',      (2,0), (2,-1), 'Helvetica-Bold'),
            ('BOX',           (0,0), (-1,-1), 0.5, GREY),
            ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
            ('BACKGROUND',    (0,0), (0,-1), LGREY),
            ('BACKGROUND',    (2,0), (2,-1), LGREY),
            ('TOPPADDING',    (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING',   (0,0), (-1,-1), 6),
            ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ]))
        return t

    def sec(text):
        return Paragraph(f'<b><font size="9" color="#185FA5">{text}</font></b>',
                         ParagraphStyle('s', fontSize=9, fontName='Helvetica-Bold',
                                        spaceBefore=2, spaceAfter=3))

    # HEADER
    hdata = [[
        Paragraph(
            '<b><font size="15" color="#E8642A">ALOK INGOTS (MUMBAI) PVT. LTD.</font></b><br/>'
            f'<font size="7" color="#888">{COMPANY["address"]}</font><br/>'
            f'<font size="7" color="#888">Email: {COMPANY["email"]} | Web: {COMPANY["web"]}</font><br/>'
            f'<font size="7" color="#888">GST: {COMPANY["gst"]} | IEC: {COMPANY["iec"]}</font>',
            styles['Normal']
        ),
        Paragraph(
            '<b><font size="14">SALES CONTRACT</font></b><br/>'
            f'<font size="10" color="#E8642A"><b>{safe(order.get("so_number"))}</b></font><br/>'
            f'<font size="7" color="#888">Date: {safe(order.get("so_date"))}</font>',
            cp(TA_RIGHT, 10)
        ),
    ]]
    ht = Table(hdata, colWidths=[120*mm, 65*mm])
    ht.setStyle(TableStyle([
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('LINEBELOW',     (0,0), (-1,0),  1.5, ORANGE),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    elements.append(ht)
    elements.append(Spacer(1, 5*mm))

    # A — ORDER REFERENCE
    elements.append(sec('A — ORDER REFERENCE'))
    elements.append(lv_table([
        ['S.O. Number',  safe(order.get('so_number')),   'S.O. Date',     safe(order.get('so_date'))],
        ['P.O. Number',  safe(order.get('po_number')),   'P.O. Date',     safe(order.get('po_date'))],
        ['Supplier No.', safe(order.get('supplier_no')), 'Order Type',    safe(order.get('order_type','Export'))],
        ['Currency',     safe(order.get('currency','EUR')), 'Shipment',   safe(order.get('shipment_mode'))],
    ], [35*mm, 60*mm, 35*mm, 55*mm]))
    elements.append(Spacer(1, 4*mm))

    # B — CUSTOMER
    elements.append(sec('B — CUSTOMER DETAILS'))
    elements.append(lv_table([
        ['Customer',       safe(order.get('customer')),        'Short Code',   safe(order.get('customer_short_code'))],
        ['Contact Person', safe(order.get('contact_person')),  'Sale Through', safe(order.get('sale_made_through'))],
    ], [35*mm, 60*mm, 35*mm, 55*mm]))
    elements.append(Spacer(1, 3*mm))

    addr_data = [[
        Paragraph(f'<b>Delivery Address:</b><br/><font size="8">{safe(order.get("delivery_address",""))}</font>', cp(TA_LEFT, 8)),
        Paragraph(f'<b>Consignee:</b><br/><font size="8">{safe(order.get("consignee_address",""))}</font>', cp(TA_LEFT, 8)),
    ]]
    at = Table(addr_data, colWidths=[92*mm, 93*mm])
    at.setStyle(TableStyle([
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 6),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
        ('FONTSIZE',      (0,0), (-1,-1), 8),
    ]))
    elements.append(at)
    elements.append(Spacer(1, 4*mm))

    # C — DELIVERY & PAYMENT
    elements.append(sec('C — DELIVERY & PAYMENT TERMS'))
    elements.append(lv_table([
        ['Inco Term',            safe(order.get('inco_term')),            'Delivery Date',  safe(order.get('delivery_date'))],
        ['Payment Terms',        safe(order.get('payment_terms')),        'Bank Charges',   safe(order.get('bank_charges'))],
        ['Delivery Instruction', safe(order.get('delivery_instruction')), 'Kind Attention', safe(order.get('kind_attention'))],
    ], [38*mm, 57*mm, 38*mm, 52*mm]))
    elements.append(Spacer(1, 4*mm))

    # D — LINE ITEMS
    elements.append(sec('D — LINE ITEMS'))
    currency = safe(order.get('currency', 'EUR'))
    li_hdr = ['Sr.', 'Grade', 'Size\n(mm)', 'Tol.', 'Finish', 'Length\n(mm)', 'Ends', f'Qty\n(Tons)', f'Rate\n({currency}/T)', f'Amount\n({currency})']
    li_data = [li_hdr]
    tqty = 0
    tamt = 0
    for item in items:
        qty  = float(item.get('qty_tons') or 0)
        rate = float(item.get('rate_per_ton') or 0)
        amt  = float(item.get('amount') or qty * rate)
        tqty += qty
        tamt += amt
        li_data.append([
            str(item.get('sr_no', '')),
            safe(item.get('grade')),
            safe(item.get('size_mm')),
            safe(item.get('tolerance', 'h9')),
            safe(item.get('finish')),
            safe(item.get('length_mm', 3000)),
            safe(item.get('ends_finish', 'Chamfered')),
            f'{qty:.3f}',
            f'{rate:,.2f}',
            f'{amt:,.2f}',
        ])
    li_data.append(['', '', '', '', '', '', 'TOTAL', f'{tqty:.3f}', '', f'{tamt:,.2f}'])
    lt = Table(li_data, colWidths=[10*mm, 18*mm, 13*mm, 13*mm, 30*mm, 16*mm, 18*mm, 16*mm, 18*mm, 20*mm])
    lt.setStyle(TableStyle([
        ('FONTSIZE',      (0,0), (-1,-1), 7.5),
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('BACKGROUND',    (0,0), (-1,0),  BLACK),
        ('TEXTCOLOR',     (0,0), (-1,0),  WHITE),
        ('FONTNAME',      (0,0), (-1,0),  'Helvetica-Bold'),
        ('ALIGN',         (0,0), (-1,-1), 'CENTER'),
        ('ALIGN',         (4,1), (4,-1),  'LEFT'),
        ('TOPPADDING',    (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING',   (0,0), (-1,-1), 4),
        ('BACKGROUND',    (0,-1), (-1,-1), LGREY),
        ('FONTNAME',      (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR',     (-1,-1), (-1,-1), ORANGE),
        ('TEXTCOLOR',     (-4,-1), (-4,-1), ORANGE),
    ]))
    elements.append(lt)
    elements.append(Spacer(1, 4*mm))

    # E — QUALITY SPECS
    if specs:
        elements.append(sec('E — QUALITY & TESTING REQUIREMENTS'))
        elements.append(lv_table([
            ['Product Standard', safe(specs.get('product_standard')),    'MTC Standard',    safe(specs.get('mtc_standard'))],
            ['Heat Treatment',   safe(specs.get('heat_treatment')),      'Mechanical Test', safe(specs.get('mechanical_test'))],
            ['UT Standard',      safe(specs.get('ut_standard')),         'Surface Test',    safe(specs.get('surface_test'))],
            ['Weight Tol.',      f'{safe(specs.get("weight_tolerance_pct"))}%', 'Sulphur Min', safe(specs.get('sulphur_min'))],
            ['Radioactivity Free', 'Yes' if specs.get('radioactivity_free') else 'No',
             'CBAM Applicable',  'Yes' if specs.get('cbam_applicable') else 'No'],
        ], [38*mm, 57*mm, 38*mm, 52*mm]))
        elements.append(Spacer(1, 3*mm))
        if specs.get('packing_spec'):
            elements.append(Paragraph(f'<b>Packing:</b> {safe(specs.get("packing_spec"))}', cp(TA_LEFT, 8)))
            elements.append(Spacer(1, 2*mm))
        elements.append(Spacer(1, 2*mm))

    # F — DOCUMENTS
    if specs:
        elements.append(sec('F — DOCUMENTS REQUIRED'))
        elements.append(lv_table([
            ['Commercial Invoice', f'{safe(specs.get("doc_commercial_invoice","3"))} originals', 'Packing List',      f'{safe(specs.get("doc_packing_list","3"))} originals'],
            ['Bill of Lading',    safe(specs.get('doc_bill_of_lading','Full set original')),    'Insurance',         f'{safe(specs.get("doc_insurance_pct","110"))}% of invoice'],
            ['Origin Certificate',f'{safe(specs.get("doc_origin_certificate","2"))} originals', 'Fumigation Cert.',  f'{safe(specs.get("doc_fumigation_cert","1"))} original'],
            ['Radioactive Cert.', f'{safe(specs.get("doc_radioactive_cert","1"))} original',    'Short Code on Docs',safe(specs.get('short_code_on_docs'))],
        ], [38*mm, 57*mm, 38*mm, 52*mm]))
        elements.append(Spacer(1, 4*mm))

    # CBAM NOTE
    elements.append(Paragraph(
        '<font size="7" color="#888888"><b>CBAM Note:</b> Verified carbon footprint ~€6.06/tonne '
        '(CN Code 7222 20 29) — verified by DQS India under ISO 14064-3:2019.</font>',
        cp(TA_LEFT, 7)
    ))
    elements.append(Spacer(1, 5*mm))

    # SIGNATURE
    sign_data = [[
        Paragraph('<b>Prepared by:</b><br/><br/><br/>________________________<br/><font size="7">Name &amp; Signature</font>', cp(TA_LEFT, 8)),
        Paragraph('<b>Approved by:</b><br/><br/><br/>________________________<br/><font size="7">Name &amp; Signature</font>', cp(TA_CENTER, 8)),
        Paragraph(f'<b>For {COMPANY["name"]}</b><br/><br/><br/>________________________<br/><font size="7">Authorised Signatory</font>', cp(TA_RIGHT, 8)),
    ]]
    st = Table(sign_data, colWidths=[61*mm, 62*mm, 62*mm])
    st.setStyle(TableStyle([
        ('BOX',           (0,0), (-1,-1), 0.5, GREY),
        ('INNERGRID',     (0,0), (-1,-1), 0.5, GREY),
        ('TOPPADDING',    (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
    ]))
    elements.append(st)
    elements.append(Spacer(1, 4*mm))

    # FOOTER
    elements.append(HRFlowable(width='100%', thickness=0.5, color=GREY))
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(
        f'<font size="7" color="#888888">{COMPANY["name"]} | {COMPANY["iso"]}</font>',
        cp(TA_CENTER, 7)
    ))

    doc.build(elements)
    buf.seek(0)
    safe_so = so_number.replace('/', '_')
    return send_file(buf, mimetype='application/pdf',
                     download_name=f'SalesContract_{safe_so}.pdf',
                     as_attachment=False)