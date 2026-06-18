// =============================================================
// Layout - الشريط العلوي مع تريك 6 نقرات على اللوجو للأدمن
// =============================================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, Package, Truck, Menu, X, Bell, LogIn, LogOut, User, ChevronDown, ShieldCheck, Lock } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/auth-context'
import { useNotifications } from '../lib/notifications-context'
import BottomNav from './BottomNav'
import toast from 'react-hot-toast'

// Admin secret: 6 نقرات على اللوجو → modal دخول
const ADMIN_CLICK_COUNT = 6
const ADMIN_USERNAME = 'sallam'
const ADMIN_PASSWORD = '255009'
const MAX_FAILED_ATTEMPTS = 4
const LOCKOUT_KEY = 'mandoubak_admin_lockout'
const FAILED_KEY = 'mandoubak_admin_failed'

function AdminLoginModal({ onClose }: { onClose: () => void }) {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const failedCount = parseInt(localStorage.getItem(FAILED_KEY) || '0')
  const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0')
  const isLocked = lockoutUntil > Date.now()
  const remaining = isLocked ? Math.ceil((lockoutUntil - Date.now()) / 60000) : 0

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (isLocked) return

    setLoading(true)
    setError('')

    // Frontend check (admin credentials are hardcoded for security simplicity)
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // Reset failed attempts
      localStorage.removeItem(FAILED_KEY)
      localStorage.removeItem(LOCKOUT_KEY)

      toast.success('أهلاً يا سلام 🛡️')
      onClose()
      navigate('/admin-secret')
    } else {
      const newFailed = failedCount + 1
      localStorage.setItem(FAILED_KEY, String(newFailed))

      if (newFailed >= MAX_FAILED_ATTEMPTS) {
        // Lock for 30 minutes
        const lockUntil = Date.now() + 30 * 60 * 1000
        localStorage.setItem(LOCKOUT_KEY, String(lockUntil))

        // Report to backend
        try {
          await fetch('/api/security/alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'failed_admin_login',
              attempts: newFailed,
              timestamp: new Date().toISOString(),
              userAgent: navigator.userAgent,
            }),
          })
        } catch { /* silent */ }

        setError(`🔒 تم قفل الوصول لـ 30 دقيقة بعد ${MAX_FAILED_ATTEMPTS} محاولات فاشلة`)
      } else {
        setError(`❌ بيانات غلط (${newFailed}/${MAX_FAILED_ATTEMPTS} محاولات)`)
      }
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="text-purple-600" size={32} />
          </div>
          <h2 className="text-xl font-black">دخول الأدمن</h2>
          <p className="text-gray-500 text-sm">منطقة محمية 🔐</p>
        </div>

        {isLocked ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <Lock className="mx-auto mb-2 text-red-500" size={24} />
            <p className="text-red-700 font-bold">محظور الوصول لـ {remaining} دقيقة</p>
            <p className="text-red-500 text-sm mt-1">تم تسجيل هذا النشاط</p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 text-right">اسم المستخدم</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                placeholder="username" required dir="ltr"
                className="input w-full" autoComplete="off" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5 text-right">الباسورد</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required dir="ltr"
                  className="input w-full pl-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm font-semibold text-center">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black py-3 rounded-xl transition-all">
              {loading ? 'جاري الدخول...' : 'دخول →'}
            </button>
          </form>
        )}

        <button onClick={onClose}
          className="w-full text-gray-400 text-sm hover:text-gray-600 transition-colors">
          إلغاء
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()
  const [menuOpen, setMenuOpen] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)
  const [adminModal, setAdminModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 6-click logo trick state
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogoClick = useCallback(() => {
    clickCountRef.current += 1

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current)

    if (clickCountRef.current >= ADMIN_CLICK_COUNT) {
      clickCountRef.current = 0
      // If already admin, navigate directly
      if (user?.role === 'admin') {
        navigate('/admin-secret')
      } else {
        setAdminModal(true)
      }
      return
    }

    // Reset if no more clicks in 3 seconds
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0
    }, 3000)
  }, [user, navigate])

  const isActive = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  // Nav links — no admin link visible
  const navLinks = [
    { to: '/', icon: <Home size={18} />, label: 'الرئيسية' },
    { to: '/order', icon: <Package size={18} />, label: 'اطلب الآن' },
    { to: '/courier/dashboard', icon: <Truck size={18} />, label: 'المناديب' },
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
      {/* Admin Modal */}
      {adminModal && <AdminLoginModal onClose={() => setAdminModal(false)} />}

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-15 py-2.5">
            {/* Logo — 6 clicks → admin modal */}
            <div className="flex items-center gap-2 flex-shrink-0 cursor-pointer select-none"
              onClick={handleLogoClick}>
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-md shadow-orange-200">
                <Truck className="text-white" size={20} />
              </div>
              <span className="text-xl font-black text-gray-900">مندوبك</span>
            </div>

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
              {/* Admin link if already admin */}
              {user?.role === 'admin' && (
                <Link to="/admin-secret"
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive('/admin-secret') ? 'bg-purple-50 text-purple-600' : 'text-gray-600 hover:bg-gray-100'
                  }`}>
                  <ShieldCheck size={18} />
                  الأدمن
                </Link>
              )}
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
                    <div className={`w-7 h-7 ${ROLE_COLORS[user.role!] || 'bg-gray-400'} rounded-lg flex items-center justify-center text-white text-xs font-black`}>
                      {(user.name || user.phone || '?')[0]}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900 leading-tight">
                        {(user.name || user.phone || 'مستخدم').split(' ')[0]}
                      </div>
                      <div className="text-xs text-gray-500">{ROLE_LABELS[user.role!] || user.role}</div>
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
                      {user.role === 'admin' && (
                        <Link to="/admin-secret" onClick={() => setUserDropdown(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors">
                          <ShieldCheck size={16} className="text-purple-500" /> لوحة الأدمن
                        </Link>
                      )}
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
            {user?.role === 'admin' && (
              <Link to="/admin-secret" onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-purple-600 bg-purple-50">
                <ShieldCheck size={18} /> لوحة الأدمن
              </Link>
            )}
            {user ? (
              <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                <div className="flex items-center gap-3 px-4 py-2">
                  <div className={`w-9 h-9 ${ROLE_COLORS[user.role!] || 'bg-gray-400'} rounded-xl flex items-center justify-center text-white font-black`}>
                    {(user.name || user.phone || '?')[0]}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{user.name || user.phone}</div>
                    <div className="text-xs text-gray-500">{ROLE_LABELS[user.role!] || user.role}</div>
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
