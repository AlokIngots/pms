import { useState, useMemo } from 'react'
import { PROD_LOGS } from '../prodData'

const PROCESSES = ['All','Reeling','CG','Peeling']
const PERIODS   = [
  { key:'week',  label:'This week'    },
  { key:'mtd',   label:'Month to date'},
  { key:'all',   label:'All data'     },
]
const SHIFTS = ['All','DAY','NIGHT']

const PROCESS_COLORS = {
  'Reeling':  { bg:'#E6F1FB', color:'#185FA5', border:'#85B7EB' },
  'CG':       { bg:'#F3F0FB', color:'#5B21B6', border:'#A78BFA' },
  'Peeling':  { bg:'#FFF7ED', color:'#C2410C', border:'#FB923C' },
}

const SHIFT_COLORS = {
  'DAY':   { bg:'#E1F5EE', color:'#0F6E56' },
  'NIGHT': { bg:'#EEEDFE', color:'#534AB7' },
}

// Machine info from photo
const MACHINE_INFO = {
  '60 Z PLUS':    { process:'Reeling',  location:'Shed 1', type:'Straight rolling machine' },
  'JFN':          { process:'Reeling',  location:'Shed 1', type:'Straight rolling machine' },
  'STR-01':       { process:'Reeling',  location:'Shed 1', type:'Straight rolling machine' },
  'STR-03':       { process:'Reeling',  location:'Shed 1', type:'Straight rolling machine' },
  'STR-07':       { process:'Reeling',  location:'Shed 1', type:'Straight rolling machine' },
  'STR-08':       { process:'Reeling',  location:'Shed 1', type:'Straight rolling machine' },
  'CG-01':        { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'CG-02':        { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'CG-04':        { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'CG-05':        { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'CG-06':        { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'CG-07':        { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'LANDGRAFF':    { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'Lid Koping':   { process:'CG',       location:'Shed 2', type:'Centreless grinding machine' },
  'HAIGE 100Y':   { process:'Peeling',  location:'Shed 3', type:'Peeling machine 100mm' },
  'HAIGE 60Y':    { process:'Peeling',  location:'Shed 3', type:'Peeling machine 60mm'  },
  'KIESERLING':   { process:'Peeling',  location:'Shed 3', type:'Peeling machine'        },
}

function effColor(e) { return e>=90?'#0F6E56':e>=70?'#854F0B':'#A32D2D' }
function effBg(e)    { return e>=90?'#E1F5EE':e>=70?'#FAEEDA':'#FCEBEB' }

function Avatar({ name, bg, color, size=36 }) {
  const i = (name||'').trim().split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg||'#F0F0F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.33, fontWeight:700, color:color||'#555', flexShrink:0 }}>
      {i}
    </div>
  )
}

function MedalIcon({ rank }) {
  const medals = { 1:'🥇', 2:'🥈', 3:'🥉' }
  return medals[rank]
    ? <span style={{ fontSize:18 }}>{medals[rank]}</span>
    : <span style={{ fontSize:13, fontWeight:600, color:'#AAA' }}>#{rank}</span>
}

export default function OperatorLog() {
  const [period,  setPeriod]  = useState('all')
  const [process, setProcess] = useState('All')
  const [shift,   setShift]   = useState('All')
  const [view,    setView]    = useState('achievements')
  const [selectedMachine, setSelectedMachine] = useState(null)

  const filteredLogs = useMemo(() => {
    const now        = new Date()
    const todayStr   = now.toISOString().split('T')[0]
    const weekAgo    = new Date(now); weekAgo.setDate(now.getDate()-7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]

    return PROD_LOGS.filter(l => {
      if (period==='week' && l.date < weekAgo.toISOString().split('T')[0]) return false
      if (period==='mtd'  && l.date < monthStart) return false
      if (process!=='All' && l.process !== process) return false
      if (shift!=='All'   && l.shift   !== shift)   return false
      return true
    })
  }, [period, process, shift])

  // Operator stats
  const operatorStats = useMemo(() => {
    const map = {}
    filteredLogs.forEach(l => {
      const k = l.operator
      if (!map[k]) map[k] = {
        operator:k, process:l.process, machine:l.machine,
        pcs:0, bright:0, downtime:0, effSum:0, shifts:0,
        dayShifts:0, nightShifts:0, dayPcs:0, nightPcs:0,
        planPcs:0, logs:[], dates:new Set(),
        breakdown_mins:0,
        grades: new Set(), machines: new Set(), customers: new Set(),
      }
      map[k].pcs           += l.pcs
      map[k].bright        += l.bright
      map[k].downtime      += l.downtime
      map[k].breakdown_mins+= l.breakdown_mins
      map[k].effSum        += l.eff_act
      map[k].shifts        += 1
      map[k].planPcs       += (l.target_pcs || 0)
      map[k].dates.add(l.date)
      map[k].grades.add(l.grade)
      map[k].machines.add(l.machine)
      if (l.customer) map[k].customers.add(l.customer)
      if (l.shift==='DAY')   { map[k].dayShifts++;   map[k].dayPcs   += l.pcs }
      if (l.shift==='NIGHT') { map[k].nightShifts++;  map[k].nightPcs += l.pcs }
      map[k].logs.push(l)
    })
    return Object.values(map).map(o => ({
      ...o,
      avgEff:         o.shifts > 0 ? o.effSum / o.shifts : 0,
      achievement:    o.planPcs > 0 ? Math.round(o.pcs / o.planPcs * 100) : 0,
      daysWorked:     o.dates.size,
      avgPcsPerShift: o.shifts > 0 ? Math.round(o.pcs / o.shifts) : 0,
      grades:         [...o.grades].filter(g=>g&&g!=='nan'),
      machines:       [...o.machines].filter(m=>m&&m!=='nan'),
      customers:      [...o.customers].filter(c=>c&&c!=='nan'),
    })).sort((a,b) => b.pcs - a.pcs)
  }, [filteredLogs])

  // Machine stats
  const machineStats = useMemo(() => {
    const map = {}
    filteredLogs.forEach(l => {
      const k = l.machine
      if (!k || k==='nan') return
      if (!map[k]) map[k] = {
        machine:k, process:l.process,
        pcs:0, bright:0, effSum:0, shifts:0,
        breakdown_mins:0, downtime:0,
        operators: new Set(), grades: new Set(),
      }
      map[k].pcs            += l.pcs
      map[k].bright         += l.bright
      map[k].effSum         += l.eff_act
      map[k].shifts         += 1
      map[k].breakdown_mins += l.breakdown_mins
      map[k].downtime       += l.downtime
      map[k].operators.add(l.operator)
      map[k].grades.add(l.grade)
    })
    return Object.values(map).map(m => ({
      ...m,
      avgEff:    m.shifts > 0 ? m.effSum / m.shifts : 0,
      operators: [...m.operators].filter(Boolean),
      grades:    [...m.grades].filter(g=>g&&g!=='nan'),
      info:      MACHINE_INFO[m.machine] || {},
    })).sort((a,b) => b.avgEff - a.avgEff)
  }, [filteredLogs])

  // KPIs
  const totalPcs    = filteredLogs.reduce((s,l) => s+l.pcs,    0)
  const totalBright = filteredLogs.reduce((s,l) => s+l.bright, 0)
  const totalDown   = filteredLogs.reduce((s,l) => s+l.downtime, 0)
  const avgEff      = filteredLogs.length > 0
    ? filteredLogs.reduce((s,l) => s+l.eff_act, 0) / filteredLogs.length : 0

  // Process summary
  const processSummary = useMemo(() => {
    return ['Reeling','CG','Peeling'].map(pr => {
      const logs = filteredLogs.filter(l => l.process===pr)
      return {
        process: pr,
        pcs:     logs.reduce((s,l) => s+l.pcs, 0),
        bright:  logs.reduce((s,l) => s+l.bright, 0),
        eff:     logs.length > 0 ? logs.reduce((s,l) => s+l.eff_act, 0)/logs.length : 0,
        down:    logs.reduce((s,l) => s+l.downtime, 0),
        ops:     [...new Set(logs.map(l=>l.operator))].length,
        shifts:  logs.length,
      }
    })
  }, [filteredLogs])

  const dailyLogs = useMemo(() =>
    [...filteredLogs].sort((a,b) => b.date.localeCompare(a.date) || a.shift.localeCompare(b.shift))
  , [filteredLogs])

  const fmtDate = d => new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'})

  // Machine detail modal
  const machineDetail = selectedMachine
    ? machineStats.find(m => m.machine === selectedMachine)
    : null

  return (
    <div style={{ padding:'20px 28px', background:'#F7F8FA', minHeight:'100vh', fontFamily:"'Segoe UI', sans-serif" }}>

      {/* Machine detail modal */}
      {machineDetail && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}
          onClick={e => { if(e.target===e.currentTarget) setSelectedMachine(null) }}>
          <div style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:560, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding:'14px 20px', borderBottom:'1px solid #EEE', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'#111' }}>{machineDetail.machine}</div>
                <div style={{ fontSize:11, color:'#AAA' }}>{machineDetail.info.type||machineDetail.process} · {machineDetail.info.location||'—'}</div>
              </div>
              <button onClick={() => setSelectedMachine(null)} style={{ background:'none', border:'none', fontSize:22, color:'#AAA', cursor:'pointer' }}>×</button>
            </div>
            <div style={{ padding:20 }}>
              {/* Machine KPIs */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
                {[
                  { label:'Total pcs',    value: machineDetail.pcs.toLocaleString(),           color:'#185FA5' },
                  { label:'Total MT',     value: machineDetail.bright.toFixed(3)+' MT',         color:'#E8642A' },
                  { label:'Avg eff.',     value: machineDetail.avgEff.toFixed(1)+'%',           color: effColor(machineDetail.avgEff) },
                  { label:'Breakdown',    value: (machineDetail.breakdown_mins/60).toFixed(1)+'h', color:'#C62828' },
                ].map(k => (
                  <div key={k.label} style={{ background:'#F8F8F8', borderRadius:8, padding:'10px 12px', textAlign:'center' }}>
                    <div style={{ fontSize:9, fontWeight:600, textTransform:'uppercase', color:'#AAA', marginBottom:4 }}>{k.label}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:k.color }}>{k.value}</div>
                  </div>
                ))}
              </div>
              {/* Operators on this machine */}
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA', marginBottom:8 }}>
                Operators on this machine ({machineDetail.operators.length})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
                {machineDetail.operators.map(op => {
                  const pc = PROCESS_COLORS[machineDetail.process] || PROCESS_COLORS['CG']
                  return (
                    <div key={op} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 12px', background:pc.bg, borderRadius:20, border:`1px solid ${pc.border}` }}>
                      <Avatar name={op} bg={pc.border} color='#fff' size={22}/>
                      <span style={{ fontSize:12, fontWeight:500, color:pc.color }}>{op}</span>
                    </div>
                  )
                })}
              </div>
              {/* Grades processed */}
              <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA', marginBottom:8 }}>
                Grades processed ({machineDetail.grades.length})
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {machineDetail.grades.slice(0,20).map(g => (
                  <span key={g} style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'#1A1A1A', color:'#fff' }}>{g}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>Operator dashboard</div>
          <div style={{ fontSize:12, color:'#AAA', marginTop:2 }}>Achievements · planned vs actual · shift-wise · machine-wise</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setPeriod(p.key)}
              style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #E5E5E5', background: period===p.key?'#1A1A1A':'#fff', color: period===p.key?'#fff':'#555' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Avg efficiency',   value:avgEff.toFixed(1)+'%',          color:effColor(avgEff) },
          { label:'Total pcs',        value:totalPcs.toLocaleString(),       color:'#185FA5'        },
          { label:'Bright qty (MT)',   value:totalBright.toFixed(2),         color:'#E8642A'        },
          { label:'Downtime (hrs)',    value:totalDown.toFixed(1)+'h',       color:'#C62828'        },
          { label:'Active operators', value:operatorStats.length,            color:'#37474F'        },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', border:'1px solid #EEE', borderTop:`3px solid ${k.color}`, borderRadius:8, padding:'14px 18px' }}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'#AAA', marginBottom:8 }}>{k.label}</div>
            <div style={{ fontSize:28, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Process summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
        {processSummary.map(p => {
          const pc = PROCESS_COLORS[p.process] || PROCESS_COLORS['CG']
          return (
            <div key={p.process}
              onClick={() => setProcess(process===p.process?'All':p.process)}
              style={{ padding:'14px 16px', background: process===p.process ? pc.bg : '#fff', border:`1.5px solid ${process===p.process?pc.border:'#EEEEEE'}`, borderRadius:12, cursor:'pointer', transition:'all 0.15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                <div style={{ fontSize:14, fontWeight:700, color: pc.color }}>{p.process}</div>
                <div style={{ fontSize:20, fontWeight:800, color:effColor(p.eff) }}>{p.eff.toFixed(0)}%</div>
              </div>
              <div style={{ height:4, background:`${pc.border}44`, borderRadius:2, overflow:'hidden', marginBottom:10 }}>
                <div style={{ height:'100%', width:`${Math.min(p.eff,100)}%`, background:pc.color }}/>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:8, fontSize:11 }}>
                {[['Pcs', p.pcs.toLocaleString()], ['MT', p.bright.toFixed(1)], ['Ops', p.ops], ['Shifts', p.shifts]].map(([l,v]) => (
                  <div key={l}>
                    <div style={{ fontSize:9, color:'#AAA' }}>{l}</div>
                    <div style={{ fontWeight:700, color:pc.color }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters + view tabs */}
      <div style={{ display:'flex', gap:8, marginBottom:16, alignItems:'center', flexWrap:'wrap' }}>
        {[
          { key:'achievements', label:'🏆 Achievements' },
          { key:'daily',        label:'📋 Daily log'    },
          { key:'machines',     label:'⚙ By machine'   },
          { key:'shifts',       label:'🔄 Shifts'       },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key)}
            style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #E5E5E5', background: view===t.key?'#1A1A1A':'#fff', color: view===t.key?'#fff':'#555' }}>
            {t.label}
          </button>
        ))}
        <div style={{ width:1, height:20, background:'#EEEEEE', margin:'0 4px' }}/>
        {SHIFTS.map(s => (
          <button key={s} onClick={() => setShift(s)}
            style={{ padding:'7px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'1px solid #E5E5E5', background: shift===s?(s==='DAY'?'#E1F5EE':s==='NIGHT'?'#EEEDFE':'#1A1A1A'):'#fff', color: shift===s?(s==='DAY'?'#0F6E56':s==='NIGHT'?'#534AB7':'#fff'):'#555' }}>
            {s==='All'?'Both shifts':s+' shift'}
          </button>
        ))}
        <span style={{ fontSize:12, color:'#AAA', marginLeft:'auto' }}>{filteredLogs.length} log entries</span>
      </div>

      {/* ── ACHIEVEMENTS ── */}
      {view === 'achievements' && (
        <div>
          {/* Top 3 podium */}
          {operatorStats.length >= 3 && (
            <div style={{ marginBottom:20, padding:'16px 20px', background:'#fff', border:'1px solid #EEE', borderRadius:14 }}>
              <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'#AAA', marginBottom:14 }}>
                Top performers — by pcs produced
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr', gap:10 }}>
                {[1,0,2].map(rank => {
                  const op = operatorStats[rank]
                  const pc = PROCESS_COLORS[op.process] || PROCESS_COLORS['CG']
                  return (
                    <div key={rank} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                      <MedalIcon rank={rank+1}/>
                      <Avatar name={op.operator} bg={pc.bg} color={pc.color} size={48}/>
                      <div style={{ textAlign:'center' }}>
                        <div style={{ fontSize:14, fontWeight:700, color:'#111' }}>{op.operator}</div>
                        <div style={{ fontSize:11, color:'#AAA', marginBottom:4 }}>{op.process} · {op.machines[0]}</div>
                        <div style={{ fontSize:22, fontWeight:800, color:pc.color }}>{op.pcs.toLocaleString()}</div>
                        <div style={{ fontSize:10, color:'#AAA' }}>pieces produced</div>
                      </div>
                      <div style={{ width:'100%', background:'#F0F0F0', borderRadius:4, overflow:'hidden', height:6 }}>
                        <div style={{ height:'100%', width:`${Math.min(op.achievement,100)}%`, background:effColor(op.achievement) }}/>
                      </div>
                      <div style={{ fontSize:11, fontWeight:600, color:effColor(op.achievement) }}>{op.achievement}% of plan</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full leaderboard */}
          <div style={{ background:'#fff', border:'1px solid #EEE', borderRadius:12, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'44px 180px 90px 80px 80px 80px 70px 70px 70px 1fr', padding:'8px 14px', background:'#F8F8F8', borderBottom:'1px solid #EEE', fontSize:9, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.5px', gap:8 }}>
              {['#','Operator','Process','Total pcs','Plan pcs','Achievement','Bright MT','Down hrs','Avg eff','Machines / Grades'].map(h=><span key={h}>{h}</span>)}
            </div>
            {operatorStats.map((op, i) => {
              const pc = PROCESS_COLORS[op.process] || PROCESS_COLORS['CG']
              return (
                <div key={op.operator} style={{ display:'grid', gridTemplateColumns:'44px 180px 90px 80px 80px 80px 70px 70px 70px 1fr', padding:'10px 14px', borderBottom:i<operatorStats.length-1?'1px solid #F5F5F5':'none', gap:8, alignItems:'center', background:i<3?`${pc.bg}55`:'transparent' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <MedalIcon rank={i+1}/>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Avatar name={op.operator} bg={pc.bg} color={pc.color} size={30}/>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'#111' }}>{op.operator}</div>
                      <div style={{ fontSize:10, color:'#AAA' }}>{op.daysWorked} days · {op.shifts} shifts</div>
                    </div>
                  </div>
                  <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:8, background:pc.bg, color:pc.color, display:'inline-block' }}>{op.process}</span>
                  <span style={{ fontSize:14, fontWeight:700, color:pc.color }}>{op.pcs.toLocaleString()}</span>
                  <span style={{ fontSize:12, color:'#888' }}>{op.planPcs.toLocaleString()}</span>
                  <div>
                    <div style={{ fontSize:12, fontWeight:700, color:effColor(op.achievement), marginBottom:3 }}>{op.achievement}%</div>
                    <div style={{ height:4, background:'#F0F0F0', borderRadius:2 }}>
                      <div style={{ height:'100%', width:`${Math.min(op.achievement,100)}%`, background:effColor(op.achievement), borderRadius:2 }}/>
                    </div>
                  </div>
                  <span style={{ fontSize:12, color:'#555' }}>{op.bright.toFixed(2)}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:op.downtime>5?'#C62828':'#888' }}>{op.downtime.toFixed(1)}h</span>
                  <span style={{ fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:10, background:effBg(op.avgEff), color:effColor(op.avgEff) }}>{op.avgEff.toFixed(1)}%</span>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {op.machines.slice(0,3).map(m => (
                      <span key={m} style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4, background:'#1A1A1A', color:'#fff', cursor:'pointer' }}
                        onClick={() => setSelectedMachine(m)}>
                        {m}
                      </span>
                    ))}
                    {op.grades.slice(0,3).map(g => (
                      <span key={g} style={{ fontSize:10, padding:'1px 6px', borderRadius:4, background:pc.bg, color:pc.color }}>{g}</span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── DAILY LOG ── */}
      {view === 'daily' && (
        <div style={{ background:'#fff', border:'1px solid #EEE', borderRadius:12, overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'80px 65px 130px 110px 80px 60px 55px 55px 70px 65px 1fr', padding:'7px 14px', background:'#F8F8F8', borderBottom:'1px solid #EEE', fontSize:9, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.4em', gap:8 }}>
            {['Date','Shift','Operator','Machine','Process','Pcs','Plan','Achiev.','Eff%','Down','Remarks'].map(h=><span key={h}>{h}</span>)}
          </div>
          {dailyLogs.slice(0,200).map((l,i) => {
            const pc      = PROCESS_COLORS[l.process] || PROCESS_COLORS['CG']
            const sc      = SHIFT_COLORS[l.shift]     || SHIFT_COLORS['DAY']
            const ach     = l.target_pcs > 0 ? Math.round(l.pcs/l.target_pcs*100) : 0
            return (
              <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 65px 130px 110px 80px 60px 55px 55px 70px 65px 1fr', padding:'7px 14px', borderBottom:i<dailyLogs.length-1?'1px solid #F5F5F5':'none', gap:8, alignItems:'center', fontSize:11 }}>
                <span style={{ color:'#888' }}>{fmtDate(l.date)}</span>
                <span style={{ fontSize:10, padding:'1px 6px', borderRadius:20, background:sc.bg, color:sc.color, fontWeight:600, display:'inline-block' }}>{l.shift}</span>
                <span style={{ fontWeight:600, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.operator}</span>
                <span style={{ color:pc.color, fontWeight:500, cursor:'pointer', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                  onClick={() => setSelectedMachine(l.machine)}>
                  {l.machine}
                </span>
                <span style={{ fontSize:10, padding:'1px 5px', borderRadius:6, background:pc.bg, color:pc.color, fontWeight:600, display:'inline-block' }}>{l.process}</span>
                <span style={{ fontWeight:700, color:pc.color }}>{l.pcs}</span>
                <span style={{ color:'#AAA' }}>{l.target_pcs||'—'}</span>
                <span style={{ fontWeight:600, color:effColor(ach) }}>{ach>0?ach+'%':'—'}</span>
                <span style={{ fontSize:11, fontWeight:600, padding:'1px 6px', borderRadius:10, background:effBg(l.eff_act), color:effColor(l.eff_act) }}>{l.eff_act.toFixed(1)}%</span>
                <span style={{ fontSize:11, color:l.downtime>0?'#C62828':'#AAA' }}>{l.downtime>0?l.downtime.toFixed(1)+'h':'—'}</span>
                <span style={{ fontSize:10, color:'#854F0B', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.remarks||'—'}</span>
              </div>
            )
          })}
          {dailyLogs.length === 0 && (
            <div style={{ padding:48, textAlign:'center', color:'#AAA', fontSize:13 }}>No logs for this filter</div>
          )}
          {dailyLogs.length > 200 && (
            <div style={{ padding:12, textAlign:'center', fontSize:11, color:'#AAA', borderTop:'1px solid #EEE' }}>
              Showing 200 of {dailyLogs.length} entries
            </div>
          )}
        </div>
      )}

      {/* ── BY MACHINE ── */}
      {view === 'machines' && (
        <div>
          <div style={{ fontSize:12, color:'#AAA', marginBottom:14 }}>Click any machine card to see operators and grades</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:12 }}>
            {machineStats.map(m => {
              const pc = PROCESS_COLORS[m.process] || PROCESS_COLORS['CG']
              return (
                <div key={m.machine} onClick={() => setSelectedMachine(m.machine)}
                  style={{ background:'#fff', border:`1px solid #EEE`, borderTop:`3px solid ${pc.color}`, borderRadius:10, padding:16, cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow='none'}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'#111' }}>{m.machine}</div>
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:pc.bg, color:pc.color }}>{m.process}</span>
                  </div>
                  {m.info.type && <div style={{ fontSize:11, color:'#AAA', marginBottom:8 }}>{m.info.type}</div>}
                  {m.info.location && <div style={{ fontSize:11, color:'#888', marginBottom:10 }}>📍 {m.info.location}</div>}

                  <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
                    {[
                      { label:'Total pcs',    value:m.pcs.toLocaleString() },
                      { label:'Total MT',     value:m.bright.toFixed(3)    },
                      { label:'Avg eff.',     value:m.avgEff.toFixed(1)+'%', color:effColor(m.avgEff) },
                      { label:'Breakdown',    value:(m.breakdown_mins/60).toFixed(1)+'h', color:m.breakdown_mins>60?'#C62828':'#888' },
                      { label:'Shifts',       value:m.shifts               },
                    ].map(r => (
                      <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                        <span style={{ color:'#AAA' }}>{r.label}</span>
                        <span style={{ fontWeight:600, color:r.color||'#333' }}>{r.value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ height:4, background:'#F0F0F0', borderRadius:2, marginBottom:10 }}>
                    <div style={{ height:'100%', width:`${Math.min(m.avgEff,100)}%`, background:effColor(m.avgEff), borderRadius:2 }}/>
                  </div>

                  {/* Operator avatars */}
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                    {m.operators.slice(0,4).map(op => (
                      <Avatar key={op} name={op} bg={pc.bg} color={pc.color} size={24}/>
                    ))}
                    {m.operators.length > 4 && (
                      <div style={{ width:24, height:24, borderRadius:'50%', background:'#F0F0F0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#888' }}>
                        +{m.operators.length-4}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── SHIFTS ── */}
      {view === 'shifts' && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
            {['DAY','NIGHT'].map(sh => {
              const logs = filteredLogs.filter(l => l.shift===sh)
              const pcs  = logs.reduce((s,l) => s+l.pcs, 0)
              const eff  = logs.length > 0 ? logs.reduce((s,l) => s+l.eff_act, 0)/logs.length : 0
              const down = logs.reduce((s,l) => s+l.downtime, 0)
              const sc   = SHIFT_COLORS[sh]
              return (
                <div key={sh} style={{ padding:'16px 20px', background:'#fff', border:`1.5px solid ${sc.color}33`, borderRadius:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:sc.color }}>{sh} Shift</div>
                      <div style={{ fontSize:11, color:'#AAA' }}>{sh==='DAY'?'06:00 – 18:00':'18:00 – 06:00'} · {logs.length} entries</div>
                    </div>
                    <div style={{ fontSize:24, fontWeight:800, color:effColor(eff) }}>{eff.toFixed(1)}%</div>
                  </div>
                  <div style={{ height:5, background:'#F0F0F0', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
                    <div style={{ height:'100%', width:`${Math.min(eff,100)}%`, background:sc.color }}/>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                    {[['Total pcs',pcs.toLocaleString(),sc.color],['Downtime',`${down.toFixed(1)}h`,down>5?'#C62828':'#888'],['Shifts run',logs.length,'#333']].map(([l,v,c]) => (
                      <div key={l}>
                        <div style={{ fontSize:10, color:'#AAA' }}>{l}</div>
                        <div style={{ fontSize:15, fontWeight:700, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Operator shift comparison */}
          <div style={{ background:'#fff', border:'1px solid #EEE', borderRadius:12, overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'170px 80px 80px 80px 80px 80px 80px 80px', padding:'8px 14px', background:'#F8F8F8', borderBottom:'1px solid #EEE', fontSize:9, fontWeight:700, color:'#AAA', textTransform:'uppercase', letterSpacing:'0.5px', gap:8 }}>
              <span>Operator</span>
              <span>Process</span>
              <span style={{ color:'#0F6E56' }}>DAY pcs</span>
              <span style={{ color:'#0F6E56' }}>DAY eff</span>
              <span style={{ color:'#534AB7' }}>NIGHT pcs</span>
              <span style={{ color:'#534AB7' }}>NIGHT eff</span>
              <span>Best shift</span>
              <span>Machine</span>
            </div>
            {operatorStats.map((op,i) => {
              const pc        = PROCESS_COLORS[op.process] || PROCESS_COLORS['CG']
              const dayLogs   = op.logs.filter(l => l.shift==='DAY')
              const nightLogs = op.logs.filter(l => l.shift==='NIGHT')
              const dayEff    = dayLogs.length   > 0 ? dayLogs.reduce((s,l)=>s+l.eff_act,0)/dayLogs.length   : 0
              const nightEff  = nightLogs.length > 0 ? nightLogs.reduce((s,l)=>s+l.eff_act,0)/nightLogs.length : 0
              const bestShift = dayEff >= nightEff ? 'DAY' : 'NIGHT'
              const bsc       = SHIFT_COLORS[bestShift]
              return (
                <div key={op.operator} style={{ display:'grid', gridTemplateColumns:'170px 80px 80px 80px 80px 80px 80px 80px', padding:'9px 14px', borderBottom:i<operatorStats.length-1?'1px solid #F5F5F5':'none', gap:8, alignItems:'center' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Avatar name={op.operator} bg={pc.bg} color={pc.color} size={26}/>
                    <div style={{ fontSize:12, fontWeight:600, color:'#111', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{op.operator}</div>
                  </div>
                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:6, background:pc.bg, color:pc.color, display:'inline-block' }}>{op.process}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:op.dayPcs>0?'#0F6E56':'#DDD' }}>{op.dayPcs>0?op.dayPcs:'—'}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:effColor(dayEff) }}>{dayEff>0?dayEff.toFixed(1)+'%':'—'}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:op.nightPcs>0?'#534AB7':'#DDD' }}>{op.nightPcs>0?op.nightPcs:'—'}</span>
                  <span style={{ fontSize:12, fontWeight:600, color:effColor(nightEff) }}>{nightEff>0?nightEff.toFixed(1)+'%':'—'}</span>
                  {(op.dayShifts>0 && op.nightShifts>0) ? (
                    <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20, background:bsc.bg, color:bsc.color, display:'inline-block' }}>{bestShift}</span>
                  ) : (
                    <span style={{ fontSize:11, color:'#AAA' }}>Single</span>
                  )}
                  <span style={{ fontSize:11, color:'#555', cursor:'pointer' }} onClick={() => setSelectedMachine(op.machines[0])}>
                    {op.machines[0]||'—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}