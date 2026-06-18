import { useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Plus, Eye, EyeOff, TrendingUp, Loader2, RefreshCw, Trash2, ImagePlus, X } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface AdOffer {
  id: string
  title: string
  description?: string
  image_url: string
  shop_name: string
  product_name: string
  product_price?: number
  is_active: boolean
  click_count: number
  start_date: string
  end_date: string
}

const today = new Date().toISOString().split('T')[0]
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

const EMPTY_AD = {
  title: '',
  description: '',
  image_url: '',
  shop_name: '',
  shop_address: 'القاهرة',
  shop_lat: 30.0444,
  shop_lng: 31.2357,
  product_name: '',
  product_price: 0,
  start_date: today,
  end_date: nextWeek,
}

export default function AdminAds() {
  const { token } = useAuth()
  const [ads, setAds] = useState<AdOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_AD)
  const [submitting, setSubmitting] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const loadAds = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/ads', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setAds(data.ads || [])
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || `فشل جلب الإعلانات (${res.status})`)
      }
    } catch {
      toast.error('مشكلة في الاتصال بالـ backend')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadAds() }, [loadAds])

  // رفع صورة الإعلان من الجهاز
  async function handleImageUpload(file: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('الصورة أكبر من 5MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('JPG أو PNG أو WebP بس')
      return
    }

    // عرض preview فوري
    const reader = new FileReader()
    reader.onload = e => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setImageUploading(true)
    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch('/api/upload/product', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.url) {
        setForm(prev => ({ ...prev, image_url: data.url }))
        toast.success('تم رفع الصورة ✅')
      } else {
        toast.error(data.error || `فشل رفع الصورة (${res.status})`)
        setImagePreview(null)
      }
    } catch {
      toast.error('مشكلة في رفع الصورة')
      setImagePreview(null)
    } finally {
      setImageUploading(false)
    }
  }

  function clearImage() {
    setImagePreview(null)
    setForm(prev => ({ ...prev, image_url: '' }))
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function createAd() {
    if (!form.title || form.title.length < 5) {
      toast.error('العنوان لازم يكون 5 حروف على الأقل')
      return
    }
    if (!form.shop_name || form.shop_name.length < 3) {
      toast.error('اسم المحل لازم يكون 3 حروف على الأقل')
      return
    }
    if (!form.product_name || form.product_name.length < 3) {
      toast.error('اسم المنتج لازم يكون 3 حروف على الأقل')
      return
    }
    if (!token) { toast.error('مش مسجل دخول'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/ads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          imageUrl: form.image_url || undefined,
          shopName: form.shop_name,
          shopAddress: form.shop_address || 'القاهرة',
          shopLat: form.shop_lat,
          shopLng: form.shop_lng,
          productName: form.product_name,
          productPrice: form.product_price || undefined,
          startDate: form.start_date,
          endDate: form.end_date,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAds(prev => [data.ad, ...prev])
        toast.success('تم نشر العرض! ✅')
        setShowForm(false)
        setForm(EMPTY_AD)
        setImagePreview(null)
      } else {
        // إظهار رسالة الخطأ الحقيقية
        const errMsg = data.error || `خطأ ${res.status}`
        const details = data.details ? JSON.stringify(data.details.fieldErrors) : ''
        toast.error(errMsg + (details ? ` — ${details}` : ''), { duration: 5000 })
        console.error('Create ad error:', res.status, data)
      }
    } catch (err) {
      toast.error('مشكلة في الاتصال')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  async function toggleAd(id: string, isActive: boolean) {
    if (!token) return
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (res.ok) {
        setAds(ads.map(a => a.id === id ? { ...a, is_active: !isActive } : a))
        toast.success(isActive ? 'تم إيقاف العرض' : 'تم تفعيل العرض')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || `فشل (${res.status})`)
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    }
  }

  async function deleteAd(id: string) {
    if (!token) return
    if (!confirm('هتحذف العرض ده؟')) return
    try {
      const res = await fetch(`/api/admin/ads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setAds(ads.filter(a => a.id !== id))
        toast.success('تم حذف العرض')
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || `فشل الحذف (${res.status})`)
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone className="text-orange-500" size={28} />
          <div>
            <h1 className="text-2xl font-black">إدارة العروض</h1>
            <p className="text-gray-500 text-sm">إعلانات المطاعم والمحلات</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={loadAds} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <RefreshCw size={18} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
          >
            <Plus size={16} />
            عرض جديد
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card border-2 border-orange-200 space-y-4">
          <h3 className="font-bold text-lg">إنشاء عرض جديد</h3>

          {/* صورة الإعلان */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">صورة الإعلان</label>
            <div className="flex gap-3 items-start">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="preview" className="w-24 h-24 rounded-xl object-cover border-2 border-orange-300" />
                  <button
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                  <ImagePlus size={24} className="text-gray-400" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                />
                <button
                  type="button"
                  disabled={imageUploading}
                  onClick={() => imageInputRef.current?.click()}
                  className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 w-full justify-center"
                >
                  {imageUploading ? (
                    <><Loader2 size={14} className="animate-spin" />جاري الرفع...</>
                  ) : (
                    <><ImagePlus size={14} />ارفع صورة من جهازك</>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">أو</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <input
                  className="input text-sm"
                  placeholder="رابط صورة https://..."
                  dir="ltr"
                  value={form.image_url}
                  onChange={e => {
                    setForm({ ...form, image_url: e.target.value })
                    if (e.target.value) setImagePreview(e.target.value)
                    else setImagePreview(null)
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">عنوان العرض * (5 حروف على الأقل)</label>
              <input className="input text-sm" placeholder="بيتزا مارجريتا بـ 89 جنيه بدل 120!" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المحل *</label>
              <input className="input text-sm" placeholder="بيتزا كينج" value={form.shop_name} onChange={e => setForm({ ...form, shop_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المنتج *</label>
              <input className="input text-sm" placeholder="بيتزا مارجريتا كبيرة" value={form.product_name} onChange={e => setForm({ ...form, product_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">سعر المنتج (جنيه)</label>
              <input type="number" className="input text-sm" placeholder="89" value={form.product_price || ''} onChange={e => setForm({ ...form, product_price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">عنوان المحل</label>
              <input className="input text-sm" placeholder="شارع التحرير، القاهرة" value={form.shop_address} onChange={e => setForm({ ...form, shop_address: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">تاريخ البداية</label>
              <input type="date" className="input text-sm" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">تاريخ النهاية</label>
              <input type="date" className="input text-sm" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">وصف (اختياري)</label>
              <textarea className="input text-sm resize-none h-16" placeholder="وصف إضافي للعرض..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3">
            <button disabled={submitting || imageUploading} onClick={createAd} className="btn-primary text-sm px-6 py-2 flex items-center gap-2">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {submitting ? 'جاري النشر...' : 'نشر العرض'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_AD); setImagePreview(null) }} className="btn-secondary text-sm px-6 py-2">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Ads List */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-32 bg-gray-100" />
        ))
      ) : ads.length === 0 ? (
        <div className="text-center py-12">
          <Megaphone size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">مفيش عروض لحد دلوقتي</p>
          <button onClick={() => setShowForm(true)} className="mt-4 text-orange-500 font-bold">
            أنشئ أول عرض
          </button>
        </div>
      ) : (
        ads.map(ad => (
          <div key={ad.id} className={`card overflow-hidden p-0 ${!ad.is_active ? 'opacity-60' : ''}`}>
            <div className="flex">
              <img
                src={ad.image_url || 'https://placehold.co/120x120/f97316/fff?text=Ad'}
                alt={ad.title}
                className="w-28 h-28 object-cover flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/120x120/f97316/fff?text=Ad' }}
              />
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-sm line-clamp-2 flex-1">{ad.title}</h3>
                  <div className="flex gap-1 mr-2">
                    <button
                      onClick={() => toggleAd(ad.id, ad.is_active)}
                      className={`p-1.5 rounded-lg transition-all ${ad.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      title={ad.is_active ? 'إيقاف' : 'تفعيل'}
                    >
                      {ad.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => deleteAd(ad.id)}
                      className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{ad.shop_name}</p>
                {ad.product_price && (
                  <p className="text-orange-500 font-bold text-sm mt-1">{ad.product_price} جنيه</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <TrendingUp size={12} />
                  <span>{ad.click_count} ضغطة</span>
                  <span className="mx-1">•</span>
                  <span className={ad.is_active ? 'text-green-500' : 'text-gray-400'}>
                    {ad.is_active ? '● مفعّل' : '○ موقوف'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
