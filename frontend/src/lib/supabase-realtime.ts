// =============================================================
// Supabase Realtime - الأوردرات Live للمناديب
// =============================================================

import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Order } from './api'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
)

export type RealtimeOrderEvent = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  order: Order
}

let channel: RealtimeChannel | null = null

/**
 * الاشتراك في تحديثات الأوردرات Live
 * لما يجي أوردر جديد أو يتحجز، كل المناديب يشوفوا التغيير فوراً
 */
export function subscribeToOrders(
  onEvent: (event: RealtimeOrderEvent) => void
): () => void {
  // فصل أي channel قديم
  if (channel) {
    supabase.removeChannel(channel)
  }

  channel = supabase
    .channel('orders-live')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: 'status=eq.PENDING'
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          onEvent({ type: 'INSERT', order: payload.new as Order })
        } else if (payload.eventType === 'UPDATE') {
          onEvent({ type: 'UPDATE', order: payload.new as Order })
        } else if (payload.eventType === 'DELETE') {
          onEvent({ type: 'DELETE', order: payload.old as Order })
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ متصل بـ Realtime - الأوردرات Live')
      }
    })

  // إرجاع cleanup function
  return () => {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }
}

/**
 * الاشتراك في تحديثات أوردر معين (للعميل يتابع أوردره)
 */
export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: Order) => void
): () => void {
  const orderChannel = supabase
    .channel(`order-${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      },
      (payload) => {
        onUpdate(payload.new as Order)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(orderChannel)
}
