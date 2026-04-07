import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBatches } from '../context/BatchContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STAGE_ORDER = [
  'RM Receive', 'UT Inspection', 'HT Process', 'Black Bar Str.',
  'Peeling', 'Bright Bar Str.', 'Grinding', 'Cutting',
  'Chamfering', 'Polishing', 'MPI Final', 'Packing', 'Dispatch'
]

const PRIORITY_COLOR = {
  'Critical': { border: '#E53935', bg: '#FFEBEE', color: '#E53935', label: 'Critical' },
  'Warning':  { border: '#FB8C00', bg: '#FFF8F0', color: '#FB8C00', label: 'Warning'  },
  'On Track': { border: '#43A047', bg: '#F0FAF4', color: '#43A047', label: 'On track'  },
}

const STAGE_COLOR = {
  'RM Receive':      '#71a518',
  'UT Inspection':   '#185FA5',
  'HT Process':      '#161610',
  'Black Bar Str.':  '#FB8C00',
  'Peeling':         '#E8642A',
  'Bright Bar Str.': '#E8642A',
  'Grinding':        '#E8642A',
  'Cutting':         '#9C27B0',
  'Chamfering':      '#9C27B0',
  'Polishing':       '#9C27B0',
  'MPI Final':       '#E53935',
  'Packing':         '#43A047',
  'Dispatch':        '#43A047',
}

