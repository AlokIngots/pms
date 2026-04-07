import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000'

const STATUS_STYLE = {
  'Pending':       { bg: '#FFF3E0', color: '#E65100' },
  'In Production': { bg: '#E3F2FD', color: '#1565C0' },
  'Dispatched':    { bg: '#E8F5E9', color: '#2E7D32' },
  'On Hold':       { bg: '#FCE4EC', color: '#C62828' },
  'Confirmed':     { bg: '#F3E5F5', color: '#6A1B9A' },
}

const EMPTY_LINE = {
  grade: '', size_mm: '', tolerance: 'h9', length_mm: 3000,
  length_tolerance: '-0/+100', ends_finish: 'Chamfered',
  finish: '', qty_tons: '', rate_per_ton: '', amount: 0,
  wooden_box: false, rm_max_n_mm2: '',
}

const EMPTY_FORM = {
  so_number: '', so_date: '', po_number: '', po_date: '',
  supplier_no: '', order_type: 'Export', currency: 'EUR',
  customer: '', customer_short_code: '', contact_person: '',
  sale_made_through: '', delivery_address: '', consignee_address: '',
  kind_attention: '', delivery_instruction: '', payment_terms: '',
  inco_term: '', delivery_date: '', shipment_mode: '', bank_charges: '', notes: '',
  line_items: [{ ...EMPTY_LINE }],
  quality_specs: {
    product_standard: 'EN 10088-3-2014',
    heat_treatment: '',
    tolerance_class: 'h9',
    packing_spec: 'LDPE+HDPE wrapped, strapping strips',
    ut_standard: 'DIN/EN 10228',
    ut_class_notes: '',
    surface_test: 'EN 102770-1 Class 3',
    mechanical_test: '100% UT/MPI',
    mtc_standard: 'EN 10204/3.1',
    radioactivity_free: true,
    sulphur_min: '',
    weight_tolerance_pct: 10,
    cbam_applicable: false,
    cbam_liability: 'Customer',
    cbam_data_provided: true,
    short_code_on_docs: '',
  }
}

