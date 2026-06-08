import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Cairo, sans-serif',
            direction: 'rtl',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            style: { background: '#10b981', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#10b981' },
          },
          error: {
            style: { background: '#ef4444', color: '#fff' },
            iconTheme: { primary: '#fff', secondary: '#ef4444' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
