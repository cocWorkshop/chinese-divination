'use client'

import { useLang } from '@/components/LanguageContext'
import Link from 'next/link'
import BackButton from '@/components/BackButton'
import { T } from '@/lib/i18n'

const POLICY_VERSION = '1.1'
const EFFECTIVE_DATE = '2026-04-11'

export default function PrivacyPolicyPage() {
  const { lang } = useLang()

  return (
    <div className="flex-1 px-4 py-8 sm:py-12 pb-24" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[rgba(212,168,83,0.16)]">
          <div className="flex items-center gap-3">
            <BackButton fallbackHref="/" />
            <nav className="flex items-center gap-1.5 text-xs text-white/50 font-serif" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-gold transition-colors">
                {T(lang, '首頁', 'Home')}
              </Link>
              <span>/</span>
              <span className="text-gold">{T(lang, '隱私政策', 'Privacy Policy')}</span>
            </nav>
          </div>
          <Link
            href="/terms"
            className="text-xs font-serif text-white/60 hover:text-gold transition-colors"
          >
            {T(lang, '服務條款 →', 'Terms of Service →')}
          </Link>
        </div>

        <div className="oriental-sanctuary-card rounded-2xl p-6 sm:p-10 border border-gold/20 shadow-xl">
          <h1 className="text-2xl sm:text-3xl font-serif mb-2" style={{ color: 'var(--gold)' }}>
            {T(lang, '隱私政策', 'Privacy Policy')}
          </h1>
          <p className="text-xs sm:text-sm mb-8 font-serif" style={{ color: 'var(--text-muted)' }}>
            {T(lang, `版本 ${POLICY_VERSION} · 生效日期：${EFFECTIVE_DATE}`, `Version ${POLICY_VERSION} · Effective: ${EFFECTIVE_DATE}`)}
          </p>

          <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {/* 1. Introduction */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '1. 簡介', '1. Introduction')}
              </h2>
              <p>{T(lang,
                '玄機（以下簡稱「本平台」）致力於保護您的個人隱私。本隱私政策說明我們如何收集、使用、存儲和保護您的個人資料。本平台遵守《歐盟通用數據保護條例》（GDPR）以及《加拿大個人信息保護和電子文件法》（PIPEDA）。',
                'XuanJi (the "Platform") is committed to protecting your personal privacy. This Privacy Policy explains how we collect, use, store, and protect your personal data. We comply with the EU General Data Protection Regulation (GDPR) and the Canadian Personal Information Protection and Electronic Documents Act (PIPEDA).'
              )}</p>
            </section>

            {/* 2. Data Collected */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '2. 收集的數據', '2. Data We Collect')}
              </h2>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{T(lang, '帳號信息：電子郵箱、姓名（可選）、密碼（加密存儲）', 'Account info: email, name (optional), password (encrypted)')}</li>
                <li>{T(lang, '出生信息：出生日期、時辰、出生地、性別 — 用於占卜計算', 'Birth info: date, time, place, gender — for divination calculations')}</li>
                <li>{T(lang, '占卜記錄：您的問題和生成的解讀結果', 'Divination records: your questions and generated readings')}</li>
                <li>{T(lang, '玄機大師對話歷史：你的訊息、AI 回覆、相關工具呼叫記錄', 'Master Xuanji chat history: your messages, AI responses, and related tool call records')}</li>
                <li>{T(lang, '用戶記憶：從對話中自動提取的穩定偏好和興趣（可隨時關閉、刪除、匯出）', 'User memory: stable preferences and interests automatically extracted from conversations (can be paused, deleted, or exported anytime)')}</li>
                <li>{T(lang, '使用日誌：IP 地址、用戶代理（User Agent）、登入/登出時間 — 用於安全審計', 'Usage logs: IP address, user agent, login/logout times — for security audit')}</li>
                <li>{T(lang, '回饋信息：您提交的評分和意見回饋', 'Feedback: ratings and comments you submit')}</li>
              </ul>
            </section>

            {/* 2a. Master Xuanji Memory — new in v1.1 */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '2a. 玄機大師對話與記憶', '2a. Master Xuanji Conversations and Memory')}
              </h2>
              <p className="mb-3">{T(lang,
                '為了提供個人化的占卜諮詢體驗，玄機大師 AI 助手會：',
                'To provide a personalized divination consultation experience, the Master Xuanji AI assistant will:'
              )}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2 mb-3">
                <li>{T(lang,
                  '記錄你與大師的對話內容（用戶訊息、AI 回覆、工具呼叫記錄），存儲於本平台資料庫',
                  'Record your conversations with the Master (your messages, AI responses, and tool call records), stored in this platform\'s database'
                )}</li>
                <li>{T(lang,
                  '自動從對話中提取穩定的用戶偏好和興趣（「用戶記憶」），用於為你定制更貼近的回應',
                  'Automatically extract stable user preferences and interests from conversations ("user memory"), used to personalize responses'
                )}</li>
                <li>{T(lang,
                  '在每次對話中將你的「用戶記憶」作為上下文發送給第三方 AI 模型',
                  "Include your 'user memory' as context when sending each conversation turn to third-party AI models"
                )}</li>
              </ul>
              <p className="mb-3">
                <strong>{T(lang, '用戶記憶中包含：', 'User memory includes:')}</strong>{' '}
                {T(lang,
                  '你經常關心的主題、溝通偏好、穩定的生活背景描述。',
                  'topics you frequently care about, communication preferences, stable life context descriptions.'
                )}
              </p>
              <p className="mb-3">
                <strong>{T(lang, '用戶記憶中不包含：', 'User memory does NOT include:')}</strong>{' '}
                {T(lang,
                  '臨時情緒、一次性問題、詳細的命盤資料（命盤資料另存於占卜歷史）。',
                  'temporary moods, one-off questions, or detailed chart data (chart data is stored separately in your reading history).'
                )}
              </p>
              <p className="mb-3">
                <strong>{T(lang, '你的控制權：', 'Your controls:')}</strong>
              </p>
              <ul className="list-disc list-inside space-y-1.5 ml-2 mb-3">
                <li>{T(lang,
                  '在「個人資料 → 玄機大師記憶」頁面查看、編輯、刪除你的用戶記憶',
                  "View, edit, or delete your user memory on the 'Profile → Master Memory' page"
                )}</li>
                <li>{T(lang,
                  '隨時暫停或永久關閉記憶功能',
                  'Pause or permanently disable the memory feature anytime'
                )}</li>
                <li>{T(lang,
                  '在資料匯出（GDPR）中包含完整的對話歷史和用戶記憶',
                  'Your full conversation history and user memory are included in GDPR data exports'
                )}</li>
                <li>{T(lang,
                  '刪除帳號時，所有對話和記憶將一併永久清除',
                  'Account deletion permanently removes all conversations and memory together with your account'
                )}</li>
              </ul>
              <p className="mb-3">
                <strong>{T(lang, '管理員存取：', 'Admin access:')}</strong>{' '}
                {T(lang,
                  '為了支援與除錯，授權管理員可在個別情況下存取你的記憶資料。每次存取都會記錄到審計日誌（管理員 ID、目標用戶 ID、操作類型、時間），這些日誌可透過資料匯出取得。一般管理員介面不會顯示用戶記憶。',
                  'For support and debugging purposes, authorized administrators may access your memory data on a case-by-case basis. Every access is logged to an audit trail (admin ID, target user ID, action type, timestamp), which is included in your data export. User memory is not displayed in the general admin interface.'
                )}
              </p>
              <p>
                {T(lang,
                  '此功能預設開啟。如果你不希望使用，請在「個人資料 → 玄機大師記憶」頁面關閉。',
                  'This feature is enabled by default. If you do not want to use it, please disable it on the "Profile → Master Memory" page.'
                )}
              </p>
            </section>

            {/* 3. How We Use Your Data */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '3. 數據用途', '3. How We Use Your Data')}
              </h2>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{T(lang, '提供占卜服務：您的出生信息和問題將發送至第三方 AI 模型進行分析和解讀', 'Provide divination services: your birth info and questions are sent to third-party AI models for analysis')}</li>
                <li>{T(lang, '帳號管理：身份驗證、密碼重置', 'Account management: authentication, password reset')}</li>
                <li>{T(lang, '安全保障：防止未授權訪問、檢測異常行為', 'Security: prevent unauthorized access, detect anomalies')}</li>
                <li>{T(lang, '服務改進：匿名統計分析', 'Service improvement: anonymous statistical analysis')}</li>
              </ul>
            </section>

            {/* 4. Third-Party Data Processing */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '4. 第三方數據處理', '4. Third-Party Data Processing')}
              </h2>
              <p className="mb-3">{T(lang,
                '為了提供占卜解讀服務，您的出生信息和問題會被發送至以下第三方 AI 服務提供商進行處理：',
                'To provide divination readings, your birth info and questions are sent to the following third-party AI providers:'
              )}</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Google Cloud AI</strong> — {T(lang, '隱私聲明', 'Privacy Notice')}：
                  <a href="https://cloud.google.com/terms/cloud-privacy-notice" target="_blank" rel="noopener noreferrer" className="ml-1 underline" style={{ color: 'var(--gold)' }}>
                    cloud.google.com/terms/cloud-privacy-notice
                  </a>
                </li>
                <li>
                  <strong>Amazon Web Services (AWS)</strong> — {T(lang, '隱私聲明', 'Privacy Notice')}：
                  <a href="https://aws.amazon.com/privacy/" target="_blank" rel="noopener noreferrer" className="ml-1 underline" style={{ color: 'var(--gold)' }}>
                    aws.amazon.com/privacy
                  </a>
                </li>
              </ul>
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--accent-bg)', border: '1px solid var(--card-border)' }}>
                <p className="font-medium mb-1" style={{ color: 'var(--gold)' }}>
                  🔒 {T(lang, '數據安全承諾', 'Data Security Commitment')}
                </p>
                <p>{T(lang,
                  '我們使用的所有 AI 模型均為商業版本，明確承諾不使用用戶數據進行模型訓練（No Data Training）。您的占卜數據不會被用於改善或訓練 AI 模型。',
                  'All AI models we use are commercial versions that explicitly commit to not using user data for model training (No Data Training). Your divination data will not be used to improve or train AI models.'
                )}</p>
              </div>
            </section>

            {/* 5. Data Encryption */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '5. 數據加密', '5. Data Encryption')}
              </h2>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{T(lang,
                  '傳輸加密：所有數據傳輸均使用 HTTPS/TLS 加密協議',
                  'Encryption in transit: all data transmission uses HTTPS/TLS encryption'
                )}</li>
                <li>{T(lang,
                  '存儲加密：用戶密碼使用 bcrypt 算法進行哈希加密存儲；數據庫採用加密存儲',
                  'Encryption at rest: passwords are hashed with bcrypt; database uses encrypted storage'
                )}</li>
                <li>{T(lang,
                  '第三方傳輸：與 AI 服務提供商之間的數據傳輸同樣使用 TLS 加密',
                  'Third-party transit: data sent to AI providers is also encrypted via TLS'
                )}</li>
              </ul>
            </section>

            {/* 6. Data Storage */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '6. 數據存儲', '6. Data Storage')}
              </h2>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{T(lang, '存儲位置：加拿大', 'Storage location: Canada')}</li>
                <li>{T(lang, '帳號數據：在帳號存續期間保留', 'Account data: retained while account is active')}</li>
                <li>{T(lang, '玄機大師對話與記憶：在帳號存續期間保留，可隨時手動清除', 'Master Xuanji conversations and memory: retained while account is active, can be manually cleared anytime')}</li>
                <li>{T(lang, '安全日誌（IP、登入記錄）：保留 90 天後自動清除', 'Security logs (IP, login records): retained 90 days then auto-deleted')}</li>
                <li>{T(lang, 'LLM 調用日誌：保留 180 天後自動清除', 'LLM call logs: retained 180 days then auto-deleted')}</li>
                <li>{T(lang, '帳號刪除後：所有數據將在 30 天內徹底清除', 'After account deletion: all data permanently removed within 30 days')}</li>
              </ul>
            </section>

            {/* 7. Your Rights */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '7. 您的權利', '7. Your Rights')}
              </h2>
              <p className="mb-2">{T(lang,
                '根據 GDPR 和 PIPEDA，您擁有以下權利：',
                'Under GDPR and PIPEDA, you have the following rights:'
              )}</p>
              <ul className="list-disc list-inside space-y-1.5 ml-2">
                <li>{T(lang, '訪問權：查看和導出您的所有個人數據', 'Right of access: view and export all your personal data')}</li>
                <li>{T(lang, '更正權：修改不準確的個人信息', 'Right to rectification: correct inaccurate personal info')}</li>
                <li>{T(lang, '刪除權：刪除您的帳號和所有相關數據', 'Right to erasure: delete your account and all associated data')}</li>
                <li>{T(lang, '數據可攜權：以機器可讀格式導出您的數據', 'Right to data portability: export your data in machine-readable format')}</li>
                <li>{T(lang, '記憶查看與控制：查看、編輯、暫停或刪除玄機大師的用戶記憶（在「個人資料 → 玄機大師記憶」頁面）', "Memory view & control: view, edit, pause, or delete Master Xuanji's user memory (on the 'Profile → Master Memory' page)")}</li>
              </ul>
              <p className="mt-3">{T(lang,
                '您可以在「個人資料」頁面中行使以上權利（導出數據、刪除帳號）。',
                'You can exercise these rights from your Profile page (export data, delete account).'
              )}</p>
            </section>

            {/* 8. Cookies */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '8. Cookie 使用', '8. Cookies')}
              </h2>
              <p>{T(lang,
                '本平台僅使用必要的會話 Cookie（NextAuth JWT）用於維持您的登入狀態。我們不使用第三方追蹤 Cookie 或廣告 Cookie。',
                'We only use essential session cookies (NextAuth JWT) to maintain your login state. We do not use third-party tracking or advertising cookies.'
              )}</p>
            </section>

            {/* 9. Data Breach */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '9. 數據洩露通知', '9. Data Breach Notification')}
              </h2>
              <p>{T(lang,
                '如發生數據洩露事件，我們將在 72 小時內（符合 GDPR 要求）通過電子郵件通知受影響的用戶，並向相關監管機構報告。',
                'In the event of a data breach, we will notify affected users via email within 72 hours (per GDPR) and report to relevant authorities.'
              )}</p>
            </section>

            {/* 10. Children */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '10. 未成年人保護', '10. Children\'s Privacy')}
              </h2>
              <p>{T(lang,
                '本平台不面向 16 歲以下的未成年人。如果我們發現收集了未成年人的數據，將立即刪除。',
                'This platform is not intended for persons under 16. If we learn we have collected data from a minor, we will delete it immediately.'
              )}</p>
            </section>

            {/* 11. Changes */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '11. 政策更新', '11. Policy Changes')}
              </h2>
              <p>{T(lang,
                '本隱私政策可能會不定期更新。更新後，我們將在您下次登入時提示您查閱並同意新版本。',
                'This Privacy Policy may be updated from time to time. After updates, we will prompt you to review and agree to the new version upon your next login.'
              )}</p>
            </section>

            {/* 12. Contact */}
            <section>
              <h2 className="text-lg font-serif mb-3" style={{ color: 'var(--gold)' }}>
                {T(lang, '12. 聯繫我們', '12. Contact Us')}
              </h2>
              <p>{T(lang,
                '如有任何隱私相關問題或數據請求，請通過以下方式聯繫我們：',
                'For any privacy-related questions or data requests, contact us at:'
              )}</p>
              <p className="mt-2" style={{ color: 'var(--gold)' }}>📧 admin@chinese-divination.com</p>
            </section>
          </div>

          <div className="mt-10 pt-6 flex justify-center" style={{ borderTop: '1px solid var(--card-border)' }}>
            <Link href="/" className="px-6 py-2 rounded-xl text-sm transition-colors" style={{ border: '1px solid var(--card-border)', color: 'var(--text-muted)' }}>
              {T(lang, '返回首頁', 'Back to Home')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
