'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isLocale, LOCALE_COOKIE } from './index'

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export async function setLocale(formData: FormData) {
  const value = String(formData.get('locale') ?? '')
  if (!isLocale(value)) return { error: 'Invalid locale' }

  const store = await cookies()
  store.set(LOCALE_COOKIE, value, {
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
    sameSite: 'lax',
  })
  revalidatePath('/')
  return { ok: true }
}
