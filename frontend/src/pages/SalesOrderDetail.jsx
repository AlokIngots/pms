import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = 'http://localhost:5000'

function Field({ label, value, onCommit, type, options, span, textarea, readonly }) {
  const [local, setLocal] = useState(value || '')
  const ref = useRef(null)

  useEffect(() => {
    if (document.activeElement !== ref.current) {
      setLocal(value || '')
    }
  }, [value])

  const style = {
    fontSize:13, border:'1px solid #E0E0E0', borderRadius:8,
    padding:'6px 10px', width:'100%', boxSizing:'border-box', color:'#111',
    background: readonly ? '#F0F0F0' : '#F7F8FA',
    cursor: readonly ? 'not-allowed' : 'text'
  }
  const lbl = { fontSize:11, color:'#888', display:'block', marginBottom:3 }
  const locked = <span style={{fontSize:9,background:'#F0F0F0',color:'#999',borderRadius:3,padding:'1px 5px',marginLeft:5}}>locked</span>

  return (
    <div style={span ? {gridColumn:`span ${span}`} : {}}>
      <label style={lbl}>{label}{readonly && locked}</label>
      {textarea ? (
        <textarea
          ref={ref}
          style={{...style, resize:'vertical', minHeight:52}}
          value={local}
          readOnly={readonly}
          onChange={e => !readonly && setLocal(e.target.value)}
          onBlur={e => !readonly && onCommit(e.target.value)}
          rows={2}
        />
      ) : options ? (
        <>
          <input
            ref={ref}
            style={style}
            list={`list-${label}`}
            value={local}
            readOnly={readonly}
            onChange={e => !readonly && setLocal(e.target.value)}
            onBlur={e => !readonly && onCommit(e.target.value)}
            placeholder="Select or type..."
          />
          <datalist id={`list-${label}`}>
            {options.map(o => <option key={o} value={o}/>)}
          </datalist>
        </>
      ) : (
        <input
          ref={ref}
          style={style}
          type={type || 'text'}
          value={local}
          readOnly={readonly}
          onChange={e => !readonly && setLocal(e.target.value)}
          onBlur={e => !readonly && onCommit(e.target.value)}
        />
      )}
    </div>
  )
}

