import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import OrderPage from './pages/OrderPage'
import CourierDashboard from './pages/courier/Dashboard'
import CourierProfile from './pages/courier/Profile'
import CourierRegister from './pages/courier/Register'
import AdminDashboard from './pages/admin/Dashboard'
import AdminPricing from './pages/admin/Pricing'
import AdminAds from './pages/admin/Ads'
import AdminCouriers from './pages/admin/Couriers'
import Layout from './components/Layout'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/order" element={<OrderPage />} />
        <Route path="/courier/register" element={<CourierRegister />} />
        <Route path="/courier/dashboard" element={<CourierDashboard />} />
        <Route path="/courier/profile" element={<CourierProfile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/pricing" element={<AdminPricing />} />
        <Route path="/admin/ads" element={<AdminAds />} />
        <Route path="/admin/couriers" element={<AdminCouriers />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
