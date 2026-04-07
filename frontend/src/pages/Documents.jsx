import { useEffect, useMemo, useState } from 'react'

const SAMPLE_DISPATCHES = [
  {
    id: 'DIS-20260330-101',
    dispatch_no: 'DIS-20260330-101',
    dispatch_type: 'Export',
    customer: 'ABC Metals GmbH',
    buyer: 'ABC Metals GmbH',
    consignee: 'ABC Metals Warehouse',
    notify_party: 'ABC Logistics',
    invoice_no: 'CI-2026-001',
    tax_invoice_no: '',
    packing_list_no: 'PL-2026-001',
    mtc_no: 'MTC-2026-001',
    sales_contract_no: 'SC-2026-001',
    container_no: 'MSKU1234567',
    vessel_name: 'MSC Aurora',
    bl_no: 'BL123456',
    etd: '2026-04-02',
    eta: '2026-04-18',
    currency: 'USD',
    port_of_loading: 'Nhava Sheva',
    port_of_discharge: 'Hamburg',
    payment_terms: '30% advance, balance against BL copy',
    incoterms: 'FOB Nhava Sheva',
    cbam_clause: 'Buyer acknowledges CBAM compliance documentation shall be provided as applicable.',
    gstin: '',
    hsn_code: '722220',
    irn: '',
    einvoice_qr: '',
    seller: {
      name: 'Alok Ingots (Mumbai) Pvt. Ltd.',
      address: 'Mumbai, Maharashtra, India',
      gstin: '27AAAAA0000A1Z5',
    },
    bundles: [
      { bundle_no: 'B-001', pieces: 20, net_wt: 1200, gross_wt: 1230 },
      { bundle_no: 'B-002', pieces: 18, net_wt: 1080, gross_wt: 1110 },
    ],
    items: [
      {
        batch_card_no: 'BC-1001',
        heat_no: 'H-7781',
        grade_code: 'SS 304',
        size: '25 mm',
        finish: 'Bright Bar',
        qty_pcs: 20,
        net_wt: 1200,
        gross_wt: 1230,
      },
      {
        batch_card_no: 'BC-1002',
        heat_no: 'H-7782',
        grade_code: 'SS 316',
        size: '30 mm',
        finish: 'Ground Bar',
        qty_pcs: 18,
        net_wt: 1080,
        gross_wt: 1110,
      },
    ],
    chemical: [
      { element: 'C', value: '0.05%' },
      { element: 'Mn', value: '1.42%' },
      { element: 'Si', value: '0.48%' },
      { element: 'Cr', value: '18.20%' },
      { element: 'Ni', value: '8.10%' },
      { element: 'Mo', value: '2.05%' },
    ],
    mechanical: [
      { property: 'UTS', value: '640 MPa' },
      { property: 'YS', value: '310 MPa' },
      { property: 'Elongation', value: '42%' },
      { property: 'Hardness', value: '187 HB' },
    ],
    certifications: ['EN 10204 3.1', 'ISO 9001:2015', 'PED 2014/68/EU', 'CBAM Compliant'],
    signatures: {
      seller: 'Authorized Signatory - Alok Ingots',
      buyer: 'Authorized Signatory - Buyer',
    },
  },
  {
    id: 'DIS-20260330-102',
    dispatch_no: 'DIS-20260330-102',
    dispatch_type: 'Domestic',
    customer: 'Shakti Precision Components',
    buyer: 'Shakti Precision Components',
    consignee: 'Shakti Precision Components',
    notify_party: '',
    invoice_no: '',
    tax_invoice_no: 'TI-2026-014',
    packing_list_no: 'PL-2026-014',
    mtc_no: 'MTC-2026-014',
    sales_contract_no: '',
    container_no: '',
    vessel_name: '',
    bl_no: '',
    etd: '2026-03-31',
    eta: '2026-04-01',
    currency: 'INR',
    port_of_loading: '',
    port_of_discharge: '',
    payment_terms: '30 days credit',
    incoterms: '',
    cbam_clause: '',
    gstin: '27AACCS1234F1Z2',
    hsn_code: '722220',
    irn: '1f9b4d7a9c3d8e77445566778899aa22',
    einvoice_qr: 'E-Invoice QR Generated',
    seller: {
      name: 'Alok Ingots (Mumbai) Pvt. Ltd.',
      address: 'Mumbai, Maharashtra, India',
      gstin: '27AAAAA0000A1Z5',
    },
    bundles: [
      { bundle_no: 'B-010', pieces: 12, net_wt: 720, gross_wt: 740 },
      { bundle_no: 'B-011', pieces: 15, net_wt: 900, gross_wt: 925 },
    ],
    items: [
      {
        batch_card_no: 'BC-2001',
        heat_no: 'H-8891',
        grade_code: 'EN8',
        size: '32 mm',
        finish: 'Peeled Bar',
        qty_pcs: 12,
        net_wt: 720,
        gross_wt: 740,
      },
      {
        batch_card_no: 'BC-2002',
        heat_no: 'H-8892',
        grade_code: 'EN8',
        size: '35 mm',
        finish: 'Bright Bar',
        qty_pcs: 15,
        net_wt: 900,
        gross_wt: 925,
      },
    ],
    chemical: [
      { element: 'C', value: '0.40%' },
      { element: 'Mn', value: '0.75%' },
      { element: 'Si', value: '0.22%' },
      { element: 'S', value: '0.02%' },
      { element: 'P', value: '0.02%' },
    ],
    mechanical: [
      { property: 'UTS', value: '580 MPa' },
      { property: 'YS', value: '350 MPa' },
      { property: 'Elongation', value: '18%' },
      { property: 'Hardness', value: '201 HB' },
    ],
    certifications: ['EN 10204 3.1', 'ISO 9001:2015'],
    signatures: {
      seller: 'Authorized Signatory - Alok Ingots',
      buyer: '',
    },
  },
]

