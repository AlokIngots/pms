import { createContext, useContext, useState, useEffect } from 'react'

const BatchContext = createContext()

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const SAMPLE_BATCHES = [
  {
    id: 1, batch_card_no: '1067', heat_no: 'A14319', grade_code: '1.4021/420',
    size_mm: 110, no_of_pcs: 11, weight_kg: 5110, ht_process: 'QT',
    bb_process: 'Peeled+Polished', tolerance: '110.00 K12', colour_code: 'Pink+White',
    prepared_by: 'Pandit', customer: 'Wilo SE', shed: 'Shed 1',
    current_stage: 'Peeling', current_stage_index: 4,
    status: 'In Progress', priority: 'On Track',
    created_at: '2026-03-28T10:00:00', stage_logs: [],
  },
  {
    id: 2, batch_card_no: '1068', heat_no: 'A14298', grade_code: '316L',
    size_mm: 24, no_of_pcs: 24, weight_kg: 3200, ht_process: 'A',
    bb_process: 'Peeled+Ground', tolerance: 'h9', colour_code: 'Blue',
    prepared_by: 'Rajan', customer: 'Caprari', shed: 'Shed 2',
    current_stage: 'Grinding', current_stage_index: 6,
    status: 'In Progress', priority: 'Critical',
    created_at: '2026-03-27T08:00:00', stage_logs: [],
  },
  {
    id: 3, batch_card_no: '1069', heat_no: 'A14291', grade_code: '431',
    size_mm: 8, no_of_pcs: 8, weight_kg: 800, ht_process: 'QT',
    bb_process: 'Peeled', tolerance: 'h9', colour_code: 'Green',
    prepared_by: 'Suresh', customer: 'Grundfos', shed: 'Shed 1',
    current_stage: 'HT Process', current_stage_index: 2,
    status: 'In Progress', priority: 'Warning',
    created_at: '2026-03-26T09:00:00', stage_logs: [],
  },
  {
    id: 4, batch_card_no: '1070', heat_no: 'A14305', grade_code: '420C',
    size_mm: 20, no_of_pcs: 20, weight_kg: 2200, ht_process: 'QT',
    bb_process: 'Peeled+Ground', tolerance: 'h9', colour_code: 'Red',
    prepared_by: 'Mohan', customer: 'Flowserve', shed: 'Shed 3',
    current_stage: 'Cutting', current_stage_index: 7,
    status: 'In Progress', priority: 'On Track',
    created_at: '2026-03-25T11:00:00', stage_logs: [],
  },
  {
    id: 5, batch_card_no: '1071', heat_no: 'A14312', grade_code: '1.4462',
    size_mm: 6, no_of_pcs: 6, weight_kg: 600, ht_process: 'A',
    bb_process: 'Peeled+Polished', tolerance: 'h9', colour_code: 'Orange',
    prepared_by: 'Kamlesh', customer: 'Sulzer', shed: 'Shed 2',
    current_stage: 'MPI Final', current_stage_index: 10,
    status: 'In Progress', priority: 'On Track',
    created_at: '2026-03-24T14:00:00', stage_logs: [],
  },
  {
    id: 6, batch_card_no: '1072', heat_no: 'A14320', grade_code: '1.4034',
    size_mm: 40, no_of_pcs: 18, weight_kg: 5390, ht_process: 'QT',
    bb_process: 'Peeled+Ground', tolerance: 'h9', colour_code: 'Green+Brown',
    prepared_by: 'Pandit', customer: 'Wilo SE', shed: 'Shed 1',
    current_stage: 'Packing', current_stage_index: 11,
    status: 'In Progress', priority: 'On Track',
    created_at: '2026-03-23T08:00:00', stage_logs: [],
  },
]

export function BatchProvider({ children }) {
  const [batches, setBatches]     = useState(SAMPLE_BATCHES)
  const [loading, setLoading]     = useState(false)
  const [useBackend, setUseBackend] = useState(false)

  // Try to load from backend on mount
  useEffect(() => {
    async function loadFromBackend() {
      try {
        const r = await fetch(`${API}/api/health`)
        if (!r.ok) throw new Error('Backend not available')
        setUseBackend(true)
        const res = await fetch(`${API}/api/batches`)
        if (!res.ok) throw new Error('Failed to load batches')
        const data = await res.json()
        if (data && data.length > 0) {
          setBatches(data)
        }
      } catch (e) {
        console.log('Backend not available — using sample data')
        setUseBackend(false)
      }
    }
    loadFromBackend()
  }, [])

  async function createBatch(newBatch) {
    if (useBackend) {
      try {
        const r = await fetch(`${API}/api/batches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newBatch),
        })
        const data = await r.json()
        if (data.success) {
          newBatch.id = data.id
        }
      } catch (e) {
        console.error('Failed to save batch to backend', e)
      }
    }
    setBatches(prev => [newBatch, ...prev])
  }

  async function moveToNextStage(batchCardNo, nextStage, nextIdx) {
    setBatches(prev => prev.map(b =>
      b.batch_card_no === batchCardNo
        ? { ...b, current_stage: nextStage, current_stage_index: nextIdx }
        : b
    ))
    if (useBackend) {
      try {
        const batch = batches.find(b => b.batch_card_no === batchCardNo)
        if (batch?.id) {
          await fetch(`${API}/api/batches/${batch.id}/stage`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_stage: nextStage }),
          })
        }
      } catch (e) {
        console.error('Failed to update stage', e)
      }
    }
  }

  async function updatePriority(batchCardNo, priority) {
    setBatches(prev => prev.map(b =>
      b.batch_card_no === batchCardNo ? { ...b, priority } : b
    ))
    if (useBackend) {
      try {
        const batch = batches.find(b => b.batch_card_no === batchCardNo)
        if (batch?.id) {
          await fetch(`${API}/api/batches/${batch.id}/priority`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority }),
          })
        }
      } catch (e) {
        console.error('Failed to update priority', e)
      }
    }
  }

  function getBatch(batchCardNo) {
    return batches.find(b => b.batch_card_no === batchCardNo)
  }

  async function refreshBatches() {
    if (!useBackend) return
    setLoading(true)
    try {
      const r = await fetch(`${API}/api/batches`)
      const data = await r.json()
      if (data && data.length > 0) setBatches(data)
    } catch (e) {
      console.error('Failed to refresh batches', e)
    }
    setLoading(false)
  }

  return (
    <BatchContext.Provider value={{
      batches,
      loading,
      useBackend,
      createBatch,
      moveToNextStage,
      updatePriority,
      getBatch,
      refreshBatches,
    }}>
      {children}
    </BatchContext.Provider>
  )
}

export function useBatches() {
  return useContext(BatchContext)
}