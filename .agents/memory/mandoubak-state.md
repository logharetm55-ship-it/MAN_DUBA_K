---
name: Mandoubak Project State
description: Full state of the Mandoubak delivery platform — what's built, architecture, and key decisions
---

# All Pages Complete

## Client pages
- `/` — HomePage with ads grid, hero, stats
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

## Auth
- `/login` — Demo Mode role selector (client/courier/admin)
- Pure Demo Mode — no Clerk keys needed, stores role in localStorage
- `lib/auth-context.tsx` — AuthProvider + useAuth hook
- `lib/notifications-context.tsx` — NotificationsProvider + useNotifications

## Layout
- Navbar: logo + desktop nav links + notification bell badge + user dropdown
- BottomNav: mobile-only, role-aware (different tabs per role)
- Both in `components/Layout.tsx` and `components/BottomNav.tsx`

# Backend (Hono.js + Cloudflare Workers)

## Routes
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
- `GET/POST/PATCH/DELETE /api/admin/ads` — ads management (ADMIN only, strict validation)
- `GET /api/admin/couriers` — list couriers
- `PATCH /api/admin/couriers/:id/approve` — approve/reject
- `GET /api/admin/orders` — all orders with pagination
- `POST /api/upload/id` — upload ID card images (R2)
- `POST /api/upload/product` — upload product image (ADMIN only)
- `GET /api/upload/view` — serve image with signed URL + path traversal protection
- `GET /api/upload/signed/:key` — generate signed URL

## Security fixes applied
- CORS: dynamic origin check, supports Replit domains
- secureHeaders middleware added
- All JSON bodies wrapped in try/catch
- Admin ads PATCH uses `.strict()` schema + explicit field mapping (no raw spread)
- Order status PATCH verifies courier owns the order
- Upload routes: path traversal prevention, ADMIN-only product upload, ownership check
- Input validation on all IDs (length check)
- Pickup ≠ delivery validation
- Items capped at 50 per order
- Pagination page capped at 1000

## Database (Supabase PostgreSQL)
- RLS on all 9 tables
- `accept_order()` function with SELECT FOR UPDATE NOWAIT (atomic)
- REVOKE/GRANT on accept_order — service_role only
- Trigger: `update_courier_avg_rating` auto-updates courier.rating
- Performance indexes: orders(status), orders(client_id), orders(courier_id), couriers(status), ratings(courier_id), ads(is_active, end_date)
- User self-role-escalation prevented in RLS

## Key decisions
**Why Demo Mode:** Clerk requires real API keys. App runs without setup in Demo Mode.
**Why role-aware BottomNav:** Each user type gets optimized tab set.
**Why TypeScript `ReturnType<typeof setTimeout>[]`:** `NodeJS.Timeout` not available without @types/node — tsconfig only includes vite/client types.
**Why KV lock + DB lock:** KV is edge-layer (fast), DB SELECT FOR UPDATE is the true atomic guard. Two layers = maximum safety.
