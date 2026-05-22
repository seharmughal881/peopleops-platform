'use client'

import { useEffect } from 'react'
import { ErrorView } from '@/lib/ui/ErrorView'

export default function ManagerError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[manager error]', error)
  }, [error])

  return (
    <ErrorView
      title="Manager area unavailable"
      description="An error occurred while loading this page. Retry, or go back to your team overview."
      digest={error.digest}
      onRetry={unstable_retry}
    />
  )
}
