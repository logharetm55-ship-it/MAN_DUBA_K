import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Truck, ArrowRight } from 'lucide-react'
import { SignIn } from '@clerk/clerk-react'
import { useAuth, UserRole } from '../../lib/auth-context'
import toast from 'react-hot-toast'

const ROLES = [
  {
    role: 'client' as UserRole,
    icon: '👤',
    title: 'عميل',
    desc: 'اطلب واتابع التوصيل',
    color: 'border-blue-400 bg-blue-50 hover:bg-blue-100',
    badge: 'bg-blue-500',
  },
  {
    role: 'courier' as UserRole,
    icon: '🛵',
    title: 'مندوب',
    desc: 'استقبل واكسب من الطلبات',
    color: 'border-orange-400 bg-orange-50 hover:bg-orange-100',
    badge: 'bg-orange-500',
  },
  {
    role: 'admin' as UserRole,
    icon: '🛡️',
    title: 'أدمن',
    desc: 'إدارة كاملة للمنصة',
    color: 'border-purple-400 bg-purple-50 hover:bg-purple-100',
    badge: 'bg-purple-500',
  },
]

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export default function LoginPage() {
  if (CLERK_PUBLISHABLE_KEY) {
    return <ClerkLoginPage />
  }
  return <DemoLoginPage />
}

// ==============================
// Demo Mode Login
// ==============================
function DemoLoginPage() {
  const { demoLogin, user } = useAuth()
  const navigate = useNavigate()

  function handleDemoLogin(role: UserRole) {
    demoLogin?.(role)
    const destinations: Record<string, string> = {
      client: '/', courier: '/courier/dashboard', admin: '/admin',
    }
    toast.success(`أهلاً! دخلت كـ ${role === 'client' ? 'عميل' : role === 'courier' ? 'مندوب' : 'أدمن'} 👋`)
    navigate(destinations[role!] || '/')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200">
            <Truck className="text-white" size={36} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">مندوبك</h1>
          <p className="text-gray-500 mt-2">اختار نوع حسابك عشان تبدأ</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <div className="text-amber-700 font-bold text-sm mb-1">🎮 Demo Mode</div>
          <div className="text-amber-600 text-xs">بتجرب التطبيق بدون تسجيل حقيقي</div>
        </div>

        <div className="space-y-3">
          {ROLES.map(r => (
            <button
              key={r.role}
              onClick={() => handleDemoLogin(r.role)}
              className={`w-full border-2 rounded-2xl p-5 flex items-center gap-4 transition-all text-right ${r.color} ${user?.role === r.role ? 'ring-2 ring-offset-2 ring-current' : ''}`}
            >
              <div className={`w-14 h-14 rounded-2xl ${r.badge} flex items-center justify-center flex-shrink-0 text-2xl shadow-md`}>
                {r.icon}
              </div>
              <div className="flex-1">
                <div className="font-black text-lg text-gray-900">{r.title}</div>
                <div className="text-sm text-gray-500">{r.desc}</div>
              </div>
              {user?.role === r.role && (
                <span className="text-green-500 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">✓ الحالي</span>
              )}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">
          في الإنتاج بيستخدم Clerk للـ Auth مع Google / موبايل OTP
        </p>
      </div>
    </div>
  )
}

// ==============================
// Clerk Real Login Page
// ==============================
function ClerkLoginPage() {
  const { isLoggedIn, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isLoggedIn && user) {
      const destinations: Record<string, string> = {
        client: '/', courier: '/courier/dashboard', admin: '/admin',
      }
      navigate(destinations[user.role!] || '/', { replace: true })
    }
  }, [isLoggedIn, user, navigate])

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200">
            <Truck className="text-white" size={36} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">مندوبك</h1>
          <p className="text-gray-500 mt-2">سجّل دخولك عشان تبدأ</p>
        </div>

        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-xl rounded-2xl border border-gray-100 w-full',
                headerTitle: 'font-black text-xl text-gray-900',
                formButtonPrimary: 'bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl',
                formFieldInput: 'rounded-xl border-gray-200',
                footerActionLink: 'text-orange-500 hover:text-orange-600 font-bold',
              },
              variables: {
                colorPrimary: '#f97316',
                fontFamily: 'Cairo, sans-serif',
                borderRadius: '12px',
              },
            }}
            fallbackRedirectUrl="/"
            signUpFallbackRedirectUrl="/"
          />
        </div>

        <button
          onClick={() => navigate(-1)}
          className="w-full flex items-center justify-center gap-2 text-gray-500 text-sm hover:text-gray-700 transition-colors"
        >
          <ArrowRight size={16} />
          رجوع
        </button>
      </div>
    </div>
  )
}
