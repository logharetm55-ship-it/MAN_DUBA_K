import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Truck, Package, Clock, MapPin, CheckCircle, Wifi, WifiOff, RefreshCw, ShoppingBag } from 'lucide-react'

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
  distance_km?: number
  delivery_fee: number
  created_at: string
  order_items?: OrderItem[]
}

const DEMO_PENDING: Order[] = [
  {
    id: 'demo-1', order_number: 'ORD-1718001-ABCD', type: 'SHOPPING', status: 'PENDING',
    pickup_details: 'برجر تاون - شارع التحرير', delivery_details: 'عمارة 15، شارع النيل',
    distance_km: 2.3, delivery_fee: 25, created_at: new Date(Date.now() - 120000).toISOString(),
    order_items: [{ name: 'وجبة برجر كاملة', quantity: 2, shop_name: 'برجر تاون' }],
  },
  {
    id: 'demo-2', order_number: 'ORD-1718002-EFGH', type: 'DELIVERY', status: 'PENDING',
    pickup_details: 'شارع الهرم، الجيزة', delivery_details: 'مدينة نصر، القاهرة',
    distance_km: 4.7, delivery_fee: 40, created_at: new Date(Date.now() - 45000).toISOString(),
  },
  {
    id: 'demo-3', order_number: 'ORD-1718003-IJKL', type: 'SHOPPING', status: 'PENDING',
    pickup_details: 'كشري الحلوة - شارع الهرم', delivery_details: 'المعادي، القاهرة',
    distance_km: 3.1, delivery_fee: 30, created_at: new Date(Date.now() - 15000).toISOString(),
    order_items: [{ name: 'كيلو كشري', quantity: 1 }],
  },
]

