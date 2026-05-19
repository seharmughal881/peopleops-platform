'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      richColors={false}
      duration={4000}
      gap={10}
      toastOptions={{
        unstyled: false,
        classNames: {
          toast:
            'group !rounded-xl !border !border-border !bg-surface !text-foreground !shadow-[0_10px_30px_-10px_var(--accent-glow),0_2px_10px_-2px_rgb(0_0_0_/_0.08)]',
          title: '!text-sm !font-medium !text-foreground',
          description: '!text-xs !text-foreground-muted',
          actionButton:
            '!bg-accent !text-accent-foreground !rounded-md !px-2.5 !py-1 !text-xs',
          cancelButton:
            '!bg-surface-muted !text-foreground !rounded-md !px-2.5 !py-1 !text-xs',
          closeButton:
            '!bg-surface !border !border-border !text-foreground-muted hover:!text-foreground',
          success:
            '!bg-surface !text-foreground [&_[data-icon]]:!text-emerald-600',
          error: '!bg-surface !text-foreground [&_[data-icon]]:!text-rose-600',
          warning:
            '!bg-surface !text-foreground [&_[data-icon]]:!text-amber-600',
          info: '!bg-surface !text-foreground [&_[data-icon]]:!text-accent',
        },
      }}
    />
  )
}
