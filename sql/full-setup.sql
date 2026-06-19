-- =============================================================
-- مندوبك - Full Database Setup Script
-- شغّل هذا في Supabase SQL Editor (أو في ترتيب خطوة خطوة)
-- =============================================================

-- ===== STEP 1: إنشاء جدول الإشعارات (لو مش موجود) =====
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

CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_notif" ON notifications;
CREATE POLICY "users_read_own_notif"
  ON notifications FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "service_insert_notif" ON notifications;
CREATE POLICY "service_insert_notif"
  ON notifications FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "users_update_own_notif" ON notifications;
CREATE POLICY "users_update_own_notif"
  ON notifications FOR UPDATE USING (TRUE);

-- ===== STEP 2: التأكد من وجود الأعمدة المطلوبة في orders =====
-- (بشكل آمن — مش بيفشل لو العمود موجود)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='updated_at') THEN
    ALTER TABLE orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='num_shops') THEN
    ALTER TABLE orders ADD COLUMN num_shops INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='recipient_phone') THEN
    ALTER TABLE orders ADD COLUMN recipient_phone TEXT;
  END IF;
END $$;

-- ===== STEP 3: التأكد من وجود accept_order function =====
CREATE OR REPLACE FUNCTION accept_order(p_order_id UUID, p_courier_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
BEGIN
  -- جيب الأوردر مع lock
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'الأوردر مش موجود');
  END IF;

  IF v_order.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'message', 'الأوردر مش في الانتظار — اتحجز من حد تاني');
  END IF;

  -- تحديث الأوردر
  UPDATE orders
  SET
    courier_id  = p_courier_id,
    status      = 'ACCEPTED',
    accepted_at = NOW(),
    updated_at  = NOW()
  WHERE id = p_order_id;

  RETURN json_build_object('success', true, 'message', 'تم قبول الأوردر بنجاح');
END;
$$;

-- ===== STEP 4: مسح البيانات القديمة (اختياري) =====
-- قم بإزالة التعليق لو عايز تبدأ من صفر:
/*
DELETE FROM notifications;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM couriers;
DELETE FROM security_alerts;
DELETE FROM users WHERE role != 'ADMIN';
*/

SELECT 'تم الإعداد بنجاح ✅' AS status;
SELECT table_name, 'موجود ✅' AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users','orders','order_items','couriers','notifications','ad_offers','security_alerts','admin_pricing');
