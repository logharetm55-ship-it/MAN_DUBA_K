// =============================================================
// App Router - مع Admin Guard على /admin-secret
// =============================================================

import { useEffect } from 'react'
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
// Guard: Admin only — يتحقق من admin flag في localStorage أو role
// =============================================================
function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const adminSession = localStorage.getItem('mandoubak_admin_session') === 'true'

  if (!adminSession && user?.role !== 'admin') {
    return <Navigate to="/" replace />
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
