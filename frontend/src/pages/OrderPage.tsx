// =============================================================
// Order Page - نوعان: مشتريات (4 محلات) وتوصيل (من مكان لمكان)
// =============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  MapPin, Package, ShoppingBag, Truck, Plus, Minus,
  Calculator, CheckCircle, ArrowLeft, Phone, Trash2,
  ChevronDown, ChevronUp, Store
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

const API = '/api'

export default function OrderPage() {
  const { user, token } = useAuth()
  const navigate = useNavigate()
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
        // Call pricing API with Cairo center coords
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
          // Fallback: base 15 + (shops-1)*5
          const fee = 15 + (numShops - 1) * 5
          setPriceEst({
            fee,
            breakdown: `15 جنيه أساسي + ${numShops - 1} محل إضافي × 5 جنيه = ${fee} جنيه`,
            type: 'shopping',
            numShops,
          })
        }
      } else {
        // DELIVERY - use Cairo coords as estimate
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
            {submitting
              ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />جاري التسجيل...</>
              : <><Package size={22} />تأكيد الطلب</>
            }
          </button>
        </div>
      )}
    </div>
  )
}

// =====================
// Shop Card Component
// =====================
function ShopCard({ shop, shopIndex, total, onUpdate, onRemove, onAddItem, onRemoveItem, onUpdateItem }: {
  shop: ShopGroup
  shopIndex: number
  total: number
  onUpdate: (field: 'shopName' | 'shopAddress', val: string) => void
  onRemove: () => void
  onAddItem: () => void
  onRemoveItem: (ii: number) => void
  onUpdateItem: (ii: number, field: 'name' | 'quantity' | 'price', val: string | number) => void
}) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="card border-2 border-orange-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">
            {shopIndex + 1}
          </div>
          <Store size={16} className="text-orange-500" />
          <span className="font-bold text-sm">محل {shopIndex + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {total > 1 && (
            <button onClick={onRemove} className="text-red-400 hover:text-red-600">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <input className="input" placeholder="اسم المحل *" value={shop.shopName}
            onChange={e => onUpdate('shopName', e.target.value)} dir="rtl" />
          <input className="input" placeholder="عنوان المحل (اختياري)" value={shop.shopAddress}
            onChange={e => onUpdate('shopAddress', e.target.value)} dir="rtl" />

          <div className="space-y-2">
            {shop.items.map((item, ii) => (
              <div key={ii} className="flex items-center gap-2">
                <input className="input flex-1" placeholder={`حاجة ${ii + 1} *`} value={item.name}
                  onChange={e => onUpdateItem(ii, 'name', e.target.value)} dir="rtl" />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => onUpdateItem(ii, 'quantity', Math.max(1, item.quantity - 1))}
                    className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                  <button onClick={() => onUpdateItem(ii, 'quantity', item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200">
                    <Plus size={13} />
                  </button>
                </div>
                {shop.items.length > 1 && (
                  <button onClick={() => onRemoveItem(ii)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                    <Minus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button onClick={onAddItem}
            className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 font-semibold">
            <Plus size={14} /> إضافة حاجة من نفس المحل
          </button>
        </div>
      )}
    </div>
  )
}
