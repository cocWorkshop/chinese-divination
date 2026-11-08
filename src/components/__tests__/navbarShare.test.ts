import { describe, it, expect } from 'vitest'
import { T } from '@/lib/i18n'

describe('Share Error Localization and Mapping Guards', () => {
  const getShareErrorMessage = (
    data: { code?: string; error?: string; message?: string },
    lang: string
  ) => {
    return data.code === 'TOO_MANY_ACTIVE_LINKS' || data.error?.includes('Too many active share links')
      ? T(lang, '已有過多有效分享連結，請先分享現有連結', 'Too many active share links. Please share your existing links first.')
      : data.code === 'RATE_LIMITED' || data.error?.includes('Too many requests')
      ? T(lang, '操作過於頻繁，請稍候再試', 'Too many requests. Please try again later.')
      : data.code === 'UNAUTHORIZED' || data.error === 'Unauthorized'
      ? T(lang, '請先登入', 'Please log in first')
      : T(lang, '操作失敗，請稍候再試', data.error || 'Failed, please try again later')
  }

  it('translates TOO_MANY_ACTIVE_LINKS correctly according to language', () => {
    const errorData = {
      code: 'TOO_MANY_ACTIVE_LINKS',
      error: 'Too many active share links. Please share your existing links first.',
    }

    const zhMsg = getShareErrorMessage(errorData, 'zh')
    expect(zhMsg).toBe('已有過多有效分享連結，請先分享現有連結')

    const enMsg = getShareErrorMessage(errorData, 'en')
    expect(enMsg).toBe('Too many active share links. Please share your existing links first.')
  })

  it('translates RATE_LIMITED correctly according to language', () => {
    const errorData = {
      code: 'RATE_LIMITED',
      error: 'Too many requests. Please try again later.',
    }

    const zhMsg = getShareErrorMessage(errorData, 'zh')
    expect(zhMsg).toBe('操作過於頻繁，請稍候再試')

    const enMsg = getShareErrorMessage(errorData, 'en')
    expect(enMsg).toBe('Too many requests. Please try again later.')
  })

  it('translates UNAUTHORIZED correctly according to language', () => {
    const errorData = {
      code: 'UNAUTHORIZED',
      error: 'Unauthorized',
    }

    const zhMsg = getShareErrorMessage(errorData, 'zh')
    expect(zhMsg).toBe('請先登入')

    const enMsg = getShareErrorMessage(errorData, 'en')
    expect(enMsg).toBe('Please log in first')
  })

  it('falls back to localized default message when unknown error occurs', () => {
    const errorData = {
      error: 'Unknown internal exception',
    }

    const zhMsg = getShareErrorMessage(errorData, 'zh')
    expect(zhMsg).toBe('操作失敗，請稍候再試')

    const enMsg = getShareErrorMessage(errorData, 'en')
    expect(enMsg).toBe('Unknown internal exception')
  })
})
