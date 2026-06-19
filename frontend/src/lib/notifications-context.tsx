// =============================================================
// Notifications Context - إشعارات حقيقية من الـ API
// =============================================================

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { useAuth } from './auth-context'

export interface Notification {
  id: string
  type: 'order' | 'courier' | 'system' | 'success'
  title: string
  message: string
  icon?: string
  read: boolean
  createdAt: Date
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAllRead: () => void
  markRead: (id: string) => void
  refresh: () => void
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  markRead: () => {},
  refresh: () => {},
})

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { token, isLoggedIn } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    if (!token || !isLoggedIn) return
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      const items: Notification[] = (data.notifications || []).map((n: {
        id: string; type: string; title: string; message: string;
        icon?: string; is_read: boolean; created_at: string
      }) => ({
        id: n.id,
        type: (n.type as Notification['type']) || 'system',
        title: n.title,
        message: n.message,
        icon: n.icon,
        read: n.is_read,
        createdAt: new Date(n.created_at),
      }))
      setNotifications(items)
    } catch { /* silent */ }
  }, [token, isLoggedIn])

  useEffect(() => {
    if (!isLoggedIn) { setNotifications([]); return }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [isLoggedIn, fetchNotifications])

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    if (!token) return
    try {
      await fetch(`/api/notifications/read/${id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* silent */ }
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    if (!token) return
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch { /* silent */ }
  }

  function addNotification(n: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    const notification: Notification = {
      ...n,
      id: `local_${Date.now()}`,
      read: false,
      createdAt: new Date(),
    }
    setNotifications(prev => [notification, ...prev])
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{
      notifications, unreadCount,
      addNotification, markAllRead, markRead,
      refresh: fetchNotifications,
    }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)
