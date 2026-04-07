import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useBatches } from '../context/BatchContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ── Color palette ─────────────────────────────────────────────────
const C = {
  orange:     '#E8642A',
  orangeLight:'#FFF4EE',
  orangeBorder:'#FDDCC8',
  blue:       '#1E4E8C',
  blueLight:  '#EEF4FF',
  blueBorder: '#C5D9F5',
  green:      '#1A6B3C',
  greenLight: '#EDFAF3',
  greenBorder:'#B6E8CE',
  brown:      '#7A4F1E',
  brownLight: '#FDF5EC',
  brownBorder:'#E8D0B0',
  navy:       '#1B2B4B',
  navyLight:  '#F0F3FA',
  border:     '#E8ECF2',
  inputBg:    '#FAFBFC',
  label:      '#64748B',
  text:       '#1E293B',
  textLight:  '#94A3B8',
  bg:         '#F5F7FA',
  white:      '#FFFFFF',
}

// ── Helpers ───────────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0]
const fmt   = d => d ? new Date(d).toLocaleString('en-IN') : '—'
const fmtDur = m => { if (!m && m !== 0) return '—'; const h = Math.floor(m/60); return h > 0 ? `${h}h ${m%60}m` : `${m}m` }

function extractGrade(d='')     { const m=d.match(/\b(\d\.\d{3,4}|\d{3}L?|17-4PH|630)\b/); return m?m[1]:'' }
function extractTolerance(d='') { const m=d.match(/\b(h\d{1,2}|H\d{1,2}|k\d{1,2})\b/i);   return m?m[1]:'' }
function extractLength(d='')    { const m=d.match(/[Ll]ength\s*([\d–\-\/+]+)\s*[Mm][Mm]/i);return m?m[1]:'' }
function extractProcess(d='')   { const p=[]; if(/peel/i.test(d))p.push('Peeled'); if(/ground/i.test(d))p.push('Ground'); if(/polish/i.test(d))p.push('Polished'); if(/chamfer/i.test(d))p.push('Chamfered'); return p.join(' + ') }

