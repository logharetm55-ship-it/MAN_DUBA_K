import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Phone, Star, Clock, Package, CheckCircle, Truck } from 'lucide-react'

type Status = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED'

const STEPS: { key: Status; icon: string; label: string; desc: string }[] = [
  { key: 'PENDING', icon: '📋', label: 'تم الطلب', desc: 'طلبك بيظهر للمناديب' },
  { key: 'ACCEPTED', icon: '🛵', label: 'قبل المندوب', desc: 'المندوب في طريقه للاستلام' },
  { key: 'PICKED_UP', icon: '📦', label: 'تم الاستلام', desc: 'المندوب في طريقه إليك' },
  { key: 'DELIVERED', icon: '✅', label: 'تم التوصيل', desc: 'وصلك طلبك بنجاح!' },
]

const DEMO_ORDER = {
  id: 'ord-2',
  orderNumber: 'ORD-1717002-EFGH',
  type: 'DELIVERY' as const,
  status: 'ACCEPTED' as Status,
  deliveryFee: 40,
  pickupDetails: 'شارع الهرم، الجيزة',
  deliveryDetails: 'مدينة نصر',
  distanceKm: 4.7,
  estimatedMinutes: 28,
  courier: {
    name: 'خالد حسن',
    rating: 4.6,
    totalDeliveries: 89,
    phone: '01098765432',
    avatar: 'خ',
  },
}

