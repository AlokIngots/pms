import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = ''

const STATUS_COLORS = {
  'Pending':       { bg: '#FFF3E0', color: '#E65100', dot: '#FB8C00' },
  'In Production': { bg: '#E3F2FD', color: '#1565C0', dot: '#1976D2' },
  'Dispatched':    { bg: '#E8F5E9', color: '#2E7D32', dot: '#43A047' },
  'On Hold':       { bg: '#FCE4EC', color: '#C62828', dot: '#E53935' },
  'Confirmed':     { bg: '#F3E5F5', color: '#6A1B9A', dot: '#8E24AA' },
}

const EMPTY_LINE_EXPORT = {
  grade: '', size_mm: '', tolerance: 'h9', length_mm: 3000,
  length_tolerance: '-0/+100', ends_finish: 'Chamfered',
  finish: '', qty_tons: '', rate_per_ton: '', amount: 0,
  wooden_box: false, rm_max_n_mm2: '',
}

const EMPTY_LINE_LOCAL = {
  grade: '', size_mm: '', tolerance: '0.10mm (+/-)', length_mm: 3000,
  ends_finish: 'Chamfered', finish: '', qty_kg: '', rate_per_kg: '',
  discount_pct: 0, amount: 0,
}

const EMPTY_FORM = {
  so_number: '', so_date: '', po_number: '', po_date: '',
  supplier_no: '', order_type: 'Export', currency: 'EUR',
  customer: '', customer_short_code: '', contact_person: '',
  sale_made_through: '', delivery_address: '', consignee_address: '',
  kind_attention: '', delivery_instruction: '', payment_terms: '',
  inco_term: '', delivery_date: '', shipment_mode: '', bank_charges: '', notes: '',
  gstin: '', hsn_code: '7222/7221', do_number: '',
  cgst_pct: 9, sgst_pct: 9, igst_pct: 0, packing_forwarding: 0,
  line_items: [{ ...EMPTY_LINE_EXPORT }],
  quality_specs: {
    product_standard: 'EN 10088-3-2014', heat_treatment: '', tolerance_class: 'h9',
    packing_spec: 'LDPE+HDPE wrapped, strapping strips', ut_standard: 'DIN/EN 10228',
    ut_class_notes: '', surface_test: 'EN 102770-1 Class 3', mechanical_test: '100% UT/MPI',
    mtc_standard: 'EN 10204/3.1', radioactivity_free: true, sulphur_min: '',
    weight_tolerance_pct: 10, cbam_applicable: false, cbam_liability: 'Customer',
    cbam_data_provided: true, short_code_on_docs: '',
  }
}

function inp(err) {
  return { width:'100%', padding:'7px 10px', fontSize:12, border:`1px solid ${err?'#E53935':'#E0E0E0'}`, borderRadius:6, outline:'none', background:'#fff', boxSizing:'border-box', color:'#111' }
}
function btnPrimary(dis) {
  return { background:dis?'#ccc':'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', fontSize:12, fontWeight:600, cursor:dis?'not-allowed':'pointer' }
}
function btnSecondary() {
  return { background:'#fff', color:'#555', border:'1px solid #E0E0E0', borderRadius:6, padding:'8px 16px', fontSize:12, cursor:'pointer' }
}
function SectionLabel({ children }) {
  return <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#AAA', marginBottom:12, paddingBottom:6, borderBottom:'1px solid #F0F0F0' }}>{children}</div>
}
function Field({ label, children, error, hint }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'#666' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize:10, color:'#E53935' }}>{error}</span>}
      {hint  && <span style={{ fontSize:10, color:'#AAA' }}>{hint}</span>}
    </div>
  )
}

