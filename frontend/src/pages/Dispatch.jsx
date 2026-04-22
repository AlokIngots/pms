import React, { useState, useEffect } from 'react'
import { useBatches } from '../context/BatchContext'

const API = import.meta.env.VITE_API_URL || ''

const TRANSPORTERS = ['VRL Logistics','Gati Express','DTDC Freight','TCI Freight','Safexpress','BlueDart','Own vehicle']

const ALL_DISPATCHES = [
  { id:1,  batch:'10650', customer:'KSB Pumps',        grade:'1.4021/420', size:110, qty_kg:4641, dispatch_date:'2026-03-10', promised_date:'2026-03-12', delay_days:-2, transporter:'VRL Logistics', lr:'VRL2026031001', vehicle:'MH04 AB 1234', invoice:'EXP-112/2025-26' },
  { id:2,  batch:'10651', customer:'Wilo SE',           grade:'316L',       size:50,  qty_kg:8400, dispatch_date:'2026-03-08', promised_date:'2026-03-05', delay_days:3,  transporter:'Gati Express',  lr:'GATI20260308',  vehicle:'MH12 CD 5678', invoice:'EXP-113/2025-26' },
  { id:3,  batch:'10652', customer:'Caprari',           grade:'431',        size:40,  qty_kg:2800, dispatch_date:'2026-03-01', promised_date:'2026-03-01', delay_days:0,  transporter:'VRL Logistics', lr:'VRL2026030101', vehicle:'MH04 AB 9999', invoice:'EXP-110/2025-26' },
  { id:4,  batch:'10640', customer:'Flowserve',         grade:'1.4462',     size:60,  qty_kg:6200, dispatch_date:'2026-02-25', promised_date:'2026-02-20', delay_days:5,  transporter:'TCI Freight',   lr:'TCI2026022501', vehicle:'MH06 XY 1122', invoice:'EXP-108/2025-26' },
  { id:5,  batch:'10638', customer:'Franklin Electric', grade:'17-4PH',     size:35,  qty_kg:5100, dispatch_date:'2026-02-18', promised_date:'2026-02-18', delay_days:0,  transporter:'Safexpress',    lr:'SAFE20260218',  vehicle:'MH09 PQ 3344', invoice:'EXP-107/2025-26' },
  { id:6,  batch:'10630', customer:'KSB Pumps',         grade:'420C',       size:32,  qty_kg:7600, dispatch_date:'2026-02-10', promised_date:'2026-02-08', delay_days:2,  transporter:'Gati Express',  lr:'GATI20260210',  vehicle:'MH12 CD 5678', invoice:'EXP-105/2025-26' },
  { id:7,  batch:'10622', customer:'Sulzer',            grade:'416',        size:45,  qty_kg:6800, dispatch_date:'2026-02-02', promised_date:'2026-02-05', delay_days:-3, transporter:'VRL Logistics', lr:'VRL2026020201', vehicle:'MH04 AB 1234', invoice:'EXP-103/2025-26' },
  { id:8,  batch:'10615', customer:'KSB Pumps',         grade:'304L',       size:25,  qty_kg:9500, dispatch_date:'2026-01-28', promised_date:'2026-01-30', delay_days:-2, transporter:'BlueDart',      lr:'BD2026012801',  vehicle:'MH22 EF 5566', invoice:'EXP-101/2025-26' },
  { id:9,  batch:'10608', customer:'Wilo SE',           grade:'1.4021/420', size:90,  qty_kg:5200, dispatch_date:'2026-01-20', promised_date:'2026-01-15', delay_days:5,  transporter:'TCI Freight',   lr:'TCI2026012001', vehicle:'MH06 XY 1122', invoice:'EXP-099/2025-26' },
  { id:10, batch:'10600', customer:'Flowserve',         grade:'1.4034',     size:40,  qty_kg:4200, dispatch_date:'2026-01-10', promised_date:'2026-01-12', delay_days:-2, transporter:'Gati Express',  lr:'GATI20260110',  vehicle:'MH12 CD 5678', invoice:'EXP-097/2025-26' },
  { id:11, batch:'10590', customer:'Caprari',           grade:'1.4104',     size:50,  qty_kg:8100, dispatch_date:'2025-12-28', promised_date:'2025-12-25', delay_days:3,  transporter:'VRL Logistics', lr:'VRL2025122801', vehicle:'MH04 AB 1234', invoice:'EXP-094/2025-26' },
  { id:12, batch:'10582', customer:'KSB Pumps',         grade:'430F',       size:30,  qty_kg:3400, dispatch_date:'2025-12-15', promised_date:'2025-12-18', delay_days:-3, transporter:'Safexpress',    lr:'SAFE20251215',  vehicle:'MH09 PQ 3344', invoice:'EXP-092/2025-26' },
]

