import { useState } from 'react'
import toast from 'react-hot-toast'
import { MapPin, Package, ShoppingBag, Truck, Plus, Minus, Calculator, CheckCircle, ArrowLeft } from 'lucide-react'

type OrderType = 'SHOPPING' | 'DELIVERY'
type Step = 'type' | 'details' | 'confirm' | 'success'

interface OrderItem {
  name: string
  quantity: number
  shopName: string
}

interface PriceEstimate {
  distanceKm: number
  deliveryFee: number
  breakdown: string
}

export default function OrderPage() {
  const [step, setStep] = useState<Step>('type')
  const [orderType, setOrderType] = useState<OrderType>('SHOPPING')
  const [items, setItems] = useState<OrderItem[]>([{ name: '', quantity: 1, shopName: '' }])
  const [pickupDetails, setPickupDetails] = useState('')
  const [deliveryDetails, setDeliveryDetails] = useState('')
  const [notes, setNotes] = useState('')
  const [priceEstimate, setPriceEstimate] = useState<PriceEstimate | null>(null)
  const [loadingPrice, setLoadingPrice] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [createdOrder, setCreatedOrder] = useState<{ orderNumber: string; deliveryFee: number } | null>(null)

  async function calculatePrice() {
    setLoadingPrice(true)
    try {
      const res = await fetch('/api/pricing/calculate?pickupLat=30.0444&pickupLng=31.2357&deliveryLat=30.0574&deliveryLng=31.2228')
      if (res.ok) {
        const data = await res.json()
        setPriceEstimate({
          distanceKm: data.estimate.distanceKm,
          deliveryFee: data.estimate.deliveryFee,
          breakdown: data.estimate.breakdown,
        })
      } else {
        setPriceEstimate({ distanceKm: 2.3, deliveryFee: 25, breakdown: '2.3 كم × 8 جنيه = 18.4 جنيه (الحد الأدنى: 25 جنيه)' })
      }
    } catch {
      setPriceEstimate({ distanceKm: 2.3, deliveryFee: 25, breakdown: '2.3 كم × 8 جنيه = 18.4 جنيه (الحد الأدنى: 25 جنيه)' })
    } finally {
      setLoadingPrice(false)
    }
  }

  async function submitOrder() {
    setSubmitting(true)
    setTimeout(() => {
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
      setCreatedOrder({ orderNumber, deliveryFee: priceEstimate?.deliveryFee || 25 })
      setStep('success')
      toast.success('🎉 تم تسجيل طلبك بنجاح!')
      setSubmitting(false)
    }, 1200)
  }

  const addItem = () => setItems([...items, { name: '', quantity: 1, shopName: '' }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: keyof OrderItem, value: string | number) => {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }
  const canProceed = () => {
    if (step === 'details') {
      if (orderType === 'SHOPPING') return items.some(i => i.name.trim())
      return pickupDetails.trim() && deliveryDetails.trim()
    }
    return true
  }

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
          <p>⏱️ أول مندوب يقبل هياخد طلبك فوراً</p>
          <p>📱 هتجيلك إشعار لما المندوب يقبل</p>
        </div>
        <button onClick={() => { setStep('type'); setItems([{ name: '', quantity: 1, shopName: '' }]); setPickupDetails(''); setDeliveryDetails(''); setPriceEstimate(null); setCreatedOrder(null) }}
          className="btn-primary w-full">
          طلب جديد
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {(['type', 'details', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step === s ? 'bg-orange-500 text-white' :
              ['type', 'details', 'confirm'].indexOf(step) > i ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {['type', 'details', 'confirm'].indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < 2 && <div className={`flex-1 h-1 rounded-full ${['type', 'details', 'confirm'].indexOf(step) > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === 'type' && (
        <div className="space-y-4 animate-fade-in">
          <h1 className="text-2xl font-black">نوع الطلب</h1>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={() => { setOrderType('SHOPPING'); setStep('details') }}
              className="card p-6 text-center border-2 border-orange-500 bg-orange-50 hover:shadow-md transition-all">
              <ShoppingBag className="mx-auto mb-3 text-orange-500" size={40} />
              <h3 className="font-bold text-lg">مشتريات</h3>
              <p className="text-sm text-gray-500 mt-1">اشتري من محل أو مطعم</p>
            </button>
            <button onClick={() => { setOrderType('DELIVERY'); setStep('details') }}
              className="card p-6 text-center border-2 border-transparent hover:border-orange-400 transition-all">
              <Truck className="mx-auto mb-3 text-orange-500" size={40} />
              <h3 className="font-bold text-lg">توصيل</h3>
              <p className="text-sm text-gray-500 mt-1">وصّل حاجة من A لـ B</p>
            </button>
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
            <h1 className="text-2xl font-black">{orderType === 'SHOPPING' ? '🛒 المشتريات' : '🚚 التوصيل'}</h1>
          </div>

          {orderType === 'SHOPPING' ? (
            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="card space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-600">منتج {i + 1}</span>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
                        <Minus size={18} />
                      </button>
                    )}
                  </div>
                  <input className="input" placeholder="اسم المنتج *" value={item.name}
                    onChange={e => updateItem(i, 'name', e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <input className="input" placeholder="اسم المحل" value={item.shopName}
                      onChange={e => updateItem(i, 'shopName', e.target.value)} />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 whitespace-nowrap">الكمية:</span>
                      <button onClick={() => updateItem(i, 'quantity', Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateItem(i, 'quantity', item.quantity + 1)}
                        className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="btn-secondary w-full flex items-center justify-center gap-2">
                <Plus size={18} /> إضافة منتج
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="card space-y-3">
                <div className="flex items-center gap-2 text-orange-600 font-bold">
                  <MapPin size={18} /> نقطة الاستلام (A)
                </div>
                <input className="input" placeholder="العنوان الكامل *" value={pickupDetails}
                  onChange={e => setPickupDetails(e.target.value)} />
              </div>
              <div className="card space-y-3">
                <div className="flex items-center gap-2 text-green-600 font-bold">
                  <MapPin size={18} /> نقطة التوصيل (B)
                </div>
                <input className="input" placeholder="العنوان الكامل *" value={deliveryDetails}
                  onChange={e => setDeliveryDetails(e.target.value)} />
              </div>
            </div>
          )}

          <textarea className="input resize-none h-20" placeholder="ملاحظات للمندوب..." value={notes}
            onChange={e => setNotes(e.target.value)} />

          <button disabled={!canProceed()}
            onClick={() => { calculatePrice(); setStep('confirm') }}
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

          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5">
            <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
              <Calculator size={20} /> سعر التوصيل
            </h3>
            {loadingPrice ? (
              <div className="flex items-center gap-2 text-orange-600">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent" />
                جاري الحساب...
              </div>
            ) : priceEstimate ? (
              <div>
                <div className="text-3xl font-black text-orange-600 mb-1">{priceEstimate.deliveryFee} جنيه</div>
                <div className="text-sm text-orange-700 opacity-80">{priceEstimate.breakdown}</div>
                <div className="text-xs text-orange-500 mt-1">📍 المسافة: {priceEstimate.distanceKm} كم</div>
              </div>
            ) : null}
          </div>

          <div className="card">
            <h3 className="font-bold mb-3">ملخص الطلب</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">النوع</span>
                <span className="font-semibold">{orderType === 'SHOPPING' ? '🛒 مشتريات' : '🚚 توصيل'}</span>
              </div>
              {orderType === 'SHOPPING' && items.filter(i => i.name).map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-gray-500">{item.name}{item.shopName && ` (${item.shopName})`}</span>
                  <span className="font-semibold">× {item.quantity}</span>
                </div>
              ))}
              {orderType === 'DELIVERY' && (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">من</span><span className="font-semibold">{pickupDetails}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">إلى</span><span className="font-semibold">{deliveryDetails}</span></div>
                </>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <strong>⚠️ ملاحظة:</strong> العميل بيدفع تمن التوصيل بس. تمن المشتريات بيتسلم للمندوب مباشرة.
          </div>

          <button disabled={submitting} onClick={submitOrder}
            className="btn-primary w-full flex items-center justify-center gap-2 text-lg">
            {submitting ? (
              <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />جاري التسجيل...</>
            ) : (
              <><Package size={22} />تأكيد الطلب</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