function NewSOModal({ onClose, onSave, customers, grades }) {
  const [tab, setTab] = useState(0)
  const [form, setForm] = useState({ ...EMPTY_FORM, line_items: [{ ...EMPTY_LINE_EXPORT }] })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const isLocal = form.order_type === 'Domestic'

  const setField = (k, v) => {
    if (k === 'order_type') {
      const emptyLine = v === 'Domestic' ? { ...EMPTY_LINE_LOCAL } : { ...EMPTY_LINE_EXPORT }
      setForm(f => ({ ...f, [k]: v, currency: v === 'Domestic' ? 'INR' : 'EUR', line_items: [emptyLine] }))
    } else {
      setForm(f => ({ ...f, [k]: v }))
    }
  }
  const setSpec = (k, v) => setForm(f => ({ ...f, quality_specs: { ...f.quality_specs, [k]: v } }))

  const setLine = (i, k, v) => setForm(f => {
    const items = [...f.line_items]
    items[i] = { ...items[i], [k]: v }
    if (isLocal) {
      const qty  = parseFloat(k === 'qty_kg' ? v : items[i].qty_kg) || 0
      const rate = parseFloat(k === 'rate_per_kg' ? v : items[i].rate_per_kg) || 0
      const disc = parseFloat(k === 'discount_pct' ? v : items[i].discount_pct) || 0
      items[i].amount = (qty * rate * (1 - disc/100)).toFixed(2)
    } else {
      if (k === 'qty_tons' || k === 'rate_per_ton') {
        const q = parseFloat(k === 'qty_tons' ? v : items[i].qty_tons) || 0
        const r = parseFloat(k === 'rate_per_ton' ? v : items[i].rate_per_ton) || 0
        items[i].amount = (q * r).toFixed(2)
      }
    }
    return { ...f, line_items: items }
  })

  const totalQty    = form.line_items.reduce((s,i) => s + (parseFloat(isLocal ? i.qty_kg : i.qty_tons)||0), 0)
  const totalAmount = form.line_items.reduce((s,i) => s + (parseFloat(i.amount)||0), 0)

  // GST calculation for local
  const cgst_amt = totalAmount * (parseFloat(form.cgst_pct)||0) / 100
  const sgst_amt = totalAmount * (parseFloat(form.sgst_pct)||0) / 100
  const igst_amt = totalAmount * (parseFloat(form.igst_pct)||0) / 100
  const pf_amt   = parseFloat(form.packing_forwarding) || 0
  const grandTotal = totalAmount + cgst_amt + sgst_amt + igst_amt + pf_amt

  const validate = () => {
    const e = {}
    if (!form.customer) e.customer = 'Required'
    if (!form.so_date)  e.so_date  = 'Required'
    if (!form.delivery_date) e.delivery_date = 'Required'
    form.line_items.forEach((li, i) => {
      if (!li.grade) e[`grade_${i}`] = 'Required'
      if (!li.size_mm) e[`size_${i}`] = 'Required'
      const qty = isLocal ? li.qty_kg : li.qty_tons
      if (!qty) e[`qty_${i}`] = 'Required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) { setTab(0); return }
    setSaving(true)
    try {
      // normalize line items
      const line_items = form.line_items.map((li, i) => ({
        ...li,
        sr_no: i + 1,
        qty_tons: isLocal ? (parseFloat(li.qty_kg)||0) / 1000 : parseFloat(li.qty_tons)||0,
        rate_per_ton: isLocal ? (parseFloat(li.rate_per_kg)||0) * 1000 : parseFloat(li.rate_per_ton)||0,
      }))
      const r = await fetch(`${API}/api/so`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, total_qty_tons: totalQty, total_amount_euro: totalAmount, line_items }),
      })
      const data = await r.json()
      if (data.success) onSave(data)
      else alert('Error: ' + (data.error || 'Unknown'))
    } catch (e) { alert('Failed: ' + e.message) }
    setSaving(false)
  }

  const TABS = isLocal ? ['Header', 'Line Items', 'GST & Tax', 'Quality Specs'] : ['Header', 'Line Items', 'Quality Specs']

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:920, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #F0F0F0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700 }}>New Sales Order
              <span style={{ marginLeft:10, fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4,
                background: isLocal ? '#EAF3DE' : '#E6F1FB',
                color: isLocal ? '#27500A' : '#0C447C' }}>
                {isLocal ? 'Local / Domestic' : 'Export'}
              </span>
            </div>
            <div style={{ fontSize:11, color:'#AAA', marginTop:2 }}>SO number auto-generated · Batch cards created on save</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:'#AAA', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:'flex', borderBottom:'1px solid #F0F0F0', padding:'0 24px' }}>
          {TABS.map((t,i) => (
            <button key={t} onClick={() => setTab(i)} style={{ padding:'10px 20px', fontSize:12, fontWeight:600, border:'none', background:'none', cursor:'pointer', borderBottom: tab===i ? '2px solid #E8642A' : '2px solid transparent', color: tab===i ? '#E8642A' : '#999' }}>{i+1}. {t}</button>
          ))}
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:24 }}>

          {/* ── TAB 0: HEADER ── */}
          {tab === 0 && (
            <div>
              <SectionLabel>Order Reference</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
                <Field label="SO Number" hint="Leave blank to auto-generate"><input value={form.so_number} onChange={e=>setField('so_number',e.target.value)} placeholder="Auto-generated" style={inp()} /></Field>
                <Field label="SO Date *" error={errors.so_date}><input type="date" value={form.so_date} onChange={e=>setField('so_date',e.target.value)} style={inp(errors.so_date)} /></Field>
                <Field label="Order Type">
                  <select value={form.order_type} onChange={e=>setField('order_type',e.target.value)} style={inp()}>
                    <option>Export</option>
                    <option>Domestic</option>
                  </select>
                </Field>
                <Field label="PO Number"><input value={form.po_number} onChange={e=>setField('po_number',e.target.value)} style={inp()} /></Field>
                <Field label="PO Date"><input type="date" value={form.po_date} onChange={e=>setField('po_date',e.target.value)} style={inp()} /></Field>
                {isLocal
                  ? <Field label="D.O Number"><input value={form.do_number} onChange={e=>setField('do_number',e.target.value)} style={inp()} /></Field>
                  : <Field label="Supplier No."><input value={form.supplier_no} onChange={e=>setField('supplier_no',e.target.value)} style={inp()} /></Field>
                }
              </div>

              <SectionLabel>Customer</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                <Field label="Customer *" error={errors.customer}>
                  <select value={form.customer} onChange={e=>{ const c=customers.find(x=>x.customer_name===e.target.value); setField('customer',e.target.value); if(c){setForm(f=>({...f,customer_short_code:c.short_code||'',payment_terms:c.payment_terms||f.payment_terms,inco_term:c.incoterm||f.inco_term,gstin:c.gstin||f.gstin||''}))} }} style={inp(errors.customer)}>
                    <option value="">Select customer</option>
                    {customers.map(c=><option key={c.id}>{c.customer_name}</option>)}
                  </select>
                </Field>
                <Field label="Short Code"><input value={form.customer_short_code} onChange={e=>setField('customer_short_code',e.target.value)} style={inp()} /></Field>
                <Field label="Contact Person"><input value={form.contact_person} onChange={e=>setField('contact_person',e.target.value)} style={inp()} /></Field>
                <Field label="Sale Made Through"><input value={form.sale_made_through} onChange={e=>setField('sale_made_through',e.target.value)} style={inp()} /></Field>
                <Field label="Delivery Address"><textarea value={form.delivery_address} onChange={e=>setField('delivery_address',e.target.value)} rows={2} style={{...inp(),resize:'none'}} /></Field>
                {isLocal
                  ? <Field label="Customer GST No"><input value={form.gstin} onChange={e=>setField('gstin',e.target.value)} placeholder="27XXXXXX" style={inp()} /></Field>
                  : <Field label="Consignee Address"><textarea value={form.consignee_address} onChange={e=>setField('consignee_address',e.target.value)} rows={2} style={{...inp(),resize:'none'}} /></Field>
                }
              </div>

              <SectionLabel>Delivery & Payment</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <Field label="Delivery Date *" error={errors.delivery_date}><input type="date" value={form.delivery_date} onChange={e=>setField('delivery_date',e.target.value)} style={inp(errors.delivery_date)} /></Field>
                <Field label="Delivery Instruction"><input value={form.delivery_instruction} onChange={e=>setField('delivery_instruction',e.target.value)} style={inp()} /></Field>
                {isLocal
                  ? <Field label="HSN Code"><input value={form.hsn_code} onChange={e=>setField('hsn_code',e.target.value)} placeholder="7222/7221" style={inp()} /></Field>
                  : <Field label="Shipment Mode"><input value={form.shipment_mode} onChange={e=>setField('shipment_mode',e.target.value)} style={inp()} /></Field>
                }
                <Field label="Payment Terms"><input value={form.payment_terms} onChange={e=>setField('payment_terms',e.target.value)} style={inp()} /></Field>
                {isLocal
                  ? <Field label="Kind Attention"><input value={form.kind_attention} onChange={e=>setField('kind_attention',e.target.value)} style={inp()} /></Field>
                  : <Field label="Inco Term"><input value={form.inco_term} onChange={e=>setField('inco_term',e.target.value)} style={inp()} /></Field>
                }
                <Field label="Currency">
                  <select value={form.currency} onChange={e=>setField('currency',e.target.value)} style={inp()}>
                    <option>EUR</option><option>USD</option><option>INR</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* ── TAB 1: LINE ITEMS ── */}
          {tab === 1 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <SectionLabel>Line Items {isLocal ? '— Qty in KG, Rate in INR/KG' : '— Qty in Tons, Rate in EUR/Ton'}</SectionLabel>
                <button onClick={()=>setForm(f=>({...f,line_items:[...f.line_items,isLocal?{...EMPTY_LINE_LOCAL}:{...EMPTY_LINE_EXPORT}]}))} style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Add Row</button>
              </div>
              {form.line_items.map((item,i)=>(
                <div key={i} style={{ background:'#FAFAFA', border:'1px solid #EEE', borderRadius:8, padding:16, marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#E8642A', marginBottom:10, textTransform:'uppercase' }}>Line {i+1}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                    <Field label="Grade *" error={errors[`grade_${i}`]}>
                      <select value={item.grade} onChange={e=>setLine(i,'grade',e.target.value)} style={inp(errors[`grade_${i}`])}>
                        <option value="">Select</option>
                        {grades.map(g=><option key={g.id}>{g.grade_code}</option>)}
                        {['304','304L','316','316L','316Ti','321','410','420','420C','431','440C','630','2205'].map(g=><option key={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Size (mm) *" error={errors[`size_${i}`]}><input type="number" value={item.size_mm} onChange={e=>setLine(i,'size_mm',e.target.value)} style={inp(errors[`size_${i}`])} /></Field>
                    <Field label="Tolerance"><input value={item.tolerance} onChange={e=>setLine(i,'tolerance',e.target.value)} style={inp()} /></Field>
                    <Field label="Length (mm)"><input type="number" value={item.length_mm} onChange={e=>setLine(i,'length_mm',e.target.value)} style={inp()} /></Field>

                    {isLocal ? (
                      <>
                        <Field label="Qty (KG) *" error={errors[`qty_${i}`]}><input type="number" value={item.qty_kg} onChange={e=>setLine(i,'qty_kg',e.target.value)} style={inp(errors[`qty_${i}`])} /></Field>
                        <Field label="Rate (INR/KG)"><input type="number" value={item.rate_per_kg} onChange={e=>setLine(i,'rate_per_kg',e.target.value)} style={inp()} /></Field>
                        <Field label="Discount %"><input type="number" value={item.discount_pct} onChange={e=>setLine(i,'discount_pct',e.target.value)} placeholder="0" style={inp()} /></Field>
                        <Field label="Amount (INR)"><input value={Number(item.amount||0).toLocaleString()} readOnly style={{...inp(),background:'#F5F5F5',color:'#E8642A',fontWeight:600}} /></Field>
                      </>
                    ) : (
                      <>
                        <Field label="Qty (tons) *" error={errors[`qty_${i}`]}><input type="number" value={item.qty_tons} onChange={e=>setLine(i,'qty_tons',e.target.value)} style={inp(errors[`qty_${i}`])} /></Field>
                        <Field label={`Rate (${form.currency}/ton)`}><input type="number" value={item.rate_per_ton} onChange={e=>setLine(i,'rate_per_ton',e.target.value)} style={inp()} /></Field>
                        <Field label={`Amount (${form.currency})`}><input value={Number(item.amount||0).toLocaleString()} readOnly style={{...inp(),background:'#F5F5F5',color:'#E8642A',fontWeight:600}} /></Field>
                        <Field label="Ends Finish"><select value={item.ends_finish} onChange={e=>setLine(i,'ends_finish',e.target.value)} style={inp()}><option>Chamfered</option><option>Plain</option><option>Faced</option></select></Field>
                      </>
                    )}
                  </div>
                  {isLocal && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <Field label="Condition"><input value={item.finish||''} onChange={e=>setLine(i,'finish',e.target.value)} placeholder="e.g. Annealed, Peeled and Polish Bar" style={inp()} /></Field>
                      <Field label="Ends Finish"><select value={item.ends_finish} onChange={e=>setLine(i,'ends_finish',e.target.value)} style={inp()}><option>Chamfered</option><option>Plain</option><option>Faced</option></select></Field>
                    </div>
                  )}
                  {form.line_items.length > 1 && <button onClick={()=>setForm(f=>({...f,line_items:f.line_items.filter((_,j)=>j!==i)}))} style={{ background:'#FEE2E2',color:'#E53935',border:'none',borderRadius:4,padding:'3px 10px',fontSize:11,cursor:'pointer',marginTop:8 }}>Remove</button>}
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:24, padding:'12px 0', borderTop:'1px solid #F0F0F0' }}>
                <span style={{ fontSize:12, color:'#888' }}>Total: <strong style={{ color:'#111' }}>{totalQty.toFixed(isLocal?0:3)} {isLocal?'KG':'tons'}</strong></span>
                <span style={{ fontSize:12, color:'#888' }}>Sub Total: <strong style={{ color:'#E8642A', fontSize:14 }}>{form.currency} {totalAmount.toLocaleString()}</strong></span>
                {isLocal && <span style={{ fontSize:12, color:'#888' }}>Grand Total: <strong style={{ color:'#2E7D32', fontSize:14 }}>INR {grandTotal.toLocaleString()}</strong></span>}
              </div>
            </div>
          )}

          {/* ── TAB 2: GST & TAX (local only) ── */}
          {tab === 2 && isLocal && (
            <div>
              <SectionLabel>GST & Tax Details</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:20 }}>
                <Field label="CGST %"><input type="number" value={form.cgst_pct} onChange={e=>setField('cgst_pct',e.target.value)} placeholder="9" style={inp()} /></Field>
                <Field label="SGST %"><input type="number" value={form.sgst_pct} onChange={e=>setField('sgst_pct',e.target.value)} placeholder="9" style={inp()} /></Field>
                <Field label="IGST %"><input type="number" value={form.igst_pct} onChange={e=>setField('igst_pct',e.target.value)} placeholder="0" style={inp()} /></Field>
                <Field label="Packing & Forwarding (INR)"><input type="number" value={form.packing_forwarding} onChange={e=>setField('packing_forwarding',e.target.value)} placeholder="0" style={inp()} /></Field>
              </div>

              <SectionLabel>Tax Summary</SectionLabel>
              <div style={{ background:'#FAFAFA', border:'1px solid #EEE', borderRadius:8, padding:16 }}>
                {[
                  ['Sub Total', totalAmount],
                  [`CGST ${form.cgst_pct}%`, cgst_amt],
                  [`SGST ${form.sgst_pct}%`, sgst_amt],
                  ...(parseFloat(form.igst_pct) > 0 ? [[`IGST ${form.igst_pct}%`, igst_amt]] : []),
                  ...(pf_amt > 0 ? [['Packing & Forwarding', pf_amt]] : []),
                ].map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #EEE', fontSize:12 }}>
                    <span style={{ color:'#666' }}>{label}</span>
                    <span style={{ fontWeight:600 }}>INR {val.toLocaleString('en-IN', {maximumFractionDigits:2})}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', fontSize:14, fontWeight:700 }}>
                  <span>Grand Total</span>
                  <span style={{ color:'#E8642A' }}>INR {grandTotal.toLocaleString('en-IN', {maximumFractionDigits:2})}</span>
                </div>
              </div>

              <SectionLabel style={{ marginTop:20 }}>Company GST Details (for PDF)</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Field label="HSN Code"><input value={form.hsn_code} onChange={e=>setField('hsn_code',e.target.value)} style={inp()} /></Field>
                <Field label="Customer GST No"><input value={form.gstin} onChange={e=>setField('gstin',e.target.value)} style={inp()} /></Field>
              </div>
            </div>
          )}

          {/* ── QUALITY SPECS TAB ── */}
          {((isLocal && tab === 3) || (!isLocal && tab === 2)) && (
            <div>
              <SectionLabel>Technical Specifications</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                <Field label="Product Standard"><input value={form.quality_specs.product_standard} onChange={e=>setSpec('product_standard',e.target.value)} style={inp()} /></Field>
                <Field label="Heat Treatment"><input value={form.quality_specs.heat_treatment} onChange={e=>setSpec('heat_treatment',e.target.value)} style={inp()} /></Field>
                <Field label="MTC Standard"><select value={form.quality_specs.mtc_standard} onChange={e=>setSpec('mtc_standard',e.target.value)} style={inp()}><option>EN 10204/3.1</option><option>EN 10204/3.2</option><option>EN 10204/2.2</option></select></Field>
                <Field label="UT Standard"><input value={form.quality_specs.ut_standard} onChange={e=>setSpec('ut_standard',e.target.value)} style={inp()} /></Field>
                <Field label="Surface Test"><input value={form.quality_specs.surface_test} onChange={e=>setSpec('surface_test',e.target.value)} style={inp()} /></Field>
                <Field label="Mechanical Test"><input value={form.quality_specs.mechanical_test} onChange={e=>setSpec('mechanical_test',e.target.value)} style={inp()} /></Field>
              </div>
              <Field label="Packing Specification"><textarea value={form.quality_specs.packing_spec} onChange={e=>setSpec('packing_spec',e.target.value)} rows={2} style={{...inp(),resize:'none',width:'100%'}} /></Field>
              {!isLocal && (
                <div style={{ display:'flex', gap:24, flexWrap:'wrap', marginTop:14 }}>
                  {[['radioactivity_free','Radioactivity Free'],['cbam_applicable','CBAM Applicable'],['cbam_data_provided','CBAM Data Provided']].map(([k,label])=>(
                    <label key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                      <input type="checkbox" checked={!!form.quality_specs[k]} onChange={e=>setSpec(k,e.target.checked)} /> {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ padding:'12px 24px', borderTop:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between' }}>
          <div>{tab > 0 && <button onClick={()=>setTab(t=>t-1)} style={btnSecondary()}>← Back</button>}</div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={btnSecondary()}>Cancel</button>
            {tab < TABS.length - 1
              ? <button onClick={()=>setTab(t=>t+1)} style={btnPrimary()}>Next →</button>
              : <button onClick={handleSave} disabled={saving} style={btnPrimary(saving)}>{saving?'Saving...':'✓ Save & Create Batches'}</button>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SalesOrders() {
  const navigate = useNavigate()
  const [orders, setOrders]             = useState([])
  const [customers, setCustomers]       = useState([])
  const [grades, setGrades]             = useState([])
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [loading, setLoading]           = useState(true)
  const [deptTab, setDeptTab]           = useState('export')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [r1,r2,r3] = await Promise.all([fetch(`${API}/api/so`),fetch(`${API}/api/customers`),fetch(`${API}/api/grades`)])
      const [d1,d2,d3] = await Promise.all([r1.json(),r2.json(),r3.json()])
      setOrders(d1||[]); setCustomers(d2||[]); setGrades(d3||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }

  const isLocal = deptTab === 'local'
  const deptFiltered = orders.filter(o => isLocal ? (o.order_type||'').toLowerCase()==='domestic' : (o.order_type||'').toLowerCase()!=='domestic')
  const filtered = deptFiltered.filter(o => {
    const ms = !search || o.so_number?.toLowerCase().includes(search.toLowerCase()) || o.customer?.toLowerCase().includes(search.toLowerCase())
    const mf = !statusFilter || o.status === statusFilter
    return ms && mf
  })

  const counts = {
    total: deptFiltered.length,
    inProd: deptFiltered.filter(o=>o.status==='In Production').length,
    dispatched: deptFiltered.filter(o=>o.status==='Dispatched').length,
    pending: deptFiltered.filter(o=>['Pending','Confirmed'].includes(o.status)).length,
  }

  async function handleSave(data) { setShowModal(false); await loadAll(); alert('✅ ' + data.message) }

  return (
    <div style={{ padding:'24px 28px', background:'#F7F8FA', minHeight:'100vh', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#111', margin:0 }}>Sales Orders</h1>
          <p style={{ fontSize:12, color:'#AAA', margin:'3px 0 0' }}>{orders.length} orders · Batch cards auto-created on save</p>
        </div>
        <button onClick={()=>setShowModal(true)} style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }}>+ New Sales Order</button>
      </div>

      <div style={{ display:'flex', gap:0, marginBottom:20, background:'#fff', border:'1px solid #E5E5E5', borderRadius:8, padding:4, width:'fit-content' }}>
        {[{key:'export',label:'Export',desc:'Qty in Tons',color:'#185FA5'},{key:'local',label:'Local / Domestic',desc:'Qty in KG',color:'#2E7D32'}].map(t=>(
          <button key={t.key} onClick={()=>{setDeptTab(t.key);setSearch('');setStatusFilter('')}} style={{ padding:'8px 22px', border:'none', borderRadius:6, cursor:'pointer', background:deptTab===t.key?t.color:'transparent', color:deptTab===t.key?'#fff':'#777', transition:'all 0.15s' }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{t.label}</div>
            <div style={{ fontSize:10, opacity:0.8 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        {[
          {label:'Total Orders', value:counts.total, color:isLocal?'#2E7D32':'#185FA5'},
          {label:'In Production', value:counts.inProd, color:'#FB8C00'},
          {label:'Dispatched', value:counts.dispatched, color:'#43A047'},
          {label:'Pending', value:counts.pending, color:'#E53935'},
        ].map(k=>(
          <div key={k.label} style={{ background:'#fff', borderRadius:10, padding:'16px 20px', borderTop:`3px solid ${k.color}`, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.8px', color:'#AAA', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'0 14px', height:36, background:'#fff', border:'1px solid #E5E5E5', borderRadius:8, flex:1, maxWidth:400 }}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/><path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search SO number or customer..." style={{ border:'none', outline:'none', fontSize:12, flex:1, background:'transparent' }} />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value==='All statuses'?'':e.target.value)} style={{ height:36, fontSize:12, padding:'0 12px', border:'1px solid #E5E5E5', borderRadius:8, background:'#fff', color:'#555' }}>
          {['All statuses','Pending','Confirmed','In Production','Dispatched','On Hold'].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>

      <div style={{ background:'#fff', borderRadius:10, boxShadow:'0 1px 3px rgba(0,0,0,0.06)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#FAFAFA', borderBottom:'2px solid #F0F0F0' }}>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>SO Number</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>Customer</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>{isLocal ? 'Qty (KG)' : 'Qty (T)'}</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>{isLocal ? 'GST No' : 'Inco Term'}</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>Delivery</th>
              <th style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>Status</th>
              <th style={{ padding:'12px 16px', textAlign:'right', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:48, color:'#AAA', fontSize:13 }}>Loading orders...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:48, color:'#AAA', fontSize:13 }}>No orders found</td></tr>
            ) : filtered.map(order => {
              const sc = STATUS_COLORS[order.status] || STATUS_COLORS['Pending']
              const qty = order.line_items ? order.line_items.reduce((s,i)=>s+Number(i.qty_tons||0),0) : 0
              const qtyDisplay = isLocal ? (qty * 1000).toFixed(0) + ' KG' : qty.toFixed(3) + ' T'
              return (
                <tr key={order.id} style={{ borderBottom:'1px solid #F5F5F5', transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'}
                  onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ fontWeight:600, color:'#E8642A', fontFamily:'monospace', fontSize:12 }}>{order.so_number}</div>
                    <div style={{ fontSize:11, color:'#AAA', marginTop:2 }}>PO: {order.po_number||'—'}</div>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ fontWeight:600, color:'#111' }}>{order.customer}</div>
                    <div style={{ fontSize:11, color:'#AAA', marginTop:1 }}>{order.contact_person||''}</div>
                  </td>
                  <td style={{ padding:'14px 16px', fontWeight:600, color:'#333' }}>{qtyDisplay}</td>
                  <td style={{ padding:'14px 16px', color:'#555' }}>{isLocal ? (order.gstin||'—') : (order.inco_term||'—')}</td>
                  <td style={{ padding:'14px 16px', color:'#555' }}>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : '—'}</td>
                  <td style={{ padding:'14px 16px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:20, background:sc.bg, color:sc.color }}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:sc.dot, display:'inline-block' }}></span>
                      {order.status}
                    </span>
                  </td>
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', gap:6, justifyContent:'flex-end', alignItems:'center' }}>
                      <button
                        onClick={()=>navigate(`/orders/${encodeURIComponent(order.so_number)}`)}
                        style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>
                        Edit SO
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && <NewSOModal onClose={()=>setShowModal(false)} onSave={handleSave} customers={customers} grades={grades} />}
    </div>
  )
}