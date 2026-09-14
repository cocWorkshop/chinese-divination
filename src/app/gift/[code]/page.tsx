'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import YinYangIcon from '@/components/YinYangIcon'
import { useLang } from '@/components/LanguageContext'
import { GiftVesselIcon, SparkleIcon, CheckSealIcon, LockSealIcon, AlertIcon, CloseIcon, SunMoonIcon } from '@/components/DivinationIcons'

type GiftStatus = 'loading' | 'ready' | 'already_claimed' | 'expired' | 'exhausted' | 'invalid' | 'claiming' | 'success' | 'error' | 'need_login'

export default function GiftClaimPage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const { lang } = useLang()
  const isEn = lang === 'en'
  const [status, setStatus] = useState<GiftStatus>('loading')
  const [credits, setCredits] = useState(0)
  const [note, setNote] = useState('')
  const [claimCount, setClaimCount] = useState(0)
  const [maxClaims, setMaxClaims] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetch(`/api/gift/${code}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'ready') {
          setCredits(data.credits)
          setNote(data.note || '')
          setClaimCount(data.claimCount || 0)
          setMaxClaims(data.maxClaims || 0)
          setStatus('ready')
        } else if (data.status === 'already_claimed') {
          setCredits(data.credits)
          setClaimCount(data.claimCount || 0)
          setMaxClaims(data.maxClaims || 0)
          setStatus('already_claimed')
        } else {
          if (data.claimCount !== undefined) setClaimCount(data.claimCount)
          if (data.maxClaims !== undefined) setMaxClaims(data.maxClaims)
          setStatus(data.status || 'invalid')
        }
      })
      .catch(() => setStatus('invalid'))
  }, [code])

  const handleClaim = async () => {
    setStatus('claiming')
    try {
      const res = await fetch(`/api/gift/${code}`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setCredits(data.credits)
        setStatus('success')
      } else if (data.error === 'unauthorized') {
        setStatus('need_login')
      } else {
        setErrorMsg(data.message || (isEn ? 'Claim failed' : '領取失敗'))
        setStatus('error')
      }
    } catch {
      setErrorMsg(isEn ? 'Network error, please try again' : '網絡錯誤，請重試')
      setStatus('error')
    }
  }

  const renderIcon = () => {
    switch (status) {
      case 'ready':
        return <GiftVesselIcon size={44} className="text-gold animate-bounce" />
      case 'success':
        return <CheckSealIcon size={44} className="text-emerald-400" />
      case 'already_claimed':
        return <CheckSealIcon size={44} className="text-cyan-400" />
      case 'need_login':
        return <LockSealIcon size={44} className="text-gold" />
      case 'expired':
      case 'exhausted':
        return <SunMoonIcon size={44} className="text-white/40" />
      case 'invalid':
        return <CloseIcon size={44} className="text-red-400" />
      case 'error':
        return <AlertIcon size={44} className="text-red-400" />
      default:
        return <YinYangIcon size={44} className="animate-pulse" />
    }
  }

  const getStatusText = () => {
    if (isEn) {
      switch (status) {
        case 'loading': return { title: 'Loading...', desc: '', color: 'text-white/60' }
        case 'ready': return { title: `Claim ${credits} Karma`, desc: note || 'Tap the button to claim your Karma', color: 'text-gold' }
        case 'claiming': return { title: 'Claiming...', desc: 'Please wait', color: 'text-white/60' }
        case 'success': return { title: `Claimed ${credits} Karma!`, desc: 'Karma added to your account', color: 'text-emerald-400' }
        case 'already_claimed': return { title: 'Already claimed', desc: 'You have already claimed this gift', color: 'text-cyan-400' }
        case 'expired': return { title: 'Expired', desc: 'This link has expired', color: 'text-red-400' }
        case 'exhausted': return { title: 'All claimed', desc: 'This gift has been fully claimed', color: 'text-amber-400' }
        case 'invalid': return { title: 'Invalid link', desc: 'This link does not exist or has expired', color: 'text-red-400' }
        case 'need_login': return { title: 'Please log in', desc: 'Log in to claim your Karma', color: 'text-gold' }
        case 'error': return { title: 'Claim failed', desc: errorMsg, color: 'text-red-400' }
      }
    } else {
      switch (status) {
        case 'loading': return { title: '加載中...', desc: '', color: 'text-white/60' }
        case 'ready': return { title: `領取 ${credits} 機緣`, desc: note || '點擊下方按鈕領取您的機緣點數', color: 'text-gold' }
        case 'claiming': return { title: '領取中...', desc: '請稍候', color: 'text-white/60' }
        case 'success': return { title: `成功領取 ${credits} 機緣！`, desc: '機緣已添加到您的帳戶', color: 'text-emerald-400' }
        case 'already_claimed': return { title: '已領取', desc: '您已領取過此禮品', color: 'text-cyan-400' }
        case 'expired': return { title: '已過期', desc: '此連結已過期', color: 'text-red-400' }
        case 'exhausted': return { title: '已領完', desc: '此禮品已被領完', color: 'text-amber-400' }
        case 'invalid': return { title: '無效連結', desc: '此連結不存在或已失效', color: 'text-red-400' }
        case 'need_login': return { title: '請先登入', desc: '登入後即可領取機緣', color: 'text-gold' }
        case 'error': return { title: '領取失敗', desc: errorMsg, color: 'text-red-400' }
      }
    }
  }

  const info = getStatusText()

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md w-full oriental-sanctuary-card rounded-2xl p-8 sm:p-10 text-center space-y-6 border border-gold/30 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-2">
          {renderIcon()}
        </div>

        <h1 className={`text-xl font-serif ${info.color}`}>{info.title}</h1>
        {info.desc && <p className="text-sm text-white/60 leading-relaxed font-serif">{info.desc}</p>}

        {maxClaims > 0 && (status === 'ready' || status === 'already_claimed' || status === 'exhausted') && (
          <p className="text-xs text-gold/70 font-mono">
            {isEn ? `Claimed ${claimCount} / ${maxClaims}` : `已領取 ${claimCount} / ${maxClaims}`}
          </p>
        )}

        {status === 'ready' && (
          <button
            onClick={handleClaim}
            className="w-full min-h-[48px] py-3 rounded-xl font-serif font-semibold text-sm transition-all bg-gold hover:bg-gold-light text-navy-950 shadow-md inline-flex items-center justify-center gap-2"
          >
            <GiftVesselIcon size={18} />
            <span>{isEn ? 'Claim now' : '立即領取'}</span>
          </button>
        )}

        {status === 'need_login' && (
          <button
            onClick={() => router.push(`/login?callbackUrl=/gift/${code}`)}
            className="w-full min-h-[48px] py-3 rounded-xl font-serif font-semibold text-sm transition-all bg-gold hover:bg-gold-light text-navy-950 shadow-md inline-flex items-center justify-center gap-2"
          >
            <LockSealIcon size={18} />
            <span>{isEn ? 'Log in' : '前往登入'}</span>
          </button>
        )}

        {status === 'success' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => router.push('/divination')}
              className="w-full sm:w-auto flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-serif font-semibold text-sm transition-all bg-gold hover:bg-gold-light text-navy-950 shadow-md inline-flex items-center justify-center gap-2"
            >
              <SparkleIcon size={16} />
              <span>{isEn ? 'Start Divination' : '開始占卜'}</span>
              <span>→</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full sm:w-auto flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-serif font-medium text-sm transition-all bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 inline-flex items-center justify-center gap-2"
            >
              <span>{isEn ? 'Back to home' : '返回首頁'}</span>
            </button>
          </div>
        )}

        {['already_claimed', 'expired', 'exhausted', 'invalid', 'error'].includes(status) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => router.push('/divination')}
              className="w-full sm:w-auto flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-serif font-semibold text-sm transition-all bg-gold hover:bg-gold-light text-navy-950 shadow-md inline-flex items-center justify-center gap-2"
            >
              <span>{isEn ? 'Explore Divinations' : '前往占卜大廳'}</span>
              <span>→</span>
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full sm:w-auto flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-serif font-medium text-sm transition-all bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 inline-flex items-center justify-center gap-2"
            >
              <span>{isEn ? 'Back to home' : '返回首頁'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
