'use client'

import { useEffect } from 'react'
import { ErrorView } from '@/lib/ui/ErrorView'

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[admin error]', error)
  }, [error])

  return (
    <ErrorView
      title="Couldn’t load this admin page"
      description="An unexpected error occurred. Retry or pick another section from the sidebar."
      digest={error.digest}
      onRetry={unstable_retry}
    />
  )
}