function NewSOModal({ onClose, onSave, customers, grades }) {
  const [tab, setTab]   = useState(0)
  const [form, setForm] = useState({ ...EMPTY_FORM, line_items: [{ ...EMPTY_LINE }] })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setSpec  = (k, v) => setForm(f => ({ ...f, quality_specs: { ...f.quality_specs, [k]: v } }))

  const setLine = (i, k, v) => {
    setForm(f => {
      const items = [...f.line_items]
      items[i] = { ...items[i], [k]: v }
      if (k === 'qty_tons' || k === 'rate_per_ton') {
        const qty  = parseFloat(k === 'qty_tons'    ? v : items[i].qty_tons)    || 0
        const rate = parseFloat(k === 'rate_per_ton' ? v : items[i].rate_per_ton) || 0
        items[i].amount = (qty * rate).toFixed(2)
      }
      return { ...f, line_items: items }
    })
  }

  const addLine    = () => setForm(f => ({ ...f, line_items: [...f.line_items, { ...EMPTY_LINE }] }))
  const removeLine = i  => setForm(f => ({ ...f, line_items: f.line_items.filter((_, j) => j !== i) }))

  const totalQty    = form.line_items.reduce((s, i) => s + (parseFloat(i.qty_tons)    || 0), 0)
  const totalAmount = form.line_items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)

  const validate = () => {
    const e = {}
    if (!form.customer)       e.customer      = 'Required'
    if (!form.so_date)        e.so_date       = 'Required'
    if (!form.delivery_date)  e.delivery_date = 'Required'
    if (form.line_items.length === 0) e.lines = 'Add at least one line item'
    form.line_items.forEach((li, i) => {
      if (!li.grade)    e[`grade_${i}`] = 'Required'
      if (!li.size_mm)  e[`size_${i}`]  = 'Required'
      if (!li.qty_tons) e[`qty_${i}`]   = 'Required'
    })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) { setTab(0); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        total_qty_tons:    totalQty,
        total_amount_euro: totalAmount,
        line_items: form.line_items.map((li, i) => ({ ...li, sr_no: i + 1 })),
      }
      const r = await fetch(`${API}/api/so`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json()
      if (data.success) { onSave(data) }
      else { alert('Error: ' + (data.error || 'Unknown error')) }
    } catch (e) {
      alert('Failed to save: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const TABS = ['Header', 'Line Items', 'Quality Specs']

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:900, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding:'16px 24px', borderBottom:'1px solid #F0F0F0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:700, color:'#111' }}>New Sales Order</div>
            <div style={{ fontSize:11, color:'#AAA', marginTop:2 }}>SO number will be auto-generated • Batch cards created automatically</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#AAA' }}>×</button>
        </div>
        <div style={{ display:'flex', borderBottom:'1px solid #F0F0F0', padding:'0 24px' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} style={{ padding:'10px 18px', fontSize:12, fontWeight:600, border:'none', background:'none', cursor:'pointer', borderBottom: tab===i ? '2px solid #E8642A' : '2px solid transparent', color: tab===i ? '#E8642A' : '#888' }}>{i+1}. {t}</button>
          ))}
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:24 }}>

          {tab === 0 && (
            <div>
              <SectionLabel>A — Order Reference</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                <Field label="SO Number" hint="Leave blank to auto-generate"><input value={form.so_number} onChange={e => setField('so_number', e.target.value)} placeholder="Auto-generated" style={inp()} /></Field>
                <Field label="SO Date *" error={errors.so_date}><input type="date" value={form.so_date} onChange={e => setField('so_date', e.target.value)} style={inp(errors.so_date)} /></Field>
                <Field label="Order Type"><select value={form.order_type} onChange={e => setField('order_type', e.target.value)} style={inp()}><option>Export</option><option>Domestic</option></select></Field>
                <Field label="PO Number"><input value={form.po_number} onChange={e => setField('po_number', e.target.value)} placeholder="29826852" style={inp()} /></Field>
                <Field label="PO Date"><input type="date" value={form.po_date} onChange={e => setField('po_date', e.target.value)} style={inp()} /></Field>
                <Field label="Supplier No."><input value={form.supplier_no} onChange={e => setField('supplier_no', e.target.value)} placeholder="70298" style={inp()} /></Field>
              </div>
              <SectionLabel>B — Customer</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
                <Field label="Customer *" error={errors.customer}>
                  <select value={form.customer} onChange={e => { const c = customers.find(x => x.customer_name === e.target.value); setField('customer', e.target.value); if (c) { setField('customer_short_code', c.short_code||''); setField('payment_terms', c.payment_terms||form.payment_terms); setField('inco_term', c.incoterm||form.inco_term) } }} style={inp(errors.customer)}>
                    <option value="">Select customer</option>
                    {customers.map(c => <option key={c.id}>{c.customer_name}</option>)}
                  </select>
                </Field>
                <Field label="Short Code"><input value={form.customer_short_code} onChange={e => setField('customer_short_code', e.target.value)} placeholder="W.G 01" style={inp()} /></Field>
                <Field label="Contact Person"><input value={form.contact_person} onChange={e => setField('contact_person', e.target.value)} placeholder="Mr. Werner Grimm" style={inp()} /></Field>
                <Field label="Sale Made Through"><input value={form.sale_made_through} onChange={e => setField('sale_made_through', e.target.value)} placeholder="Mr. Maikel Wammes" style={inp()} /></Field>
                <Field label="Delivery Address"><textarea value={form.delivery_address} onChange={e => setField('delivery_address', e.target.value)} rows={2} style={{ ...inp(), resize:'none' }} /></Field>
                <Field label="Consignee Address"><textarea value={form.consignee_address} onChange={e => setField('consignee_address', e.target.value)} rows={2} style={{ ...inp(), resize:'none' }} /></Field>
              </div>
              <SectionLabel>C — Delivery & Payment</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                <Field label="Delivery Date *" error={errors.delivery_date}><input type="date" value={form.delivery_date} onChange={e => setField('delivery_date', e.target.value)} style={inp(errors.delivery_date)} /></Field>
                <Field label="Delivery Instruction"><input value={form.delivery_instruction} onChange={e => setField('delivery_instruction', e.target.value)} placeholder="Ex Works Mid November 2025" style={inp()} /></Field>
                <Field label="Shipment Mode"><input value={form.shipment_mode} onChange={e => setField('shipment_mode', e.target.value)} placeholder="In 20GP Box container" style={inp()} /></Field>
                <Field label="Payment Terms"><input value={form.payment_terms} onChange={e => setField('payment_terms', e.target.value)} placeholder="Payment against BL" style={inp()} /></Field>
                <Field label="Inco Term"><input value={form.inco_term} onChange={e => setField('inco_term', e.target.value)} placeholder="CIF Antwerpen" style={inp()} /></Field>
                <Field label="Currency"><select value={form.currency} onChange={e => setField('currency', e.target.value)} style={inp()}><option>EUR</option><option>USD</option><option>INR</option></select></Field>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <SectionLabel style={{ marginBottom:0 }}>Line Items — one row per grade/size</SectionLabel>
                <button onClick={addLine} style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>+ Add Row</button>
              </div>
              {errors.lines && <div style={{ color:'#E53935', fontSize:11, marginBottom:8 }}>{errors.lines}</div>}
              {form.line_items.map((item, i) => (
                <div key={i} style={{ background:'#FAFAFA', border:'1px solid #EEEEEE', borderRadius:8, padding:16, marginBottom:12 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:'#E8642A', marginBottom:10, textTransform:'uppercase' }}>Line {i+1}</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:10 }}>
                    <Field label="Grade *" error={errors[`grade_${i}`]}>
                      <select value={item.grade} onChange={e => setLine(i,'grade',e.target.value)} style={inp(errors[`grade_${i}`])}>
                        <option value="">Select grade</option>
                        {grades.map(g => <option key={g.id}>{g.grade_code}</option>)}
                        <option>304</option><option>304L</option><option>316</option><option>316L</option><option>316Ti</option><option>321</option><option>410</option><option>420</option><option>431</option><option>440C</option><option>630</option><option>2205</option>
                      </select>
                    </Field>
                    <Field label="Size (mm) *" error={errors[`size_${i}`]}><input type="number" value={item.size_mm} onChange={e => setLine(i,'size_mm',e.target.value)} placeholder="25.00" style={inp(errors[`size_${i}`])} /></Field>
                    <Field label="Tolerance"><select value={item.tolerance} onChange={e => setLine(i,'tolerance',e.target.value)} style={inp()}><option>h9</option><option>h10</option><option>h11</option><option>k12</option><option>h6</option><option>f7</option></select></Field>
                    <Field label="Finish"><input value={item.finish} onChange={e => setLine(i,'finish',e.target.value)} placeholder="Drawn, Ground, Polished" style={inp()} /></Field>
                    <Field label="Length (mm)"><input type="number" value={item.length_mm} onChange={e => setLine(i,'length_mm',e.target.value)} style={inp()} /></Field>
                    <Field label="Length Tolerance"><input value={item.length_tolerance} onChange={e => setLine(i,'length_tolerance',e.target.value)} style={inp()} /></Field>
                    <Field label="Ends Finish"><select value={item.ends_finish} onChange={e => setLine(i,'ends_finish',e.target.value)} style={inp()}><option>Chamfered</option><option>Plain</option><option>Faced</option></select></Field>
                    <Field label="RM Max N/mm²"><input type="number" value={item.rm_max_n_mm2} onChange={e => setLine(i,'rm_max_n_mm2',e.target.value)} placeholder="900" style={inp()} /></Field>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, alignItems:'end' }}>
                    <Field label="Qty (tons) *" error={errors[`qty_${i}`]}><input type="number" value={item.qty_tons} onChange={e => setLine(i,'qty_tons',e.target.value)} placeholder="3.000" style={inp(errors[`qty_${i}`])} /></Field>
                    <Field label={`Rate (${form.currency}/ton)`}><input type="number" value={item.rate_per_ton} onChange={e => setLine(i,'rate_per_ton',e.target.value)} placeholder="1400" style={inp()} /></Field>
                    <Field label={`Amount (${form.currency})`}><input value={Number(item.amount||0).toLocaleString()} readOnly style={{ ...inp(), background:'#F5F5F5', color:'#E8642A', fontWeight:600 }} /></Field>
                    <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:2 }}>
                      <label style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'#666', cursor:'pointer' }}>
                        <input type="checkbox" checked={item.wooden_box} onChange={e => setLine(i,'wooden_box',e.target.checked)} /> Wooden box
                      </label>
                      {form.line_items.length > 1 && (
                        <button onClick={() => removeLine(i)} style={{ background:'#FEE2E2', color:'#E53935', border:'none', borderRadius:4, padding:'4px 10px', fontSize:11, cursor:'pointer', marginLeft:'auto' }}>Remove</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'flex-end', gap:24, padding:'12px 0', borderTop:'1px solid #F0F0F0', marginTop:4 }}>
                <span style={{ fontSize:12, color:'#888' }}>Total qty: <strong style={{ color:'#111' }}>{totalQty.toFixed(3)} tons</strong></span>
                <span style={{ fontSize:12, color:'#888' }}>Total amount: <strong style={{ color:'#E8642A', fontSize:14 }}>{form.currency} {totalAmount.toLocaleString()}</strong></span>
              </div>
            </div>
          )}

          {tab === 2 && (
            <div>
              <SectionLabel>Technical Specifications</SectionLabel>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:16 }}>
                <Field label="Product Standard"><input value={form.quality_specs.product_standard} onChange={e => setSpec('product_standard',e.target.value)} style={inp()} /></Field>
                <Field label="Heat Treatment"><input value={form.quality_specs.heat_treatment} onChange={e => setSpec('heat_treatment',e.target.value)} placeholder="Drawn, Peeled, Ground, Polished" style={inp()} /></Field>
                <Field label="MTC Standard"><select value={form.quality_specs.mtc_standard} onChange={e => setSpec('mtc_standard',e.target.value)} style={inp()}><option>EN 10204/3.1</option><option>EN 10204/3.2</option><option>EN 10204/2.2</option></select></Field>
                <Field label="UT Standard"><input value={form.quality_specs.ut_standard} onChange={e => setSpec('ut_standard',e.target.value)} placeholder="DIN/EN 10228" style={inp()} /></Field>
                <Field label="Surface Test"><input value={form.quality_specs.surface_test} onChange={e => setSpec('surface_test',e.target.value)} style={inp()} /></Field>
                <Field label="Mechanical Test"><input value={form.quality_specs.mechanical_test} onChange={e => setSpec('mechanical_test',e.target.value)} style={inp()} /></Field>
                <Field label="Sulphur Min"><input type="number" value={form.quality_specs.sulphur_min} onChange={e => setSpec('sulphur_min',e.target.value)} placeholder="0.022" style={inp()} /></Field>
                <Field label="Weight Tolerance %"><input type="number" value={form.quality_specs.weight_tolerance_pct} onChange={e => setSpec('weight_tolerance_pct',e.target.value)} style={inp()} /></Field>
                <Field label="Short Code on Docs"><input value={form.quality_specs.short_code_on_docs} onChange={e => setSpec('short_code_on_docs',e.target.value)} placeholder="W.G 01" style={inp()} /></Field>
              </div>
              <Field label="Packing Specification"><textarea value={form.quality_specs.packing_spec} onChange={e => setSpec('packing_spec',e.target.value)} rows={2} style={{ ...inp(), resize:'none', width:'100%' }} /></Field>
              <Field label="UT Class Notes" style={{ marginTop:10 }}><textarea value={form.quality_specs.ut_class_notes} onChange={e => setSpec('ut_class_notes',e.target.value)} rows={2} style={{ ...inp(), resize:'none', width:'100%' }} /></Field>
              <SectionLabel style={{ marginTop:16 }}>Flags</SectionLabel>
              <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                {[['radioactivity_free','Radioactivity Free'],['cbam_applicable','CBAM Applicable'],['cbam_data_provided','CBAM Data Provided']].map(([k,label]) => (
                  <label key={k} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}>
                    <input type="checkbox" checked={!!form.quality_specs[k]} onChange={e => setSpec(k,e.target.checked)} /> {label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ padding:'12px 24px', borderTop:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ display:'flex', gap:8 }}>
            {tab > 0 && <button onClick={() => setTab(t => t-1)} style={btnSecondary()}>← Back</button>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onClose} style={btnSecondary()}>Cancel</button>
            {tab < 2
              ? <button onClick={() => setTab(t => t+1)} style={btnPrimary()}>Next →</button>
              : <button onClick={handleSave} disabled={saving} style={btnPrimary(saving)}>{saving ? 'Saving...' : '✓ Save & Create Batches'}</button>
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ children, style }) {
  return <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#AAA', marginBottom:12, paddingBottom:6, borderBottom:'1px solid #F0F0F0', ...style }}>{children}</div>
}