export default function CourierDashboard() {
  const [pendingOrders, setPendingOrders] = useState<Order[]>(DEMO_PENDING)
  const [myOrders, setMyOrders] = useState<Order[]>([])
  const [accepting, setAccepting] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [tab, setTab] = useState<'pending' | 'mine'>('pending')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Simulate Realtime - طلب جديد كل 15 ثانية للديمو
  useEffect(() => {
    if (!isOnline) return
    const interval = setInterval(() => {
      const hasNew = Math.random() > 0.6
      if (hasNew) {
        const newOrder: Order = {
          id: `demo-${Date.now()}`,
          order_number: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          type: Math.random() > 0.5 ? 'SHOPPING' : 'DELIVERY',
          status: 'PENDING',
          pickup_details: ['بيتزا كينج - التحرير', 'مطعم الشرق - نصر', 'فراخ الجنة - فيصل'][Math.floor(Math.random() * 3)],
          delivery_details: ['الزمالك', 'المهندسين', 'العجوزة', 'الدقي'][Math.floor(Math.random() * 4)],
          distance_km: Math.round(Math.random() * 8 * 10) / 10 + 1,
          delivery_fee: Math.ceil((Math.random() * 4 + 1.5) * 8 / 5) * 5,
          created_at: new Date().toISOString(),
          order_items: Math.random() > 0.5 ? [{ name: 'منتج جديد', quantity: 1 }] : undefined,
        }
        setPendingOrders(prev => [newOrder, ...prev.slice(0, 9)])
        setLastRefresh(new Date())
        toast('🆕 طلب جديد وصل!', { icon: '📦', duration: 3000 })
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [isOnline])

  function acceptOrder(orderId: string) {
    setAccepting(orderId)
    setTimeout(() => {
      const order = pendingOrders.find(o => o.id === orderId)
      if (order) {
        // Race condition simulation: 20% chance someone else took it
        if (Math.random() < 0.2) {
          toast.error('⚡ الأوردر اتحجز من مندوب تاني!')
          setPendingOrders(prev => prev.filter(o => o.id !== orderId))
        } else {
          toast.success('✅ تم قبول الطلب! اتحرك بسرعة 🛵')
          setPendingOrders(prev => prev.filter(o => o.id !== orderId))
          setMyOrders(prev => [{ ...order, status: 'ACCEPTED' }, ...prev])
        }
      }
      setAccepting(null)
    }, 300)
  }

  function updateOrderStatus(orderId: string, status: string) {
    setMyOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
    const labels: Record<string, string> = { PICKED_UP: '📦 تم الاستلام', DELIVERED: '✅ تم التوصيل' }
    toast.success(labels[status] || 'تم التحديث')
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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black">لوحة المناديب</h1>
          <p className="text-gray-500 text-sm">آخر تحديث: {lastRefresh.toLocaleTimeString('ar-EG')}</p>
        </div>
        <button
          onClick={() => { setIsOnline(!isOnline); toast.success(!isOnline ? '🟢 متاح للطلبات' : '🔴 تم إيقاف الاستقبال') }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
            isOnline ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
          {isOnline ? 'متاح' : 'غير متاح'}
        </button>
      </div>

      {/* Live Indicator */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse block" />
        <span className="text-green-700 font-bold text-sm">
          {isOnline ? 'متصل - الأوردرات بتظهر لحظياً ⚡' : 'غير متصل - لن تستقبل طلبات'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-3">
          <div className="text-2xl font-black text-orange-500">{pendingOrders.length}</div>
          <div className="text-xs text-gray-500">طلبات جديدة</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-black text-blue-500">{myOrders.filter(o => o.status === 'ACCEPTED').length}</div>
          <div className="text-xs text-gray-500">جاري التوصيل</div>
        </div>
        <div className="card text-center py-3">
          <div className="text-2xl font-black text-green-500">{todayEarnings} ج</div>
          <div className="text-xs text-gray-500">أرباح اليوم</div>
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
          ) : pendingOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-semibold">مفيش طلبات جديدة دلوقتي</p>
              <p className="text-gray-400 text-sm">لما يجي طلب هيظهر هنا فوراً</p>
            </div>
          ) : (
            pendingOrders.map(order => (
              <div key={order.id} className="card border-r-4 border-orange-500 order-card-enter">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                      {order.type === 'SHOPPING' ? <ShoppingBag className="text-orange-500" size={20} /> : <Truck className="text-orange-500" size={20} />}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{order.order_number}</div>
                      <div className="text-xs text-gray-400">منذ {timeSince(order.created_at)}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-orange-600 font-black text-lg">{order.delivery_fee} ج</div>
                    {order.distance_km && <div className="text-xs text-gray-400">{order.distance_km} كم</div>}
                  </div>
                </div>

                {order.order_items && order.order_items.length > 0 && (
                  <div className="mb-3 bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-500 mb-1 font-semibold">المنتجات:</div>
                    {order.order_items.map((item, i) => (
                      <div key={i} className="text-sm text-gray-700">
                        • {item.name} × {item.quantity}
                        {item.shop_name && <span className="text-gray-400"> ({item.shop_name})</span>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
                  <MapPin size={14} />
                  <span className="truncate">{order.pickup_details} → {order.delivery_details}</span>
                </div>

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
            </div>
          ) : (
            myOrders.map(order => (
              <div key={order.id} className="card">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm">{order.order_number}</div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {order.status === 'DELIVERED' ? '✅ تم التوصيل' : order.status === 'ACCEPTED' ? '🛵 مقبول' : order.status === 'PICKED_UP' ? '📦 تم الاستلام' : order.status}
                  </span>
                </div>
                <div className="text-orange-600 font-bold text-sm mb-3">{order.delivery_fee} جنيه</div>
                {order.status === 'ACCEPTED' && (
                  <button onClick={() => updateOrderStatus(order.id, 'PICKED_UP')}
                    className="w-full btn-primary text-sm py-2">📦 تأكيد الاستلام</button>
                )}
                {order.status === 'PICKED_UP' && (
                  <button onClick={() => updateOrderStatus(order.id, 'DELIVERED')}
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl text-sm">✅ تأكيد التوصيل</button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
