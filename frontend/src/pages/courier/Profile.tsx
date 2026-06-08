import { Star, Package, Truck, User, Phone, MapPin, Award } from 'lucide-react'

const DEMO_PROFILE = {
  name: 'محمد المندوب',
  phone: '01012345678',
  address: 'شارع التحرير، القاهرة',
  status: 'APPROVED',
  rating: 4.8,
  total_deliveries: 127,
  is_online: true,
  averageRating: 4.8,
  totalRatings: 43,
  ratings: [
    { rating: 5, comment: 'سريع جداً وأمين 👍', date: 'منذ يومين' },
    { rating: 4, comment: 'كويس', date: 'منذ 3 أيام' },
    { rating: 5, comment: 'ممتاز! ربنا يكرمك', date: 'منذ أسبوع' },
    { rating: 5, comment: 'أحسن مندوب خدمني', date: 'منذ أسبوعين' },
  ],
}

export default function CourierProfile() {
  const profile = DEMO_PROFILE

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Profile Header */}
      <div className="card text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl font-black text-orange-500">{profile.name[0]}</span>
        </div>
        <h2 className="text-xl font-black">{profile.name}</h2>
        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold mt-2 bg-green-100 text-green-700">
          ✅ معتمد
        </div>
        <div className={`w-3 h-3 rounded-full mx-auto mt-2 ${profile.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
        <p className="text-xs text-gray-500 mt-1">{profile.is_online ? 'متاح للطلبات' : 'غير متاح'}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center py-4">
          <Star className="text-yellow-500 fill-yellow-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black">{profile.averageRating.toFixed(1)}</div>
          <div className="text-xs text-gray-500">{profile.totalRatings} تقييم</div>
        </div>
        <div className="card text-center py-4">
          <Package className="text-orange-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black">{profile.total_deliveries}</div>
          <div className="text-xs text-gray-500">توصيلة</div>
        </div>
        <div className="card text-center py-4">
          <Award className="text-purple-500 mx-auto mb-1" size={24} />
          <div className="text-xl font-black">مميز</div>
          <div className="text-xs text-gray-500">المستوى</div>
        </div>
      </div>

      {/* Info */}
      <div className="card space-y-3">
        <h3 className="font-bold">البيانات الشخصية</h3>
        {[
          { icon: <User size={16} />, label: 'الاسم', value: profile.name },
          { icon: <Phone size={16} />, label: 'الموبايل', value: profile.phone },
          { icon: <MapPin size={16} />, label: 'العنوان', value: profile.address },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-2">
            <span className="text-orange-500">{item.icon}</span>
            <span className="text-gray-500 w-16">{item.label}</span>
            <span className="font-semibold">{item.value}</span>
          </div>
        ))}
      </div>

      {/* Rating Stars Visual */}
      <div className="card">
        <h3 className="font-bold mb-3">نسبة التقييم</h3>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-5xl font-black text-gray-900">{profile.averageRating.toFixed(1)}</span>
          <div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={20} className={i < Math.round(profile.averageRating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">{profile.totalRatings} تقييم</p>
          </div>
        </div>

        <h3 className="font-bold mb-3">آخر التقييمات</h3>
        <div className="space-y-3">
          {profile.ratings.map((r, i) => (
            <div key={i} className="flex items-start gap-3 border-b border-gray-100 pb-3">
              <div className="flex gap-0.5 mt-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} size={14} className={s < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                ))}
              </div>
              <div className="flex-1">
                {r.comment && <p className="text-sm text-gray-700">{r.comment}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{r.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
