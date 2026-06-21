# 🚀 مندوبك - Mandoubak Delivery Platform

منصة دليفري متكاملة تشبه أوبر. تدعم 3 أنواع من المستخدمين: **عميل** + **مندوب** + **أدمن**.

---

## 🛠 التقنيات المستخدمة

| الطبقة | التقنية |
|--------|---------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Hono.js → Cloudflare Workers |
| Auth | Clerk (Google / Phone / OTP) |
| Database | Supabase PostgreSQL + Prisma ORM |
| Cache/Lock | Cloudflare KV |
| Storage | Cloudflare R2 (صور البطاقات) |
| Realtime | Supabase Realtime |

---

## 📁 هيكل المشروع

```
mandoubak/
├── frontend/          # React + Vite (يُرفع على Vercel)
│   ├── src/
│   │   ├── pages/     # Admin / Courier / Customer pages
│   │   ├── components/
│   │   └── lib/
│   └── .env.example
├── backend/           # Hono.js API (يُرفع على Cloudflare Workers)
│   ├── src/
│   │   ├── routes/
│   │   ├── lib/
│   │   └── middleware/
│   └── wrangler.toml
├── prisma/            # Database schema
├── sql/               # Supabase RLS Policies
└── vercel.json        # Vercel config للـ Frontend
```

---

## ⚙️ الإعداد المحلي

### 1. Clone المشروع
```bash
git clone https://github.com/your-username/mandoubak.git
cd mandoubak
```

### 2. تثبيت الـ Dependencies
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 3. إعداد المتغيرات البيئية

**Frontend:**
```bash
cp frontend/.env.example frontend/.env.local
# عدّل القيم في frontend/.env.local
```

**Backend:**
```bash
cp .env.example backend/.env
# عدّل القيم في backend/.env
```

### 4. تشغيل المشروع
```bash
# Frontend (port 5000)
cd frontend && npm run dev

# Backend (port 8787)
cd backend && npm run dev
```

---

## 🚀 النشر على الإنترنت

### Frontend → Vercel

1. اربط الـ Repository بـ [Vercel](https://vercel.com)
2. اضبط الـ Environment Variables التالية في لوحة Vercel:

| المتغير | القيمة |
|---------|--------|
| `VITE_CLERK_PUBLISHABLE_KEY` | من Clerk Dashboard |
| `VITE_SUPABASE_URL` | من Supabase Project Settings |
| `VITE_SUPABASE_ANON_KEY` | من Supabase Project Settings |
| `VITE_API_URL` | رابط الـ Cloudflare Worker |

> الـ `vercel.json` موجود في الـ Root ويضبط كل شيء تلقائياً.

### Backend → Cloudflare Workers

```bash
cd backend
wrangler login
wrangler deploy
```

أضف الـ Secrets عبر:
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put CLERK_SECRET_KEY
wrangler secret put JWT_SECRET
```

### Database → Supabase

```bash
# تطبيق الـ Schema
npx prisma migrate deploy

# تطبيق RLS Policies
# افتح Supabase SQL Editor وشغّل:
# sql/rls-policies.sql
```

---

## 📡 API Endpoints

| Method | Endpoint | الوصف |
|--------|----------|-------|
| `GET` | `/api/pricing/calculate` | حساب سعر التوصيل |
| `POST` | `/api/orders` | إنشاء أوردر جديد |
| `GET` | `/api/orders/pending` | الأوردرات المنتظرة (للمناديب) |
| `POST` | `/api/orders/:id/accept` | قبول أوردر |
| `POST` | `/api/couriers/register` | تسجيل مندوب جديد |
| `POST` | `/api/upload-id` | رفع صور البطاقة |

---

## 🔐 المتغيرات البيئية المطلوبة

اطلع على `.env.example` و `frontend/.env.example` لقائمة كاملة.

**لا ترفع أبداً ملف `.env` الحقيقي على GitHub.**
"# MAN_DUBA_K" 
