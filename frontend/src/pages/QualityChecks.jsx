import React, { useState, useEffect } from 'react'
import { useBatches } from '../context/BatchContext'

const API = import.meta.env.VITE_API_URL || ''

const SAMPLE_QC = [
  { id: 1, batch_card_no: '1067', heat_no: 'A14319', grade: '1.4021/420', size_mm: 110, check_type: 'UT Inspection',  date: '2026-03-28', inspector: 'Pandit',  result: 'OK',      pcs_received: 11, ut_ok: 10, ut_reject: 1, end_cut_wt: 0.268, remarks: 'One piece rejected — surface crack' },
  { id: 2, batch_card_no: '1068', heat_no: 'A14298', grade: '316L',       size_mm: 24,  check_type: 'MPI Final',      date: '2026-03-27', inspector: 'Rajan',   result: 'Not OK',  pcs_received: 24, ut_ok: 22, ut_reject: 2, end_cut_wt: 0.180, remarks: 'Ovality 0.12mm — exceeds limit' },
  { id: 3, batch_card_no: '1069', heat_no: 'A14291', grade: '431',        size_mm: 8,   check_type: 'HT Process',     date: '2026-03-26', inspector: 'Suresh',  result: 'OK',      pcs_received: 8,  ut_ok: 8,  ut_reject: 0, end_cut_wt: 0.100, remarks: '' },
  { id: 4, batch_card_no: '1070', heat_no: 'A14305', grade: '420C',       size_mm: 20,  check_type: 'UT Inspection',  date: '2026-03-25', inspector: 'Mohan',   result: 'OK',      pcs_received: 20, ut_ok: 20, ut_reject: 0, end_cut_wt: 0.220, remarks: '' },
  { id: 5, batch_card_no: '1071', heat_no: 'A14312', grade: '1.4462',     size_mm: 6,   check_type: 'MPI Final',      date: '2026-03-24', inspector: 'Kamlesh', result: 'Pending', pcs_received: 6,  ut_ok: 0,  ut_reject: 0, end_cut_wt: 0.000, remarks: 'Awaiting inspector' },
]

const RESULT_STYLE = {
  'OK':      { bg: '#E8F5E9', color: '#2E7D32' },
  'Not OK':  { bg: '#FFEBEE', color: '#C62828' },
  'Pending': { bg: '#FFF3E0', color: '#E65100' },
}

const INSPECTORS = ['Pandit', 'Rajan', 'Suresh', 'Mohan', 'Kamlesh']

const EMPTY_FORM = {
  batch_card_no: '', heat_no: '', grade: '', size_mm: '',
  check_type: 'UT Inspection', date: new Date().toISOString().slice(0, 10),
  inspector: '', pcs_received: '', ut_ok: '', ut_reject: '',
  mpi_reject: '', total_ok_pcs: '', ok_wt_mt: '', rej_wt_mt: '',
  furnace_no: '', hardness: '', tensile: '', result: 'Pending', remarks: '',
}

