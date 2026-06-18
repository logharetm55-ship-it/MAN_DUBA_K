// =============================================================
// Onboarding - اختيار الدور بعد التسجيل الأول
// =============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, ShoppingBag, ChevronLeft, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth-context'
import toast from 'react-hot-toast'

export default function OnboardingPage() {
  const { user, updateRole, isLoggedIn } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<'client' | 'courier' | null>(null)
  const [loading, setLoading] = useState(false)

  // مش مسجل → روح للتسجيل
  if (!isLoggedIn) {
    navigate('/login', { replace: true })
    return null
  }

  async function handleConfirm() {
    if (!selected) return
    setLoading(true)

    try {
      updateRole(selected)
      await new Promise(r => setTimeout(r, 400)) // smooth UX

      toast.success(
        selected === 'client' ? '🎉 أهلاً! حسابك كعميل جاهز' : '🛵 أهلاً! حسابك كمندوب جاهز'
      )
      navigate(selected === 'client' ? '/' : '/courier/dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-orange-200">
            <Truck className="text-white" size={36} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            أهلاً {user?.name?.split(' ')[0] || 'بيك'} 👋
          </h1>
          <p className="text-gray-500 text-lg">إزاي هتستخدم مندوبك؟</p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">

          {/* عميل */}
          <button
            onClick={() => setSelected('client')}
            className={`relative rounded-3xl p-6 border-2 transition-all duration-200 text-right flex flex-col items-start gap-3
              ${selected === 'client'
                ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100 scale-[1.02]'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'}`}
          >
            {selected === 'client' && (
              <span className="absolute top-3 left-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </span>
            )}
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center">
              <ShoppingBag className="text-blue-600" size={28} />
            </div>
            <div>
              <div className="font-black text-xl text-gray-900 mb-1">عميل</div>
              <div className="text-sm text-gray-500 leading-relaxed">اطلب توصيل وتابع طلباتك</div>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {['طلب توصيل', 'تتبع مباشر', 'تقييم'].map(tag => (
                <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>
              ))}
            </div>
          </button>

          {/* مندوب */}
          <button
            onClick={() => setSelected('courier')}
            className={`relative rounded-3xl p-6 border-2 transition-all duration-200 text-right flex flex-col items-start gap-3
              ${selected === 'courier'
                ? 'border-orange-500 bg-orange-50 shadow-lg shadow-orange-100 scale-[1.02]'
                : 'border-gray-200 bg-white hover:border-orange-300 hover:bg-orange-50/50'}`}
          >
            {selected === 'courier' && (
              <span className="absolute top-3 left-3 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">✓</span>
              </span>
            )}
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center">
              <Truck className="text-orange-600" size={28} />
            </div>
            <div>
              <div className="font-black text-xl text-gray-900 mb-1">مندوب</div>
              <div className="text-sm text-gray-500 leading-relaxed">استقبل طلبات واكسب فلوس</div>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {['طلبات مباشرة', 'أرباح يومية', 'مرن'].map(tag => (
                <span key={tag} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">{tag}</span>
              ))}
            </div>
          </button>
        </div>

        {/* Note for courier */}
        {selected === 'courier' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-right">
            <div className="text-amber-800 font-bold text-sm mb-1">📋 بعد الاختيار</div>
            <div className="text-amber-700 text-sm">
              هتحتاج تكمل تسجيل بيانات المندوب وصورة البطاقة عشان يتم قبولك.
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selected || loading}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all duration-200 flex items-center justify-center gap-3
            ${selected && !loading
              ? 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200 active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          {loading
            ? <><Loader2 size={20} className="animate-spin" /> جاري الحفظ...</>
            : <>{selected ? `ابدأ كـ${selected === 'client' ? 'عميل' : 'مندوب'}` : 'اختار أولاً'}{selected && <ChevronLeft size={20} />}</>
          }
        </button>

        <p className="text-center text-xs text-gray-400 mt-4">يمكنك تغيير دورك لاحقاً من الإعدادات</p>
      </div>
    </div>
  )
}
