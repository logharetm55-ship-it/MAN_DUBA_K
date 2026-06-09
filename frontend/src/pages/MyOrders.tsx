import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, MapPin, Clock, Star, ChevronLeft, Truck, ShoppingBag } from 'lucide-react'
import { useAuth } from '../lib/auth-context'

interface Order {
  id: string
  orderNumber: string
  type: 'SHOPPING' | 'DELIVERY'
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED'
  deliveryFee: number
  pickupDetails: string
  deliveryDetails: string
  courier?: { name: string; rating: number; phone: string }
  items?: { name: string; quantity: number }[]
  createdAt: Date
  rated?: boolean
}

const DEMO_ORDERS: Order[] = [
  {
    id: 'ord-1',
    orderNumber: 'ORD-1718001-ABCD',
    type: 'SHOPPING',
    status: 'DELIVERED',
    deliveryFee: 25,
    pickupDetails: 'برجر تاون - التحرير',
    deliveryDetails: 'شارع النيل، عمارة 15',
    courier: { name: 'محمد علي', rating: 4.8, phone: '01012345678' },
    items: [{ name: 'وجبة برجر كاملة', quantity: 2 }],
    createdAt: new Date(Date.now() - 3600000 * 2),
    rated: false,
  },
  {
    id: 'ord-2',
    orderNumber: 'ORD-1717002-EFGH',
    type: 'DELIVERY',
    status: 'ACCEPTED',
    deliveryFee: 40,
    pickupDetails: 'شارع الهرم، الجيزة',
    deliveryDetails: 'مدينة نصر',
    courier: { name: 'خالد حسن', rating: 4.6, phone: '01098765432' },
    createdAt: new Date(Date.now() - 900000),
    rated: false,
  },
  {
    id: 'ord-3',
    orderNumber: 'ORD-1716003-IJKL',
    type: 'SHOPPING',
    status: 'PENDING',
    deliveryFee: 30,
    pickupDetails: 'كشري الحلوة - الهرم',
    deliveryDetails: 'المعادي',
    items: [{ name: 'كيلو كشري', quantity: 1 }],
    createdAt: new Date(Date.now() - 300000),
    rated: false,
  },
  {
    id: 'ord-4',
    orderNumber: 'ORD-1715004-MNOP',
    type: 'SHOPPING',
    status: 'DELIVERED',
    deliveryFee: 20,
    pickupDetails: 'بيتزا كينج - العباسية',
    deliveryDetails: 'شبرا',
    courier: { name: 'أحمد سمير', rating: 4.9, phone: '01234567890' },
    items: [{ name: 'بيتزا مارجريتا', quantity: 1 }],
    createdAt: new Date(Date.now() - 86400000),
    rated: true,
  },
  {
    id: 'ord-5',
    orderNumber: 'ORD-1714005-QRST',
    type: 'DELIVERY',
    status: 'CANCELLED',
    deliveryFee: 35,
    pickupDetails: 'مصر الجديدة',
    deliveryDetails: 'الزمالك',
    createdAt: new Date(Date.now() - 172800000),
    rated: false,
  },
]

