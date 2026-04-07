import { useState } from 'react'

const MACHINES = [
  { id: 1, name: 'Kieserling WDH 60',  type: 'Peeling',        shed: 'Shed 1', status: 'Running' },
  { id: 2, name: 'Kieserling WDH 60Y', type: 'Peeling',        shed: 'Shed 1', status: 'Running' },
  { id: 3, name: 'Kieserling WDH 100Y',type: 'Peeling',        shed: 'Shed 2', status: 'Running' },
  { id: 4, name: 'STR 01',             type: 'Straightening',  shed: 'Shed 1', status: 'Running' },
  { id: 5, name: 'STR 07',             type: 'Straightening',  shed: 'Shed 1', status: 'Running' },
  { id: 6, name: 'STR 03',             type: 'Straightening',  shed: 'Shed 2', status: 'Idle' },
  { id: 7, name: 'STR JFN',            type: 'Straightening',  shed: 'Shed 2', status: 'Running' },
  { id: 8, name: 'STR 02',             type: 'Straightening',  shed: 'Shed 3', status: 'Maintenance' },
  { id: 9, name: 'CG-01',              type: 'Grinding',       shed: 'Shed 1', status: 'Running' },
  { id: 10, name: 'CG-02',             type: 'Grinding',       shed: 'Shed 1', status: 'Running' },
  { id: 11, name: 'CG-03',             type: 'Grinding',       shed: 'Shed 2', status: 'Idle' },
  { id: 12, name: 'CG-04',             type: 'Grinding',       shed: 'Shed 2', status: 'Running' },
  { id: 13, name: 'CG-05',             type: 'Grinding',       shed: 'Shed 3', status: 'Running' },
  { id: 14, name: 'CG-06',             type: 'Grinding',       shed: 'Shed 3', status: 'Running' },
  { id: 15, name: 'CG-07',             type: 'Grinding',       shed: 'Shed 3', status: 'Maintenance' },
  { id: 16, name: 'CG-08',             type: 'Grinding',       shed: 'Shed 3', status: 'Running' },
  { id: 17, name: 'Bandsaw 1',         type: 'Cutting',        shed: 'Shed 1', status: 'Running' },
  { id: 18, name: 'Bandsaw 2',         type: 'Cutting',        shed: 'Shed 2', status: 'Running' },
  { id: 19, name: 'Bandsaw 3',         type: 'Cutting',        shed: 'Shed 3', status: 'Idle' },
  { id: 20, name: 'Chamfering 1',      type: 'Chamfering',     shed: 'Shed 1', status: 'Running' },
  { id: 21, name: 'Chamfering 2',      type: 'Chamfering',     shed: 'Shed 2', status: 'Running' },
  { id: 22, name: 'Belt Polish',       type: 'Polishing',      shed: 'Shed 1', status: 'Running' },
  { id: 23, name: 'Buffing 01',        type: 'Polishing',      shed: 'Shed 2', status: 'Running' },
  { id: 24, name: 'Buffing 02',        type: 'Polishing',      shed: 'Shed 2', status: 'Idle' },
  { id: 25, name: 'Draw Bench 1',      type: 'Drawing',        shed: 'Shed 3', status: 'Running' },
  { id: 26, name: 'Suhumag',           type: 'MPI',            shed: 'Shed 1', status: 'Running' },
  { id: 27, name: 'Bull Block',        type: 'Drawing',        shed: 'Shed 3', status: 'Running' },
]

const EMPLOYEES = [
  { id: 'EMP001', name: 'Ramesh Kumar',    role: 'Operator',   shed: 'Shed 1', shift: 'A', type: 'Company' },
  { id: 'EMP002', name: 'Suresh Patil',    role: 'Operator',   shed: 'Shed 1', shift: 'B', type: 'Company' },
  { id: 'EMP003', name: 'Sanidhi',         role: 'Sales',      shed: 'Office', shift: 'Day', type: 'Company' },
  { id: 'EMP004', name: 'Mohan Das',       role: 'Inspector',  shed: 'Shed 2', shift: 'A', type: 'Company' },
  { id: 'EMP005', name: 'Kamlesh Verma',   role: 'Operator',   shed: 'Shed 2', shift: 'C', type: 'Company' },
  { id: 'EMP006', name: 'Rajan Shah',      role: 'Supervisor', shed: 'Shed 3', shift: 'A', type: 'Company' },
  { id: 'EMP007', name: 'Nilankshi',       role: 'Sales',      shed: 'Office', shift: 'Day', type: 'Company' },
  { id: 'EMP018', name: 'Maikel Wammes',   role: 'Sales',      shed: 'Remote', shift: 'Day', type: 'Company' },
  { id: 'EMP019', name: 'Rajendra',        role: 'Sales',      shed: 'Office', shift: 'Day', type: 'Company' },
  { id: 'EMP020', name: 'Ruchir',          role: 'Sales',      shed: 'Office', shift: 'Day', type: 'Company' },
]

