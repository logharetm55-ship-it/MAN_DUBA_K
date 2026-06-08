// =============================================================
// Environment Variables for Frontend
// =============================================================

export const env = {
  CLERK_PUBLISHABLE_KEY: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '',
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  API_URL: import.meta.env.VITE_API_URL || '/api',
  NODE_ENV: import.meta.env.MODE || 'development',
}

export const isDev = env.NODE_ENV === 'development'
