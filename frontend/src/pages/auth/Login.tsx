// =============================================================
// Login / Register - تسجيل بالتليفون والباسورد والعنوان
// =============================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, Phone, Lock, MapPin, User, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
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

  if (isLoggedIn && user) {
    const dest = user.role === 'courier' ? '/courier/dashboard' : user.role === 'admin' ? '/admin-secret' : '/'
    navigate(dest, { replace: true })
    return null
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

  // ===== تسجيل عميل =====
  async function handleRegisterClient(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '')
    if (!/^01[0-9]{9}$/.test(cleanPhone)) { toast.error('رقم التليفون غلط'); return }
    if (password.length < 6) { toast.error('الباسورد لازم 6 أرقام/حروف على الأقل'); return }
    if (password !== confirmPass) { toast.error('الباسورد مش متطابق'); return }
    if (address.trim().length < 5) { toast.error('اكتب عنوانك بالتفصيل'); return }

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

  // ===== تسجيل مندوب =====
  async function handleRegisterCourier(e: React.FormEvent) {
    e.preventDefault()
    const cleanPhone = phone.replace(/\D/g, '')
    if (name.trim().length < 3) { toast.error('الاسم لازم 3 حروف على الأقل'); return }
    if (!/^01[0-9]{9}$/.test(cleanPhone)) { toast.error('رقم التليفون غلط'); return }
    if (address.trim().length < 5) { toast.error('اكتب عنوانك بالتفصيل'); return }
    if (password.length < 6) { toast.error('الباسورد لازم 6 أرقام/حروف على الأقل'); return }
    if (password !== confirmPass) { toast.error('الباسورد مش متطابق'); return }

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
          <form onSubmit={handleRegisterClient} className="space-y-4">
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
            <SubmitBtn loading={loading} label="سجّل وابدأ →" />
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
            <SubmitBtn loading={loading} label="سجّل كمندوب →" />
            <BackBtn onClick={() => setMode('welcome')} />
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
