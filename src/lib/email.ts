import { Resend } from 'resend'
import crypto from 'crypto'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@chinese-divination.com'
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000'
const FEEDBACK_EMAIL = 'admin@chinese-divination.com'

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function tokenExpiry(hours = 24): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

// ─── Shared email wrapper (light mode) ───
function emailWrapper(content: string, isZh: boolean): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:'Georgia','Times New Roman',serif;">
  <div style="max-width:480px;margin:40px auto;background:#ffffff;border:1px solid #e8dcc8;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="text-align:center;padding:32px 24px 16px;border-bottom:1px solid #e8dcc8;">
      <img src="https://chinese-divination.com/favicon.svg" alt="☯" width="40" height="40" style="margin-bottom:8px;" />
      <h1 style="color:#8b6914;font-size:24px;margin:0;font-weight:normal;">玄機</h1>
      <p style="color:#9a8b6f;font-size:12px;margin:4px 0 0;">Ancient Wisdom, Modern Heritage</p>
    </div>
    
    <!-- Body -->
    <div style="padding:32px 24px;text-align:center;">
      ${content}
    </div>
    
    <!-- Footer -->
    <div style="padding:16px 24px;border-top:1px solid #e8dcc8;text-align:center;">
      <p style="color:#9a8b6f;font-size:11px;margin:0 0 6px;">玄機 · Xuanji — 古法智慧，現代傳承</p>
      <p style="color:#b0a28a;font-size:11px;margin:0;">
        ${isZh ? '如有疑問，請聯繫' : 'Questions? Contact'} <a href="mailto:${FEEDBACK_EMAIL}" style="color:#8b6914;text-decoration:none;">${FEEDBACK_EMAIL}</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function greeting(isZh: boolean): string {
  return `<p style="color:#4a3f2f;font-size:14px;margin:0 0 16px;">${isZh ? '您好！' : 'Hello!'}</p>`
}

