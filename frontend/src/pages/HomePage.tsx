import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Package, Truck, Star, Clock, ChevronLeft, ShoppingBag, MapPin, Zap, Shield } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { useAuth } from '../lib/auth-context'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

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
}

const DEMO_ADS: AdOffer[] = [
  {
    id: '1',
    title: 'بيتزا مارجريتا كبيرة بـ 89 جنيه بدل 120!',
    description: 'عرض محدود اليوم بس على بيتزا مارجريتا كبيرة',
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=250&fit=crop',
    shop_name: 'بيتزا كينج',
    shop_address: 'شارع التحرير، القاهرة',
    shop_lat: 30.0444,
    shop_lng: 31.2357,
    product_name: 'بيتزا مارجريتا كبيرة',
    product_price: 89,
    is_active: true,
    click_count: 142,
  },
  {
    id: '2',
    title: 'وجبة برجر + مشروب + بطاطس بـ 75 جنيه',
    description: 'وجبة كاملة بأحسن سعر في المنطقة',
    image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=250&fit=crop',
    shop_name: 'برجر تاون',
    shop_address: 'ميدان المهندسين، الجيزة',
    shop_lat: 30.0574,
    shop_lng: 31.2128,
    product_name: 'وجبة برجر كاملة',
    product_price: 75,
    is_active: true,
    click_count: 89,
  },
  {
    id: '3',
    title: 'كيلو كشري بـ 45 جنيه توصيل مجاني',
    description: 'كشري طازج كل يوم مع توصيل مجاني',
    image_url: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=400&h=250&fit=crop',
    shop_name: 'كشري الحلوة',
    shop_address: 'شارع الهرم، الجيزة',
    shop_lat: 29.9864,
    shop_lng: 31.1406,
    product_name: 'كيلو كشري',
    product_price: 45,
    is_active: true,
    click_count: 215,
  },
  {
    id: '4',
    title: 'شاورما دجاج كبيرة بـ 35 جنيه',
    image_url: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400&h=250&fit=crop',
    shop_name: 'مطعم الشرق',
    shop_address: 'شارع عباس العقاد، مدينة نصر',
    shop_lat: 30.0636,
    shop_lng: 31.3382,
    product_name: 'شاورما دجاج كبيرة',
    product_price: 35,
    is_active: true,
    click_count: 67,
  },
  {
    id: '5',
    title: 'وجبة فراخ مشوية + أرز بـ 65 جنيه',
    image_url: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c8?w=400&h=250&fit=crop',
    shop_name: 'فراخ الجنة',
    shop_address: 'شارع فيصل، الجيزة',
    shop_lat: 30.0200,
    shop_lng: 31.1900,
    product_name: 'وجبة فراخ مشوية كاملة',
    product_price: 65,
    is_active: true,
    click_count: 193,
  },
  {
    id: '6',
    title: 'سلطة خضراء طازجة بـ 20 جنيه',
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=250&fit=crop',
    shop_name: 'صحتك أولاً',
    shop_address: 'شارع لبنان، المهندسين',
    shop_lat: 30.0600,
    shop_lng: 31.2100,
    product_name: 'سلطة خضراء كبيرة',
    product_price: 20,
    is_active: true,
    click_count: 31,
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [ads, setAds] = useState<AdOffer[]>(DEMO_ADS)
  const [adsLoading, setAdsLoading] = useState(true)

  useEffect(() => {
    async function fetchAds() {
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

      // لو المفتاح مش موجود أو نص وصفي، استخدم البيانات التجريبية فوراً
      if (!anonKey || !anonKey.startsWith('eyJ') || !supabaseUrl) {
        setAdsLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('ad_offers')
          .select('*')
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .order('click_count', { ascending: false })
          .limit(12)

        if (!error && data && data.length > 0) {
          setAds(data)
        }
      } catch {
        // fallback to demo ads
      } finally {
        setAdsLoading(false)
      }
    }
    fetchAds()
  }, [])

  async function handleAdClick(ad: AdOffer) {
    if (!user) {
      toast.error('سجّل دخولك أول عشان تطلب')
      navigate('/login')
      return
    }

    navigate('/order', {
      state: {
        adOffer: ad,
        prefill: {
          type: 'SHOPPING',
          pickupLat: ad.shop_lat,
          pickupLng: ad.shop_lng,
          pickupDetails: `${ad.product_name} من ${ad.shop_name}`,
        }
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 rounded-3xl p-8 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
          <div className="absolute top-4 right-8 text-9xl">🛵</div>
          <div className="absolute bottom-4 left-8 text-6xl">📦</div>
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-black mb-3">مندوبك 🛵</h1>
          <p className="text-orange-100 text-lg mb-6">أسرع توصيل في مصر • طلبك في أقل من ساعة</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/order"
              className="bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-all shadow-lg flex items-center gap-2"
            >
              <Package size={20} />
              اطلب دلوقتي
            </Link>
            <Link
              to="/courier/register"
              className="bg-orange-400 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-300 transition-all border border-white/30 flex items-center gap-2"
            >
              <Truck size={20} />
              انضم كمندوب
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Zap className="text-orange-500" size={24} />, value: '< 60 دقيقة', label: 'وقت التوصيل' },
          { icon: <Star className="text-yellow-500" size={24} />, value: '4.8 ⭐', label: 'تقييم المناديب' },
          { icon: <Shield className="text-green-500" size={24} />, value: '100%', label: 'أمان مضمون' },
        ].map((stat, i) => (
          <div key={i} className="card text-center py-4">
            <div className="flex justify-center mb-2">{stat.icon}</div>
            <div className="text-lg font-black text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Ads Section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-black">عروض اليوم 🔥</h2>
            <p className="text-gray-500 text-sm">اضغط على عرض واطلب بكليك واحد</p>
          </div>
          <div className="flex items-center gap-1.5 bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse block" />
            Live
          </div>
        </div>

        {adsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden p-0 animate-pulse">
                <div className="w-full h-44 bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-10 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map(ad => (
              <div
                key={ad.id}
                className="card overflow-hidden p-0 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => handleAdClick(ad)}
              >
                <div className="relative">
                  <img
                    src={ad.image_url}
                    alt={ad.title}
                    className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={e => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x250/f97316/white?text=عرض'
                    }}
                  />
                  {ad.product_price && (
                    <div className="absolute top-3 left-3 bg-orange-500 text-white font-black px-3 py-1 rounded-xl text-sm shadow-lg">
                      {ad.product_price} جنيه
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
                    <Clock size={12} />
                    {ad.click_count} طلب
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-2">{ad.title}</h3>
                  <div className="flex items-center gap-1 text-gray-500 text-sm mb-3">
                    <MapPin size={14} />
                    <span className="truncate">{ad.shop_name}</span>
                  </div>
                  <button
                    disabled={loading}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    onClick={e => { e.stopPropagation(); handleAdClick(ad) }}
                  >
                    <ShoppingBag size={16} />
                    اطلب دلوقتي
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card">
        <h2 className="text-xl font-black mb-6 text-center">إزاي بيشتغل؟ 🤔</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '1', icon: '📍', title: 'حدد العنوان', desc: 'دخل عنوان الاستلام والتوصيل' },
            { step: '2', icon: '💰', title: 'شوف السعر', desc: 'السعر بيتحسب أوتوماتيك قبل التأكيد' },
            { step: '3', icon: '🛵', title: 'مندوب في الطريق', desc: 'أول مندوب متاح بياخد طلبك فوراً' },
          ].map(item => (
            <div key={item.step} className="text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl">
                {item.icon}
              </div>
              <h3 className="font-bold mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 gap-4">
        <Link to="/courier/dashboard" className="card flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <Truck className="text-blue-600" size={24} />
          </div>
          <div>
            <div className="font-bold">لوحة المناديب</div>
            <div className="text-xs text-gray-500">شوف الطلبات Live</div>
          </div>
          <ChevronLeft size={18} className="text-gray-400 mr-auto" />
        </Link>
        <Link to="/admin" className="card flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <Shield className="text-purple-600" size={24} />
          </div>
          <div>
            <div className="font-bold">لوحة الأدمن</div>
            <div className="text-xs text-gray-500">إدارة المنصة</div>
          </div>
          <ChevronLeft size={18} className="text-gray-400 mr-auto" />
        </Link>
      </div>
    </div>
  )
}
