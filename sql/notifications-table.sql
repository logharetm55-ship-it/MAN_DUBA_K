-- =============================================================
-- Notifications Table Migration
-- شغّل هذا السكريبت في Supabase SQL Editor
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'system',
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  icon        TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-user lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- كل يوزر يشوف إشعاراته بس
CREATE POLICY "users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- الـ service role يكتب إشعارات
CREATE POLICY "service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- اليوزر يعلّم إشعاراته مقروءة
CREATE POLICY "users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid()::text = user_id::text);

-- تنظيف الإشعارات الأكتر من 30 يوم (اختياري - شغّله يدوياً أو كـ cron job)
-- DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '30 days';
