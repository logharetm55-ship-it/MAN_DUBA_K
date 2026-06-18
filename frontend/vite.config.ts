import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://klvceioawopljarpujnp.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
    ),
    'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(
      process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'pk_test_Z2xvd2luZy1wb2xsaXdvZy0yOC5jbGVyay5hY2NvdW50cy5kZXYk'
    ),
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || '/api'
    ),
  },
  server: {
    port: 5000,
    host: '0.0.0.0',
    strictPort: true,
    allowedHosts: true,
    cors: true,
    hmr: {
      clientPort: 443,
      protocol: 'wss',
      host: process.env.REPLIT_DEV_DOMAIN || 'localhost',
    },
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
  }
})
