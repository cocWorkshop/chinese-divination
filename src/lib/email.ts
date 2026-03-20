import { Resend } from 'resend'
import crypto from 'crypto'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@chinese-divination.com'
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function tokenExpiry(hours = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

export async function sendVerificationEmail(email: string, token: string, lang: string = 'zh-TW', origin?: string) {
  const baseUrl = origin || BASE_URL
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`
  
  const isZh = lang !== 'en'
  
  const subject = isZh ? '玄機 - 驗證您的電子郵件' : 'Xuanji - Verify Your Email'
  
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Georgia',serif;">
  <div style="max-width:480px;margin:40px auto;background:#111827;border:1px solid rgba(212,168,83,0.3);border-radius:16px;overflow:hidden;">
    <!-- Header -->
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(212,168,83,0.15);">
      <div style="font-size:40px;margin-bottom:8px;">☯</div>
      <h1 style="color:#d4a853;font-size:24px;margin:0;font-weight:normal;">玄機</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:4px 0 0;">Ancient Wisdom, Modern Heritage</p>
    </div>
    
    <!-- Body -->
    <div style="padding:32px 24px;text-align:center;">
      <h2 style="color:rgba(255,255,255,0.9);font-size:18px;margin:0 0 12px;">
        ${isZh ? '驗證您的電子郵件' : 'Verify Your Email'}
      </h2>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${isZh ? '感謝您的註冊！請點擊下方按鈕完成郵件驗證。' : 'Thank you for registering! Click the button below to verify your email.'}
      </p>
      
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 32px;background:#d4a853;color:#0a0f1e;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
        ${isZh ? '✉ 驗證郵件' : '✉ Verify Email'}
      </a>
      
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 24 小時內有效。' : 'This link expires in 24 hours.'}<br>
        ${isZh ? '如非您本人操作，請忽略此郵件。' : 'If you did not register, please ignore this email.'}
      </p>
    </div>
    
    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid rgba(212,168,83,0.1);text-align:center;">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">
        玄機 · Xuanji — 古法智慧，現代傳承
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject,
    html,
  })

  if (error) {
    console.error('Failed to send verification email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}

export async function sendPasswordResetEmail(email: string, token: string, lang: string = 'zh-TW', origin?: string) {
  const baseUrl = origin || BASE_URL
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  const isZh = lang !== 'en'

  const subject = isZh ? '玄機 - 重置您的密碼' : 'Xuanji - Reset Your Password'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Georgia',serif;">
  <div style="max-width:480px;margin:40px auto;background:#111827;border:1px solid rgba(212,168,83,0.3);border-radius:16px;overflow:hidden;">
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(212,168,83,0.15);">
      <div style="font-size:40px;margin-bottom:8px;">☯</div>
      <h1 style="color:#d4a853;font-size:24px;margin:0;font-weight:normal;">玄機</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:4px 0 0;">Ancient Wisdom, Modern Heritage</p>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <h2 style="color:rgba(255,255,255,0.9);font-size:18px;margin:0 0 12px;">
        ${isZh ? '重置您的密碼' : 'Reset Your Password'}
      </h2>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${isZh ? '我們收到了您的密碼重置請求。請點擊下方按鈕設置新密碼。' : 'We received a password reset request. Click the button below to set a new password.'}
      </p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#d4a853;color:#0a0f1e;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
        ${isZh ? '🔑 重置密碼' : '🔑 Reset Password'}
      </a>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 1 小時內有效。' : 'This link expires in 1 hour.'}<br>
        ${isZh ? '如非您本人操作，請忽略此郵件，您的密碼不會被更改。' : 'If you did not request this, ignore this email. Your password will not change.'}
      </p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(212,168,83,0.1);text-align:center;">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">玄機 · Xuanji — 古法智慧，現代傳承</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({ from: FROM_EMAIL, to: email, subject, html })
  if (error) {
    console.error('Failed to send reset email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}
