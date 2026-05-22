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
      title="Admin area unavailable"
      description="An error occurred while loading this page. Retry, or go back to the admin dashboard."
      digest={error.digest}
      onRetry={unstable_retry}
    />
  )
}