export default function SalesOrderDetail() {
  const { soNumber } = useParams()
  const navigate = useNavigate()
  const [so, setSo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const decoded = decodeURIComponent(soNumber)

  useEffect(() => {
    fetch(`${API}/api/so/${encodeURIComponent(decoded)}`)
      .then(r => r.json())
      .then(d => { setSo(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [decoded])

  const set = (k, v) => setSo(p => ({ ...p, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API}/api/so/${encodeURIComponent(decoded)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(so),
      })
      const data = await res.json()
      if (data.success) { setSaved(true); setTimeout(() => setSaved(false), 2500) }
      else alert('Save failed: ' + (data.error || 'Unknown'))
    } catch (e) { alert('Save failed: ' + e.message) }
    setSaving(false)
  }

  const printPDF = async (type) => {
    setSaving(true)
    try {
      await fetch(`${API}/api/so/${encodeURIComponent(decoded)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(so),
      })
    } catch (e) { alert('Save failed: ' + e.message); setSaving(false); return }
    setSaving(false)
    const isLocal = (so.order_type || '').toLowerCase() === 'domestic'
    if (isLocal) {
      window.open(`${API}/api/pdf/local/${encodeURIComponent(decoded)}?copy=${type}`, '_blank')
    } else {
      window.open(`${API}/api/pdf/so/${encodeURIComponent(decoded)}?type=export&copy=${type}`, '_blank')
    }
  }

  const card     = { background:'#fff', border:'1px solid #EEEEEE', borderRadius:10, padding:'16px 20px', marginBottom:12 }
  const sec      = { fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#AAA', marginBottom:12, paddingBottom:6, borderBottom:'1px solid #F0F0F0' }
  const g4       = { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px 16px' }
  const g3       = { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px 16px' }
  const g2       = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px' }
  const btnBlue  = { background:'#E6F1FB', color:'#0C447C', border:'none', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }
  const btnGreen = { background:'#EAF3DE', color:'#27500A', border:'none', padding:'7px 14px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }
  const btnDark  = { background:'#1a1a1a', color:'#fff', border:'none', padding:'7px 16px', borderRadius:8, fontSize:12, fontWeight:600, cursor:'pointer' }
  const btnGhost = { background:'none', border:'1px solid #E0E0E0', padding:'6px 12px', borderRadius:8, fontSize:12, color:'#666', cursor:'pointer' }

  if (loading) return <div style={{padding:'3rem',color:'#AAA',fontSize:13}}>Loading...</div>
  if (!so || so.error) return <div style={{padding:'3rem',color:'#E53935',fontSize:13}}>SO not found</div>

  const isLocal  = (so.order_type || '').toLowerCase() === 'domestic'
  const totalQty = (so.line_items||[]).reduce((s,i)=>s+(parseFloat(i.qty_tons)||0),0)
  const totalAmt = (so.line_items||[]).reduce((s,i)=>s+(parseFloat(i.qty_tons)||0)*(parseFloat(i.rate_per_ton)||0),0)

  // GST calc for local
  const cgst_pct = parseFloat(so.cgst_pct || 9)
  const sgst_pct = parseFloat(so.sgst_pct || 9)
  const igst_pct = parseFloat(so.igst_pct || 0)
  const pf_amt   = parseFloat(so.packing_forwarding || 0)
  const subTotal = isLocal ? totalQty * 1000 * (parseFloat((so.line_items||[])[0]?.rate_per_ton||0)/1000) : totalAmt
  const cgst_amt = subTotal * cgst_pct / 100
  const sgst_amt = subTotal * sgst_pct / 100
  const igst_amt = subTotal * igst_pct / 100
  const grandTotal = subTotal + cgst_amt + sgst_amt + igst_amt + pf_amt

  const sc = so.status==='In Production'?{bg:'#E3F2FD',c:'#1565C0'}:so.status==='Pending'?{bg:'#FFF3E0',c:'#E65100'}:{bg:'#E8F5E9',c:'#2E7D32'}

  return (
    <div style={{padding:'20px 28px',background:'#F7F8FA',minHeight:'100vh'}}>
      <button style={{...btnGhost,marginBottom:16}} onClick={()=>navigate('/orders')}>Back to Sales Orders</button>

      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:16}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{fontSize:18,fontWeight:700,color:'#111'}}>{so.so_number}</div>
            <span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:100,background:isLocal?'#EAF3DE':'#E6F1FB',color:isLocal?'#27500A':'#0C447C'}}>{isLocal?'Local / Domestic':'Export'}</span>
          </div>
          <div style={{fontSize:12,color:'#AAA',marginTop:3}}>{so.customer} · SO Date: {so.so_date||'--'}</div>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:11,fontWeight:600,padding:'4px 12px',borderRadius:100,background:sc.bg,color:sc.c}}>{so.status}</span>
          <button style={btnBlue} onClick={()=>printPDF('customer')} disabled={saving}>{saving?'Saving...':'Print Customer Copy'}</button>
          <button style={btnGreen} onClick={()=>printPDF('plant')} disabled={saving}>{saving?'Saving...':'Print Plant Copy'}</button>
          <button style={btnDark} onClick={save} disabled={saving}>{saving?'Saving...':'Save Changes'}</button>
          {saved && <span style={{fontSize:11,color:'#2E7D32',background:'#E8F5E9',padding:'4px 10px',borderRadius:100}}>Saved</span>}
        </div>
      </div>

      {/* CONTRACT REFERENCE */}
      <div style={card}>
        <div style={sec}>Contract Reference</div>
        <div style={g4}>
          <Field label="Sales Contract No" value={so.so_number} onCommit={()=>{}} readonly/>
          <Field label="SO Date" value={so.so_date} onCommit={v=>set('so_date',v)} type="date"/>
          <Field label="Purchase Order No" value={so.po_number} onCommit={v=>set('po_number',v)}/>
          <Field label="PO Date" value={so.po_date} onCommit={v=>set('po_date',v)} type="date"/>
          {isLocal ? (
            <>
              <Field label="D.O Number" value={so.do_number} onCommit={v=>set('do_number',v)}/>
              <Field label="HSN Code" value={so.hsn_code} onCommit={v=>set('hsn_code',v)}/>
            </>
          ) : (
            <>
              <Field label="Supplier No" value={so.supplier_no} onCommit={v=>set('supplier_no',v)}/>
              <Field label="Offer Ref No" value={so.offer_ref_no} onCommit={v=>set('offer_ref_no',v)}/>
              <Field label="Customer Short Code" value={so.customer_short_code} onCommit={v=>set('customer_short_code',v)}/>
            </>
          )}
        </div>
      </div>

      {/* CUSTOMER DETAILS */}
      <div style={card}>
        <div style={sec}>Customer Details</div>
        <div style={g4}>
          <Field label="Customer Name" value={so.customer} onCommit={v=>set('customer',v)} span={2} readonly/>
          <Field label="Contact Person" value={so.contact_person} onCommit={v=>set('contact_person',v)} span={2} readonly/>
          <Field label="Email" value={so.customer_email} onCommit={v=>set('customer_email',v)} type="email" readonly/>
          <Field label="Tel No" value={so.customer_tel} onCommit={v=>set('customer_tel',v)}/>
          <Field label="Fax No" value={so.customer_fax} onCommit={v=>set('customer_fax',v)}/>
          {isLocal ? (
            <Field label="Customer GST No" value={so.gstin} onCommit={v=>set('gstin',v)}/>
          ) : (
            <Field label="Sale Made Through" value={so.sale_made_through} onCommit={v=>set('sale_made_through',v)}/>
          )}
          <Field label="Kind Attention" value={so.kind_attention} onCommit={v=>set('kind_attention',v)} span={2}/>
          {isLocal && (
            <Field label="Sale Made Through" value={so.sale_made_through} onCommit={v=>set('sale_made_through',v)} span={2}/>
          )}
        </div>
      </div>

      {/* DELIVERY */}
      <div style={card}>
        <div style={sec}>Delivery</div>
        <div style={g2}>
          <Field label="Delivery Address" value={so.delivery_address} onCommit={v=>set('delivery_address',v)} textarea/>
          {!isLocal && <Field label="Consignee Address" value={so.consignee_address} onCommit={v=>set('consignee_address',v)} textarea/>}
          <Field label="Delivery Instruction" value={so.delivery_instruction} onCommit={v=>set('delivery_instruction',v)}/>
          <Field label="Delivery Date" value={so.delivery_date} onCommit={v=>set('delivery_date',v)} type="date"/>
        </div>
      </div>

      {/* TERMS - different for export vs local */}
      {!isLocal ? (
        <div style={card}>
          <div style={sec}>Terms and Conditions</div>
          <div style={g4}>
            <Field label="Payment Terms" value={so.payment_terms} onCommit={v=>set('payment_terms',v)}
              options={['30% advance, 70% against BL','100% advance','LC at sight','Net 30 days','Net 60 days']}/>
            <Field label="Inco Terms" value={so.inco_term} onCommit={v=>set('inco_term',v)}
              options={['FOB Mumbai','CIF','CFR','EXW','DAP','FCA']}/>
            <Field label="Shipment Mode" value={so.shipment_mode} onCommit={v=>set('shipment_mode',v)}
              options={['Sea freight','Air freight','Partial shipments allowed','Full container load']}/>
            <Field label="Bank Charges" value={so.bank_charges} onCommit={v=>set('bank_charges',v)}
              options={["Any Bank Charges Inside India will be at Alok's Account and Outside India Shall Be At Buyers Account.","All bank charges on buyer's account","All bank charges on seller's account"]}/>
            <Field label="Weight Note" value={so.weight_note} onCommit={v=>set('weight_note',v)} span={2}/>
            <Field label="Duty Note" value={so.duty_note} onCommit={v=>set('duty_note',v)} span={2}/>
          </div>
        </div>
      ) : (
        <div style={card}>
          <div style={sec}>Payment & Tax</div>
          <div style={g3}>
            <Field label="Payment Terms" value={so.payment_terms} onCommit={v=>set('payment_terms',v)}
              options={['7 Days from Invoice date','15 Days','30 Days','60 to 70 days','Against Delivery']}/>
            <Field label="CGST %" value={String(so.cgst_pct||9)} onCommit={v=>set('cgst_pct',v)}/>
            <Field label="SGST %" value={String(so.sgst_pct||9)} onCommit={v=>set('sgst_pct',v)}/>
            <Field label="IGST %" value={String(so.igst_pct||0)} onCommit={v=>set('igst_pct',v)}/>
            <Field label="Packing & Forwarding (INR)" value={String(so.packing_forwarding||0)} onCommit={v=>set('packing_forwarding',v)}/>
          </div>
          {/* Tax summary */}
          <div style={{background:'#FAFAFA',border:'1px solid #EEE',borderRadius:8,padding:'12px 16px',marginTop:12}}>
            <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',color:'#AAA',marginBottom:8}}>Tax Summary</div>
            {[
              ['Sub Total', totalAmt],
              [`CGST ${cgst_pct}%`, cgst_amt],
              [`SGST ${sgst_pct}%`, sgst_amt],
              ...(igst_pct > 0 ? [[`IGST ${igst_pct}%`, igst_amt]] : []),
              ...(pf_amt > 0 ? [['Packing & Forwarding', pf_amt]] : []),
            ].map(([label, val]) => (
              <div key={label} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',borderBottom:'1px solid #EEE',fontSize:12}}>
                <span style={{color:'#666'}}>{label}</span>
                <span style={{fontWeight:600}}>INR {Number(val).toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',padding:'8px 0',fontSize:14,fontWeight:700}}>
              <span>Grand Total</span>
              <span style={{color:'#E8642A'}}>INR {grandTotal.toLocaleString('en-IN',{maximumFractionDigits:2})}</span>
            </div>
          </div>
        </div>
      )}


     {isLocal && (
        <div style={card}>
          <div style={sec}>Terms and Conditions</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px 16px'}}>
            <div>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:3}}>Packing & Forwarding</label>
              <div style={{display:'flex',gap:4}}>
                <select style={{width:'auto',minWidth:90,padding:'7px 4px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,background:'#F7F8FA',color:'#111'}}
                  onChange={e=>{ if(e.target.value) set('tc_packing',e.target.value) }}>
                  <option value="">Select...</option>
                  <option>Loose</option>
                  <option>Extra at Actual</option>
                  <option>Included</option>
                  <option>As per Order</option>
                </select>
                <input style={{flex:1,padding:'7px 10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,background:'#F7F8FA',color:'#111',boxSizing:'border-box'}}
                  value={so.tc_packing||''}
                  onChange={e=>set('tc_packing',e.target.value)}
                  placeholder="Or type here..." />
              </div>
            </div>
            <div>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:3}}>Delivery</label>
              <input style={{width:'100%',padding:'7px 10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,background:'#F7F8FA',color:'#111',boxSizing:'border-box'}}
                value={so.tc_delivery||''}
                onChange={e=>set('tc_delivery',e.target.value)}
                placeholder="e.g. Ex. Wada / Ex. Rajkot" />
            </div>
            <div>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:3}}>IGST</label>
              <div style={{display:'flex',gap:4}}>
                <select style={{width:'auto',minWidth:90,padding:'7px 4px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,background:'#F7F8FA',color:'#111'}}
                  onChange={e=>{ if(e.target.value) set('tc_igst',e.target.value) }}>
                  <option value="">Select...</option>
                  <option>As Applicable</option>
                  <option>Included</option>
                  <option>Extra</option>
                  <option>Nil</option>
                </select>
                <input style={{flex:1,padding:'7px 10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,background:'#F7F8FA',color:'#111',boxSizing:'border-box'}}
                  value={so.tc_igst||''}
                  onChange={e=>set('tc_igst',e.target.value)}
                  placeholder="Or type here..." />
              </div>
            </div>
            <div>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:3}}>Late Payment Clause</label>
              <input style={{width:'100%',padding:'7px 10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,background:'#F7F8FA',color:'#111',boxSizing:'border-box'}}
                value={so.tc_late_payment||'Interest of 18% p.a. to be applicable for late payment'}
                onChange={e=>set('tc_late_payment',e.target.value)} />
            </div>
            <div style={{gridColumn:'span 2'}}>
              <label style={{fontSize:11,color:'#888',display:'block',marginBottom:3}}>Fax Acceptance</label>
              <input style={{width:'100%',padding:'7px 10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,background:'#F7F8FA',color:'#111',boxSizing:'border-box'}}
                value={so.tc_fax||'Please fax acceptance of this Sales Order on (0251) 243 2200.'}
                onChange={e=>set('tc_fax',e.target.value)} />
            </div>
          </div>
        </div>
      )}
      {/* LINE ITEMS */}
      <div style={card}>
        <div style={sec}>Line Items (locked)</div>
        {(so.line_items||[]).length === 0 && <div style={{color:'#AAA',fontSize:12,padding:'10px 0'}}>No line items found</div>}
        {(so.line_items||[]).map((item,idx)=>{
          const qty_kg = (parseFloat(item.qty_tons||0)*1000)
          const rate_kg = (parseFloat(item.rate_per_ton||0)/1000)
          const amt = isLocal ? qty_kg * rate_kg : parseFloat(item.qty_tons||0)*parseFloat(item.rate_per_ton||0)
          return (
            <div key={idx} style={{border:'1px solid #EEEEEE',borderRadius:8,marginBottom:10,overflow:'hidden'}}>
              <div style={{background:'#FAFAFA',padding:'8px 14px',borderBottom:'1px solid #EEEEEE',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                <span style={{fontSize:12,fontWeight:700,color:'#333'}}>Line {item.sr_no||idx+1}</span>
                <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{fontSize:12,fontWeight:600,color:'#185FA5'}}>{item.grade}</span>
                  <span style={{fontSize:12,color:'#888'}}>dia {item.size_mm}mm · {item.tolerance}</span>
                  {isLocal
                    ? <span style={{fontSize:12,color:'#888'}}>{qty_kg.toFixed(0)} KG</span>
                    : <span style={{fontSize:12,color:'#888'}}>{parseFloat(item.qty_tons||0).toFixed(3)} T</span>
                  }
                  <span style={{fontSize:12,fontWeight:600,color:'#E8642A'}}>{isLocal?'INR':'EUR'} {amt.toLocaleString()}</span>
                </div>
              </div>
              <div style={{padding:'12px 14px',background:'#FDFAFA'}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'8px 16px'}}>
                  {isLocal ? [
                    ['Grade', item.grade],
                    ['Size (mm)', item.size_mm],
                    ['Tolerance', item.tolerance],
                    ['Length (mm)', item.length_mm],
                    ['Qty (KG)', qty_kg.toFixed(0)],
                    ['Rate (INR/KG)', rate_kg.toFixed(2)],
                    ['Amount (INR)', amt.toLocaleString()],
                    ['Batch Card', item.batch_card_no||'Not created'],
                  ] : [
                    ['Grade', item.grade],
                    ['Size (mm)', item.size_mm],
                    ['Tolerance', item.tolerance],
                    ['Length (mm)', item.length_mm],
                    ['Qty (Tons)', parseFloat(item.qty_tons||0).toFixed(3)],
                    ['Rate (EUR/T)', Number(item.rate_per_ton||0).toLocaleString()],
                    ['Amount (EUR)', amt.toLocaleString()],
                    ['Batch Card', item.batch_card_no||'Not created'],
                  ].map(([l,v])=>(
                    <div key={l}>
                      <div style={{fontSize:10,color:'#AAA',marginBottom:2}}>{l}</div>
                      <div style={{fontSize:12,fontWeight:500,color:l.includes('Amount')?'#E8642A':l==='Batch Card'&&item.batch_card_no?'#2E7D32':'#333'}}>{v||'--'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
        <div style={{display:'flex',gap:8,justifyContent:'flex-end',paddingTop:12,flexWrap:'wrap',borderTop:'1px solid #F0F0F0',marginTop:4}}>
          <div style={{background:'#F7F8FA',borderRadius:8,padding:'8px 16px',textAlign:'right'}}>
            <div style={{fontSize:10,color:'#AAA',textTransform:'uppercase'}}>Total Qty</div>
            <div style={{fontSize:16,fontWeight:700}}>{isLocal?(totalQty*1000).toFixed(0)+' KG':totalQty.toFixed(3)+' T'}</div>
          </div>
          <div style={{background:'#FFF8F5',borderRadius:8,padding:'8px 16px',textAlign:'right'}}>
            <div style={{fontSize:10,color:'#AAA',textTransform:'uppercase'}}>{isLocal?'Grand Total':'Total Amount'}</div>
            <div style={{fontSize:16,fontWeight:700,color:'#E8642A'}}>{isLocal?'INR '+grandTotal.toLocaleString('en-IN',{maximumFractionDigits:2}):'EUR '+totalAmt.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',paddingTop:4,paddingBottom:24}}>
        <button style={btnDark} onClick={save} disabled={saving}>{saving?'Saving...':'Save Changes'}</button>
        <button style={{...btnGhost,color:'#C62828',borderColor:'#FFCDD2'}} onClick={()=>navigate('/orders')}>Back</button>
      </div>
    </div>
  )
}