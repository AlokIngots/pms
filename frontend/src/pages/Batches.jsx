import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const API = ''

const STAGES = [
  'RM Receive', 'UT Inspection', 'HT Process', 'Black Bar Str.',
  'Peeling', 'Bright Bar Str.', 'Grinding', 'Cutting',
  'Chamfering', 'Polishing', 'MPI Final', 'Packing', 'Dispatch'
]

const PRIORITY_STYLE = {
  'Critical': { bg: '#FCEBEB', color: '#A32D2D', border: '#E57373' },
  'Warning':  { bg: '#FAEEDA', color: '#854F0B', border: '#FFB74D' },
  'On Track': { bg: '#E1F5EE', color: '#085041', border: '#5DCAA5' },
  'Normal':   { bg: '#E1F5EE', color: '#085041', border: '#5DCAA5' },
}

const STAGE_COLOR = {
  'RM Receive':     '#9E9E9E',
  'UT Inspection':  '#5C6BC0',
  'HT Process':     '#EF6C00',
  'Black Bar Str.': '#6D4C41',
  'Peeling':        '#00897B',
  'Bright Bar Str.':'#558B2F',
  'Grinding':       '#1565C0',
  'Cutting':        '#AD1457',
  'Chamfering':     '#6A1B9A',
  'Polishing':      '#00838F',
  'MPI Final':      '#E53935',
  'Packing':        '#2E7D32',
  'Dispatch':       '#1B5E20',
}

