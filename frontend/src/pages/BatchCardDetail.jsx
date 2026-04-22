import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = ''

const STAGES = [
  'RM Receive','UT Inspection','HT Process','Black Bar Str.',
  'Peeling','Bright Bar Str.','Grinding','Cutting',
  'Chamfering','Polishing','MPI Final','Packing','Dispatch'
]

const STAGE_COLORS = {
  'RM Receive':'#6B7280','UT Inspection':'#8B5CF6','HT Process':'#EF4444',
  'Black Bar Str.':'#F59E0B','Peeling':'#3B82F6','Bright Bar Str.':'#06B6D4',
  'Grinding':'#10B981','Cutting':'#F97316','Chamfering':'#84CC16',
  'Polishing':'#EC4899','MPI Final':'#6366F1','Packing':'#14B8A6','Dispatch':'#22C55E',
}

export default function BatchCardDetail() {
  const { batchNo } = useParams()
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('http://localhost:5173/scan/' + batchNo)}`
  const navigate    = useNavigate()
  const [batch, setBatch]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [moving, setMoving]     = useState(false)
  const [notes, setNotes]       = useState('')
  const [operator, setOperator] = useState('')
  const [showMove, setShowMove] = useState(false)
  const [saved, setSaved]       = useState(false)

  useEffect(() => { load() }, [batchNo])

  async function load() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/batches/no/${batchNo}`)
      setBatch(await r.json())
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  async function moveStage(toStage) {
    if (!operator.trim()) { alert('Please enter operator name'); return }
    setMoving(true)
    try {
      const r = await fetch(`${API}/api/batches/no/${batchNo}/move`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ to_stage: toStage, moved_by: operator, notes })
      })
      const d = await r.json()
      if (d.success) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        setShowMove(false)
        setNotes('')
        await load()
      } else alert('Error: ' + d.error)
    } catch(e) { alert('Failed: ' + e.message) }
    setMoving(false)
  }

  if (loading) return <div style={{padding:'2rem',textAlign:'center',color:'#AAA'}}>Loading...</div>
  if (!batch || batch.error) return <div style={{padding:'2rem',textAlign:'center',color:'#E53935'}}>Batch not found</div>

  const curIdx   = STAGES.indexOf(batch.current_stage)
  const nextStage = curIdx < STAGES.length - 1 ? STAGES[curIdx + 1] : null
  const prevStage = curIdx > 0 ? STAGES[curIdx - 1] : null
  const stageColor = STAGE_COLORS[batch.current_stage] || '#888'
  const isDispatched = batch.current_stage === 'Dispatch'

  const isMobile = window.innerWidth < 768

  return (
    <div style={{maxWidth:600,margin:'0 auto',padding:'16px',fontFamily:'system-ui,sans-serif',background:'#F7F8FA',minHeight:'100vh'}}>

      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <button onClick={()=>navigate('/batches')} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:'#666'}}>â†</button>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:'#111',fontFamily:'monospace'}}>{batch.batch_card_no}</div>
          <div style={{fontSize:12,color:'#AAA'}}>{batch.so_number} Â· {batch.customer}</div>
        </div>
        <a href={`${API}/api/batches/${batchNo}/pdf`} target="_blank" rel="noreferrer"
          style={{marginLeft:'auto',background:'#1a1a1a',color:'#fff',border:'none',borderRadius:8,padding:'8px 14px',fontSize:12,fontWeight:600,cursor:'pointer',textDecoration:'none'}}>
          Print Card
        </a>
      </div>

      {/* Current Stage Banner */}
      <div style={{background:stageColor,borderRadius:12,padding:'16px 20px',marginBottom:16,color:'#fff'}}>
        <div style={{fontSize:11,fontWeight:600,opacity:0.8,textTransform:'uppercase',letterSpacing:'1px'}}>Current Stage</div>
        <div style={{fontSize:24,fontWeight:800,marginTop:4}}>{batch.current_stage}</div>
        <div style={{fontSize:12,opacity:0.8,marginTop:4}}>
          Stage {curIdx + 1} of {STAGES.length}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{background:'#fff',borderRadius:10,padding:'16px',marginBottom:16,border:'1px solid #EEEEEE'}}>
        <div style={{fontSize:11,fontWeight:700,color:'#AAA',textTransform:'uppercase',marginBottom:10}}>Progress</div>
        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
          {STAGES.map((s,i) => (
            <div key={s} title={s} style={{
              flex:'1 1 auto', height:8, borderRadius:4, minWidth:12,
              background: i <= curIdx ? STAGE_COLORS[s] : '#E5E7EB',
              opacity: i === curIdx ? 1 : i < curIdx ? 0.6 : 0.3
            }}/>
          ))}
        </div>
        <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontSize:10,color:'#AAA'}}>
          <span>RM Receive</span>
          <span>{Math.round((curIdx+1)/STAGES.length*100)}% complete</span>
          <span>Dispatch</span>
        </div>
      </div>

      {/* Batch Details */}
      <div style={{background:'#fff',borderRadius:10,padding:'16px',marginBottom:16,border:'1px solid #EEEEEE'}}>
       <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
  <div style={{fontSize:11,fontWeight:700,color:'#AAA',textTransform:'uppercase'}}>Batch Details</div>
  <div style={{textAlign:'center'}}>
    <img src={qrUrl} alt="QR Code" style={{width:80,height:80,borderRadius:8,border:'1px solid #E5E7EB'}}/>
    <div style={{fontSize:10,color:'#9CA3AF',marginTop:4}}>Scan to open</div>
  </div>
