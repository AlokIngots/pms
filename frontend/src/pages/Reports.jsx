import { useState, useMemo } from 'react'

const MOCK_DISPATCHES = [
  { id:1,  batch:'10650', so:'EXP-138', customer:'KSB Pumps',        grade:'1.4021/420', size:110, qty_kg:4641,  dispatch_date:'2026-03-10', promised_date:'2026-03-12', delay_days:-2, invoice:'EXP-112/2025-26' },
  { id:2,  batch:'10651', so:'EXP-139', customer:'Wilo SE',           grade:'316L',       size:50,  qty_kg:8400,  dispatch_date:'2026-03-08', promised_date:'2026-03-05', delay_days:3,  invoice:'EXP-113/2025-26' },
  { id:3,  batch:'10652', so:'EXP-130', customer:'Caprari',           grade:'431',        size:40,  qty_kg:2800,  dispatch_date:'2026-03-01', promised_date:'2026-03-01', delay_days:0,  invoice:'EXP-110/2025-26' },
  { id:4,  batch:'10640', so:'EXP-125', customer:'Flowserve',         grade:'1.4462',     size:60,  qty_kg:6200,  dispatch_date:'2026-02-25', promised_date:'2026-02-20', delay_days:5,  invoice:'EXP-108/2025-26' },
  { id:5,  batch:'10638', so:'EXP-122', customer:'Franklin Electric', grade:'17-4PH',     size:35,  qty_kg:5100,  dispatch_date:'2026-02-18', promised_date:'2026-02-18', delay_days:0,  invoice:'EXP-107/2025-26' },
  { id:6,  batch:'10630', so:'EXP-120', customer:'Grundfos',          grade:'420C',       size:32,  qty_kg:7600,  dispatch_date:'2026-02-10', promised_date:'2026-02-08', delay_days:2,  invoice:'EXP-105/2025-26' },
  { id:7,  batch:'10622', so:'EXP-115', customer:'Sulzer',            grade:'416',        size:45,  qty_kg:6800,  dispatch_date:'2026-02-02', promised_date:'2026-02-05', delay_days:-3, invoice:'EXP-103/2025-26' },
  { id:8,  batch:'10615', so:'EXP-110', customer:'ITT Inc.',          grade:'304L',       size:25,  qty_kg:9500,  dispatch_date:'2026-01-28', promised_date:'2026-01-30', delay_days:-2, invoice:'EXP-101/2025-26' },
  { id:9,  batch:'10608', so:'EXP-108', customer:'KSB Pumps',         grade:'1.4021/420', size:90,  qty_kg:5200,  dispatch_date:'2026-01-20', promised_date:'2026-01-15', delay_days:5,  invoice:'EXP-099/2025-26' },
  { id:10, batch:'10600', so:'EXP-105', customer:'Bucher Stahl',      grade:'1.4034',     size:40,  qty_kg:4200,  dispatch_date:'2026-01-10', promised_date:'2026-01-12', delay_days:-2, invoice:'EXP-097/2025-26' },
  { id:11, batch:'10590', so:'EXP-100', customer:'Wilo SE',           grade:'1.4104',     size:50,  qty_kg:8100,  dispatch_date:'2025-12-28', promised_date:'2025-12-25', delay_days:3,  invoice:'EXP-094/2025-26' },
  { id:12, batch:'10582', so:'EXP-098', customer:'Caprari',           grade:'430F',       size:30,  qty_kg:3400,  dispatch_date:'2025-12-15', promised_date:'2025-12-18', delay_days:-3, invoice:'EXP-092/2025-26' },
  { id:13, batch:'10575', so:'1170',    customer:'Accurate Steel',    grade:'420C',       size:32,  qty_kg:1650,  dispatch_date:'2026-02-18', promised_date:'2026-02-18', delay_days:0,  invoice:'767/2025-26' },
  { id:14, batch:'10568', so:'1165',    customer:'Accurate Steel',    grade:'420C',       size:32,  qty_kg:1580,  dispatch_date:'2026-01-15', promised_date:'2026-01-20', delay_days:-5, invoice:'750/2025-26' },
  { id:15, batch:'10560', so:'EXP-095', customer:'KSB Pumps',         grade:'1.4021/420', size:110, qty_kg:5500,  dispatch_date:'2025-12-10', promised_date:'2025-12-08', delay_days:2,  invoice:'EXP-090/2025-26' },
  { id:16, batch:'10552', so:'EXP-092', customer:'Flowserve',         grade:'1.4462',     size:60,  qty_kg:4800,  dispatch_date:'2025-12-05', promised_date:'2025-12-07', delay_days:-2, invoice:'EXP-088/2025-26' },
]

