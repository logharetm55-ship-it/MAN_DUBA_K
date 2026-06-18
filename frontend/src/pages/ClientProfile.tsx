import { useState } from 'react'
import { User, Phone, MapPin, Package, Star, Edit3, Save, X, LogOut, Camera } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function ClientProfile() {
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [address, setAddress] = useState(user?.address || '')

  if (!user) {
    navigate('/login')
    return null
  }

  function saveProfile() {
    updateUser({ name, address })
    toast.success('تم حفظ البيانات ✅')
    setEditing(false)
  }

  async function handleLogout() {
    localStorage.removeItem('mandoubak_admin_session')
    await logout()
    toast.success('تم الخروج 👋')
    navigate('/login')
  }

  const DEMO_STATS = [
    { label: 'إجمالي الطلبات', value: 24, icon: '📦' },
    { label: 'إجمالي الإنفاق', value: '680 ج', icon: '💰' },
    { label: 'متوسط سعر التوصيل', value: '28 ج', icon: '🛵' },
    { label: 'تقييماتي للمناديب', value: 8, icon: '⭐' },
  ]

  const RECENT_COURIERS = [
    { name: 'محمد علي', rating: 4.8, trips: 5, avatar: 'م' },
    { name: 'خالد حسن', rating: 4.6, trips: 3, avatar: 'خ' },
    { name: 'أحمد سمير', rating: 4.9, trips: 2, avatar: 'أ' },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">حسابي</h1>
        <button onClick={() => setEditing(!editing)}
          className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl transition-all ${editing ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'}`}>
          {editing ? <><X size={16} /> إلغاء</> : <><Edit3 size={16} /> تعديل</>}
        </button>
      </div>

      {/* Avatar & Name */}
      <div className="card text-center">
        <div className="relative w-20 h-20 mx-auto mb-3">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-black text-blue-600">
            {(name || user.phone || '؟')[0]}
          </div>
          {editing && (
            <button className="absolute bottom-0 left-0 w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-orange-600 transition-colors">
              <Camera size={14} />
            </button>
          )}
        </div>
        {editing ? (
          <input className="input text-center text-lg font-bold mb-2" value={name}
            onChange={e => setName(e.target.value)} placeholder="اسمك" />
        ) : (
          <h2 className="text-xl font-black">{name || user.phone}</h2>
        )}
        <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-full mt-1">
          👤 عميل
        </div>
      </div>

      {/* Info */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-600 text-sm">بياناتي</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Phone size={16} className="text-orange-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-700" dir="ltr">{user.phone}</span>
            <span className="text-xs text-gray-400 mr-auto">(لا يمكن تغييره)</span>
          </div>
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
            {editing ? (
              <input className="input flex-1 text-sm" value={address}
                onChange={e => setAddress(e.target.value)} placeholder="عنوانك" />
            ) : (
              <span className="text-sm font-semibold text-gray-700">{address || 'لم يُحدد بعد'}</span>
            )}
          </div>
        </div>
        {editing && (
          <button onClick={saveProfile} className="btn-primary w-full flex items-center justify-center gap-2">
            <Save size={18} /> حفظ التغييرات
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {DEMO_STATS.map((stat, i) => (
          <div key={i} className="card text-center py-4">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-lg font-black">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent Couriers — مناديب خدموني */}
      <div className="card">
        <h3 className="font-bold mb-4">🛵 أكتر المناديب معك</h3>
        <div className="space-y-3">
          {RECENT_COURIERS.map((c, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600">
                {c.avatar}
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">{c.name}</div>
                <div className="text-xs text-gray-400">{c.trips} طلبات معك</div>
              </div>
              <div className="flex items-center gap-1 text-sm">
                <Star size={13} className="text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">{c.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/my-orders" className="card flex items-center gap-3 hover:shadow-md transition-all">
          <Package className="text-orange-500" size={22} />
          <div>
            <div className="font-bold text-sm">طلباتي</div>
            <div className="text-xs text-gray-400">سجل كامل</div>
          </div>
        </Link>
        <Link to="/order" className="card flex items-center gap-3 hover:shadow-md transition-all">
          <span className="text-2xl">📦</span>
          <div>
            <div className="font-bold text-sm">طلب جديد</div>
            <div className="text-xs text-gray-400">اطلب دلوقتي</div>
          </div>
        </Link>
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
