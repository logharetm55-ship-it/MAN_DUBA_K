---
name: Mandoubak Project State
description: Full state of the Mandoubak delivery platform — what's built, architecture, and key decisions
---

# All Pages Complete

## Client pages
- `/` — HomePage with ads grid, hero, stats (real data from Supabase)
- `/order` — 3-step order flow (type → addresses → confirm + price calc)
- `/my-orders` — order list with filter tabs + rating modal
- `/track/:id` — animated fake map + live order progress
- `/notifications` — notification list + unread count
- `/profile` — client profile (view/edit + stats)

## Courier pages
- `/courier/register` — 3-step registration (info → ID upload → review)
- `/courier/dashboard` — live order feed + accept with race condition simulation
- `/courier/profile` — stats + ratings card
- `/courier/earnings` — earnings dashboard with period selector (day/week/month/all)

## Admin pages
- `/admin` — overview stats dashboard
- `/admin/pricing` — pricing calculator config
- `/admin/ads` — manage restaurant/vendor ads
- `/admin/couriers` — approve/reject courier applications

## Auth (REAL CLERK + Demo Fallback)
- `/login` — Smart: uses Clerk SignIn when VITE_CLERK_PUBLISHABLE_KEY set, Demo Mode otherwise
- `lib/auth-context.tsx` — AuthContext + DemoAuthProvider + useAuth hook
- `lib/clerk-auth-inner.tsx` — ClerkAuthProviderInner (uses useUser/useClerk/useAuth from @clerk/clerk-react)
- `main.tsx` — wraps with ClerkProvider+ClerkAuthProviderInner or DemoAuthProvider based on key existence

## Layout
- Navbar: logo + desktop nav links + notification bell badge + user dropdown
- BottomNav: mobile-only, role-aware (different tabs per role)

# Backend (Hono.js + Node.js local, port 8787)

## Routes
- `GET /api/pricing/calculate` — حساب سعر التوصيل بـ Haversine + zone detection
- `GET /api/pricing/zones` — كل مناطق التسعير من DB
- `POST /api/orders` — create order (CLIENT only, validated)
- `GET /api/orders/pending` — pending orders (COURIER/ADMIN only, KV cached 3s)
- `POST /api/orders/:id/accept` — accept order (KV lock + DB SELECT FOR UPDATE NOWAIT)
- `GET /api/orders/my` — user's own orders
- `PATCH /api/orders/:id/status` — update status (courier ownership checked)
- `POST /api/couriers/register` — register courier
- `GET /api/couriers/profile` — courier profile
- `PATCH /api/couriers/online-status` — toggle availability
- `POST /api/couriers/rate/:orderId` — rate a courier
- `GET/POST /api/admin/pricing` — pricing management (ADMIN only)
- `GET/POST/PATCH/DELETE /api/admin/ads` — ads management (ADMIN only)
- `GET /api/admin/couriers` — list couriers
- `PATCH /api/admin/couriers/:id/approve` — approve/reject
- `GET /api/admin/orders` — all orders with pagination
- `POST /api/upload/id` — upload ID card images (R2)
- `GET /api/users/me` — current user profile (role from Supabase)
- `PATCH /api/users/me` — update name/phone
- `POST /api/webhooks/clerk` — Clerk webhook (user.created/updated/deleted → Supabase)

## Clerk Webhook
- No svix package (peer dep conflict) — implemented manual HMAC-SHA256 verification using Node.js `crypto`
- Spec: svix-id + svix-timestamp + svix-signature headers; signed content = `id.timestamp.body`
- Secret format: `whsec_<base64>` (strip prefix before HMAC)
- Soft deletes users (sets deleted_at) instead of hard delete

## Supabase Setup (CRITICAL LESSONS)
- **Zone names must match DB**: detectZone() returns Arabic ('القاهرة','الجيزة','default') — must match admin_pricing.zone column
- **Node.js 20 WebSocket fix**: backend/src/lib/supabase.ts uses `import ws from 'ws'` with `realtime: { transport: ws }` in createClient
- **All routes use getSupabaseClient()**: never call createClient() directly in routes — import from `lib/supabase.ts` singleton
- **Grants required**: must run `GRANT USAGE ON SCHEMA public TO service_role, anon, authenticated` + `GRANT ALL ON ALL TABLES` to service_role, SELECT to anon
- **VITE_ prefix**: frontend env vars must be VITE_SUPABASE_ANON_KEY and VITE_SUPABASE_URL — set via setEnvVars() not secrets
- **Anon key validation**: frontend checks `anonKey.startsWith('eyJ')` before calling Supabase, falls back to demo data otherwise
- **users table extra columns**: name, avatar_url, deleted_at must be added via sql/clerk-webhook-migration.sql

## Database (Supabase PostgreSQL)
- Project ref: klvceioawopljarpujnp
- RLS on all 9 tables (users, couriers, customers, addresses, orders, order_items, admin_pricing, ad_offers, courier_ratings)
- `accept_order()` function with SELECT FOR UPDATE NOWAIT (atomic, service_role only)
- Trigger: `update_courier_avg_rating` auto-updates courier.rating
- Seeded: 6 ad_offers + admin_pricing zones (default/القاهرة/الجيزة)

## Key decisions
**Why getSupabaseClient singleton:** prevents multiple RealtimeClient initializations per request
**Why ws package:** Node.js 20 lacks native WebSocket
**Why VITE_ env vars not secrets:** Vite build system only exposes VITE_-prefixed vars to frontend
**Why fallback to demo data:** anon key validity check prevents crashes when key is misconfigured
**Why manual HMAC for webhooks:** svix npm package has peer dep conflicts in this monorepo; Node crypto works identically
**Why ClerkAuthProviderInner in separate file:** Vite ESM doesn't allow require(); Clerk hooks must be statically imported in a component only rendered inside ClerkProvider — separate file keeps DemoAuthProvider isolated
**Why useAuth() for Clerk token:** In @clerk/clerk-react v5, getToken() is on the session via useAuth(), not on the UserResource object from useUser()
