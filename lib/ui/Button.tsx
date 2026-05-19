import { type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'gradient-accent text-accent-foreground shadow-xs hover:shadow-[0_6px_20px_-10px_var(--accent-glow)] disabled:opacity-50',
  secondary:
    'bg-surface-muted text-foreground hover:bg-surface-hover disabled:opacity-50',
  outline:
    'border border-border bg-surface text-foreground hover:bg-surface-muted disabled:opacity-50',
  ghost:
    'text-foreground hover:bg-surface-muted disabled:opacity-50',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 shadow-xs',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-10 px-4 text-sm',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  children: ReactNode
}) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium tracking-tight transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {children}
    </button>
  )
}
