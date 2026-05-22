'use client'

import {
  useActionState,
  useEffect,
  useRef,
  type FormHTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react'
import { toastFromAction, type ActionState } from './toast'

export type { ActionState }

type ServerAction<T = unknown> = (
  prevState: ActionState<T> | undefined,
  formData: FormData,
) => Promise<ActionState<T> | undefined> | ActionState<T> | undefined

export function useActionForm<T = unknown>(
  action: ServerAction<T>,
  options?: {
    successMessage?: string
    onSuccess?: (state: ActionState<T>) => void
    onError?: (state: ActionState<T>) => void
    silent?: boolean
  },
) {
  const [state, dispatch, pending] = useActionState<
    ActionState<T> | undefined,
    FormData
  >(action, undefined)
  const handled = useRef<ActionState<T> | undefined>(undefined)

  useEffect(() => {
    if (!state || state === handled.current) return
    handled.current = state

    if (!options?.silent) {
      toastFromAction(state, { success: options?.successMessage })
    }

    if (state.ok) options?.onSuccess?.(state)
    else if (state.error || state.fieldErrors) options?.onError?.(state)
  }, [state, options])

  return { state, dispatch, pending } as const
}

export function Form({
  action,
  pending,
  children,
  className = '',
  ref,
  ...rest
}: Omit<FormHTMLAttributes<HTMLFormElement>, 'action' | 'children'> & {
  action: (formData: FormData) => void
  pending?: boolean
  children: ReactNode
  ref?: Ref<HTMLFormElement>
}) {
  return (
    <form
      ref={ref}
      action={action}
      className={`space-y-4 ${className}`}
      aria-busy={pending || undefined}
      {...rest}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
    </form>
  )
}

export function fieldError(
  state: ActionState | undefined,
  name: string,
): string | undefined {
  return state?.fieldErrors?.[name]?.[0]
}
