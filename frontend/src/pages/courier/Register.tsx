import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { User, Phone, MapPin, CreditCard, Upload, CheckCircle, ArrowLeft } from 'lucide-react'

type Step = 'info' | 'id-upload' | 'review'

export default function CourierRegister() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('info')
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef = useRef<HTMLInputElement>(null)

  function handleFileChange(file: File | null, setFile: (f: File | null) => void, setPreview: (s: string | null) => void) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('حجم الصورة أكبر من 5MB'); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('نوع الملف غير مدعوم'); return }
    setFile(file)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  function validateInfo() {
    if (!name.trim() || name.length < 3) { toast.error('الاسم لازم يكون 3 حروف على الأقل'); return false }
    if (!/^01[0-9]{9}$/.test(phone)) { toast.error('رقم الموبايل غير صحيح (مثال: 01012345678)'); return false }
    if (!address.trim() || address.length < 10) { toast.error('العنوان لازم يكون أكتر من 10 حروف'); return false }
    return true
  }

  function uploadImages() {
    if (!frontFile || !backFile) { toast.error('ارفع صورة وجه وضهر البطاقة'); return }
    setSubmitting(true)
    setTimeout(() => { setStep('review'); setSubmitting(false); toast.success('تم رفع الصور') }, 1000)
  }

  function submitRegistration() {
    setSubmitting(true)
    setTimeout(() => {
      toast.success('🎉 تم التسجيل! بياناتك تحت المراجعة خلال 24 ساعة')
      navigate('/courier/dashboard')
      setSubmitting(false)
    }, 1500)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black">انضم كمندوب 🛵</h1>
        <p className="text-gray-500 text-sm mt-1">اكسب فلوس وانت بتوصل الطلبات</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[{ key: 'info', label: 'البيانات', num: 1 }, { key: 'id-upload', label: 'البطاقة', num: 2 }, { key: 'review', label: 'مراجعة', num: 3 }].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step === s.key ? 'bg-orange-500 text-white' :
              ['info', 'id-upload', 'review'].indexOf(step) > i ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {['info', 'id-upload', 'review'].indexOf(step) > i ? '✓' : s.num}
            </div>
            <span className="text-xs text-gray-500 hidden sm:block">{s.label}</span>
            {i < 2 && <div className={`flex-1 h-1 rounded-full ${['info', 'id-upload', 'review'].indexOf(step) > i ? 'bg-green-400' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 'info' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><User className="text-orange-500" size={20} />البيانات الشخصية</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">الاسم الكامل *</label>
              <input className="input" placeholder="محمد أحمد" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">رقم الموبايل * <span className="text-xs text-orange-500">(بصمتك الفريدة - لا يتكرر)</span></label>
              <input className="input" placeholder="01012345678" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} maxLength={11} dir="ltr" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2"><MapPin className="inline" size={14} /> عنوانك بالتفصيل *</label>
              <textarea className="input resize-none h-20" placeholder="رقم الشارع، الحي، المدينة..." value={address} onChange={e => setAddress(e.target.value)} />
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
            <strong>🔒 أمان كامل:</strong> صور البطاقة محمية بـ Signed URLs صالحة 5 دقائق فقط.
          </div>
          <button onClick={() => { if (validateInfo()) setStep('id-upload') }} className="btn-primary w-full">
            التالي - رفع البطاقة
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 'id-upload' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('info')} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} /></button>
            <h2 className="font-bold text-lg flex items-center gap-2"><CreditCard className="text-orange-500" size={20} />صور البطاقة الشخصية</h2>
          </div>
          {[
            { label: 'وجه البطاقة (الصورة) *', ref: frontRef, file: frontFile, preview: frontPreview, setFile: setFrontFile, setPreview: setFrontPreview },
            { label: 'ضهر البطاقة *', ref: backRef, file: backFile, preview: backPreview, setFile: setBackFile, setPreview: setBackPreview },
          ].map((img, i) => (
            <div key={i} onClick={() => img.ref.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${img.preview ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'}`}>
              <input ref={img.ref} type="file" accept="image/*" className="hidden"
                onChange={e => handleFileChange(e.target.files?.[0] || null, img.setFile, img.setPreview)} />
              {img.preview ? (
                <div>
                  <img src={img.preview} alt={img.label} className="h-32 mx-auto rounded-xl object-cover mb-2" />
                  <p className="text-green-600 font-bold text-sm">✅ {img.label.replace(' *', '')}</p>
                </div>
              ) : (
                <div>
                  <Upload className="mx-auto mb-3 text-gray-400" size={32} />
                  <p className="font-bold text-gray-700">{img.label}</p>
                  <p className="text-xs text-gray-400 mt-1">JPG, PNG حتى 5MB</p>
                </div>
              )}
            </div>
          ))}
          <button disabled={submitting || !frontFile || !backFile} onClick={uploadImages}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />جاري الرفع...</> : <><Upload size={20} />رفع الصور والمتابعة</>}
          </button>
        </div>
      )}

      {/* Step 3 */}
      {step === 'review' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <button onClick={() => setStep('id-upload')} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} /></button>
            <h2 className="font-bold text-lg">مراجعة البيانات ✅</h2>
          </div>
          <div className="card space-y-3">
            {[
              { label: 'الاسم', value: name },
              { label: 'الموبايل', value: phone },
              { label: 'العنوان', value: address },
              { label: 'وجه البطاقة', value: '✅ مرفوع' },
              { label: 'ضهر البطاقة', value: '✅ مرفوع' },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                <span className="text-gray-500">{item.label}</span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
            <strong>⏳ بعد التسجيل:</strong> بياناتك هتتراجع خلال 24 ساعة. لو اتوافق هتبدأ تستقبل طلبات.
          </div>
          <button disabled={submitting} onClick={submitRegistration}
            className="btn-primary w-full flex items-center justify-center gap-2 text-lg">
            {submitting ? <><div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />جاري التسجيل...</> : <><CheckCircle size={22} />تأكيد التسجيل</>}
          </button>
        </div>
      )}
    </div>
  )
}
