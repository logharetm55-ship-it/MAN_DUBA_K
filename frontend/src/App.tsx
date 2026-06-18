// =============================================================
// App Router - مع Admin Guard على /admin-secret
// =============================================================

import { useEffect, useState } from 'react'
import {
  Routes, Route, Navigate,
  useNavigate, useLocation,
  Outlet, Link, useLocation as useLoc
} from 'react-router-dom'
import {
  ShieldCheck, Package, Users, Truck, TrendingUp, Megaphone, Home as HomeIcon
} from 'lucide-react'

import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import OrderPage from './pages/OrderPage'
import MyOrders from './pages/MyOrders'
import TrackOrder from './pages/TrackOrder'
import Notifications from './pages/Notifications'
import LoginPage from './pages/auth/Login'
import OnboardingPage from './pages/Onboarding'
import ClientProfile from './pages/ClientProfile'
import CourierDashboard from './pages/courier/Dashboard'
import CourierProfile from './pages/courier/Profile'
import CourierRegister from './pages/courier/Register'
import CourierEarnings from './pages/courier/Earnings'
import AdminDashboard from './pages/admin/Dashboard'
import AdminPricing from './pages/admin/Pricing'
import AdminAds from './pages/admin/Ads'
import AdminCouriers from './pages/admin/Couriers'
import AdminClients from './pages/admin/Clients'
import AdminOrders from './pages/admin/Orders'
import { useAuth } from './lib/auth-context'

// =============================================================
// Guard: Onboarding
// =============================================================
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, isLoading, needsOnboarding } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && isLoggedIn && needsOnboarding && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true })
    }
  }, [isLoading, isLoggedIn, needsOnboarding, location.pathname, navigate])

  return <>{children}</>
}