const STATUS_MAP = {
  PENDING: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
  ACCEPTED: { label: 'المندوب في الطريق 🛵', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
  PICKED_UP: { label: 'تم الاستلام 📦', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-400' },
  DELIVERED: { label: 'تم التوصيل ✅', color: 'bg-green-100 text-green-700', dot: 'bg-green-400' },
  CANCELLED: { label: 'ملغي ❌', color: 'bg-red-100 text-red-700', dot: 'bg-red-400' },
}

export default function MyOrders() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<string>('ALL')
  const [ratingOrder, setRatingOrder] = useState<string | null>(null)
  const [rating, setRating] = useState(5)
  const [ratingNote, setRatingNote] = useState('')
  const [orders, setOrders] = useState(DEMO_ORDERS)

  const filtered = filter === 'ALL' ? orders : orders.filter(o => o.status === filter)

  function submitRating(orderId: string) {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, rated: true } : o))
    setRatingOrder(null)
    setRating(5)
    setRatingNote('')
    alert('شكراً على تقييمك! ⭐')
  }

  function timeAgo(date: Date) {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000)
    if (mins < 1) return 'الآن'
    if (mins < 60) return `منذ ${mins} دقيقة`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `منذ ${hours} ساعة`
    return `منذ ${Math.floor(hours / 24)} يوم`
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <Package className="text-orange-500" size={26} />
          طلباتي
        </h1>
        {user && <p className="text-gray-500 text-sm">مرحباً {user.name} 👋</p>}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {[
          { key: 'ALL', label: 'الكل' },
          { key: 'PENDING', label: 'في الانتظار' },
          { key: 'ACCEPTED', label: 'جاري' },
          { key: 'DELIVERED', label: 'مكتملة' },
          { key: 'CANCELLED', label: 'ملغية' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-bold transition-all ${filter === f.key ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-600'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Package size={56} className="mx-auto mb-3 text-gray-200" />
          <p className="text-gray-500 font-semibold">مفيش طلبات في هذه الفئة</p>
          <Link to="/order" className="mt-4 inline-block text-orange-500 font-bold">+ طلب جديد</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(order => {
            const statusInfo = STATUS_MAP[order.status]
            const isActive = order.status === 'ACCEPTED' || order.status === 'PICKED_UP'

            return (
              <div key={order.id} className={`card ${isActive ? 'border-2 border-blue-300' : ''}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.type === 'SHOPPING' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                      {order.type === 'SHOPPING' ? <ShoppingBag className="text-orange-500" size={18} /> : <Truck className="text-blue-500" size={18} />}
                    </div>
                    <div>
                      <div className="font-bold text-sm">{order.orderNumber}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} />
                        {timeAgo(order.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-black text-orange-600">{order.deliveryFee} ج</div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {order.items && order.items.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm">
                    {order.items.map((item, i) => (
                      <div key={i} className="text-gray-700">• {item.name} × {item.quantity}</div>
                    ))}
                  </div>
                )}

                {/* Route */}
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
                  <MapPin size={12} className="text-orange-400 flex-shrink-0" />
                  <span className="truncate">{order.pickupDetails}</span>
                  <span className="text-gray-300 mx-1">←</span>
                  <span className="truncate">{order.deliveryDetails}</span>
                </div>

                {/* Courier Info */}
                {order.courier && (
                  <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">🛵</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm">{order.courier.name}</div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star size={10} className="text-yellow-400 fill-yellow-400" />
                        {order.courier.rating.toFixed(1)}
                      </div>
                    </div>
                    <a href={`tel:${order.courier.phone}`}
                      className="bg-white border border-blue-200 text-blue-600 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-all">
                      📞 اتصال
                    </a>
                  </div>
                )}

                {/* Active Order Progress */}
                {isActive && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                      <span>تم الطلب</span>
                      <span>قبل المندوب</span>
                      <span>الاستلام</span>
                      <span>التوصيل</span>
                    </div>
                    <div className="flex gap-1">
                      {['PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'].map((s, i) => {
                        const steps = ['PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED']
                        const current = steps.indexOf(order.status)
                        return (
                          <div key={s} className={`h-2 flex-1 rounded-full ${i <= current ? 'bg-blue-500' : 'bg-gray-200'}`} />
                        )
                      })}
                    </div>
                    <Link to={`/track/${order.id}`}
                      className="mt-2 block text-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                      🗺️ تابع الطلب مباشرة
                    </Link>
                  </div>
                )}

                {/* Rate Button */}
                {order.status === 'DELIVERED' && !order.rated && (
                  <button onClick={() => setRatingOrder(order.id)}
                    className="w-full bg-yellow-50 border border-yellow-200 text-yellow-700 font-bold py-2.5 rounded-xl text-sm hover:bg-yellow-100 transition-all flex items-center justify-center gap-2">
                    <Star size={16} className="fill-yellow-500 text-yellow-500" />
                    قيّم المندوب
                  </button>
                )}
                {order.rated && (
                  <div className="text-center text-green-600 text-sm font-semibold">
                    ⭐ تم التقييم - شكراً!
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Rating Modal */}
      {ratingOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-xl font-black text-center">قيّم المندوب ⭐</h3>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s} onClick={() => setRating(s)}>
                  <Star size={36} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                </button>
              ))}
            </div>
            <textarea
              className="input resize-none h-20 text-sm"
              placeholder="تعليق اختياري..."
              value={ratingNote}
              onChange={e => setRatingNote(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => submitRating(ratingOrder)} className="flex-1 btn-primary">
                إرسال التقييم
              </button>
              <button onClick={() => setRatingOrder(null)} className="flex-1 btn-secondary">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Order FAB */}
      <div className="fixed bottom-20 left-4 md:bottom-8">
        <Link to="/order"
          className="w-14 h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95">
          <span className="text-2xl">+</span>
        </Link>
      </div>
    </div>
  )
}
