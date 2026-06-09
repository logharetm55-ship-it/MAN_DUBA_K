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

## Key decisions
**Why Demo Mode:** Clerk requires real API keys, removed all Clerk imports to allow the app to run without setup. Auth state stored in localStorage.
**Why role-aware BottomNav:** Each user type (client/courier/admin/guest) gets different nav items optimized for their workflow.