// ── Stage Update Modal ──────────────────────────────────────────
function StageUpdateModal({ batch, onClose, onDone }) {
  const [machines, setMachines] = useState([])
  const [form, setForm] = useState({
    operator: '', machine_code: '', shift: 'A',
    qty_pcs_in: batch.no_of_pcs || '', qty_pcs_out: '',
    qty_rejected: 0, weight_kg_in: '', weight_kg_out: '',
    remarks: '',
  })
  const [saving, setSaving] = useState(false)

  const nextStageIdx = STAGES.indexOf(batch.current_stage) + 1
  const nextStage    = STAGES[nextStageIdx] || 'Dispatch'
  const isLast       = batch.current_stage === 'Dispatch'

  useEffect(() => {
    fetch(`${API}/api/machines/${encodeURIComponent(batch.current_stage)}`)
      .then(r => r.json())
      .then(data => setMachines(Array.isArray(data) ? data : []))
      .catch(() => setMachines([]))
  }, [batch.current_stage])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setSaving(true)
    try {
      // 1. Log machine usage
      await fetch(`${API}/api/batches/${batch.id}/machine-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage_name:    batch.current_stage,
          machine_code:  form.machine_code,
          operator_name: form.operator,
          shift:         form.shift,
          qty_pcs_in:    form.qty_pcs_in   || null,
          qty_pcs_out:   form.qty_pcs_out  || null,
          qty_rejected:  form.qty_rejected || 0,
          weight_kg_in:  form.weight_kg_in  || null,
          weight_kg_out: form.weight_kg_out || null,
          remarks:       form.remarks,
        }),
      })

      // 2. Move to next stage
      await fetch(`${API}/api/batches/${batch.id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_stage: nextStage,
          log: {
            stage:       batch.current_stage,
            operator:    form.operator,
            machine:     form.machine_code,
            shift:       form.shift,
            input_size:  '',
            output_size: '',
            remarks:     form.remarks,
          }
        }),
      })

      onDone()
    } catch (e) {
      alert('Error: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (isLast) return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'#fff', borderRadius:12, padding:32, textAlign:'center', maxWidth:400 }}>
        <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:8 }}>All stages complete!</div>
        <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>Batch {batch.batch_card_no} is ready for dispatch.</div>
        <button onClick={onClose} style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'10px 24px', fontWeight:600, cursor:'pointer' }}>Close</button>
      </div>
    </div>
  )

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:560, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* Header */}
        <div style={{ padding:'16px 20px', borderBottom:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>Complete Stage</div>
            <div style={{ fontSize:11, color:'#888', marginTop:2 }}>
              Batch <span style={{ color:'#E8642A', fontWeight:600 }}>#{batch.batch_card_no}</span> — {batch.grade_code} {batch.size_mm}mm
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'#AAA' }}>×</button>
        </div>

        {/* Stage arrow */}
        <div style={{ padding:'12px 20px', background:'#F7F8FA', display:'flex', alignItems:'center', gap:12, fontSize:12 }}>
          <span style={{ background:STAGE_COLOR[batch.current_stage]||'#888', color:'#fff', padding:'4px 12px', borderRadius:20, fontWeight:600 }}>
            {batch.current_stage}
          </span>
          <span style={{ color:'#888', fontSize:16 }}>→</span>
          <span style={{ background:STAGE_COLOR[nextStage]||'#888', color:'#fff', padding:'4px 12px', borderRadius:20, fontWeight:600 }}>
            {nextStage}
          </span>
        </div>

        {/* Form */}
        <div style={{ padding:20 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Operator Name</label>
              <input value={form.operator} onChange={e => set('operator', e.target.value)}
                placeholder="Operator name" style={inp()} />
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Machine</label>
              {machines.length > 0 ? (
                <select value={form.machine_code} onChange={e => set('machine_code', e.target.value)} style={inp()}>
                  <option value="">Select machine</option>
                  {machines.map(m => <option key={m.machine_code} value={m.machine_code}>{m.machine_name}</option>)}
                </select>
              ) : (
                <input value={form.machine_code} onChange={e => set('machine_code', e.target.value)}
                  placeholder="Machine code" style={inp()} />
              )}
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Shift</label>
              <select value={form.shift} onChange={e => set('shift', e.target.value)} style={inp()}>
                <option>A</option><option>B</option><option>C</option>
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Pcs In</label>
              <input type="number" value={form.qty_pcs_in} onChange={e => set('qty_pcs_in', e.target.value)} style={inp()} />
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Pcs Out</label>
              <input type="number" value={form.qty_pcs_out} onChange={e => set('qty_pcs_out', e.target.value)} style={inp()} />
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Rejected Pcs</label>
              <input type="number" value={form.qty_rejected} onChange={e => set('qty_rejected', e.target.value)}
                style={{ ...inp(), borderColor: Number(form.qty_rejected) > 0 ? '#E53935' : '#E0E0E0', color: Number(form.qty_rejected) > 0 ? '#E53935' : '#111' }} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Weight In (kg)</label>
              <input type="number" value={form.weight_kg_in} onChange={e => set('weight_kg_in', e.target.value)} style={inp()} />
            </div>
            <div>
              <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Weight Out (kg)</label>
              <input type="number" value={form.weight_kg_out} onChange={e => set('weight_kg_out', e.target.value)} style={inp()} />
            </div>
          </div>

          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#555",marginBottom:4}}>Remarks</label>
            <input value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional remarks" style={inp()} />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid #F0F0F0', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ background:'#fff', color:'#555', border:'1px solid #E0E0E0', borderRadius:6, padding:'8px 16px', fontSize:12, cursor:'pointer' }}>Cancel</button>
          <button onClick={handleSubmit} disabled={saving} style={{ background:saving?'#ccc':'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', fontSize:12, fontWeight:600, cursor:saving?'not-allowed':'pointer' }}>
            {saving ? 'Saving...' : `✓ Complete & Move to ${nextStage}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function lbl() { return { fontSize:11, fontWeight:600, color:'#555', display:'block', marginBottom:4 } }
function inp() { return { width:'100%', padding:'6px 10px', fontSize:12, border:'1px solid #E0E0E0', borderRadius:6, outline:'none', background:'#fff', boxSizing:'border-box' } }

// ── Stage Progress Bar ──────────────────────────────────────────
function StageProgress({ currentStage }) {
  const idx = STAGES.indexOf(currentStage)
  return (
    <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginBottom:10 }}>
      {STAGES.map((s, i) => {
        const done    = i < idx
        const current = i === idx
        return (
          <div key={s} style={{
            fontSize:9, padding:'2px 6px', borderRadius:3,
            background: done ? '#E8F5E9' : current ? STAGE_COLOR[s]||'#E8642A' : '#F5F5F5',
            color: done ? '#2E7D32' : current ? '#fff' : '#AAA',
            fontWeight: current ? 700 : 400,
            border: `1px solid ${done ? '#A5D6A7' : current ? 'transparent' : '#EEEEEE'}`,
          }}>
            {done ? '✓ ' : current ? '▶ ' : ''}{s}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Batches Page ───────────────────────────────────────────
export default function Batches() {
  const navigate = useNavigate()
  const [batches,    setBatches]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [stageFilter,setStageFilter]= useState('')
  const [priFilter,  setPriFilter]  = useState('')
  const [selected,   setSelected]   = useState(null)
  const [stageModal, setStageModal] = useState(null)
  const [machineLog, setMachineLog] = useState({})

  const loadBatches = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/batches`)
      const data = await r.json()
      setBatches(Array.isArray(data) ? data : [])
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBatches() }, [loadBatches])

  async function loadMachineLog(batchId) {
    if (machineLog[batchId]) return
    try {
      const r = await fetch(`${API}/api/batches/${batchId}/machine-log`)
      const data = await r.json()
      setMachineLog(prev => ({ ...prev, [batchId]: data }))
    } catch(e) {}
  }

  const filtered = batches.filter(b => {
    const ms = !search ||
      b.batch_card_no?.includes(search) ||
      b.heat_no?.toLowerCase().includes(search.toLowerCase()) ||
      (b.grade_code||'').toLowerCase().includes(search.toLowerCase()) ||
      (b.customer||'').toLowerCase().includes(search.toLowerCase()) ||
      (b.so_number||'').toLowerCase().includes(search.toLowerCase())
    const mst = !stageFilter || b.current_stage === stageFilter
    const mp  = !priFilter   || b.priority === priFilter
    return ms && mst && mp
  })

  const stageCount = {}
  STAGES.forEach(s => { stageCount[s] = batches.filter(b => b.current_stage === s).length })

  return (
    <div style={{ padding:'20px 28px', background:'#F7F8FA', minHeight:'100vh' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>Batch Tracking</div>
          <div style={{ fontSize:12, color:'#AAA', marginTop:2 }}>{batches.length} batches on floor</div>
        </div>
        <button onClick={() => navigate('/batches/new')} style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          + New Batch Card
        </button>
      </div>

      {/* Stage summary pills */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:16 }}>
        {STAGES.filter(s => stageCount[s] > 0).map(s => (
          <div key={s} onClick={() => setStageFilter(stageFilter===s?'':s)} style={{
            fontSize:11, padding:'4px 10px', borderRadius:20, cursor:'pointer',
            background: stageFilter===s ? STAGE_COLOR[s]||'#888' : '#fff',
            color: stageFilter===s ? '#fff' : '#555',
            border: `1px solid ${stageFilter===s ? 'transparent' : '#E0E0E0'}`,
            fontWeight: stageFilter===s ? 600 : 400,
          }}>
            {s} <strong>{stageCount[s]}</strong>
          </div>
        ))}
        {stageFilter && (
          <button onClick={() => setStageFilter('')} style={{ fontSize:11, padding:'4px 10px', borderRadius:20, cursor:'pointer', background:'#FEE2E2', color:'#E53935', border:'none' }}>
            ✕ Clear filter
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'0 12px', height:34, background:'#fff', border:'1px solid #E5E5E5', borderRadius:6, minWidth:300 }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/><path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search batch no., grade, customer, SO..."
            style={{ border:'none', outline:'none', fontSize:12, flex:1, background:'transparent' }} />
        </div>
        <select value={priFilter} onChange={e => setPriFilter(e.target.value==='All priorities'?'':e.target.value)}
          style={{ height:34, fontSize:12, padding:'0 12px', border:'1px solid #E5E5E5', borderRadius:6, background:'#fff' }}>
          {['All priorities','Critical','Warning','On Track','Normal'].map(o => <option key={o}>{o}</option>)}
        </select>
        <button onClick={loadBatches} style={{ height:34, padding:'0 14px', fontSize:12, background:'#fff', border:'1px solid #E5E5E5', borderRadius:6, cursor:'pointer', color:'#555' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Batch list */}
      {loading ? (
        <div style={{ textAlign:'center', padding:48, color:'#AAA' }}>Loading batches...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(batch => {
            const pri    = PRIORITY_STYLE[batch.priority] || PRIORITY_STYLE['On Track']
            const isOpen = selected === batch.id
            return (
              <div key={batch.id}>
                {/* Row */}
                <div onClick={() => { setSelected(isOpen?null:batch.id); if(!isOpen) loadMachineLog(batch.id) }}
                  style={{
                    background:'#fff', borderRadius: isOpen ? '8px 8px 0 0' : 8,
                    border:`1px solid ${isOpen?'#E8642A':'#EEEEEE'}`,
                    borderLeft:`4px solid ${pri.border}`,
                    padding:'10px 16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer',
                  }}>

                  <div style={{ minWidth:90 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#E8642A', fontFamily:'monospace' }}>#{batch.batch_card_no}</div>
                    {batch.so_number && <div style={{ fontSize:9, color:'#888', marginTop:1 }}>SO: {batch.so_number.split('/')[3]||batch.so_number}</div>}
                  </div>

                  <div style={{ minWidth:100 }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:1 }}>Grade</div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#185FA5' }}>{batch.grade_code}</div>
                  </div>

                  <div style={{ minWidth:55 }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:1 }}>Size</div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{batch.size_mm} mm</div>
                  </div>

                  <div style={{ minWidth:60 }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:1 }}>Heat No.</div>
                    <div style={{ fontSize:11 }}>{batch.heat_no||'—'}</div>
                  </div>

                  <div style={{ minWidth:70 }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:1 }}>Customer</div>
                    <div style={{ fontSize:11 }}>{batch.customer||'—'}</div>
                  </div>

                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:3 }}>Current Stage</div>
                    <span style={{
                      fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
                      background: STAGE_COLOR[batch.current_stage]||'#888', color:'#fff',
                    }}>{batch.current_stage}</span>
                  </div>

                  <div style={{ minWidth:55, textAlign:'right' }}>
                    <div style={{ fontSize:10, color:'#888', marginBottom:1 }}>Weight</div>
                    <div style={{ fontSize:12, fontWeight:500 }}>{(Number(batch.weight_kg)/1000).toFixed(2)} T</div>
                  </div>

                  <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:pri.bg, color:pri.color }}>{batch.priority||'On Track'}</span>

                  <button onClick={e => { e.stopPropagation(); window.open(`${API}/api/pdf/batch-card/${batch.id}`,'_blank') }}
                    style={{ background:'#fff', color:'#555', border:'1px solid #E0E0E0', borderRadius:4, padding:'3px 8px', fontSize:11, cursor:'pointer', whiteSpace:'nowrap' }}>
                    🖨 Print
                  </button>

                  <span style={{ fontSize:12, color:'#AAA' }}>{isOpen?'▲':'▼'}</span>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ background:'#fff', border:'1px solid #E8642A', borderTop:'none', borderRadius:'0 0 8px 8px', padding:16 }}>

                    {/* Stage progress */}
                    <StageProgress currentStage={batch.current_stage} />

                    {/* Details grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px 16px', marginBottom:14, padding:12, background:'#FAFAFA', borderRadius:6 }}>
                      {[
                        ['Heat No.',    batch.heat_no||'—'],
                        ['No. of Pcs',  batch.no_of_pcs||'—'],
                        ['Tolerance',   batch.tolerance||'—'],
                        ['HT Process',  batch.ht_process||'—'],
                        ['Prepared By', batch.prepared_by||'—'],
                        ['SO Number',   batch.so_number||'—'],
                        ['Customer',    batch.customer||'—'],
                        ['Shed',        batch.shed||'—'],
                        ['Status',      batch.status||'—'],
                        ['Weight (kg)', batch.weight_kg||'—'],
                      ].map(([label,value]) => (
                        <div key={label}>
                          <div style={{ fontSize:10, color:'#AAA', marginBottom:2 }}>{label}</div>
                          <div style={{ fontSize:11, fontWeight:500, color:'#333' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Machine log history */}
                    {machineLog[batch.id] && machineLog[batch.id].length > 0 && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', color:'#AAA', marginBottom:8 }}>Stage History</div>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          {machineLog[batch.id].map((log, i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, fontSize:11, padding:'6px 10px', background:'#F5F5F5', borderRadius:6, flexWrap:'wrap' }}>
                              <span style={{ background:STAGE_COLOR[log.stage_name]||'#888', color:'#fff', padding:'2px 8px', borderRadius:3, fontSize:10, fontWeight:600, minWidth:100 }}>{log.stage_name}</span>
                              {log.operator_name && <span>👤 {log.operator_name}</span>}
                              {log.machine_code  && <span>⚙️ {log.machine_code}</span>}
                              {log.shift         && <span>🕐 Shift {log.shift}</span>}
                              {log.qty_pcs_in    && <span>In: {log.qty_pcs_in} pcs</span>}
                              {log.qty_pcs_out   && <span>Out: {log.qty_pcs_out} pcs</span>}
                              {Number(log.qty_rejected) > 0 && <span style={{ color:'#E53935', fontWeight:600 }}>❌ {log.qty_rejected} rejected</span>}
                              {log.remarks       && <span style={{ color:'#888' }}>📝 {log.remarks}</span>}
                              <span style={{ marginLeft:'auto', color:'#AAA', fontSize:10 }}>{log.logged_at ? new Date(log.logged_at).toLocaleString('en-GB') : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                      {batch.current_stage !== 'Dispatch' && (
                        <button onClick={() => setStageModal(batch)} style={{ background:'#E8642A', color:'#fff', border:'none', borderRadius:6, padding:'8px 16px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                          ▶ Update Stage →
                        </button>
                      )}
                      {batch.current_stage === 'Dispatch' && (
                        <span style={{ background:'#E8F5E9', color:'#2E7D32', padding:'6px 14px', borderRadius:6, fontSize:12, fontWeight:600 }}>✓ Complete — Ready for Dispatch</span>
                      )}
                      <button onClick={() => window.open(`${API}/api/pdf/batch-card/${batch.id}`,'_blank')}
                        style={{ background:'#fff', color:'#555', border:'1px solid #E0E0E0', borderRadius:6, padding:'7px 14px', fontSize:12, cursor:'pointer' }}>
                        📄 Batch Card PDF
                      </button>
                      <button onClick={() => window.open(`${API}/api/pdf/mtc/${batch.id}`,'_blank')}
                        style={{ background:'#fff', color:'#555', border:'1px solid #E0E0E0', borderRadius:6, padding:'7px 14px', fontSize:12, cursor:'pointer' }}>
                        📄 MTC PDF
                      </button>
                      <div style={{ marginLeft:'auto', display:'flex', gap:6 }}>
                        {['Critical','Warning','On Track'].map(p => (
                          <button key={p} onClick={async () => {
                            await fetch(`${API}/api/batches/${batch.id}/priority`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({priority:p}) })
                            loadBatches()
                          }} style={{
                            fontSize:10, padding:'3px 8px', borderRadius:4, cursor:'pointer', border:'none',
                            background: batch.priority===p ? (PRIORITY_STYLE[p]?.bg||'#eee') : '#F5F5F5',
                            color: batch.priority===p ? (PRIORITY_STYLE[p]?.color||'#333') : '#AAA',
                            fontWeight: batch.priority===p ? 700 : 400,
                          }}>{p}</button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && !loading && (
            <div style={{ textAlign:'center', padding:48, color:'#AAA', background:'#fff', borderRadius:8, border:'1px solid #EEEEEE' }}>
              {batches.length === 0 ? 'No batches yet — create one from a Sales Order' : 'No batches match your search'}
            </div>
          )}
        </div>
      )}

      {/* Stage Update Modal */}
      {stageModal && (
        <StageUpdateModal
          batch={stageModal}
          onClose={() => setStageModal(null)}
          onDone={() => {
            setStageModal(null)
            setMachineLog({})
            loadBatches()
          }}
        />
      )}
    </div>
  )
}
