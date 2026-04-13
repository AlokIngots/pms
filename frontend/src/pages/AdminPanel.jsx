import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

const MACHINES = [
  { id:1,  name:'Kieserling WDH 60',   type:'Peeling',       shed:'Shed 1', status:'Running' },
  { id:2,  name:'Kieserling WDH 60Y',  type:'Peeling',       shed:'Shed 1', status:'Running' },
  { id:3,  name:'Kieserling WDH 100Y', type:'Peeling',       shed:'Shed 2', status:'Running' },
  { id:4,  name:'STR 01',              type:'Straightening', shed:'Shed 1', status:'Running' },
  { id:5,  name:'STR 07',              type:'Straightening', shed:'Shed 1', status:'Running' },
  { id:6,  name:'STR 03',              type:'Straightening', shed:'Shed 2', status:'Idle' },
  { id:7,  name:'STR JFN',             type:'Straightening', shed:'Shed 2', status:'Running' },
  { id:8,  name:'STR 02',              type:'Straightening', shed:'Shed 3', status:'Maintenance' },
  { id:9,  name:'CG-01',               type:'Grinding',      shed:'Shed 1', status:'Running' },
  { id:10, name:'CG-02',               type:'Grinding',      shed:'Shed 1', status:'Running' },
  { id:11, name:'CG-03',               type:'Grinding',      shed:'Shed 2', status:'Idle' },
  { id:12, name:'CG-04',               type:'Grinding',      shed:'Shed 2', status:'Running' },
  { id:13, name:'CG-05',               type:'Grinding',      shed:'Shed 3', status:'Running' },
  { id:14, name:'CG-06',               type:'Grinding',      shed:'Shed 3', status:'Running' },
  { id:15, name:'CG-07',               type:'Grinding',      shed:'Shed 3', status:'Maintenance' },
  { id:16, name:'CG-08',               type:'Grinding',      shed:'Shed 3', status:'Running' },
  { id:17, name:'Bandsaw 1',           type:'Cutting',       shed:'Shed 1', status:'Running' },
  { id:18, name:'Bandsaw 2',           type:'Cutting',       shed:'Shed 2', status:'Running' },
  { id:19, name:'Bandsaw 3',           type:'Cutting',       shed:'Shed 3', status:'Idle' },
  { id:20, name:'Chamfering 1',        type:'Chamfering',    shed:'Shed 1', status:'Running' },
  { id:21, name:'Chamfering 2',        type:'Chamfering',    shed:'Shed 2', status:'Running' },
  { id:22, name:'Belt Polish',         type:'Polishing',     shed:'Shed 1', status:'Running' },
  { id:23, name:'Buffing 01',          type:'Polishing',     shed:'Shed 2', status:'Running' },
  { id:24, name:'Buffing 02',          type:'Polishing',     shed:'Shed 2', status:'Idle' },
  { id:25, name:'Draw Bench 1',        type:'Drawing',       shed:'Shed 3', status:'Running' },
  { id:26, name:'Suhumag',             type:'MPI',           shed:'Shed 1', status:'Running' },
  { id:27, name:'Bull Block',          type:'Drawing',       shed:'Shed 3', status:'Running' },
]

const EMPLOYEES = [
  { id:'EMP001', name:'Ramesh Kumar',  role:'Operator',   shed:'Shed 1', shift:'A',   type:'Company' },
  { id:'EMP002', name:'Suresh Patil',  role:'Operator',   shed:'Shed 1', shift:'B',   type:'Company' },
  { id:'EMP003', name:'Sanidhi',       role:'Sales',      shed:'Office', shift:'Day', type:'Company' },
  { id:'EMP004', name:'Mohan Das',     role:'Inspector',  shed:'Shed 2', shift:'A',   type:'Company' },
  { id:'EMP005', name:'Kamlesh Verma', role:'Operator',   shed:'Shed 2', shift:'C',   type:'Company' },
  { id:'EMP006', name:'Rajan Shah',    role:'Supervisor', shed:'Shed 3', shift:'A',   type:'Company' },
  { id:'EMP007', name:'Nilankshi',     role:'Sales',      shed:'Office', shift:'Day', type:'Company' },
  { id:'EMP018', name:'Maikel Wammes', role:'Sales',      shed:'Remote', shift:'Day', type:'Company' },
  { id:'EMP019', name:'Rajendra',      role:'Sales',      shed:'Office', shift:'Day', type:'Company' },
  { id:'EMP020', name:'Ruchir',        role:'Sales',      shed:'Office', shift:'Day', type:'Company' },
]

