import { Resend } from 'resend'
import crypto from 'crypto'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

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
      <img src="https://chinese-divination.com/favicon.svg" alt="☯" width="40" height="40" style="margin-bottom:8px;" />
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

  const { error } = await getResend().emails.send({
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
      <img src="https://chinese-divination.com/favicon.svg" alt="☯" width="40" height="40" style="margin-bottom:8px;" />
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

  const { error } = await getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html })
  if (error) {
    console.error('Failed to send reset email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}

export async function sendCompensationEmail(
  email: string,
  token: string,
  compensation: { bonusModel1: number; bonusModel2: number; bonusChat: number; reason: string },
  lang: string = 'zh-TW',
  origin?: string
) {
  const baseUrl = origin || BASE_URL
  const claimUrl = `${baseUrl}/claim/${token}`
  const isZh = lang !== 'en'

  const items: string[] = []
  if (compensation.bonusModel1 > 0) items.push(`${isZh ? '標準模型' : 'Standard Model'}: +${compensation.bonusModel1}`)
  if (compensation.bonusModel2 > 0) items.push(`${isZh ? '高級模型' : 'Premium Model'}: +${compensation.bonusModel2}`)
  if (compensation.bonusChat > 0) items.push(`${isZh ? '聊天額度' : 'Chat Credits'}: +${compensation.bonusChat}`)
  const itemsHtml = items.map(i => `<div style="padding:8px 16px;background:rgba(212,168,83,0.08);border-left:3px solid #d4a853;border-radius:0 8px 8px 0;color:rgba(255,255,255,0.85);font-size:14px;margin-bottom:6px;">${i}</div>`).join('')

  const subject = isZh ? '玄機 - 您有一份補償待領取' : 'Xuanji - You Have a Compensation to Claim'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Georgia',serif;">
  <div style="max-width:480px;margin:40px auto;background:#111827;border:1px solid rgba(212,168,83,0.3);border-radius:16px;overflow:hidden;">
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(212,168,83,0.15);">
      <img src="https://chinese-divination.com/favicon.svg" alt="☯" width="40" height="40" style="margin-bottom:8px;" />
      <h1 style="color:#d4a853;font-size:24px;margin:0;font-weight:normal;">玄機</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:4px 0 0;">Ancient Wisdom, Modern Heritage</p>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <h2 style="color:rgba(255,255,255,0.9);font-size:18px;margin:0 0 8px;">
        ${isZh ? '🎁 補償通知' : '🎁 Compensation Notice'}
      </h2>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 20px;">
        ${isZh ? '由於近期使用中遇到的問題，我們為您準備了額度補償：' : 'Due to issues you experienced, we have prepared compensation credits for you:'}
      </p>
      
      <div style="text-align:left;margin:0 0 20px;">
        ${itemsHtml}
      </div>

      ${compensation.reason ? `<p style="color:rgba(255,255,255,0.35);font-size:12px;margin:0 0 20px;font-style:italic;">${isZh ? '原因：' : 'Reason: '}${compensation.reason}</p>` : ''}
      
      <a href="${claimUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#d4a853,#b8912e);color:#0a0f1e;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;letter-spacing:0.5px;">
        ${isZh ? '🎁 領取補償' : '🎁 Claim Compensation'}
      </a>
      
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 7 天內有效，每份補償僅可領取一次。' : 'This link expires in 7 days. Each compensation can only be claimed once.'}<br>
        ${isZh ? '如有疑問，請聯繫管理員。' : 'Contact admin if you have questions.'}
      </p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(212,168,83,0.1);text-align:center;">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">玄機 · Xuanji — 古法智慧，現代傳承</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html })
  if (error) {
    console.error('Failed to send compensation email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}

export async function sendDeleteConfirmationEmail(email: string, token: string, lang: string = 'zh-TW', origin?: string) {
  const baseUrl = origin || BASE_URL
  const deleteUrl = `${baseUrl}/delete-account/${token}`
  const isZh = lang !== 'en'

  const subject = isZh ? '玄機 - 確認刪除帳號' : 'Xuanji - Confirm Account Deletion'

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:'Georgia',serif;">
  <div style="max-width:480px;margin:40px auto;background:#111827;border:1px solid rgba(212,168,83,0.3);border-radius:16px;overflow:hidden;">
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid rgba(212,168,83,0.15);">
      <img src="https://chinese-divination.com/favicon.svg" alt="☯" width="40" height="40" style="margin-bottom:8px;" />
      <h1 style="color:#d4a853;font-size:24px;margin:0;font-weight:normal;">玄機</h1>
      <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:4px 0 0;">Ancient Wisdom, Modern Heritage</p>
    </div>
    <div style="padding:32px 24px;text-align:center;">
      <h2 style="color:rgba(255,255,255,0.9);font-size:18px;margin:0 0 12px;">
        ${isZh ? '確認刪除帳號' : 'Confirm Account Deletion'}
      </h2>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;line-height:1.6;margin:0 0 8px;">
        ${isZh ? '我們收到了您的帳號刪除請求。' : 'We received your account deletion request.'}
      </p>
      <p style="color:#fca5a5;font-size:13px;line-height:1.6;margin:0 0 24px;">
        ${isZh ? '⚠️ 此操作不可撤銷！點擊下方按鈕後，您的帳號和所有數據將被永久刪除。' : '⚠️ This action is irreversible! After clicking the button below, your account and all data will be permanently deleted.'}
      </p>
      <a href="${deleteUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
        ${isZh ? '🗑️ 確認刪除帳號' : '🗑️ Confirm Delete Account'}
      </a>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 24 小時內有效。' : 'This link expires in 24 hours.'}<br>
        ${isZh ? '如非您本人操作，請忽略此郵件，您的帳號不會被刪除。' : 'If you did not request this, ignore this email. Your account will not be deleted.'}
      </p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid rgba(212,168,83,0.1);text-align:center;">
      <p style="color:rgba(255,255,255,0.2);font-size:11px;margin:0;">玄機 · Xuanji — 古法智慧，現代傳承</p>
    </div>
  </div>
</body>
</html>`

  const { error } = await getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html })
  if (error) {
    console.error('Failed to send delete confirmation email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}
