import { useEffect, useMemo, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// ── helpers ──────────────────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) }
  catch { return d }
}

// ── styles ───────────────────────────────────────────────────────────────────
const smallButton = {
  padding: '5px 12px', borderRadius: 6, border: '1px solid #D1D5DB',
  background: '#fff', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#374151'
}
const primaryButton = {
  padding: '5px 12px', borderRadius: 6, border: 'none',
  background: '#1a3a6b', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#fff'
}
const selectStyle = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #D1D5DB',
  fontSize: 13, background: '#fff', minWidth: 260
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, bg, color }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6, padding:'3px 10px',
      borderRadius:999, fontSize:11, fontWeight:700, background:bg, color
    }}>
      {children}
    </span>
  )
}

// ── Build doc list from dispatch ──────────────────────────────────────────────
function buildDocuments(dispatch) {
  if (!dispatch) return []
  const isExport = dispatch.dispatch_type === 'Export'
  const docs = []
  if (isExport) {
    docs.push({ id: 'commercial-invoice', name: 'Commercial Invoice', type: 'Export', kind: 'commercial_invoice' })
  }
  docs.push({ id: 'packing-list', name: 'Packing List', type: isExport ? 'Export' : 'Domestic', kind: 'packing_list' })
  docs.push({ id: 'mtc', name: 'MTC (EN 10204/3.1)', type: 'Both', kind: 'mtc' })
  if (isExport) {
    docs.push({ id: 'sales-contract', name: 'Sales Contract', type: 'Export', kind: 'sales_contract' })
  } else {
    docs.push({ id: 'tax-invoice', name: 'Tax Invoice', type: 'Domestic', kind: 'tax_invoice' })
  }
  return docs
}

