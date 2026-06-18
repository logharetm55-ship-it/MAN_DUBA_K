// =============================================================
// Auth Context - تسجيل بالتليفون والباسورد
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
  address?: string | null
  onboarded?: boolean
  courierStatus?: string | null
  courierId?: string | null
}

export interface AuthContextType {
  user: AppUser | null
  token: string | null
  role: UserRole
  isLoggedIn: boolean
  isLoading: boolean
  needsOnboarding: boolean
  login: (user: AppUser, token: string) => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateRole: (role: UserRole) => void
  updateUser: (updates: Partial<AppUser>) => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  role: null,
  isLoggedIn: false,
  isLoading: false,
  needsOnboarding: false,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
  updateRole: () => {},
  updateUser: () => {},
})

const STORAGE_KEY = 'mandoubak_user'
const TOKEN_KEY = 'mandoubak_token'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  })

  function login(appUser: AppUser, jwt: string) {
    setUser(appUser)
    setToken(jwt)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appUser))
    localStorage.setItem(TOKEN_KEY, jwt)
  }

  async function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(TOKEN_KEY)
  }

  function updateRole(role: UserRole) {
    if (!user || !role) return
    const updated = { ...user, role, onboarded: true }
    setUser(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function updateUser(updates: Partial<AppUser>) {
    if (!user) return
    const updated = { ...user, ...updates }
    setUser(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  async function refreshUser() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setUser(JSON.parse(saved))
    } catch { /* ignore */ }
  }

  const needsOnboarding = !!user && user.onboarded === false

  return (
    <AuthContext.Provider value={{
      user,
      token,
      role: user?.role || null,
      isLoggedIn: !!user,
      isLoading: false,
      needsOnboarding,
      login,
      logout,
      refreshUser,
      updateRole,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