function buildDocuments(dispatch) {
  if (!dispatch) return []

  const exportDocs = [
    {
      id: 'commercial-invoice',
      name: 'Commercial Invoice',
      type: 'Export',
      kind: 'commercial_invoice',
    },
    {
      id: 'packing-list-export',
      name: 'Packing List',
      type: 'Export',
      kind: 'packing_list_export',
    },
    {
      id: 'mtc-export',
      name: 'MTC (EN 10204/3.1)',
      type: 'Both',
      kind: 'mtc',
    },
    {
      id: 'sales-contract',
      name: 'Sales Contract',
      type: 'Export',
      kind: 'sales_contract',
    },
  ]

  const domesticDocs = [
    {
      id: 'tax-invoice',
      name: 'Tax Invoice',
      type: 'Domestic',
      kind: 'tax_invoice',
    },
    {
      id: 'packing-list-domestic',
      name: 'Packing List',
      type: 'Domestic',
      kind: 'packing_list_domestic',
    },
    {
      id: 'mtc-domestic',
      name: 'MTC (EN 10204/3.1)',
      type: 'Both',
      kind: 'mtc',
    },
  ]

  return dispatch.dispatch_type === 'Export' ? exportDocs : domesticDocs
}

function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('en-GB')
  } catch {
    return value
  }
}

function money(value, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

function sum(arr, key) {
  return (arr || []).reduce((acc, item) => acc + Number(item[key] || 0), 0)
}

function Badge({ children, bg, color }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: bg,
        color,
      }}
    >
      {children}
    </span>
  )
}

