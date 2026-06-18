---
name: Mandoubak project state
description: Complete delivery platform — custom JWT auth, real data, Arabic RTL UI, OTP phone verification, admin secure login
---

## Tech Stack
- Frontend: React + Vite (port 5000), Tailwind CSS, RTL Arabic
- Backend: Hono.js (port 8787), Supabase PostgreSQL
- Auth: Custom JWT (PBKDF2 password hashing via Web Crypto API, no Clerk)
- CSS utility classes: `.card`, `.btn-primary`, `.btn-secondary`, `.input`, `.input-field`

## Running Locally
- tsx must be installed globally: `npm install -g tsx` (backend devDep install fails but global works)
- backend/start.sh uses `tsx` (global) not `npx tsx` to avoid interactive prompt

## Auth System (NO CLERK)
- POST /api/auth/register — phone + password + role (CLIENT/COURIER) + address
- POST /api/auth/login — phone + password → JWT
- POST /api/auth/send-otp — generates 6-digit OTP, stores in KV (TTL 300s), returns dev_otp in dev mode
- POST /api/auth/verify-otp — checks OTP from KV, deletes on success
- POST /api/auth/create-admin — creates/upgrades user to ADMIN; requires adminSecret env var (default: mandoubak_admin_2024)
- JWT stored in localStorage as `mandoubak_token`, user as `mandoubak_user`
- JWT_SECRET defaults to 'mandoubak-jwt-secret-2024' if env not set
- backend/src/lib/jwt-utils.ts — PBKDF2 hash + HS256 JWT (Web Crypto API, zero deps)

## OTP Phone Verification
- Registration flow: fill form → send OTP → OTP step screen → verify → register completes
- In dev mode (no Twilio keys): dev_otp returned in API response AND shown in toast (15s duration)
- Twilio SMS: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE env vars to enable real SMS
- KV mock (in-memory Map) used in local dev for OTP storage with TTL

## Order Types (discriminated union in Zod)
- SHOPPING: up to 4 shops max, priced by num_shops (base_fee + (shops-1) × price_per_shop)
- DELIVERY: pickup/delivery addresses + phones, priced by distance (Haversine × price_per_km)

## Admin Access
- URL: /admin-secret — AdminGuard shows dark-themed login form if not logged in as admin
- Admin login: phone + password, checks role === ADMIN in JWT
- First admin creation: click "إنشاء أول حساب أدمن" in admin login → form with adminSecret
- POST /api/auth/create-admin with adminSecret (default: mandoubak_admin_2024)
- AdminGuard no longer uses localStorage mandoubak_admin_session hack — uses real JWT role
- 4 failed attempts → 30min localStorage lockout + POST /api/security/alert
- Admin layout has nav tabs: Dashboard, Orders, Couriers, Clients, Pricing, Ads
- /admin and /admin/* redirect to / (old paths hidden)

## Courier Flow
1. Register via /login (register-courier mode) → OTP → creates user + courier record (PENDING_REVIEW)
2. Navigate to /courier/register → upload ID card images (front + back via /api/upload)
3. Admin reviews via /admin-secret/couriers → approve/reject/suspend
4. Only APPROVED couriers see pending orders; 403 with courierStatus returned otherwise

## Admin Ads Page
- Fully connected to real API (/api/admin/ads) with Bearer token
- Create/toggle active/delete operations all use real endpoints
- Removed DEMO_ADS — all data from database

## Key Frontend Files
- `frontend/src/lib/auth-context.tsx` — token + user state, localStorage persistence
- `frontend/src/pages/auth/Login.tsx` — welcome/login/register-client/register-courier + OTP step
- `frontend/src/App.tsx` — AdminLoginForm (dark, with create admin) + AdminGuard + AdminLayout
- `frontend/src/pages/admin/Ads.tsx` — real API, useCallback for loadAds, no demo data

## Key Backend Files
- `backend/src/routes/auth.ts` — register + login + send-otp + verify-otp + create-admin + update-courier-info
- `backend/src/routes/orders.ts` — SHOPPING/DELIVERY creation + /pending + /accept
- `backend/src/routes/admin.ts` — couriers, clients, orders, security-alerts, pricing, ads
- `backend/src/middleware/auth.ts` — JWT verification + requireRole helper

## DB Schema additions (sql/password-auth-migration.sql)
- users: password_hash, address, last_seen_at
- orders: recipient_phone, num_shops
- admin_pricing: price_per_shop, base_fee_shopping
- security_alerts table: type, ip_address, user_agent, details, is_read

## Why custom JWT instead of Clerk
- Simpler for phone+password auth without Clerk phone verification setup
- PBKDF2 is secure, no external JWT library needed (Web Crypto API)
