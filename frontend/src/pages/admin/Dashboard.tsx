// =============================================================
// Admin Dashboard - إحصائيات حقيقية من قاعدة البيانات
// =============================================================

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, Truck, Megaphone, TrendingUp,
  ShieldCheck, Clock, CheckCircle, Users, Bell, AlertTriangle
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import toast from 'react-hot-toast'

interface Stats {
  orders: { total: number; pending: number; accepted: number; delivered: number; cancelled: number }
  couriers: { total: number; approved: number; pending: number; suspended: number }
  clients: { total: number; activeNow: number }
  ads: { total: number; active: number; totalClicks: number }
  revenue: { total: number; currency: string }
}

export default function AdminDashboard() {
  const { token } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<{ id: string; details: Record<string, unknown>; created_at: string; is_read: boolean }[]>([])

  useEffect(() => {
    loadStats()
    loadAlerts()
  }, [])

  async function loadStats() {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch {
      toast.error('مقدرناش نجيب الإحصائيات')
    } finally {
      setLoading(false)
    }
  }

  async function loadAlerts() {
    if (!token) return
    try {
      const res = await fetch('/api/admin/security-alerts', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts || [])
      }
    } catch { /* ignore */ }
  }

  async function markAlertsRead() {
    if (!token) return
    await fetch('/api/admin/security-alerts/mark-read', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    setAlerts(alerts.map(a => ({ ...a, is_read: true })))
    toast.success('تم تحديد كل التنبيهات كمقروءة')
  }

  const unreadAlerts = alerts.filter(a => !a.is_read).length

  const quickLinks = [
    { to: '/admin-secret/couriers', icon: <Truck size={24} />, label: 'المناديب', color: 'bg-blue-500', badge: stats?.couriers.pending ?? 0 },
    { to: '/admin-secret/clients', icon: <Users size={24} />, label: 'العملاء', color: 'bg-green-500', badge: stats?.clients.activeNow ?? 0 },
    { to: '/admin-secret/orders', icon: <Package size={24} />, label: 'الأوردرات', color: 'bg-orange-500', badge: stats?.orders.pending ?? 0 },
    { to: '/admin-secret/pricing', icon: <TrendingUp size={24} />, label: 'الأسعار', color: 'bg-purple-500', badge: 0 },
    { to: '/admin-secret/ads', icon: <Megaphone size={24} />, label: 'الإعلانات', color: 'bg-pink-500', badge: 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-orange-500" size={32} />
          <div>
            <h1 className="text-2xl font-black">لوحة الأدمن</h1>
            <p className="text-gray-500 text-sm">إدارة مندوبك — {new Date().toLocaleDateString('ar-EG')}</p>
          </div>
        </div>
        <button onClick={loadStats} className="text-sm text-orange-600 font-semibold hover:text-orange-700">
          تحديث ↻
        </button>
      </div>

      {/* Security Alerts */}
      {unreadAlerts > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              <h3 className="font-bold text-red-700">{unreadAlerts} تنبيه أمني جديد</h3>
            </div>
            <button onClick={markAlertsRead} className="text-xs text-red-600 font-semibold hover:underline">
              تحديد كمقروء
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {alerts.filter(a => !a.is_read).map(alert => (
              <div key={alert.id} className="bg-white rounded-xl p-3 text-sm border border-red-100">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-700">⚠️ محاولة دخول فاشلة للأدمن</span>
                  <span className="text-xs text-gray-400">{new Date(alert.created_at).toLocaleString('ar-EG')}</span>
                </div>
                {alert.details && typeof alert.details === 'object' && (
                  <div className="text-gray-500 mt-1 text-xs">
                    {(alert.details as Record<string, string>).userAgent && `جهاز: ${(alert.details as Record<string, string>).userAgent?.slice(0, 50)}...`}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {quickLinks.map(link => (
          <Link key={link.to} to={link.to}
            className="card text-center relative hover:shadow-md transition-all group py-4">
            {link.badge > 0 && (
              <span className="absolute top-2 left-2 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {link.badge}
              </span>
            )}
            <div className={`w-12 h-12 ${link.color} rounded-2xl flex items-center justify-center mx-auto mb-2 text-white group-hover:scale-110 transition-transform`}>
              {link.icon}
            </div>
            <div className="font-bold text-sm">{link.label}</div>
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Revenue */}
          <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">إجمالي الإيرادات</p>
                <p className="text-3xl font-black mt-1">{stats.revenue.total.toLocaleString('ar-EG')} جنيه</p>
              </div>
              <TrendingUp size={40} className="text-orange-200" />
            </div>
          </div>

          {/* Orders Stats */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Package className="text-orange-500" size={20} />
              إحصائيات الأوردرات
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'الإجمالي', value: stats.orders.total, color: 'text-gray-900', bg: 'bg-gray-100' },
                { label: 'منتظر مندوب', value: stats.orders.pending, color: 'text-yellow-700', bg: 'bg-yellow-100' },
                { label: 'تم التوصيل', value: stats.orders.delivered, color: 'text-green-700', bg: 'bg-green-100' },
                { label: 'ملغي', value: stats.orders.cancelled, color: 'text-red-700', bg: 'bg-red-100' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString('ar-EG')}</div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Couriers Stats */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Truck className="text-blue-500" size={20} />
              إحصائيات المناديب
            </h2>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { label: 'الإجمالي', value: stats.couriers.total, icon: '👥' },
                { label: 'معتمد', value: stats.couriers.approved, icon: '✅' },
                { label: 'ينتظر المراجعة', value: stats.couriers.pending, icon: '⏳' },
                { label: 'موقوف', value: stats.couriers.suspended, icon: '🚫' },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-black">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
            {stats.couriers.pending > 0 && (
              <Link to="/admin-secret/couriers?status=PENDING_REVIEW"
                className="mt-4 flex items-center justify-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold py-2 rounded-xl text-sm hover:bg-yellow-100 transition-all">
                <Clock size={16} />
                {stats.couriers.pending} مندوب ينتظر الموافقة — راجعهم دلوقتي
              </Link>
            )}
          </div>

          {/* Clients Stats */}
          <div className="card">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Users className="text-green-500" size={20} />
              إحصائيات العملاء
            </h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-50 rounded-xl p-4">
                <div className="text-2xl font-black text-green-700">{stats.clients.total}</div>
                <div className="text-xs text-gray-500 mt-1">إجمالي العملاء</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-4">
                <div className="text-2xl font-black text-blue-700">{stats.clients.activeNow}</div>
                <div className="text-xs text-gray-500 mt-1">نشط دلوقتي</div>
                <div className="text-xs text-blue-400">(آخر 15 دقيقة)</div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-8 text-gray-400">
          <Bell size={40} className="mx-auto mb-2 opacity-30" />
          <p>مقدرناش نجيب الإحصائيات — تأكد من الاتصال</p>
        </div>
      )}
    </div>
  )
}
