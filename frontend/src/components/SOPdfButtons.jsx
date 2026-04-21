import { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export default function SOPdfButtons({ soNumber, soType = 'export' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openPdf = (type, copy) => {
    const url = `${API}/api/pdf/so/${encodeURIComponent(soNumber)}?type=${type}&copy=${copy}`
    window.open(url, '_blank')
    setOpen(false)
  }

  const isLocal   = soType === 'local'
  const typeLabel = isLocal ? 'Local' : 'Export'
  const typeColor = isLocal ? '#e67e22' : '#2980b9'

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: '#185FA5', color: '#fff', border: 'none',
          borderRadius: 6, padding: '7px 14px', fontSize: 12,
          fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
        }}
      >
        Print Sales Contract
        <span style={{ background: typeColor, borderRadius: 3, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>
          {typeLabel}
        </span>
        <span style={{ fontSize: 10, opacity: 0.8 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 3,
          background: '#fff', border: '1px solid #dde3ea', borderRadius: 5,
          boxShadow: '0 4px 16px rgba(0,0,0,0.13)', zIndex: 1000,
          minWidth: 210, overflow: 'hidden'
        }}>
          <div style={{
            padding: '5px 10px', fontSize: 10, fontWeight: 700,
            color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
            background: '#f8fafc', borderBottom: '1px solid #eee'
          }}>
            {typeLabel} — {isLocal ? 'KG' : 'Metric Tons'}
          </div>

          <div
            onClick={() => openPdf(soType, 'customer')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f7ff'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <span style={{ fontSize: 16 }}>👤</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>Customer Copy</div>
              <div style={{ fontSize: 10, color: '#888' }}>With price and amount ({isLocal ? 'INR/KG' : 'EUR/MT'})</div>
            </div>
          </div>

          <div
            onClick={() => openPdf(soType, 'plant')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
          >
            <span style={{ fontSize: 16 }}>🏭</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12 }}>Plant Copy</div>
              <div style={{ fontSize: 10, color: '#888' }}>No price — factory use only</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