// ── Commercial Invoice Modal ──────────────────────────────────────────────────
function CommercialInvoiceModal({ dispatch, onClose }) {
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [form,   setForm]   = useState({
    invoice_no:          dispatch.invoice_no || '',
    invoice_date:        new Date().toISOString().slice(0,10),
    buyer_name:          dispatch.customer || '',
    buyer_address:       '',
    pre_carriage:        'BY SEA',
    place_of_receipt:    'JNPT., NHAVA SHEVA',
    vessel:              dispatch.vessel_name || '',
    port_loading:        dispatch.port_loading || 'NHAVA SHEVA',
    port_discharge:      dispatch.port_discharge || '',
    final_destination:   dispatch.final_destination || '',
    country_destination: dispatch.country || '',
    payment_terms:       dispatch.payment_terms || '',
    marks_no:            '',
    container_no:        dispatch.container_no || '',
    seal_no:             dispatch.seal_no || '',
    bl_no:               dispatch.bl_number || '',
  })

  const inp = (label, key, opts={}) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:600, color:'#555', marginBottom:3 }}>
        {label}{opts.required && <span style={{color:'red'}}> *</span>}
      </label>
      <input
        value={form[key] || ''}
        onChange={e => setForm(f => ({...f, [key]: e.target.value}))}
        placeholder={opts.placeholder || ''}
        style={{ width:'100%', padding:'6px 10px', border:'1px solid #ddd', borderRadius:5, fontSize:12 }}
      />
    </div>
  )

  const handleGenerate = async () => {
    if (!form.invoice_no) { setError('Invoice number is required'); return }
    setSaving(true); setError('')
    try {
      const res  = await fetch(`${API}/api/invoice/create-from-dispatch/${dispatch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSaving(false); return }
      window.open(`${API}${data.pdf_url}`, '_blank')
      onClose()
    } catch(e) {
      setError('Failed to create invoice'); setSaving(false)
    }
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.5)',
      zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'
    }}>
      <div style={{
        background:'white', borderRadius:10, width:680, maxHeight:'90vh',
        overflowY:'auto', boxShadow:'0 8px 40px rgba(0,0,0,0.25)'
      }}>
        <div style={{
          background:'#1a3a6b', color:'white', padding:'14px 20px',
          borderRadius:'10px 10px 0 0', display:'flex', justifyContent:'space-between', alignItems:'center'
        }}>
          <div>
            <div style={{fontWeight:700, fontSize:15}}>📄 Generate Commercial Invoice</div>
            <div style={{fontSize:11, opacity:0.8, marginTop:2}}>Dispatch: {dispatch.dispatch_no || dispatch.id}</div>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'white',fontSize:20,cursor:'pointer'}}>✕</button>
        </div>
        <div style={{padding:20}}>
          {error && (
            <div style={{background:'#fff0f0',border:'1px solid #ffccc7',borderRadius:6,padding:'8px 12px',marginBottom:12,color:'#c00',fontSize:12}}>
              {error}
            </div>
          )}
          <div style={{fontWeight:700,fontSize:11,color:'#1a3a6b',borderBottom:'2px solid #1a3a6b',paddingBottom:3,marginBottom:10}}>INVOICE DETAILS</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            {inp('Invoice No.','invoice_no',{required:true,placeholder:'e.g. EXP-120/2025-26'})}
            {inp('Invoice Date','invoice_date')}
          </div>
          <div style={{fontWeight:700,fontSize:11,color:'#1a3a6b',borderBottom:'2px solid #1a3a6b',paddingBottom:3,marginBottom:10,marginTop:6}}>BUYER</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            {inp('Buyer Name','buyer_name',{required:true})}
            {inp('Country of Destination','country_destination',{placeholder:'e.g. GERMANY'})}
          </div>
          <div style={{fontWeight:700,fontSize:11,color:'#1a3a6b',borderBottom:'2px solid #1a3a6b',paddingBottom:3,marginBottom:10,marginTop:6}}>SHIPPING</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 16px'}}>
            {inp('Vessel / Flight No.','vessel',{placeholder:'e.g. ALULA EXPRESS /544W'})}
            {inp('Container No.','container_no')}
            {inp('Seal No.','seal_no')}
            {inp('BL No.','bl_no')}
            {inp('Port of Loading','port_loading')}
            {inp('Port of Discharge','port_discharge')}
            {inp('Final Destination','final_destination')}
            {inp('Payment Terms','payment_terms',{placeholder:'e.g. DP'})}
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:14}}>
            <button onClick={onClose} style={smallButton}>Cancel</button>
            <button onClick={handleGenerate} disabled={saving} style={{...primaryButton,opacity:saving?0.7:1}}>
              {saving ? 'Creating...' : '🖨 Generate & Open PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Preview Placeholder ───────────────────────────────────────────────────────
function PreviewPane({ doc, dispatch, onGenerateCI }) {
  if (!doc || !dispatch) return (
    <div style={{padding:40,textAlign:'center',color:'#9CA3AF',fontSize:13}}>Select a document to preview</div>
  )

  if (doc.kind === 'commercial_invoice') {
    return (
      <div style={{padding:32,textAlign:'center'}}>
        <div style={{fontSize:48,marginBottom:16}}>📄</div>
        <div style={{fontSize:16,fontWeight:700,color:'#111',marginBottom:8}}>Commercial Invoice</div>
        <div style={{fontSize:13,color:'#6B7280',marginBottom:24}}>
          Click Generate to fill in vessel, container, BL details and create the invoice PDF.
        </div>
        <button onClick={onGenerateCI} style={{...primaryButton,padding:'10px 28px',fontSize:13}}>
          📄 Generate Commercial Invoice
        </button>
      </div>
    )
  }

  // Generic placeholder for other docs
  return (
    <div style={{padding:32,textAlign:'center',color:'#9CA3AF'}}>
      <div style={{fontSize:48,marginBottom:12}}>📋</div>
      <div style={{fontSize:14,fontWeight:600,color:'#374151',marginBottom:6}}>{doc.name}</div>
      <div style={{fontSize:12,marginBottom:20}}>
        Dispatch: {dispatch.dispatch_no || dispatch.id} — {dispatch.customer}
      </div>
      <div style={{display:'flex',gap:10,justifyContent:'center'}}>
        <button
          style={primaryButton}
          onClick={() => window.open(`${API}/api/pdf/${doc.kind}/${dispatch.id}`, '_blank')}
        >
          🖨 Generate & Open PDF
        </button>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Documents() {
  const [dispatches,         setDispatches]         = useState([])
  const [loadingDispatches,  setLoadingDispatches]  = useState(true)
  const [selectedDispatchId, setSelectedDispatchId] = useState('')
  const [selectedDocId,      setSelectedDocId]      = useState('')
  const [search,             setSearch]             = useState('')
  const [showCIModal,        setShowCIModal]        = useState(false)

  // Fetch real dispatches
  useEffect(() => {
    fetch(`${API}/api/dispatch`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : []
        setDispatches(list)
        if (list.length) setSelectedDispatchId(String(list[0].id))
        setLoadingDispatches(false)
      })
      .catch(() => setLoadingDispatches(false))
  }, [])

  const selectedDispatch = useMemo(
    () => dispatches.find(d => String(d.id) === selectedDispatchId) || dispatches[0] || null,
    [dispatches, selectedDispatchId]
  )

  const documents = useMemo(() => buildDocuments(selectedDispatch), [selectedDispatch])

  useEffect(() => {
    if (documents.length && !documents.find(d => d.id === selectedDocId)) {
      setSelectedDocId(documents[0]?.id || '')
    }
  }, [documents])

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return documents
    return documents.filter(d => d.name.toLowerCase().includes(q) || d.type.toLowerCase().includes(q))
  }, [documents, search])

  const selectedDoc = filteredDocs.find(d => d.id === selectedDocId) || filteredDocs[0] || null

  const handleDownload = (doc) => {
    if (doc.kind === 'commercial_invoice') {
      setShowCIModal(true)
    } else {
      window.open(`${API}/api/pdf/${doc.kind}/${selectedDispatch?.id}`, '_blank')
    }
  }

  const handleRegenerate = (doc) => {
    if (doc.kind === 'commercial_invoice') {
      setShowCIModal(true)
    } else {
      window.open(`${API}/api/pdf/${doc.kind}/${selectedDispatch?.id}`, '_blank')
    }
  }

  return (
    <div style={{ padding:'24px 28px', background:'#F3F4F6', minHeight:'100vh' }}>

      {showCIModal && selectedDispatch && (
        <CommercialInvoiceModal
          dispatch={selectedDispatch}
          onClose={() => setShowCIModal(false)}
        />
      )}

      <div style={{ marginBottom:18 }}>
        <div style={{ fontSize:24, fontWeight:800, color:'#111827', marginBottom:6 }}>Documents</div>
        <div style={{ fontSize:13, color:'#6B7280' }}>
          Generate and download export/dispatch documents.
        </div>
      </div>

      {/* Dispatch selector */}
      <div style={{ marginBottom:16, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
        {loadingDispatches ? (
          <div style={{fontSize:13,color:'#888'}}>Loading dispatches...</div>
        ) : dispatches.length === 0 ? (
          <div style={{fontSize:13,color:'#888'}}>No dispatches found.</div>
        ) : (
          <select
            value={selectedDispatchId}
            onChange={e => { setSelectedDispatchId(e.target.value); setSearch('') }}
            style={selectStyle}
          >
            {dispatches.map(d => (
              <option key={d.id} value={String(d.id)}>
                {d.dispatch_no || `DIS-${d.id}`} — {d.customer} — {d.dispatch_type || 'Export'}
              </option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ padding:'8px 12px', borderRadius:8, border:'1px solid #D1D5DB', fontSize:13, background:'#fff', width:200 }}
        />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'360px 1fr', gap:16, alignItems:'start' }}>

        {/* Left: Document list */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', minHeight:500 }}>
          <div style={{ padding:'14px 16px', borderBottom:'1px solid #E5E7EB', background:'#FAFAFA' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#111' }}>Document List</div>
            {selectedDispatch && (
              <div style={{ fontSize:11, color:'#6B7280', marginTop:2 }}>
                {selectedDispatch.dispatch_no || `DIS-${selectedDispatch.id}`} · {selectedDispatch.dispatch_type || 'Export'}
              </div>
            )}
          </div>
          <div style={{ padding:12 }}>
            {filteredDocs.map(doc => (
              <div key={doc.id} style={{
                border: selectedDocId === doc.id ? '2px solid #1a3a6b' : '1px solid #E5E7EB',
                borderRadius:10, padding:'12px 14px', marginBottom:10,
                background: selectedDocId === doc.id ? '#F0F4FF' : '#fff',
                cursor:'pointer'
              }}
                onClick={() => setSelectedDocId(doc.id)}
              >
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#111' }}>{doc.name}</div>
                  <Badge
                    bg={doc.type==='Export'?'#EFF6FF':doc.type==='Domestic'?'#F0FDF4':'#FFF7ED'}
                    color={doc.type==='Export'?'#1D4ED8':doc.type==='Domestic'?'#15803D':'#C2410C'}
                  >
                    {doc.type}
                  </Badge>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button style={smallButton} onClick={e => { e.stopPropagation(); setSelectedDocId(doc.id) }}>
                    Preview
                  </button>
                  <button style={smallButton} onClick={e => { e.stopPropagation(); handleDownload(doc) }}>
                    Download PDF
                  </button>
                  <button style={smallButton} onClick={e => { e.stopPropagation(); handleRegenerate(doc) }}>
                    Regenerate
                  </button>
                </div>
              </div>
            ))}
            {filteredDocs.length === 0 && (
              <div style={{ textAlign:'center', padding:30, color:'#6B7280', fontSize:13 }}>
                No documents found.
              </div>
            )}
          </div>
        </div>

        {/* Right: Preview pane */}
        <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, minHeight:500, overflow:'hidden' }}>
          <div style={{
            padding:'14px 18px', borderBottom:'1px solid #E5E7EB', background:'#FAFAFA',
            display:'flex', justifyContent:'space-between', alignItems:'center', gap:12
          }}>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#111827' }}>Live Preview</div>
              <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>
                {selectedDoc?.name || 'Select a document'}
              </div>
            </div>
            {selectedDoc && (
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button style={smallButton} onClick={() => handleDownload(selectedDoc)}>
                  Download PDF
                </button>
                <button style={primaryButton} onClick={() => handleRegenerate(selectedDoc)}>
                  Regenerate
                </button>
              </div>
            )}
          </div>

          <PreviewPane
            doc={selectedDoc}
            dispatch={selectedDispatch}
            onGenerateCI={() => setShowCIModal(true)}
          />
        </div>

      </div>
    </div>
  )
}