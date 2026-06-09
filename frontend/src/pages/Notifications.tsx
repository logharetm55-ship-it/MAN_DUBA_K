import { Bell, CheckCheck, Package, Truck, Zap, Gift } from 'lucide-react'
import { useNotifications } from '../lib/notifications-context'

const TYPE_ICONS: Record<string, { icon: string; bg: string }> = {
  order: { icon: '📦', bg: 'bg-orange-100' },
  courier: { icon: '🛵', bg: 'bg-blue-100' },
  system: { icon: '🔔', bg: 'bg-gray-100' },
  success: { icon: '✅', bg: 'bg-green-100' },
}

export default function Notifications() {
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  function timeAgo(date: Date) {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `${mins} د`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} ساعة`
    return `${Math.floor(hours / 24)} يوم`
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Bell className="text-orange-500" size={24} />
            الإشعارات
          </h1>
          {unreadCount > 0 && (
            <p className="text-orange-600 text-sm font-semibold mt-0.5">{unreadCount} إشعار غير مقروء</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors">
            <CheckCheck size={16} />
            قراءة الكل
          </button>
        )}
      </div>

      {/* Notifications */}
      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell size={56} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-semibold">مفيش إشعارات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const typeInfo = TYPE_ICONS[n.type] || TYPE_ICONS.system
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`card cursor-pointer transition-all hover:shadow-md ${!n.read ? 'border-r-4 border-orange-400 bg-orange-50/30' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 ${typeInfo.bg} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}>
                    {n.icon || typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-bold text-sm ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                      {n.title}
                    </div>
                    <div className="text-gray-500 text-xs mt-0.5 line-clamp-2">{n.message}</div>
                    <div className="text-gray-400 text-xs mt-1.5">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && (
                    <div className="w-2.5 h-2.5 bg-orange-500 rounded-full flex-shrink-0 mt-1.5" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
