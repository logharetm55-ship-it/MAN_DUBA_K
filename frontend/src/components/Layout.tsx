import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Package, Truck, ShieldCheck, Menu, X, Bell, LogIn, LogOut, User, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth-context'
import { useNotifications } from '../lib/notifications-context'
import BottomNav from './BottomNav'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const navLinks = [
    { to: '/', icon: <Home size={18} />, label: 'الرئيسية' },
    { to: '/order', icon: <Package size={18} />, label: 'اطلب الآن' },
    { to: '/courier/dashboard', icon: <Truck size={18} />, label: 'المناديب' },
    { to: '/admin', icon: <ShieldCheck size={18} />, label: 'الأدمن' },
  ]

  const ROLE_COLORS: Record<string, string> = {
    client: 'bg-blue-500',
    courier: 'bg-orange-500',
    admin: 'bg-purple-500',
  }
  const ROLE_LABELS: Record<string, string> = {
    client: 'عميل',
    courier: 'مندوب',
    admin: 'أدمن',
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-15 py-2.5">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-200">
                <Truck className="text-white" size={20} />
              </div>
              <span className="text-xl font-black text-gray-900">مندوبك</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-0.5">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive(link.to)
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors">
                <Bell size={20} className={unreadCount > 0 ? 'text-orange-500' : 'text-gray-600'} />
                {unreadCount > 0 && (
                  <span className="absolute top-1 left-1 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Menu */}
              {user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="hidden md:flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <div className={`w-7 h-7 ${ROLE_COLORS[user.role!]} rounded-lg flex items-center justify-center text-white text-xs font-black`}>
                      {user.name[0]}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 leading-tight">{user.name.split(' ')[0]}</div>
                      <div className="text-xs text-gray-500">{ROLE_LABELS[user.role!]}</div>
                    </div>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${userDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {userDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-fade-in">
                      {user.role === 'client' && (
                        <Link to="/my-orders" onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                          <Package size={16} className="text-orange-500" /> طلباتي
                        </Link>
                      )}
                      {user.role === 'courier' && (
                        <Link to="/courier/profile" onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                          <User size={16} className="text-blue-500" /> بروفايلي
                        </Link>
                      )}
                      <Link to="/login" onClick={() => setUserDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                        <User size={16} className="text-purple-500" /> تغيير الدور
                      </Link>
                      <div className="border-t border-gray-100 my-1" />
                      <button
                        onClick={() => { logout(); setUserDropdown(false); navigate('/login') }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} /> خروج
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login"
                  className="hidden md:flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-md shadow-orange-200">
                  <LogIn size={16} />
                  دخول
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 animate-fade-in">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive(link.to)
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className={`w-9 h-9 ${ROLE_COLORS[user.role!]} rounded-xl flex items-center justify-center text-white font-black`}>
                    {user.name[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{user.name}</div>
                    <div className="text-xs text-gray-500">{ROLE_LABELS[user.role!]}</div>
                  </div>
                </div>
                <button onClick={() => { logout(); navigate('/login'); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50">
                  <LogOut size={16} /> خروج
                </button>
              </div>
            ) : (
              <Link to="/login" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 bg-orange-500 text-white font-bold rounded-xl text-sm mt-2">
                <LogIn size={16} /> دخول للتطبيق
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-5">
        <Outlet />
      </main>

      {/* Bottom Nav - Mobile Only */}
      <BottomNav />
    </div>
  )
}
