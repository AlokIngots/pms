import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { BatchProvider } from './context/BatchContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <BatchProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontSize: '12px', borderRadius: '8px' },
            success: { iconTheme: { primary: '#1D9E75', secondary: '#fff' } }
          }}
        />
      </BatchProvider>
    </BrowserRouter>
  </React.StrictMode>
)