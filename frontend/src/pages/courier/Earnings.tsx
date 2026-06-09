import { useState } from 'react'
import { DollarSign, TrendingUp, Clock, Star, Truck, Award, ChevronDown, ChevronUp } from 'lucide-react'

const PERIODS = ['اليوم', 'هذا الأسبوع', 'هذا الشهر', 'كل الوقت']

const DEMO_SUMMARY = {
  'اليوم': { earnings: 285, deliveries: 9, avgFee: 32, hours: 6.5, rating: 4.9 },
  'هذا الأسبوع': { earnings: 1240, deliveries: 41, avgFee: 30, hours: 38, rating: 4.8 },
  'هذا الشهر': { earnings: 4850, deliveries: 158, avgFee: 31, hours: 142, rating: 4.8 },
  'كل الوقت': { earnings: 28600, deliveries: 892, avgFee: 32, hours: 820, rating: 4.8 },
}

const DEMO_TRANSACTIONS = [
  { id: 'ord-101', orderNumber: 'ORD-1718101', fee: 35, time: '11:45', type: 'SHOPPING', from: 'بيتزا كينج - التحرير', to: 'الزمالك', km: 3.2 },
  { id: 'ord-102', orderNumber: 'ORD-1718100', fee: 25, time: '10:20', type: 'DELIVERY', from: 'المعادي', to: 'حلوان', km: 2.1 },
  { id: 'ord-103', orderNumber: 'ORD-1718099', fee: 45, time: '09:05', type: 'SHOPPING', from: 'مطعم الشرق - نصر', to: 'المقطم', km: 4.8 },
  { id: 'ord-104', orderNumber: 'ORD-1718098', fee: 30, time: 'أمس 18:30', type: 'DELIVERY', from: 'الهرم', to: 'المهندسين', km: 3.5 },
  { id: 'ord-105', orderNumber: 'ORD-1718097', fee: 40, time: 'أمس 15:10', type: 'SHOPPING', from: 'كشري الحلوة', to: 'الدقي', km: 4.1 },
  { id: 'ord-106', orderNumber: 'ORD-1718096', fee: 20, time: 'أمس 12:50', type: 'DELIVERY', from: 'مصر الجديدة', to: 'عباسية', km: 1.8 },
]

export default function CourierEarnings() {
  const [period, setPeriod] = useState('اليوم')
  const [showAll, setShowAll] = useState(false)
  const summary = DEMO_SUMMARY[period as keyof typeof DEMO_SUMMARY]
  const transactions = showAll ? DEMO_TRANSACTIONS : DEMO_TRANSACTIONS.slice(0, 3)

  const dailyGoal = 500
  const progress = Math.min((summary.earnings / dailyGoal) * 100, 100)

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2">
          <DollarSign className="text-green-500" size={26} />
          الأرباح
        </h1>
        <p className="text-gray-500 text-sm">تابع مكسبك</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${period === p ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* Main Earnings Card */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-green-200">
        <div className="text-green-100 text-sm mb-1">{period}</div>
        <div className="text-5xl font-black mb-1">{summary.earnings.toLocaleString('ar-EG')}</div>
        <div className="text-green-100 text-lg">جنيه</div>

        {period === 'اليوم' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-green-100 mb-1">
              <span>الهدف اليومي</span>
              <span>{summary.earnings}/{dailyGoal} ج</span>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
            </div>
            <div className="text-xs text-green-100 mt-1 text-left">{progress.toFixed(0)}% من الهدف</div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Truck className="text-orange-500" size={20} />, label: 'طلبات', value: summary.deliveries, unit: 'طلب', bg: 'bg-orange-50' },
          { icon: <DollarSign className="text-green-500" size={20} />, label: 'متوسط الطلب', value: summary.avgFee, unit: 'ج', bg: 'bg-green-50' },
          { icon: <Clock className="text-blue-500" size={20} />, label: 'ساعات العمل', value: summary.hours, unit: 'ساعة', bg: 'bg-blue-50' },
          { icon: <Star className="text-yellow-500 fill-yellow-500" size={20} />, label: 'التقييم', value: summary.rating.toFixed(1), unit: '/ 5', bg: 'bg-yellow-50' },
        ].map((stat, i) => (
          <div key={i} className={`card ${stat.bg} border-0 p-4`}>
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs text-gray-500">{stat.label}</span></div>
            <div className="text-2xl font-black text-gray-900">{stat.value}<span className="text-sm text-gray-500 font-normal mr-1">{stat.unit}</span></div>
          </div>
        ))}
      </div>

      {/* Achievement */}
      {summary.deliveries >= 10 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="text-3xl">🏆</div>
          <div>
            <div className="font-bold text-purple-700">إنجاز!</div>
            <div className="text-sm text-purple-600">
              {summary.deliveries >= 100 ? 'مندوب نجم - أكتر من 100 طلب' : 'مندوب نشيط - أكتر من 10 طلبات'}
            </div>
          </div>
        </div>
      )}

      {/* Transactions */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-black">سجل الطلبات</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {transactions.map(t => (
            <div key={t.id} className="p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'SHOPPING' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                {t.type === 'SHOPPING' ? '🛒' : '🚚'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-gray-700 truncate">{t.from} → {t.to}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.time} • {t.km} كم</div>
              </div>
              <div className="text-green-600 font-black">+{t.fee} ج</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowAll(!showAll)}
          className="w-full py-3 flex items-center justify-center gap-1 text-sm font-bold text-gray-500 hover:bg-gray-50 transition-colors">
          {showAll ? <><ChevronUp size={16} /> عرض أقل</> : <><ChevronDown size={16} /> عرض المزيد</>}
        </button>
      </div>

      {/* Hourly rate insight */}
      <div className="card bg-blue-50 border-0">
        <h3 className="font-bold text-blue-800 mb-2">💡 تحليل سريع</h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div className="flex justify-between">
            <span>معدل الساعة</span>
            <span className="font-bold">{(summary.earnings / summary.hours).toFixed(0)} ج/ساعة</span>
          </div>
          <div className="flex justify-between">
            <span>أرباح لو اشتغلت 8 ساعات</span>
            <span className="font-bold">{((summary.earnings / summary.hours) * 8).toFixed(0)} ج</span>
          </div>
        </div>
      </div>
    </div>
  )
}
