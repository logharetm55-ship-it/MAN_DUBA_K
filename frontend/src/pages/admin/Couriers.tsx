// =============================================================
// Admin Couriers - إدارة المناديب (بيانات حقيقية)
// =============================================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Truck, CheckCircle, XCircle, Clock, Star, Phone, MapPin, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface Courier {
  id: string
  name: string
  phone: string
  address: string
  status: string
  rating: number
  total_deliveries: number
  is_online: boolean
  id_front_image_url: string
  id_back_image_url: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_REVIEW: { label: 'قيد المراجعة', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APPROVED: { label: 'معتمد', color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { label: 'مرفوض', color: 'text-red-700', bg: 'bg-red-100' },
  SUSPENDED: { label: 'موقوف', color: 'text-gray-700', bg: 'bg-gray-100' },
}

export default function AdminCouriers() {
  const { token } = useAuth()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => { loadCouriers() }, [])

  async function loadCouriers() {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/couriers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCouriers(data.couriers || [])
      } else {
        toast.error('مقدرناش نجيب المناديب')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(courierId: string, status: string) {
    if (!token) return
    setUpdating(courierId)
    try {
      const res = await fetch(`/api/admin/couriers/${courierId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        toast.success(status === 'APPROVED' ? '✅ تم الموافقة على المندوب' :
          status === 'REJECTED' ? '❌ تم رفض المندوب' : '⛔ تم إيقاف المندوب')
        setCouriers(couriers.map(c => c.id === courierId ? { ...c, status } : c))
      } else {
        toast.error('فشل التحديث')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setUpdating(null)
    }
  }

  const filtered = filter === 'all' ? couriers : couriers.filter(c => c.status === filter)
  const pendingCount = couriers.filter(c => c.status === 'PENDING_REVIEW').length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="text-orange-500" size={28} />
          <div>
            <h1 className="text-2xl font-black">إدارة المناديب</h1>
            {pendingCount > 0 && (
              <p className="text-yellow-600 text-sm font-semibold">{pendingCount} مندوب ينتظر الموافقة ⏳</p>
            )}
          </div>
        </div>
        <button onClick={loadCouriers} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="تحديث">
          <RefreshCw size={20} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { key: 'all', label: `الكل (${couriers.length})` },
          { key: 'PENDING_REVIEW', label: `ينتظر (${couriers.filter(c => c.status === 'PENDING_REVIEW').length})` },
          { key: 'APPROVED', label: `معتمد (${couriers.filter(c => c.status === 'APPROVED').length})` },
          { key: 'REJECTED', label: `مرفوض (${couriers.filter(c => c.status === 'REJECTED').length})` },
          { key: 'SUSPENDED', label: `موقوف (${couriers.filter(c => c.status === 'SUSPENDED').length})` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
              filter === tab.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Couriers List */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-32 bg-gray-100" />
        ))
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Truck size={48} className="mx-auto mb-3 opacity-30" />
          <p>مفيش مناديب في هذه الفئة</p>
          {couriers.length === 0 && (
            <p className="text-sm mt-2">لو فيه خطأ في الاتصال، تأكد من الـ backend</p>
          )}
        </div>
      ) : (
        filtered.map(courier => {
          const sc = STATUS_CONFIG[courier.status] || STATUS_CONFIG.PENDING_REVIEW
          const isUpdating = updating === courier.id
          return (
            <div key={courier.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-orange-600 font-black text-lg">{courier.name[0]}</span>
                    </div>
                    {courier.is_online && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">{courier.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone size={12} />
                      <span dir="ltr">{courier.phone}</span>
                    </div>
                    {courier.address && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin size={11} />
                        <span>{courier.address.slice(0, 40)}{courier.address.length > 40 ? '...' : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${sc.bg} ${sc.color}`}>
                  {sc.label}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-400" />
                  {courier.rating.toFixed(1)}
                </div>
                <div className="flex items-center gap-1">
                  <Truck size={12} />
                  {courier.total_deliveries} توصيلة
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(courier.created_at).toLocaleDateString('ar-EG')}
                </div>
                {courier.is_online && (
                  <span className="text-green-600 font-semibold">● متصل الآن</span>
                )}
              </div>

              {/* ID Images Status */}
              {courier.status === 'PENDING_REVIEW' && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-xl p-2 text-center text-xs ${courier.id_front_image_url ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      🪪 وجه البطاقة
                      <div className="mt-1 font-bold">
                        {courier.id_front_image_url ? '✅ مرفوع' : '❌ غير مرفوع'}
                      </div>
                    </div>
                    <div className={`rounded-xl p-2 text-center text-xs ${courier.id_back_image_url ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      🪪 ضهر البطاقة
                      <div className="mt-1 font-bold">
                        {courier.id_back_image_url ? '✅ مرفوع' : '❌ غير مرفوع'}
                      </div>
                    </div>
                  </div>

                  {!courier.id_front_image_url || !courier.id_back_image_url ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 text-center">
                      ⚠️ صور البطاقة ناقصة — ارفضه وخليه يكمل التسجيل
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'APPROVED')}
                      className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all">
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                      موافقة
                    </button>
                    <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'REJECTED')}
                      className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all">
                      {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                      رفض
                    </button>
                  </div>
                </div>
              )}

              {courier.status === 'APPROVED' && (
                <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'SUSPENDED')}
                  className="mt-3 w-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
                  إيقاف المندوب
                </button>
              )}

              {courier.status === 'SUSPENDED' && (
                <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'APPROVED')}
                  className="mt-3 w-full bg-green-100 hover:bg-green-200 text-green-700 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                  {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
                  إعادة التفعيل
                </button>
              )}

              {courier.status === 'REJECTED' && (
                <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'PENDING_REVIEW')}
                  className="mt-3 w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold py-2 rounded-xl text-sm transition-all">
                  إعادة للمراجعة
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
