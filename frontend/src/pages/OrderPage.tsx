// =============================================================
// Order Page - نوعان: مشتريات (4 محلات) وتوصيل (من مكان لمكان)
// + Ad Quick Order Mode: طلب سريع من إعلان
// =============================================================

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  MapPin, Package, ShoppingBag, Truck, Plus, Minus,
  Calculator, CheckCircle, ArrowLeft, Phone, Trash2,
  ChevronDown, ChevronUp, Store, Tag, Star
} from 'lucide-react'
import { useAuth } from '../lib/auth-context'

type OrderType = 'SHOPPING' | 'DELIVERY'
type Step = 'type' | 'details' | 'confirm' | 'success'

interface ShopGroup {
  shopName: string
  shopAddress: string
  items: { name: string; quantity: number; price?: string }[]
}

interface PriceEstimate {
  fee: number
  breakdown: string
  type: 'shopping' | 'delivery'
  numShops?: number
  distanceKm?: number
}

interface AdOffer {
  id: string
  title: string
  description?: string
  image_url: string
  shop_name: string
  shop_address: string
  shop_lat: number
  shop_lng: number
  product_name: string
  product_price?: number
}

const API = '/api'

export default function OrderPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // استلام بيانات الإعلان من الصفحة الرئيسية
  const adOffer = (location.state as { adOffer?: AdOffer } | null)?.adOffer ?? null

  const [step, setStep] = useState<Step>('type')
  const [orderType, setOrderType] = useState<OrderType>('SHOPPING')
  const [submitting, setSubmitting] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ orderNumber: string; deliveryFee: number } | null>(null)

  // SHOPPING fields - up to 4 shops
  const [shops, setShops] = useState<ShopGroup[]>([
    { shopName: '', shopAddress: '', items: [{ name: '', quantity: 1 }] }
  ])
  const [clientAddress, setClientAddress] = useState(user?.address || '')
  const [shoppingNotes, setShoppingNotes] = useState('')

  // DELIVERY fields
  const [pickupAddress, setPickupAddress] = useState(user?.address || '')
  const [pickupPhone, setPickupPhone] = useState(user?.phone || '')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')

  // Price estimation
  const [priceEst, setPriceEst] = useState<PriceEstimate | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)

  // Ad Quick Order state
  const [adQuantity, setAdQuantity] = useState(1)
  const [adClientAddress, setAdClientAddress] = useState(user?.address || '')
  const [adNotes, setAdNotes] = useState('')
  const [adPriceEst, setAdPriceEst] = useState<PriceEstimate | null>(null)
  const [adLoadingPrice, setAdLoadingPrice] = useState(false)
  const [adStep, setAdStep] = useState<'confirm' | 'success'>('confirm')

  useEffect(() => {
    if (adOffer) {
      estimateAdPrice()
    }
  }, [adOffer])

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <Package size={48} className="mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-bold mb-2">سجّل دخول الأول</h2>
        <button onClick={() => navigate('/login')} className="btn-primary mt-4">
          دخول / تسجيل
        </button>
      </div>
    )
  }

  // =====================
  // Ad Quick Order Logic
  // =====================
  async function estimateAdPrice() {
    if (!adOffer) return
    setAdLoadingPrice(true)
    try {
      const res = await fetch(`${API}/pricing/calculate?pickupLat=${adOffer.shop_lat}&pickupLng=${adOffer.shop_lng}&deliveryLat=${adOffer.shop_lat}&deliveryLng=${adOffer.shop_lng}&numShops=1&type=SHOPPING`)
      if (res.ok) {
        const data = await res.json()
        const est = data.estimate
        setAdPriceEst({
          fee: est.deliveryFee || est.finalFee || 15,
          breakdown: est.breakdown || `توصيل من ${adOffer.shop_name}`,
          type: 'shopping',
          numShops: 1,
        })
      } else {
        setAdPriceEst({ fee: 15, breakdown: 'تقدير مبدئي', type: 'shopping', numShops: 1 })
      }
    } catch {
      setAdPriceEst({ fee: 15, breakdown: 'تقدير مبدئي', type: 'shopping', numShops: 1 })
    } finally {
      setAdLoadingPrice(false)
    }
  }

  async function submitAdOrder() {
    if (!adOffer) return
    if (!adClientAddress.trim()) {
      toast.error('اكتب عنوانك عشان نوصّللك')
      return
    }
    if (!token) { toast.error('سجّل دخول الأول'); navigate('/login'); return }

    setSubmitting(true)
    try {
      const body = {
        type: 'SHOPPING',
        shops: [{
          shopName: adOffer.shop_name,
          shopAddress: adOffer.shop_address,
          items: [{
            name: adOffer.product_name,
            quantity: adQuantity,
            price: adOffer.product_price,
          }],
        }],
        pickupLat: adOffer.shop_lat,
        pickupLng: adOffer.shop_lng,
        clientAddress: adClientAddress.trim(),
        adId: adOffer.id,
        notes: adNotes || undefined,
      }

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'فشل تسجيل الطلب')
        return
      }

      setCreatedOrder({
        orderNumber: data.order.order_number,
        deliveryFee: data.order.delivery_fee,
      })
      setAdStep('success')
      toast.success('🎉 تم تسجيل طلبك بنجاح!')
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
    } finally {
      setSubmitting(false)
    }
  }

  // =====================
  // Ad Quick Order UI
  // =====================
  if (adOffer) {
    if (adStep === 'success' && createdOrder) {
      return (
        <div className="max-w-md mx-auto text-center py-12">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <h1 className="text-2xl font-black mb-2">تم تسجيل طلبك! 🎉</h1>
          <p className="text-gray-500 mb-2">رقم الطلب: <span className="font-bold text-gray-900">{createdOrder.orderNumber}</span></p>
          <p className="text-gray-500 mb-8">سعر التوصيل: <span className="font-bold text-orange-600">{createdOrder.deliveryFee} جنيه</span></p>
          <div className="card mb-6 text-right space-y-2 text-sm text-gray-600">
            <p>✅ طلبك ظهر لكل المناديب المتاحين</p>
            <p>⚡ أول مندوب يقبل هياخد طلبك فوراً</p>
            <p>📱 هتجيلك إشعار لما المندوب يقبل</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate('/my-orders')} className="flex-1 btn-secondary">طلباتي</button>
            <button onClick={() => navigate('/')} className="flex-1 btn-primary">الرئيسية</button>
          </div>
        </div>
      )
    }

    const totalProductPrice = (adOffer.product_price || 0) * adQuantity

    return (
      <div className="max-w-md mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-xl">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-black">اطلب دلوقتي</h1>
        </div>

        {/* Ad Card */}
        <div className="card overflow-hidden p-0">
          <img
            src={adOffer.image_url}
            alt={adOffer.title}
            className="w-full h-48 object-cover"
            onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x200/f97316/fff?text=عرض' }}
          />
          <div className="p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-gray-900 text-lg leading-tight">{adOffer.title}</h2>
              {adOffer.product_price && (
                <span className="bg-orange-500 text-white font-black px-3 py-1 rounded-xl text-sm whitespace-nowrap">
                  {adOffer.product_price} جنيه
                </span>
              )}
            </div>
            {adOffer.description && (
              <p className="text-gray-500 text-sm mt-1">{adOffer.description}</p>
            )}
            <div className="flex items-center gap-1 text-gray-500 text-sm mt-2">
              <MapPin size={14} />
              <span>{adOffer.shop_name} — {adOffer.shop_address}</span>
            </div>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="card">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <ShoppingBag size={18} className="text-orange-500" />
            {adOffer.product_name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm">الكمية</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setAdQuantity(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors font-bold"
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-black w-8 text-center">{adQuantity}</span>
              <button
                onClick={() => setAdQuantity(q => Math.min(20, q + 1))}
                className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition-colors font-bold"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
          {adOffer.product_price && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm">
              <span className="text-gray-500">إجمالي المنتجات</span>
              <span className="font-bold">{totalProductPrice} جنيه</span>
            </div>
          )}
        </div>

        {/* Client Address */}
        <div className="card space-y-3">
          <h3 className="font-bold flex items-center gap-2">
            <MapPin size={18} className="text-green-500" />
            عنوانك (مكان التسليم)
          </h3>
          <input
            className="input"
            placeholder="اكتب عنوانك الكامل..."
            value={adClientAddress}
            onChange={e => setAdClientAddress(e.target.value)}
            dir="rtl"
          />
          <textarea
            className="input resize-none h-16"
            placeholder="ملاحظات للمندوب... (اختياري)"
            value={adNotes}
            onChange={e => setAdNotes(e.target.value)}
          />
        </div>

        {/* Price Estimate */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
          <h3 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
            <Calculator size={18} /> سعر التوصيل
          </h3>
          {adLoadingPrice ? (
            <div className="flex items-center gap-2 text-orange-600 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent" />
              جاري الحساب...
            </div>
          ) : adPriceEst ? (
            <div>
              <div className="text-3xl font-black text-orange-600">{adPriceEst.fee} جنيه</div>
              <div className="text-xs text-orange-600 mt-1">{adPriceEst.breakdown}</div>
              {adOffer.product_price && (
                <div className="text-xs text-gray-500 mt-2">
                  💡 تمن المنتجات ({totalProductPrice} جنيه) بتتسلم للمندوب مباشرة
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Confirm Button */}
        <button
          disabled={submitting || !adClientAddress.trim()}
          onClick={submitAdOrder}
          className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4 disabled:opacity-50"
        >
          {submitting ? (
            <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />جاري التسجيل...</>
          ) : (
            <><CheckCircle size={22} />تأكيد الطلب</>
          )}
        </button>
      </div>
    )
  }

  // =====================
  // Shops helpers
  // =====================
  function addShop() {
    if (shops.length >= 4) { toast.error('أقصى عدد محلات في أوردر واحد هو 4'); return }
    setShops([...shops, { shopName: '', shopAddress: '', items: [{ name: '', quantity: 1 }] }])
  }
  function removeShop(si: number) {
    if (shops.length === 1) { toast.error('لازم محل واحد على الأقل'); return }
    setShops(shops.filter((_, i) => i !== si))
  }
  function updateShop(si: number, field: 'shopName' | 'shopAddress', val: string) {
    setShops(shops.map((s, i) => i === si ? { ...s, [field]: val } : s))
  }
  function addItem(si: number) {
    setShops(shops.map((s, i) => i === si ? { ...s, items: [...s.items, { name: '', quantity: 1 }] } : s))
  }
  function removeItem(si: number, ii: number) {
    setShops(shops.map((s, i) => i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s))
  }
  function updateItem(si: number, ii: number, field: 'name' | 'quantity' | 'price', val: string | number) {
    setShops(shops.map((s, i) => i === si ? {
      ...s,
      items: s.items.map((it, j) => j === ii ? { ...it, [field]: val } : it)
    } : s))
  }

  // =====================
  // Price Estimation
  // =====================
  async function estimatePrice() {
    setLoadingPrice(true)
    setPriceEst(null)
    try {
      if (orderType === 'SHOPPING') {
        const validShops = shops.filter(s => s.shopName.trim() && s.items.some(it => it.name.trim()))
        const numShops = validShops.length || 1
        const res = await fetch(`${API}/pricing/calculate?pickupLat=30.0444&pickupLng=31.2357&deliveryLat=30.0574&deliveryLng=31.2228&numShops=${numShops}&type=SHOPPING`)
        if (res.ok) {
          const data = await res.json()
          const est = data.estimate
          setPriceEst({
            fee: est.deliveryFee || est.finalFee || 25,
            breakdown: est.breakdown || `${numShops} محل — ${est.deliveryFee || 25} جنيه`,
            type: 'shopping',
            numShops,
          })
        } else {
          const fee = 15 + (numShops - 1) * 5
          setPriceEst({
            fee,
            breakdown: `15 جنيه أساسي + ${numShops - 1} محل إضافي × 5 جنيه = ${fee} جنيه`,
            type: 'shopping',
            numShops,
          })
        }
      } else {
        const res = await fetch(`${API}/pricing/calculate?pickupLat=30.0444&pickupLng=31.2357&deliveryLat=30.0574&deliveryLng=31.2228`)
        if (res.ok) {
          const data = await res.json()
          const est = data.estimate
          setPriceEst({
            fee: est.deliveryFee || 25,
            breakdown: est.breakdown || `تقدير المسافة: ${est.deliveryFee || 25} جنيه`,
            type: 'delivery',
            distanceKm: est.distanceKm,
          })
        } else {
          setPriceEst({ fee: 25, breakdown: 'تقدير مبدئي بناءً على المنطقة', type: 'delivery' })
        }
      }
    } catch {
      if (orderType === 'SHOPPING') {
        const numShops = shops.filter(s => s.shopName.trim()).length || 1
        const fee = 15 + (numShops - 1) * 5
        setPriceEst({ fee, breakdown: `${numShops} محل — ${fee} جنيه`, type: 'shopping', numShops })
      } else {
        setPriceEst({ fee: 25, breakdown: 'تقدير مبدئي', type: 'delivery' })
      }
    } finally {
      setLoadingPrice(false)
    }
  }

  // =====================
  // Validation
  // =====================
  function validateShopping(): boolean {
    const validShops = shops.filter(s => s.shopName.trim() && s.items.some(it => it.name.trim()))
    if (validShops.length === 0) {
      toast.error('اكتب اسم محل واحد على الأقل وحاجة هتطلبها')
      return false
    }
    return true
  }

  function validateDelivery(): boolean {
    if (!pickupAddress.trim()) { toast.error('اكتب عنوان الاستلام'); return false }
    if (!/^01[0-9]{9}$/.test(pickupPhone.replace(/\D/g, ''))) { toast.error('رقم تليفون الاستلام غلط'); return false }
    if (!deliveryAddress.trim()) { toast.error('اكتب عنوان التسليم'); return false }
    if (!/^01[0-9]{9}$/.test(deliveryPhone.replace(/\D/g, ''))) { toast.error('رقم تليفون المستلم غلط'); return false }
    return true
  }

  // =====================
  // Submit Order
  // =====================
  async function submitOrder() {
    if (!token) { toast.error('سجّل دخول الأول'); navigate('/login'); return }
    setSubmitting(true)

    try {
      let body: unknown
      if (orderType === 'SHOPPING') {
        const validShops = shops
          .filter(s => s.shopName.trim() && s.items.some(it => it.name.trim()))
          .map(s => ({
            shopName: s.shopName.trim(),
            shopAddress: s.shopAddress.trim(),
            items: s.items
              .filter(it => it.name.trim())
              .map(it => ({
                name: it.name.trim(),
                quantity: it.quantity,
                price: it.price ? parseFloat(it.price) : undefined,
              })),
          }))
        body = {
          type: 'SHOPPING',
          shops: validShops,
          pickupLat: 30.0444,
          pickupLng: 31.2357,
          notes: shoppingNotes || undefined,
          clientAddress: clientAddress.trim() || undefined,
        }
      } else {
        body = {
          type: 'DELIVERY',
          pickupAddress: pickupAddress.trim(),
          pickupPhone: pickupPhone.replace(/\D/g, ''),
          deliveryAddress: deliveryAddress.trim(),
          deliveryPhone: deliveryPhone.replace(/\D/g, ''),
          pickupLat: 30.0444,
          pickupLng: 31.2357,
          deliveryLat: 30.0574,
          deliveryLng: 31.2228,
          notes: deliveryNotes || undefined,
        }
      }

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'فشل تسجيل الطلب')
        return
      }

      setCreatedOrder({
        orderNumber: data.order.order_number,
        deliveryFee: data.order.delivery_fee,
      })
      setStep('success')
      toast.success('🎉 تم تسجيل طلبك بنجاح!')
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
    } finally {
      setSubmitting(false)
    }
  }

  // =====================
  // Success Screen
  // =====================
  if (step === 'success' && createdOrder) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="text-green-500" size={48} />
        </div>
        <h1 className="text-2xl font-black mb-2">تم تسجيل طلبك! 🎉</h1>
        <p className="text-gray-500 mb-2">رقم الطلب: <span className="font-bold text-gray-900">{createdOrder.orderNumber}</span></p>
        <p className="text-gray-500 mb-8">سعر التوصيل: <span className="font-bold text-orange-600">{createdOrder.deliveryFee} جنيه</span></p>
        <div className="card mb-6 text-right space-y-2 text-sm text-gray-600">
          <p>✅ طلبك ظهر لكل المناديب المتاحين</p>
          <p>⚡ أول مندوب يقبل هياخد طلبك فوراً</p>
          <p>📱 هتجيلك إشعار لما المندوب يقبل</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => navigate('/my-orders')} className="flex-1 btn-secondary">
            طلباتي
          </button>
          <button onClick={() => {
            setStep('type')
            setShops([{ shopName: '', shopAddress: '', items: [{ name: '', quantity: 1 }] }])
            setPickupAddress(user?.address || '')
            setDeliveryAddress('')
            setPickupPhone(user?.phone || '')
            setDeliveryPhone('')
            setPriceEst(null)
            setCreatedOrder(null)
          }} className="flex-1 btn-primary">
            طلب جديد
          </button>
        </div>
      </div>
    )
  }

  // =====================
  // Progress Bar
  // =====================
  const steps = ['type', 'details', 'confirm']
  const stepIdx = steps.indexOf(step)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              stepIdx === i ? 'bg-orange-500 text-white' :
              stepIdx > i ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {stepIdx > i ? '✓' : i + 1}
            </div>
            {i < 2 && <div className={`flex-1 h-1 rounded-full ${stepIdx > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === 'type' && (
        <div className="space-y-4 animate-fade-in">
          <h1 className="text-2xl font-black">نوع الطلب</h1>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setOrderType('SHOPPING'); setStep('details') }}
              className="card p-6 text-center border-2 border-orange-400 bg-orange-50 hover:shadow-md transition-all">
              <ShoppingBag className="mx-auto mb-3 text-orange-500" size={40} />
              <h3 className="font-bold text-lg">مشتريات 🛒</h3>
              <p className="text-sm text-gray-500 mt-1">اشتري من محلات (حتى 4 محلات)</p>
            </button>
            <button onClick={() => { setOrderType('DELIVERY'); setStep('details') }}
              className="card p-6 text-center border-2 border-blue-300 bg-blue-50 hover:shadow-md transition-all">
              <Truck className="mx-auto mb-3 text-blue-500" size={40} />
              <h3 className="font-bold text-lg">توصيل 🚚</h3>
              <p className="text-sm text-gray-500 mt-1">وصّل حاجة من مكان لمكان</p>
            </button>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-800 text-right">
            <strong>💡 مشتريات:</strong> التسعير بعدد المحلات | <strong>توصيل:</strong> التسعير بالمسافة
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 'details' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('type')} className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-black">
              {orderType === 'SHOPPING' ? '🛒 المشتريات' : '🚚 توصيل'}
            </h1>
          </div>

          {/* ===== SHOPPING ===== */}
          {orderType === 'SHOPPING' && (
            <div className="space-y-4">
              {/* عنوان العميل */}
              <div className="card">
                <label className="block text-sm font-bold text-gray-700 mb-2 text-right">📍 عنوانك (مكان الاستلام)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input className="input pr-9" value={clientAddress}
                    onChange={e => setClientAddress(e.target.value)}
                    placeholder="عنوانك الحالي..." dir="rtl" />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-right">ده عنوانك الافتراضي، تقدر تعدله</p>
              </div>

              {/* المحلات */}
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800">المحلات ({shops.length}/4)</h2>
                {shops.length < 4 && (
                  <button onClick={addShop}
                    className="flex items-center gap-1 text-orange-600 font-bold text-sm hover:text-orange-700">
                    <Plus size={16} /> محل جديد
                  </button>
                )}
              </div>

              {shops.map((shop, si) => (
                <ShopCard key={si} shop={shop} shopIndex={si} total={shops.length}
                  onUpdate={(field, val) => updateShop(si, field, val)}
                  onRemove={() => removeShop(si)}
                  onAddItem={() => addItem(si)}
                  onRemoveItem={(ii) => removeItem(si, ii)}
                  onUpdateItem={(ii, field, val) => updateItem(si, ii, field, val)}
                />
              ))}

              <textarea className="input resize-none h-16" placeholder="ملاحظات للمندوب..."
                value={shoppingNotes} onChange={e => setShoppingNotes(e.target.value)} />
            </div>
          )}

          {/* ===== DELIVERY ===== */}
          {orderType === 'DELIVERY' && (
            <div className="space-y-4">
              <div className="card space-y-3">
                <h3 className="font-bold text-orange-600 flex items-center gap-2"><MapPin size={18} /> نقطة الاستلام (A)</h3>
                <div className="relative">
                  <MapPin size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input className="input pr-9" placeholder="العنوان الكامل لمكان الاستلام *"
                    value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} dir="rtl" required />
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input className="input pr-9" placeholder="رقم تليفون صاحب الشيء *"
                    value={pickupPhone} onChange={e => setPickupPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={11} dir="ltr" required />
                </div>
                <p className="text-xs text-gray-400 text-right">📞 المندوب هيتصل بيه عند الاستلام</p>
              </div>

              <div className="card space-y-3">
                <h3 className="font-bold text-green-600 flex items-center gap-2"><MapPin size={18} /> نقطة التسليم (B)</h3>
                <div className="relative">
                  <MapPin size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input className="input pr-9" placeholder="العنوان الكامل لمكان التسليم *"
                    value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} dir="rtl" required />
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute right-3 top-3 text-gray-400" />
                  <input className="input pr-9" placeholder="رقم تليفون المستلم *"
                    value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value.replace(/[^0-9]/g, ''))}
                    maxLength={11} dir="ltr" required />
                </div>
                <p className="text-xs text-gray-400 text-right">📞 المندوب هيتصل بيه عند التسليم</p>
              </div>

              <textarea className="input resize-none h-16" placeholder="ملاحظات للمندوب..."
                value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} />
            </div>
          )}

          <button
            onClick={() => {
              if (orderType === 'SHOPPING' ? validateShopping() : validateDelivery()) {
                estimatePrice()
                setStep('confirm')
              }
            }}
            className="btn-primary w-full flex items-center justify-center gap-2">
            <Calculator size={20} /> احسب السعر وكمّل
          </button>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('details')} className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-black">تأكيد الطلب</h1>
          </div>

          {/* السعر */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5">
            <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
              <Calculator size={20} /> سعر التوصيل
            </h3>
            {loadingPrice ? (
              <div className="flex items-center gap-2 text-orange-600">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
                جاري الحساب...
              </div>
            ) : priceEst ? (
              <div>
                <div className="text-3xl font-black text-orange-600 mb-1">{priceEst.fee} جنيه</div>
                <div className="text-sm text-orange-700 opacity-80">{priceEst.breakdown}</div>
                {priceEst.type === 'shopping' && priceEst.numShops && (
                  <div className="text-xs text-orange-500 mt-1">🏪 عدد المحلات: {priceEst.numShops}</div>
                )}
                {priceEst.type === 'delivery' && priceEst.distanceKm && (
                  <div className="text-xs text-orange-500 mt-1">📍 المسافة التقريبية: {priceEst.distanceKm} كم</div>
                )}
              </div>
            ) : (
              <div className="text-orange-600">جاري حساب السعر...</div>
            )}
          </div>

          {/* ملخص */}
          <div className="card">
            <h3 className="font-bold mb-3">ملخص الطلب</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">النوع</span>
                <span className="font-semibold">{orderType === 'SHOPPING' ? '🛒 مشتريات' : '🚚 توصيل'}</span>
              </div>
              {orderType === 'SHOPPING' && (
                <>
                  {shops.filter(s => s.shopName.trim()).map((shop, i) => (
                    <div key={i} className="bg-orange-50 rounded-lg p-2">
                      <div className="font-semibold text-orange-700">{shop.shopName}</div>
                      {shop.items.filter(it => it.name.trim()).map((it, j) => (
                        <div key={j} className="text-gray-500 text-xs mt-0.5">• {it.name} × {it.quantity}</div>
                      ))}
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-gray-500">عنوانك</span>
                    <span className="font-semibold text-right">{clientAddress || 'غير محدد'}</span>
                  </div>
                </>
              )}
              {orderType === 'DELIVERY' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">الاستلام من</span>
                    <span className="font-semibold text-right max-w-[60%]">{pickupAddress} ({pickupPhone})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">التسليم لـ</span>
                    <span className="font-semibold text-right max-w-[60%]">{deliveryAddress} ({deliveryPhone})</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <strong>⚠️ ملاحظة:</strong> العميل بيدفع سعر التوصيل بس. تمن المشتريات بيتسلم للمندوب مباشرة.
          </div>

          <button disabled={submitting || loadingPrice} onClick={submitOrder}
            className="btn-primary w-full flex items-center justify-center gap-2 text-lg">
            {submitting ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />جاري التسجيل...</>
            ) : (
              <><CheckCircle size={22} />أكّد الطلب</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// =====================
// ShopCard Component
// =====================
interface ShopCardProps {
  shop: ShopGroup
  shopIndex: number
  total: number
  onUpdate: (field: 'shopName' | 'shopAddress', val: string) => void
  onRemove: () => void
  onAddItem: () => void
  onRemoveItem: (ii: number) => void
  onUpdateItem: (ii: number, field: 'name' | 'quantity' | 'price', val: string | number) => void
}

function ShopCard({ shop, shopIndex, total, onUpdate, onRemove, onAddItem, onRemoveItem, onUpdateItem }: ShopCardProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="card border-2 border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-orange-100 rounded-xl flex items-center justify-center">
            <Store size={16} className="text-orange-600" />
          </div>
          <span className="font-bold text-sm">محل {shopIndex + 1}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
          {total > 1 && (
            <button onClick={onRemove}
              className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="space-y-2 mb-3">
            <input className="input text-sm" placeholder="اسم المحل *"
              value={shop.shopName} onChange={e => onUpdate('shopName', e.target.value)} dir="rtl" />
            <input className="input text-sm" placeholder="عنوان المحل (اختياري)"
              value={shop.shopAddress} onChange={e => onUpdate('shopAddress', e.target.value)} dir="rtl" />
          </div>

          <div className="space-y-2">
            {shop.items.map((item, ii) => (
              <div key={ii} className="flex gap-2 items-start">
                <input className="input text-sm flex-1" placeholder="اسم المنتج *"
                  value={item.name} onChange={e => onUpdateItem(ii, 'name', e.target.value)} dir="rtl" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onUpdateItem(ii, 'quantity', Math.max(1, item.quantity - 1))}
                    className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 font-bold">
                    <Minus size={12} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => onUpdateItem(ii, 'quantity', Math.min(50, item.quantity + 1))}
                    className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 font-bold">
                    <Plus size={12} />
                  </button>
                </div>
                {shop.items.length > 1 && (
                  <button onClick={() => onRemoveItem(ii)}
                    className="w-7 h-7 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button onClick={onAddItem}
            className="mt-2 flex items-center gap-1 text-orange-600 text-xs font-bold hover:text-orange-700">
            <Plus size={12} /> إضافة منتج
          </button>
        </>
      )}
    </div>
  )
}
