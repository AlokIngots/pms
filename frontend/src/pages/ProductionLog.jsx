import { useState, useEffect } from 'react'
import { useBatches } from '../context/BatchContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STAGE_ORDER = [
  'RM Receive', 'UT Inspection', 'HT Process', 'Black Bar Str.',
  'Peeling', 'Bright Bar Str.', 'Grinding', 'Cutting',
  'Chamfering', 'Polishing', 'MPI Final', 'Packing', 'Dispatch'
]

const STAGE_SHORT = {
  'RM Receive':      'Roll',
  'UT Inspection':   'UT',
  'HT Process':      'HT',
  'Black Bar Str.':  'Stra',
  'Peeling':         'Peel',
  'Bright Bar Str.': 'BStr',
  'Grinding':        'Grin',
  'Cutting':         'Cutt',
  'Chamfering':      'Cham',
  'Polishing':       'Pol',
  'MPI Final':       'QC',
  'Packing':         'Pack',
  'Dispatch':        'Disp',
}

// Active stage colors — only used when stage is CURRENT
const STAGE_COLOR = {
  'RM Receive':      '#37474F',
  'UT Inspection':   '#1565C0',
  'HT Process':      '#E65100',
  'Black Bar Str.':  '#546E7A',
  'Peeling':         '#E8642A',
  'Bright Bar Str.': '#546E7A',
  'Grinding':        '#37474F',
  'Cutting':         '#6A1B9A',
  'Chamfering':      '#6A1B9A',
  'Polishing':       '#00838F',
  'MPI Final':       '#E65100',
  'Packing':         '#2E7D32',
  'Dispatch':        '#2E7D32',
}

// Completed stage color — same dark grey for all
const DONE_COLOR = '#37474F'

const PRIORITY_STYLE = {
  'Critical': { bg: '#FFEBEE', color: '#E53935', dot: '#E53935' },
  'Warning':  { bg: '#FFF3E0', color: '#FB8C00', dot: '#FB8C00' },
  'On Track': { bg: '#E8F5E9', color: '#43A047', dot: '#43A047' },
}

