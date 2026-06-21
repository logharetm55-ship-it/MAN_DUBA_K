import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const isReplit = !!process.env.REPLIT_DEV_DOMAIN

  return {
    plugins: [react()],
    server: {
      port: 5000,
      host: '0.0.0.0',
      strictPort: true,
      allowedHosts: isReplit ? true : undefined,
      cors: true,
      hmr: isReplit
        ? {
            clientPort: 443,
            protocol: 'wss',
            host: process.env.REPLIT_DEV_DOMAIN,
          }
        : true,
      proxy: {
        '/api': {
          target: process.env.VITE_API_URL || 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            clerk: ['@clerk/clerk-react'],
          },
        },
      },
    },
  }
})