const HIST_CUSTOMERS = [...new Set(ALL_DISPATCHES.map(d => d.customer))].sort()

function dispStatus(d) { return d.delay_days < 0 ? 'early' : d.delay_days === 0 ? 'ontime' : 'delayed' }
function fmtDate(d) { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) }
function daysLeft(p) { return Math.ceil((new Date(p) - new Date()) / (1000*60*60*24)) }

const C_EARLY   = '#0f766e'
const C_ONTIME  = '#1D4ED8'
const C_DELAYED = '#9ca3af'

function PieChart({ early, onTime, delayed, size=120 }) {
  const total = early + onTime + delayed
  if (total === 0) return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:10, color:'#AAA' }}>No data</span>
    </div>
  )
  const slices = [
    { val:early,   color:C_EARLY   },
    { val:onTime,  color:C_ONTIME  },
    { val:delayed, color:C_DELAYED },
  ]
  const r = size/2 - 4
  const cx = size/2, cy = size/2
  let cum = -Math.PI/2
  const paths = slices.filter(s => s.val > 0).map(s => {
    const angle = (s.val/total)*2*Math.PI
    const x1 = cx+r*Math.cos(cum), y1 = cy+r*Math.sin(cum)
    cum += angle
    const x2 = cx+r*Math.cos(cum), y2 = cy+r*Math.sin(cum)
    const large = angle > Math.PI ? 1 : 0
    return { path:`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color:s.color }
  })
  const otdPct   = total > 0 ? Math.round((early+onTime)/total*100) : 0
  const dotColor = otdPct>=90 ? C_EARLY : otdPct>=75 ? C_ONTIME : C_DELAYED
  return (
    <svg width={size} height={size}>
      {paths.map((p,i) => <path key={i} d={p.path} fill={p.color} stroke="white" strokeWidth="2"/>)}
      <text x={cx} y={cy-4}  textAnchor="middle" fontSize="14" fontWeight="600" fill={dotColor}>{otdPct}%</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize="8"  fill="#888">on/before time</text>
    </svg>
  )
}

function CustomerGraph({ customer, onClose }) {
  const dispatches = ALL_DISPATCHES.filter(d => d.customer === customer)
  const early   = dispatches.filter(d=>d.delay_days<0).length
  const onTime  = dispatches.filter(d=>d.delay_days===0).length
  const delayed = dispatches.filter(d=>d.delay_days>0).length
  const total   = dispatches.length

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
      onClick={e => { if(e.target===e.currentTarget) onClose() }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:720, maxHeight:'90vh', overflow:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #EEEEEE', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, background:'#fff', zIndex:1 }}>
          <div>
            <div style={{ fontSize:16, fontWeight:600, color:'#111' }}>{customer}</div>
            <div style={{ fontSize:12, color:'#AAA' }}>Delivery performance · {total} dispatches</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#AAA' }}>×</button>
        </div>

        <div style={{ padding:20 }}>
          {/* Summary */}
          <div style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:20, marginBottom:20 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <PieChart early={early} onTime={onTime} delayed={delayed} size={140}/>
              <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:5, fontSize:11 }}>
                {[
                  { label:'Before time', value:early,   color:C_EARLY   },
                  { label:'On time',     value:onTime,  color:C_ONTIME  },
                  { label:'Delayed',     value:delayed, color:C_DELAYED },
                ].map(r => (
                  <div key={r.label} style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ width:8, height:8, borderRadius:'50%', background:r.color, display:'inline-block' }}/>
                      <span style={{ color:'#555' }}>{r.label}</span>
                    </span>
                    <span style={{ fontWeight:500, color:r.color }}>{r.value} ({total>0?Math.round(r.value/total*100):0}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline bars */}
            <div>
              <div style={{ fontSize:11, fontWeight:600, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Delivery timeline</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {dispatches.sort((a,b) => new Date(b.dispatch_date)-new Date(a.dispatch_date)).map(d => {
                  const st       = dispStatus(d)
                  const barColor = st==='early' ? C_EARLY : st==='ontime' ? C_ONTIME : C_DELAYED
                  const maxDelay = 6
                  const barW     = Math.min(Math.abs(d.delay_days)/maxDelay*100, 100)
                  return (
                    <div key={d.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontSize:10, color:'#AAA', width:60, flexShrink:0, textAlign:'right' }}>{fmtDate(d.dispatch_date)}</div>
                      <div style={{ flex:1, height:20, background:'#F5F5F5', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ height:'100%', width: d.delay_days===0?'100%':`${Math.max(barW,20)}%`, background:barColor, borderRadius:4, display:'flex', alignItems:'center', paddingLeft:6 }}>
                          <span style={{ fontSize:9, color:'white', fontWeight:500, whiteSpace:'nowrap' }}>{d.grade} · {d.size}mm</span>
                        </div>
                      </div>
                      <div style={{ fontSize:10, fontWeight:500, color:barColor, width:55, flexShrink:0 }}>
                        {d.delay_days<0?`${Math.abs(d.delay_days)}d early`:d.delay_days===0?'On time':`${d.delay_days}d late`}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Dispatch table */}
          <div style={{ border:'1px solid #EEEEEE', borderRadius:10, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'110px 1fr 70px 80px 80px 70px 70px', padding:'7px 12px', background:'#F8F8F8', borderBottom:'1px solid #EEEEEE', fontSize:10, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.05em', gap:8 }}>
              {['Invoice','Grade · Size','Qty kg','Dispatch','Promised','Delivery','Status'].map(h => <span key={h}>{h}</span>)}
            </div>
            {dispatches.sort((a,b) => new Date(b.dispatch_date)-new Date(a.dispatch_date)).map((d,i) => {
              const st      = dispStatus(d)
              const stColor = st==='early' ? C_EARLY : st==='ontime' ? C_ONTIME : C_DELAYED
              const stBg    = st==='early' ? '#f0fdf4' : st==='ontime' ? '#eff6ff' : '#f9fafb'
              return (
                <div key={d.id} style={{ display:'grid', gridTemplateColumns:'110px 1fr 70px 80px 80px 70px 70px', padding:'8px 12px', borderBottom: i<dispatches.length-1?'1px solid #F5F5F5':'none', gap:8, alignItems:'center', fontSize:12 }}>
                  <span style={{ fontFamily:'monospace', fontSize:10, color:'#888' }}>{d.invoice}</span>
                  <span style={{ color:'#333', fontWeight:500 }}>{d.grade} · {d.size}mm</span>
                  <span style={{ color:'#555' }}>{d.qty_kg.toLocaleString()}</span>
                  <span style={{ fontSize:11, color:'#888' }}>{fmtDate(d.dispatch_date)}</span>
                  <span style={{ fontSize:11, color:'#888' }}>{fmtDate(d.promised_date)}</span>
                  <span style={{ fontSize:11, fontWeight:500, color:stColor }}>
                    {d.delay_days<0?`${Math.abs(d.delay_days)}d early`:d.delay_days===0?'On time':`${d.delay_days}d late`}
                  </span>
                  <span style={{ fontSize:10, padding:'2px 6px', borderRadius:20, fontWeight:500, background:stBg, color:stColor, display:'inline-block' }}>
                    {st==='early'?'Early':st==='ontime'?'On time':'Delayed'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dispatch() {
  const { batches }                           = useBatches()
  const [selected, setSelected]               = useState([])
  const [form, setForm]                       = useState({ dispatch_date: new Date().toISOString().split('T')[0], transporter:'', lr_number:'', vehicle_number:'', remarks:'' })
  const [view, setView]                       = useState('pending')
  const [saving, setSaving]                   = useState(false)
  const [graphCustomer, setGraphCustomer]     = useState(null)
  const [dbDispatches, setDbDispatches]       = useState([])

  // Load dispatches from backend
  useEffect(() => {
    async function load() {
      try {
        const r = await fetch(`${API}/api/dispatch`)
        if (!r.ok) return
        const data = await r.json()
        if (data) setDbDispatches(data)
      } catch (e) {
        console.log('Using mock dispatch history')
      }
    }
    load()
  }, [])

  const readyBatches = batches.filter(b => b.status !== 'Dispatched' && b.current_stage !== 'Dispatch')

  function toggleSelect(batchNo) {
    setSelected(s => s.includes(batchNo) ? s.filter(x => x !== batchNo) : [...s, batchNo])
  }

  const selectedBatches = batches.filter(b => selected.includes(b.batch_card_no))
  const totalWeight     = selectedBatches.reduce((s, b) => s + Number(b.weight_kg||0), 0)
  const totalPcs        = selectedBatches.reduce((s, b) => s + Number(b.no_of_pcs||0), 0)

  async function handleDispatch() {
    if (selected.length === 0)  { alert('Select at least one batch'); return }
    if (!form.transporter)      { alert('Transporter is required'); return }
    if (!form.lr_number)        { alert('LR number is required'); return }
    setSaving(true)
    try {
      const seq       = Math.floor(Math.random() * 900) + 100
      const invoiceNo = `EXP-${seq}/2025-26`
      const payload   = {
        invoice_no:        invoiceNo,
        dispatch_date:     form.dispatch_date,
        dispatch_type:     'Export',
        customer:          [...new Set(selectedBatches.map(b => b.customer))].join(', '),
        transporter:       form.transporter,
        vehicle_no:        form.vehicle_number,
        total_net_wt_kg:   totalWeight,
        total_gross_wt_kg: totalWeight + selectedBatches.length * 2,
        mtc_cert_no:       `TCPEXP${117000 + seq}`,
        status:            'Dispatched',
        batches: selectedBatches.map(b => ({
          batch_card_no: b.batch_card_no,
          heat_no:       b.heat_no,
          grade:         b.grade_code,
          size_mm:       b.size_mm,
          no_of_pcs:     b.no_of_pcs,
          net_wt_kg:     b.weight_kg,
        })),
      }
      const r    = await fetch(`${API}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await r.json()
      if (data.success) {
        alert(`✓ ${selected.length} batch${selected.length>1?'es':''} dispatched successfully`)
        setSelected([])
        setForm({ dispatch_date: new Date().toISOString().split('T')[0], transporter:'', lr_number:'', vehicle_number:'', remarks:'' })
      }
    } catch (e) {
      console.error('Dispatch failed', e)
    }
    setSaving(false)
  }

  const historyList = dbDispatches.length > 0 ? dbDispatches : ALL_DISPATCHES

  return (
    <div style={{ padding:'20px 28px', background:'#F7F8FA', minHeight:'100vh', fontFamily:"'Segoe UI', sans-serif" }}>
      {graphCustomer && <CustomerGraph customer={graphCustomer} onClose={() => setGraphCustomer(null)} />}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>Dispatch</div>
          <div style={{ fontSize:12, color:'#AAA', marginTop:2 }}>{readyBatches.length} batches ready · log dispatch and generate documents</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {[
            { key:'pending',   label:`Ready (${readyBatches.length})` },
            { key:'history',   label:'Dispatch history' },
            { key:'customers', label:'Customer graphs' },
          ].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{ padding:'7px 16px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #E5E5E5', background: view===v.key ? '#1A1A1A' : '#fff', color: view===v.key ? '#fff' : '#555' }}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── PENDING ── */}
      {view === 'pending' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, alignItems:'start' }}>
          <div>
            <div style={{ fontSize:11, color:'#AAA', marginBottom:10 }}>Select batches to dispatch together</div>
            {readyBatches.length === 0 ? (
              <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:10, padding:48, textAlign:'center', color:'#AAA', fontSize:12 }}>
                No batches ready for dispatch
              </div>
            ) : (
              readyBatches.map(batch => {
                const isSel = selected.includes(batch.batch_card_no)
                return (
                  <div key={batch.batch_card_no} onClick={() => toggleSelect(batch.batch_card_no)}
                    style={{ padding:'14px 16px', marginBottom:10, cursor:'pointer', transition:'all 0.15s', background: isSel?'#EFF6FF':'#fff', border:`1px solid ${isSel?'#93C5FD':'#EEEEEE'}`, borderLeft:`4px solid ${isSel?'#1D4ED8':'#EEEEEE'}`, borderRadius:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:20, height:20, borderRadius:5, border:`2px solid ${isSel?'#1D4ED8':'#DDD'}`, background:isSel?'#1D4ED8':'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          {isSel && <span style={{ color:'#fff', fontSize:12, fontWeight:700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize:14, fontWeight:600, color:'#111', fontFamily:'monospace' }}>#{batch.batch_card_no}</span>
                      </div>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <button onClick={e => { e.stopPropagation(); setGraphCustomer(batch.customer) }}
                          style={{ fontSize:11, padding:'3px 8px', borderRadius:6, border:'1px solid #EEEEEE', background:'#F8F8F8', color:'#555', cursor:'pointer' }}>
                          View {batch.customer} graph
                        </button>
                        <span style={{ fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500, background: batch.priority==='Critical'?'#FFEBEE':batch.priority==='Warning'?'#FFF3E0':'#E8F5E9', color: batch.priority==='Critical'?'#E53935':batch.priority==='Warning'?'#FB8C00':'#43A047' }}>
                          {batch.current_stage}
                        </span>
                      </div>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'6px 12px', fontSize:12 }}>
                      {[
                        ['Grade',    batch.grade_code],
                        ['Customer', batch.customer],
                        ['Heat no.', batch.heat_no],
                        ['Size',     `${batch.size_mm}mm`],
                        ['Pcs',      batch.no_of_pcs],
                        ['Weight',   `${(Number(batch.weight_kg)/1000).toFixed(3)}t`],
                        ['HT',       batch.ht_process||'—'],
                        ['Process',  batch.bb_process||'—'],
                      ].map(([l,v]) => (
                        <div key={l}>
                          <div style={{ fontSize:10, color:'#AAA' }}>{l}</div>
                          <div style={{ fontSize:12, fontWeight:500, color:'#333' }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Dispatch form */}
          <div style={{ position:'sticky', top:20 }}>
            <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:12, padding:16 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'#111', marginBottom:14 }}>Dispatch details</div>

              {selected.length > 0 ? (
                <div style={{ padding:'10px 12px', background:'#EFF6FF', borderRadius:8, marginBottom:14, fontSize:11 }}>
                  <div style={{ fontWeight:600, color:'#1D4ED8', marginBottom:4 }}>{selected.length} batch{selected.length>1?'es':''} selected</div>
                  <div style={{ color:'#1D4ED8' }}>{totalPcs} pcs · {(totalWeight/1000).toFixed(3)}t</div>
                  <div style={{ color:'#1D4ED8', marginTop:2 }}>{[...new Set(selectedBatches.map(b => b.customer))].join(', ')}</div>
                </div>
              ) : (
                <div style={{ padding:'10px 12px', background:'#F8F8F8', borderRadius:8, marginBottom:14, fontSize:11, color:'#AAA', textAlign:'center' }}>
                  Select batches on the left
                </div>
              )}

              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {/* Dispatch date */}
                <div>
                  <label style={{ fontSize:11, color:'#AAA', display:'block', marginBottom:3 }}>Dispatch date *</label>
                  <input type="date" value={form.dispatch_date} onChange={e => setForm(f => ({...f, dispatch_date:e.target.value}))}
                    style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #E5E5E5', borderRadius:8, fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
                {/* Transporter */}
                <div>
                  <label style={{ fontSize:11, color:'#AAA', display:'block', marginBottom:3 }}>Transporter *</label>
                  <select value={form.transporter} onChange={e => setForm(f => ({...f, transporter:e.target.value}))}
                    style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #E5E5E5', borderRadius:8, fontFamily:'inherit', background:'#fff' }}>
                    <option value="">Select transporter...</option>
                    {TRANSPORTERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {/* LR */}
                <div>
                  <label style={{ fontSize:11, color:'#AAA', display:'block', marginBottom:3 }}>LR / consignment number *</label>
                  <input type="text" value={form.lr_number} placeholder="VRL2026031001" onChange={e => setForm(f => ({...f, lr_number:e.target.value}))}
                    style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #E5E5E5', borderRadius:8, fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
                {/* Vehicle */}
                <div>
                  <label style={{ fontSize:11, color:'#AAA', display:'block', marginBottom:3 }}>Vehicle number</label>
                  <input type="text" value={form.vehicle_number} placeholder="MH04 AB 1234" onChange={e => setForm(f => ({...f, vehicle_number:e.target.value}))}
                    style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #E5E5E5', borderRadius:8, fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
                {/* Remarks */}
                <div>
                  <label style={{ fontSize:11, color:'#AAA', display:'block', marginBottom:3 }}>Remarks</label>
                  <input type="text" value={form.remarks} placeholder="Any notes..." onChange={e => setForm(f => ({...f, remarks:e.target.value}))}
                    style={{ width:'100%', padding:'7px 10px', fontSize:12, border:'1px solid #E5E5E5', borderRadius:8, fontFamily:'inherit', boxSizing:'border-box' }} />
                </div>
              </div>

              {/* Documents */}
              <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #EEEEEE' }}>
                <div style={{ fontSize:11, color:'#AAA', marginBottom:8 }}>Generate documents on dispatch:</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {['Commercial Invoice','Packing List','MTC EN 10204/3.1'].map(doc => (
                    <div key={doc} style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'#555' }}>
                      <input type="checkbox" defaultChecked style={{ accentColor:'#1D4ED8' }}/>
                      <span>{doc}</span>
                      <span style={{ marginLeft:'auto', fontSize:10, color:'#AAA' }}>PDF</span>
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary" onClick={handleDispatch} disabled={saving || selected.length === 0}
                style={{ width:'100%', marginTop:14, justifyContent:'center', fontSize:13, padding:'10px' }}>
                {saving ? 'Dispatching...' : `Dispatch${selected.length > 0 ? ` ${selected.length} batch${selected.length>1?'es':''}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY ── */}
      {view === 'history' && (
        <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'110px 1fr 70px 80px 80px 70px 70px 110px', padding:'8px 14px', background:'#F8F8F8', borderBottom:'1px solid #EEEEEE', fontSize:10, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.05em', gap:8 }}>
            {['Invoice','Customer · Grade','Wt (kg)','Dispatch','Promised','Delivery','Status','Transporter'].map(h => <span key={h}>{h}</span>)}
          </div>
          {ALL_DISPATCHES.map((d,i) => {
            const st      = dispStatus(d)
            const stColor = st==='early' ? C_EARLY : st==='ontime' ? C_ONTIME : C_DELAYED
            const stBg    = st==='early' ? '#f0fdf4' : st==='ontime' ? '#eff6ff' : '#f9fafb'
            return (
              <div key={d.id} style={{ display:'grid', gridTemplateColumns:'110px 1fr 70px 80px 80px 70px 70px 110px', padding:'9px 14px', borderBottom: i<ALL_DISPATCHES.length-1?'1px solid #F5F5F5':'none', gap:8, alignItems:'center', fontSize:12 }}>
                <span style={{ fontFamily:'monospace', fontSize:10, color:'#888' }}>{d.invoice}</span>
                <div>
                  <div style={{ fontWeight:500, color:'#333' }}>{d.customer}</div>
                  <div style={{ fontSize:11, color:'#AAA' }}>{d.grade} · {d.size}mm · #{d.batch}</div>
                </div>
                <span style={{ color:'#555' }}>{d.qty_kg.toLocaleString()}</span>
                <span style={{ fontSize:11, color:'#888' }}>{fmtDate(d.dispatch_date)}</span>
                <span style={{ fontSize:11, color:'#888' }}>{fmtDate(d.promised_date)}</span>
                <span style={{ fontSize:11, fontWeight:500, color:stColor }}>
                  {d.delay_days<0?`${Math.abs(d.delay_days)}d early`:d.delay_days===0?'On time':`${d.delay_days}d late`}
                </span>
                <span style={{ fontSize:10, padding:'2px 6px', borderRadius:20, fontWeight:500, background:stBg, color:stColor, display:'inline-block' }}>
                  {st==='early'?'Early':st==='ontime'?'On time':'Delayed'}
                </span>
                <span style={{ fontSize:10, color:'#888' }}>{d.transporter}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── CUSTOMER GRAPHS ── */}
      {view === 'customers' && (
        <div>
          <div style={{ fontSize:12, color:'#AAA', marginBottom:16 }}>
            Click any customer card to see full delivery history.
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12 }}>
            {HIST_CUSTOMERS.map(customer => {
              const cd      = ALL_DISPATCHES.filter(d => d.customer === customer)
              const early   = cd.filter(d=>d.delay_days<0).length
              const onTime  = cd.filter(d=>d.delay_days===0).length
              const delayed = cd.filter(d=>d.delay_days>0).length
              const total   = cd.length
              const pct     = total>0?Math.round((early+onTime)/total*100):0
              const pctColor= pct>=90?C_EARLY:pct>=75?C_ONTIME:C_DELAYED
              return (
                <div key={customer} onClick={() => setGraphCustomer(customer)}
                  style={{ padding:14, background:'#fff', border:'1px solid #EEEEEE', borderRadius:12, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor='#93C5FD'}
                  onMouseLeave={e => e.currentTarget.style.borderColor='#EEEEEE'}
                >
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:10 }}>
                    <PieChart early={early} onTime={onTime} delayed={delayed} size={110}/>
                  </div>
                  <div style={{ fontSize:12, fontWeight:600, color:'#111', textAlign:'center', marginBottom:4 }}>{customer}</div>
                  <div style={{ fontSize:11, color:'#AAA', textAlign:'center', marginBottom:8 }}>{total} dispatches</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3, fontSize:11 }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ color:C_EARLY }}>Before time</span>
                      <span style={{ fontWeight:500 }}>{early}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ color:C_ONTIME }}>On time</span>
                      <span style={{ fontWeight:500 }}>{onTime}</span>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ color:C_DELAYED }}>Delayed</span>
                      <span style={{ fontWeight:500 }}>{delayed}</span>
                    </div>
                  </div>
                  <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:pctColor }}>{pct}% OTD</span>
                    <span style={{ fontSize:11, color:'#AAA' }}>View →</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}