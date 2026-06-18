-- =============================================================
-- Clerk Webhook Migration
-- شغّل الكود ده في Supabase SQL Editor مرة واحدة
-- عشان تضيف الأعمدة المطلوبة للـ webhook
-- =============================================================

-- إضافة اسم اليوزر لو مش موجود
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

-- إضافة avatar URL من Clerk
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Soft delete support
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================
-- Setup Instructions للـ Clerk Webhook
-- =============================================================
-- 1. روح Clerk Dashboard: https://dashboard.clerk.com
-- 2. اختار تطبيقك → Webhooks → Add Endpoint
-- 3. الـ Endpoint URL: https://YOUR-BACKEND-URL/api/webhooks/clerk
-- 4. اختار الأحداث دي:
--    - user.created
--    - user.updated
--    - user.deleted
-- 5. انسخ الـ Signing Secret وحطه في CLERK_WEBHOOK_SECRET
-- =============================================================
