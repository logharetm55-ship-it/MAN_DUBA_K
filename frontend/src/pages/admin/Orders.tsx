// =============================================================
// Admin Orders - كل الأوردرات الحقيقية
// =============================================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Package, ShoppingBag, Truck, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface Order {
  id: string
  order_number: string
  type: 'SHOPPING' | 'DELIVERY'
  status: string
  delivery_fee: number
  distance_km: number
  num_shops: number
  pickup_details: string
  delivery_details: string
  recipient_phone: string
  notes: string
  created_at: string
  order_items?: { name: string; quantity: number; price?: number; shop_name?: string }[]
  couriers?: { name: string; phone: string }
  users?: { name: string; phone: string }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: 'ينتظر مندوب', color: 'text-yellow-700', bg: 'bg-yellow-100' },
  ACCEPTED:   { label: 'تم القبول',   color: 'text-blue-700',   bg: 'bg-blue-100'   },
  PICKED_UP:  { label: 'مع المندوب',  color: 'text-purple-700', bg: 'bg-purple-100' },
  DELIVERED:  { label: 'تم التوصيل', color: 'text-green-700',  bg: 'bg-green-100'  },
  CANCELLED:  { label: 'ملغي',        color: 'text-red-700',    bg: 'bg-red-100'    },
}

export default function AdminOrders() {
  const { token } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadOrders() }, [filter, page])

  async function loadOrders() {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      params.set('page', String(page))

      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, pages: 1 })
      } else {
        toast.error('مقدرناش نجيب الأوردرات')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const filterTabs = [
    { key: 'all', label: 'الكل' },
    { key: 'PENDING', label: 'ينتظر' },
    { key: 'ACCEPTED', label: 'قُبل' },
    { key: 'PICKED_UP', label: 'مع مندوب' },
    { key: 'DELIVERED', label: 'تم' },
    { key: 'CANCELLED', label: 'ملغي' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-orange-500" size={28} />
          <div>
            <h1 className="text-2xl font-black">الأوردرات</h1>
            <p className="text-gray-500 text-sm">{pagination.total} أوردر إجمالي</p>
          </div>
        </div>
        <button onClick={loadOrders} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw size={20} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {filterTabs.map(tab => (
          <button key={tab.key} onClick={() => { setFilter(tab.key); setPage(1) }}
            className={`flex-shrink-0 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
              filter === tab.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-24 bg-gray-100" />
        ))
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={48} className="mx-auto mb-3 opacity-30" />
          <p>مفيش أوردرات في هذه الفئة</p>
        </div>
      ) : (
        orders.map(order => {
          const sc = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING
          const isExp = expanded === order.id
          return (
            <div key={order.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    order.type === 'SHOPPING' ? 'bg-orange-100' : 'bg-blue-100'
                  }`}>
                    {order.type === 'SHOPPING'
                      ? <ShoppingBag size={18} className="text-orange-500" />
                      : <Truck size={18} className="text-blue-500" />
                    }
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{order.order_number}</h3>
                    <div className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleString('ar-EG')}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                    {sc.label}
                  </span>
                  <span className="text-sm font-black text-orange-600">{order.delivery_fee} جنيه</span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                {order.users && (
                  <div>👤 العميل: <span className="font-semibold text-gray-700">{order.users.name || order.users.phone}</span></div>
                )}
                {order.couriers && (
                  <div>🛵 المندوب: <span className="font-semibold text-gray-700">{order.couriers.name}</span></div>
                )}
                {order.type === 'SHOPPING' && order.num_shops > 0 && (
                  <div>🏪 محلات: <span className="font-semibold">{order.num_shops}</span></div>
                )}
                {order.type === 'DELIVERY' && order.distance_km > 0 && (
                  <div>📍 مسافة: <span className="font-semibold">{order.distance_km} كم</span></div>
                )}
              </div>

              <button onClick={() => setExpanded(isExp ? null : order.id)}
                className="mt-2 text-xs text-orange-600 font-semibold hover:underline">
                {isExp ? '▲ إخفاء التفاصيل' : '▼ عرض التفاصيل'}
              </button>

              {isExp && (
                <div className="mt-3 space-y-2 text-sm border-t pt-3">
                  <div className="text-gray-600">
                    <span className="font-bold">الاستلام:</span> {order.pickup_details}
                  </div>
                  <div className="text-gray-600">
                    <span className="font-bold">التسليم:</span> {order.delivery_details}
                  </div>
                  {order.recipient_phone && (
                    <div className="text-gray-600">
                      <span className="font-bold">تليفون المستلم:</span> {order.recipient_phone}
                    </div>
                  )}
                  {order.notes && (
                    <div className="text-gray-600">
                      <span className="font-bold">ملاحظات:</span> {order.notes}
                    </div>
                  )}
                  {order.order_items && order.order_items.length > 0 && (
                    <div>
                      <div className="font-bold mb-1">المنتجات:</div>
                      {order.order_items.slice(0, 10).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-500 mb-0.5">
                          <span>•</span>
                          {item.shop_name && <span className="font-semibold text-orange-600">[{item.shop_name}]</span>}
                          <span>{item.name} × {item.quantity}</span>
                          {item.price && <span className="text-green-600">({item.price} جنيه)</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="p-2 hover:bg-gray-100 disabled:opacity-30 rounded-xl transition-colors">
            <ChevronRight size={20} />
          </button>
          <span className="font-bold text-sm">
            صفحة {page} من {pagination.pages} ({pagination.total} أوردر)
          </span>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
            className="p-2 hover:bg-gray-100 disabled:opacity-30 rounded-xl transition-colors">
            <ChevronLeft size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