const MONTHS     = ['2025-12','2026-01','2026-02','2026-03']
const MONTH_LBLS = ['Dec 2025','Jan 2026','Feb 2026','Mar 2026']
const CUSTOMERS  = [...new Set(MOCK_DISPATCHES.map(d=>d.customer))].sort()

// Colors
const C_EARLY   = '#0f766e'  // teal — before time
const C_ONTIME  = '#1D4ED8'  // corporate blue — on time
const C_DELAYED = '#9ca3af'  // grey — delayed

function getMonth(d){ return d.substring(0,7) }
function fmtDate(d){ return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}) }
function dispStatus(d){ return d.delay_days < 0 ? 'early' : d.delay_days === 0 ? 'ontime' : 'delayed' }

function PieChart({ early, onTime, delayed, size=140, label }) {
  const total = early + onTime + delayed
  if (total === 0) return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'#F5F5F5', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ fontSize:11, color:'#9ca3af' }}>No data</span>
    </div>
  )

  const pcts = [
    { val: early,   color: C_EARLY   },
    { val: onTime,  color: C_ONTIME  },
    { val: delayed, color: C_DELAYED },
  ]

  const r = size / 2 - 6
  const cx = size / 2
  const cy = size / 2
  let cumAngle = -Math.PI / 2

  const slices = pcts.filter(p => p.val > 0).map(p => {
    const angle = (p.val / total) * 2 * Math.PI
    const x1 = cx + r * Math.cos(cumAngle)
    const y1 = cy + r * Math.sin(cumAngle)
    cumAngle += angle
    const x2 = cx + r * Math.cos(cumAngle)
    const y2 = cy + r * Math.sin(cumAngle)
    const large = angle > Math.PI ? 1 : 0
    return { path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, color: p.color }
  })

  const otdPct   = total > 0 ? Math.round((early + onTime) / total * 100) : 0
  const dotColor = otdPct >= 90 ? C_EARLY : otdPct >= 75 ? C_ONTIME : C_DELAYED

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg width={size} height={size}>
        {slices.map((s,i) => <path key={i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1.5"/>)}
      </svg>
      {label && <div style={{ fontSize:11, fontWeight:500, color:'#374151', textAlign:'center' }}>{label}</div>}
    </div>
  )
}

function Legend() {
  return (
    <div style={{ display:'flex', gap:16, fontSize:11, flexWrap:'wrap', justifyContent:'center' }}>
      {[
        { color: C_EARLY,   label:'Before time' },
        { color: C_ONTIME,  label:'On time' },
        { color: C_DELAYED, label:'Delayed' },
      ].map(l => (
        <span key={l.label} style={{ display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:10, height:10, borderRadius:'50%', background:l.color, display:'inline-block' }}/>
          <span style={{ color:'#374151' }}>{l.label}</span>
        </span>
      ))}
    </div>
  )
}

const STATUS_STYLE = {
  early:   { bg:'#f0fdf4', color:'#0f766e', label:'Before time' },
  ontime:  { bg:'#eff6ff', color:'#1D4ED8', label:'On time' },
  delayed: { bg:'#f9fafb', color:'#6b7280', label:'Delayed' },
}

export default function Reports() {
  const [period, setPeriod]               = useState('all')
  const [customerFilter, setCustomerFilter] = useState('all')
  const [sortBy, setSortBy]               = useState('date_desc')

  const filtered = useMemo(() => {
    let list = [...MOCK_DISPATCHES]
    if (period !== 'all')         list = list.filter(d => getMonth(d.dispatch_date) === period)
    if (customerFilter !== 'all') list = list.filter(d => d.customer === customerFilter)
    list.sort((a,b) => {
      if (sortBy === 'date_desc') return new Date(b.dispatch_date) - new Date(a.dispatch_date)
      if (sortBy === 'date_asc')  return new Date(a.dispatch_date) - new Date(b.dispatch_date)
      if (sortBy === 'delay')     return b.delay_days - a.delay_days
      return 0
    })
    return list
  }, [period, customerFilter, sortBy])

  const early    = filtered.filter(d => d.delay_days < 0).length
  const onTime   = filtered.filter(d => d.delay_days === 0).length
  const delayed  = filtered.filter(d => d.delay_days > 0).length
  const total    = filtered.length
  const totalKg  = filtered.reduce((s,d) => s+d.qty_kg, 0)
  const otdPct   = total > 0 ? Math.round((early+onTime)/total*100) : 0
  const dotColor = otdPct>=90 ? C_EARLY : otdPct>=75 ? C_ONTIME : C_DELAYED

  const monthlyData = MONTHS.map((m,i) => {
    const md = MOCK_DISPATCHES.filter(d => getMonth(d.dispatch_date) === m)
    return {
      label:   MONTH_LBLS[i],
      early:   md.filter(d=>d.delay_days<0).length,
      onTime:  md.filter(d=>d.delay_days===0).length,
      delayed: md.filter(d=>d.delay_days>0).length,
    }
  })

  const customerData = CUSTOMERS.map(c => {
    const cd = MOCK_DISPATCHES.filter(d => d.customer === c)
    return {
      customer: c,
      early:   cd.filter(d=>d.delay_days<0).length,
      onTime:  cd.filter(d=>d.delay_days===0).length,
      delayed: cd.filter(d=>d.delay_days>0).length,
      total:   cd.length,
      pct:     cd.length>0?Math.round((cd.filter(d=>d.delay_days<=0).length/cd.length)*100):0,
    }
  }).sort((a,b) => b.pct-a.pct)

  return (
    <div style={{ padding:'20px 28px', background:'#F7F8FA', minHeight:'100vh', fontFamily:"'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>OTD Reports</div>
          <div style={{ fontSize:12, color:'#6b7280', marginTop:2 }}>On-time delivery — before time, on time and delayed</div>
        </div>
        <button
          style={{ height:36, padding:'0 18px', fontSize:13, border:'1px solid #E5E5E5', borderRadius:8, background:'#fff', cursor:'pointer', color:'#374151' }}
          onClick={() => alert('CSV export coming soon')}>
          Export CSV
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'On/before time', value:`${otdPct}%`,                        sub:`${early+onTime} of ${total}`,        color:dotColor   },
          { label:'Before time',    value:early,                                sub:'before promised date',               color:C_EARLY    },
          { label:'On time',        value:onTime,                               sub:'exact promised date',                color:C_ONTIME   },
          { label:'Delayed',        value:delayed,                              sub:'after promised date',                color:C_DELAYED  },
          { label:'Total · Weight', value:total,                                sub:`${(totalKg/1000).toFixed(1)} MT dispatched`, color:'#374151' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', border:'1px solid #EEEEEE', borderTop:`3px solid ${k.color}`, borderRadius:8, padding:'16px 18px' }}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'#9ca3af', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1, marginBottom:4 }}>{k.value}</div>
            <div style={{ fontSize:11, color:'#9ca3af' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Overall + Monthly */}
      <div style={{ display:'grid', gridTemplateColumns:'220px 1fr', gap:14, marginBottom:20 }}>

        {/* Overall */}
        <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:12, padding:20, display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#9ca3af', alignSelf:'flex-start' }}>Overall</div>
          <PieChart early={early} onTime={onTime} delayed={delayed} size={160}/>
          <Legend/>
          <div style={{ width:'100%', display:'flex', flexDirection:'column', gap:8, fontSize:12 }}>
            {[
              { label:'Before time', value:early,   color:C_EARLY   },
              { label:'On time',     value:onTime,  color:C_ONTIME  },
              { label:'Delayed',     value:delayed, color:C_DELAYED },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:r.color }} />
                  <span style={{ color:'#374151' }}>{r.label}</span>
                </div>
                <span style={{ fontWeight:600, color:'#111' }}>{r.value} <span style={{ fontWeight:400, color:'#9ca3af' }}>({total>0?Math.round(r.value/total*100):0}%)</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly */}
        <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:12, padding:20 }}>
          <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#9ca3af', marginBottom:16 }}>Monthly breakdown</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
            {monthlyData.map(m => (
              <div key={m.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                <PieChart early={m.early} onTime={m.onTime} delayed={m.delayed} size={120} label={m.label}/>
                <div style={{ fontSize:11, color:'#374151', textAlign:'center', lineHeight:1.8 }}>
                  <div style={{ color:C_EARLY }}>{m.early} before time</div>
                  <div style={{ color:C_ONTIME }}>{m.onTime} on time</div>
                  <div style={{ color:C_DELAYED }}>{m.delayed} delayed</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16 }}><Legend/></div>
        </div>
      </div>

      {/* Customer-wise */}
      <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:12, padding:'20px', marginBottom:20 }}>
        <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#9ca3af', marginBottom:16 }}>
          Customer-wise delivery performance
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:16 }}>
          {customerData.map(c => {
            const pctColor = c.pct>=90 ? C_EARLY : c.pct>=75 ? C_ONTIME : C_DELAYED
            return (
              <div key={c.customer} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10, padding:14, background:'#FAFAFA', borderRadius:10, border:'1px solid #EEEEEE' }}>
                <PieChart early={c.early} onTime={c.onTime} delayed={c.delayed} size={110}/>
                <div style={{ fontSize:12, fontWeight:600, color:'#111', textAlign:'center', lineHeight:1.3 }}>{c.customer}</div>
                <div style={{ fontSize:11, textAlign:'center', lineHeight:1.8 }}>
                  <div style={{ color:C_EARLY }}>{c.early} before time</div>
                  <div style={{ color:C_ONTIME }}>{c.onTime} on time</div>
                  <div style={{ color:C_DELAYED }}>{c.delayed} delayed</div>
                  <div style={{ marginTop:4, fontWeight:700, color:pctColor }}>{c.pct}% OTD</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop:16 }}><Legend/></div>
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={() => setPeriod('all')}
          style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #E5E5E5', background: period==='all' ? '#1A1A1A' : '#fff', color: period==='all' ? '#fff' : '#374151' }}>
          All time
        </button>
        {MONTHS.map((m,i) => (
          <button key={m} onClick={() => setPeriod(period===m?'all':m)}
            style={{ padding:'6px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #E5E5E5', background: period===m ? '#1A1A1A' : '#fff', color: period===m ? '#fff' : '#374151' }}>
            {MONTH_LBLS[i]}
          </button>
        ))}
        <div style={{ width:1, height:20, background:'#EEEEEE', margin:'0 4px' }}/>
        <select value={customerFilter} onChange={e=>setCustomerFilter(e.target.value)}
          style={{ fontSize:12, padding:'6px 10px', background:'#fff', border:'1px solid #E5E5E5', borderRadius:8, color:'#374151', outline:'none' }}>
          <option value="all">All customers</option>
          {CUSTOMERS.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
          style={{ fontSize:12, padding:'6px 10px', background:'#fff', border:'1px solid #E5E5E5', borderRadius:8, color:'#374151', outline:'none' }}>
          <option value="date_desc">Latest first</option>
          <option value="date_asc">Oldest first</option>
          <option value="delay">Most delayed</option>
        </select>
      </div>

      {/* Dispatch table */}
      <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:12, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'110px 1fr 80px 90px 90px 100px 90px 80px', padding:'10px 16px', background:'#F8F8F8', borderBottom:'1px solid #EEEEEE', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.05em', gap:8 }}>
          {['Invoice','Customer · Grade','Qty (kg)','Dispatch','Promised','Delivery','Status','Batch'].map(h => (
            <span key={h}>{h}</span>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ padding:40, textAlign:'center', color:'#9ca3af', fontSize:13 }}>No dispatches match this filter</div>
        )}
        {filtered.map((d,i) => {
          const st = STATUS_STYLE[dispStatus(d)]
          return (
            <div key={d.id} style={{ display:'grid', gridTemplateColumns:'110px 1fr 80px 90px 90px 100px 90px 80px', padding:'10px 16px', borderBottom: i<filtered.length-1 ? '1px solid #F5F5F5' : 'none', gap:8, alignItems:'center', fontSize:12 }}>
              <span style={{ fontFamily:'monospace', fontSize:10, color:'#6b7280' }}>{d.invoice}</span>
              <div>
                <div style={{ fontWeight:500, color:'#111' }}>{d.customer}</div>
                <div style={{ fontSize:11, color:'#9ca3af' }}>{d.grade} · {d.size}mm</div>
              </div>
              <span style={{ color:'#374151' }}>{d.qty_kg.toLocaleString()}</span>
              <span style={{ color:'#6b7280', fontSize:11 }}>{fmtDate(d.dispatch_date)}</span>
              <span style={{ color:'#6b7280', fontSize:11 }}>{fmtDate(d.promised_date)}</span>
              <span style={{ fontSize:12, fontWeight:600, color: d.delay_days<0 ? C_EARLY : d.delay_days===0 ? C_ONTIME : C_DELAYED }}>
                {d.delay_days<0 ? `${Math.abs(d.delay_days)}d early` : d.delay_days===0 ? 'Exact date' : `${d.delay_days}d late`}
              </span>
              <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500, background:st.bg, color:st.color, display:'inline-block', whiteSpace:'nowrap' }}>
                {st.label}
              </span>
              <span style={{ fontFamily:'monospace', fontSize:11, color:'#9ca3af' }}>#{d.batch}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}