function GanttView({ batches }) {
  const groups = {}
  batches.forEach(b => {
    const key = b.customer || 'Unknown'
    if (!groups[key]) groups[key] = []
    groups[key].push(b)
  })

  return (
    <div>
      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px 220px 80px 120px 220px 120px 90px',
        padding: '8px 16px',
        borderBottom: '2px solid #EEEEEE',
        gap: 8,
        marginBottom: 8,
      }}>
        {['SO / CUSTOMER', 'GRADE', 'QTY', 'DUE', 'BATCH PROGRESS', 'ALERTS', 'TYPE'].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {h}
          </div>
        ))}
      </div>

      {Object.entries(groups).map(([customer, batchList], gi) => {
        const totalMT      = batchList.reduce((s, b) => s + Number(b.weight_kg||0)/1000, 0)
        const critCount    = batchList.filter(b => b.priority === 'Critical').length
        const warnCount    = batchList.filter(b => b.priority === 'Warning').length
        const grades       = [...new Set(batchList.map(b => b.grade_code).filter(Boolean))].join(' / ')
        const soNum        = `EXP-${141 + gi}`
        const daysLeft     = 3 + gi * 2
        const overdue      = daysLeft < 0
        const borderColor  = critCount > 0 ? '#E53935' : warnCount > 0 ? '#FB8C00' : '#43A047'
        const completedPct = Math.round(((batchList[0]?.current_stage_index || 0) / 12) * 100)

        return (
          <div key={customer} style={{ marginBottom: 8, border: '1px solid #EEEEEE', borderRadius: 10, overflow: 'hidden' }}>

            {/* SO header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '200px 220px 80px 120px 220px 120px 90px',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#FAFAFA',
              gap: 8,
              borderLeft: `3px solid ${borderColor}`,
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A1A' }}>{soNum}</div>
                <div style={{ fontSize: 11, color: '#AAA', marginTop: 1 }}>Started · {gi+1}d elapsed</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#333', marginBottom: 4 }}>{customer}</div>
                {grades && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: '#1A1A1A', color: '#fff' }}>
                    {grades}
                  </span>
                )}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#333' }}>{totalMT.toFixed(1)}t</div>
                <div style={{ fontSize: 10, color: '#AAA' }}>{batchList.length} batch{batchList.length !== 1 ? 'es' : ''}</div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: overdue ? '#E53935' : '#333' }}>
                  {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                </div>
                <div style={{ fontSize: 10, color: '#AAA' }}>
                  {new Date(Date.now() + daysLeft * 86400000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#AAA', marginBottom: 4 }}>
                  <span>{Math.ceil(batchList.length/2)}/{batchList.length} done</span>
                  <span>{completedPct}%</span>
                </div>
                <div style={{ height: 4, background: '#E8E8E8', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${completedPct}%`, background: '#1A1A1A', borderRadius: 2 }} />
                </div>
              </div>
              <div>
                {critCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#FFEBEE', color: '#E53935', border: '1px solid #FFCDD2' }}>
                    {critCount} Critical
                  </span>
                )}
                {critCount === 0 && warnCount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#FFF3E0', color: '#FB8C00', border: '1px solid #FFE0B2' }}>
                    {warnCount} Warning
                  </span>
                )}
                {critCount === 0 && warnCount === 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#E8F5E9', color: '#43A047', border: '1px solid #C8E6C9' }}>
                    ● On Track
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 20, background: '#1A1A1A', color: '#fff' }}>
                  Export
                </span>
              </div>
            </div>

            {/* Batch rows header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '120px 110px 70px 1fr 90px 110px',
              padding: '6px 16px',
              background: '#F8F8F8',
              gap: 8,
              borderTop: '1px solid #EEEEEE',
              borderBottom: '1px solid #EEEEEE',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>BATCH</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STATUS</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>QTY</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>STAGE TIMELINE →</span>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {Object.entries(STAGE_COLOR).slice(0, 7).map(([stage, color]) => (
                    <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                      <span style={{ fontSize: 8, color: '#AAA' }}>{STAGE_SHORT[stage]}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: 8, color: '#AAA' }}>■ = active</span>
                </div>
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>IN STAGE</div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>CURRENT</div>
            </div>

            {/* Batch rows */}
            {batchList.map(batch => {
              const p       = PRIORITY_STYLE[batch.priority] || PRIORITY_STYLE['On Track']
              const weightT = (Number(batch.weight_kg||0)/1000).toFixed(1)
              const hrs     = batch.stage_logs?.length ? (batch.stage_logs.length * 3.2).toFixed(1) : '—'
              return (
                <div key={batch.batch_card_no} style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 110px 70px 1fr 90px 110px',
                  alignItems: 'center',
                  padding: '10px 16px',
                  background: '#fff',
                  borderBottom: '1px solid #F5F5F5',
                  gap: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>B-{batch.batch_card_no}</div>
                    <div style={{ fontSize: 10, color: '#AAA', marginTop: 1 }}>{batch.grade_code} · {batch.size_mm}mm</div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: p.bg, color: p.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                      {batch.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{weightT}t</div>

                  {/* Stage pills */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {STAGE_ORDER.map((stage, idx) => {
                      const done    = idx < (batch.current_stage_index || 0)
                      const current = idx === (batch.current_stage_index || 0)
                      if (!done && !current) return null
                      const activeColor = STAGE_COLOR[stage]
                      return (
                        <div key={stage} style={{
                          padding: '3px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: current ? activeColor : DONE_COLOR,
                          color: '#fff',
                          whiteSpace: 'nowrap',
                        }}>
                          {STAGE_SHORT[stage]}
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {hrs !== '—' && (
                      <span style={{ fontSize: 12, color: batch.priority === 'Critical' ? '#E53935' : '#888', display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end' }}>
                        {batch.priority === 'Critical' && <span style={{ color: '#E53935', fontSize: 10 }}>▲</span>}
                        {hrs}h
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: p.bg, color: p.color, display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: p.dot, flexShrink: 0 }} />
                      {batch.priority}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {batches.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: '#AAA', fontSize: 13 }}>
          No batches in production
        </div>
      )}
    </div>
  )
}

function ActivityLog({ logs }) {
  if (logs.length === 0) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#AAA', fontSize: 12 }}>
      No activity logs yet
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {logs.map((log, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 16px', background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: (STAGE_COLOR[log.stage] || '#888') + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 14 }}>⚙</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#E8642A', fontFamily: 'monospace' }}>
                #{log.batch_card_no}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 3, background: (STAGE_COLOR[log.stage] || '#888') + '18', color: STAGE_COLOR[log.stage] || '#888' }}>
                {log.stage}
              </span>
              {log.operator && <span style={{ fontSize: 11, color: '#AAA' }}>by {log.operator}</span>}
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 11, color: '#AAA', flexWrap: 'wrap' }}>
              {log.shift        && <span>Shift {log.shift}</span>}
              {log.input_size   && <span>Input: {log.input_size}mm</span>}
              {log.output_size  && <span>Output: {log.output_size}mm</span>}
              {log.ovality      && <span>Ovality: {log.ovality}</span>}
              {log.remarks      && <span>Remarks: {log.remarks}</span>}
              {log.duration_mins && <span style={{ color: '#E8642A', fontWeight: 500 }}>Duration: {log.duration_mins}m</span>}
            </div>
            <div style={{ fontSize: 10, color: '#CCC', marginTop: 3 }}>
              {log.logged_at ? new Date(log.logged_at).toLocaleString('en-IN') : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CycleTime({ logs }) {
  const byStage = {}
  logs.forEach(log => {
    if (!log.duration_mins || !log.stage) return
    if (!byStage[log.stage]) byStage[log.stage] = []
    byStage[log.stage].push(Number(log.duration_mins))
  })
  const stages = Object.entries(byStage).map(([stage, times]) => ({
    stage,
    avg: Math.round(times.reduce((s, t) => s + t, 0) / times.length),
    min: Math.min(...times),
    max: Math.max(...times),
    count: times.length,
  })).sort((a, b) => b.avg - a.avg)

  if (stages.length === 0) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#AAA', fontSize: 12 }}>
      No cycle time data yet — complete some stages to see data here
    </div>
  )
  const maxAvg = Math.max(...stages.map(s => s.avg), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {stages.map(s => (
        <div key={s.stage} style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{s.stage}</span>
            <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
              <span style={{ color: '#AAA' }}>Min: <strong style={{ color: '#43A047' }}>{s.min}m</strong></span>
              <span style={{ color: '#AAA' }}>Avg: <strong style={{ color: '#E8642A' }}>{s.avg}m</strong></span>
              <span style={{ color: '#AAA' }}>Max: <strong style={{ color: '#E53935' }}>{s.max}m</strong></span>
              <span style={{ color: '#AAA' }}>Count: <strong style={{ color: '#185FA5' }}>{s.count}</strong></span>
            </div>
          </div>
          <div style={{ height: 6, background: '#F0F0F0', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${(s.avg / maxAvg) * 100}%`, background: STAGE_COLOR[s.stage] || '#E8642A', borderRadius: 3 }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ProductionLog() {
  const { batches } = useBatches()
  const [tab, setTab]       = useState('gantt')
  const [logs, setLogs]     = useState([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadLogs() {
      try {
        const r = await fetch(`${API}/api/production-log`)
        if (!r.ok) return
        const data = await r.json()
        if (data) setLogs(data)
      } catch (e) {
        console.log('No production logs yet')
      }
    }
    loadLogs()
  }, [])

  const criticalCount = batches.filter(b => b.priority === 'Critical').length
  const totalMT       = batches.reduce((s, b) => s + Number(b.weight_kg||0)/1000, 0)

  const filteredBatches = batches.filter(b =>
    !search ||
    b.batch_card_no?.includes(search) ||
    b.grade_code?.toLowerCase().includes(search.toLowerCase()) ||
    b.customer?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredLogs = logs.filter(l =>
    !search ||
    l.batch_card_no?.includes(search) ||
    l.stage?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '20px 28px', background: '#F7F8FA', minHeight: '100vh', fontFamily: "'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>Production Tracking</div>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#E8F5E9', color: '#43A047', border: '1px solid #C8E6C9', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#43A047', display: 'inline-block' }} />
            Live
          </span>
          {criticalCount > 0 && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: '#FFEBEE', color: '#E53935', border: '1px solid #FFCDD2', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E53935', display: 'inline-block' }} />
              {criticalCount} critical
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', height: 34, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 8, minWidth: 260 }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Search batch, grade, stage..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, background: 'transparent' }} />
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#AAA', marginBottom: 20 }}>
        {batches.length} batches · {logs.length} stage logs · {totalMT.toFixed(1)}t in production
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #EEEEEE', marginBottom: 20, gap: 4 }}>
        {[
          { key: 'gantt',    label: 'Gantt' },
          { key: 'activity', label: 'Activity Log' },
          { key: 'cycle',    label: 'Cycle Time' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize: 14, fontWeight: tab === t.key ? 700 : 400,
            padding: '8px 20px', cursor: 'pointer',
            border: 'none', background: 'transparent',
            color: tab === t.key ? '#1A1A1A' : '#AAA',
            borderBottom: tab === t.key ? '2px solid #1A1A1A' : '2px solid transparent',
            marginBottom: -2,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'gantt'    && <GanttView    batches={filteredBatches} />}
      {tab === 'activity' && <ActivityLog  logs={filteredLogs} />}
      {tab === 'cycle'    && <CycleTime    logs={logs} />}
    </div>
  )
}