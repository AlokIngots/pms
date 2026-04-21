import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import BatchCardCreator from './pages/BatchCardCreator'
import Batches from './pages/Batches'
import Dashboard from './pages/Dashboard'
import SalesOrders from './pages/SalesOrders'
import AlertCentre from './pages/AlertCentre'
import QualityChecks from './pages/QualityChecks'
import Dispatch from './pages/Dispatch'
import Documents from './pages/Documents'
import SalesOrderDetail from './pages/SalesOrderDetail'
import Reports from './pages/Reports'
import ProductionLog from './pages/ProductionLog'
import MaterialLog from './pages/MaterialLog'
import AdminPanel from './pages/AdminPanel'
import OperatorLog from './pages/OperatorLog'
import BatchCardDetail from './pages/BatchCardDetail'

function PlaceholderPage({ title }) {
  return (
    <div style={{ padding: 30 }}>
      <div style={{
        background: '#fff',
        border: '0.5px solid #E5E5E5',
        borderRadius: 12,
        padding: 40,
        textAlign: 'center'
      }}>
        <div style={{
          width: 40, height: 40,
          background: '#E1F5EE',
          borderRadius: '50%',
          margin: '0 auto 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ width: 12, height: 12, background: '#1D9E75', borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2C2C2C', marginBottom: 6 }}>
          {title}
        </div>
        <div style={{
          display: 'inline-block',
          fontSize: 11,
          color: '#1D9E75',
          background: '#E1F5EE',
          padding: '4px 14px',
          borderRadius: 20,
          marginTop: 8
        }}>
          Ready to build
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />

      <div style={{ flex: 1, overflowY: 'auto', background: '#F3F4F6' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/orders" element={<SalesOrders />} />
          <Route path="/batches" element={<Batches />} />
          <Route path="/batches/new" element={<BatchCardCreator />} />
          <Route path="/alerts" element={<AlertCentre />} />
          <Route path="/qc" element={<QualityChecks />} />
          <Route path="/dispatch" element={<Dispatch />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/orders/:soNumber" element={<SalesOrderDetail />} />
          <Route path="/production-log" element={<ProductionLog />} />
          <Route path="/operator-log" element={<OperatorLog />} />          
          <Route path="/material-log" element={<MaterialLog />} />          
          <Route path="/admin" element={<AdminPanel />} />        
          <Route path="/scan/:batchNo" element={<BatchCardDetail />} />
          </Routes>
      </div>
    </div>
  )
}



