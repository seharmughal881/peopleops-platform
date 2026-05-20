// Light-touch i18n: cookie-based locale persistence, server-side dictionary
// loading. Pages opt in by calling getDictionary() and passing the relevant
// subset to client components. No route restructure (no /[lang]/...) — adopt
// incrementally page by page.

import { cookies } from 'next/headers'
import type { Dictionary } from './dictionaries/en'

export const SUPPORTED_LOCALES = ['en', 'ur'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'
export const LOCALE_COOKIE = 'hr-locale'

const loaders = {
  en: () => import('./dictionaries/en').then((m) => m.default),
  ur: () => import('./dictionaries/ur').then((m) => m.default),
} satisfies Record<Locale, () => Promise<Dictionary>>

export function isLocale(value: string | undefined | null): value is Locale {
  return value != null && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const raw = store.get(LOCALE_COOKIE)?.value
  return isLocale(raw) ? raw : DEFAULT_LOCALE
}

export async function getDictionary(locale?: Locale): Promise<Dictionary> {
  const l = locale ?? (await getLocale())
  return loaders[l]()
}

export function isRtl(locale: Locale): boolean {
  return locale === 'ur'
}

export function localeDirection(locale: Locale): 'ltr' | 'rtl' {
  return isRtl(locale) ? 'rtl' : 'ltr'
}

export type { Dictionary } from './dictionaries/en'
