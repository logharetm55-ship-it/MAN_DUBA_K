import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
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
import { useAuth } from './lib/auth-context'

// Guard: لو اليوزر محتاج onboarding → روّحه لصفحة الاختيار
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

export default function App() {
  return (
    <OnboardingGuard>
      <Routes>
        {/* Onboarding — outside layout, full screen */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        <Route element={<Layout />}>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Client */}
          <Route path="/order" element={<OrderPage />} />
          <Route path="/my-orders" element={<MyOrders />} />
          <Route path="/track/:id" element={<TrackOrder />} />
          <Route path="/profile" element={<ClientProfile />} />

          {/* Courier */}
          <Route path="/courier/register" element={<CourierRegister />} />
          <Route path="/courier/dashboard" element={<CourierDashboard />} />
          <Route path="/courier/profile" element={<CourierProfile />} />
          <Route path="/courier/earnings" element={<CourierEarnings />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/pricing" element={<AdminPricing />} />
          <Route path="/admin/ads" element={<AdminAds />} />
          <Route path="/admin/couriers" element={<AdminCouriers />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </OnboardingGuard>
  )
}
