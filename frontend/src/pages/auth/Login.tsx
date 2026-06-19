// =============================================================
// Login / Register - تسجيل بالإيميل + Supabase Auth
// =============================================================

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Truck, Mail, Lock, MapPin, User, ArrowLeft,
  Eye, EyeOff, Loader2, CheckCircle, KeyRound,
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import type { AppUser } from '../../lib/auth-context'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

type Mode = 'welcome' | 'login' | 'register-client' | 'register-courier' | 'forgot' | 'email-sent'

const API = '/api'

// ===== Rate Limiter بسيط (client-side) =====
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(key: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now()
  const current = rateLimitMap.get(key)
  if (!current || now > current.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (current.count >= max) return false
  current.count++
  return true
}

// ===== Validation =====
function validateEmail(email: string): string | null {
  if (!email.trim()) return 'الإيميل مطلوب'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'الإيميل غير صحيح'
  return null
}

function validatePassword(pass: string): string | null {
  if (!pass) return 'الباسورد مطلوب'
  if (pass.length < 8) return 'الباسورد لازم 8 حروف على الأقل'
  return null
}

export default function LoginPage() {
  const { login, isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('welcome')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [sentEmail, setSentEmail] = useState('')

  const pendingRoleRef = useRef<'CLIENT' | 'COURIER'>('CLIENT')

  if (isLoggedIn && user) {
    const dest = user.role === 'courier'
      ? '/courier/dashboard'
      : user.role === 'admin' ? '/admin-secret' : '/'
    navigate(dest, { replace: true })
    return null
  }

  // ===== مزامنة مع الباكند بعد تسجيل الدخول بـ Supabase =====
  async function syncWithBackend(accessToken: string): Promise<AppUser | null> {
    try {
      const res = await fetch(`${API}/auth/sync-email-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل مزامنة الحساب')
        return null
      }

      const roleMap: Record<string, AppUser['role']> = {
        CLIENT: 'client', COURIER: 'courier', ADMIN: 'admin',
      }
      const appUser: AppUser = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone || null,
        email: data.user.email || null,
        role: roleMap[data.user.role] || 'client',
        avatar: null,
        address: data.user.address,
        onboarded: true,
        courierStatus: data.user.courierStatus || null,
        courierId: data.user.courierId || null,
      }
      login(appUser, data.token)
      return appUser
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
      return null
    }
  }

  // ===== تسجيل دخول =====
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()

    const emailErr = validateEmail(email)
    if (emailErr) { toast.error(emailErr); return }
    if (!password) { toast.error('ادخل الباسورد'); return }

    if (!checkRateLimit(`login:${email}`, 5)) {
      toast.error('حاولت كتير — انتظر دقيقة وجرب تاني')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('الإيميل أو الباسورد غلط')
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('الإيميل لم يتأكد بعد — راجع صندوق الوارد وافتح رابط التفعيل')
        } else {
          toast.error(error.message || 'فشل تسجيل الدخول')
        }
        return
      }

      const appUser = await syncWithBackend(data.session.access_token)
      if (!appUser) return

      toast.success(`أهلاً ${appUser.name}! 👋`)
      const dest = appUser.role === 'courier'
        ? '/courier/dashboard'
        : appUser.role === 'admin' ? '/admin-secret' : '/'
      navigate(dest, { replace: true })
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
    } finally {
      setLoading(false)
    }
  }

  // ===== تسجيل عميل =====
  async function handleRegisterClient(e: React.FormEvent) {
    e.preventDefault()

    const emailErr = validateEmail(email)
    if (emailErr) { toast.error(emailErr); return }
    const passErr = validatePassword(password)
    if (passErr) { toast.error(passErr); return }
    if (password !== confirmPass) { toast.error('الباسورد مش متطابق'); return }
    if (address.trim().length < 5) { toast.error('اكتب عنوانك بالتفصيل (5 حروف على الأقل)'); return }

    if (!checkRateLimit(`register:${email}`, 3)) {
      toast.error('حاولت كتير — انتظر دقيقة وجرب تاني')
      return
    }

    setLoading(true)
    pendingRoleRef.current = 'CLIENT'
    try {
      console.log('[signUp] جاري التسجيل...', email.trim())
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role: 'CLIENT', address: address.trim(), name: `عميل_${email.split('@')[0]}` },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log('[signUp] result:', { user: data?.user?.id, error: error?.message })

      if (error) {
        console.error('[signUp] error:', error)
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast.error('الإيميل ده مستخدم بالفعل — سجل دخول')
        } else if (error.message.includes('Password should be')) {
          toast.error('الباسورد ضعيف — استخدم 8 حروف وأرقام')
        } else if (error.message.includes('signup')) {
          toast.error('التسجيل بالإيميل مش مفعّل في Supabase — فعّل Email Provider')
        } else {
          toast.error(`خطأ: ${error.message}`)
        }
        return
      }

      if (data?.user) {
        console.log('[signUp] ✅ يوزر اتسجل:', data.user.id, '| confirmed:', data.user.email_confirmed_at)
        setSentEmail(email.trim())
        setMode('email-sent')
      } else {
        toast.error('فشل التسجيل — حاول تاني')
      }
    } catch (e) {
      console.error('[signUp] catch:', e)
      toast.error('مشكلة في الاتصال — تأكد من الـ Supabase URL و ANON KEY')
    } finally {
      setLoading(false)
    }
  }

  // ===== تسجيل مندوب =====
  async function handleRegisterCourier(e: React.FormEvent) {
    e.preventDefault()

    const emailErr = validateEmail(email)
    if (emailErr) { toast.error(emailErr); return }
    if (name.trim().length < 3) { toast.error('الاسم لازم 3 حروف على الأقل'); return }
    const passErr = validatePassword(password)
    if (passErr) { toast.error(passErr); return }
    if (password !== confirmPass) { toast.error('الباسورد مش متطابق'); return }

    if (!checkRateLimit(`register:${email}`, 3)) {
      toast.error('حاولت كتير — انتظر دقيقة وجرب تاني')
      return
    }

    setLoading(true)
    pendingRoleRef.current = 'COURIER'
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { role: 'COURIER', name: name.trim(), address: address.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          toast.error('الإيميل ده مستخدم بالفعل — سجل دخول')
        } else if (error.message.includes('Password should be')) {
          toast.error('الباسورد ضعيف — استخدم 8 حروف وأرقام')
        } else {
          toast.error(error.message || 'فشل التسجيل')
        }
        return
      }

      setSentEmail(email.trim())
      setMode('email-sent')
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
    } finally {
      setLoading(false)
    }
  }

  // ===== نسيت الباسورد =====
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    const emailErr = validateEmail(forgotEmail)
    if (emailErr) { toast.error(emailErr); return }

    if (!checkRateLimit(`forgot:${forgotEmail}`, 3)) {
      toast.error('حاولت كتير — انتظر دقيقة وجرب تاني')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      })
      if (error) {
        toast.error(error.message || 'فشل إرسال رابط الاسترداد')
        return
      }
      toast.success('📧 تم إرسال رابط إعادة الضبط — راجع إيميلك')
      setSentEmail(forgotEmail.trim())
      setMode('email-sent')
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  // ===== شاشة تأكيد الإيميل المُرسل =====
  if (mode === 'email-sent') {
    async function resendConfirmation() {
      if (!sentEmail) return
      if (!checkRateLimit(`resend:${sentEmail}`, 2, 120_000)) {
        toast.error('انتظر دقيقتين قبل إعادة الإرسال')
        return
      }
      setLoading(true)
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: sentEmail,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) {
          toast.error(error.message || 'فشل إعادة الإرسال')
        } else {
          toast.success('📧 تم إرسال رابط جديد — راجع إيميلك')
        }
      } catch {
        toast.error('مشكلة في الاتصال')
      } finally {
        setLoading(false)
      }
    }

    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-green-100">
            <CheckCircle className="text-green-500" size={48} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">راجع إيميلك! 📬</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              بعتنالك رسالة تأكيد على
            </p>
            <p className="text-orange-600 font-bold mt-1 break-all" dir="ltr">{sentEmail}</p>
            <p className="text-gray-500 mt-2 text-sm">
              افتح الرابط في الرسالة عشان تفعّل حسابك وتبدأ
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-right">
            <p className="text-orange-700 text-sm font-bold mb-1">📌 لو مش لاقيها:</p>
            <ul className="text-orange-600 text-xs space-y-1 list-disc list-inside">
              <li>شوف مجلد الـ Spam أو Junk</li>
              <li>تأكد إن الإيميل مكتوب صح</li>
              <li>الرابط صالح لمدة ساعة فقط</li>
            </ul>
          </div>
          <button
            onClick={resendConfirmation}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-3.5 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> جاري الإرسال...</> : '📧 إعادة إرسال رابط التأكيد'}
          </button>
          <button
            onClick={() => { setMode('welcome'); setEmail(''); setPassword(''); setConfirmPass('') }}
            className="w-full flex items-center justify-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} /> رجوع للصفحة الرئيسية
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200">
            <Truck className="text-white" size={36} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">مندوبك</h1>
          <p className="text-gray-500 mt-1">منصة التوصيل السريع</p>
        </div>

        {/* Welcome */}
        {mode === 'welcome' && (
          <div className="space-y-3">
            <button
              onClick={() => setMode('login')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              دخول بحسابي
            </button>
            <div className="text-center text-gray-400 text-sm font-medium">أو سجّل حساب جديد</div>
            <button
              onClick={() => setMode('register-client')}
              className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold text-lg py-4 rounded-2xl transition-all"
            >
              🛒 أنا عميل — بطلب توصيل
            </button>
            <button
              onClick={() => setMode('register-courier')}
              className="w-full bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 text-orange-700 font-bold text-lg py-4 rounded-2xl transition-all"
            >
              🛵 أنا مندوب — بوصّل الطلبات
            </button>
          </div>
        )}

        {/* Login */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-xl font-black text-center">تسجيل الدخول</h2>
            <Field icon={<Mail size={17} />} label="الإيميل">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                dir="ltr"
                required
                className="input-field pr-10"
                autoComplete="email"
              />
            </Field>
            <Field
              icon={<Lock size={17} />}
              label="الباسورد"
              extra={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            >
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-field pr-10 pl-10"
                autoComplete="current-password"
              />
            </Field>
            <SubmitBtn loading={loading} label="دخول →" />
            <button
              type="button"
              onClick={() => { setForgotEmail(email); setMode('forgot') }}
              className="w-full flex items-center justify-center gap-1 text-orange-500 text-sm font-semibold hover:text-orange-700 transition-colors"
            >
              <KeyRound size={14} /> نسيت كلمة السر؟
            </button>
            <BackBtn onClick={() => setMode('welcome')} />
          </form>
        )}

        {/* Register Client */}
        {mode === 'register-client' && (
          <form onSubmit={handleRegisterClient} className="space-y-4">
            <h2 className="text-xl font-black text-center">تسجيل عميل جديد</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
              <span className="text-blue-700 text-sm font-bold">🛒 حساب عميل — اطلب توصيل ومشتريات</span>
            </div>
            <Field icon={<Mail size={17} />} label="الإيميل">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                dir="ltr"
                required
                className="input-field pr-10"
                autoComplete="email"
              />
            </Field>
            <Field icon={<MapPin size={17} />} label="عنوانك (الافتراضي للطلبات)">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="الحي، الشارع، رقم البيت..."
                required
                className="input-field pr-10"
                dir="rtl"
              />
            </Field>
            <Field
              icon={<Lock size={17} />}
              label="الباسورد (8 حروف على الأقل)"
              extra={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            >
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8 حروف على الأقل"
                required
                minLength={8}
                className="input-field pr-10 pl-10"
                autoComplete="new-password"
              />
            </Field>
            <Field
              icon={<Lock size={17} />}
              label="تأكيد الباسورد"
              extra={
                <button
                  type="button"
                  onClick={() => setShowPass2(!showPass2)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            >
              <input
                type={showPass2 ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                required
                className="input-field pr-10 pl-10"
                autoComplete="new-password"
              />
            </Field>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
              <span className="text-orange-700 text-xs">📧 هنبعتلك إيميل تأكيد — افتحه عشان تفعّل حسابك</span>
            </div>
            <SubmitBtn loading={loading} label="📧 تسجيل وإرسال التأكيد →" />
            <BackBtn onClick={() => setMode('welcome')} />
          </form>
        )}

        {/* Register Courier */}
        {mode === 'register-courier' && (
          <form onSubmit={handleRegisterCourier} className="space-y-4">
            <h2 className="text-xl font-black text-center">تسجيل مندوب جديد</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
              <span className="text-orange-700 text-sm font-bold">🛵 بعد التسجيل هترفع صورة البطاقة عشان تبدأ</span>
            </div>
            <Field icon={<User size={17} />} label="الاسم الكامل">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="محمد أحمد"
                required
                className="input-field pr-10"
                dir="rtl"
              />
            </Field>
            <Field icon={<Mail size={17} />} label="الإيميل">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                dir="ltr"
                required
                className="input-field pr-10"
                autoComplete="email"
              />
            </Field>
            <Field icon={<MapPin size={17} />} label="عنوانك">
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="الحي، الشارع..."
                className="input-field pr-10"
                dir="rtl"
              />
            </Field>
            <Field
              icon={<Lock size={17} />}
              label="الباسورد (8 حروف على الأقل)"
              extra={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            >
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="8 حروف على الأقل"
                required
                minLength={8}
                className="input-field pr-10 pl-10"
                autoComplete="new-password"
              />
            </Field>
            <Field
              icon={<Lock size={17} />}
              label="تأكيد الباسورد"
              extra={
                <button
                  type="button"
                  onClick={() => setShowPass2(!showPass2)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            >
              <input
                type={showPass2 ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••"
                required
                className="input-field pr-10 pl-10"
                autoComplete="new-password"
              />
            </Field>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
              <span className="text-orange-700 text-xs">📧 هنبعتلك إيميل تأكيد — افتحه عشان تفعّل حسابك</span>
            </div>
            <SubmitBtn loading={loading} label="📧 تسجيل وإرسال التأكيد →" />
            <BackBtn onClick={() => setMode('welcome')} />
          </form>
        )}

        {/* Forgot Password */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h2 className="text-xl font-black text-center">استعادة كلمة السر</h2>
            <p className="text-gray-500 text-sm text-center">
              هنبعتلك رابط عشان تعيّن كلمة سر جديدة
            </p>
            <Field icon={<Mail size={17} />} label="الإيميل">
              <input
                type="email"
                value={forgotEmail}
                onChange={e => setForgotEmail(e.target.value)}
                placeholder="example@gmail.com"
                dir="ltr"
                required
                className="input-field pr-10"
                autoComplete="email"
              />
            </Field>
            <SubmitBtn loading={loading} label="📧 إرسال رابط الاسترداد →" />
            <BackBtn onClick={() => setMode('login')} />
          </form>
        )}

        <p className="text-center text-xs text-gray-400">
          بالتسجيل أنت موافق على شروط الاستخدام وسياسة الخصوصية
        </p>
      </div>
    </div>
  )
}

function Field({ icon, label, children, extra }: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  extra?: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1.5 text-right">{label}</label>
      <div className="relative">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>
        {children}
        {extra}
      </div>
    </div>
  )
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
    >
      {loading ? <><Loader2 size={20} className="animate-spin" /> جاري التحميل...</> : label}
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors"
    >
      <ArrowLeft size={14} /> رجوع
    </button>
  )
}
