-- =============================================================
-- مندوبك - Supabase RLS Policies
-- انسخ الكود ده وشغله في Supabase SQL Editor
-- =============================================================

-- تفعيل RLS على كل الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_ratings ENABLE ROW LEVEL SECURITY;

-- Helper function: جيب role اليوزر الحالي
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE clerk_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: جيب id اليوزر الحالي
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
  SELECT id FROM users WHERE clerk_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: جيب courier_id اليوزر الحالي
CREATE OR REPLACE FUNCTION get_current_courier_id()
RETURNS TEXT AS $$
  SELECT c.id FROM couriers c
  JOIN users u ON u.id = c.user_id
  WHERE u.clerk_id = auth.uid()::text LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================================
-- جدول users
-- =============================================================
DROP POLICY IF EXISTS "users_select_own" ON users;
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (
    clerk_id = auth.uid()::text
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (clerk_id = auth.uid()::text);

-- =============================================================
-- جدول couriers
-- =============================================================
DROP POLICY IF EXISTS "couriers_select" ON couriers;
CREATE POLICY "couriers_select" ON couriers
  FOR SELECT USING (
    user_id = get_current_user_id()
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "couriers_insert_own" ON couriers;
CREATE POLICY "couriers_insert_own" ON couriers
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "couriers_update_own" ON couriers;
CREATE POLICY "couriers_update_own" ON couriers
  FOR UPDATE USING (
    user_id = get_current_user_id()
    OR get_user_role() = 'ADMIN'
  );

-- =============================================================
-- جدول customers
-- =============================================================
DROP POLICY IF EXISTS "customers_select_own" ON customers;
CREATE POLICY "customers_select_own" ON customers
  FOR SELECT USING (
    user_id = get_current_user_id()
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "customers_insert_own" ON customers;
CREATE POLICY "customers_insert_own" ON customers
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "customers_update_own" ON customers;
CREATE POLICY "customers_update_own" ON customers
  FOR UPDATE USING (user_id = get_current_user_id());

-- =============================================================
-- جدول addresses
-- =============================================================
DROP POLICY IF EXISTS "addresses_select_own" ON addresses;
CREATE POLICY "addresses_select_own" ON addresses
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = get_current_user_id()
    )
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "addresses_insert_own" ON addresses;
CREATE POLICY "addresses_insert_own" ON addresses
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = get_current_user_id()
    )
  );

DROP POLICY IF EXISTS "addresses_update_own" ON addresses;
CREATE POLICY "addresses_update_own" ON addresses
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = get_current_user_id()
    )
  );

-- =============================================================
-- جدول orders - القلب النووي للأمان
-- =============================================================

-- العميل يشوف أوردراته بس
-- المندوب يشوف: pending + أوردراته المقبولة
-- الأدمن يشوف الكل
DROP POLICY IF EXISTS "orders_select" ON orders;
CREATE POLICY "orders_select" ON orders
  FOR SELECT USING (
    -- العميل يشوف أوردراته
    client_id = get_current_user_id()
    -- المندوب يشوف الـ pending والأوردرات بتاعته
    OR (
      get_user_role() = 'COURIER'
      AND (
        status = 'PENDING'
        OR courier_id = get_current_courier_id()
      )
    )
    -- الأدمن يشوف الكل
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "orders_insert_client" ON orders;
CREATE POLICY "orders_insert_client" ON orders
  FOR INSERT WITH CHECK (
    client_id = get_current_user_id()
    AND get_user_role() IN ('CLIENT', 'ADMIN')
  );

-- العميل يلغي أوردره، المندوب يحدث status، الأدمن بالكل
DROP POLICY IF EXISTS "orders_update" ON orders;
CREATE POLICY "orders_update" ON orders
  FOR UPDATE USING (
    client_id = get_current_user_id()
    OR courier_id = get_current_courier_id()
    OR get_user_role() = 'ADMIN'
  );

-- =============================================================
-- جدول order_items
-- =============================================================
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE
        client_id = get_current_user_id()
        OR courier_id = get_current_courier_id()
    )
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE client_id = get_current_user_id()
    )
  );

-- =============================================================
-- جدول admin_pricing - الأسعار
-- =============================================================
-- الكل يقرأ، الأدمن بس يعدل
DROP POLICY IF EXISTS "pricing_select_all" ON admin_pricing;
CREATE POLICY "pricing_select_all" ON admin_pricing
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "pricing_admin_write" ON admin_pricing;
CREATE POLICY "pricing_admin_write" ON admin_pricing
  FOR ALL USING (get_user_role() = 'ADMIN');

-- =============================================================
-- جدول ad_offers - العروض
-- =============================================================
DROP POLICY IF EXISTS "ads_select_active" ON ad_offers;
CREATE POLICY "ads_select_active" ON ad_offers
  FOR SELECT USING (
    is_active = true
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "ads_admin_write" ON ad_offers;
CREATE POLICY "ads_admin_write" ON ad_offers
  FOR ALL USING (get_user_role() = 'ADMIN');

-- =============================================================
-- جدول courier_ratings - التقييمات
-- =============================================================
DROP POLICY IF EXISTS "ratings_select" ON courier_ratings;
CREATE POLICY "ratings_select" ON courier_ratings
  FOR SELECT USING (
    courier_id = get_current_courier_id()
    OR get_user_role() = 'ADMIN'
  );

DROP POLICY IF EXISTS "ratings_insert_client" ON courier_ratings;
CREATE POLICY "ratings_insert_client" ON courier_ratings
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE client_id = get_current_user_id()
        AND status = 'DELIVERED'
    )
  );

-- =============================================================
-- Unique Index: منع تكرار رقم موبايل المندوب
-- =============================================================
CREATE UNIQUE INDEX IF NOT EXISTS couriers_phone_unique ON couriers(phone);
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_unique ON users(phone);

-- =============================================================
-- Function: قبول الأوردر بـ Atomic Transaction (منع Race Condition)
-- =============================================================
CREATE OR REPLACE FUNCTION accept_order(
  p_order_id TEXT,
  p_courier_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_result JSON;
BEGIN
  -- SELECT FOR UPDATE يقفل الصف عشان محدش يقدر ياخده في نفس الوقت
  SELECT * INTO v_order
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE NOWAIT;

  -- لو الأوردر مش pending، يبعت رسالة خطأ
  IF v_order.status != 'PENDING' THEN
    v_result := json_build_object(
      'success', false,
      'message', 'الأوردر اتحجز من مندوب تاني'
    );
    RETURN v_result;
  END IF;

  -- تحديث الأوردر لـ ACCEPTED
  UPDATE orders
  SET
    status = 'ACCEPTED',
    courier_id = p_courier_id,
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_order_id;

  v_result := json_build_object(
    'success', true,
    'message', 'تم قبول الأوردر بنجاح',
    'order_id', p_order_id,
    'courier_id', p_courier_id
  );

  RETURN v_result;

EXCEPTION
  WHEN lock_not_available THEN
    v_result := json_build_object(
      'success', false,
      'message', 'الأوردر بيتحجز دلوقتي، جرب تاني'
    );
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
