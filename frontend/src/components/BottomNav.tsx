import { Link, useLocation } from 'react-router-dom'
import { Home, Package, Bell, User, Truck, DollarSign } from 'lucide-react'
import { useNotifications } from '../lib/notifications-context'
import { useAuth } from '../lib/auth-context'

export default function BottomNav() {
  const location = useLocation()
  const { unreadCount } = useNotifications()
  const { user } = useAuth()
  const path = location.pathname

  const isActive = (to: string) => to === '/' ? path === '/' : path.startsWith(to)

  const notifIcon = (
    <div className="relative">
      <Bell size={22} />
      {unreadCount > 0 && (
        <span className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </div>
  )

  // عميل مسجل
  const clientNav = [
    { to: '/', icon: <Home size={22} />, label: 'الرئيسية' },
    { to: '/order', icon: <Package size={22} />, label: 'اطلب' },
    { to: '/my-orders', icon: <Truck size={22} />, label: 'طلباتي' },
    { to: '/notifications', icon: notifIcon, label: 'إشعارات' },
    { to: '/profile', icon: <User size={22} />, label: 'حسابي' },
  ]

  // مندوب
  const courierNav = [
    { to: '/', icon: <Home size={22} />, label: 'الرئيسية' },
    { to: '/courier/dashboard', icon: <Truck size={22} />, label: 'الطلبات' },
    { to: '/courier/earnings', icon: <DollarSign size={22} />, label: 'أرباحي' },
    { to: '/notifications', icon: notifIcon, label: 'إشعارات' },
    { to: '/courier/profile', icon: <User size={22} />, label: 'بروفايلي' },
  ]

  // زائر غير مسجل
  const guestNav = [
    { to: '/', icon: <Home size={22} />, label: 'الرئيسية' },
    { to: '/order', icon: <Package size={22} />, label: 'اطلب' },
    { to: '/notifications', icon: notifIcon, label: 'إشعارات' },
    { to: '/login', icon: <User size={22} />, label: 'دخول' },
  ]

  const navItems = user?.role === 'courier' ? courierNav
    : user?.role === 'client' ? clientNav
    : guestNav

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex">
        {navItems.map((item, i) => {
          const active = isActive(item.to)
          return (
            <Link key={i} to={item.to}
              className={`flex-1 flex flex-col items-center pt-2.5 pb-3 px-1 transition-all ${active ? 'text-orange-500' : 'text-gray-400'}`}>
              <div className={`transition-all ${active ? 'scale-110' : 'scale-100'}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] mt-1 font-bold truncate max-w-full text-center ${active ? 'text-orange-500' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {active && <div className="w-6 h-0.5 bg-orange-500 rounded-full mt-1" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
