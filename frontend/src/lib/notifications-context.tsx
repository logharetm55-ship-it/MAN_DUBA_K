import { createContext, useContext, useState, ReactNode } from 'react'

export interface Notification {
  id: string
  title: string
  message: string
  type: 'order' | 'courier' | 'system' | 'success'
  read: boolean
  createdAt: Date
  icon?: string
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAllRead: () => void
  markRead: (id: string) => void
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => {},
  markAllRead: () => {},
  markRead: () => {},
})

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'طلبك قيد التوصيل 🛵', message: 'محمد المندوب في طريقه إليك - ETA 15 دقيقة', type: 'order', read: false, createdAt: new Date(Date.now() - 300000), icon: '🛵' },
  { id: '2', title: 'تم قبول طلبك ✅', message: 'مندوب قبل طلبك رقم ORD-1718001-ABCD', type: 'success', read: false, createdAt: new Date(Date.now() - 600000), icon: '✅' },
  { id: '3', title: 'عرض جديد 🔥', message: 'بيتزا مارجريتا بـ 89 جنيه - عرض لليوم فقط!', type: 'system', read: true, createdAt: new Date(Date.now() - 3600000), icon: '🍕' },
  { id: '4', title: 'تم التوصيل 🎉', message: 'طلبك ORD-1718000 اتسلم بنجاح!', type: 'success', read: true, createdAt: new Date(Date.now() - 86400000), icon: '🎉' },
]

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS)

  const unreadCount = notifications.filter(n => !n.read).length

  function addNotification(n: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
    const notification: Notification = {
      ...n,
      id: Date.now().toString(),
      read: false,
      createdAt: new Date(),
    }
    setNotifications(prev => [notification, ...prev])
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, addNotification, markAllRead, markRead }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => useContext(NotificationsContext)