export default function TrackOrder() {
  const { id } = useParams()
  const [currentStatus, setCurrentStatus] = useState<Status>('ACCEPTED')
  const [etaMinutes, setEtaMinutes] = useState(28)
  const [autoProgress, setAutoProgress] = useState(true)

  // Simulate order progress for demo
  useEffect(() => {
    if (!autoProgress) return
    const timers: ReturnType<typeof setTimeout>[] = []

    timers.push(setTimeout(() => {
      setCurrentStatus('PICKED_UP')
      setEtaMinutes(14)
    }, 8000))

    timers.push(setTimeout(() => {
      setCurrentStatus('DELIVERED')
      setEtaMinutes(0)
      setAutoProgress(false)
    }, 16000))

    return () => timers.forEach(clearTimeout)
  }, [])

  const currentStepIndex = STEPS.findIndex(s => s.key === currentStatus)
  const isDelivered = currentStatus === 'DELIVERED'

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Link to="/my-orders" className="p-2 hover:bg-gray-100 rounded-xl">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black">تتبع طلبك 📍</h1>
          <p className="text-xs text-gray-400">{DEMO_ORDER.orderNumber}</p>
        </div>
      </div>

      {/* Map Placeholder */}
      <div className="relative bg-gradient-to-br from-blue-100 via-green-50 to-green-100 rounded-3xl overflow-hidden h-56">
        {/* Fake Map */}
        <div className="absolute inset-0 opacity-30">
          <svg viewBox="0 0 400 230" className="w-full h-full">
            <line x1="0" y1="80" x2="400" y2="80" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="0" y1="160" x2="400" y2="160" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="100" y1="0" x2="100" y2="230" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="250" y1="0" x2="250" y2="230" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8,4" />
            <line x1="350" y1="0" x2="350" y2="230" stroke="#94a3b8" strokeWidth="2" strokeDasharray="8,4" />
            <rect x="60" y="50" width="60" height="40" rx="4" fill="#e2e8f0" />
            <rect x="160" y="90" width="80" height="30" rx="4" fill="#e2e8f0" />
            <rect x="270" y="40" width="50" height="60" rx="4" fill="#e2e8f0" />
          </svg>
        </div>
        {/* Route line */}
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Pickup */}
          <div className="absolute right-16 top-12">
            <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
              <MapPin className="text-white" size={18} />
            </div>
            <div className="bg-white rounded-lg px-2 py-1 text-xs font-bold mt-1 shadow-md text-center whitespace-nowrap">
              📍 من هنا
            </div>
          </div>
          {/* Delivery */}
          <div className="absolute left-16 bottom-12">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
              <Package className="text-white" size={18} />
            </div>
            <div className="bg-white rounded-lg px-2 py-1 text-xs font-bold mt-1 shadow-md text-center whitespace-nowrap">
              🏠 هنا تروح
            </div>
          </div>
          {/* Courier */}
          {!isDelivered && (
            <div className="animate-bounce">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-xl border-2 border-white text-xl">
                🛵
              </div>
            </div>
          )}
        </div>

        {/* ETA Badge */}
        {!isDelivered && (
          <div className="absolute top-3 left-3 bg-white rounded-xl px-3 py-2 shadow-lg">
            <div className="flex items-center gap-1.5 text-blue-600">
              <Clock size={14} />
              <span className="font-black text-lg">{etaMinutes}</span>
              <span className="text-xs font-semibold text-gray-500">دقيقة</span>
            </div>
          </div>
        )}
        {isDelivered && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <div className="bg-white rounded-2xl px-6 py-4 text-center shadow-xl">
              <div className="text-4xl mb-2">🎉</div>
              <div className="font-black text-green-600">تم التوصيل!</div>
            </div>
          </div>
        )}
      </div>

      {/* Progress Steps */}
      <div className="card">
        <div className="space-y-4">
          {STEPS.map((step, i) => {
            const done = i < currentStepIndex
            const active = i === currentStepIndex
            return (
              <div key={step.key} className={`flex items-start gap-4 ${i < STEPS.length - 1 ? 'pb-4 border-b border-gray-100' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg transition-all ${
                  done ? 'bg-green-100' : active ? 'bg-orange-100 ring-2 ring-orange-400 ring-offset-2' : 'bg-gray-100'
                }`}>
                  {done ? '✅' : step.icon}
                </div>
                <div className="flex-1 pt-1">
                  <div className={`font-bold text-sm ${active ? 'text-orange-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.label}
                    {active && <span className="mr-2 inline-block w-2 h-2 bg-orange-500 rounded-full animate-pulse" />}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{step.desc}</div>
                </div>
                {active && (
                  <div className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded-full">
                    الآن
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Courier Card */}
      <div className="card">
        <h3 className="font-bold mb-3 text-sm text-gray-500">مندوبك</h3>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center text-2xl font-black text-orange-600 flex-shrink-0">
            {DEMO_ORDER.courier.avatar}
          </div>
          <div className="flex-1">
            <div className="font-black text-lg">{DEMO_ORDER.courier.name}</div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star size={13} className="text-yellow-400 fill-yellow-400" />
                {DEMO_ORDER.courier.rating.toFixed(1)}
              </span>
              <span className="flex items-center gap-1">
                <Truck size={13} />
                {DEMO_ORDER.courier.totalDeliveries} توصيلة
              </span>
            </div>
          </div>
          <a href={`tel:${DEMO_ORDER.courier.phone}`}
            className="w-12 h-12 bg-green-100 hover:bg-green-200 rounded-2xl flex items-center justify-center transition-all">
            <Phone className="text-green-600" size={22} />
          </a>
        </div>
      </div>

      {/* Order Summary */}
      <div className="card">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">سعر التوصيل</span>
          <span className="font-black text-orange-600">{DEMO_ORDER.deliveryFee} جنيه</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-500">المسافة</span>
          <span className="font-semibold">{DEMO_ORDER.distanceKm} كم</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
          <MapPin size={11} className="text-orange-400" />
          {DEMO_ORDER.pickupDetails} → {DEMO_ORDER.deliveryDetails}
        </div>
      </div>

      {/* Rate after delivery */}
      {isDelivered && (
        <Link to="/my-orders" className="block btn-primary w-full text-center text-lg">
          ⭐ قيّم المندوب
        </Link>
      )}

      {/* Demo note */}
      <div className="text-center text-xs text-gray-400 pb-4">
        🎮 الطلب هيتقدم تلقائياً خلال ثواني للتجربة
      </div>
    </div>
  )
}
