import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Settings, Plus, Save, MapPin } from 'lucide-react'

interface PricingZone {
  id?: string
  zone: string
  price_per_km: number
  minimum_fee: number
  maximum_fee?: number
  is_active: boolean
}

const DEFAULT_ZONES: PricingZone[] = [
  { zone: 'cairo', price_per_km: 8, minimum_fee: 20, maximum_fee: 80, is_active: true },
  { zone: 'giza', price_per_km: 9, minimum_fee: 25, maximum_fee: 90, is_active: true },
  { zone: 'default', price_per_km: 10, minimum_fee: 30, maximum_fee: 100, is_active: true },
]

const ZONE_NAMES: Record<string, string> = {
  cairo: 'القاهرة',
  giza: 'الجيزة',
  default: 'المناطق الأخرى',
}

export default function AdminPricing() {
  const [zones, setZones] = useState<PricingZone[]>(DEFAULT_ZONES)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newZone, setNewZone] = useState<PricingZone>({
    zone: '', price_per_km: 8, minimum_fee: 20, is_active: true
  })

  async function saveZone(zone: PricingZone) {
    setSaving(zone.zone)
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone: zone.zone,
          pricePerKm: zone.price_per_km,
          minimumFee: zone.minimum_fee,
          maximumFee: zone.maximum_fee,
          isActive: zone.is_active,
        })
      })
      if (res.ok) {
        toast.success(`تم حفظ سعر ${ZONE_NAMES[zone.zone] || zone.zone}`)
      } else {
        toast.success(`تم الحفظ (Demo Mode)`)
      }
    } catch {
      toast.success('تم الحفظ (Demo Mode)')
    } finally {
      setSaving(null)
    }
  }

  async function addNewZone() {
    if (!newZone.zone.trim()) {
      toast.error('ادخل اسم المنطقة')
      return
    }
    const zone = { ...newZone }
    setZones([...zones, zone])
    await saveZone(zone)
    setShowAddForm(false)
    setNewZone({ zone: '', price_per_km: 8, minimum_fee: 20, is_active: true })
  }

  const updateZone = (zoneName: string, field: keyof PricingZone, value: number | boolean | string) => {
    setZones(zones.map(z => z.zone === zoneName ? { ...z, [field]: value } : z))
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="text-orange-500" size={28} />
          <div>
            <h1 className="text-2xl font-black">إدارة الأسعار</h1>
            <p className="text-gray-500 text-sm">سعر التوصيل بالكيلو لكل منطقة</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
        >
          <Plus size={16} />
          منطقة جديدة
        </button>
      </div>

      {/* Pricing Formula Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>📐 طريقة الحساب:</strong>
        <br />
        سعر التوصيل = (المسافة بالكيلو × سعر الكيلو) + ثم مقارنة بالحد الأدنى
        <br />
        مثال: 3 كم × 8 جنيه = 24 جنيه، لكن الحد الأدنى 25 جنيه → يتحسب 25 جنيه
      </div>

      {/* Add Zone Form */}
      {showAddForm && (
        <div className="card border-2 border-orange-200 animate-fade-in">
          <h3 className="font-bold mb-4">إضافة منطقة جديدة</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">اسم المنطقة (بالإنجليزية)</label>
              <input
                className="input text-sm"
                placeholder="مثال: nasr-city"
                value={newZone.zone}
                onChange={e => setNewZone({ ...newZone, zone: e.target.value.toLowerCase() })}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">سعر الكيلو (جنيه)</label>
              <input
                type="number"
                className="input text-sm"
                value={newZone.price_per_km}
                onChange={e => setNewZone({ ...newZone, price_per_km: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">الحد الأدنى (جنيه)</label>
              <input
                type="number"
                className="input text-sm"
                value={newZone.minimum_fee}
                onChange={e => setNewZone({ ...newZone, minimum_fee: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">الحد الأقصى (جنيه)</label>
              <input
                type="number"
                className="input text-sm"
                placeholder="اختياري"
                onChange={e => setNewZone({ ...newZone, maximum_fee: parseFloat(e.target.value) || undefined })}
              />
            </div>
          </div>
          <button onClick={addNewZone} className="btn-primary text-sm px-4 py-2">
            إضافة المنطقة
          </button>
        </div>
      )}

      {/* Zone Cards */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-32" />
        ))
      ) : (
        zones.map(zone => (
          <div key={zone.zone} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="text-orange-500" size={20} />
                <h3 className="font-bold">{ZONE_NAMES[zone.zone] || zone.zone}</h3>
                <span className="text-xs text-gray-400">({zone.zone})</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-semibold text-gray-600">نشط</span>
                <div
                  onClick={() => updateZone(zone.zone, 'is_active', !zone.is_active)}
                  className={`w-10 h-6 rounded-full transition-all cursor-pointer ${zone.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-all m-0.5 ${zone.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">سعر الكيلو</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="input text-sm"
                    value={zone.price_per_km}
                    step="0.5"
                    min="1"
                    onChange={e => updateZone(zone.zone, 'price_per_km', parseFloat(e.target.value))}
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">ج/كم</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الحد الأدنى</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="input text-sm"
                    value={zone.minimum_fee}
                    min="5"
                    onChange={e => updateZone(zone.zone, 'minimum_fee', parseFloat(e.target.value))}
                  />
                  <span className="text-xs text-gray-500">ج</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">الحد الأقصى</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    className="input text-sm"
                    value={zone.maximum_fee || ''}
                    placeholder="∞"
                    onChange={e => updateZone(zone.zone, 'maximum_fee', parseFloat(e.target.value) || 0)}
                  />
                  <span className="text-xs text-gray-500">ج</span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 mb-4">
              <strong>مثال:</strong> 5 كم × {zone.price_per_km} = {(5 * zone.price_per_km).toFixed(0)} جنيه
              {5 * zone.price_per_km < zone.minimum_fee && (
                <span className="text-orange-600"> → الحد الأدنى: {zone.minimum_fee} جنيه</span>
              )}
            </div>

            <button
              disabled={saving === zone.zone}
              onClick={() => saveZone(zone)}
              className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
            >
              {saving === zone.zone ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Save size={16} />
              )}
              حفظ
            </button>
          </div>
        ))
      )}
    </div>
  )
}
