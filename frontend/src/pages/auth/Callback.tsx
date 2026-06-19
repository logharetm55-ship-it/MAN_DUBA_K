// =============================================================
// Auth Callback - يتعامل مع PKCE (?code=) والـ implicit (#token)
// =============================================================

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/auth-context'
import type { AppUser } from '../../lib/auth-context'
import toast from 'react-hot-toast'

const API = '/api'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('جاري التحقق من رابط التأكيد...')
  const [newPassword, setNewPassword] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    try {
      // ===== قراءة hash fragment (#error=... أو #access_token=...) =====
      const hash = window.location.hash.substring(1)
      const hashParams = new URLSearchParams(hash)

      // ===== قراءة query params (?code=... أو ?error=...) =====
      const queryParams = new URLSearchParams(window.location.search)

      const errorCode = hashParams.get('error_code') || queryParams.get('error')
      const errorDesc = hashParams.get('error_description') || queryParams.get('error_description')
      const type = hashParams.get('type') || queryParams.get('type')
      const code = queryParams.get('code')

      console.log('[Callback] hash params:', Object.fromEntries(hashParams))
      console.log('[Callback] query params:', Object.fromEntries(queryParams))

      // ===== لو فيه error =====
      if (errorCode) {
        console.error('[Callback] error:', errorCode, errorDesc)
        let msg = 'الرابط ده منتهي الصلاحية أو اتستخدم قبل كده'
        if (errorCode === 'otp_expired') {
          msg = 'انتهت صلاحية الرابط — اطلب رابط تأكيد جديد'
        } else if (errorCode === 'access_denied') {
          msg = 'تم رفض الوصول — اطلب رابط جديد'
        }
        setErrorDetail(errorDesc || errorCode)
        setStatus('error')
        setMessage(msg)
        return
      }

      // ===== PKCE flow: ?code= في الـ query =====
      if (code) {
        console.log('[Callback] PKCE flow — exchanging code...')
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('[Callback] exchangeCodeForSession error:', error)
          setStatus('error')
          setMessage('فشل استبدال الكود — اطلب رابط جديد')
          return
        }

        if (type === 'recovery') {
          setShowPasswordForm(true)
          setStatus('success')
          setMessage('اكتب الباسورد الجديد')
          return
        }

        await syncAndRedirect(data.session!.access_token)
        return
      }

      // ===== Implicit flow: #access_token= في الـ hash =====
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (accessToken) {
        console.log('[Callback] Implicit flow — setting session from hash...')
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        })
        if (error) {
          console.error('[Callback] setSession error:', error)
          setStatus('error')
          setMessage('فشل تفعيل الجلسة — اطلب رابط جديد')
          return
        }

        if (type === 'recovery') {
          setShowPasswordForm(true)
          setStatus('success')
          setMessage('اكتب الباسورد الجديد')
          return
        }

        await syncAndRedirect(data.session!.access_token)
        return
      }

      // ===== Fallback: انتظر auth state change =====
      console.log('[Callback] No code or token — waiting for auth state...')
      setMessage('جاري انتظار التأكيد...')

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        if (type === 'recovery') {
          setShowPasswordForm(true)
          setStatus('success')
          setMessage('اكتب الباسورد الجديد')
          return
        }
        await syncAndRedirect(session.access_token)
      } else {
        setStatus('error')
        setMessage('لم يتم العثور على جلسة — اطلب رابط تأكيد جديد')
      }
    } catch (err) {
      console.error('[Callback] unexpected error:', err)
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
        console.error('[Callback] sync error:', data)
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
    } catch (e) {
      console.error('[Callback] sync fetch error:', e)
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
      if (error) { toast.error(error.message || 'فشل تغيير الباسورد'); return }
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50" dir="rtl">
      <div className="w-full max-w-sm space-y-6 text-center">

        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto shadow-xl
          ${status === 'loading' ? 'bg-orange-100' : status === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
          {status === 'loading' && <Loader2 className="text-orange-500 animate-spin" size={48} />}
          {status === 'success' && <CheckCircle className="text-green-500" size={48} />}
          {status === 'error' && <XCircle className="text-red-500" size={48} />}
        </div>

        <div>
          <h1 className="text-2xl font-black text-gray-900">
            {status === 'loading' ? 'لحظة...'
              : status === 'success' && showPasswordForm ? 'باسورد جديد'
              : status === 'success' ? '🎉 تم التأكيد!'
              : 'حصل مشكلة'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">{message}</p>
          {errorDetail && (
            <p className="text-red-400 text-xs mt-1 font-mono">{errorDetail}</p>
          )}
        </div>

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
            <button type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95">
              حفظ الباسورد الجديد ✅
            </button>
          </form>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
            >
              رجوع لتسجيل الدخول
            </button>
            <p className="text-gray-400 text-xs">
              سجّل من جديد بنفس الإيميل عشان يبعتلك رابط جديد
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
