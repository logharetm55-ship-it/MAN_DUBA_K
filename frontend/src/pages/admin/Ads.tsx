import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Plus, Eye, EyeOff, TrendingUp, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

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
  is_active: boolean
  click_count: number
  start_date: string
  end_date: string
}

const EMPTY_AD = {
  title: '',
  description: '',
  image_url: '',
  shop_name: '',
  shop_address: '',
  shop_lat: 30.0444,
  shop_lng: 31.2357,
  product_name: '',
  product_price: 0,
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
}

export default function AdminAds() {
  const { token } = useAuth()
  const [ads, setAds] = useState<AdOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_AD)
  const [submitting, setSubmitting] = useState(false)

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
        toast.error('مقدرناش نجيب الإعلانات')
      }
    } catch {
      toast.error('مشكلة في الاتصال بالـ backend')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadAds() }, [loadAds])

  async function createAd() {
    if (!form.title || !form.shop_name || !form.product_name || !form.shop_address) {
      toast.error('ملء البيانات المطلوبة (*)')
      return
    }
    if (!token) return
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
          imageUrl: form.image_url || 'https://placehold.co/400x250/f97316/white?text=عرض',
          shopName: form.shop_name,
          shopAddress: form.shop_address,
          shopLat: form.shop_lat,
          shopLng: form.shop_lng,
          productName: form.product_name,
          productPrice: form.product_price || undefined,
          startDate: new Date(form.start_date).toISOString(),
          endDate: new Date(form.end_date).toISOString(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAds(prev => [data.ad, ...prev])
        toast.success('تم نشر العرض! ✅')
        setShowForm(false)
        setForm(EMPTY_AD)
      } else {
        toast.error(data.error || 'فشل نشر العرض')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
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
        toast.error('فشل تحديث العرض')
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
        toast.error('فشل حذف العرض')
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

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">عنوان العرض *</label>
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
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">عنوان المحل *</label>
              <input className="input text-sm" placeholder="شارع التحرير، القاهرة" value={form.shop_address} onChange={e => setForm({ ...form, shop_address: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">سعر المنتج (جنيه)</label>
              <input type="number" className="input text-sm" value={form.product_price || ''} onChange={e => setForm({ ...form, product_price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">رابط الصورة</label>
              <input className="input text-sm" placeholder="https://..." dir="ltr" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
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
            <button disabled={submitting} onClick={createAd} className="btn-primary text-sm px-6 py-2 flex items-center gap-2">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              {submitting ? 'جاري النشر...' : 'نشر العرض'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_AD) }} className="btn-secondary text-sm px-6 py-2">
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
                src={ad.image_url}
                alt={ad.title}
                className="w-28 h-28 object-cover flex-shrink-0"
                onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/120x120/f97316/white?text=عرض' }}
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
