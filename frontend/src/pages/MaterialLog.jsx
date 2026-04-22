import { useState, useEffect } from 'react'
import { useBatches } from '../context/BatchContext'

const API = import.meta.env.VITE_API_URL || ''

const STAGE_ORDER = [
  'RM Receive', 'UT Inspection', 'HT Process', 'Black Bar Str.',
  'Peeling', 'Bright Bar Str.', 'Grinding', 'Cutting',
  'Chamfering', 'Polishing', 'MPI Final', 'Packing', 'Dispatch'
]

const STAGE_COLOR = {
  'RM Receive':      '#185FA5',
  'UT Inspection':   '#185FA5',
  'HT Process':      '#FB8C00',
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

const PRIORITY_COLOR = {
  'Critical': '#E53935',
  'Warning':  '#FB8C00',
  'On Track': '#43A047',
}

export default function MaterialLog() {
  const { batches: contextBatches } = useBatches()
  const [batches, setBatches]   = useState(contextBatches)
  const [view, setView]         = useState('stage')
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    async function loadMaterialLog() {
      try {
        const r = await fetch(`${API}/api/material-log`)
        if (!r.ok) return
        const data = await r.json()
        if (data && data.length > 0) setBatches(data)
        else setBatches(contextBatches)
      } catch (e) {
        setBatches(contextBatches)
      }
    }
    loadMaterialLog()
  }, [])

  const filtered = batches.filter(b =>
    !search ||
    b.batch_card_no?.includes(search) ||
    b.grade_code?.toLowerCase().includes(search.toLowerCase()) ||
    b.customer?.toLowerCase().includes(search.toLowerCase()) ||
    b.heat_no?.toLowerCase().includes(search.toLowerCase())
  )

  const byStage = {}
  STAGE_ORDER.forEach(s => { byStage[s] = [] })
  filtered.forEach(b => {
    const stage = b.current_stage || 'RM Receive'
    if (byStage[stage]) byStage[stage].push(b)
    else byStage[stage] = [b]
  })

  const totalMT  = batches.reduce((s, b) => s + Number(b.weight_kg || 0) / 1000, 0)
  const totalPcs = batches.reduce((s, b) => s + Number(b.no_of_pcs || 0), 0)

  return (
    <div style={{ padding: '20px 28px', background: '#F7F8FA', minHeight: '100vh' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>Material log</div>
          <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>
            {batches.length} batches · {totalPcs} pcs · {totalMT.toFixed(2)} MT
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', height: 34, background: '#fff', border: '1px solid #E5E5E5', borderRadius: 6, minWidth: 240 }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search batch, grade, customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 12, flex: 1, background: 'transparent' }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #EEEEEE', marginBottom: 16 }}>
        {[
          { key: 'stage', label: 'Stage map' },
          { key: 'table', label: 'Table view' },
        ].map(t => (
          <button key={t.key} onClick={() => setView(t.key)} style={{
            fontSize: 13, fontWeight: 500, padding: '8px 16px',
            cursor: 'pointer', border: 'none', background: 'transparent',
            color: view === t.key ? '#111' : '#AAA',
            borderBottom: view === t.key ? '2px solid #E8642A' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stage map — left to right pipeline */}
      {view === 'stage' && (
        <div style={{
          display: 'flex', flexDirection: 'row', alignItems: 'flex-start',
          overflowX: 'auto', paddingBottom: 16, gap: 0
        }}>
          {STAGE_ORDER.map((stage, i) => {
            const stageBatches = byStage[stage] || []
            const color = STAGE_COLOR[stage]
            const stageMT = stageBatches.reduce((s, b) => s + Number(b.weight_kg || 0) / 1000, 0)
            return (
              <div key={stage} style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', flexShrink: 0 }}>

                {/* Stage card */}
                <div style={{
                  width: 180, background: '#fff',
                  border: '1px solid #EEEEEE', borderTop: `3px solid ${color}`,
                  borderRadius: 8, padding: '10px 12px 12px', flexShrink: 0
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {stage}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: '#AAA' }}>{stageMT.toFixed(1)}T</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: stageBatches.length > 0 ? color : '#CCC' }}>
                      {stageBatches.length}
                    </span>
                  </div>

                  {stageBatches.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#CCC', marginTop: 6 }}>Empty</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                      {stageBatches.slice(0, 4).map(b => (
                        <div key={b.batch_card_no}
                          onClick={() => setSelected(selected === b.batch_card_no ? null : b.batch_card_no)}
                          style={{
                            padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${selected === b.batch_card_no ? color : '#EEEEEE'}`,
                            background: selected === b.batch_card_no ? color + '10' : '#FAFAFA',
                          }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace' }}>
                              #{b.batch_card_no}
                            </span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: PRIORITY_COLOR[b.priority] }}>
                              {b.priority}
                            </span>
                          </div>
                          <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                            {b.grade_code} · {b.size_mm}mm
                          </div>
                          <div style={{ fontSize: 10, color: '#AAA', marginTop: 1 }}>
                            {b.customer || '—'}
                          </div>
                          {selected === b.batch_card_no && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${color}30`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                              {[
                                ['Heat no.',   b.heat_no],
                                ['No. of pcs', b.no_of_pcs],
                                ['Weight',     `${(Number(b.weight_kg || 0) / 1000).toFixed(2)}T`],
                                ['HT',         b.ht_process || '—'],
                              ].map(([label, value]) => (
                                <div key={label}>
                                  <div style={{ fontSize: 9, color: '#AAA' }}>{label}</div>
                                  <div style={{ fontSize: 10, fontWeight: 500, color: '#333' }}>{value}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {stageBatches.length > 4 && (
                        <div style={{ fontSize: 10, color: '#AAA', textAlign: 'center', padding: '4px 0' }}>
                          +{stageBatches.length - 4} more
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Connector arrow */}
                {i < STAGE_ORDER.length - 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingTop: 18, flexShrink: 0 }}>
                    <div style={{ width: 12, height: 2, background: '#DDDDDD' }} />
                    <div style={{ width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: '6px solid #DDDDDD' }} />
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #EEEEEE', background: '#FAFAFA' }}>
                {['Batch no.','Grade','Size (mm)','Heat no.','Customer','No. of pcs','Weight (MT)','HT process','Current stage','Priority'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 11, fontWeight: 600, color: '#888', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, idx) => (
                <tr key={b.batch_card_no} style={{ borderBottom: '1px solid #F5F5F5', background: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#E8642A', fontSize: 12 }}>
                      #{b.batch_card_no}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 500 }}>{b.grade_code}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>{b.size_mm} mm</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#555' }}>{b.heat_no}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>{b.customer || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12 }}>{b.no_of_pcs}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 500 }}>{(Number(b.weight_kg || 0) / 1000).toFixed(3)} T</td>
                  <td style={{ padding: '9px 12px', fontSize: 11, color: '#555' }}>{b.ht_process || '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: (STAGE_COLOR[b.current_stage] || '#888') + '18', color: STAGE_COLOR[b.current_stage] || '#888' }}>
                      {b.current_stage}
                    </span>
                  </td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: PRIORITY_COLOR[b.priority] + '18', color: PRIORITY_COLOR[b.priority] }}>
                      {b.priority}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: '#AAA', fontSize: 12 }}>
              No batches found
            </div>
          )}
        </div>
      )}

    </div>
  )
}