function NewQCModal({ onClose, onSave, batches }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  function set(f, v) {
    setForm(prev => ({ ...prev, [f]: v }))
    setErrors(e => ({ ...e, [f]: '' }))
  }

  function validate() {
    const errs = {}
    if (!form.batch_card_no) errs.batch_card_no = 'Required'
    if (!form.inspector)     errs.inspector     = 'Required'
    if (!form.check_type)    errs.check_type    = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const batch = batches.find(b => b.batch_card_no === form.batch_card_no)
    onSave({
      ...form,
      id:      Date.now(),
      heat_no: batch?.heat_no    || form.heat_no,
      grade:   batch?.grade_code || form.grade,
      size_mm: batch?.size_mm    || form.size_mm,
    })
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth:600, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #EEEEEE', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:15, fontWeight:700, color:'#111' }}>New QC entry</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#AAA' }}>×</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:20 }}>
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#AAA', marginBottom:12, paddingBottom:6, borderBottom:'1px solid #F0F0F0' }}>
              A — Batch reference
            </div>
            <div className="form-grid form-grid-2" style={{ marginBottom:10 }}>
              <div className="field">
                <label className="field-label">Batch card no. <span className="req">*</span></label>
                <select value={form.batch_card_no} onChange={e => set('batch_card_no', e.target.value)} className={errors.batch_card_no?'error':''}>
                  <option value="">Select batch</option>
                  {batches.map(b => (
                    <option key={b.batch_card_no} value={b.batch_card_no}>
                      #{b.batch_card_no} — {b.grade_code} — {b.heat_no}
                    </option>
                  ))}
                </select>
                {errors.batch_card_no && <span className="field-error">{errors.batch_card_no}</span>}
              </div>
              <div className="field">
                <label className="field-label">Check type <span className="req">*</span></label>
                <select value={form.check_type} onChange={e => set('check_type', e.target.value)}>
                  <option>UT Inspection</option>
                  <option>HT Process</option>
                  <option>MPI Final</option>
                </select>
              </div>
            </div>
            <div className="form-grid form-grid-3">
              <div className="field">
                <label className="field-label">Date</label>
                <input type="date" value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">Inspector <span className="req">*</span></label>
                <select value={form.inspector} onChange={e => set('inspector', e.target.value)} className={errors.inspector?'error':''}>
                  <option value="">Select inspector</option>
                  {INSPECTORS.map(i => <option key={i}>{i}</option>)}
                </select>
                {errors.inspector && <span className="field-error">{errors.inspector}</span>}
              </div>
              <div className="field">
                <label className="field-label">Result</label>
                <select value={form.result} onChange={e => set('result', e.target.value)}>
                  <option>Pending</option>
                  <option>OK</option>
                  <option>Not OK</option>
                </select>
              </div>
            </div>
          </div>

          {(form.check_type === 'UT Inspection' || form.check_type === 'MPI Final') && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#AAA', marginBottom:12, paddingBottom:6, borderBottom:'1px solid #F0F0F0' }}>
                B — Inspection data
              </div>
              <div className="form-grid form-grid-3" style={{ marginBottom:10 }}>
                <div className="field"><label className="field-label">Pcs received</label><input type="number" value={form.pcs_received} onChange={e => set('pcs_received', e.target.value)} /></div>
                <div className="field"><label className="field-label">UT OK</label><input type="number" value={form.ut_ok} onChange={e => set('ut_ok', e.target.value)} /></div>
                <div className="field"><label className="field-label">UT reject</label><input type="number" value={form.ut_reject} onChange={e => set('ut_reject', e.target.value)} /></div>
              </div>
              <div className="form-grid form-grid-3">
                <div className="field"><label className="field-label">MPI reject</label><input type="number" value={form.mpi_reject} onChange={e => set('mpi_reject', e.target.value)} /></div>
                <div className="field"><label className="field-label">Total OK pcs</label><input type="number" value={form.total_ok_pcs} onChange={e => set('total_ok_pcs', e.target.value)} /></div>
                <div className="field"><label className="field-label">End cut wt (kg)</label><input type="number" value={form.end_cut_wt} onChange={e => set('end_cut_wt', e.target.value)} /></div>
              </div>
            </div>
          )}

          {form.check_type === 'HT Process' && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#AAA', marginBottom:12, paddingBottom:6, borderBottom:'1px solid #F0F0F0' }}>
                B — HT data
              </div>
              <div className="form-grid form-grid-3">
                <div className="field"><label className="field-label">Furnace no.</label><input type="text" value={form.furnace_no} onChange={e => set('furnace_no', e.target.value)} /></div>
                <div className="field"><label className="field-label">Hardness (HB)</label><input type="text" value={form.hardness} onChange={e => set('hardness', e.target.value)} /></div>
                <div className="field"><label className="field-label">Tensile (MPa)</label><input type="text" value={form.tensile} onChange={e => set('tensile', e.target.value)} /></div>
              </div>
            </div>
          )}

          <div className="field">
            <label className="field-label">Remarks</label>
            <textarea value={form.remarks} onChange={e => set('remarks', e.target.value)} rows={2} style={{ resize:'none' }} />
          </div>
        </div>
        <div style={{ padding:'12px 20px', borderTop:'1px solid #EEEEEE', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save QC entry</button>
        </div>
      </div>
    </div>
  )
}

