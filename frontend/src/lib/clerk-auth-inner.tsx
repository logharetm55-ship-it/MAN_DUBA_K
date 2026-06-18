// =============================================================
// ClerkAuthProviderInner
// بيتعمل render بس لما ClerkProvider موجود في الـ tree
// =============================================================

import { useEffect, useState, ReactNode, Context } from 'react'
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react'
import type { AuthContextType, AppUser, UserRole } from './auth-context'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8787'

interface Props {
  AuthContext: Context<AuthContextType>
  children: ReactNode
}

export function ClerkAuthProviderInner({ AuthContext, children }: Props) {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useClerkAuth()

  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  async function syncUser() {
    if (!isLoaded) return

    if (!isSignedIn || !clerkUser) {
      setAppUser(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      // جيب token من Clerk session
      const token = await getToken() || ''

      let profile: {
        id: string
        name: string
        phone: string | null
        email: string | null
        role: string
        avatar_url: string | null
      } | null = null

      if (token) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) profile = await res.json()
        } catch {
          // backend unavailable - use Clerk data directly
        }
      }

      const roleMap: Record<string, UserRole> = {
        CLIENT: 'client', COURIER: 'courier', ADMIN: 'admin',
      }

      setAppUser({
        id: profile?.id || clerkUser.id,
        clerkId: clerkUser.id,
        name: profile?.name || clerkUser.fullName || clerkUser.firstName || 'مستخدم',
        phone: profile?.phone || clerkUser.primaryPhoneNumber?.phoneNumber || null,
        email: profile?.email || clerkUser.primaryEmailAddress?.emailAddress || null,
        role: profile?.role ? (roleMap[profile.role] || 'client') : 'client',
        avatar: profile?.avatar_url || clerkUser.imageUrl || null,
      })
    } catch (err) {
      console.error('Error syncing user:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    syncUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, clerkUser?.id])

  return (
    <AuthContext.Provider value={{
      user: appUser,
      role: appUser?.role || null,
      isLoggedIn: !!appUser,
      isLoading: !isLoaded || isLoading,
      logout: async () => {
        await signOut()
        setAppUser(null)
      },
      refreshUser: syncUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