// ── Base components ───────────────────────────────────────────────
function SectionCard({ title, accent, children, icon }) {
  const colors = {
    blue:   { bg: C.blueLight,  border: C.blueBorder,  bar: C.blue,  text: C.blue },
    green:  { bg: C.greenLight, border: C.greenBorder, bar: C.green, text: C.green },
    brown:  { bg: C.brownLight, border: C.brownBorder, bar: C.brown, text: C.brown },
    orange: { bg: C.orangeLight,border: C.orangeBorder,bar: C.orange,text: C.orange },
    navy:   { bg: C.navyLight,  border: C.border,      bar: C.navy,  text: C.navy },
  }
  const col = colors[accent] || colors.blue
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ background: col.bg, borderBottom: `1px solid ${col.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 3, height: 18, background: col.bar, borderRadius: 2 }} />
        {icon && <span style={{ fontSize: 14 }}>{icon}</span>}
        <span style={{ fontSize: 12, fontWeight: 700, color: col.text, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{title}</span>
      </div>
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  )
}

function Label({ children, fromSo }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, color: C.label, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
      {children}
      {fromSo && <span style={{ fontSize: 8, fontWeight: 700, color: C.orange, background: C.orangeLight, border: `1px solid ${C.orangeBorder}`, padding: '1px 5px', borderRadius: 3 }}>AUTO</span>}
    </div>
  )
}

function Inp({ value, onChange, placeholder, type='text', readOnly, prefilled, small }) {
  return (
    <input type={type} value={value||''} readOnly={readOnly}
      onChange={onChange ? e => onChange(e.target.value) : undefined}
      placeholder={placeholder}
      style={{
        width: '100%', padding: small ? '5px 8px' : '7px 10px',
        fontSize: small ? 11 : 12, fontWeight: 500,
        border: `1px solid ${prefilled ? C.orangeBorder : C.border}`,
        borderRadius: 6, boxSizing: 'border-box',
        background: readOnly ? C.bg : prefilled ? C.orangeLight : C.white,
        color: C.text, outline: 'none',
        transition: 'border-color 0.15s',
      }}
    />
  )
}

function Sel({ value, onChange, options, small }) {
  return (
    <select value={value||''} onChange={e => onChange(e.target.value)}
      style={{ width:'100%', padding: small ? '5px 8px' : '7px 10px', fontSize: small ? 11 : 12, fontWeight: 500, border: `1px solid ${C.border}`, borderRadius: 6, background: C.white, color: C.text, outline: 'none' }}>
      <option value=''>—</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )
}

function Field({ label, children, fromSo, span }) {
  return (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <Label fromSo={fromSo}>{label}</Label>
      {children}
    </div>
  )
}

// ── Table styles ──────────────────────────────────────────────────
const TH = {
  padding: '7px 8px', fontSize: 10, fontWeight: 700, color: C.blue,
  textTransform: 'uppercase', background: C.blueLight,
  border: `1px solid ${C.blueBorder}`, whiteSpace: 'nowrap',
  letterSpacing: '0.3px',
}
const TD = { padding: '4px 6px', border: `1px solid ${C.border}`, verticalAlign: 'top', background: C.white }
const TD_E = { ...TD, height: 28 }

function EditRows({ cols, rows=4 }) {
  const [data, setData] = useState(() => Array.from({length:rows}, () => Object.fromEntries(cols.map(c=>[c.key,'']))))
  const set = (r,k,v) => setData(prev => prev.map((row,i) => i===r ? {...row,[k]:v} : row))
  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', width:'100%' }}>
        <thead>
          <tr>{cols.map(c => <th key={c.key} style={TH} colSpan={c.span||1}>{c.label}</th>)}</tr>
          {cols.some(c=>c.sub) && <tr>{cols.flatMap(c => c.sub ? c.sub.map(s=><th key={s.key} style={TH}>{s.label}</th>) : [<th key={c.key} style={TH}></th>])}</tr>}
        </thead>
        <tbody>
          {data.map((row,ri) => (
            <tr key={ri}>
              {cols.flatMap(c => {
                if(c.sub) return c.sub.map(s => <td key={s.key} style={TD}><Inp small value={row[s.key]||''} onChange={v=>set(ri,s.key,v)} /></td>)
                if(c.sel) return [<td key={c.key} style={TD}><Sel small value={row[c.key]} onChange={v=>set(ri,c.key,v)} options={c.options} /></td>]
                return [<td key={c.key} style={TD}><Inp small type={c.type} value={row[c.key]} onChange={v=>set(ri,c.key,v)} /></td>]
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Process Stage Row ─────────────────────────────────────────────
const STAGES = [
  { key:'black_bar_str',  label:'Black Bar Str.',    accent:'#1B5E20', extra:null,                                          cutting:false },
  { key:'peeling',        label:'Peeling / Drawing', accent:'#880E4F', extra:{key:'turning_loss_wt',label:'Turning Loss Wt'},cutting:false },
  { key:'bright_bar_str', label:'Bright Bar Str.',   accent:'#1A237E', extra:null,                                          cutting:false },
  { key:'grinding',       label:'Grinding',          accent:'#37474F', extra:{key:'grinding_loss_wt',label:'Grinding Loss Wt'},cutting:false },
  { key:'cutting',        label:'Cutting',           accent:'#BF360C', extra:{key:'end_cut_wt',label:'End Cut Wt'},         cutting:true  },
]

function StageRow({ stage, batchNo, batches, operatorName, prevSavedAt, onSaved }) {
  const [done, setDone]           = useState(false)
  const [savedAt, setSavedAt]     = useState(null)
  const [timeTaken, setTimeTaken] = useState(null)
  const [d, setD] = useState({ date:today(), shift:'', no_of_pcs:'', input_size:'', output_size:'', input_length:'', finish_length:'', ovality:'', remarks:'', name_sign:'', turning_loss_wt:'', grinding_loss_wt:'', end_cut_wt:'' })
  const set = (k,v) => setD(p=>({...p,[k]:v}))

  async function save() {
    if(!d.date||!d.shift||!d.no_of_pcs){alert('Fill Date, Shift and No of Pcs');return}
    const now=new Date()
    const mins=prevSavedAt?Math.round((now-new Date(prevSavedAt))/60000):null
    setSavedAt(now.toISOString()); setTimeTaken(mins); setDone(true)
    if(onSaved) onSaved(now.toISOString())
    try {
      const batch=batches?.find(b=>b.batch_card_no===batchNo)
      if(batch?.id) {
        await fetch(`${API}/api/batch-cards/${batch.id}/stage/end`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({stage:stage.key,operator_name:operatorName,saved_at:now.toISOString(),time_taken_mins:mins,...d})})
      }
    } catch(e){console.error(e)}
  }

  const inKey=stage.cutting?'input_length':'input_size'
  const outKey=stage.cutting?'finish_length':'output_size'
  const inLbl=stage.cutting?'Input Length':'Input Size'
  const outLbl=stage.cutting?'Finish Length':'Output Size'

  return (
    <div style={{ border:`1px solid ${done?C.greenBorder:C.border}`, borderLeft:`3px solid ${done?C.green:stage.accent}`, borderRadius:8, marginBottom:8, overflow:'hidden', background:done?C.greenLight:C.white, transition:'all 0.2s' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background:done?'#F0FAF5':'#FAFBFC', borderBottom:`1px solid ${done?C.greenBorder:C.border}` }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8,height:8,borderRadius:'50%',background:done?C.green:stage.accent }} />
          <span style={{ fontWeight:700,fontSize:12,color:done?C.green:C.text }}>{stage.label}</span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10,fontSize:11 }}>
          {done && <>
            <span style={{ color:C.green,fontWeight:600 }}>✓ Saved {fmt(savedAt)}</span>
            {timeTaken!==null && <span style={{ color:stage.accent,fontWeight:700,background:`${stage.accent}18`,padding:'2px 8px',borderRadius:4 }}>⏱ {fmtDur(timeTaken)}</span>}
          </>}
          {!done && <span style={{ color:C.textLight,fontSize:10 }}>Pending</span>}
        </div>
      </div>
      <div style={{ padding:'10px 14px' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse',width:'100%' }}>
            <thead>
              <tr>{['Date','Shift','No of Pcs',inLbl,outLbl,'Ovality','Remarks',stage.extra?.label||null,'Name/Sign'].filter(Boolean).map(h=><th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td style={TD}><Inp small type="date" value={d.date} onChange={done?null:v=>set('date',v)} readOnly={done} /></td>
                <td style={TD}><Sel small value={d.shift} onChange={done?()=>{}:v=>set('shift',v)} options={['DAY','NIGHT','A','B','C']} /></td>
                <td style={TD}><Inp small value={d.no_of_pcs} onChange={done?null:v=>set('no_of_pcs',v)} readOnly={done} /></td>
                <td style={TD}><Inp small value={d[inKey]} onChange={done?null:v=>set(inKey,v)} placeholder="mm" readOnly={done} /></td>
                <td style={TD}><Inp small value={d[outKey]} onChange={done?null:v=>set(outKey,v)} placeholder="mm" readOnly={done} /></td>
                <td style={TD}><Inp small value={d.ovality} onChange={done?null:v=>set('ovality',v)} readOnly={done} /></td>
                <td style={TD}><Inp small value={d.remarks} onChange={done?null:v=>set('remarks',v)} readOnly={done} /></td>
                {stage.extra && <td style={TD}><Inp small value={d[stage.extra.key]} onChange={done?null:v=>set(stage.extra.key,v)} readOnly={done} /></td>}
                <td style={TD}><Inp small value={d.name_sign} onChange={done?null:v=>set('name_sign',v)} readOnly={done} /></td>
              </tr>
            </tbody>
          </table>
        </div>
        {!done && (
          <div style={{ display:'flex',justifyContent:'flex-end',marginTop:8 }}>
            <button onClick={save} style={{ background:C.green,color:'#fff',border:'none',borderRadius:6,padding:'6px 18px',fontSize:12,fontWeight:700,cursor:'pointer' }}>✓ Save Stage</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── CREATE FORM ───────────────────────────────────────────────────
function CreateForm({ onCreated }) {
  const { batches: ctxBatches, createBatch } = useBatches()
  const { state: locationState } = useLocation()
  const lastNo = ctxBatches.reduce((max,b)=>Math.max(max,Number(b.batch_card_no)||0),1072)
  const nextNo = String(lastNo+1)

  const fromSO = locationState?.from_so||null
  const li     = fromSO?.line_item||{}
  const grade0 = fromSO?extractGrade(li.description||li.grade||''):''
  const tol0   = fromSO?extractTolerance(li.description||li.tolerance||''):''
  const len0   = fromSO?extractLength(li.description||''):''
  const proc0  = fromSO?extractProcess(li.description||''):''
  const fst0   = li.size_mm?(tol0?`${li.size_mm} ${tol0}`:String(li.size_mm)):''

  const [form, setForm] = useState({
    date:today(), do_year:'2025-26', prepared_by:'',
    heat_no:'', grade: grade0||li.grade||'',
    black_size_mm: li.size_mm?String(li.size_mm):'',
    black_length_mm:'', no_of_pcs:'',
    weight_mtm: li.qty_tons?String(li.qty_tons):'',
    ht_process:'', bright_bar_process:proc0,
    finish_size_mm: li.size_mm ? String(li.size_mm) : '',
    tolerance: li.tolerance || tol0 || '',
    customer_name:fromSO?.customer||'',
    customer_do_no:fromSO?.so_number||'',
    item_no:'', length_mm:len0,
    colour_code:'', bundle_weight_kg:'',
    ra_value:'', ovality:'', straightness:'', remark:'', chamfering:'',
  })
  const set=(k,v)=>setForm(p=>({...p,[k]:v}))

  const soKeys=['grade','black_size_mm','weight_mtm','bright_bar_process','finish_size_tol','customer_name','customer_do_no','length_mm']
  const isSO=k=>fromSO&&soKeys.includes(k)&&!!form[k]

  function FI({label,fkey,ph,type}){
    return <Field label={label} fromSo={isSO(fkey)}><Inp value={form[fkey]} onChange={v=>set(fkey,v)} placeholder={ph} type={type} prefilled={isSO(fkey)} /></Field>
  }

  function handleCreate(){
    if(!form.heat_no||!form.grade){alert('Heat No. and Grade are required');return}
    createBatch({
      batch_card_no:nextNo, heat_no:form.heat_no, grade_code:form.grade,
      size_mm:Number(form.black_size_mm)||0, no_of_pcs:Number(form.no_of_pcs)||0,
      weight_kg:Number(form.weight_mtm)*1000||0,
      ht_process:form.ht_process, bb_process:form.bright_bar_process,
      tolerance:form.tolerance, colour_code:form.colour_code,
      prepared_by:form.prepared_by, customer:form.customer_name,
      so_number:form.customer_do_no,
      current_stage:'RM Receive', current_stage_index:0,
      status:'In Progress', priority:'On Track',
      created_at:new Date().toISOString(), stage_logs:[],
    })
    onCreated(nextNo)
  }

  return (
    <div style={{ maxWidth:1000, margin:'0 auto' }}>

      {/* SO Banner */}
      {fromSO && (
        <div style={{ background:C.orangeLight, border:`1px solid ${C.orangeBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:12, alignItems:'flex-start' }}>
          <span style={{ fontSize:22 }}>📋</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:C.orange }}>Pre-filled from SO: {fromSO.so_number}</div>
            <div style={{ fontSize:11, color:'#7C3A10', marginTop:3 }}>
              {fromSO.customer}{li.size_mm&&` · Size: ${li.size_mm}mm`}{li.qty_tons&&` · Qty: ${li.qty_tons}T`}{grade0&&` · Grade: ${grade0}`}
            </div>
            <div style={{ fontSize:10, color:C.textLight, marginTop:2 }}>Fields marked AUTO are pre-filled from the Sales Order.</div>
          </div>
        </div>
      )}

      {/* Header Card */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <img src="/ALOK_Logo.png" alt="Alok" style={{ height:44 }} onError={e=>e.target.style.display='none'} />
          <div style={{ borderLeft:`3px solid ${C.orange}`, paddingLeft:12 }}>
            <div style={{ fontSize:20, fontWeight:800, color:C.text, letterSpacing:1.5 }}>BATCH CARD</div>
            <div style={{ fontSize:9, color:C.textLight, marginTop:2, letterSpacing:0.5 }}>Format No: DI PRD-BBD/07 · Rev 00 Dt. 01.07.2023</div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:10, color:C.textLight, fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Batch Card No.</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.orange, fontFamily:'monospace', lineHeight:1.1 }}>#{nextNo}</div>
        </div>
      </div>

      {/* Top fields */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 16px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:12 }}>
          <Field label="Batch Card No."><Inp value={nextNo} readOnly /></Field>
          <Field label="Heat No. ★"><Inp value={form.heat_no} onChange={v=>set('heat_no',v)} placeholder="e.g. A14319" /></Field>
          <Field label="Grade ★" fromSo={isSO('grade')}><Inp value={form.grade} onChange={v=>set('grade',v)} placeholder="e.g. 1.4021" prefilled={isSO('grade')} /></Field>
          <Field label="Date"><Inp type="date" value={form.date} onChange={v=>set('date',v)} /></Field>
          <Field label="DO Year"><Inp value={form.do_year} onChange={v=>set('do_year',v)} /></Field>
          <Field label="Prepared By"><Inp value={form.prepared_by} onChange={v=>set('prepared_by',v)} placeholder="Name" /></Field>
        </div>
      </div>

      {/* Black Bar + Bright Supply */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <SectionCard title="Black Bar Details" accent="blue" icon="⬛">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FI label="Black Size (mm)"    fkey="black_size_mm"      ph="e.g. 115.00" />
            <FI label="Black Length (mm)"  fkey="black_length_mm"    ph="e.g. 5600–5800" />
            <FI label="No. of Pcs"         fkey="no_of_pcs"          ph="e.g. 42" />
            <FI label="Weight (MTM)"       fkey="weight_mtm"         ph="e.g. 5.110" />
            <FI label="HT Process"         fkey="ht_process"         ph="e.g. QT / Annealed" />
            <FI label="Bright Bar Process" fkey="bright_bar_process" ph="e.g. Peeled+Ground" />
          </div>
        </SectionCard>

        <SectionCard title="Bright Supply Condition" accent="green" icon="✨">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <FI label="Finish Size (mm)" fkey="finish_size_mm" ph="e.g. 45.12" />
<FI label="Tolerance"        fkey="tolerance"      ph="e.g. h9" />
            <FI label="Customer Name"      fkey="customer_name"    ph="Customer" />
            <FI label="SO / DO No."        fkey="customer_do_no"   ph="AIMPL/S.O/..." />
            <FI label="Item No."           fkey="item_no"          ph="e.g. 64/22" />
            <FI label="Length (mm)"        fkey="length_mm"        ph="e.g. 4000–6200" />
            <FI label="Colour Code"        fkey="colour_code"      ph="e.g. Pink + White" />
            <FI label="Bundle Weight (kg)" fkey="bundle_weight_kg" ph="e.g. 1500" />
            <FI label="Ra Value"           fkey="ra_value"         ph="" />
            <FI label="Ovality"            fkey="ovality"          ph="" />
            <FI label="Straightness"       fkey="straightness"     ph="" />
            <FI label="Remark"             fkey="remark"           ph="e.g. LDPE + HDPE" />
            <Field label="Chamfering">
              <Sel value={form.chamfering} onChange={v=>set('chamfering',v)} options={['Yes','No']} />
            </Field>
          </div>
        </SectionCard>
      </div>

      {/* Black Bar Inspection */}
      <SectionCard title="Black Bar Inspection" accent="brown" icon="🔍">
        <EditRows rows={4} cols={[
          {key:'date',label:'Date',type:'date'},
          {key:'shift',label:'Shift',sel:true,options:['DAY','NIGHT','I','II']},
          {key:'pcs_rec',label:'# Pcs Rec'},
          {key:'ut_ok',label:'UT Ok'},
          {key:'ut_reject',label:'UT Reject'},
          {key:'mpi_reject',label:'MPI Reject'},
          {key:'end_cut_wt',label:'End Cut WT'},
          {key:'total_ok_pcs',label:'Total OK Pcs'},
          {key:'ok_wt',label:'OK WT'},
          {key:'rej_wt',label:'Rej Wt'},
          {key:'remark',label:'Remark'},
        ]} />
      </SectionCard>

      {/* HT Process */}
      <SectionCard title="HT Process" accent="orange" icon="🔥">
        <EditRows rows={3} cols={[
          {key:'date',label:'Date',type:'date'},
          {key:'furnace_no',label:'Furnace No'},
          {key:'no_of_pcs',label:'No of Pcs'},
          {key:'qty',label:'QTY'},
          {key:'ht_process',label:'HT Process'},
          {key:'hardness',label:'Hardness'},
          {key:'tensile',label:'Tensile'},
          {key:'ok_not_ok',label:'Ok/Not Ok',sel:true,options:['OK','Not OK']},
          {key:'remark',label:'Remark'},
        ]} />
      </SectionCard>

      {/* Create Button */}
      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
        <button onClick={handleCreate} style={{ background:C.orange, color:'#fff', border:'none', borderRadius:8, padding:'12px 32px', fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:`0 4px 12px ${C.orangeBorder}`, letterSpacing:0.3 }}>
          Create Batch Card & Start Process →
        </button>
      </div>
    </div>
  )
}

