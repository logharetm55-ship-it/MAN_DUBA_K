// =============================================================
// Admin Clients - قائمة العملاء الحقيقية
// =============================================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Users, Phone, MapPin, Clock, Search, RefreshCw } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface Client {
  id: string
  name: string
  phone: string
  address: string
  last_seen_at: string
  created_at: string
  isActiveNow: boolean
}

export default function AdminClients() {
  const { token } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/clients', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      } else {
        toast.error('مقدرناش نجيب العملاء')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  const filtered = clients.filter(c =>
    !search || c.name?.includes(search) || c.phone?.includes(search) || c.address?.includes(search)
  )

  const activeNow = clients.filter(c => c.isActiveNow).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-green-500" size={28} />
          <div>
            <h1 className="text-2xl font-black">العملاء</h1>
            <p className="text-gray-500 text-sm">
              {clients.length} عميل | {activeNow} نشط دلوقتي
            </p>
          </div>
        </div>
        <button onClick={loadClients} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw size={20} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-black text-green-600">{clients.length}</div>
          <div className="text-sm text-gray-500">إجمالي العملاء</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-black text-blue-600">{activeNow}</div>
          <div className="text-sm text-gray-500">نشط الآن</div>
          <div className="text-xs text-blue-400">(آخر 15 دقيقة)</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو التليفون..."
          className="input pr-10 w-full"
        />
      </div>

      {/* Clients List */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-20 bg-gray-100" />
        ))
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>{search ? 'مفيش نتائج للبحث ده' : 'مفيش عملاء مسجلين لحد دلوقتي'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => (
            <div key={client.id} className={`card flex items-start justify-between ${
              client.isActiveNow ? 'border-l-4 border-l-green-400' : ''
            }`}>
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="w-11 h-11 bg-blue-100 rounded-xl flex items-center justify-center">
                    <span className="text-blue-600 font-black">{(client.name || client.phone)[0]}</span>
                  </div>
                  {client.isActiveNow && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{client.name || 'عميل'}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone size={11} />
                    <span dir="ltr">{client.phone}</span>
                  </div>
                  {client.address && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5 max-w-[200px]">
                      <MapPin size={11} className="flex-shrink-0" />
                      <span className="truncate">{client.address}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                {client.isActiveNow ? (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">● نشط الآن</span>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={11} />
                    {client.last_seen_at
                      ? new Date(client.last_seen_at).toLocaleDateString('ar-EG')
                      : 'لم يدخل بعد'}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  سجّل: {new Date(client.created_at).toLocaleDateString('ar-EG')}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
