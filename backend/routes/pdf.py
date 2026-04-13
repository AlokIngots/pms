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
# #@pdf_bp.route('/api/pdf/batch-card/<int:bid>', methods=['GET'])
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

    cert_no  = f'MTC-{batch.get("batch_card_no","")}-{datetime.now().strftime("%Y%m%d")}'
    ref_data = [
        ['Certificate No.',  cert_no,                           'Date',      datetime.now().strftime('%d/%m/%Y')],
        ['Batch Card No.',   str(batch.get('batch_card_no','')), 'Heat No.',  str(batch.get('heat_no',''))],
        ['Customer',         str(batch.get('customer','')),      'DO No.',    str(card.get('customer_do_no',''))],
        ['Item No.',         str(card.get('item_no','')),        'DO Year',   str(card.get('do_year',''))],
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

    elements.append(Paragraph('<b><font size="9" color="#185FA5">1. PRODUCT DESCRIPTION</font></b>', styles['Normal']))
    elements.append(Spacer(1, 2*mm))
    prod_data = [
        ['Product',            'Stainless Steel Round Bright Bar', 'Standard',       'EN 10088-3 / EN 10060'],
        ['Steel Grade',        str(batch.get('grade_code','')),    'Size (mm)',       str(batch.get('size_mm',''))],
        ['Finish Size & Tol.', str(card.get('finish_size_tol','')), 'Length (mm)',    str(card.get('length_mm',''))],
        ['No. of Pieces',      str(batch.get('no_of_pcs','')),     'Net Weight (kg)', str(batch.get('weight_kg',''))],
        ['Surface Condition',  str(batch.get('bb_process','')),    'HT Condition',    str(batch.get('ht_process',''))],
        ['Colour Code',        str(batch.get('colour_code','')),   'Bundle Wt (kg)',  str(card.get('bundle_weight_kg',''))],
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
    elements.append(Spacer(1, 6*mm))

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

