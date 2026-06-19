// =============================================================
// Resend Email Helper
// =============================================================

const RESEND_API_URL = 'https://api.resend.com/emails'

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(apiKey: string, options: SendEmailOptions): Promise<boolean> {
  if (!apiKey) {
    console.warn('[Resend] No API key — skipping email')
    return false
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: options.from || 'مندوبك <onboarding@resend.dev>',
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    })

    const data = await res.json() as { id?: string; name?: string; message?: string }
    if (!res.ok) {
      console.error('[Resend] Error:', data)
      return false
    }
    console.log('[Resend] Email sent:', data.id)
    return true
  } catch (e) {
    console.error('[Resend] Fetch error:', e)
    return false
  }
}

export function otpEmailHtml(code: string): string {
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; text-align: center; }
    .body p { color: #555; line-height: 1.7; font-size: 15px; }
    .code-box { background: #fff7ed; border: 2px dashed #fb923c; border-radius: 16px; padding: 20px; margin: 24px 0; }
    .code { font-size: 48px; font-weight: 900; letter-spacing: 12px; color: #ea580c; font-family: monospace; }
    .note { color: #9ca3af; font-size: 13px; margin-top: 8px; }
    .footer { background: #f3f4f6; padding: 16px 32px; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛵 مندوبك</h1>
      <p>منصة التوصيل السريع</p>
    </div>
    <div class="body">
      <p>أهلاً! 👋<br/>كود تأكيد حسابك على مندوبك:</p>
      <div class="code-box">
        <div class="code">${code}</div>
        <div class="note">⏱️ صالح لمدة 10 دقائق</div>
      </div>
      <p>ادخل الكود ده في الموقع عشان تفعّل حسابك وتبدأ تستخدم مندوبك.</p>
      <p class="note">لو مش أنت اللي سجّل — تجاهل الرسالة دي.</p>
    </div>
    <div class="footer">
      <p>مندوبك — خدمة التوصيل السريع &copy; 2025</p>
    </div>
  </div>
</body>
</html>
`
}

export function welcomeEmailHtml(name: string, role: string): string {
  const roleLabel = role === 'COURIER' ? '🛵 مندوب' : '🛒 عميل'
  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
    .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #f97316, #ea580c); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #1a1a1a; margin-top: 0; }
    .body p { color: #555; line-height: 1.7; }
    .badge { display: inline-block; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; border-radius: 8px; padding: 6px 14px; font-weight: bold; font-size: 14px; margin: 8px 0; }
    .footer { background: #f3f4f6; padding: 16px 32px; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛵 مندوبك</h1>
      <p>منصة التوصيل السريع</p>
    </div>
    <div class="body">
      <h2>أهلاً ${name}! 👋</h2>
      <p>يسعدنا انضمامك لعائلة <strong>مندوبك</strong>.</p>
      <p>حسابك الآن جاهز كـ <span class="badge">${roleLabel}</span></p>
      ${role === 'COURIER' ? `
        <p>الخطوة الجاية: افتح التطبيق وارفع صورة بطاقتك عشان يتم اعتمادك وتبدأ تشتغل 🎉</p>
      ` : `
        <p>يمكنك الآن طلب التوصيل بسهولة من أي مكان 🎉</p>
      `}
    </div>
    <div class="footer">
      <p>مندوبك — خدمة التوصيل السريع &copy; 2025</p>
    </div>
  </div>
</body>
</html>
`
}
