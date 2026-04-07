import { useState, useEffect } from 'react'
import { useBatches } from '../context/BatchContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const SAMPLE_ALERTS = [
  { id: 1, batch_card_no: '1068', grade: '316L',       customer: 'Caprari',   stage: 'Grinding',       severity: 'Critical', hours_stuck: 18.5, acknowledged: 0, created_at: '2026-03-31T08:00:00' },
  { id: 2, batch_card_no: '1069', grade: '431',        customer: 'Grundfos',  stage: 'HT Process',     severity: 'Warning',  hours_stuck: 9.2,  acknowledged: 0, created_at: '2026-03-31T09:00:00' },
  { id: 3, batch_card_no: '1070', grade: '420C',       customer: 'Flowserve', stage: 'Cutting',        severity: 'Warning',  hours_stuck: 7.8,  acknowledged: 0, created_at: '2026-03-31T10:00:00' },
  { id: 4, batch_card_no: '1067', grade: '1.4021/420', customer: 'Wilo SE',   stage: 'Peeling',        severity: 'Critical', hours_stuck: 22.1, acknowledged: 1, created_at: '2026-03-30T10:00:00' },
  { id: 5, batch_card_no: '1071', grade: '1.4462',     customer: 'Sulzer',    stage: 'MPI Final',      severity: 'Warning',  hours_stuck: 6.5,  acknowledged: 0, created_at: '2026-03-31T11:00:00' },
]

const SEVERITY_STYLE = {
  Critical: { bg: '#FFEBEE', color: '#E53935', border: '#E53935' },
  Warning:  { bg: '#FFF3E0', color: '#FB8C00', border: '#FB8C00' },
}

export default function AlertCentre() {
  const { batches } = useBatches()
  const [alerts, setAlerts]           = useState(SAMPLE_ALERTS)
  const [search, setSearch]           = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [showAcknowledged, setShowAcknowledged] = useState(false)
  const [loading, setLoading]         = useState(false)

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadAlerts() {
    try {
      const r = await fetch(`${API}/api/alerts`)
      if (!r.ok) return
      const data = await r.json()
      if (data && data.length > 0) setAlerts(data)
    } catch (e) {
      console.log('Using sample alerts')
    }
  }

  async function acknowledge(id) {
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, acknowledged: 1, acknowledged_at: new Date().toISOString() } : a
    ))
    try {
      await fetch(`${API}/api/alerts/${id}/acknowledge`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (e) {
      console.error('Failed to acknowledge alert', e)
    }
  }

  const filtered = alerts.filter(a => {
    const matchSearch   = !search || a.batch_card_no?.includes(search) || a.stage?.toLowerCase().includes(search.toLowerCase()) || a.customer?.toLowerCase().includes(search.toLowerCase())
    const matchSeverity = !severityFilter || a.severity === severityFilter
    const matchAck      = showAcknowledged ? true : !a.acknowledged
    return matchSearch && matchSeverity && matchAck
  })

  const total    = alerts.length
  const critical = alerts.filter(a => a.severity === 'Critical' && !a.acknowledged).length
  const warning  = alerts.filter(a => a.severity === 'Warning'  && !a.acknowledged).length
  const acked    = alerts.filter(a => a.acknowledged).length

  return (
    <div style={{ padding: '20px 28px', background: '#F7F8FA', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>Alert centre</div>
          <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>Auto-refreshes every 5 minutes</div>
        </div>
        <button className="btn" onClick={loadAlerts}>↻ Refresh now</button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total alerts',   value: total,    color: '#185FA5' },
          { label: 'Critical',       value: critical, color: '#E53935' },
          { label: 'Warning',        value: warning,  color: '#FB8C00' },
          { label: 'Acknowledged',   value: acked,    color: '#43A047' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #EEEEEE', borderTop: `3px solid ${k.color}`, borderRadius: 8, padding: '16px 20px', flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#AAA', marginBottom: 10 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', height: 34, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 6, minWidth: 260 }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Search batch, stage, customer..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, background: 'transparent' }} />
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value === 'All severities' ? '' : e.target.value)}
          style={{ height: 34, fontSize: 12, padding: '0 28px 0 10px', border: '1px solid #E5E5E5', borderRadius: 6, background: '#fff', appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23AAA'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
          <option>All severities</option>
          <option>Critical</option>
          <option>Warning</option>
        </select>
        <button
          onClick={() => setShowAcknowledged(!showAcknowledged)}
          style={{ height: 34, fontSize: 12, fontWeight: 500, padding: '0 14px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${showAcknowledged ? '#43A047' : '#E5E5E5'}`, background: showAcknowledged ? '#E8F5E9' : '#fff', color: showAcknowledged ? '#43A047' : '#555' }}>
          {showAcknowledged ? '✓ Showing all' : 'Show acknowledged'}
        </button>
      </div>

      {/* Alert cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, padding: 48, textAlign: 'center', color: '#AAA', fontSize: 13 }}>
            {alerts.length === 0 ? 'No alerts — all batches are on track 🎉' : 'No alerts match your filter'}
          </div>
        ) : (
          filtered.map(alert => {
            const s = SEVERITY_STYLE[alert.severity]
            const batch = batches.find(b => b.batch_card_no === alert.batch_card_no)
            return (
              <div key={alert.id} style={{
                background: alert.acknowledged ? '#FAFAFA' : '#fff',
                border: `1px solid ${alert.acknowledged ? '#EEEEEE' : s.border}`,
                borderLeft: `4px solid ${alert.acknowledged ? '#CCC' : s.border}`,
                borderRadius: 8,
                padding: '14px 18px',
                opacity: alert.acknowledged ? 0.7 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 4, background: s.bg, color: s.color }}>
                      {alert.severity}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#E8642A', fontFamily: 'monospace' }}>
                      #{alert.batch_card_no}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                      {alert.stage}
                    </span>
                    <span style={{ fontSize: 12, color: '#AAA' }}>
                      {alert.customer} · {alert.grade}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.color }}>
                      {alert.hours_stuck}h stuck
                    </span>
                    {!alert.acknowledged ? (
                      <button
                        onClick={() => acknowledge(alert.id)}
                        className="btn btn-sm"
                        style={{ borderColor: s.border, color: s.color }}>
                        Acknowledge
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: '#43A047', fontWeight: 500 }}>✓ Acknowledged</span>
                    )}
                  </div>
                </div>
                {batch && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #F5F5F5', display: 'flex', gap: 20, fontSize: 11, color: '#AAA' }}>
                    <span>Size: <strong style={{ color: '#555' }}>{batch.size_mm}mm</strong></span>
                    <span>Heat: <strong style={{ color: '#555' }}>{batch.heat_no}</strong></span>
                    <span>Stage: <strong style={{ color: '#555' }}>{batch.current_stage}</strong></span>
                    <span>Priority: <strong style={{ color: '#555' }}>{batch.priority}</strong></span>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}