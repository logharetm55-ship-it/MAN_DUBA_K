# بناء APK لمندوبك على Android

## الطريقة: GitHub Actions (تلقائي)

### الخطوات:

1. **ارفع المشروع على GitHub:**
   - اعمل repository جديد على github.com
   - ارفع الكود عليه

2. **شغّل الـ Workflow:**
   - روح لـ: `Repository → Actions → Build Android APK`
   - اضغط `Run workflow`

3. **حمّل الـ APK:**
   - لما يخلص (5-10 دقايق) → اضغط على الـ workflow run
   - في الأسفل هتلاقي **Artifacts**
   - حمّل `mandoubak-debug-apk`

4. **نزّله على الموبايل:**
   - انقل الـ APK للموبايل
   - فعّل "Unknown Sources" في الإعدادات
   - افتح الـ APK وثبّته

---

## ملاحظات:
- الـ APK الـ Debug يشتغل مباشرة بدون signing
- للنشر على Google Play تحتاج Release APK موقّع
- الـ workflow بيبني الاتنين تلقائياً
