'use client'

import { useEffect } from 'react'
import { ErrorView } from '@/lib/ui/ErrorView'

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <ErrorView
      title="Something went wrong"
      description="An unexpected error occurred. Our team has been notified."
      digest={error.digest}
      onRetry={unstable_retry}
    />
  )
}
