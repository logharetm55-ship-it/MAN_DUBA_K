import { useNavigate } from 'react-router-dom'
import { Truck, User, ShieldCheck } from 'lucide-react'
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

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()

  function handleLogin(role: UserRole) {
    login(role)
    const destinations: Record<string, string> = {
      client: '/',
      courier: '/courier/dashboard',
      admin: '/admin',
    }
    toast.success(`أهلاً! دخلت كـ ${role === 'client' ? 'عميل' : role === 'courier' ? 'مندوب' : 'أدمن'} 👋`)
    navigate(destinations[role!] || '/')
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200">
            <Truck className="text-white" size={36} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">مندوبك</h1>
          <p className="text-gray-500 mt-2">اختار نوع حسابك عشان تبدأ</p>
        </div>

        {/* Demo Mode Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <div className="text-amber-700 font-bold text-sm mb-1">🎮 Demo Mode</div>
          <div className="text-amber-600 text-xs">بتجرب التطبيق بدون تسجيل حقيقي</div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          {ROLES.map(r => (
            <button
              key={r.role}
              onClick={() => handleLogin(r.role)}
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
                <div className="text-green-500 font-bold text-xs bg-green-100 px-2 py-1 rounded-full">
                  ✓ الحالي
                </div>
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