// ── ACTIVE BATCH ──────────────────────────────────────────────────
function ActiveBatch({ batchNo }) {
  const { batches } = useBatches()
  const batch = batches.find(b => b.batch_card_no === batchNo)
  const [operator, setOperator] = useState('')
  const [stageSavedAt, setStageSavedAt] = useState({})

  if (!batch) return (
    <div style={{ textAlign:'center', padding:60, color:C.textLight }}>
      <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
      <div style={{ fontSize:14, fontWeight:600 }}>No active batch</div>
      <div style={{ fontSize:12, marginTop:4 }}>Create a batch card first</div>
    </div>
  )

  return (
    <div style={{ maxWidth:1000, margin:'0 auto' }}>

      {/* Summary */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderLeft:`4px solid ${C.orange}`, borderRadius:10, padding:'14px 20px', marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 8px rgba(0,0,0,0.06)' }}>
        <div>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:4 }}>
            <span style={{ fontSize:20, fontWeight:800, color:C.text }}>Batch Card</span>
            <span style={{ fontSize:20, fontWeight:800, color:C.orange, fontFamily:'monospace' }}>#{batchNo}</span>
            <span style={{ fontSize:11, fontWeight:600, background:C.greenLight, color:C.green, border:`1px solid ${C.greenBorder}`, padding:'2px 8px', borderRadius:4 }}>{batch.status}</span>
          </div>
          <div style={{ fontSize:12, color:C.label }}>
            {batch.customer&&<><strong style={{color:C.text}}>{batch.customer}</strong> · </>}
            Grade: <strong style={{color:C.blue}}>{batch.grade_code}</strong> · Size: <strong>{batch.size_mm}mm</strong> · Heat: <strong>{batch.heat_no}</strong>
          </div>
        </div>
        <div style={{ textAlign:'right', fontSize:11, color:C.label }}>
          <div>HT: <strong style={{color:C.text}}>{batch.ht_process||'—'}</strong></div>
          <div>Process: <strong style={{color:C.text}}>{batch.bb_process||'—'}</strong></div>
          <div style={{ marginTop:4 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#fff', background:C.orange, padding:'3px 10px', borderRadius:4 }}>{batch.current_stage}</span>
          </div>
        </div>
      </div>

      {/* Operator */}
      <div style={{ background:C.blueLight, border:`1px solid ${C.blueBorder}`, borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:18 }}>👤</span>
        <span style={{ fontSize:12, fontWeight:700, color:C.blue, whiteSpace:'nowrap' }}>Current Operator:</span>
        <input value={operator} onChange={e=>setOperator(e.target.value)}
          placeholder="Enter operator name before saving any stage"
          style={{ flex:1, padding:'7px 12px', fontSize:12, border:`1px solid ${C.blueBorder}`, borderRadius:6, background:C.white, color:C.text, outline:'none' }} />
      </div>

      {/* Process Stages */}
      <SectionCard title="Bright Bar Process Route — Stage Completion" accent="navy" icon="⚙️">
        <div style={{ fontSize:11, color:C.textLight, marginBottom:12, padding:'8px 12px', background:C.bg, borderRadius:6 }}>
          Fill in data for each stage when completed, then click ✓ Save Stage. Time between stages is tracked automatically.
        </div>
        {STAGES.map((stage,idx) => (
          <StageRow key={stage.key} stage={stage} batchNo={batchNo} batches={batches} operatorName={operator}
            prevSavedAt={idx===0?null:stageSavedAt[STAGES[idx-1].key]||null}
            onSaved={ts=>setStageSavedAt(prev=>({...prev,[stage.key]:ts}))} />
        ))}
      </SectionCard>

      {/* MPI Inspection */}
      <SectionCard title="MPI / DP Inspection Details" accent="blue" icon="🔬">
        <EditRows rows={6} cols={[
          {key:'date',label:'Date',type:'date'},
          {key:'shift',label:'Shift',sel:true,options:['I','II','DAY','NIGHT']},
          {key:'pcs_insp',label:'# Pcs Insp.'},
          {key:'ok_pcs',label:'# Ok Pcs'},
          {key:'not_ok',label:'# Not Ok'},
          {key:'remarks',label:'Remarks'},
          {key:'name_sign',label:'Name/Sign'},
        ]} />
      </SectionCard>

      {/* Inspection & Packing */}
      <SectionCard title="Inspection and Packing Details" accent="blue" icon="📦">
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead>
              <tr>
                <th style={TH} rowSpan={2}>Date</th>
                <th style={TH} rowSpan={2}>B.No</th>
                <th style={{...TH,textAlign:'center'}} colSpan={2}>Size</th>
                <th style={{...TH,textAlign:'center'}} colSpan={2}>Length</th>
                <th style={TH} rowSpan={2}>Surface Finish</th>
                <th style={TH} rowSpan={2}>Ovality</th>
                <th style={TH} rowSpan={2}>No of Pcs</th>
                <th style={TH} rowSpan={2}>Bundle Wt.</th>
                <th style={TH} rowSpan={2}>Name/Sign</th>
              </tr>
              <tr>
                <th style={TH}>Min</th><th style={TH}>Max</th>
                <th style={TH}>Min</th><th style={TH}>Max</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({length:10}).map((_,i)=>(
                <tr key={i}>{Array.from({length:11}).map((_,j)=><td key={j} style={TD_E}></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginTop:16 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.blue, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8, paddingBottom:4, borderBottom:`2px solid ${C.blueBorder}` }}>Rejection Summary</div>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead><tr><th style={TH}>Type</th><th style={TH}>No of Pcs</th><th style={TH}>Weight</th></tr></thead>
              <tbody>
                {['S/L','Tool Mark','Crack - Visual/MPI','Gr. Mark','Damage','Chip Off'].map(r=>(
                  <tr key={r}><td style={{...TD,fontSize:11}}>{r}</td><td style={TD_E}></td><td style={TD_E}></td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:C.green, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8, paddingBottom:4, borderBottom:`2px solid ${C.greenBorder}` }}>Production Summary</div>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <tbody>
                {['Total qty ok','Total qty rej','Turning scrap / end cut','Total','Yield (%)','Job card open / closed','Authorised Signature'].map(r=>(
                  <tr key={r}>
                    <td style={{...TD,fontSize:11,fontWeight:r==='Authorised Signature'?700:400,color:C.text}}>{r}</td>
                    <td style={{...TD_E,minWidth:120}}></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SectionCard>

    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────
export default function BatchCardCreator() {
  const [view, setView]            = useState('create')
  const [activeBatchNo, setActive] = useState(null)

  function handleCreated(batchNo) { setActive(batchNo); setView('active') }

  return (
    <div style={{ background:C.bg, minHeight:'100vh', padding:'20px 24px' }}>
      <div style={{ maxWidth:1000, margin:'0 auto 16px' }}>
        <div style={{ display:'flex', gap:4, background:C.white, borderRadius:8, padding:4, border:`1px solid ${C.border}`, width:'fit-content', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          {[['create','📋 New Batch Card'],['active','⚡ Active Batch']].map(([v,label])=>(
            <button key={v} onClick={()=>setView(v)} style={{ padding:'7px 20px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', background:view===v?C.orange:'transparent', color:view===v?'#fff':C.label, transition:'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {view==='create' && <CreateForm onCreated={handleCreated} />}
      {view==='active' && <ActiveBatch batchNo={activeBatchNo} />}
    </div>
  )
}