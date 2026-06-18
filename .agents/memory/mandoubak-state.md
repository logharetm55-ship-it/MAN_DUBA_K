---
name: Mandoubak project state
description: Complete delivery platform — custom JWT auth, real data, Arabic RTL UI, admin hidden page
---

## Tech Stack
- Frontend: React + Vite (port 5000), Tailwind CSS, RTL Arabic
- Backend: Hono.js (port 8787), Supabase PostgreSQL
- Auth: Custom JWT (PBKDF2 password hashing via Web Crypto API, no Clerk)
- CSS utility classes: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.input-field`

## Auth System (NO CLERK)
- POST /api/auth/register — phone + password + role (CLIENT/COURIER) + address
- POST /api/auth/login — phone + password → JWT
- JWT stored in localStorage as `mandoubak_token`, user as `mandoubak_user`
- JWT_SECRET defaults to 'mandoubak-jwt-secret-2024' if env not set
- backend/src/lib/jwt-utils.ts — PBKDF2 hash + HS256 JWT (Web Crypto API, zero deps)

## Order Types (discriminated union in Zod)
- SHOPPING: up to 4 shops max, priced by num_shops (base_fee + (shops-1) × price_per_shop)
- DELIVERY: pickup/delivery addresses + phones, priced by distance (Haversine × price_per_km)

## Admin Access (HIDDEN)
- URL: /admin-secret (AdminGuard component — must have role=admin in token)
- Hidden entry: 6 clicks on the مندوبك logo → AdminLoginModal pops up
- Credentials: username="sallam", password="255009" (frontend-only check in Layout.tsx)
- 4 failed attempts → 30min localStorage lockout + POST /api/security/alert
- Admin layout has nav tabs: Dashboard, Orders, Couriers, Clients, Pricing, Ads
- /admin and /admin/* redirect to / (old paths hidden)

## Courier Flow
1. Register via /login (register-courier mode) → creates user + courier record (PENDING_REVIEW)
2. Navigate to /courier/register → upload ID card images (front + back via /api/upload)
3. Admin reviews via /admin-secret/couriers → approve/reject/suspend
4. Only APPROVED couriers see pending orders; 403 with courierStatus returned otherwise

## Key Frontend Files
- `frontend/src/lib/auth-context.tsx` — token + user state, localStorage persistence
- `frontend/src/pages/auth/Login.tsx` — 4 modes: welcome/login/register-client/register-courier
- `frontend/src/components/Layout.tsx` — 6-click logo trick, AdminLoginModal, no admin link in nav
- `frontend/src/App.tsx` — /admin-secret guarded routes + AdminLayout component
- `frontend/src/pages/OrderPage.tsx` — SHOPPING (ShopCard × 4) + DELIVERY (A→B with phones)
- `frontend/src/pages/admin/Dashboard.tsx` — real API stats
- `frontend/src/pages/admin/Couriers.tsx` — real approve/reject/suspend
- `frontend/src/pages/admin/Clients.tsx` — real client list with active status
- `frontend/src/pages/admin/Orders.tsx` — real orders with pagination + filters
- `frontend/src/pages/courier/Dashboard.tsx` — real API, NO demo data, 15s auto-refresh
- `frontend/src/pages/courier/Register.tsx` — ID upload then review step

## Key Backend Files
- `backend/src/routes/auth.ts` — /api/auth/register + /api/auth/login
- `backend/src/routes/orders.ts` — SHOPPING/DELIVERY creation + /pending + /accept
- `backend/src/routes/admin.ts` — couriers, clients, orders, security-alerts, pricing, ads
- `backend/src/middleware/auth.ts` — JWT verification + requireRole helper

## No Demo Data
- All demo/fake orders removed from CourierDashboard (was DEMO_PENDING array)
- All admin pages use real API calls
- Courier Dashboard auto-refreshes every 15s from /api/orders/pending

## DB Schema additions (sql/password-auth-migration.sql)
- users: password_hash, address, last_seen_at
- orders: recipient_phone, num_shops
- admin_pricing: price_per_shop, base_fee_shopping
- security_alerts table: type, ip_address, user_agent, details, is_read

## Why custom JWT instead of Clerk
- Simpler for phone+password auth without Clerk phone verification setup
- PBKDF2 is secure, no external JWT library needed (Web Crypto API)