const STAGE_THRESHOLDS = [
  { stage:'RM Receive',      warning:24, critical:48 },
  { stage:'UT Inspection',   warning:8,  critical:16 },
  { stage:'HT Process',      warning:12, critical:24 },
  { stage:'Black Bar Str.',  warning:6,  critical:12 },
  { stage:'Peeling',         warning:8,  critical:16 },
  { stage:'Bright Bar Str.', warning:6,  critical:12 },
  { stage:'Grinding',        warning:8,  critical:16 },
  { stage:'Cutting',         warning:4,  critical:8  },
  { stage:'Chamfering',      warning:4,  critical:8  },
  { stage:'Polishing',       warning:6,  critical:12 },
  { stage:'MPI Final',       warning:4,  critical:8  },
  { stage:'Packing',         warning:8,  critical:16 },
]

const STATUS_STYLE = {
  Running:     { bg:'#E8F5E9', color:'#2E7D32' },
  Idle:        { bg:'#F5F5F5', color:'#757575' },
  Maintenance: { bg:'#FFEBEE', color:'#C62828' },
}
const TYPE_STYLE = {
  Company:         { bg:'#E3F2FD', color:'#185FA5' },
  'Semi-contract': { bg:'#FFF3E0', color:'#FB8C00' },
  Helper:          { bg:'#F3E5F5', color:'#7B1FA2' },
}

const C = {
  orange:'#E8642A', blue:'#1E4E8C', border:'#E8ECF2',
  bg:'#F5F7FA', white:'#FFFFFF', text:'#1E293B', light:'#94A3B8',
}

function inp(w) {
  return { width:w||'100%', padding:'6px 10px', fontSize:12, border:`1px solid ${C.border}`, borderRadius:6, outline:'none', background:C.white, boxSizing:'border-box' }
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ fontSize:15, fontWeight:700, color:C.text }}>{title}</div>
      {sub && <div style={{ fontSize:12, color:C.light, marginTop:2 }}>{sub}</div>}
    </div>
  )
}

// ── GRADE MASTER ─────────────────────────────────────────────────
const EMPTY_GRADE = {
  grade_code:'', c_min:'', c_max:'', mn_min:'', mn_max:'', p_max:'',
  s_min:'', s_max:'', si_min:'', si_max:'', ni_min:'', ni_max:'',
  mo_min:'', mo_max:'', cr_min:'', cr_max:'', n_max:'', cu_min:'', cu_max:'',
}

