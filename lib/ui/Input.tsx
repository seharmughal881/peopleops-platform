import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react'

const base =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle transition-shadow outline-none focus:border-border-strong focus:ring-2 focus:ring-focus-ring/15 disabled:cursor-not-allowed disabled:opacity-60'

const invalid =
  'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'

export function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-foreground-muted">{hint}</p>
      )}
      {error && (
        <p className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </label>
  )
}

export function Input({
  invalid: isInvalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={isInvalid || undefined}
      {...props}
      className={`${base} ${isInvalid ? invalid : ''} ${props.className ?? ''}`}
    />
  )
}

export function Textarea({
  invalid: isInvalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={isInvalid || undefined}
      {...props}
      className={`${base} ${isInvalid ? invalid : ''} ${props.className ?? ''}`}
    />
  )
}

export function Select({
  invalid: isInvalid,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={isInvalid || undefined}
      {...props}
      className={`${base} pr-8 ${isInvalid ? invalid : ''} ${props.className ?? ''}`}
    />
  )
}
