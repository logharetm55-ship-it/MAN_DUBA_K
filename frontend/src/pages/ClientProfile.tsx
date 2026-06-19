import { useState, useEffect } from 'react'
import { User, Phone, MapPin, Package, Star, Edit3, Save, X, LogOut, TrendingUp } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'

interface OrderStats {
  total: number
  totalSpent: number
  avgFee: number
  delivered: number
}

export default function ClientProfile() {
  const { user, logout, updateUser, token } = useAuth()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [address, setAddress] = useState(user?.address || '')
  const [saving, setSaving] = useState(false)
  const [stats, setStats] = useState<OrderStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    setStatsLoading(true)
    fetch('/api/orders/my', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { orders: [] })
      .then(data => {
        const orders = data.orders || []
        const delivered = orders.filter((o: { status: string }) => o.status === 'DELIVERED')
        const totalSpent = orders.reduce((sum: number, o: { delivery_fee?: number }) => sum + (o.delivery_fee || 0), 0)
        setStats({
          total: orders.length,
          totalSpent: Math.round(totalSpent),
          avgFee: orders.length > 0 ? Math.round(totalSpent / orders.length) : 0,
          delivered: delivered.length,
        })
      })
      .catch(() => setStats({ total: 0, totalSpent: 0, avgFee: 0, delivered: 0 }))
      .finally(() => setStatsLoading(false))
  }, [token])

  if (!user) {
    navigate('/login')
    return null
  }

  async function saveProfile() {
    if (!token) return
    setSaving(true)
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name || undefined, address }),
      })
      if (res.ok) {
        updateUser({ name, address })
        toast.success('تم حفظ البيانات ✅')
        setEditing(false)
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'فشل الحفظ')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    localStorage.removeItem('mandoubak_admin_session')
    await logout()
    toast.success('تم الخروج 👋')
    navigate('/login')
  }

  const STAT_ITEMS = [
    { label: 'إجمالي الطلبات', value: statsLoading ? '...' : stats?.total ?? 0, icon: '📦' },
    { label: 'إجمالي الإنفاق', value: statsLoading ? '...' : `${stats?.totalSpent ?? 0} ج`, icon: '💰' },
    { label: 'متوسط التوصيل', value: statsLoading ? '...' : `${stats?.avgFee ?? 0} ج`, icon: '🛵' },
    { label: 'طلبات مكتملة', value: statsLoading ? '...' : stats?.delivered ?? 0, icon: '✅' },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">حسابي</h1>
        <button onClick={() => { setEditing(!editing); setName(user.name || ''); setAddress(user.address || '') }}
          className={`flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl transition-all ${editing ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'}`}>
          {editing ? <><X size={16} /> إلغاء</> : <><Edit3 size={16} /> تعديل</>}
        </button>
      </div>

      {/* Avatar & Name */}
      <div className="card text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl font-black text-blue-600 mx-auto mb-3">
          {(name || user.phone || '؟')[0]}
        </div>
        {editing ? (
          <input className="input text-center text-lg font-bold mb-2" value={name}
            onChange={e => setName(e.target.value)} placeholder="اسمك" />
        ) : (
          <h2 className="text-xl font-black">{user.name || user.phone || 'مستخدم'}</h2>
        )}
        <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-600 text-xs font-bold px-3 py-1 rounded-full mt-1">
          👤 عميل
        </div>
      </div>

      {/* Info */}
      <div className="card space-y-4">
        <h3 className="font-bold text-gray-600 text-sm">بياناتي</h3>
        <div className="space-y-3">
          {user.phone && (
            <div className="flex items-center gap-3">
              <Phone size={16} className="text-orange-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700" dir="ltr">{user.phone}</span>
              <span className="text-xs text-gray-400 mr-auto">(لا يمكن تغييره)</span>
            </div>
          )}
          {user.email && (
            <div className="flex items-center gap-3">
              <User size={16} className="text-orange-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700">{user.email}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
            {editing ? (
              <input className="input flex-1 text-sm" value={address}
                onChange={e => setAddress(e.target.value)} placeholder="عنوانك (حي، شارع، مدينة)" />
            ) : (
              <span className="text-sm font-semibold text-gray-700">{user.address || 'لم يُحدد بعد'}</span>
            )}
          </div>
        </div>
        {editing && (
          <button onClick={saveProfile} disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {saving ? '...' : <><Save size={18} /> حفظ التغييرات</>}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-orange-500" />
          <h3 className="font-bold text-gray-700">إحصائياتي</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {STAT_ITEMS.map((stat, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-lg font-black">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
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
