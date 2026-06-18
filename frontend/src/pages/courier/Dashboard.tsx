// =============================================================
// Courier Dashboard - بيانات حقيقية من API (بدون Demo)
// =============================================================

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  Truck, Package, Clock, MapPin, CheckCircle,
  Wifi, WifiOff, RefreshCw, ShoppingBag, Phone, AlertTriangle
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import { useNavigate } from 'react-router-dom'

interface OrderItem {
  name: string
  quantity: number
  shop_name?: string
}

interface Order {
  id: string
  order_number: string
  type: 'SHOPPING' | 'DELIVERY'
  status: string
  pickup_details?: string
  delivery_details?: string
  recipient_phone?: string
  distance_km?: number
  num_shops?: number
  delivery_fee: number
  created_at: string
  notes?: string
  order_items?: OrderItem[]
}

const API = '/api'
const REFRESH_INTERVAL_MS = 15000

export default function CourierDashboard() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [pendingOrders, setPendingOrders] = useState<Order[]>([])
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [tab, setTab] = useState<'pending' | 'mine'>('pending')
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [courierStatus, setCourierStatus] = useState<string | null>(null)
  const [courierStatusError, setCourierStatusError] = useState<string | null>(null)

  // لو مش مندوب
  if (!user || user.role !== 'courier') {
    navigate('/')
    return null
  }

  const fetchPendingOrders = useCallback(async () => {
    if (!token || !isOnline) return
    try {
      const res = await fetch(`${API}/orders/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.status === 403) {
        const data = await res.json()
        setCourierStatus(data.courierStatus || 'PENDING_REVIEW')
        setCourierStatusError(data.error || 'حسابك لسه تحت المراجعة')
        setPendingOrders([])
        return
      }

      if (res.ok) {
        const data = await res.json()
        const newOrders = data.orders || []
        setCourierStatus('APPROVED')
        setCourierStatusError(null)

        // Check for genuinely new orders (not in current list)
        setPendingOrders(prev => {
          const prevIds = new Set(prev.map((o: Order) => o.id))
          const hasNew = newOrders.some((o: Order) => !prevIds.has(o.id))
          if (hasNew && prev.length > 0) {
            toast('🆕 طلب جديد وصل!', { icon: '📦', duration: 3000 })
          }
          return newOrders
        })
        setLastRefresh(new Date())
      }
    } catch { /* silent — no toast on background refresh */ }
  }, [token, isOnline])

  const fetchMyOrders = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`${API}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMyOrders(data.orders || [])
      }
    } catch { /* silent */ }
  }, [token])

  // Initial load
  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([fetchPendingOrders(), fetchMyOrders()])
      setLoading(false)
    }
    init()
  }, [])

  // Auto-refresh pending orders
  useEffect(() => {
    if (!isOnline) return
    const interval = setInterval(() => {
      fetchPendingOrders()
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [isOnline, fetchPendingOrders])

  async function acceptOrder(orderId: string) {
    if (!token) return
    setAccepting(orderId)
    try {
      const res = await fetch(`${API}/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (res.ok && data.success) {
        toast.success('✅ تم قبول الطلب! اتحرك بسرعة 🛵')
        setPendingOrders(prev => prev.filter(o => o.id !== orderId))
        await fetchMyOrders()
        setTab('mine')
      } else if (res.status === 409) {
        toast.error('⚡ الأوردر اتحجز من مندوب تاني!')
        setPendingOrders(prev => prev.filter(o => o.id !== orderId))
      } else {
        toast.error(data.error || 'مقدرناش تقبل الأوردر')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setAccepting(null)
    }
  }

  async function updateOrderStatus(orderId: string, status: 'PICKED_UP' | 'DELIVERED') {
    if (!token) return
    setUpdatingStatus(orderId)
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      })
      if (res.ok) {
        const labels: Record<string, string> = {
          PICKED_UP: '📦 تم الاستلام من المحل',
          DELIVERED: '✅ تم التوصيل بنجاح!'
        }
        toast.success(labels[status] || 'تم التحديث')
        setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
      } else {
        toast.error('مقدرناش نحدث الحالة')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const timeSince = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `${mins} دقيقة`
    return `${Math.floor(mins / 60)} ساعة`
  }

  const todayEarnings = myOrders
    .filter(o => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.delivery_fee, 0)

  const activeOrders = myOrders.filter(o => ['ACCEPTED', 'PICKED_UP'].includes(o.status))

  // ===== Not approved yet =====
  if (courierStatus && courierStatus !== 'APPROVED') {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
          <Clock className="text-yellow-500" size={40} />
        </div>
        <h2 className="text-xl font-black">
          {courierStatus === 'PENDING_REVIEW' ? 'حسابك تحت المراجعة ⏳' :
           courierStatus === 'REJECTED' ? 'تم رفض حسابك ❌' :
           courierStatus === 'SUSPENDED' ? 'حسابك موقوف ⛔' :
           'حالة غير معروفة'}
        </h2>
        <p className="text-gray-500">{courierStatusError || 'لم يتم الموافقة على حسابك بعد'}</p>
        {courierStatus === 'PENDING_REVIEW' && (
          <div className="card text-right space-y-2 text-sm text-gray-600">
            <p>✅ تم استلام بياناتك</p>
            <p>⏳ الأدمن بيراجع صور البطاقة</p>
            <p>📱 هيبلغوك بالنتيجة خلال 24 ساعة</p>
          </div>
        )}
        {courierStatus === 'NOT_REGISTERED' && (
          <button onClick={() => navigate('/courier/register')} className="btn-primary">
            أكمّل التسجيل
          </button>
        )}
        <button
          onClick={async () => {
            setLoading(true)
            await fetchPendingOrders()
            setLoading(false)
          }}
          className="btn-secondary flex items-center justify-center gap-2 mx-auto">
          <RefreshCw size={16} /> تحقق من الحالة
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">أهلاً {user.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 text-sm">
            آخر تحديث: {lastRefresh.toLocaleTimeString('ar-EG')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { fetchPendingOrders(); fetchMyOrders() }}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors" title="تحديث">
            <RefreshCw size={18} className="text-gray-500" />
          </button>
          <button
            onClick={() => {
              setIsOnline(!isOnline)
              toast.success(!isOnline ? '🟢 متاح للطلبات' : '🔴 تم إيقاف الاستقبال')
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
              isOnline ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            {isOnline ? 'متاح' : 'غير متاح'}
          </button>
        </div>
      </div>

      {/* Live Indicator */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
        isOnline ? 'bg-green-50 border border-green-200' : 'bg-gray-100 border border-gray-200'
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full block flex-shrink-0 ${
          isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`} />
        <span className={`font-bold text-sm ${isOnline ? 'text-green-700' : 'text-gray-500'}`}>
          {isOnline ? 'متصل — الطلبات بتظهر تلقائياً كل 15 ثانية ⚡' : 'غير متصل — لن تستقبل طلبات'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <div className="text-2xl font-black text-orange-500">{pendingOrders.length}</div>
          <div className="text-xs text-gray-500">طلبات جديدة</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-black text-blue-500">{activeOrders.length}</div>
          <div className="text-xs text-gray-500">جاري التوصيل</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-black text-green-500">{todayEarnings}</div>
          <div className="text-xs text-gray-500">جنيه اليوم</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        <button onClick={() => setTab('pending')}
          className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${tab === 'pending' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>
          طلبات جديدة ({pendingOrders.length})
        </button>
        <button onClick={() => setTab('mine')}
          className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${tab === 'mine' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>
          طلباتي ({myOrders.length})
        </button>
      </div>

      {/* Pending Orders */}
      {tab === 'pending' && (
        <div className="space-y-3">
          {!isOnline ? (
            <div className="text-center py-12">
              <WifiOff size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">فعّل "متاح" عشان تشوف الطلبات</p>
            </div>
          ) : loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card animate-pulse h-32 bg-gray-100" />
            ))
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">مفيش طلبات جديدة دلوقتي</p>
              <p className="text-gray-400 text-sm">لما يجي طلب هيظهر هنا تلقائياً</p>
            </div>
          ) : (
            pendingOrders.map(order => (
              <div key={order.id} className="card border-r-4 border-orange-500">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      {order.type === 'SHOPPING'
                        ? <ShoppingBag className="text-orange-500" size={20} />
                        : <Truck className="text-orange-500" size={20} />
                      }
                    </div>
                    <div>
                      <div className="font-bold text-sm">{order.order_number}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={11} />
                        منذ {timeSince(order.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-orange-600 font-black text-xl">{order.delivery_fee} ج</div>
                    {order.type === 'DELIVERY' && order.distance_km && order.distance_km > 0 && (
                      <div className="text-xs text-gray-400">{order.distance_km} كم</div>
                    )}
                    {order.type === 'SHOPPING' && order.num_shops && order.num_shops > 0 && (
                      <div className="text-xs text-gray-400">{order.num_shops} محل</div>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                {order.order_items && order.order_items.length > 0 && (
                  <div className="mb-3 bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1 font-semibold">المنتجات:</div>
                    {order.order_items.slice(0, 5).map((item, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        • {item.name} × {item.quantity}
                        {item.shop_name && <span className="text-orange-500 text-xs"> [{item.shop_name}]</span>}
                      </div>
                    ))}
                    {order.order_items.length > 5 && (
                      <div className="text-xs text-gray-400 mt-1">+{order.order_items.length - 5} منتجات أكتر</div>
                    )}
                  </div>
                )}

                {/* Route */}
                <div className="flex items-start gap-1 text-gray-500 text-sm mb-1">
                  <MapPin size={14} className="mt-0.5 flex-shrink-0 text-green-500" />
                  <span>{order.pickup_details}</span>
                </div>
                {order.delivery_details && (
                  <div className="flex items-start gap-1 text-gray-500 text-sm mb-3">
                    <MapPin size={14} className="mt-0.5 flex-shrink-0 text-red-500" />
                    <span>{order.delivery_details}</span>
                  </div>
                )}

                {order.recipient_phone && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 mb-3">
                    <Phone size={12} />
                    <span dir="ltr">{order.recipient_phone}</span>
                  </div>
                )}

                {order.notes && (
                  <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-2 mb-3">
                    💬 {order.notes}
                  </div>
                )}

                <button
                  disabled={accepting === order.id}
                  onClick={() => acceptOrder(order.id)}
                  className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg shadow-lg"
                >
                  {accepting === order.id ? (
                    <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />جاري القبول...</>
                  ) : (
                    <><CheckCircle size={22} />قبول الطلب ⚡</>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* My Orders */}
      {tab === 'mine' && (
        <div className="space-y-3">
          {myOrders.length === 0 ? (
            <div className="text-center py-12">
              <Truck size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">مش عندك طلبات لحد دلوقتي</p>
              <button onClick={() => setTab('pending')} className="btn-primary mt-4 text-sm py-2 px-4">
                شوف الطلبات الجديدة
              </button>
            </div>
          ) : (
            myOrders.map(order => (
              <div key={order.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {order.type === 'SHOPPING'
                      ? <ShoppingBag size={18} className="text-orange-500" />
                      : <Truck size={18} className="text-blue-500" />
                    }
                    <div className="font-bold text-sm">{order.order_number}</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'PICKED_UP' ? 'bg-purple-100 text-purple-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status === 'DELIVERED' ? '✅ تم التوصيل' :
                     order.status === 'ACCEPTED' ? '🛵 تم القبول' :
                     order.status === 'PICKED_UP' ? '📦 مع المندوب' : order.status}
                  </span>
                </div>

                <div className="text-orange-600 font-bold mb-2">{order.delivery_fee} جنيه</div>

                {order.pickup_details && (
                  <div className="text-xs text-gray-500 mb-1">
                    <MapPin size={11} className="inline ml-1 text-green-500" />
                    {order.pickup_details}
                  </div>
                )}
                {order.delivery_details && (
                  <div className="text-xs text-gray-500 mb-3">
                    <MapPin size={11} className="inline ml-1 text-red-500" />
                    {order.delivery_details}
                  </div>
                )}

                {order.recipient_phone && (
                  <a href={`tel:${order.recipient_phone}`}
                    className="flex items-center gap-1 text-xs text-blue-600 mb-3 hover:underline">
                    <Phone size={12} />
                    <span dir="ltr">{order.recipient_phone}</span>
                  </a>
                )}

                {order.status === 'ACCEPTED' && (
                  <button
                    disabled={updatingStatus === order.id}
                    onClick={() => updateOrderStatus(order.id, 'PICKED_UP')}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {updatingStatus === order.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : null}
                    📦 تأكيد الاستلام من المحل/المرسل
                  </button>
                )}
                {order.status === 'PICKED_UP' && (
                  <button
                    disabled={updatingStatus === order.id}
                    onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                    {updatingStatus === order.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : null}
                    ✅ تأكيد التوصيل للمستلم
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