export default function QualityChecks() {
  const { batches } = useBatches()
  const [records, setRecords]           = useState(SAMPLE_QC)
  const [search, setSearch]             = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [showModal, setShowModal]       = useState(false)
  const [selected, setSelected]         = useState(null)

  useEffect(() => {
    async function loadQC() {
      try {
        const r = await fetch(`${API}/api/qc`)
        if (!r.ok) return
        const data = await r.json()
        if (data && data.length > 0) setRecords(data)
      } catch (e) {
        console.log('Using sample QC data')
      }
    }
    loadQC()
  }, [])

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.batch_card_no?.includes(search) ||
      r.heat_no?.toLowerCase().includes(search.toLowerCase()) ||
      r.grade?.toLowerCase().includes(search.toLowerCase()) ||
      r.inspector?.toLowerCase().includes(search.toLowerCase())
    const matchType   = !typeFilter   || r.check_type === typeFilter
    const matchResult = !resultFilter || r.result     === resultFilter
    return matchSearch && matchType && matchResult
  })

  const total   = records.length
  const ok      = records.filter(r => r.result === 'OK').length
  const notOk   = records.filter(r => r.result === 'Not OK').length
  const pending = records.filter(r => r.result === 'Pending').length

  async function handleSave(entry) {
    try {
      const r = await fetch(`${API}/api/qc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      const data = await r.json()
      if (data.id) entry.id = data.id
    } catch (e) {
      console.error('Failed to save QC entry', e)
    }
    setRecords(prev => [entry, ...prev])
    setShowModal(false)
  }

  return (
    <div style={{ padding:'20px 28px', background:'#F7F8FA', minHeight:'100vh' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <div style={{ fontSize:22, fontWeight:700, color:'#111' }}>Quality checks</div>
          <div style={{ fontSize:12, color:'#AAA', marginTop:2 }}>Screen 5 — UT inspection, HT process, MPI final</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New QC entry</button>
      </div>

      <div style={{ display:'flex', gap:12, marginBottom:20 }}>
        {[
          { label:'Total checks',  value:total,   color:'#185FA5' },
          { label:'Passed (OK)',   value:ok,      color:'#43A047' },
          { label:'Failed',        value:notOk,   color:'#E53935' },
          { label:'Pending',       value:pending,  color:'#FB8C00' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', border:'1px solid #EEEEEE', borderTop:`3px solid ${k.color}`, borderRadius:8, padding:'16px 20px', flex:1 }}>
            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:'#AAA', marginBottom:10 }}>{k.label}</div>
            <div style={{ fontSize:32, fontWeight:800, color:k.color, lineHeight:1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:14, alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:7, padding:'0 12px', height:34, background:'#fff', border:'1px solid #E5E5E5', borderRadius:6, minWidth:260 }}>
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="#CCC" strokeWidth="1.3"/>
            <path d="M9 9l2.5 2.5" stroke="#CCC" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Search batch, heat no., grade, inspector..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ border:'none', outline:'none', fontSize:12, flex:1, background:'transparent' }} />
        </div>
        {[
          { value:typeFilter,   onChange:setTypeFilter,   options:['All check types','UT Inspection','HT Process','MPI Final'] },
          { value:resultFilter, onChange:setResultFilter, options:['All results','OK','Not OK','Pending'] },
        ].map((sel, i) => (
          <select key={i} value={sel.value} onChange={e => sel.onChange(e.target.value===sel.options[0]?'':e.target.value)}
            style={{ height:34, fontSize:12, padding:'0 28px 0 10px', border:'1px solid #E5E5E5', borderRadius:6, background:'#fff', appearance:'none', backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23AAA'/%3E%3C/svg%3E\")", backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
            {sel.options.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div style={{ background:'#fff', border:'1px solid #EEEEEE', borderRadius:8, overflow:'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Batch no.</th>
              <th>Heat no.</th>
              <th>Grade</th>
              <th>Check type</th>
              <th>Date</th>
              <th>Inspector</th>
              <th>Pcs received</th>
              <th>UT OK / Reject</th>
              <th>End cut (kg)</th>
              <th>Result</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <React.Fragment key={r.id}>
                <tr style={{ cursor:'pointer' }} onClick={() => setSelected(selected===r.id?null:r.id)}>
                  <td><span style={{ fontFamily:'monospace', fontWeight:700, color:'#E8642A', fontSize:12 }}>#{r.batch_card_no}</span></td>
                  <td style={{ fontSize:11, color:'#555' }}>{r.heat_no}</td>
                  <td style={{ fontSize:12, fontWeight:500 }}>{r.grade}</td>
                  <td><span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'#F5F5F5', color:'#555' }}>{r.check_type}</span></td>
                  <td style={{ fontSize:11, color:'#888' }}>{r.date}</td>
                  <td style={{ fontSize:12 }}>{r.inspector}</td>
                  <td style={{ fontSize:12 }}>{r.pcs_received||'—'}</td>
                  <td style={{ fontSize:12 }}>
                    {r.ut_ok||r.ut_reject
                      ? <span><span style={{ color:'#43A047', fontWeight:600 }}>{r.ut_ok}</span>{' / '}<span style={{ color:'#E53935', fontWeight:600 }}>{r.ut_reject}</span></span>
                      : '—'}
                  </td>
                  <td style={{ fontSize:12 }}>{r.end_cut_wt?`${r.end_cut_wt} kg`:'—'}</td>
                  <td>
                    <span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:4, background:RESULT_STYLE[r.result]?.bg, color:RESULT_STYLE[r.result]?.color }}>
                      {r.result}
                    </span>
                  </td>
                  <td style={{ fontSize:11, color:'#AAA', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.remarks||'—'}</td>
                </tr>
                {selected === r.id && (
                  <tr>
                    <td colSpan={11} style={{ background:'#FAFAFA', padding:'12px 16px' }}>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'8px 16px' }}>
                        {[
                          ['Batch no.',    `#${r.batch_card_no}`],
                          ['Heat no.',     r.heat_no],
                          ['Grade',        r.grade],
                          ['Size',         r.size_mm?`${r.size_mm} mm`:'—'],
                          ['Check type',   r.check_type],
                          ['Inspector',    r.inspector],
                          ['Date',         r.date],
                          ['Result',       r.result],
                          ['Total OK pcs', r.total_ok_pcs||'—'],
                          ['OK wt (MT)',   r.ok_wt_mt||'—'],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div style={{ fontSize:10, color:'#AAA', marginBottom:2 }}>{label}</div>
                            <div style={{ fontSize:12, fontWeight:500 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                      {r.remarks && (
                        <div style={{ marginTop:10 }}>
                          <div style={{ fontSize:10, color:'#AAA', marginBottom:2 }}>Remarks</div>
                          <div style={{ fontSize:12, color:'#333' }}>{r.remarks}</div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:48, color:'#AAA', fontSize:12 }}>No QC records found</div>
        )}
      </div>

      {showModal && <NewQCModal onClose={() => setShowModal(false)} onSave={handleSave} batches={batches} />}
    </div>
  )
}