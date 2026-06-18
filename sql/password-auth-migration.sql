-- =============================================================
-- مندوبك - Password Auth Migration
-- شغّل دا في Supabase SQL Editor
-- =============================================================

-- Add password and address to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Add new fields to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS recipient_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS num_shops INTEGER DEFAULT 0;

-- Add shop-based pricing to admin_pricing
ALTER TABLE admin_pricing ADD COLUMN IF NOT EXISTS price_per_shop NUMERIC(10,2) DEFAULT 5.00;
ALTER TABLE admin_pricing ADD COLUMN IF NOT EXISTS base_fee_shopping NUMERIC(10,2) DEFAULT 15.00;

-- Update existing pricing rows to have base values
UPDATE admin_pricing SET
  price_per_shop = 5.00,
  base_fee_shopping = 15.00
WHERE price_per_shop IS NULL OR price_per_shop = 0;

-- Security alerts table for admin notifications
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'failed_admin_login',
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_security_alerts_created ON security_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC);

-- Grant permissions to service role
GRANT ALL ON security_alerts TO service_role;
GRANT SELECT ON security_alerts TO authenticated;

-- RLS for security_alerts (admin only via service_role key)
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY لا تدعم IF NOT EXISTS — بنحذفها الأول لو موجودة ثم ننشئها
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_alerts'
      AND policyname = 'service_role_all_security_alerts'
  ) THEN
    EXECUTE '
      CREATE POLICY "service_role_all_security_alerts" ON security_alerts
        FOR ALL TO service_role USING (true) WITH CHECK (true)
    ';
  END IF;
END
$$;
