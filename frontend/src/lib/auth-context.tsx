// =============================================================
// Auth Context - Core types + Demo Provider
// =============================================================

import { createContext, useContext, useState, ReactNode } from 'react'

export type UserRole = 'client' | 'courier' | 'admin' | null

export interface AppUser {
  id: string
  clerkId?: string
  name: string
  phone: string | null
  email: string | null
  role: UserRole
  avatar: string | null
  isDemo?: boolean
}

export interface AuthContextType {
  user: AppUser | null
  role: UserRole
  isLoggedIn: boolean
  isLoading: boolean
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  demoLogin?: (role: UserRole) => void
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  isLoggedIn: false,
  isLoading: false,
  logout: async () => {},
  refreshUser: async () => {},
})

const DEMO_USERS: Record<NonNullable<UserRole>, AppUser> = {
  client:  { id: 'demo-client',  name: 'أحمد العميل',  phone: '01012345678', email: null, role: 'client',  avatar: null, isDemo: true },
  courier: { id: 'demo-courier', name: 'محمد المندوب', phone: '01098765432', email: null, role: 'courier', avatar: null, isDemo: true },
  admin:   { id: 'demo-admin',   name: 'أدمن المنصة',  phone: '01111111111', email: null, role: 'admin',   avatar: null, isDemo: true },
}

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('mandoubak_demo_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })

  function demoLogin(role: UserRole) {
    if (!role) return
    const demoUser = DEMO_USERS[role]
    setUser(demoUser)
    localStorage.setItem('mandoubak_demo_user', JSON.stringify(demoUser))
  }

  return (
    <AuthContext.Provider value={{
      user,
      role: user?.role || null,
      isLoggedIn: !!user,
      isLoading: false,
      logout: async () => {
        setUser(null)
        localStorage.removeItem('mandoubak_demo_user')
      },
      refreshUser: async () => {},
      demoLogin,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
