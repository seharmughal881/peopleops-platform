import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = {
  get: vi.fn<(name: string) => { value: string } | undefined>(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}))

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getDictionary,
  getLocale,
  isLocale,
  isRtl,
  localeDirection,
} from './index'

beforeEach(() => {
  cookieStore.get.mockReset()
})

describe('isLocale', () => {
  it('accepts every supported locale', () => {
    for (const l of SUPPORTED_LOCALES) expect(isLocale(l)).toBe(true)
  })

  it('rejects unsupported values', () => {
    expect(isLocale('de')).toBe(false)
    expect(isLocale('')).toBe(false)
    expect(isLocale(undefined)).toBe(false)
    expect(isLocale(null)).toBe(false)
  })
})

describe('isRtl + localeDirection', () => {
  it('treats Urdu as RTL', () => {
    expect(isRtl('ur')).toBe(true)
    expect(localeDirection('ur')).toBe('rtl')
  })

  it('treats English as LTR', () => {
    expect(isRtl('en')).toBe(false)
    expect(localeDirection('en')).toBe('ltr')
  })
})

describe('getLocale', () => {
  it('returns the cookie value when valid', async () => {
    cookieStore.get.mockReturnValue({ value: 'ur' })
    expect(await getLocale()).toBe('ur')
  })

  it('falls back to default when cookie is missing', async () => {
    cookieStore.get.mockReturnValue(undefined)
    expect(await getLocale()).toBe(DEFAULT_LOCALE)
  })

  it('falls back to default when cookie holds an unsupported value', async () => {
    cookieStore.get.mockReturnValue({ value: 'klingon' })
    expect(await getLocale()).toBe(DEFAULT_LOCALE)
  })
})

describe('getDictionary', () => {
  it('returns the English dictionary by default', async () => {
    cookieStore.get.mockReturnValue(undefined)
    const dict = await getDictionary()
    expect(dict.login.title).toBe('Sign in to HR System')
  })

  it('returns the Urdu dictionary when locale is ur', async () => {
    const dict = await getDictionary('ur')
    expect(dict.login.title).toBe('ایچ آر سسٹم میں سائن ان کریں')
  })

  it('Urdu dictionary has the same keys as English', async () => {
    const en = await getDictionary('en')
    const ur = await getDictionary('ur')
    expect(Object.keys(ur.login).sort()).toEqual(Object.keys(en.login).sort())
    expect(Object.keys(ur.login.ssoErrors).sort()).toEqual(Object.keys(en.login.ssoErrors).sort())
  })
})
