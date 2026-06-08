# مندوبك - Mandoubak Delivery Platform

## نظرة عامة
منصة دليفري كاملة زي أوبر. 3 أنواع يوزر: عميل + مندوب + أدمن.

## التكنولوجيا
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Hono.js (Cloudflare Workers-compatible) + Node.js local server
- **Auth**: Clerk (Google/Phone/OTP)
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Cache/Lock**: Cloudflare KV (Race Condition prevention)
- **Storage**: Cloudflare R2 (ID card images)
- **Realtime**: Supabase Realtime

## هيكل المشروع
```
mandoubak/
├── frontend/          # React + Vite app (port 5000)
├── backend/           # Hono.js API (port 8787)
├── prisma/            # Database schema
└── sql/               # RLS Policies for Supabase
```

## تشغيل محلياً
```bash
cd frontend && npm run dev
```

## الـ API Endpoints
- `GET  /api/pricing/calculate` - حساب سعر التوصيل
- `POST /api/orders` - إنشاء أوردر
- `GET  /api/orders/pending` - الأوردرات المنتظرة (للمناديب)
- `POST /api/orders/:id/accept` - قبول أوردر
- `POST /api/couriers/register` - تسجيل مندوب
- `POST /api/upload-id` - رفع صور البطاقة

## الـ Setup للإنتاج
1. انسخ `.env.example` لـ `.env` وحط فيه القيم
2. Deploy الـ backend على Cloudflare Workers
3. Deploy الـ frontend على Cloudflare Pages
4. شغّل `prisma migrate` على Supabase
5. انسخ `sql/rls-policies.sql` وشغله في Supabase SQL Editor

## User Preferences
- اللغة: عربي في الواجهة، إنجليزي في الكود
- الـ Framework: React + Vite (مش Astro - أسهل على Replit)
