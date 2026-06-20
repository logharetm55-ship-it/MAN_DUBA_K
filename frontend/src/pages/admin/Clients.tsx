// =============================================================
// Admin Clients - قائمة العملاء + نظام الحظر
// =============================================================

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Users, Phone, MapPin, Clock, Search, RefreshCw, Ban, ShieldCheck, Loader2 } from 'lucide-react'
import { useAuth } from '../../lib/auth-context'

interface Client {
  id: string
  name: string
  phone: string
  address: string
  last_seen_at: string
  created_at: string
  isActiveNow: boolean
  is_banned?: boolean
}

export default function AdminClients() {
  const { token } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [banning, setBanning] = useState<string | null>(null)
  const [showBanned, setShowBanned] = useState(false)

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

  async function toggleBan(client: Client) {
    if (!token) return
    const action = client.is_banned ? 'unban' : 'ban'
    const confirmMsg = client.is_banned
      ? `تأكيد رفع الحظر عن "${client.name || client.phone}"؟`
      : `تأكيد حظر "${client.name || client.phone}" نهائياً؟ لن يتمكن من الدخول أو تقديم طلبات.`
    if (!confirm(confirmMsg)) return

    setBanning(client.id)
    try {
      const res = await fetch(`/api/admin/clients/${client.id}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setClients(prev => prev.map(c =>
          c.id === client.id ? { ...c, is_banned: !client.is_banned } : c
        ))
        toast.success(client.is_banned ? '✅ تم رفع الحظر' : '🚫 تم حظر العميل')
      } else {
        toast.error(data.error || 'فشل العملية')
      }
    } catch {
      toast.error('مشكلة في الاتصال')
    } finally {
      setBanning(null)
    }
  }

  const filtered = clients
    .filter(c => !showBanned ? !c.is_banned : c.is_banned)
    .filter(c =>
      !search || c.name?.includes(search) || c.phone?.includes(search) || c.address?.includes(search)
    )

  const activeNow = clients.filter(c => c.isActiveNow && !c.is_banned).length
  const bannedCount = clients.filter(c => c.is_banned).length

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="text-green-500" size={28} />
          <div>
            <h1 className="text-2xl font-black">العملاء</h1>
            <p className="text-gray-500 text-sm">
              {clients.length - bannedCount} عميل | {activeNow} نشط | {bannedCount} محظور
            </p>
          </div>
        </div>
        <button onClick={loadClients} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <RefreshCw size={20} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="text-2xl font-black text-green-600">{clients.length - bannedCount}</div>
          <div className="text-sm text-gray-500">عميل نشط</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-black text-blue-600">{activeNow}</div>
          <div className="text-sm text-gray-500">متصل الآن</div>
          <div className="text-xs text-blue-400">(آخر 15 دقيقة)</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-black text-red-500">{bannedCount}</div>
          <div className="text-sm text-gray-500">محظور</div>
        </div>
      </div>

      {/* Filter + Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو التليفون..."
            className="input pr-10 w-full"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button onClick={() => setShowBanned(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!showBanned ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}>
            نشطون
          </button>
          <button onClick={() => setShowBanned(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showBanned ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'}`}>
            محظورون {bannedCount > 0 && `(${bannedCount})`}
          </button>
        </div>
      </div>

      {/* Clients List */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card animate-pulse h-20 bg-gray-100" />
        ))
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users size={48} className="mx-auto mb-3 opacity-30" />
          <p>{search ? 'مفيش نتائج للبحث ده' : showBanned ? 'مفيش عملاء محظورين' : 'مفيش عملاء مسجلين'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(client => (
            <div key={client.id} className={`card flex items-start justify-between gap-3 ${
              client.is_banned ? 'border-2 border-red-200 bg-red-50/30 opacity-80' :
              client.isActiveNow ? 'border-l-4 border-l-green-400' : ''
            }`}>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                    client.is_banned ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {client.is_banned
                      ? <Ban size={18} className="text-red-500" />
                      : <span className="text-blue-600 font-black">{(client.name || client.phone)[0]}</span>
                    }
                  </div>
                  {client.isActiveNow && !client.is_banned && (
                    <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">{client.name || 'عميل'}</h3>
                    {client.is_banned && (
                      <span className="text-xs bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">محظور</span>
                    )}
                  </div>
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

              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {/* زر الحظر / رفع الحظر */}
                <button
                  onClick={() => toggleBan(client)}
                  disabled={banning === client.id}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl transition-all ${
                    client.is_banned
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                >
                  {banning === client.id ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : client.is_banned ? (
                    <ShieldCheck size={12} />
                  ) : (
                    <Ban size={12} />
                  )}
                  {client.is_banned ? 'رفع الحظر' : 'حظر'}
                </button>

                {/* حالة النشاط */}
                {client.isActiveNow && !client.is_banned ? (
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">● نشط الآن</span>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={11} />
                    {client.last_seen_at
                      ? new Date(client.last_seen_at).toLocaleDateString('ar-EG')
                      : 'لم يدخل بعد'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
