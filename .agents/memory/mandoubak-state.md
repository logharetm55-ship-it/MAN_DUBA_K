---
name: Mandoubak project state
description: Complete delivery platform — custom JWT auth, real data, Arabic RTL UI, OTP phone verification, admin secure login with logout
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
- POST /api/auth/send-otp — generates 6-digit OTP, stored in KV (TTL 300s); dev_otp is console.log only (NOT in API response)
- POST /api/auth/verify-otp — checks OTP from KV, deletes on success
- POST /api/auth/create-admin — creates/upgrades user to ADMIN; requires adminSecret (default: mandoubak_admin_2024)
- JWT stored in localStorage as `mandoubak_token`, user as `mandoubak_user`
- JWT_SECRET defaults to 'mandoubak-jwt-secret-2024' if env not set
- backend/src/lib/jwt-utils.ts — PBKDF2 hash + HS256 JWT (Web Crypto API, zero deps)

## OTP Phone Verification
- Registration flow: fill form → send OTP → OTP step screen → verify → register completes
- dev_otp is ONLY logged to server console (never returned in API response, never shown in frontend)
- Twilio SMS: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE env vars to enable real SMS
- KV mock (in-memory Map) used in local dev for OTP storage with TTL

## Notifications System
- Backend: GET /api/notifications, POST /api/notifications/read/:id, POST /api/notifications/read-all
- Table: sql/notifications-table.sql — run in Supabase SQL Editor to create (graceful fallback if missing)
- Frontend: frontend/src/lib/notifications-context.tsx — polls /api/notifications every 30s, clears on logout
- Notifications created automatically: order placed → client notified; courier accepts → client notified; status change (PICKED_UP/DELIVERED/CANCELLED) → client notified
- All notification creation is best-effort (does not fail main operation if DB table missing)

## Order Types (discriminated union in Zod)
- SHOPPING: up to 4 shops max, priced by num_shops (base_fee + (shops-1) × price_per_shop)
- DELIVERY: pickup/delivery addresses + phones, priced by distance (Haversine × price_per_km)

## Admin Access
- URL: /admin-secret — AdminGuard shows dark-themed login form if not logged in as admin
- Admin login: phone + password, checks role === ADMIN in JWT
- First admin creation: click "إنشاء أول حساب أدمن" in admin login → form with adminSecret
- POST /api/auth/create-admin with adminSecret (default: mandoubak_admin_2024)
- AdminGuard uses real JWT role check (no localStorage hack)
- 4 failed attempts → 30min localStorage lockout + POST /api/security/alert
- Admin layout has nav tabs: Dashboard, Orders, Couriers, Clients, Pricing, Ads
- Admin layout has logout button (top right, calls logout() → redirects to /)
- /admin and /admin/* redirect to / (old paths hidden)

## Courier Flow
1. Register via /login (register-courier mode) → OTP → creates user + courier record (PENDING_REVIEW)
2. Navigate to /courier/register → upload ID card images (front + back via /api/upload)
3. Admin reviews via /admin-secret/couriers → approve/reject/suspend
4. Only APPROVED couriers see pending orders; 403 with courierStatus returned otherwise

## MyOrders Page
- Real data from GET /api/orders/my (no demo/fake orders)
- Auto-refreshes every 15s when there are active orders (PENDING/ACCEPTED/PICKED_UP)
- Shows courier info + call button when order accepted
- Rate courier button for DELIVERED orders
- Progress bar with steps: Pending → Accepted → Picked Up → Delivered

## Key Frontend Files
- `frontend/src/lib/auth-context.tsx` — token + user state, localStorage persistence
- `frontend/src/lib/notifications-context.tsx` — real API polling, not demo data
- `frontend/src/pages/auth/Login.tsx` — welcome/login/register-client/register-courier + OTP step
- `frontend/src/pages/MyOrders.tsx` — real API, no DEMO_ORDERS, auto-refresh
- `frontend/src/App.tsx` — AdminLoginForm + AdminGuard + AdminLayout (with logout button)

## Key Backend Files
- `backend/src/routes/auth.ts` — register + login + send-otp (no dev_otp in response) + verify-otp + create-admin
- `backend/src/routes/orders.ts` — SHOPPING/DELIVERY + /pending + /accept + /status (all emit notifications)
- `backend/src/routes/notifications.ts` — GET/read/read-all + createNotification helper
- `backend/src/routes/admin.ts` — couriers, clients, orders, security-alerts, pricing, ads
- `backend/src/middleware/auth.ts` — JWT verification + requireRole helper

## DB Schema (sql/ files)
- sql/password-auth-migration.sql — users: password_hash, address; orders: recipient_phone, num_shops; security_alerts table
- sql/notifications-table.sql — notifications table with RLS (run in Supabase SQL Editor)

## Why custom JWT instead of Clerk
- Simpler for phone+password auth without Clerk phone verification setup
- PBKDF2 is secure, no external JWT library needed (Web Crypto API)
