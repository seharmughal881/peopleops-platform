'use client'

import { useTransition } from 'react'
import { setLocale } from '@/lib/i18n/actions'
import type { Locale } from '@/lib/i18n'

export function LocaleSwitch({
  current,
  labels,
}: {
  current: Locale
  labels: { english: string; urdu: string; switchTo: string }
}) {
  const [pending, startTransition] = useTransition()

  function pick(locale: Locale) {
    if (locale === current) return
    const fd = new FormData()
    fd.set('locale', locale)
    startTransition(async () => {
      await setLocale(fd)
    })
  }

  return (
    <div className="flex items-center gap-2 text-xs" aria-label={labels.switchTo}>
      <button
        type="button"
        onClick={() => pick('en')}
        disabled={pending}
        className={`rounded-md px-2 py-1 ${current === 'en' ? 'bg-surface-muted font-semibold text-foreground' : 'text-foreground-muted hover:text-foreground'}`}
      >
        {labels.english}
      </button>
      <span className="text-foreground-muted">·</span>
      <button
        type="button"
        onClick={() => pick('ur')}
        disabled={pending}
        className={`rounded-md px-2 py-1 ${current === 'ur' ? 'bg-surface-muted font-semibold text-foreground' : 'text-foreground-muted hover:text-foreground'}`}
      >
        {labels.urdu}
      </button>
    </div>
  )
}
