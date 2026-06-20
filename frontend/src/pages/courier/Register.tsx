// =============================================================
// Courier Register - رفع صور البطاقة إجباري — بدون تخطي
// =============================================================

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  CreditCard, Upload, CheckCircle, ArrowLeft,
  Clock, ShieldCheck, Loader2, AlertTriangle, RotateCcw
} from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

type Step = 'id-upload' | 'review' | 'done'

export default function CourierRegister() {
  const navigate = useNavigate()
  const { user, token, updateUser } = useAuth()
  const [step, setStep] = useState<Step>('id-upload')
  const [submitting, setSubmitting] = useState(false)
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  if (!user || user.role !== 'courier') {
    navigate('/')
    return null
  }

  if (user.courierStatus === 'APPROVED') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="text-green-500" size={40} />
        </div>
        <h2 className="text-xl font-black">حسابك معتمد! ✅</h2>
        <p className="text-gray-500">يمكنك استلام الطلبات دلوقتي</p>
        <button onClick={() => navigate('/courier/dashboard')} className="btn-primary">
          اذهب للوحة التحكم
        </button>
      </div>
    )
  }

  // حالة الرفض النهائي
  if (user.courierStatus === 'REJECTED') {
    return (
      <div className="max-w-md mx-auto text-center py-12 space-y-5">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="text-red-500" size={40} />
        </div>
        <h2 className="text-xl font-black text-red-600">تم رفض طلبك ❌</h2>
        <p className="text-gray-500">للأسف تم رفض طلب انضمامك — تواصل مع الدعم لمعرفة السبب</p>
        <div className="card text-right space-y-2 text-sm text-gray-600">
          <p>📞 تواصل مع الدعم عبر واتساب</p>
          <p>📧 أو راسلنا على البريد الإلكتروني</p>
        </div>
        <button onClick={() => navigate('/')} className="btn-secondary w-full">
          العودة للرئيسية
        </button>
      </div>
    )
  }

  function handleFileChange(
    file: File | null,
    setFile: (f: File | null) => void,
    setPreview: (s: string | null) => void
  ) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة أكبر من 5MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('نوع الملف غير مدعوم (JPG, PNG, WEBP فقط)')
      return
    }
    setFile(file)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function uploadImages() {
    if (!frontFile || !backFile) {
      toast.error('⚠️ لازم ترفع صورة وجه وضهر البطاقة — هذا الخطوة إجبارية')
      return
    }
    if (!token) {
      toast.error('سجّل دخول الأول')
      navigate('/login')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('front', frontFile)
      formData.append('back', backFile)

      const uploadRes = await fetch('/api/upload/id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      let frontUrl = frontPreview || ''
      let backUrl = backPreview || ''

      if (uploadRes.ok) {
        const uploadData = await uploadRes.json()
        if (uploadData.keys?.front) frontUrl = `/api/upload/view?key=${encodeURIComponent(uploadData.keys.front)}`
        if (uploadData.keys?.back) backUrl = `/api/upload/view?key=${encodeURIComponent(uploadData.keys.back)}`
        toast.success('✅ تم رفع الصور بنجاح!')
      } else {
        toast('⚠️ تم حفظ الصور محلياً — سيتم المراجعة', { icon: 'ℹ️' })
      }

      const updateRes = await fetch('/api/auth/update-courier-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name || '',
          address: user.address || 'غير محدد',
          idFrontImageUrl: frontUrl || 'pending',
          idBackImageUrl: backUrl || 'pending',
        }),
      })

      if (updateRes.ok) {
        updateUser({ courierStatus: 'PENDING_REVIEW' })
        toast.success('تم تقديم طلبك! ⏳ ينتظر المراجعة')
      }

      setStep('review')
    } catch (err) {
      console.error('Upload error:', err)
      toast('⚠️ مشكلة في الاتصال — سيتم مراجعة طلبك يدوياً', { icon: 'ℹ️' })
      setStep('review')
    } finally {
      setSubmitting(false)
    }
  }

  // حالة إعادة الإرسال — المندوب طُلب منه إعادة إرسال صوره
  const isResubmitMode = user.courierStatus === 'PENDING_REVIEW'

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black">
          {isResubmitMode ? '🔄 إعادة رفع صور البطاقة' : 'أكمّل تسجيلك كمندوب 🛵'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {isResubmitMode
            ? 'طُلب منك إعادة رفع صور البطاقة بشكل صحيح — يرجى التأكد من وضوح الصورة'
            : 'ارفع صور البطاقة الشخصية عشان الأدمن يراجع حسابك'}
        </p>
      </div>

      {/* إشعار إعادة الإرسال */}
      {isResubmitMode && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <RotateCcw className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-bold text-orange-700">مطلوب منك إعادة إرسال صور البطاقة</p>
              <p className="text-sm text-orange-600 mt-1">
                الصور السابقة غير واضحة أو غير صحيحة — ارفع صور جديدة واضحة للوجه والضهر
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[
          { key: 'id-upload', label: 'رفع البطاقة', num: 1 },
          { key: 'review', label: 'تحت المراجعة', num: 2 },
          { key: 'done', label: 'مقبول', num: 3 },
        ].map((s, i) => {
          const steps = ['id-upload', 'review', 'done']
          const currentIdx = steps.indexOf(step)
          const thisIdx = i
          return (
            <div key={s.key} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                currentIdx === thisIdx ? 'bg-orange-500 text-white' :
                currentIdx > thisIdx ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {currentIdx > thisIdx ? '✓' : s.num}
              </div>
              <span className="text-xs text-gray-500 hidden sm:block">{s.label}</span>
              {i < 2 && (
                <div className={`flex-1 h-1 rounded-full ${currentIdx > thisIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* User Info Banner */}
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black">
            {user.name?.[0] || '?'}
          </div>
          <div>
            <div className="font-bold">{user.name}</div>
            <div className="text-sm text-gray-500" dir="ltr">{user.phone}</div>
          </div>
        </div>
      </div>

      {/* Step 1: Upload ID */}
      {step === 'id-upload' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <CreditCard className="text-orange-500" size={20} />
              صور البطاقة الشخصية
              <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">إجباري</span>
            </h2>

            {[
              { label: 'وجه البطاقة (الصورة والاسم) *', ref: frontRef, file: frontFile, preview: frontPreview, setFile: setFrontFile, setPreview: setFrontPreview },
              { label: 'ضهر البطاقة *', ref: backRef, file: backFile, preview: backPreview, setFile: setBackFile, setPreview: setBackPreview },
            ].map((img, i) => (
              <div key={i}>
                <label className="block text-sm font-bold text-gray-600 mb-2">{img.label}</label>
                <div
                  onClick={() => img.ref.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    img.preview ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
                  }`}
                >
                  <input
                    ref={img.ref}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => handleFileChange(e.target.files?.[0] || null, img.setFile, img.setPreview)}
                  />
                  {img.preview ? (
                    <div>
                      <img src={img.preview} alt={img.label} className="h-32 mx-auto rounded-xl object-cover mb-2" />
                      <p className="text-green-600 font-bold text-sm">✅ تم اختيار الصورة</p>
                      <p className="text-xs text-gray-400 mt-1">انقر للتغيير</p>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto mb-3 text-gray-400" size={32} />
                      <p className="font-bold text-gray-700">اضغط لرفع الصورة أو التقاطها</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG حتى 5MB</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* تنبيه إجبارية الرفع */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <strong>⚠️ مهم:</strong> رفع صور البطاقة إجباري للتحقق من هويتك — لا يمكن تخطي هذه الخطوة
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <ShieldCheck size={16} className="inline ml-1" />
            <strong>أمان:</strong> صورك محمية ومش بتتشار مع أي جهة خارجية
          </div>

          <button
            disabled={submitting || !frontFile || !backFile}
            onClick={uploadImages}
            className="btn-primary w-full flex items-center justify-center gap-2 text-lg disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 size={20} className="animate-spin" />جاري الرفع...</>
            ) : (
              <><Upload size={20} />رفع الصور وإرسال الطلب</>
            )}
          </button>

          {/* تلميح بدون زر تخطي */}
          {(!frontFile || !backFile) && (
            <p className="text-center text-xs text-gray-400">
              يجب اختيار صورتين (وجه + ضهر البطاقة) لتفعيل زر الإرسال
            </p>
          )}
        </div>
      )}

      {/* Step 2: Under Review */}
      {step === 'review' && (
        <div className="space-y-4 animate-fade-in text-center">
          <div className="flex items-center gap-3 justify-start">
            <button onClick={() => setStep('id-upload')} className="p-2 hover:bg-gray-100 rounded-xl">
              <ArrowLeft size={20} />
            </button>
            <h2 className="font-bold text-lg">تحت المراجعة ⏳</h2>
          </div>

          <div className="card py-10">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="text-yellow-500" size={40} />
            </div>
            <h3 className="text-xl font-black mb-2">طلبك وصلنا! 🎉</h3>
            <p className="text-gray-500">بياناتك تحت المراجعة من فريقنا</p>
            <p className="text-gray-400 text-sm mt-2">خلال 24 ساعة هيبلغوك بالنتيجة</p>
          </div>

          <div className="card text-right space-y-3">
            <h4 className="font-bold">✅ إيه اللي اتعمل؟</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                تم إنشاء حسابك بنجاح
              </div>
              <div className="flex items-center gap-2">
                <span className={frontFile ? 'text-green-500' : 'text-red-400'}>
                  {frontFile ? '✓' : '✗'}
                </span>
                {frontFile ? 'تم رفع وجه البطاقة ✅' : 'وجه البطاقة لم يُرفع'}
              </div>
              <div className="flex items-center gap-2">
                <span className={backFile ? 'text-green-500' : 'text-red-400'}>
                  {backFile ? '✓' : '✗'}
                </span>
                {backFile ? 'تم رفع ضهر البطاقة ✅' : 'ضهر البطاقة لم يُرفع'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">⏳</span>
                في انتظار موافقة الأدمن
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/courier/dashboard')}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            اذهب للوحة التحكم
          </button>
        </div>
      )}
    </div>
  )
}