const STAGE_THRESHOLDS = [
  { stage: 'RM Receive',      warning: 24, critical: 48 },
  { stage: 'UT Inspection',   warning: 8,  critical: 16 },
  { stage: 'HT Process',      warning: 12, critical: 24 },
  { stage: 'Black Bar Str.',  warning: 6,  critical: 12 },
  { stage: 'Peeling',         warning: 8,  critical: 16 },
  { stage: 'Bright Bar Str.', warning: 6,  critical: 12 },
  { stage: 'Grinding',        warning: 8,  critical: 16 },
  { stage: 'Cutting',         warning: 4,  critical: 8  },
  { stage: 'Chamfering',      warning: 4,  critical: 8  },
  { stage: 'Polishing',       warning: 6,  critical: 12 },
  { stage: 'MPI Final',       warning: 4,  critical: 8  },
  { stage: 'Packing',         warning: 8,  critical: 16 },
]

const STATUS_STYLE = {
  Running:     { bg: '#E8F5E9', color: '#2E7D32' },
  Idle:        { bg: '#F5F5F5', color: '#757575' },
  Maintenance: { bg: '#FFEBEE', color: '#C62828' },
}

const TYPE_STYLE = {
  Company:         { bg: '#E3F2FD', color: '#185FA5' },
  'Semi-contract': { bg: '#FFF3E0', color: '#FB8C00' },
  Helper:          { bg: '#F3E5F5', color: '#7B1FA2' },
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{title}</div>
      {sub && <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function AdminPanel() {
  const [tab, setTab]           = useState('thresholds')
  const [thresholds, setThresholds] = useState(STAGE_THRESHOLDS)
  const [machines, setMachines] = useState(MACHINES)
  const [saved, setSaved]       = useState(false)

  function updateThreshold(idx, field, value) {
    setThresholds(prev => prev.map((t, i) => i === idx ? { ...t, [field]: Number(value) } : t))
  }

  function updateMachineStatus(id, status) {
    setMachines(prev => prev.map(m => m.id === id ? { ...m, status } : m))
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const running     = machines.filter(m => m.status === 'Running').length
  const idle        = machines.filter(m => m.status === 'Idle').length
  const maintenance = machines.filter(m => m.status === 'Maintenance').length

  const TABS = [
    { key: 'thresholds', label: 'Stage thresholds' },
    { key: 'machines',   label: 'Machines' },
    { key: 'employees',  label: 'Employees' },
    { key: 'company',    label: 'Company info' },
    { key: 'system',     label: 'System settings' },
  ]

  return (
    <div style={{ padding: '20px 28px', background: '#F7F8FA', minHeight: '100vh' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>Admin panel</div>
        <div style={{ fontSize: 12, color: '#AAA', marginTop: 2 }}>System configuration and master data</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #EEEEEE', marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            fontSize: 13, fontWeight: 500, padding: '8px 18px',
            cursor: 'pointer', border: 'none', background: 'transparent',
            color: tab === t.key ? '#111' : '#AAA',
            borderBottom: tab === t.key ? '2px solid #E8642A' : '2px solid transparent',
            marginBottom: -1,
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stage thresholds */}
      {tab === 'thresholds' && (
        <div>
          <SectionHeader title="Stage time thresholds" sub="Set warning and critical time limits (in hours) for each production stage" />
          <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Warning threshold (hrs)</th>
                  <th>Critical threshold (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {thresholds.map((t, i) => (
                  <tr key={t.stage}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{t.stage}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="number" value={t.warning} onChange={e => updateThreshold(i, 'warning', e.target.value)}
                          style={{ width: 80, padding: '5px 8px', fontSize: 13, border: '1px solid #FFF3E0', borderRadius: 6, background: '#FFFBF5', color: '#FB8C00', fontWeight: 600 }} />
                        <span style={{ fontSize: 11, color: '#AAA' }}>hrs</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="number" value={t.critical} onChange={e => updateThreshold(i, 'critical', e.target.value)}
                          style={{ width: 80, padding: '5px 8px', fontSize: 13, border: '1px solid #FFEBEE', borderRadius: 6, background: '#FFF5F5', color: '#E53935', fontWeight: 600 }} />
                        <span style={{ fontSize: 11, color: '#AAA' }}>hrs</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={handleSave}>
              {saved ? '✓ Saved!' : 'Save thresholds'}
            </button>
          </div>
        </div>
      )}

      {/* Machines */}
      {tab === 'machines' && (
        <div>
          <SectionHeader title="Machine master" sub={`${machines.length} machines — ${running} running, ${idle} idle, ${maintenance} in maintenance`} />
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Running',     value: running,     color: '#43A047' },
              { label: 'Idle',        value: idle,        color: '#757575' },
              { label: 'Maintenance', value: maintenance, color: '#E53935' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: '1px solid #EEEEEE', borderTop: `3px solid ${k.color}`, borderRadius: 8, padding: '12px 20px', flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#AAA', marginBottom: 8 }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Machine name</th>
                  <th>Type</th>
                  <th>Shed</th>
                  <th>Status</th>
                  <th>Change status</th>
                </tr>
              </thead>
              <tbody>
                {machines.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{m.name}</td>
                    <td style={{ fontSize: 12, color: '#555' }}>{m.type}</td>
                    <td style={{ fontSize: 12, color: '#555' }}>{m.shed}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 4, background: STATUS_STYLE[m.status]?.bg, color: STATUS_STYLE[m.status]?.color }}>
                        {m.status}
                      </span>
                    </td>
                    <td>
                      <select value={m.status} onChange={e => updateMachineStatus(m.id, e.target.value)}
                        style={{ fontSize: 11, padding: '4px 8px', border: '1px solid #E5E5E5', borderRadius: 5, background: '#fff' }}>
                        <option>Running</option>
                        <option>Idle</option>
                        <option>Maintenance</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employees */}
      {tab === 'employees' && (
        <div>
          <SectionHeader title="Employee master" sub={`${EMPLOYEES.length} employees — company + contract`} />
          <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, overflow: 'hidden' }}>
            <table>
              <thead>
                <tr>
                  <th>Emp ID</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Shed</th>
                  <th>Shift</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#AAA' }}>{e.id}</td>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{e.name}</td>
                    <td style={{ fontSize: 12, color: '#555' }}>{e.role}</td>
                    <td style={{ fontSize: 12, color: '#555' }}>{e.shed}</td>
                    <td style={{ fontSize: 12 }}>{e.shift}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: TYPE_STYLE[e.type]?.bg, color: TYPE_STYLE[e.type]?.color }}>
                        {e.type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Company info */}
      {tab === 'company' && (
        <div style={{ maxWidth: 600 }}>
          <SectionHeader title="Company information" sub="Used in documents, reports and PDFs" />
          <div style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, padding: 24 }}>
            {[
              ['Company name',     'Alok Ingots (Mumbai) Pvt. Ltd.'],
              ['Address line 1',   'Plot No. 123, MIDC Industrial Area'],
              ['Address line 2',   'Palghar, Maharashtra - 401 506'],
              ['Country',          'India'],
              ['GST no.',          '27AAACA1234F1ZX'],
              ['IEC code',         'AAACA1234F'],
              ['Website',          'www.alokindia.com'],
              ['Email',            'exports@alokindia.com'],
              ['Phone',            '+91 22 6766 0000'],
              ['ISO cert no.',     'ISO 9001:2015'],
              ['IATF cert no.',    'IATF 16949:2016'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, marginBottom: 14, alignItems: 'center' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#AAA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
                <input defaultValue={value} style={{ padding: '7px 10px', fontSize: 13, border: '1px solid #E5E5E5', borderRadius: 6, color: '#333', fontFamily: 'inherit' }} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave}>
                {saved ? '✓ Saved!' : 'Save company info'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System settings */}
      {tab === 'system' && (
        <div style={{ maxWidth: 600 }}>
          <SectionHeader title="System settings" sub="Configure PMS behavior" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Auto-refresh dashboard',       sub: 'Refresh live floor every 5 minutes',       defaultChecked: true  },
              { label: 'Email alerts for critical',    sub: 'Send email when batch goes Critical',       defaultChecked: true  },
              { label: 'WhatsApp alerts via Interakt', sub: 'Send WhatsApp when batch goes Critical',    defaultChecked: false },
              { label: 'QR code scanning',             sub: 'Enable QR-based stage tracking on floor',  defaultChecked: true  },
              { label: 'Auto-generate batch card no.', sub: 'Auto increment from last batch number',     defaultChecked: true  },
              { label: 'Require operator sign-off',    sub: 'Operator must enter name before each stage',defaultChecked: true  },
            ].map(setting => (
              <div key={setting.label} style={{ background: '#fff', border: '1px solid #EEEEEE', borderRadius: 8, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{setting.label}</div>
                  <div style={{ fontSize: 11, color: '#AAA', marginTop: 2 }}>{setting.sub}</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: 40, height: 22, cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked={setting.defaultChecked} style={{ opacity: 0, width: 0, height: 0 }}
                    onChange={() => {}} />
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 22,
                    background: setting.defaultChecked ? '#E8642A' : '#DDD',
                    transition: '0.2s',
                    cursor: 'pointer',
                  }}>
                    <span style={{
                      position: 'absolute', top: 3, left: setting.defaultChecked ? 21 : 3,
                      width: 16, height: 16, borderRadius: '50%', background: '#fff',
                      transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </span>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}