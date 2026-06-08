// =============================================================
// API Client - كل الـ API Calls هنا
// =============================================================

const API_BASE = import.meta.env.VITE_API_URL || '/api'

async function request<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return data
}

// =====================
// Orders API
// =====================
export const ordersApi = {
  create: (body: CreateOrderBody, token: string) =>
    request('/orders', { method: 'POST', body: JSON.stringify(body) }, token),

  getPending: (token: string) =>
    request<{ orders: Order[]; fromCache: boolean }>('/orders/pending', {}, token),

  getMy: (token: string) =>
    request<{ orders: Order[] }>('/orders/my', {}, token),

  accept: (orderId: string, token: string) =>
    request<{ success: boolean; message: string }>(
      `/orders/${orderId}/accept`,
      { method: 'POST' },
      token
    ),

  updateStatus: (orderId: string, status: string, token: string) =>
    request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, token),
}

// =====================
// Pricing API
// =====================
export const pricingApi = {
  calculate: (params: { pickupLat: number; pickupLng: number; deliveryLat: number; deliveryLng: number }) => {
    const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
    return request<PriceEstimate>(`/pricing/calculate?${query}`)
  },

  getZones: () => request<{ zones: PricingZone[] }>('/pricing/zones'),
}

// =====================
// Upload API
// =====================
export const uploadApi = {
  uploadIdImages: async (frontFile: File, backFile: File, token: string) => {
    const formData = new FormData()
    formData.append('front', frontFile)
    formData.append('back', backFile)

    const res = await fetch(`${API_BASE}/upload-id`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  },
}

// =====================
// Admin API
// =====================
export const adminApi = {
  getDashboard: (token: string) => request('/admin/dashboard', {}, token),
  getCouriers: (token: string, status?: string) =>
    request(`/admin/couriers${status ? `?status=${status}` : ''}`, {}, token),
  approveCourier: (id: string, status: string, token: string) =>
    request(`/admin/couriers/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }, token),
  getPricing: (token: string) => request('/admin/pricing', {}, token),
  savePricing: (data: PricingInput, token: string) =>
    request('/admin/pricing', { method: 'POST', body: JSON.stringify(data) }, token),
  getAds: (token: string) => request('/admin/ads', {}, token),
  createAd: (data: AdInput, token: string) =>
    request('/admin/ads', { method: 'POST', body: JSON.stringify(data) }, token),
  updateAd: (id: string, data: Partial<AdInput>, token: string) =>
    request(`/admin/ads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }, token),
  getOrders: (token: string, status?: string, page?: number) =>
    request(`/admin/orders?${status ? `status=${status}&` : ''}page=${page || 1}`, {}, token),
}

// =====================
// Public API (no auth needed)
// =====================
export const publicApi = {
  getActiveAds: () => request<{ ads: AdOffer[] }>('/admin/ads?active=true'),
}

// =====================
// Types
// =====================
export type OrderStatus = 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED'
export type OrderType = 'SHOPPING' | 'DELIVERY'

export interface Order {
  id: string
  order_number: string
  type: OrderType
  status: OrderStatus
  pickup_lat: number
  pickup_lng: number
  delivery_lat: number
  delivery_lng: number
  pickup_details?: string
  delivery_details?: string
  distance_km?: number
  delivery_fee: number
  notes?: string
  created_at: string
  accepted_at?: string
  completed_at?: string
  order_items?: OrderItem[]
  couriers?: { name: string; phone: string; rating: number }
  ad_offers?: { title: string; shop_name: string }
}

export interface OrderItem {
  name: string
  quantity: number
  price?: number
  shop_name?: string
  shop_address?: string
}

export interface CreateOrderBody {
  type: OrderType
  pickupLat: number
  pickupLng: number
  deliveryLat: number
  deliveryLng: number
  pickupDetails?: string
  deliveryDetails?: string
  notes?: string
  items?: { name: string; quantity: number; shopName?: string; shopAddress?: string }[]
  adOfferId?: string
}

export interface PriceEstimate {
  estimate: {
    distanceKm: number
    zone: string
    deliveryFee: number
    breakdown: string
    currency: string
  }
}

export interface PricingZone {
  zone: string
  price_per_km: number
  minimum_fee: number
  maximum_fee?: number
}

export interface PricingInput {
  zone: string
  pricePerKm: number
  minimumFee: number
  maximumFee?: number
  isActive: boolean
}

export interface AdOffer {
  id: string
  title: string
  description?: string
  image_url: string
  shop_name: string
  shop_address: string
  shop_lat: number
  shop_lng: number
  product_name: string
  product_price?: number
  is_active: boolean
  click_count: number
  start_date: string
  end_date: string
}

export interface AdInput {
  title: string
  description?: string
  imageUrl: string
  shopName: string
  shopAddress: string
  shopLat: number
  shopLng: number
  productName: string
  productPrice?: number
  startDate: string
  endDate: string
}
