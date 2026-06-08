import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Plus, Eye, EyeOff, TrendingUp } from 'lucide-react'

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
  const [ads, setAds] = useState<AdOffer[]>(DEMO_ADS)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_AD)
  const [submitting, setSubmitting] = useState(false)

  async function createAd() {
    if (!form.title || !form.shop_name || !form.product_name) {
      toast.error('ملء البيانات المطلوبة')
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      const newAd: AdOffer = {
        id: Date.now().toString(),
        title: form.title,
        description: form.description,
        image_url: form.image_url || 'https://placehold.co/400x250/f97316/white?text=عرض',
        shop_name: form.shop_name,
        shop_address: form.shop_address,
        shop_lat: form.shop_lat,
        shop_lng: form.shop_lng,
        product_name: form.product_name,
        product_price: form.product_price || undefined,
        is_active: true,
        click_count: 0,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
      }
      setAds(prev => [newAd, ...prev])
      toast.success('تم نشر العرض! ✅')
      setShowForm(false)
      setForm(EMPTY_AD)
      setSubmitting(false)
    }, 800)
  }

  function toggleAd(id: string, isActive: boolean) {
    setAds(ads.map(a => a.id === id ? { ...a, is_active: !isActive } : a))
    toast.success(isActive ? 'تم إيقاف العرض' : 'تم تفعيل العرض')
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
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
        >
          <Plus size={16} />
          عرض جديد
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card border-2 border-orange-200 animate-fade-in space-y-4">
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">عنوان المحل</label>
              <input className="input text-sm" placeholder="شارع التحرير، القاهرة" value={form.shop_address} onChange={e => setForm({ ...form, shop_address: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">سعر المنتج (جنيه)</label>
              <input type="number" className="input text-sm" value={form.product_price || ''} onChange={e => setForm({ ...form, product_price: parseFloat(e.target.value) })} />
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
            <button disabled={submitting} onClick={createAd} className="btn-primary text-sm px-6 py-2">
              {submitting ? 'جاري النشر...' : 'نشر العرض'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-sm px-6 py-2">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Ads List */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-32" />
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
                  <button
                    onClick={() => toggleAd(ad.id, ad.is_active)}
                    className={`mr-2 p-1.5 rounded-lg transition-all ${ad.is_active ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                  >
                    {ad.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">{ad.shop_name}</p>
                {ad.product_price && (
                  <p className="text-orange-500 font-bold text-sm mt-1">{ad.product_price} جنيه</p>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-400 mt-2">
                  <TrendingUp size={12} />
                  <span>{ad.click_count} ضغطة</span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

const DEMO_ADS: AdOffer[] = [
  {
    id: '1', title: 'بيتزا مارجريتا بـ 89 جنيه', image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=120&h=120&fit=crop',
    shop_name: 'بيتزا كينج', shop_address: 'شارع التحرير', shop_lat: 30.044, shop_lng: 31.235,
    product_name: 'بيتزا مارجريتا', product_price: 89, is_active: true, click_count: 142,
    start_date: new Date().toISOString(), end_date: new Date(Date.now() + 86400000).toISOString(),
  },
]
