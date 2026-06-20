// =============================================================
// Admin Couriers - إدارة المناديب (مع نظام الحظر + إعادة الإرسال + صور البطاقة)
// =============================================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Truck, CheckCircle, XCircle, Clock, Star, Phone, MapPin,
  Loader2, RefreshCw, Ban, ShieldCheck, RotateCcw, Eye, X
} from 'lucide-react'
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
  id_front_image_url: string | null
  id_back_image_url: string | null
  created_at: string
  is_banned?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_REVIEW: { label: 'قيد المراجعة', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APPROVED:       { label: 'معتمد',         color: 'text-green-700',  bg: 'bg-green-100'  },
  REJECTED:       { label: 'مرفوض',         color: 'text-red-700',    bg: 'bg-red-100'    },
  SUSPENDED:      { label: 'محظور/موقوف',   color: 'text-gray-700',   bg: 'bg-gray-100'   },
}

export default function AdminCouriers() {
  const { token } = useAuth()
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [banning, setBanning] = useState<string | null>(null)
  const [viewImage, setViewImage] = useState<string | null>(null)

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

  async function updateStatus(courierId: string, status: string, clearImages = false) {
    if (!token) return
    setUpdating(courierId)
    try {
      const res = await fetch(`/api/admin/couriers/${courierId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, clearImages }),
      })
      const data = await res.json()
      if (res.ok) {
        const msgs: Record<string, string> = {
          APPROVED: '✅ تم الموافقة على المندوب',
          REJECTED: '❌ تم رفض المندوب',
          SUSPENDED: '⛔ تم إيقاف المندوب',
          PENDING_REVIEW: '🔄 تم طلب إعادة إرسال البيانات',
        }
        toast.success(msgs[status] || data.message)
        setCouriers(prev => prev.map(c =>
          c.id === courierId ? {
            ...c,
            status,
            ...(clearImages ? { id_front_image_url: null, id_back_image_url: null } : {}),
          } : c
        ))
      } else {
        toast.error(data.error || 'فشل التحديث')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setUpdating(null)
    }
  }

  async function toggleBan(courier: Courier) {
    if (!token) return
    const action = courier.is_banned ? 'unban' : 'ban'
    const confirmMsg = courier.is_banned
      ? `رفع الحظر عن "${courier.name}"؟`
      : `حظر "${courier.name}" نهائياً؟ لن يتمكن من الدخول أو العمل على الإطلاق.`
    if (!confirm(confirmMsg)) return

    setBanning(courier.id)
    try {
      const res = await fetch(`/api/admin/couriers/${courier.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setCouriers(prev => prev.map(c =>
          c.id === courier.id ? { ...c, is_banned: !courier.is_banned, status: courier.is_banned ? 'PENDING_REVIEW' : 'SUSPENDED' } : c
        ))
        toast.success(courier.is_banned ? '✅ تم رفع الحظر' : '🚫 تم حظر المندوب نهائياً')
      } else {
        toast.error(data.error || 'فشل العملية')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setBanning(null)
    }
  }

  const filtered = filter === 'all' ? couriers : couriers.filter(c => c.status === filter)
  const pendingCount = couriers.filter(c => c.status === 'PENDING_REVIEW').length
  const bannedCount = couriers.filter(c => c.is_banned).length

  return (
    <>
      {/* Image Viewer Modal */}
      {viewImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewImage(null)}
        >
          <div className="relative max-w-lg w-full">
            <button
              onClick={() => setViewImage(null)}
              className="absolute -top-10 left-0 text-white flex items-center gap-2 hover:text-gray-300"
            >
              <X size={20} /> إغلاق
            </button>
            <img
              src={viewImage}
              alt="صورة البطاقة"
              className="w-full rounded-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck className="text-orange-500" size={28} />
            <div>
              <h1 className="text-2xl font-black">إدارة المناديب</h1>
              <div className="flex items-center gap-3 text-sm">
                {pendingCount > 0 && (
                  <span className="text-yellow-600 font-semibold">{pendingCount} ينتظر المراجعة ⏳</span>
                )}
                {bannedCount > 0 && (
                  <span className="text-red-500 font-semibold">{bannedCount} محظور 🚫</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={loadCouriers} className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="تحديث">
            <RefreshCw size={20} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
          {[
            { key: 'all',           label: `الكل (${couriers.length})` },
            { key: 'PENDING_REVIEW',label: `ينتظر (${couriers.filter(c => c.status === 'PENDING_REVIEW').length})` },
            { key: 'APPROVED',      label: `معتمد (${couriers.filter(c => c.status === 'APPROVED').length})` },
            { key: 'REJECTED',      label: `مرفوض (${couriers.filter(c => c.status === 'REJECTED').length})` },
            { key: 'SUSPENDED',     label: `محظور (${couriers.filter(c => c.status === 'SUSPENDED').length})` },
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
            <div key={i} className="card animate-pulse h-36 bg-gray-100" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Truck size={48} className="mx-auto mb-3 opacity-30" />
            <p>مفيش مناديب في هذه الفئة</p>
          </div>
        ) : (
          filtered.map(courier => {
            const sc = STATUS_CONFIG[courier.status] || STATUS_CONFIG.PENDING_REVIEW
            const isUpdating = updating === courier.id
            const isBanning = banning === courier.id
            const hasFront = !!courier.id_front_image_url
            const hasBack = !!courier.id_back_image_url
            const hasImages = hasFront && hasBack
            const needsResubmit = courier.status === 'PENDING_REVIEW' && !hasImages

            return (
              <div key={courier.id} className={`card ${courier.is_banned ? 'border-2 border-red-200 bg-red-50/20' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        courier.is_banned ? 'bg-red-100' : 'bg-orange-100'
                      }`}>
                        {courier.is_banned
                          ? <Ban size={20} className="text-red-500" />
                          : <span className="text-orange-600 font-black text-lg">{courier.name?.[0] || '?'}</span>
                        }
                      </div>
                      {courier.is_online && !courier.is_banned && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{courier.name}</h3>
                        {courier.is_banned && (
                          <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">محظور نهائياً</span>
                        )}
                      </div>
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

                {/* Stats */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Star size={12} className="text-yellow-400" />
                    {courier.rating?.toFixed(1) || '0.0'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Truck size={12} />
                    {courier.total_deliveries || 0} توصيلة
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(courier.created_at).toLocaleDateString('ar-EG')}
                  </div>
                  {courier.is_online && !courier.is_banned && (
                    <span className="text-green-600 font-semibold">● متصل الآن</span>
                  )}
                </div>

                {/* ID Card Images */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className={`rounded-xl overflow-hidden border-2 ${hasFront ? 'border-green-200 cursor-pointer hover:border-green-400' : 'border-red-200'}`}
                    onClick={() => hasFront && courier.id_front_image_url && setViewImage(courier.id_front_image_url)}
                  >
                    {hasFront && courier.id_front_image_url ? (
                      <div className="relative">
                        <img
                          src={courier.id_front_image_url}
                          alt="وجه البطاقة"
                          className="w-full h-20 object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none'
                            ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="hidden p-2 text-center text-xs text-green-700 bg-green-50">
                          🪪 وجه البطاقة مرفوع
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all">
                          <Eye size={20} className="text-white opacity-0 hover:opacity-100 transition-all" />
                        </div>
                        <div className="bg-green-600 text-white text-xs text-center py-0.5">🪪 وجه البطاقة ✅</div>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-red-600 bg-red-50">
                        <div className="text-lg mb-1">🪪</div>
                        <div>وجه البطاقة ❌</div>
                        <div className="text-red-400">لم يرفع</div>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-xl overflow-hidden border-2 ${hasBack ? 'border-green-200 cursor-pointer hover:border-green-400' : 'border-red-200'}`}
                    onClick={() => hasBack && courier.id_back_image_url && setViewImage(courier.id_back_image_url)}
                  >
                    {hasBack && courier.id_back_image_url ? (
                      <div className="relative">
                        <img
                          src={courier.id_back_image_url}
                          alt="ضهر البطاقة"
                          className="w-full h-20 object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).style.display = 'none'
                            ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                          }}
                        />
                        <div className="hidden p-2 text-center text-xs text-green-700 bg-green-50">
                          🪪 ضهر البطاقة مرفوع
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all" />
                        <div className="bg-green-600 text-white text-xs text-center py-0.5">🪪 ضهر البطاقة ✅</div>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-red-600 bg-red-50">
                        <div className="text-lg mb-1">🪪</div>
                        <div>ضهر البطاقة ❌</div>
                        <div className="text-red-400">لم يرفع</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning for missing images */}
                {needsResubmit && (
                  <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-2.5 text-sm text-red-700 text-center">
                    ⚠️ صور البطاقة مش مرفوعة — اطلب إعادة إرسال أو ارفض
                  </div>
                )}

                {/* Actions */}
                {!courier.is_banned && (
                  <div className="mt-4 space-y-2">
                    {/* PENDING_REVIEW Actions */}
                    {courier.status === 'PENDING_REVIEW' && (
                      <div className="grid grid-cols-3 gap-2">
                        <button disabled={isUpdating || !hasImages} onClick={() => updateStatus(courier.id, 'APPROVED')}
                          className="bg-green-500 hover:bg-green-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-all"
                          title={!hasImages ? 'الصور ناقصة' : ''}>
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                          موافقة
                        </button>
                        <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'PENDING_REVIEW', true)}
                          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-all">
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                          إعادة إرسال
                        </button>
                        <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'REJECTED')}
                          className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-all">
                          {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                          رفض
                        </button>
                      </div>
                    )}

                    {/* APPROVED Actions */}
                    {courier.status === 'APPROVED' && (
                      <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'SUSPENDED')}
                        className="w-full bg-gray-100 hover:bg-yellow-50 text-gray-600 hover:text-yellow-700 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
                        إيقاف مؤقت
                      </button>
                    )}

                    {/* SUSPENDED Actions */}
                    {courier.status === 'SUSPENDED' && (
                      <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'APPROVED')}
                        className="w-full bg-green-100 hover:bg-green-200 text-green-700 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : null}
                        إعادة التفعيل
                      </button>
                    )}

                    {/* REJECTED Actions */}
                    {courier.status === 'REJECTED' && (
                      <button disabled={isUpdating} onClick={() => updateStatus(courier.id, 'PENDING_REVIEW', true)}
                        className="w-full bg-yellow-100 hover:bg-yellow-200 text-yellow-700 font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2">
                        {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
                        طلب إعادة إرسال البيانات
                      </button>
                    )}
                  </div>
                )}

                {/* Ban / Unban Button */}
                <button
                  disabled={isBanning}
                  onClick={() => toggleBan(courier)}
                  className={`mt-2 w-full font-bold py-2 rounded-xl text-sm transition-all flex items-center justify-center gap-2 ${
                    courier.is_banned
                      ? 'bg-green-100 hover:bg-green-200 text-green-700'
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                  }`}
                >
                  {isBanning ? <Loader2 size={16} className="animate-spin" /> :
                    courier.is_banned ? <ShieldCheck size={16} /> : <Ban size={16} />}
                  {courier.is_banned ? 'رفع الحظر الكامل' : 'حظر كامل من التطبيق'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </>
  )
}
