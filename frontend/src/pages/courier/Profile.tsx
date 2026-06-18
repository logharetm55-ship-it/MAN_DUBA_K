import { Star, Package, Truck, User, Phone, MapPin, Award, LogOut, DollarSign } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function CourierProfile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user || user.role !== 'courier') {
    navigate('/')
    return null
  }

  const DEMO_STATS = {
    rating: 4.8,
    total_deliveries: 127,
    totalRatings: 43,
    todayEarnings: 185,
    totalEarnings: 4320,
  }

  const DEMO_RATINGS = [
    { rating: 5, comment: 'سريع جداً وأمين 👍', date: 'منذ يومين' },
    { rating: 4, comment: 'كويس', date: 'منذ 3 أيام' },
    { rating: 5, comment: 'ممتاز! ربنا يكرمك', date: 'منذ أسبوع' },
    { rating: 5, comment: 'أحسن مندوب خدمني', date: 'منذ أسبوعين' },
  ]

  async function handleLogout() {
    localStorage.removeItem('mandoubak_admin_session')
    await logout()
    toast.success('تم الخروج 👋')
    navigate('/login')
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Profile Header */}
      <div className="card text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-black text-orange-500">
            {(user.name || user.phone || 'م')[0]}
          </span>
        </div>
        <h2 className="text-xl font-black">{user.name || 'مندوب'}</h2>
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold mt-2 bg-green-100 text-green-700">
          ✅ مندوب معتمد
        </div>
        <div className="w-3 h-3 rounded-full mx-auto mt-2 bg-green-500" />
        <p className="text-xs text-gray-500 mt-1">متاح للطلبات</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <Star className="text-yellow-500 fill-yellow-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black">{DEMO_STATS.rating.toFixed(1)}</div>
          <div className="text-xs text-gray-500">{DEMO_STATS.totalRatings} تقييم</div>
        </div>
        <div className="card text-center py-4">
          <Package className="text-orange-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black">{DEMO_STATS.total_deliveries}</div>
          <div className="text-xs text-gray-500">توصيلة</div>
        </div>
        <div className="card text-center py-4">
          <Award className="text-purple-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black">مميز</div>
          <div className="text-xs text-gray-500">المستوى</div>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center py-4 bg-green-50 border border-green-100">
          <DollarSign className="text-green-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black text-green-700">{DEMO_STATS.todayEarnings} ج</div>
          <div className="text-xs text-gray-500">أرباح اليوم</div>
        </div>
        <div className="card text-center py-4 bg-blue-50 border border-blue-100">
          <DollarSign className="text-blue-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black text-blue-700">{DEMO_STATS.totalEarnings} ج</div>
          <div className="text-xs text-gray-500">إجمالي الأرباح</div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="card space-y-3">
        <h3 className="font-bold">البيانات الشخصية</h3>
        {[
          { icon: <User size={16} />, label: 'الاسم', value: user.name || 'غير محدد' },
          { icon: <Phone size={16} />, label: 'الموبايل', value: user.phone },
          { icon: <MapPin size={16} />, label: 'العنوان', value: user.address || 'غير محدد' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-2">
            <span className="text-orange-500">{item.icon}</span>
            <span className="text-gray-500 w-16">{item.label}</span>
            <span className="font-semibold">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Rating Stats */}
      <div className="card">
        <h3 className="font-bold mb-3">نسبة التقييم</h3>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-5xl font-black text-gray-900">{DEMO_STATS.rating.toFixed(1)}</span>
          <div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={20} className={i < Math.round(DEMO_STATS.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">{DEMO_STATS.totalRatings} تقييم</p>
          </div>
        </div>

        <h3 className="font-bold mb-3">آخر التقييمات</h3>
        <div className="space-y-3">
          {DEMO_RATINGS.map((r, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-gray-100 pb-3">
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={14} className={s < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                ))}
              </div>
              <div className="flex-1">
                {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => navigate('/courier/dashboard')}
          className="card flex items-center gap-3 hover:shadow-md transition-all cursor-pointer">
          <Truck className="text-orange-500" size={22} />
          <div>
            <div className="font-bold text-sm">الطلبات</div>
            <div className="text-xs text-gray-400">شوف الطلبات المتاحة</div>
          </div>
        </button>
        <button
          onClick={() => navigate('/courier/earnings')}
          className="card flex items-center gap-3 hover:shadow-md transition-all cursor-pointer">
          <DollarSign className="text-green-500" size={22} />
          <div>
            <div className="font-bold text-sm">الأرباح</div>
            <div className="text-xs text-gray-400">كشف حساب كامل</div>
          </div>
        </button>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3 text-red-500 hover:bg-red-50 rounded-2xl font-bold transition-all">
        <LogOut size={18} />
        خروج
      </button>
    </div>
  )
}