// ─── Verification Email ───
export async function sendVerificationEmail(email: string, token: string, lang: string = 'zh-TW', origin?: string) {
  const baseUrl = origin || BASE_URL
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`
  const isZh = lang !== 'en'
  
  const subject = isZh ? '玄機 - 驗證您的電子郵件' : 'Xuanji - Verify Your Email'
  
  const content = `
      ${greeting(isZh)}
      <h2 style="color:#2d1f0e;font-size:18px;margin:0 0 12px;">
        ${isZh ? '驗證您的電子郵件' : 'Verify Your Email'}
      </h2>
      <p style="color:#6b5d4d;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${isZh ? '感謝您的註冊！請點擊下方按鈕完成郵件驗證。' : 'Thank you for registering! Click the button below to verify your email.'}
      </p>
      
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 32px;background:#8b6914;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
        ${isZh ? '✉ 驗證郵件' : '✉ Verify Email'}
      </a>
      
      <p style="color:#9a8b6f;font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 24 小時內有效。' : 'This link expires in 24 hours.'}<br>
        ${isZh ? '如非您本人操作，請忽略此郵件。' : 'If you did not register, please ignore this email.'}
      </p>`

  const html = emailWrapper(content, isZh)

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

// ─── Password Reset Email ───
export async function sendPasswordResetEmail(email: string, token: string, lang: string = 'zh-TW', origin?: string) {
  const baseUrl = origin || BASE_URL
  const resetUrl = `${baseUrl}/reset-password?token=${token}`
  const isZh = lang !== 'en'

  const subject = isZh ? '玄機 - 重置您的密碼' : 'Xuanji - Reset Your Password'

  const content = `
      ${greeting(isZh)}
      <h2 style="color:#2d1f0e;font-size:18px;margin:0 0 12px;">
        ${isZh ? '重置您的密碼' : 'Reset Your Password'}
      </h2>
      <p style="color:#6b5d4d;font-size:14px;line-height:1.6;margin:0 0 24px;">
        ${isZh ? '我們收到了您的密碼重置請求。請點擊下方按鈕設置新密碼。' : 'We received a password reset request. Click the button below to set a new password.'}
      </p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background:#8b6914;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
        ${isZh ? '🔑 重置密碼' : '🔑 Reset Password'}
      </a>
      <p style="color:#9a8b6f;font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 1 小時內有效。' : 'This link expires in 1 hour.'}<br>
        ${isZh ? '如非您本人操作，請忽略此郵件，您的密碼不會被更改。' : 'If you did not request this, ignore this email. Your password will not change.'}
      </p>`

  const html = emailWrapper(content, isZh)

  const { error } = await getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html })
  if (error) {
    console.error('Failed to send reset email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}

// ─── Compensation Email ───
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
  if (compensation.bonusChat > 0) items.push(`${isZh ? '聊天機緣' : 'Chat Karma'}: +${compensation.bonusChat}`)
  const itemsHtml = items.map(i => `<div style="padding:8px 16px;background:#faf5eb;border-left:3px solid #8b6914;border-radius:0 8px 8px 0;color:#2d1f0e;font-size:14px;margin-bottom:6px;">${i}</div>`).join('')

  const subject = isZh ? '玄機 - 您有一份補償待領取' : 'Xuanji - You Have a Compensation to Claim'

  const content = `
      ${greeting(isZh)}
      <h2 style="color:#2d1f0e;font-size:18px;margin:0 0 8px;">
        ${isZh ? '🎁 補償通知' : '🎁 Compensation Notice'}
      </h2>
      <p style="color:#6b5d4d;font-size:14px;line-height:1.6;margin:0 0 20px;">
        ${isZh ? '由於近期使用中遇到的問題，我們為您準備了機緣補償：' : 'Due to issues you experienced, we have prepared compensation Karma for you:'}
      </p>
      
      <div style="text-align:left;margin:0 0 20px;">
        ${itemsHtml}
      </div>

      ${compensation.reason ? `<p style="color:#9a8b6f;font-size:12px;margin:0 0 20px;font-style:italic;">${isZh ? '原因：' : 'Reason: '}${compensation.reason}</p>` : ''}
      
      <a href="${claimUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#8b6914,#a67c1a);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:15px;letter-spacing:0.5px;">
        ${isZh ? '🎁 領取補償' : '🎁 Claim Compensation'}
      </a>
      
      <p style="color:#9a8b6f;font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 7 天內有效，每份補償僅可領取一次。' : 'This link expires in 7 days. Each compensation can only be claimed once.'}
      </p>`

  const html = emailWrapper(content, isZh)

  const { error } = await getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html })
  if (error) {
    console.error('Failed to send compensation email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}

// ─── Delete Account Confirmation Email ───
export async function sendDeleteConfirmationEmail(email: string, token: string, lang: string = 'zh-TW', origin?: string) {
  const baseUrl = origin || BASE_URL
  const deleteUrl = `${baseUrl}/delete-account/${token}`
  const isZh = lang !== 'en'

  const subject = isZh ? '玄機 - 確認刪除帳號' : 'Xuanji - Confirm Account Deletion'

  const content = `
      ${greeting(isZh)}
      <h2 style="color:#2d1f0e;font-size:18px;margin:0 0 12px;">
        ${isZh ? '確認刪除帳號' : 'Confirm Account Deletion'}
      </h2>
      <p style="color:#6b5d4d;font-size:14px;line-height:1.6;margin:0 0 8px;">
        ${isZh ? '我們收到了您的帳號刪除請求。' : 'We received your account deletion request.'}
      </p>
      <p style="color:#c53030;font-size:13px;line-height:1.6;margin:0 0 24px;">
        ${isZh ? '⚠️ 此操作不可撤銷！點擊下方按鈕後，您的帳號和所有數據將被永久刪除。' : '⚠️ This action is irreversible! After clicking the button below, your account and all data will be permanently deleted.'}
      </p>
      <a href="${deleteUrl}" style="display:inline-block;padding:12px 32px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
        ${isZh ? '🗑️ 確認刪除帳號' : '🗑️ Confirm Delete Account'}
      </a>
      <p style="color:#9a8b6f;font-size:12px;margin:24px 0 0;line-height:1.5;">
        ${isZh ? '此連結 24 小時內有效。' : 'This link expires in 24 hours.'}<br>
        ${isZh ? '如非您本人操作，請忽略此郵件，您的帳號不會被刪除。' : 'If you did not request this, ignore this email. Your account will not be deleted.'}
      </p>`

  const html = emailWrapper(content, isZh)

  const { error } = await getResend().emails.send({ from: FROM_EMAIL, to: email, subject, html })
  if (error) {
    console.error('Failed to send delete confirmation email:', error)
    throw new Error(`Email send failed: ${error.message}`)
  }
}
