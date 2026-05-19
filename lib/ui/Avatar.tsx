type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, string> = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
}

function initialsFrom(name?: string, email?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '?'
}

export function Avatar({
  name,
  email,
  size = 'md',
}: {
  name?: string
  email?: string
  size?: Size
}) {
  const initials = initialsFrom(name, email)
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-surface-muted font-medium tracking-tight text-foreground ring-1 ring-inset ring-border ${SIZES[size]}`}
      aria-label={name ?? email ?? 'User'}
    >
      {initials}
    </span>
  )
}