function BatchCard({ batch }) {
  const navigate = useNavigate()
  const p = PRIORITY_COLOR[batch.priority] || PRIORITY_COLOR['On Track']
  const weightT = (Number(batch.weight_kg || 0) / 1000).toFixed(1)
  const hrs = batch.stage_logs?.length ? (batch.stage_logs.length * 3.2).toFixed(1) : '0.5'
  const limit = batch.priority === 'Critical' ? '6h/12h' : batch.priority === 'Warning' ? '4h/8h' : '8h/16h'
  const urgency = batch.priority === 'Critical' ? 'high' : batch.priority === 'Warning' ? 'high' : null

  return (
    <div
      onClick={() => navigate('/batches')}
      style={{
        background: '#fff',
        border: `1px solid ${p.border}`,
        borderTop: `3px solid ${p.border}`,
        borderRadius: 10,
        padding: '14px 16px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      {/* Batch no + priority */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>
          #{batch.batch_card_no}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: p.bg, color: p.color }}>
          {p.label}
        </span>
      </div>

      {/* Grade · pcs · weight */}
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        {batch.grade_code} · {batch.no_of_pcs} pcs · {weightT}t
      </div>

      {/* Stage */}
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 2 }}>
        {batch.current_stage}
      </div>

      {/* Shed */}
      <div style={{ fontSize: 12, color: '#AAA', marginBottom: 12 }}>
        {batch.shed || 'Shed 1'}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: '#F0F0F0', marginBottom: 10 }} />

      {/* Progress bar */}
      <div style={{ height: 3, background: '#F0F0F0', borderRadius: 2, marginBottom: 10 }}>
        <div style={{
          height: '100%',
          width: `${Math.round(((batch.current_stage_index || 0) / (STAGE_ORDER.length - 1)) * 100)}%`,
          background: p.border,
          borderRadius: 2,
        }} />
      </div>

      {/* Time + urgency */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#AAA' }}>
          {hrs}h · limit {limit}
        </span>
        {urgency && (
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
            background: batch.priority === 'Critical' ? '#FFEBEE' : '#FFF3E0',
            color: p.color,
          }}>
            {urgency}
          </span>
        )}
      </div>

      {/* Customer */}
      <div style={{ fontSize: 12, fontWeight: 500, color: '#444' }}>
        {batch.customer || '—'}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { batches, refreshBatches } = useBatches()
  const [tab, setTab]               = useState('floor')
  const [shedFilter, setShedFilter] = useState('All sheds')
  const [criticalOnly, setCriticalOnly] = useState(false)
  const [search, setSearch]         = useState('')
  const [summary, setSummary]       = useState(null)

  useEffect(() => {
    refreshBatches()
    async function loadSummary() {
      try {
        const r = await fetch(`${API}/api/dashboard/summary`)
        if (!r.ok) return
        const data = await r.json()
        setSummary(data)
      } catch (e) {
        console.log('Using local batch data for dashboard')
      }
    }
    loadSummary()
  }, [])

  const filteredBatches = batches.filter(b => {
    const matchShed     = shedFilter === 'All sheds' || b.shed === shedFilter
    const matchCritical = !criticalOnly || b.priority === 'Critical'
    const matchSearch   = !search ||
      b.batch_card_no?.includes(search) ||
      b.grade_code?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer?.toLowerCase().includes(search.toLowerCase()) ||
      b.heat_no?.toLowerCase().includes(search.toLowerCase())
    return matchShed && matchCritical && matchSearch
  })

  const total      = summary?.total_batches    ?? batches.length
  const critical   = summary?.critical         ?? batches.filter(b => b.priority === 'Critical').length
  const warning    = summary?.warning          ?? batches.filter(b => b.priority === 'Warning').length
  const onTrack    = summary?.on_track         ?? batches.filter(b => b.priority === 'On Track').length
  const totalMT    = summary?.total_mt         ?? batches.reduce((s, b) => s + Number(b.weight_kg||0)/1000, 0)
  const orders     = summary?.total_orders     ?? 0
  const dispatches = summary?.total_dispatches ?? 0
  const stageDist  = summary?.stage_distribution || {}

  // Stage pills — count + weight per stage
  const stagePills = STAGE_ORDER.map(stage => {
    const bs    = batches.filter(b => b.current_stage === stage)
    const count = stageDist[stage] ?? bs.length
    const mt    = bs.reduce((s, b) => s + Number(b.weight_kg||0)/1000, 0)
    const hasCritical = bs.some(b => b.priority === 'Critical')
    return { stage, count, mt, hasCritical }
  }).filter(s => s.count > 0)

  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ padding: '24px 28px', background: '#F7F8FA', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginBottom: 4 }}>Live floor</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#43A047' }} />
            <span style={{ fontSize: 12, color: '#43A047', fontWeight: 500 }}>Updated {now}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ height: 36, padding: '0 16px', fontSize: 13, border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setTab(tab === 'floor' ? 'analytics' : 'floor')}
          >
            {tab === 'floor' ? 'Pipeline view' : 'Live view'}
          </button>
          <button
            style={{ height: 36, padding: '0 16px', fontSize: 13, border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => { refreshBatches(); loadSummary() }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* KPI cards — 4 cards matching screenshot */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'ACTIVE BATCHES', value: total,                            sub: `${Number(totalMT).toFixed(1)}t in production`, color: '#185FA5' },
          { label: 'ON TRACK',       value: onTrack,                          sub: 'within threshold',                             color: '#43A047' },
          { label: 'WARNING',        value: warning,                          sub: 'approaching limit',                            color: '#FB8C00' },
          { label: 'CRITICAL',       value: critical,                         sub: 'exceeded threshold',                           color: '#E53935' },
        ].map(k => (
          <div key={k.label} style={{
            background: '#fff',
            border: '1px solid #EEEEEE',
            borderRadius: 10,
            padding: '18px 20px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: k.color, borderRadius: '10px 10px 0 0' }} />
            <div style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>
              {k.label}
            </div>
            <div style={{ fontSize: 38, fontWeight: 800, color: k.color, lineHeight: 1, marginBottom: 6 }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: '#AAA' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Live floor tab */}
      {tab === 'floor' && (
        <>
          {/* Shed filter pills */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['All sheds', 'Shed 1', 'Shed 2', 'Shed 3'].map(s => (
                <button key={s} onClick={() => { setShedFilter(s); setCriticalOnly(false) }}
                  style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                    cursor: 'pointer', border: '1px solid #E5E5E5',
                    background: shedFilter === s && !criticalOnly ? '#1A1A1A' : '#fff',
                    color: shedFilter === s && !criticalOnly ? '#fff' : '#555',
                  }}>
                  {s}
                </button>
              ))}
              <button onClick={() => setCriticalOnly(!criticalOnly)}
                style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', border: '1px solid #E5E5E5',
                  background: criticalOnly ? '#1A1A1A' : '#fff',
                  color: criticalOnly ? '#fff' : '#555',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                Critical
                {critical > 0 && (
                  <span style={{
                    background: '#E53935', color: '#fff', borderRadius: '50%',
                    width: 18, height: 18, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 10, fontWeight: 700,
                  }}>{critical}</span>
                )}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Sort dropdown */}
              <select style={{ height: 34, fontSize: 12, padding: '0 28px 0 10px', border: '1px solid #E5E5E5', borderRadius: 8, background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23AAA'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
                <option>Most urgent</option>
                <option>Newest first</option>
                <option>By stage</option>
              </select>
              {/* Search */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', height: 34, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 8, minWidth: 220 }}>
                <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
                  <circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/>
                  <path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <input type="text" placeholder="Search batch, grade, customer"
                  value={search} onChange={e => setSearch(e.target.value)}
                  style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, background: 'transparent' }} />
              </div>
            </div>
          </div>

          {/* Stage pills row */}
          {stagePills.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4, flexWrap: 'wrap' }}>
              {stagePills.map(s => (
                <div key={s.stage} style={{
                  background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8,
                  padding: '8px 14px', minWidth: 90, flexShrink: 0,
                }}>
                  <div style={{ fontSize: 11, color: '#888', marginBottom: 2, whiteSpace: 'nowrap' }}>{s.stage}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A' }}>{s.count}</span>
                    {s.hasCritical && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#E53935', background: '#FFEBEE', padding: '1px 5px', borderRadius: 3 }}>
                        {batches.filter(b => b.current_stage === s.stage && b.priority === 'Critical').length} crit
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#AAA' }}>{s.mt.toFixed(1)}t</div>
                </div>
              ))}
            </div>
          )}

          {/* Batch grid — 2 columns like screenshot */}
          {filteredBatches.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 10, padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 8 }}>No batches on floor</div>
              <div style={{ fontSize: 12, color: '#AAA', marginBottom: 16 }}>Create a batch card to get started</div>
              <button className="btn btn-primary" onClick={() => navigate('/batches/new')}>+ New batch card</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {filteredBatches.map(batch => (
                <BatchCard key={batch.batch_card_no} batch={batch} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Analytics tab */}
      {tab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 16 }}>Stage distribution</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {STAGE_ORDER.map(stage => {
                const count    = stageDist[stage] || batches.filter(b => b.current_stage === stage).length
                const maxCount = Math.max(...STAGE_ORDER.map(s => stageDist[s] || batches.filter(b => b.current_stage === s).length), 1)
                const color    = STAGE_COLOR[stage]
                return (
                  <div key={stage}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#555' }}>{stage}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: count > 0 ? color : '#CCC' }}>{count}</span>
                    </div>
                    <div style={{ height: 4, background: '#F0F0F0', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${(count / maxCount) * 100}%`, background: color, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 16 }}>Priority breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Critical', value: critical, color: '#E53935' },
                { label: 'Warning',  value: warning,  color: '#FB8C00' },
                { label: 'On Track', value: onTrack,  color: '#43A047' },
              ].map(p => (
                <div key={p.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: p.color }}>{p.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: p.color }}>{p.value}</span>
                  </div>
                  <div style={{ height: 8, background: '#F0F0F0', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${total > 0 ? (p.value / total) * 100 : 0}%`, background: p.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#AAA', marginTop: 3 }}>
                    {total > 0 ? Math.round((p.value / total) * 100) : 0}% of total batches
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F0F0F0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 12 }}>Quick links</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'View all batches',    path: '/batches',        color: '#E8642A' },
                  { label: 'Alert centre',        path: '/alerts',         color: '#E53935' },
                  { label: 'Production tracking', path: '/production-log', color: '#185FA5' },
                  { label: 'Material log',        path: '/material-log',   color: '#9C27B0' },
                ].map(link => (
                  <button key={link.path} onClick={() => navigate(link.path)}
                    style={{ fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 6, cursor: 'pointer', border: '1px solid #EEEEEE', background: '#FAFAFA', color: link.color, textAlign: 'left' }}>
                    → {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}