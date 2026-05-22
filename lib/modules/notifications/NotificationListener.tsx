'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/ui/toast'

interface IncomingNotification {
  id: string
  title: string
  body?: string | null
  link?: string | null
  createdAt: string
}

export function NotificationListener() {
  const router = useRouter()

  useEffect(() => {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return

    const source = new EventSource('/api/notifications/stream')

    const onNotification = (ev: MessageEvent<string>) => {
      let payload: IncomingNotification
      try {
        payload = JSON.parse(ev.data)
      } catch {
        return
      }

      toast(payload.title, {
        description: payload.body ?? undefined,
        action: payload.link
          ? {
              label: 'View',
              onClick: () => {
                if (payload.link) window.location.href = payload.link
              },
            }
          : undefined,
      })

      // Re-fetch server-rendered notification lists (dashboard, etc.) so the
      // UI stays in sync without a full page reload.
      router.refresh()
    }

    source.addEventListener('notification', onNotification as EventListener)

    return () => {
      source.removeEventListener('notification', onNotification as EventListener)
      source.close()
    }
  }, [router])

  return null
}
