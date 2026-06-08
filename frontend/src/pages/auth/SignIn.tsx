import { SignIn } from '@clerk/clerk-react'
import { Truck } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="text-white" size={24} />
            </div>
            <span className="text-3xl font-black text-gray-900">مندوبك</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900">أهلاً بيك!</h1>
          <p className="text-gray-500 mt-1">سجل دخولك عشان تكمل</p>
        </div>
        <div className="flex justify-center">
          <SignIn
            routing="hash"
            afterSignInUrl="/"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'shadow-xl rounded-2xl border-0 w-full',
                headerTitle: 'font-black',
                formButtonPrimary: 'bg-orange-500 hover:bg-orange-600 rounded-xl',
                footerActionLink: 'text-orange-500',
              }
            }}
          />
        </div>
        <p className="text-center text-sm text-gray-500">
          مش عندك حساب؟{' '}
          <Link to="/sign-up" className="text-orange-500 font-bold hover:underline">
            سجل دلوقتي
          </Link>
        </p>
      </div>
    </div>
  )
}
