// =============================================================
// Login / Register - تسجيل بالتليفون + OTP تحقق
// =============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Phone, Lock, MapPin, User, ArrowLeft, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'
import type { AppUser } from '../../lib/auth-context'
import toast from 'react-hot-toast'

type Mode = 'welcome' | 'login' | 'register-client' | 'register-courier'

const API = '/api'

export default function LoginPage() {
  const { login, isLoggedIn, user } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('welcome')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showPass2, setShowPass2] = useState(false)

  // shared fields
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [address, setAddress] = useState('')
  const [name, setName] = useState('')

  // OTP state
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpVerified, setOtpVerified] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [pendingRole, setPendingRole] = useState<'CLIENT' | 'COURIER'>('CLIENT')

  if (isLoggedIn && user) {
    const dest = user.role === 'courier' ? '/courier/dashboard' : user.role === 'admin' ? '/admin-secret' : '/'
    navigate(dest, { replace: true })
    return null
  }

  // ===== إرسال OTP =====
  async function sendOtp(phoneNum: string, role: 'CLIENT' | 'COURIER') {
    const cleanPhone = phoneNum.replace(/\D/g, '')
    if (!/^01[0-9]{9}$/.test(cleanPhone)) {
      toast.error('رقم التليفون غلط (مثال: 01012345678)')
      return false
    }
    if (password.length < 6) { toast.error('الباسورد لازم 6 أرقام/حروف على الأقل'); return false }
    if (password !== confirmPass) { toast.error('الباسورد مش متطابق'); return false }
    if (role === 'CLIENT' && address.trim().length < 5) { toast.error('اكتب عنوانك بالتفصيل'); return false }
    if (role === 'COURIER' && name.trim().length < 3) { toast.error('الاسم لازم 3 حروف على الأقل'); return false }

    setOtpLoading(true)
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, purpose: 'register' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل إرسال الكود')
        return false
      }
      setPendingRole(role)
      setOtpStep(true)
      toast.success(`📱 تم إرسال كود التحقق على ${cleanPhone}`)
      return true
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
      return false
    } finally {
      setOtpLoading(false)
    }
  }

  // ===== تحقق من OTP =====
  async function verifyOtpCode() {
    const cleanPhone = phone.replace(/\D/g, '')
    if (otp.length !== 6) { toast.error('الكود لازم 6 أرقام'); return }

    setOtpLoading(true)
    try {
      const res = await fetch(`${API}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'الكود غلط')
        return
      }
      setOtpVerified(true)
      toast.success('✅ تم التحقق من رقمك!')
      // أكمل التسجيل تلقائياً
      if (pendingRole === 'CLIENT') {
        await completeRegisterClient(cleanPhone)
      } else {
        await completeRegisterCourier(cleanPhone)
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setOtpLoading(false)
    }
  }

  // ===== إعادة إرسال OTP =====
  async function resendOtp() {
    const cleanPhone = phone.replace(/\D/g, '')
    setOtpLoading(true)
    try {
      const res = await fetch(`${API}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, purpose: 'register' }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('📱 تم إرسال كود جديد!')
      } else {
        toast.error(data.error || 'فشل إعادة الإرسال')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setOtpLoading(false)
    }
  }

  // ===== تسجيل دخول =====
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '')
    if (!/^01[0-9]{9}$/.test(cleanPhone)) {
      toast.error('رقم التليفون غلط (مثال: 01012345678)')
      return
    }
    if (!password) {
      toast.error('ادخل الباسورد')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'رقم التليفون أو الباسورد غلط')
        return
      }

      const roleMap: Record<string, AppUser['role']> = {
        CLIENT: 'client', COURIER: 'courier', ADMIN: 'admin',
      }
      const appUser: AppUser = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: null,
        role: roleMap[data.user.role] || 'client',
        avatar: null,
        address: data.user.address,
        onboarded: true,
        courierStatus: data.user.courierStatus || null,
        courierId: data.user.courierId || null,
      }
      login(appUser, data.token)
      toast.success(`أهلاً ${appUser.name}! 👋`)
      const dest = appUser.role === 'courier' ? '/courier/dashboard' : appUser.role === 'admin' ? '/admin-secret' : '/'
      navigate(dest, { replace: true })
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
    } finally {
      setLoading(false)
    }
  }

  // ===== تسجيل عميل (بعد تحقق OTP) =====
  async function completeRegisterClient(cleanPhone: string) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password, role: 'CLIENT', address: address.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التسجيل')
        setOtpStep(false)
        setOtpVerified(false)
        return
      }

      const appUser: AppUser = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: null,
        role: 'client',
        avatar: null,
        address: data.user.address,
        onboarded: true,
      }
      login(appUser, data.token)
      toast.success('🎉 تم التسجيل بنجاح! أهلاً بيك')
      navigate('/', { replace: true })
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
    } finally {
      setLoading(false)
    }
  }

  // ===== تسجيل مندوب (بعد تحقق OTP) =====
  async function completeRegisterCourier(cleanPhone: string) {
    setLoading(true)
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, password, role: 'COURIER', name: name.trim(), address: address.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'فشل التسجيل')
        setOtpStep(false)
        setOtpVerified(false)
        return
      }

      const appUser: AppUser = {
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        email: null,
        role: 'courier',
        avatar: null,
        address: data.user.address,
        onboarded: true,
        courierStatus: 'PENDING_REVIEW',
      }
      login(appUser, data.token)
      toast.success('🛵 تم التسجيل! ارفع صورة البطاقة عشان تبدأ')
      navigate('/courier/register', { replace: true })
    } catch {
      toast.error('مشكلة في الاتصال، جرب تاني')
    } finally {
      setLoading(false)
    }
  }

  // ===== شاشة OTP =====
  if (otpStep) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200">
              <ShieldCheck className="text-white" size={36} />
            </div>
            <h1 className="text-2xl font-black text-gray-900">تحقق من رقمك</h1>
            <p className="text-gray-500 mt-1">
              أرسلنا كود مكوّن من 6 أرقام على
            </p>
            <p className="text-orange-600 font-bold mt-1" dir="ltr">{phone}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 text-right">الكود المرسل</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="_ _ _ _ _ _"
                maxLength={6}
                dir="ltr"
                className="input-field text-center text-2xl font-black tracking-widest letter-spacing-widest"
              />
            </div>

            <button
              onClick={verifyOtpCode}
              disabled={otpLoading || otp.length !== 6}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {otpLoading ? <><Loader2 size={20} className="animate-spin" /> جاري التحقق...</> : 'تحقق من الكود ✅'}
            </button>

            <button
              type="button"
              onClick={resendOtp}
              disabled={otpLoading}
              className="w-full flex items-center justify-center gap-1 text-orange-500 text-sm font-semibold hover:text-orange-700 transition-colors"
            >
              إعادة إرسال الكود
            </button>

            <button
              type="button"
              onClick={() => { setOtpStep(false); setOtp(''); setOtpVerified(false) }}
              className="w-full flex items-center justify-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              <ArrowLeft size={14} /> تعديل البيانات
            </button>
          </div>
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
            <button onClick={() => setMode('login')}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95">
              دخول بحسابي
            </button>
            <div className="text-center text-gray-400 text-sm font-medium">أو سجّل حساب جديد</div>
            <button onClick={() => setMode('register-client')}
              className="w-full bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 text-blue-700 font-bold text-lg py-4 rounded-2xl transition-all">
              🛒 أنا عميل — بطلب توصيل
            </button>
            <button onClick={() => setMode('register-courier')}
              className="w-full bg-orange-50 hover:bg-orange-100 border-2 border-orange-200 text-orange-700 font-bold text-lg py-4 rounded-2xl transition-all">
              🛵 أنا مندوب — بوصّل الطلبات
            </button>
          </div>
        )}

        {/* Login */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-xl font-black text-center">دخول</h2>
            <Field icon={<Phone size={17} />} label="رقم التليفون">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="01012345678" maxLength={11} dir="ltr" required
                className="input-field pr-10" />
            </Field>
            <Field icon={<Lock size={17} />} label="الباسورد" extra={
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="input-field pr-10 pl-10" />
            </Field>
            <SubmitBtn loading={loading} label="دخول →" />
            <BackBtn onClick={() => setMode('welcome')} />
          </form>
        )}

        {/* Register Client */}
        {mode === 'register-client' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-center">تسجيل عميل جديد</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
              <span className="text-blue-700 text-sm font-bold">🛒 حساب عميل — اطلب توصيل ومشتريات</span>
            </div>
            <Field icon={<Phone size={17} />} label="رقم التليفون">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="01012345678" maxLength={11} dir="ltr" required className="input-field pr-10" />
            </Field>
            <Field icon={<MapPin size={17} />} label="عنوانك (الافتراضي للطلبات)">
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="الحي، الشارع، رقم البيت..." required className="input-field pr-10" dir="rtl" />
            </Field>
            <Field icon={<Lock size={17} />} label="الباسورد" extra={
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="6 أرقام/حروف على الأقل" required className="input-field pr-10 pl-10" />
            </Field>
            <Field icon={<Lock size={17} />} label="تأكيد الباسورد" extra={
              <button type="button" onClick={() => setShowPass2(!showPass2)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }>
              <input type={showPass2 ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••" required className="input-field pr-10 pl-10" />
            </Field>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
              <span className="text-orange-700 text-xs">📱 سنرسل كود تحقق على رقمك لتأكيد الهوية</span>
            </div>

            <button
              onClick={() => sendOtp(phone, 'CLIENT')}
              disabled={otpLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {otpLoading ? <><Loader2 size={20} className="animate-spin" /> جاري الإرسال...</> : '📱 إرسال كود التحقق →'}
            </button>
            <BackBtn onClick={() => setMode('welcome')} />
          </div>
        )}

        {/* Register Courier */}
        {mode === 'register-courier' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-center">تسجيل مندوب جديد</h2>
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
              <span className="text-orange-700 text-sm font-bold">🛵 بعد التسجيل هترفع صورة البطاقة عشان تبدأ</span>
            </div>
            <Field icon={<User size={17} />} label="الاسم الكامل">
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="محمد أحمد" required className="input-field pr-10" dir="rtl" />
            </Field>
            <Field icon={<Phone size={17} />} label="رقم التليفون">
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="01012345678" maxLength={11} dir="ltr" required className="input-field pr-10" />
            </Field>
            <Field icon={<MapPin size={17} />} label="عنوانك">
              <input type="text" value={address} onChange={e => setAddress(e.target.value)}
                placeholder="الحي، الشارع..." required className="input-field pr-10" dir="rtl" />
            </Field>
            <Field icon={<Lock size={17} />} label="الباسورد" extra={
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="6 أرقام/حروف على الأقل" required className="input-field pr-10 pl-10" />
            </Field>
            <Field icon={<Lock size={17} />} label="تأكيد الباسورد" extra={
              <button type="button" onClick={() => setShowPass2(!showPass2)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showPass2 ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }>
              <input type={showPass2 ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                placeholder="••••••••" required className="input-field pr-10 pl-10" />
            </Field>

            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
              <span className="text-orange-700 text-xs">📱 سنرسل كود تحقق على رقمك لتأكيد الهوية</span>
            </div>

            <button
              onClick={() => sendOtp(phone, 'COURIER')}
              disabled={otpLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {otpLoading ? <><Loader2 size={20} className="animate-spin" /> جاري الإرسال...</> : '📱 إرسال كود التحقق →'}
            </button>
            <BackBtn onClick={() => setMode('welcome')} />
          </div>
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
    <button type="submit" disabled={loading}
      className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-2">
      {loading ? <><Loader2 size={20} className="animate-spin" /> جاري التحميل...</> : label}
    </button>
  )
}

function BackBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center justify-center gap-1 text-gray-500 text-sm hover:text-gray-700 transition-colors">
      <ArrowLeft size={14} /> رجوع
    </button>
  )
}
