// =============================================================
// Login / Register Page - تسجيل مباشر بدون Clerk
// =============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Phone, User, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import type { AppUser } from '../../lib/auth-context'
import toast from 'react-hot-toast'

type Mode = 'welcome' | 'register' | 'login'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// حفظ اليوزر في Supabase عبر anon key
async function saveUserToSupabase(user: Omit<AppUser, 'id'> & { id?: string }): Promise<string | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY?.startsWith('eyJ')) return null

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role?.toUpperCase() || 'CLIENT',
        onboarded: true,
        clerk_id: `local_${user.phone}`,
      }),
    })

    if (res.ok) {
      const [saved] = await res.json()
      return saved?.id || null
    }
  } catch { /* ignore - local mode */ }
  return null
}

// جلب يوزر بالتليفون
async function findUserByPhone(phone: string): Promise<AppUser | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY?.startsWith('eyJ')) return null

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?phone=eq.${encodeURIComponent(phone)}&select=*&limit=1`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    )
    if (res.ok) {
      const [found] = await res.json()
      if (found) {
        const roleMap: Record<string, AppUser['role']> = {
          CLIENT: 'client', COURIER: 'courier', ADMIN: 'admin',
        }
        return {
          id: found.id,
          name: found.name,
          phone: found.phone,
          email: found.email,
          role: roleMap[found.role] || 'client',
          avatar: found.avatar_url,
          onboarded: found.onboarded,
        }
      }
    }
  } catch { /* ignore */ }
  return null
}

export default function LoginPage() {
  const { login, isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('welcome')
  const [loading, setLoading] = useState(false)

  // بيانات التسجيل
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [showPhone, setShowPhone] = useState(false)

  // لو بالفعل مسجل دخول
  if (isLoggedIn && user) {
    const dest = user.role === 'courier' ? '/courier/dashboard' : user.role === 'admin' ? '/admin' : '/'
    navigate(dest, { replace: true })
    return null
  }

  // ===== تسجيل جديد =====
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || name.trim().length < 2) {
      toast.error('اكتب اسمك الكامل')
      return
    }
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      toast.error('رقم التليفون غلط')
      return
    }

    setLoading(true)
    try {
      // تحقق لو الرقم موجود
      const existing = await findUserByPhone(cleanPhone)
      if (existing) {
        login(existing)
        toast.success(`أهلاً ${existing.name}! 👋`)
        const dest = existing.role === 'courier' ? '/courier/dashboard' : '/'
        navigate(dest, { replace: true })
        return
      }

      // إنشاء حساب جديد
      const newId = `local_${Date.now()}`
      const newUser: AppUser = {
        id: newId,
        name: name.trim(),
        phone: cleanPhone,
        email: null,
        role: 'client',
        avatar: null,
        onboarded: false, // هيروح صفحة اختيار الدور
      }

      // حاول تحفظ في Supabase
      const supabaseId = await saveUserToSupabase(newUser)
      if (supabaseId) newUser.id = supabaseId

      login(newUser)
      toast.success(`أهلاً ${newUser.name}! 🎉`)
      navigate('/onboarding', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  // ===== دخول بالتليفون =====
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '')
    if (cleanPhone.length < 10) {
      toast.error('رقم التليفون غلط')
      return
    }

    setLoading(true)
    try {
      const found = await findUserByPhone(cleanPhone)
      if (found) {
        login(found)
        toast.success(`أهلاً ${found.name}! 👋`)
        const dest = found.role === 'courier' ? '/courier/dashboard' : found.role === 'admin' ? '/admin' : '/'
        navigate(dest, { replace: true })
      } else {
        toast.error('الرقم مش موجود — سجّل حساب جديد')
        setMode('register')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200">
            <Truck className="text-white" size={36} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">مندوبك</h1>
          <p className="text-gray-500 mt-1">منصة التوصيل السريع</p>
        </div>

        {/* Welcome Screen */}
        {mode === 'welcome' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('register')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              🚀 حساب جديد
            </button>
            <button
              onClick={() => setMode('login')}
              className="w-full bg-white border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50 text-gray-800 font-bold text-lg py-4 rounded-2xl transition-all"
            >
              دخول بحسابي
            </button>
          </div>
        )}

        {/* Register Form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
              <span className="text-green-700 text-sm font-bold">✨ تسجيل مجاني — بدون إيميل أو كلمة سر</span>
            </div>

            {/* الاسم */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 text-right">الاسم الكامل</label>
              <div className="relative">
                <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="محمد أحمد"
                  required
                  className="w-full pr-10 pl-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:outline-none text-right font-medium bg-white"
                  dir="rtl"
                />
              </div>
            </div>

            {/* التليفون */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 text-right">رقم التليفون</label>
              <div className="relative">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPhone ? 'text' : 'tel'}
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  required
                  className="w-full pr-10 pl-10 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:outline-none text-right font-medium bg-white tracking-wider"
                  dir="ltr"
                />
                <button type="button" onClick={() => setShowPhone(!showPhone)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPhone ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={20} className="animate-spin" /> جاري التسجيل...</> : 'ابدأ الآن →'}
            </button>

            <button type="button" onClick={() => setMode('welcome')}
              className="w-full flex items-center justify-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors">
              <ArrowLeft size={14} /> رجوع
            </button>
          </form>
        )}

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 text-right">رقم التليفون</label>
              <div className="relative">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  required
                  className="w-full pr-10 pl-4 py-3.5 border-2 border-gray-200 rounded-2xl focus:border-orange-400 focus:outline-none text-right font-medium bg-white tracking-wider"
                  dir="ltr"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 size={20} className="animate-spin" /> جاري الدخول...</> : 'دخول →'}
            </button>

            <button type="button" onClick={() => setMode('welcome')}
              className="w-full flex items-center justify-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors">
              <ArrowLeft size={14} /> رجوع
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-400">
          بالتسجيل أنت موافق على شروط الاستخدام وسياسة الخصوصية
        </p>
      </div>
    </div>
  )
}
