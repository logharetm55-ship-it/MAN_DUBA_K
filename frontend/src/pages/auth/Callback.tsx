// =============================================================
// Auth Callback - معالجة تأكيد الإيميل من Supabase
// =============================================================

import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth-context'
import type { AppUser } from '../../lib/auth-context'
import toast from 'react-hot-toast'

const API = '/api'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('جاري التحقق...')
  const [newPassword, setNewPassword] = useState('')
  const [isRecovery, setIsRecovery] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      const type = searchParams.get('type')
      const code = searchParams.get('code')
      const errorParam = searchParams.get('error')
      const errorDesc = searchParams.get('error_description')

      // لو فيه error في الـ URL
      if (errorParam) {
        setStatus('error')
        setMessage(errorDesc || 'حصل خطأ في التحقق')
        return
      }

      // exchange code for session (PKCE flow)
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('error')
          setMessage('الرابط ده اتستخدم قبل كده أو منتهي الصلاحية')
          return
        }

        const session = data.session
        if (!session) {
          setStatus('error')
          setMessage('فشل استرداد الجلسة')
          return
        }

        // لو recovery (استعادة باسورد)
        if (type === 'recovery') {
          setIsRecovery(true)
          setShowPasswordForm(true)
          setStatus('success')
          setMessage('اكتب الباسورد الجديد')
          return
        }

        // تأكيد إيميل عادي → مزامنة مع الباكند
        await syncAndRedirect(session.access_token)
        return
      }

      // fallback: تحقق من session موجودة
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (type === 'recovery') {
          setIsRecovery(true)
          setShowPasswordForm(true)
          setStatus('success')
          setMessage('اكتب الباسورد الجديد')
          return
        }
        await syncAndRedirect(session.access_token)
      } else {
        setStatus('error')
        setMessage('الرابط منتهي الصلاحية — سجل دخول من جديد')
      }
    } catch (err) {
      console.error('Auth callback error:', err)
      setStatus('error')
      setMessage('حصل خطأ غير متوقع')
    }
  }

  async function syncAndRedirect(accessToken: string) {
    setMessage('جاري إعداد حسابك...')
    try {
      const res = await fetch(`${API}/auth/sync-email-user`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setMessage(data.error || 'فشل إعداد الحساب')
        return
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

      setStatus('success')
      setMessage('تم التأكيد بنجاح! 🎉')
      toast.success(`أهلاً ${appUser.name}! 👋`)

      setTimeout(() => {
        const dest = appUser.role === 'courier'
          ? '/courier/register'
          : appUser.role === 'admin' ? '/admin-secret' : '/'
        navigate(dest, { replace: true })
      }, 1500)
    } catch {
      setStatus('error')
      setMessage('مشكلة في الاتصال — جرب تاني')
    }
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error('الباسورد لازم 8 حروف على الأقل')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast.error(error.message || 'فشل تغيير الباسورد')
        return
      }

      // بعد تغيير الباسورد → مزامنة وتوجيه
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        await syncAndRedirect(session.access_token)
      } else {
        toast.success('تم تغيير الباسورد! سجل دخول من جديد')
        navigate('/login', { replace: true })
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="w-full max-w-sm space-y-6 text-center">

        {/* الأيقونة */}
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-xl
          ${status === 'loading' ? 'bg-orange-100' : status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}
        >
          {status === 'loading' && <Loader2 className="text-orange-500 animate-spin" size={48} />}
          {status === 'success' && !showPasswordForm && <CheckCircle className="text-green-500" size={48} />}
          {status === 'success' && showPasswordForm && <CheckCircle className="text-green-500" size={48} />}
          {status === 'error' && <XCircle className="text-red-500" size={48} />}
        </div>

        {/* الرسالة */}
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {status === 'loading' ? 'لحظة...' : status === 'success' && showPasswordForm ? 'باسورد جديد' : status === 'success' ? '🎉 تم التأكيد!' : 'حصل مشكلة'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">{message}</p>
        </div>

        {/* فورم الباسورد الجديد (recovery) */}
        {showPasswordForm && (
          <form onSubmit={handlePasswordUpdate} className="space-y-4 text-right">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">الباسورد الجديد</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="8 حروف على الأقل"
                required
                minLength={8}
                className="input-field w-full"
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              حفظ الباسورد الجديد ✅
            </button>
          </form>
        )}

        {/* زر الرجوع في حالة الخطأ */}
        {status === 'error' && (
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
          >
            رجوع لتسجيل الدخول
          </button>
        )}
      </div>
    </div>
  )
}
