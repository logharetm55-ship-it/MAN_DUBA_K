import { createContext, useContext, useState, ReactNode } from 'react'

export type UserRole = 'client' | 'courier' | 'admin' | null

export interface DemoUser {
  id: string
  name: string
  phone: string
  role: UserRole
  avatar: string
}

interface AuthContextType {
  user: DemoUser | null
  login: (role: UserRole) => void
  logout: () => void
  isLoggedIn: boolean
}

const DEMO_USERS: Record<NonNullable<UserRole>, DemoUser> = {
  client: { id: 'client-1', name: 'أحمد العميل', phone: '01012345678', role: 'client', avatar: '👤' },
  courier: { id: 'courier-1', name: 'محمد المندوب', phone: '01098765432', role: 'courier', avatar: '🛵' },
  admin: { id: 'admin-1', name: 'أدمن المنصة', phone: '01111111111', role: 'admin', avatar: '🛡️' },
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoggedIn: false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(() => {
    const saved = localStorage.getItem('mandoubak_user')
    return saved ? JSON.parse(saved) : null
  })

  function login(role: UserRole) {
    if (!role) return
    const demoUser = DEMO_USERS[role]
    setUser(demoUser)
    localStorage.setItem('mandoubak_user', JSON.stringify(demoUser))
  }

  function logout() {
    setUser(null)
    localStorage.removeItem('mandoubak_user')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