function Field({ label, children, error, hint }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <label style={{ fontSize:11, fontWeight:600, color:'#555' }}>{label}</label>
      {children}
      {error && <span style={{ fontSize:10, color:'#E53935' }}>{error}</span>}
      {hint  && <span style={{ fontSize:10, color:'#AAA' }}>{hint}</span>}
    </div>
  )
}

function inp(error) {
  return { width:'100%', padding:'6px 10px', fontSize:12, border:`1px solid ${error?'#E53935':'#E0E0E0'}`, borderRadius:6, outline:'none', background:'#fff', boxSizing:'border-box' }
}
function btnPrimary(disabled) {
  return { background:disabled?'#ccc':'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', fontSize:12, fontWeight:600, cursor:disabled?'not-allowed':'pointer' }
}
function btnSecondary() {
  return { background:'#fff', color:'#555', border:'1px solid #E0E0E0', borderRadius:6, padding:'8px 16px', fontSize:12, cursor:'pointer' }
}

export default function SalesOrders() {
  const navigate = useNavigate()
  const [orders,       setOrders]       = useState([])
  const [customers,    setCustomers]    = useState([])
  const [grades,       setGrades]       = useState([])
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected,     setSelected]     = useState(null)
  const [showModal,    setShowModal]    = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [leadTimes,    setLeadTimes]    = useState({})

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const [r1,r2,r3] = await Promise.all([fetch(`${API}/api/so`),fetch(`${API}/api/customers`),fetch(`${API}/api/grades`)])
      const [d1,d2,d3] = await Promise.all([r1.json(),r2.json(),r3.json()])
      setOrders(d1||[]); setCustomers(d2||[]); setGrades(d3||[])
    } catch(e) { console.error(e) } finally { setLoading(false) }
  }

  async function loadLeadTime(so_number) {
    if (leadTimes[so_number]) return
    try {
      const r = await fetch(`${API}/api/so/${so_number}/lead-time`)
      const data = await r.json()
      setLeadTimes(prev => ({ ...prev, [so_number]: data }))
    } catch(e) {}
  }

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.so_number?.toLowerCase().includes(search.toLowerCase()) || o.customer?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const total      = orders.length
  const inProd     = orders.filter(o => o.status==='In Production').length
  const dispatched = orders.filter(o => o.status==='Dispatched').length
  const pending    = orders.filter(o => ['Pending','Confirmed'].includes(o.status)).length

  async function handleSave(data) {
    setShowModal(false)
    await loadAll()
    alert(`✅ ${data.message}`)
  }

  function handleCreateBatch(order, li) {
    navigate('/batches/new', { state: { from_so: { so_number:order.so_number, customer:order.customer, delivery_date:order.delivery_date, po_number:order.po_number, inco_term:order.inco_term, payment_terms:order.payment_terms, line_item:{ grade:li.grade, size_mm:li.size_mm, qty_tons:li.qty_tons, tolerance:li.tolerance, length_mm:li.length_mm, ends_finish:li.ends_finish } } } })
  }

  return (
    <div style={{ padding:'20px 28px', background:'#F7F8FA', minHeight:'100vh' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>Sales Orders</div>
          <div style={{ fontSize:12, color:'#AAA', marginTop:2 }}>{orders.length} orders · Batch cards auto-created on SO save</div>
        </div>
        <button onClick={() => setShowModal(true)} style={btnPrimary()}>+ New Sales Order</button>
      </div>

      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Orders',  value:total,      color:'#185FA5' },
          { label:'In Production', value:inProd,     color:'#FB8C00' },
          { label:'Dispatched',    value:dispatched, color:'#43A047' },
          { label:'Pending',       value:pending,    color:'#E53935' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', border:'1px solid #EEEEEE', borderTop:`3px solid ${k.color}`, borderRadius:8, padding:'14px 20px', flex:1 }}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'#AAA', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:30, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'0 12px', height:34, background:'#fff', border:'1px solid #E5E5E5', borderRadius:6, minWidth:300 }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/><path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SO number or customer..." style={{ border:'none', outline:'none', fontSize:12, flex:1, background:'transparent' }} />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value==='All statuses'?'':e.target.value)} style={{ height:34, fontSize:12, padding:'0 12px', border:'1px solid #E5E5E5', borderRadius:6, background:'#fff' }}>
          {['All statuses','Pending','Confirmed','In Production','Dispatched','On Hold'].map(o => <option key={o}>{o}</option>)}
        </select>
      </div>

      <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:8, overflow:'hidden' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:48, color:'#AAA', fontSize:12 }}>Loading orders...</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#FAFAFA', borderBottom:'1px solid #EEEEEE' }}>
                {['SO Number','Customer','Qty (tons)','Inco Term','Delivery Date','Status','Action'].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <React.Fragment key={order.id}>
                  <tr onClick={() => { setSelected(selected===order.id?null:order.id); if(selected!==order.id) loadLeadTime(order.so_number) }}
                    style={{ borderBottom:'1px solid #F5F5F5', cursor:'pointer', background:selected===order.id?'#FFFAF7':'#fff' }}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontWeight:600, color:'#E8642A', fontFamily:'monospace', fontSize:11 }}>{order.so_number}</div>
                      <div style={{ fontSize:10, color:'#AAA', marginTop:1 }}>PO: {order.po_number||'—'}</div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontWeight:500 }}>{order.customer}</div>
                      <div style={{ fontSize:10, color:'#AAA' }}>{order.contact_person}</div>
                    </td>
                    <td style={{ padding:'12px 14px', fontWeight:600 }}>
                      {order.line_items ? order.line_items.reduce((s,i) => s+Number(i.qty_tons||0),0).toFixed(3) : '—'} T
                    </td>
                    <td style={{ padding:'12px 14px', color:'#555' }}>{order.inco_term||'—'}</td>
                    <td style={{ padding:'12px 14px', color:'#555' }}>{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('en-GB') : '—'}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:4, background:STATUS_STYLE[order.status]?.bg||'#F5F5F5', color:STATUS_STYLE[order.status]?.color||'#555' }}>{order.status}</span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <button onClick={e => { e.stopPropagation(); setSelected(selected===order.id?null:order.id); if(selected!==order.id) loadLeadTime(order.so_number) }}
                        style={{ ...btnSecondary(), padding:'4px 10px', fontSize:11 }}>
                        {selected===order.id?'Hide':'View'}
                      </button>
                    </td>
                  </tr>

                  {selected===order.id && (
                    <tr>
                      <td colSpan={7} style={{ padding:0, background:'#FFFAF7' }}>
                        <div style={{ padding:'16px 20px' }}>

                          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px 20px', marginBottom:16 }}>
                            {[
                              ['Supplier No.',order.supplier_no],['Sale Made Through',order.sale_made_through],
                              ['Payment Terms',order.payment_terms],['Shipment Mode',order.shipment_mode],
                              ['Delivery Instruction',order.delivery_instruction],['Delivery Address',order.delivery_address],
                              ['Consignee',order.consignee_address],['Bank Charges',order.bank_charges],
                            ].map(([label,value]) => (
                              <div key={label}>
                                <div style={{ fontSize:10, color:'#AAA', marginBottom:2 }}>{label}</div>
                                <div style={{ fontSize:11, fontWeight:500, color:'#333' }}>{value||'—'}</div>
                              </div>
                            ))}
                          </div>

                          {order.line_items && order.line_items.length > 0 && (
                            <>
                              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA', marginBottom:8 }}>Line Items</div>
                              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11, marginBottom:16 }}>
                                <thead>
                                  <tr style={{ background:'#F5F5F5' }}>
                                    {['Sr','Grade','Size','Tolerance','Length','Qty (T)','Rate','Amount','Batch Card','Action'].map(h => (
                                      <th key={h} style={{ padding:'6px 10px', textAlign:'left', fontSize:9, fontWeight:700, textTransform:'uppercase', color:'#888' }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {order.line_items.map((li,i) => (
                                    <tr key={i} style={{ borderBottom:'1px solid #F0F0F0' }}>
                                      <td style={{ padding:'6px 10px', color:'#AAA' }}>{li.sr_no||i+1}</td>
                                      <td style={{ padding:'6px 10px', fontWeight:600, color:'#185FA5' }}>{li.grade||'—'}</td>
                                      <td style={{ padding:'6px 10px', fontWeight:600 }}>{li.size_mm} mm</td>
                                      <td style={{ padding:'6px 10px' }}>{li.tolerance||'—'}</td>
                                      <td style={{ padding:'6px 10px' }}>{li.length_mm||3000} mm</td>
                                      <td style={{ padding:'6px 10px', fontWeight:500 }}>{Number(li.qty_tons).toFixed(3)} T</td>
                                      <td style={{ padding:'6px 10px' }}>{Number(li.rate_per_ton||0).toLocaleString()}</td>
                                      <td style={{ padding:'6px 10px', fontWeight:600, color:'#E8642A' }}>{Number(li.amount||0).toLocaleString()}</td>
                                      <td style={{ padding:'6px 10px' }}>
                                        {li.batch_card_no
                                          ? <span style={{ fontSize:10, background:'#E8F5E9', color:'#2E7D32', padding:'2px 6px', borderRadius:4, fontFamily:'monospace' }}>{li.batch_card_no}</span>
                                          : <span style={{ fontSize:10, color:'#AAA' }}>Not created</span>}
                                      </td>
                                      <td style={{ padding:'6px 10px' }}>
                                        <button onClick={() => handleCreateBatch(order,li)} style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:4, padding:'3px 8px', fontSize:10, fontWeight:600, cursor:'pointer' }}>+ Batch</button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}

                          {leadTimes[order.so_number] && (
                            <>
                              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA', marginBottom:8 }}>Lead Time Estimate</div>
                              {leadTimes[order.so_number].lead_time_per_line?.map((lt,i) => (
                                <div key={i} style={{ background:'#F5F5F5', borderRadius:6, padding:12, marginBottom:8 }}>
                                  <div style={{ fontSize:11, fontWeight:600, marginBottom:6 }}>
                                    Line {lt.line_no} — {lt.grade} {lt.size_mm}mm · {lt.qty_tons} T
                                    <span style={{ marginLeft:12, color:'#E8642A', fontWeight:700 }}>Total: ~{lt.total_days} days</span>
                                  </div>
                                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                    {lt.stages?.map(s => (
                                      <div key={s.stage} style={{ background:'#fff', border:'1px solid #E0E0E0', borderRadius:4, padding:'3px 8px', fontSize:10 }}>
                                        <span style={{ color:'#888' }}>{s.stage}:</span>
                                        <strong style={{ marginLeft:4 }}>{s.days}d</strong>
                                        {s.is_fixed && <span style={{ color:'#AAA', marginLeft:2 }}>(fixed)</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </>
                          )}

                          {/* ── ACTION BUTTONS ── */}
                          <div style={{ marginTop:16, display:'flex', gap:8, flexWrap:'wrap' }}>
                            <button
                              onClick={() => window.open(`${API}/api/pdf/so/${order.so_number}`, '_blank')}
                              style={{ background:'#185FA5', color:'#fff', border:'none', borderRadius:6, padding:'7px 16px', fontSize:12, fontWeight:600, cursor:'pointer' }}
                            >
                              📄 Print Sales Contract
                            </button>
                            <button
                              onClick={() => window.open(`${API}/api/pdf/invoice/${order.id}`, '_blank')}
                              style={{ background:'#fff', color:'#185FA5', border:'1px solid #185FA5', borderRadius:6, padding:'7px 16px', fontSize:12, fontWeight:600, cursor:'pointer' }}
                            >
                              📄 Commercial Invoice
                            </button>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length===0 && (
          <div style={{ textAlign:'center', padding:48, color:'#AAA', fontSize:12 }}>No orders found</div>
        )}
      </div>

      {showModal && <NewSOModal onClose={() => setShowModal(false)} onSave={handleSave} customers={customers} grades={grades} />}
    </div>
  )
}