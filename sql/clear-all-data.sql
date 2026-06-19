-- =============================================================
-- مسح كل البيانات من الـ Database (ابقَ في Supabase SQL Editor)
-- الأدمن مش بيتمسحش — فقط بيانات العملاء والمناديب والأوردرات
-- =============================================================

-- 1. مسح الإشعارات
DELETE FROM notifications;

-- 2. مسح عناصر الأوردرات
DELETE FROM order_items;

-- 3. مسح الأوردرات
DELETE FROM orders;

-- 4. مسح المناديب
DELETE FROM couriers;

-- 5. مسح التنبيهات الأمنية
DELETE FROM security_alerts;

-- 6. مسح اليوزرز غير الأدمن (العملاء والمناديب)
DELETE FROM users WHERE role != 'ADMIN';

-- 7. مسح الإعلانات (اختياري — اشّيله لو عايز تفضّي الإعلانات)
-- DELETE FROM ad_offers;

-- تأكيد
SELECT 'تم مسح كل البيانات بنجاح ✅' AS status;
SELECT 'المتبقي من اليوزرز (أدمن فقط):' AS info, COUNT(*) AS count FROM users;
