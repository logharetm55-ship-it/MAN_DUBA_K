// =============================================================
// Auth Context - تسجيل مباشر (اسم + تليفون)
// بدون Clerk - بيحفظ في Supabase + localStorage
// =============================================================

import { createContext, useContext, useState, ReactNode } from 'react'

export type UserRole = 'client' | 'courier' | 'admin' | null

export interface AppUser {
  id: string
  name: string
  phone: string
  email: string | null
  role: UserRole
  avatar: string | null
  onboarded?: boolean
}

export interface AuthContextType {
  user: AppUser | null
  role: UserRole
  isLoggedIn: boolean
  isLoading: boolean
  needsOnboarding: boolean
  login: (user: AppUser) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateRole: (role: UserRole) => void
  // legacy demo compat
  demoLogin?: (role: UserRole) => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoggedIn: false,
  isLoading: false,
  needsOnboarding: false,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateRole: () => {},
})

const STORAGE_KEY = 'mandoubak_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  function login(appUser: AppUser) {
    setUser(appUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser))
  }

  async function logout() {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }

  function updateRole(role: UserRole) {
    if (!user || !role) return
    const updated = { ...user, role, onboarded: true }
    setUser(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  async function refreshUser() {
    // إعادة قراءة من localStorage
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setUser(JSON.parse(saved))
    } catch { /* ignore */ }
  }

  const needsOnboarding = !!user && user.onboarded === false

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role || null,
      isLoggedIn: !!user,
      isLoading: false,
      needsOnboarding,
      login,
      logout,
      refreshUser,
      updateRole,
      demoLogin: (role) => {
        if (!user || !role) return
        updateRole(role)
      },
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
