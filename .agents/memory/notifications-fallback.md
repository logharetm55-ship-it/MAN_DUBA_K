---
name: Notifications Fallback
description: How notifications work without a DB table — in-memory Map store as primary, DB as secondary
---

# Notifications Table Missing — In-Memory Fallback

## The Rule
The `notifications` table does NOT exist in Supabase (PGRST205 error).
`createNotification()` in `notifications.ts` uses a module-level `memStore: Map<string, Notification[]>` as primary storage.

**Why:** Supabase table creation requires direct DB access (PostgreSQL password) or Management API PAT. Neither is available in this Replit environment. The service role key cannot create tables via PostgREST (DDL not supported). Direct pg connection via pooler also fails (DNS ENOTFOUND for both port 5432 and 6543).

**How to apply:**
- `createNotification()` → writes to `memStore` first (synchronous), then tries DB insert (async, best-effort)
- `GET /api/notifications` → reads from DB first; on error merges with memStore  
- Notifications reset on backend restart (acceptable limitation for dev)
- To permanently fix: run `sql/notifications-table.sql` in Supabase SQL Editor once
