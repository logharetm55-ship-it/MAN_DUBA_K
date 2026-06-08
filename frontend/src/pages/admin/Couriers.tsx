import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import toast from 'react-hot-toast'
import { Truck, CheckCircle, XCircle, Clock, Star, Phone, MapPin } from 'lucide-react'

interface Courier {
  id: string
  name: string
  phone: string
  address: string
  status: string
  rating: number
  total_deliveries: number
  id_front_image_url: string
  id_back_image_url: string
  created_at: string
  users?: { email: string }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING_REVIEW: { label: 'قيد المراجعة', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  APPROVED: { label: 'معتمد', color: 'text-green-700', bg: 'bg-green-100' },
  REJECTED: { label: 'مرفوض', color: 'text-red-700', bg: 'bg-red-100' },
  SUSPENDED: { label: 'موقوف', color: 'text-gray-700', bg: 'bg-gray-100' },
}

export default function AdminCouriers() {
  const [couriers, setCouriers] = useState<Courier[]>(DEMO_COURIERS)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  function updateStatus(courierId: string, status: string) {
    setUpdating(courierId)
    setTimeout(() => {
      toast.success(status === 'APPROVED' ? '✅ تم الموافقة على المندوب' : status === 'REJECTED' ? '❌ تم رفض المندوب' : '⛔ تم إيقاف المندوب')
      setCouriers(couriers.map(c => c.id === courierId ? { ...c, status } : c))
      setUpdating(null)
    }, 400)
  }

  const filtered = filter === 'all' ? couriers : couriers.filter(c => c.status === filter)
  const pendingCount = couriers.filter(c => c.status === 'PENDING_REVIEW').length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Truck className="text-orange-500" size={28} />
        <div>
          <h1 className="text-2xl font-black">إدارة المناديب</h1>
          {pendingCount > 0 && (
            <p className="text-yellow-600 text-sm font-semibold">{pendingCount} مندوب ينتظر الموافقة ⏳</p>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { key: 'all', label: `الكل (${couriers.length})` },
          { key: 'PENDING_REVIEW', label: `منتظر (${couriers.filter(c => c.status === 'PENDING_REVIEW').length})` },
          { key: 'APPROVED', label: `معتمد (${couriers.filter(c => c.status === 'APPROVED').length})` },
          { key: 'REJECTED', label: `مرفوض (${couriers.filter(c => c.status === 'REJECTED').length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
              filter === tab.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Couriers List */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-24" />
        ))
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Truck size={48} className="mx-auto mb-3 opacity-30" />
          <p>مفيش مناديب في هذه الفئة</p>
        </div>
      ) : (
        filtered.map(courier => {
          const statusConfig = STATUS_CONFIG[courier.status]
          return (
            <div key={courier.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-orange-600 font-black text-lg">{courier.name[0]}</span>
                  </div>
                  <div>
                    <h3 className="font-bold">{courier.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone size={12} />
                      <span dir="ltr">{courier.phone}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusConfig.bg} ${statusConfig.color}`}>
                  {statusConfig.label}
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
              </div>

              {courier.status === 'PENDING_REVIEW' && (
                <div className="mt-4 space-y-3">
                  {/* Show ID images */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-100 rounded-xl p-2 text-center text-xs text-gray-500">
                      🪪 وجه البطاقة
                      <div className="text-xs text-gray-400 mt-1">
                        {courier.id_front_image_url ? '✅ مرفوع' : '❌ مش موجود'}
                      </div>
                    </div>
                    <div className="bg-gray-100 rounded-xl p-2 text-center text-xs text-gray-500">
                      🪪 ضهر البطاقة
                      <div className="text-xs text-gray-400 mt-1">
                        {courier.id_back_image_url ? '✅ مرفوع' : '❌ مش موجود'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={updating === courier.id}
                      onClick={() => updateStatus(courier.id, 'APPROVED')}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all"
                    >
                      <CheckCircle size={16} />
                      موافقة
                    </button>
                    <button
                      disabled={updating === courier.id}
                      onClick={() => updateStatus(courier.id, 'REJECTED')}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-1 transition-all"
                    >
                      <XCircle size={16} />
                      رفض
                    </button>
                  </div>
                </div>
              )}

              {courier.status === 'APPROVED' && (
                <button
                  disabled={updating === courier.id}
                  onClick={() => updateStatus(courier.id, 'SUSPENDED')}
                  className="mt-3 w-full bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold py-2 rounded-xl text-sm transition-all"
                >
                  إيقاف المندوب
                </button>
              )}

              {courier.status === 'SUSPENDED' && (
                <button
                  disabled={updating === courier.id}
                  onClick={() => updateStatus(courier.id, 'APPROVED')}
                  className="mt-3 w-full bg-green-100 hover:bg-green-200 text-green-700 font-bold py-2 rounded-xl text-sm transition-all"
                >
                  إعادة التفعيل
                </button>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

const DEMO_COURIERS: Courier[] = [
  {
    id: '1', name: 'أحمد محمد', phone: '01012345678', address: 'شارع التحرير',
    status: 'PENDING_REVIEW', rating: 0, total_deliveries: 0,
    id_front_image_url: 'demo-key', id_back_image_url: 'demo-key',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2', name: 'محمود علي', phone: '01234567890', address: 'الجيزة',
    status: 'APPROVED', rating: 4.7, total_deliveries: 89,
    id_front_image_url: 'demo-key', id_back_image_url: 'demo-key',
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: '3', name: 'كريم سمير', phone: '01098765432', address: 'مدينة نصر',
    status: 'APPROVED', rating: 4.9, total_deliveries: 214,
    id_front_image_url: 'demo-key', id_back_image_url: 'demo-key',
    created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
  },
]
