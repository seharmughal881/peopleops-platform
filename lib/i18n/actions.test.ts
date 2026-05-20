import { beforeEach, describe, expect, it, vi } from 'vitest'

const cookieStore = {
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { setLocale } from './actions'

function fd(entries: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

beforeEach(() => {
  cookieStore.set.mockReset()
})

describe('setLocale', () => {
  it('writes a supported locale to the cookie', async () => {
    const result = await setLocale(fd({ locale: 'ur' }))
    expect(result).toMatchObject({ ok: true })
    expect(cookieStore.set).toHaveBeenCalledWith(
      'hr-locale',
      'ur',
      expect.objectContaining({ path: '/', sameSite: 'lax' }),
    )
  })

  it('rejects unsupported values', async () => {
    const result = await setLocale(fd({ locale: 'klingon' }))
    expect(result).toMatchObject({ error: 'Invalid locale' })
    expect(cookieStore.set).not.toHaveBeenCalled()
  })

  it('rejects empty locale', async () => {
    const result = await setLocale(fd({}))
    expect(result).toMatchObject({ error: 'Invalid locale' })
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})
