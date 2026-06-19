---
name: Supabase insert pattern
description: All Mandoubak Supabase tables require explicit id/timestamps — no DB-level defaults exist
---

## Rule
Every INSERT into any Supabase table must provide:
- `id: crypto.randomUUID()`
- `created_at: new Date().toISOString()`
- `updated_at: new Date().toISOString()`

This applies to: `orders`, `order_items`, `couriers`, and any new table.

**Why:** The Supabase schema was created without DEFAULT values for these columns (likely `uuid_generate_v4()` and `now()` were not set). PostgREST returns error code `23502` (not-null constraint) when these are missing.

**How to apply:** Before any `.insert()` call, ensure the data object includes all three fields. For `order_items`, the `order_id` is added after order creation.

## Admin credentials
- Phone: `01000000000` or `01276094983`
- Password: `admin123456`
- Hash algorithm: PBKDF2/SHA-256, 100000 iterations, 256 bits, stored as `saltHex:hashHex`

## DATABASE_URL warning
`DATABASE_URL` env var connects to Replit's own Postgres (`heliumdb`), NOT Supabase. To interact with Supabase data, use `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` via REST API or Supabase JS client.