function Documents() {
  const [dispatches] = useState(SAMPLE_DISPATCHES)
  const [selectedDispatchId, setSelectedDispatchId] = useState(SAMPLE_DISPATCHES[0]?.id || '')
  const [selectedDocId, setSelectedDocId] = useState('')
  const [search, setSearch] = useState('')

  const selectedDispatch = useMemo(
    () => dispatches.find((d) => d.id === selectedDispatchId) || dispatches[0],
    [dispatches, selectedDispatchId]
  )

  const documents = useMemo(() => buildDocuments(selectedDispatch), [selectedDispatch])

  useEffect(() => {
    if (!documents.length) {
      setSelectedDocId('')
      return
    }

    const stillExists = documents.some((doc) => doc.id === selectedDocId)
    if (!stillExists) {
      setSelectedDocId(documents[0].id)
    }
  }, [documents, selectedDocId])

  const filteredDocs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return documents

    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        doc.type.toLowerCase().includes(q)
    )
  }, [documents, search])

  const selectedDoc =
    filteredDocs.find((doc) => doc.id === selectedDocId) ||
    documents.find((doc) => doc.id === selectedDocId) ||
    filteredDocs[0] ||
    documents[0] ||
    null

  function handlePreview(docId) {
    setSelectedDocId(docId)
  }

  function handleDownload(doc) {
    alert(`Downloading ${doc.name} PDF for ${selectedDispatch.dispatch_no}`)
  }

  function handleRegenerate(doc) {
    alert(`Regenerated ${doc.name} for ${selectedDispatch.dispatch_no}`)
  }

  return (
    <div style={{ padding: '24px 28px', background: '#F3F4F6', minHeight: '100vh' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
          Documents
        </div>
        <div style={{ fontSize: 13, color: '#6B7280' }}>
          Split view with document list on the left and live preview on the right.
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={selectedDispatchId}
          onChange={(e) => {
            setSelectedDispatchId(e.target.value)
            setSearch('')
          }}
          style={selectStyle}
        >
          {dispatches.map((dispatch) => (
            <option key={dispatch.id} value={dispatch.id}>
              {dispatch.dispatch_no} — {dispatch.customer} — {dispatch.dispatch_type}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search documents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '370px 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            overflow: 'hidden',
            minHeight: 720,
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid #E5E7EB',
              background: '#FAFAFA',
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Document list</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              {selectedDispatch?.dispatch_no} · {selectedDispatch?.dispatch_type}
            </div>
          </div>

          <div style={{ padding: 12, display: 'grid', gap: 10 }}>
            {filteredDocs.map((doc) => {
              const active = selectedDoc?.id === doc.id

              return (
                <div
                  key={doc.id}
                  style={{
                    border: active ? '1px solid #111827' : '1px solid #E5E7EB',
                    background: active ? '#F9FAFB' : '#fff',
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
                        {doc.name}
                      </div>
                      <Badge
                        bg={
                          doc.type === 'Export'
                            ? '#DBEAFE'
                            : doc.type === 'Domestic'
                            ? '#DCFCE7'
                            : '#F3E8FF'
                        }
                        color={
                          doc.type === 'Export'
                            ? '#1D4ED8'
                            : doc.type === 'Domestic'
                            ? '#047857'
                            : '#7E22CE'
                        }
                      >
                        {doc.type}
                      </Badge>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={smallButtonDark} onClick={() => handlePreview(doc.id)}>
                      Preview
                    </button>
                    <button style={smallButton} onClick={() => handleDownload(doc)}>
                      Download PDF
                    </button>
                    <button style={smallButton} onClick={() => handleRegenerate(doc)}>
                      Regenerate
                    </button>
                  </div>
                </div>
              )
            })}

            {filteredDocs.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 30,
                  color: '#6B7280',
                  fontSize: 13,
                }}
              >
                No documents found.
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 14,
            minHeight: 720,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 18px',
              borderBottom: '1px solid #E5E7EB',
              background: '#FAFAFA',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>
                Live preview
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
                {selectedDoc?.name || 'Select document'}
              </div>
            </div>

            {selectedDoc && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={smallButton} onClick={() => handleDownload(selectedDoc)}>
                  Download PDF
                </button>
                <button style={smallButtonDark} onClick={() => handleRegenerate(selectedDoc)}>
                  Regenerate
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: 22, background: '#F9FAFB', minHeight: 650 }}>
            {selectedDoc ? (
              <DocumentPreview dispatch={selectedDispatch} doc={selectedDoc} />
            ) : (
              <div style={{ color: '#6B7280' }}>Select document to preview.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentPreview({ dispatch, doc }) {
  switch (doc.kind) {
    case 'commercial_invoice':
      return <CommercialInvoicePreview dispatch={dispatch} />
    case 'tax_invoice':
      return <TaxInvoicePreview dispatch={dispatch} />
    case 'packing_list_export':
      return <PackingListPreview dispatch={dispatch} exportMode={true} />
    case 'packing_list_domestic':
      return <PackingListPreview dispatch={dispatch} exportMode={false} />
    case 'mtc':
      return <MtcPreview dispatch={dispatch} />
    case 'sales_contract':
      return <SalesContractPreview dispatch={dispatch} />
    default:
      return <div>Preview unavailable.</div>
  }
}

function DocumentShell({ title, subtitle, children }) {
  return (
    <div
      style={{
        maxWidth: 900,
        margin: '0 auto',
        background: '#fff',
        border: '1px solid #D1D5DB',
        borderRadius: 10,
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ padding: '24px 28px', borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6B7280', marginTop: 6 }}>{subtitle}</div>
      </div>
      <div style={{ padding: '24px 28px' }}>{children}</div>
    </div>
  )
}

function CommercialInvoicePreview({ dispatch }) {
  const totalNet = sum(dispatch.items, 'net_wt')
  const rate = 2.45
  const amount = totalNet * rate

  return (
    <DocumentShell
      title="Commercial Invoice"
      subtitle={`${dispatch.invoice_no} · ${dispatch.dispatch_no}`}
    >
      <TopTwoCol
        left={[
          ['Seller', dispatch.seller.name],
          ['Address', dispatch.seller.address],
          ['Buyer', dispatch.buyer],
          ['Consignee', dispatch.consignee],
          ['Notify Party', dispatch.notify_party || '—'],
        ]}
        right={[
          ['Invoice No', dispatch.invoice_no],
          ['Invoice Date', formatDate(new Date())],
          ['Currency', dispatch.currency],
          ['BL No', dispatch.bl_no],
          ['ETD / ETA', `${formatDate(dispatch.etd)} / ${formatDate(dispatch.eta)}`],
          ['Incoterms', dispatch.incoterms],
        ]}
      />

      <SimpleTable
        columns={['Batch', 'Heat', 'Grade', 'Size', 'Finish', 'Qty', 'Net Wt', 'Amount']}
        rows={dispatch.items.map((item) => [
          item.batch_card_no,
          item.heat_no,
          item.grade_code,
          item.size,
          item.finish,
          item.qty_pcs,
          `${item.net_wt} kg`,
          money(item.net_wt * rate, dispatch.currency),
        ])}
      />

      <SummaryBox
        rows={[
          ['Port of Loading', dispatch.port_of_loading],
          ['Port of Discharge', dispatch.port_of_discharge],
          ['Payment Terms', dispatch.payment_terms],
          ['Total Net Weight', `${totalNet} kg`],
          ['Invoice Value', money(amount, dispatch.currency)],
        ]}
      />
    </DocumentShell>
  )
}

function TaxInvoicePreview({ dispatch }) {
  const taxableValue = sum(dispatch.items, 'net_wt') * 110
  const cgst = taxableValue * 0.09
  const sgst = taxableValue * 0.09
  const total = taxableValue + cgst + sgst

  return (
    <DocumentShell
      title="Tax Invoice"
      subtitle={`${dispatch.tax_invoice_no} · ${dispatch.dispatch_no}`}
    >
      <TopTwoCol
        left={[
          ['Supplier', dispatch.seller.name],
          ['Supplier GSTIN', dispatch.seller.gstin],
          ['Buyer', dispatch.buyer],
          ['Buyer GSTIN', dispatch.gstin],
          ['Place of Supply', 'Maharashtra'],
        ]}
        right={[
          ['Tax Invoice No', dispatch.tax_invoice_no],
          ['Invoice Date', formatDate(new Date())],
          ['HSN Code', dispatch.hsn_code],
          ['IRN', dispatch.irn],
          ['E-Invoice QR', dispatch.einvoice_qr],
        ]}
      />

      <SimpleTable
        columns={['Batch', 'Heat', 'Grade', 'Qty', 'Net Wt', 'Rate', 'Taxable Value']}
        rows={dispatch.items.map((item) => [
          item.batch_card_no,
          item.heat_no,
          item.grade_code,
          item.qty_pcs,
          `${item.net_wt} kg`,
          money(110, 'INR'),
          money(item.net_wt * 110, 'INR'),
        ])}
      />

      <SummaryBox
        rows={[
          ['Taxable Value', money(taxableValue, 'INR')],
          ['CGST 9%', money(cgst, 'INR')],
          ['SGST 9%', money(sgst, 'INR')],
          ['Grand Total', money(total, 'INR')],
        ]}
      />

      <div
        style={{
          marginTop: 18,
          border: '1px dashed #CBD5E1',
          background: '#F8FAFC',
          borderRadius: 10,
          padding: 16,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 12, color: '#64748B', marginBottom: 8 }}>E-Invoice QR</div>
        <div
          style={{
            width: 110,
            height: 110,
            margin: '0 auto',
            background:
              'repeating-linear-gradient(45deg, #111 0, #111 6px, #fff 6px, #fff 12px)',
            borderRadius: 6,
          }}
        />
      </div>
    </DocumentShell>
  )
}

function PackingListPreview({ dispatch, exportMode }) {
  return (
    <DocumentShell
      title="Packing List"
      subtitle={`${dispatch.packing_list_no} · ${dispatch.dispatch_no}`}
    >
      <TopTwoCol
        left={[
          ['Customer', dispatch.customer],
          ['Container No', dispatch.container_no || '—'],
          ['Vessel', dispatch.vessel_name || '—'],
          ['BL No', dispatch.bl_no || '—'],
        ]}
        right={[
          ['Dispatch Type', dispatch.dispatch_type],
          ['ETD', formatDate(dispatch.etd)],
          ['ETA', formatDate(dispatch.eta)],
          ['Total Bundles', dispatch.bundles.length],
        ]}
      />

      <SimpleTable
        columns={
          exportMode
            ? ['Bundle', 'Pieces', 'Net Wt', 'Gross Wt', 'Container']
            : ['Bundle', 'Pieces', 'Net Wt', 'Gross Wt']
        }
        rows={dispatch.bundles.map((bundle) =>
          exportMode
            ? [
                bundle.bundle_no,
                bundle.pieces,
                `${bundle.net_wt} kg`,
                `${bundle.gross_wt} kg`,
                dispatch.container_no || '—',
              ]
            : [
                bundle.bundle_no,
                bundle.pieces,
                `${bundle.net_wt} kg`,
                `${bundle.gross_wt} kg`,
              ]
        )}
      />

      <SummaryBox
        rows={[
          ['Total Net Weight', `${sum(dispatch.bundles, 'net_wt')} kg`],
          ['Total Gross Weight', `${sum(dispatch.bundles, 'gross_wt')} kg`],
          ['Container', dispatch.container_no || '—'],
        ]}
      />
    </DocumentShell>
  )
}

function MtcPreview({ dispatch }) {
  return (
    <DocumentShell
      title="Material Test Certificate (EN 10204 / 3.1)"
      subtitle={`${dispatch.mtc_no} · ${dispatch.dispatch_no}`}
    >
      <TopTwoCol
        left={[
          ['Manufacturer', dispatch.seller.name],
          ['Customer', dispatch.customer],
          ['Reference', dispatch.dispatch_no],
        ]}
        right={[
          ['Certificate Type', 'EN 10204 / 3.1'],
          ['Issue Date', formatDate(new Date())],
          ['No. of Batches', dispatch.items.length],
        ]}
      />

      <div style={{ marginBottom: 18 }}>
        <div style={sectionTitle}>Product Details</div>
        <SimpleTable
          columns={['Batch', 'Heat', 'Grade', 'Size', 'Finish']}
          rows={dispatch.items.map((item) => [
            item.batch_card_no,
            item.heat_no,
            item.grade_code,
            item.size,
            item.finish,
          ])}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <div>
          <div style={sectionTitle}>Chemical Composition</div>
          <SimpleTable
            columns={['Element', 'Value']}
            rows={dispatch.chemical.map((row) => [row.element, row.value])}
          />
        </div>

        <div>
          <div style={sectionTitle}>Mechanical Properties</div>
          <SimpleTable
            columns={['Property', 'Value']}
            rows={dispatch.mechanical.map((row) => [row.property, row.value])}
          />
        </div>
      </div>

      <div>
        <div style={sectionTitle}>Certifications</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {dispatch.certifications.map((cert) => (
            <Badge key={cert} bg="#ECFDF5" color="#047857">
              {cert}
            </Badge>
          ))}
        </div>
      </div>
    </DocumentShell>
  )
}

function SalesContractPreview({ dispatch }) {
  return (
    <DocumentShell
      title="Sales Contract"
      subtitle={`${dispatch.sales_contract_no} · ${dispatch.dispatch_no}`}
    >
      <TopTwoCol
        left={[
          ['Seller', dispatch.seller.name],
          ['Buyer', dispatch.buyer],
          ['Contract No', dispatch.sales_contract_no],
        ]}
        right={[
          ['Date', formatDate(new Date())],
          ['Incoterms', dispatch.incoterms],
          ['Payment Terms', dispatch.payment_terms],
        ]}
      />

      <div style={{ marginBottom: 18 }}>
        <div style={sectionTitle}>Commercial Terms</div>
        <div style={paraStyle}>
          The seller agrees to supply stainless steel / alloy steel bright bars and related products
          as per agreed specifications, dimensions, finish, quantity, and dispatch schedule.
        </div>
        <div style={paraStyle}>
          Payment terms: {dispatch.payment_terms}. Delivery terms: {dispatch.incoterms}.
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={sectionTitle}>CBAM Clause</div>
        <div style={paraStyle}>{dispatch.cbam_clause || 'Not applicable.'}</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={sectionTitle}>Signature Block</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <SignatureBox title="Seller" value={dispatch.signatures.seller} />
          <SignatureBox title="Buyer" value={dispatch.signatures.buyer || 'Authorized Signatory - Buyer'} />
        </div>
      </div>
    </DocumentShell>
  )
}

function TopTwoCol({ left, right }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
      <InfoGroup items={left} />
      <InfoGroup items={right} />
    </div>
  )
}

function InfoGroup({ items }) {
  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: 14,
        background: '#FAFAFA',
      }}
    >
      {items.map(([label, value], index) => (
        <div
          key={`${label}-${index}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 1fr',
            gap: 10,
            padding: '6px 0',
            borderBottom: '1px dashed #E5E7EB',
          }}
        >
          <div style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 12, color: '#111827' }}>{value || '—'}</div>
        </div>
      ))}
    </div>
  )
}

function SimpleTable({ columns, rows }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #E5E7EB', borderRadius: 10 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#F9FAFB' }}>
            {columns.map((col) => (
              <th
                key={col}
                style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  fontSize: 12,
                  color: '#374151',
                  borderBottom: '1px solid #E5E7EB',
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              {row.map((cell, cidx) => (
                <td
                  key={cidx}
                  style={{
                    padding: '10px 12px',
                    fontSize: 12,
                    color: '#111827',
                    borderBottom: '1px solid #F3F4F6',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SummaryBox({ rows }) {
  return (
    <div
      style={{
        marginTop: 18,
        marginLeft: 'auto',
        width: 340,
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        background: '#FAFAFA',
        padding: 14,
      }}
    >
      {rows.map(([label, value], index) => (
        <div
          key={`${label}-${index}`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            padding: '7px 0',
            borderBottom: '1px dashed #E5E7EB',
          }}
        >
          <span style={{ fontSize: 12, color: '#6B7280' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#111827', textAlign: 'right' }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  )
}

function SignatureBox({ title, value }) {
  return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        padding: 16,
        minHeight: 120,
        background: '#FAFAFA',
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 28 }}>
        {title}
      </div>
      <div style={{ borderTop: '1px solid #9CA3AF', paddingTop: 8, fontSize: 12, color: '#111827' }}>
        {value}
      </div>
    </div>
  )
}

const sectionTitle = {
  fontSize: 13,
  fontWeight: 800,
  color: '#111827',
  marginBottom: 10,
}

const paraStyle = {
  fontSize: 12,
  color: '#374151',
  lineHeight: 1.8,
  marginBottom: 10,
}

const inputStyle = {
  width: 260,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 13,
  background: '#fff',
  outline: 'none',
}

const selectStyle = {
  minWidth: 360,
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #D1D5DB',
  fontSize: 13,
  background: '#fff',
  outline: 'none',
}

const smallButton = {
  border: '1px solid #D1D5DB',
  background: '#fff',
  color: '#374151',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

const smallButtonDark = {
  border: '1px solid #111827',
  background: '#111827',
  color: '#fff',
  padding: '8px 12px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
}

export default Documents