// =============================================================
// Admin Login Form — داخل الـ Admin Guard
// =============================================================
function AdminLoginForm() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({ phone: '', password: '', name: '', secret: '' })
  const [createLoading, setCreateLoading] = useState(false)
  const [createMsg, setCreateMsg] = useState('')

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'بيانات غلط'); return }
      if (data.user.role !== 'ADMIN') { setError('الحساب ده مش حساب أدمن'); return }

      const appUser = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: null as null,
        role: 'admin' as const,
        avatar: null as null,
        address: data.user.address,
        onboarded: true,
      }
      login(appUser, data.token)
      navigate('/admin-secret', { replace: true })
    } catch {
      setError('مشكلة في الاتصال بالسيرفر')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    setCreateMsg('')
    setCreateLoading(true)
    try {
      const res = await fetch('/api/auth/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: createForm.phone.replace(/\D/g, ''),
          password: createForm.password,
          name: createForm.name,
          adminSecret: createForm.secret,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setCreateMsg('✅ ' + data.message)
        setShowCreate(false)
        setPhone(createForm.phone.replace(/\D/g, ''))
        setPassword(createForm.password)
      } else {
        setCreateMsg('❌ ' + (data.error || 'فشل'))
      }
    } catch {
      setCreateMsg('❌ مشكلة في الاتصال')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-black text-white">لوحة أدمن مندوبك</h1>
          <p className="text-gray-400 mt-1 text-sm">دخول للمشرفين فقط</p>
        </div>

        {!showCreate ? (
          <>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5 text-right">رقم التليفون</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="01012345678"
                  maxLength={11}
                  dir="ltr"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-center font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5 text-right">الباسورد</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500"
                />
              </div>
              {error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 rounded-xl px-4 py-3 text-sm text-center">
                  {error}
                </div>
              )}
              {createMsg && (
                <div className="bg-green-900/50 border border-green-700 text-green-300 rounded-xl px-4 py-3 text-sm text-center">
                  {createMsg}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'جاري الدخول...' : 'دخول →'}
              </button>
            </form>
            <button
              onClick={() => setShowCreate(true)}
              className="w-full mt-4 text-gray-500 hover:text-gray-300 text-xs text-center transition-colors"
            >
              إنشاء أول حساب أدمن
            </button>
          </>
        ) : (
          <>
            <h2 className="text-white font-bold text-lg mb-4 text-center">إنشاء حساب أدمن جديد</h2>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5 text-right">الاسم</label>
                <input type="text" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  placeholder="اسم المشرف" required dir="rtl"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5 text-right">رقم التليفون</label>
                <input type="tel" value={createForm.phone} onChange={e => setCreateForm({ ...createForm, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="01012345678" maxLength={11} dir="ltr" required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 text-center font-mono focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5 text-right">الباسورد (8 حروف+)</label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="••••••••" minLength={8} required
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5 text-right">المفتاح السري للإدمن</label>
                <input type="password" value={createForm.secret} onChange={e => setCreateForm({ ...createForm, secret: e.target.value })}
                  placeholder="mandoubak_admin_2024" required dir="ltr"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:border-purple-500" />
                <p className="text-gray-600 text-xs mt-1 text-right">الافتراضي: mandoubak_admin_2024</p>
              </div>
              {createMsg && (
                <div className={`rounded-xl px-4 py-3 text-sm text-center ${createMsg.startsWith('✅') ? 'bg-green-900/50 border border-green-700 text-green-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
                  {createMsg}
                </div>
              )}
              <button type="submit" disabled={createLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black py-3.5 rounded-xl transition-all">
                {createLoading ? 'جاري الإنشاء...' : 'إنشاء الحساب →'}
              </button>
            </form>
            <button onClick={() => { setShowCreate(false); setCreateMsg('') }}
              className="w-full mt-4 text-gray-500 hover:text-gray-300 text-xs text-center transition-colors">
              ← رجوع للدخول
            </button>
          </>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">
          هذه الصفحة للمشرفين المعتمدين فقط
        </p>
      </div>
    </div>
  )
}

// =============================================================
// Guard: Admin only — يتحقق من role الحقيقي في الـ JWT
// =============================================================
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth()

  if (!isLoggedIn || user?.role !== 'admin') {
    return <AdminLoginForm />
  }
  return <>{children}</>
}

// =============================================================
// Admin Layout
// =============================================================
function AdminLayout() {
  const location = useLoc()

  const links = [
    { to: '/admin-secret', label: 'الرئيسية', icon: <HomeIcon size={18} />, exact: true },
    { to: '/admin-secret/orders', label: 'الأوردرات', icon: <Package size={18} /> },
    { to: '/admin-secret/couriers', label: 'المناديب', icon: <Truck size={18} /> },
    { to: '/admin-secret/clients', label: 'العملاء', icon: <Users size={18} /> },
    { to: '/admin-secret/pricing', label: 'الأسعار', icon: <TrendingUp size={18} /> },
    { to: '/admin-secret/ads', label: 'الإعلانات', icon: <Megaphone size={18} /> },
  ]

  const isActive = (to: string, exact?: boolean) =>
    exact
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-700 text-white px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <ShieldCheck size={24} />
          <span className="font-black text-lg">لوحة أدمن مندوبك</span>
        </div>
      </div>
      <div className="bg-purple-600 text-white px-4">
        <div className="max-w-4xl mx-auto flex gap-1 overflow-x-auto">
          {links.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-bold whitespace-nowrap transition-all border-b-2 ${
                isActive(link.to, link.exact)
                  ? 'border-white text-white'
                  : 'border-transparent text-purple-200 hover:text-white'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  )
}

// =============================================================
// Main App
// =============================================================
export default function App() {
  return (
    <OnboardingGuard>
      <Routes>
        {/* Full-screen pages */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Admin — hidden URL, guarded */}
        <Route
          path="/admin-secret"
          element={<AdminGuard><AdminLayout /></AdminGuard>}
        >
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="couriers" element={<AdminCouriers />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="pricing" element={<AdminPricing />} />
          <Route path="ads" element={<AdminAds />} />
        </Route>

        {/* Main app layout */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/notifications" element={<Notifications />} />

          <Route path="/order" element={<OrderPage />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/track/:id" element={<TrackOrder />} />
          <Route path="/profile" element={<ClientProfile />} />

          <Route path="/courier/register" element={<CourierRegister />} />
          <Route path="/courier/dashboard" element={<CourierDashboard />} />
          <Route path="/courier/profile" element={<CourierProfile />} />
          <Route path="/courier/earnings" element={<CourierEarnings />} />

          {/* Old admin paths → redirect away */}
          <Route path="/admin" element={<Navigate to="/" replace />} />
          <Route path="/admin/*" element={<Navigate to="/" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </OnboardingGuard>
  )
}
