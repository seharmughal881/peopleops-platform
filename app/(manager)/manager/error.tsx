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
      title="Couldn’t load this page"
      description="Something went wrong. Try again or return to the manager dashboard."
      digest={error.digest}
      onRetry={unstable_retry}
    />
  )
}
