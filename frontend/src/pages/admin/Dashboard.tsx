import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, Truck, Megaphone, TrendingUp, 
  ShieldCheck, Clock, CheckCircle, XCircle, Settings
} from 'lucide-react'

interface DashboardStats {
  orders: { total: number; pending: number; accepted: number; delivered: number; cancelled: number }
  couriers: { total: number; approved: number; pending: number; suspended: number }
  ads: { total: number; active: number; totalClicks: number }
}

const DEMO_STATS: DashboardStats = {
  orders: { total: 1247, pending: 23, accepted: 8, delivered: 1198, cancelled: 18 },
  couriers: { total: 45, approved: 38, pending: 5, suspended: 2 },
  ads: { total: 12, active: 7, totalClicks: 3420 },
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(DEMO_STATS)
  const [loading, setLoading] = useState(false)

  const quickLinks = [
    { to: '/admin/couriers', icon: <Truck size={24} />, label: 'المناديب', color: 'bg-blue-500', badge: stats.couriers.pending },
    { to: '/admin/pricing', icon: <Settings size={24} />, label: 'الأسعار', color: 'bg-purple-500', badge: 0 },
    { to: '/admin/ads', icon: <Megaphone size={24} />, label: 'العروض', color: 'bg-orange-500', badge: 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-orange-500" size={32} />
        <div>
          <h1 className="text-2xl font-black">لوحة الأدمن</h1>
          <p className="text-gray-500 text-sm">إدارة مندوبك</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        {quickLinks.map(link => (
          <Link
            key={link.to}
            to={link.to}
            className="card text-center relative hover:shadow-md transition-all group"
          >
            {link.badge > 0 && (
              <span className="absolute top-3 left-3 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {link.badge}
              </span>
            )}
            <div className={`w-12 h-12 ${link.color} rounded-2xl flex items-center justify-center mx-auto mb-3 text-white group-hover:scale-110 transition-transform`}>
              {link.icon}
            </div>
            <div className="font-bold">{link.label}</div>
          </Link>
        ))}
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
            { label: 'منتظر', value: stats.orders.pending, color: 'text-yellow-700', bg: 'bg-yellow-100' },
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
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'الإجمالي', value: stats.couriers.total, icon: '👥' },
            { label: 'معتمد', value: stats.couriers.approved, icon: '✅' },
            { label: 'قيد المراجعة', value: stats.couriers.pending, icon: '⏳' },
            { label: 'موقوف', value: stats.couriers.suspended, icon: '🚫' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-black">{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
        {stats.couriers.pending > 0 && (
          <Link
            to="/admin/couriers?status=PENDING_REVIEW"
            className="mt-4 flex items-center justify-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold py-2 rounded-xl text-sm hover:bg-yellow-100 transition-all"
          >
            <Clock size={16} />
            {stats.couriers.pending} مندوب ينتظر الموافقة
          </Link>
        )}
      </div>

      {/* Ads Stats */}
      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Megaphone className="text-orange-500" size={20} />
          إحصائيات الإعلانات
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-black text-gray-900">{stats.ads.total}</div>
            <div className="text-xs text-gray-500">إجمالي الإعلانات</div>
          </div>
          <div>
            <div className="text-2xl font-black text-green-600">{stats.ads.active}</div>
            <div className="text-xs text-gray-500">إعلان نشط</div>
          </div>
          <div>
            <div className="text-2xl font-black text-orange-500">{stats.ads.totalClicks.toLocaleString()}</div>
            <div className="text-xs text-gray-500">إجمالي الضغطات</div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">آخر الأوردرات</h2>
          <Link to="/admin/orders" className="text-orange-500 text-sm font-semibold">عرض الكل</Link>
        </div>
        <div className="space-y-2">
          {[
            { num: 'ORD-001', status: 'DELIVERED', fee: 35, time: 'منذ 5 دقائق' },
            { num: 'ORD-002', status: 'ACCEPTED', fee: 25, time: 'منذ 12 دقيقة' },
            { num: 'ORD-003', status: 'PENDING', fee: 40, time: 'منذ 2 دقيقة' },
          ].map(order => (
            <div key={order.num} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {order.status === 'DELIVERED' 
                  ? <CheckCircle size={16} className="text-green-500" />
                  : order.status === 'PENDING'
                  ? <Clock size={16} className="text-yellow-500" />
                  : <Truck size={16} className="text-blue-500" />
                }
                <span className="text-sm font-semibold">{order.num}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{order.time}</span>
                <span className="font-bold text-orange-600">{order.fee} ج</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