</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          {[
            ['Grade', batch.grade_code],
            ['Size', `âŒ€${batch.size_mm}mm`],
            ['Weight', `${Number(batch.weight_kg||0).toFixed(1)} KG`],
            ['Tolerance', batch.tolerance||'â€”'],
            ['Length', `${batch.length_mm||3000}mm`],
            ['Ends Finish', batch.ends_finish||'â€”'],
            ['HT Process', batch.ht_process||'â€”'],
            ['Heat No', batch.heat_no||'â€”'],
            ['No. of Pcs', batch.no_of_pcs||'â€”'],
            ['Shed', batch.shed||'â€”'],
          ].map(([l,v]) => (
            <div key={l} style={{background:'#F7F8FA',borderRadius:8,padding:'8px 10px'}}>
              <div style={{fontSize:10,color:'#AAA',marginBottom:2}}>{l}</div>
              <div style={{fontSize:13,fontWeight:600,color:'#111'}}>{v||'â€”'}</div>
            </div>
          ))}
        </div>
        <div style={{marginTop:10,background:'#F7F8FA',borderRadius:8,padding:'8px 10px'}}>
          <div style={{fontSize:10,color:'#AAA',marginBottom:2}}>Customer</div>
          <div style={{fontSize:13,fontWeight:600,color:'#185FA5'}}>{batch.customer||'â€”'}</div>
        </div>
        <div style={{display:'flex',gap:8,marginTop:10}}>
          {batch.mtc_required ? <span style={{fontSize:11,background:'#E3F2FD',color:'#1565C0',padding:'3px 8px',borderRadius:100,fontWeight:600}}>MTC Required</span> : null}
          {batch.ut_required  ? <span style={{fontSize:11,background:'#F3E5F5',color:'#6A1B9A',padding:'3px 8px',borderRadius:100,fontWeight:600}}>UT Required</span>  : null}
        </div>
      </div>

      {/* Move Stage */}
      {!isDispatched && (
        <div style={{background:'#fff',borderRadius:10,padding:'16px',marginBottom:16,border:'1px solid #EEEEEE'}}>
          <div style={{fontSize:11,fontWeight:700,color:'#AAA',textTransform:'uppercase',marginBottom:12}}>Move Stage</div>

          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,color:'#888',display:'block',marginBottom:4}}>Operator Name *</label>
            <input value={operator} onChange={e=>setOperator(e.target.value)}
              placeholder="Enter your name..."
              style={{width:'100%',padding:'10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,boxSizing:'border-box'}}/>
          </div>

          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,color:'#888',display:'block',marginBottom:4}}>Notes (optional)</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)}
              placeholder="Any observations or notes..."
              rows={2}
              style={{width:'100%',padding:'10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8,resize:'none',boxSizing:'border-box'}}/>
          </div>

          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {prevStage && (
              <button onClick={()=>moveStage(prevStage)} disabled={moving}
                style={{flex:1,padding:'12px',background:'#FFF3E0',color:'#E65100',border:'1px solid #FFCC80',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>
                â† Back to {prevStage}
              </button>
            )}
            {nextStage && (
              <button onClick={()=>moveStage(nextStage)} disabled={moving}
                style={{flex:2,padding:'12px',background:STAGE_COLORS[nextStage],color:'#fff',border:'none',borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer'}}>
                {moving ? 'Moving...' : `â†’ Move to ${nextStage}`}
              </button>
            )}
          </div>

          {/* Jump to any stage */}
          <div style={{marginTop:12}}>
            <label style={{fontSize:11,color:'#888',display:'block',marginBottom:4}}>Jump to specific stage</label>
            <select onChange={e=>{ if(e.target.value) moveStage(e.target.value) }}
              style={{width:'100%',padding:'10px',fontSize:13,border:'1px solid #E0E0E0',borderRadius:8}}>
              <option value="">Select stage to jump to...</option>
              {STAGES.filter(s=>s!==batch.current_stage).map(s=>(
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {saved && <div style={{marginTop:8,padding:'8px 12px',background:'#E8F5E9',color:'#2E7D32',borderRadius:8,fontSize:12,fontWeight:600,textAlign:'center'}}>âœ“ Stage updated successfully!</div>}
        </div>
      )}

      {isDispatched && (
        <div style={{background:'#E8F5E9',borderRadius:10,padding:'16px',marginBottom:16,textAlign:'center'}}>
          <div style={{fontSize:24}}>âœ…</div>
          <div style={{fontSize:16,fontWeight:700,color:'#2E7D32',marginTop:8}}>Dispatched!</div>
          <div style={{fontSize:12,color:'#66BB6A',marginTop:4}}>This batch has been dispatched to customer</div>
        </div>
      )}

      {/* Stage History */}
      <div style={{background:'#fff',borderRadius:10,padding:'16px',marginBottom:16,border:'1px solid #EEEEEE'}}>
        <div style={{fontSize:11,fontWeight:700,color:'#AAA',textTransform:'uppercase',marginBottom:12}}>Stage History</div>
        {(batch.history||[]).length === 0 ? (
          <div style={{color:'#AAA',fontSize:12}}>No history yet</div>
        ) : (
          <div style={{position:'relative'}}>
            <div style={{position:'absolute',left:8,top:0,bottom:0,width:2,background:'#E5E7EB'}}/>
            {[...batch.history].reverse().map((h,i) => (
              <div key={h.id} style={{display:'flex',gap:12,marginBottom:12,position:'relative'}}>
                <div style={{width:18,height:18,borderRadius:'50%',background:STAGE_COLORS[h.to_stage]||'#888',flexShrink:0,zIndex:1,marginTop:2}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:'#111'}}>
                    {h.from_stage ? `${h.from_stage} â†’ ` : ''}{h.to_stage}
                  </div>
                  <div style={{fontSize:11,color:'#AAA',marginTop:2}}>
                    {h.moved_by} Â· {new Date(h.moved_at).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}
                  </div>
                  {h.notes && <div style={{fontSize:11,color:'#666',marginTop:2,fontStyle:'italic'}}>{h.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

