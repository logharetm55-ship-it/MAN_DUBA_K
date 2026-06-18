import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { Toaster } from 'react-hot-toast'
import App from './App'
import { AuthContext, DemoAuthProvider } from './lib/auth-context'
import { ClerkAuthProviderInner } from './lib/clerk-auth-inner'
import { NotificationsProvider } from './lib/notifications-context'
import './styles/globals.css'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function AppShell() {
  return (
    <BrowserRouter>
      <NotificationsProvider>
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
              fontSize: '14px',
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
      </NotificationsProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <ClerkAuthProviderInner AuthContext={AuthContext}>
          <AppShell />
        </ClerkAuthProviderInner>
      </ClerkProvider>
    ) : (
      <DemoAuthProvider>
        <AppShell />
      </DemoAuthProvider>
    )}
  </React.StrictMode>
)