function GradeMaster() {
  const [grades,  setGrades]  = useState([])
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({ ...EMPTY_GRADE })
  const [editing, setEditing] = useState(null)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [search,  setSearch]  = useState('')

  useEffect(() => { loadGrades() }, [])

  async function loadGrades() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/grades`)
      const d = await r.json()
      setGrades(Array.isArray(d) ? d : [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function startEdit(g) {
    setEditing(g.id)
    setForm({ ...g })
  }

  function cancelEdit() {
    setEditing(null)
    setForm({ ...EMPTY_GRADE })
  }

  async function saveGrade() {
    if (!form.grade_code) { alert('Grade code is required'); return }
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url    = editing ? `${API}/api/grades/${editing}` : `${API}/api/grades`
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (d.success || d.id) {
        setMsg(editing ? 'Grade updated!' : 'Grade added!')
        setTimeout(() => setMsg(''), 2000)
        cancelEdit()
        loadGrades()
      } else {
        alert('Error: ' + (d.error || 'Unknown'))
      }
    } catch(e) { alert('Failed: ' + e.message) }
    finally { setSaving(false) }
  }

  const CHEM = [
    ['C', 'c_min', 'c_max'], ['Mn', 'mn_min', 'mn_max'],
    ['Si', 'si_min', 'si_max'], ['Cr', 'cr_min', 'cr_max'],
    ['Ni', 'ni_min', 'ni_max'], ['Mo', 'mo_min', 'mo_max'],
    ['S', 's_min', 's_max'], ['P (max)', 'p_max', null],
    ['N (max)', 'n_max', null], ['Cu', 'cu_min', 'cu_max'],
  ]

  const filtered = grades.filter(g => g.grade_code?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <SectionHeader title="Grade Master" sub={`${grades.length} grades in database · Chemical composition reference`} />

      {/* Add/Edit Form */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
          {editing ? '✏️ Edit Grade' : '+ Add New Grade'}
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:11, fontWeight:600, color:C.light, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:4 }}>Grade Code *</label>
          <input value={form.grade_code} onChange={e => set('grade_code', e.target.value)}
            placeholder="e.g. 1.4104 or 316L" style={{ ...inp('200px'), fontSize:13, fontWeight:700, color:C.orange }} />
        </div>

        <div style={{ fontSize:11, fontWeight:600, color:C.light, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>
          Chemical Composition (% by mass) — leave blank if not applicable
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:12 }}>
          {CHEM.map(([el, minKey, maxKey]) => (
            <div key={el} style={{ background:'#FAFBFC', border:`1px solid ${C.border}`, borderRadius:6, padding:'8px 10px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.blue, marginBottom:6, textTransform:'uppercase' }}>{el}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {minKey && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ fontSize:9, color:C.light, width:20 }}>Min</span>
                    <input type="number" step="0.001" value={form[minKey]||''} onChange={e => set(minKey, e.target.value)}
                      placeholder="—" style={{ ...inp(), fontSize:11, padding:'4px 6px' }} />
                  </div>
                )}
                {maxKey && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ fontSize:9, color:C.light, width:20 }}>Max</span>
                    <input type="number" step="0.001" value={form[maxKey]||''} onChange={e => set(maxKey, e.target.value)}
                      placeholder="—" style={{ ...inp(), fontSize:11, padding:'4px 6px' }} />
                  </div>
                )}
                {!maxKey && minKey && (
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <span style={{ fontSize:9, color:C.light, width:20 }}>Max</span>
                    <input type="number" step="0.001" value={form[minKey]||''} onChange={e => set(minKey, e.target.value)}
                      placeholder="—" style={{ ...inp(), fontSize:11, padding:'4px 6px' }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={saveGrade} disabled={saving} style={{ background:saving?'#ccc':C.orange, color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', fontSize:12, fontWeight:600, cursor:saving?'not-allowed':'pointer' }}>
            {saving ? 'Saving...' : editing ? '✓ Update Grade' : '+ Add Grade'}
          </button>
          {editing && (
            <button onClick={cancelEdit} style={{ background:C.white, color:'#555', border:`1px solid ${C.border}`, borderRadius:6, padding:'8px 16px', fontSize:12, cursor:'pointer' }}>
              Cancel
            </button>
          )}
          {msg && <span style={{ fontSize:12, color:'#2E7D32', fontWeight:600 }}>✓ {msg}</span>}
        </div>
      </div>

      {/* Grade List */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{filtered.length} Grades</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search grade..."
            style={{ ...inp('200px') }} />
        </div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:C.light }}>Loading...</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#EEF4FF', borderBottom:`1px solid ${C.border}` }}>
                {['Grade', 'C', 'Mn', 'Si', 'Cr', 'Ni', 'Mo', 'S', 'P max', 'N max', 'Action'].map(h => (
                  <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.blue, letterSpacing:'0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:'8px 10px', fontWeight:700, color:C.orange, fontFamily:'monospace' }}>{g.grade_code}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.c_min||'—'} – {g.c_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.mn_min||'—'} – {g.mn_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.si_min||'—'} – {g.si_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.cr_min||'—'} – {g.cr_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.ni_min||'—'} – {g.ni_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.mo_min||'—'} – {g.mo_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.s_min||'—'} – {g.s_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.p_max||'—'}</td>
                  <td style={{ padding:'8px 10px', fontSize:11 }}>{g.n_max||'—'}</td>
                  <td style={{ padding:'8px 10px' }}>
                    <button onClick={() => startEdit(g)} style={{ background:'#EEF4FF', color:C.blue, border:'none', borderRadius:4, padding:'3px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:32, textAlign:'center', color:C.light, fontSize:12 }}>No grades found</div>
        )}
      </div>
    </div>
  )
}

// ── CUSTOMER MASTER ───────────────────────────────────────────────
const EMPTY_CUST = {
  customer_name:'', short_code:'', country:'', address:'',
  contact_person:'', email:'', phone:'', payment_terms:'', incoterm:'',
}

function CustomerMaster() {
  const [customers, setCustomers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [form,      setForm]      = useState({ ...EMPTY_CUST })
  const [editing,   setEditing]   = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [search,    setSearch]    = useState('')

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/customers`)
      const d = await r.json()
      setCustomers(Array.isArray(d) ? d : [])
    } catch(e) { console.error(e) }
    finally { setLoading(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function startEdit(c) { setEditing(c.id); setForm({ ...c }) }
  function cancelEdit() { setEditing(null); setForm({ ...EMPTY_CUST }) }

  async function saveCustomer() {
    if (!form.customer_name) { alert('Customer name is required'); return }
    setSaving(true)
    try {
      const method = editing ? 'PUT' : 'POST'
      const url    = editing ? `${API}/api/customers/${editing}` : `${API}/api/customers`
      const r = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await r.json()
      if (d.success || d.id) {
        setMsg(editing ? 'Customer updated!' : 'Customer added!')
        setTimeout(() => setMsg(''), 2000)
        cancelEdit()
        loadCustomers()
      } else {
        alert('Error: ' + (d.error || 'Unknown'))
      }
    } catch(e) { alert('Failed: ' + e.message) }
    finally { setSaving(false) }
  }

  const filtered = customers.filter(c =>
    c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.country?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <SectionHeader title="Customer Master" sub={`${customers.length} customers · Used in SO creation and batch cards`} />

      {/* Add/Edit Form */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.border}` }}>
          {editing ? '✏️ Edit Customer' : '+ Add New Customer'}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
          {[
            ['Customer Name *', 'customer_name', 'e.g. Wilo SE'],
            ['Short Code',      'short_code',    'e.g. WILO'],
            ['Country',         'country',       'e.g. Germany'],
            ['Contact Person',  'contact_person','e.g. Mr. Werner Grimm'],
            ['Email',           'email',         'contact@company.com'],
            ['Phone',           'phone',         '+49 xxx'],
            ['Payment Terms',   'payment_terms', 'e.g. Payment against BL'],
            ['Inco Term',       'incoterm',      'e.g. CIF Hamburg'],
          ].map(([label, key, ph]) => (
            <div key={key}>
              <label style={{ fontSize:11, fontWeight:600, color:C.light, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:4 }}>{label}</label>
              <input value={form[key]||''} onChange={e => set(key, e.target.value)} placeholder={ph} style={inp()} />
            </div>
          ))}
          <div style={{ gridColumn:'span 3' }}>
            <label style={{ fontSize:11, fontWeight:600, color:C.light, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:4 }}>Address</label>
            <textarea value={form.address||''} onChange={e => set('address', e.target.value)}
              rows={2} placeholder="Full delivery address" style={{ ...inp(), resize:'none' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <button onClick={saveCustomer} disabled={saving} style={{ background:saving?'#ccc':C.orange, color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', fontSize:12, fontWeight:600, cursor:saving?'not-allowed':'pointer' }}>
            {saving ? 'Saving...' : editing ? '✓ Update Customer' : '+ Add Customer'}
          </button>
          {editing && (
            <button onClick={cancelEdit} style={{ background:C.white, color:'#555', border:`1px solid ${C.border}`, borderRadius:6, padding:'8px 16px', fontSize:12, cursor:'pointer' }}>Cancel</button>
          )}
          {msg && <span style={{ fontSize:12, color:'#2E7D32', fontWeight:600 }}>✓ {msg}</span>}
        </div>
      </div>

      

      {/* Customer List */}
      <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{filtered.length} Customers</div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customer..."
            style={{ ...inp('200px') }} />
        </div>
        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:C.light }}>Loading...</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:'#EEF4FF', borderBottom:`1px solid ${C.border}` }}>
                {['Customer Name','Short Code','Country','Contact','Email','Phone','Payment Terms','Inco Term','Action'].map(h => (
                  <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.blue, letterSpacing:'0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                  <td style={{ padding:'8px 10px', fontWeight:600, color:C.text }}>{c.customer_name}</td>
                  <td style={{ padding:'8px 10px' }}>
                    {c.short_code && <span style={{ background:'#EEF4FF', color:C.blue, padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>{c.short_code}</span>}
                  </td>
                  <td style={{ padding:'8px 10px', color:'#555' }}>{c.country||'—'}</td>
                  <td style={{ padding:'8px 10px', color:'#555' }}>{c.contact_person||'—'}</td>
                  <td style={{ padding:'8px 10px', color:'#555', fontSize:11 }}>{c.email||'—'}</td>
                  <td style={{ padding:'8px 10px', color:'#555', fontSize:11 }}>{c.phone||'—'}</td>
                  <td style={{ padding:'8px 10px', color:'#555', fontSize:11 }}>{c.payment_terms||'—'}</td>
                  <td style={{ padding:'8px 10px', color:'#555', fontSize:11 }}>{c.incoterm||'—'}</td>
                  <td style={{ padding:'8px 10px' }}>
                    <button onClick={() => startEdit(c)} style={{ background:'#EEF4FF', color:C.blue, border:'none', borderRadius:4, padding:'3px 10px', fontSize:11, fontWeight:600, cursor:'pointer' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && (
          <div style={{ padding:32, textAlign:'center', color:C.light, fontSize:12 }}>No customers found</div>
        )}
      </div>
    </div>
  )
}

// ── MAIN ADMIN PANEL ─────────────────────────────────────────────
export default function AdminPanel() {
  const [tab,        setTab]        = useState('grades')
  const [thresholds, setThresholds] = useState(STAGE_THRESHOLDS)
  const [machines,   setMachines]   = useState(MACHINES)
  const [saved,      setSaved]      = useState(false)

  function updateThreshold(idx, field, value) {
    setThresholds(prev => prev.map((t,i) => i===idx ? {...t,[field]:Number(value)} : t))
  }
  function updateMachineStatus(id, status) {
    setMachines(prev => prev.map(m => m.id===id ? {...m,status} : m))
  }
  function handleSave() { setSaved(true); setTimeout(()=>setSaved(false),2000) }

  const running     = machines.filter(m=>m.status==='Running').length
  const idle        = machines.filter(m=>m.status==='Idle').length
  const maintenance = machines.filter(m=>m.status==='Maintenance').length

  const TABS = [
    { key:'grades',     label:'Grade Master' },
    { key:'customers',  label:'Customer Master' },
    { key:'thresholds', label:'Stage Thresholds' },
    { key:'machines',   label:'Machines' },
    { key:'employees',  label:'Employees' },
    { key:'company',    label:'Company Info' },
    { key:'system',     label:'System Settings' },
  ]

  return (
    <div style={{ padding:'20px 28px', background:C.bg, minHeight:'100vh' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:22, fontWeight:700, color:C.text }}>Admin Panel</div>
        <div style={{ fontSize:12, color:C.light, marginTop:2 }}>System configuration and master data</div>
      </div>

      <div style={{ display:'flex', borderBottom:`1px solid ${C.border}`, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize:12, fontWeight:600, padding:'8px 16px', cursor:'pointer',
            border:'none', background:'transparent',
            color: tab===t.key ? C.orange : C.light,
            borderBottom: tab===t.key ? `2px solid ${C.orange}` : '2px solid transparent',
            marginBottom:-1,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'grades'    && <GradeMaster />}
      {tab === 'customers' && <CustomerMaster />}

      {tab === 'thresholds' && (
        <div>
          <SectionHeader title="Stage time thresholds" sub="Set warning and critical time limits (hours) for each stage" />
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden', marginBottom:16 }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#EEF4FF' }}>
                  {['Stage','Warning (hrs)','Critical (hrs)'].map(h=>(
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.blue, letterSpacing:'0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {thresholds.map((t,i) => (
                  <tr key={t.stage} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'8px 14px', fontWeight:500, fontSize:13 }}>{t.stage}</td>
                    <td style={{ padding:'8px 14px' }}>
                      <input type="number" value={t.warning} onChange={e=>updateThreshold(i,'warning',e.target.value)}
                        style={{ width:80, padding:'5px 8px', fontSize:13, border:'1px solid #FFE0B2', borderRadius:6, background:'#FFFBF5', color:'#FB8C00', fontWeight:600 }} />
                    </td>
                    <td style={{ padding:'8px 14px' }}>
                      <input type="number" value={t.critical} onChange={e=>updateThreshold(i,'critical',e.target.value)}
                        style={{ width:80, padding:'5px 8px', fontSize:13, border:'1px solid #FFCDD2', borderRadius:6, background:'#FFF5F5', color:'#E53935', fontWeight:600 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={handleSave} style={{ background:C.orange, color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {saved ? '✓ Saved!' : 'Save Thresholds'}
            </button>
          </div>
        </div>
      )}

      {tab === 'machines' && (
        <div>
          <SectionHeader title="Machine master" sub={`${machines.length} machines — ${running} running, ${idle} idle, ${maintenance} in maintenance`} />
          <div style={{ display:'flex', gap:12, marginBottom:16 }}>
            {[{label:'Running',value:running,color:'#43A047'},{label:'Idle',value:idle,color:'#757575'},{label:'Maintenance',value:maintenance,color:'#E53935'}].map(k=>(
              <div key={k.label} style={{ background:C.white, border:`1px solid ${C.border}`, borderTop:`3px solid ${k.color}`, borderRadius:8, padding:'12px 20px', flex:1 }}>
                <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:C.light, marginBottom:8 }}>{k.label}</div>
                <div style={{ fontSize:28, fontWeight:800, color:k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr style={{ background:'#EEF4FF' }}>{['Machine','Type','Shed','Status','Change'].map(h=><th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.blue, letterSpacing:'0.4px' }}>{h}</th>)}</tr></thead>
              <tbody>
                {machines.map(m=>(
                  <tr key={m.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'8px 14px', fontWeight:500 }}>{m.name}</td>
                    <td style={{ padding:'8px 14px', color:'#555' }}>{m.type}</td>
                    <td style={{ padding:'8px 14px', color:'#555' }}>{m.shed}</td>
                    <td style={{ padding:'8px 14px' }}><span style={{ fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:4, background:STATUS_STYLE[m.status]?.bg, color:STATUS_STYLE[m.status]?.color }}>{m.status}</span></td>
                    <td style={{ padding:'8px 14px' }}><select value={m.status} onChange={e=>updateMachineStatus(m.id,e.target.value)} style={{ fontSize:11, padding:'4px 8px', border:`1px solid ${C.border}`, borderRadius:5, background:C.white }}><option>Running</option><option>Idle</option><option>Maintenance</option></select></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'employees' && (
        <div>
          <SectionHeader title="Employee master" sub={`${EMPLOYEES.length} employees`} />
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr style={{ background:'#EEF4FF' }}>{['ID','Name','Role','Shed','Shift','Type'].map(h=><th key={h} style={{ padding:'8px 14px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', color:C.blue, letterSpacing:'0.4px' }}>{h}</th>)}</tr></thead>
              <tbody>
                {EMPLOYEES.map(e=>(
                  <tr key={e.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:'8px 14px', fontFamily:'monospace', fontSize:11, color:C.light }}>{e.id}</td>
                    <td style={{ padding:'8px 14px', fontWeight:500 }}>{e.name}</td>
                    <td style={{ padding:'8px 14px', color:'#555' }}>{e.role}</td>
                    <td style={{ padding:'8px 14px', color:'#555' }}>{e.shed}</td>
                    <td style={{ padding:'8px 14px' }}>{e.shift}</td>
                    <td style={{ padding:'8px 14px' }}><span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:4, background:TYPE_STYLE[e.type]?.bg, color:TYPE_STYLE[e.type]?.color }}>{e.type}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'company' && (
        <div style={{ maxWidth:600 }}>
          <SectionHeader title="Company information" sub="Used in documents, reports and PDFs" />
          <div style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, padding:24 }}>
            {[['Company name','Alok Ingots (Mumbai) Pvt. Ltd.'],['Address line 1','Plot No. 123, MIDC Industrial Area'],['Address line 2','Palghar, Maharashtra - 401 506'],['Country','India'],['GST no.','27AAACA1234F1ZX'],['IEC code','AAACA1234F'],['Website','www.alokindia.com'],['Email','exports@alokindia.com'],['Phone','+91 22 6766 0000'],['ISO cert no.','ISO 9001:2015'],['IATF cert no.','IATF 16949:2016']].map(([label,value])=>(
              <div key={label} style={{ display:'grid', gridTemplateColumns:'160px 1fr', gap:12, marginBottom:14, alignItems:'center' }}>
                <label style={{ fontSize:11, fontWeight:600, color:C.light, textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</label>
                <input defaultValue={value} style={{ ...inp() }} />
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
              <button onClick={handleSave} style={{ background:C.orange, color:'#fff', border:'none', borderRadius:6, padding:'8px 20px', fontSize:12, fontWeight:600, cursor:'pointer' }}>{saved?'✓ Saved!':'Save Info'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'system' && (
        <div style={{ maxWidth:600 }}>
          <SectionHeader title="System settings" sub="Configure PMS behavior" />
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {[
              {label:'Auto-refresh dashboard',       sub:'Refresh live floor every 5 minutes',        on:true},
              {label:'Email alerts for critical',    sub:'Send email when batch goes Critical',        on:true},
              {label:'WhatsApp alerts via Interakt', sub:'Send WhatsApp when batch goes Critical',     on:false},
              {label:'QR code scanning',             sub:'Enable QR-based stage tracking on floor',   on:true},
              {label:'Auto-generate batch card no.', sub:'Auto increment from last batch number',      on:true},
              {label:'Require operator sign-off',    sub:'Operator must enter name before each stage', on:true},
            ].map(s=>(
              <div key={s.label} style={{ background:C.white, border:`1px solid ${C.border}`, borderRadius:8, padding:'14px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:500, color:'#333' }}>{s.label}</div>
                  <div style={{ fontSize:11, color:C.light, marginTop:2 }}>{s.sub}</div>
                </div>
                <div style={{ width:40, height:22, borderRadius:22, background:s.on?C.orange:'#DDD', position:'relative', cursor:'pointer' }}>
                  <div style={{ position:'absolute', top:3, left:s.on?21:3, width:16, height:16, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}