'use client'

import { useEffect } from 'react'
import { ErrorView } from '@/lib/ui/ErrorView'

export default function EmployeeError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[employee error]', error)
  }, [error])

  return (
    <ErrorView
      title="Couldn’t load this page"
      description="Something went wrong on our side. You can try again, or head back to your dashboard."
      digest={error.digest}
      onRetry={unstable_retry}
    />
  )
}
