import { toast } from 'sonner'

export { toast }

export type ActionState<T = unknown> = {
  ok?: true
  data?: T
  error?: string
  fieldErrors?: Record<string, string[] | undefined>
}

export function toastSuccess(message: string, description?: string) {
  return toast.success(message, description ? { description } : undefined)
}

export function toastError(messageOrError: string | Error, description?: string) {
  const message =
    typeof messageOrError === 'string'
      ? messageOrError
      : messageOrError.message || 'Something went wrong'
  return toast.error(message, description ? { description } : undefined)
}

function firstFieldErrorMessage(fieldErrors: ActionState['fieldErrors']): string | null {
  if (!fieldErrors) return null
  for (const errs of Object.values(fieldErrors)) {
    const first = errs?.[0]
    if (first) return first
  }
  return null
}

/**
 * Shows a toast based on a server-action result. Returns nothing when the
 * result is undefined (initial state from useActionState before submission).
 */
export function toastFromAction(
  state: ActionState | undefined,
  opts: { success?: string; description?: string } = {},
) {
  if (!state) return
  if (state.ok) {
    return toastSuccess(opts.success ?? 'Saved', opts.description)
  }
  const fieldMsg = firstFieldErrorMessage(state.fieldErrors)
  if (state.error || fieldMsg) {
    return toastError(state.error ?? fieldMsg ?? 'Action failed')
  }
}
