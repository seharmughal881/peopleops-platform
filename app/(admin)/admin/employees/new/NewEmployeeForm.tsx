'use client'

import { useRouter } from 'next/navigation'
import { createEmployee } from '@/lib/modules/employee/actions'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'
import {
  Form,
  fieldError,
  useActionForm,
  type ActionState,
} from '@/lib/ui/Form'

interface Props {
  departments: { id: string; name: string }[]
  managers: { id: string; firstName: string; lastName: string }[]
}

async function action(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const r = await createEmployee(formData)
  if (r?.error) {
    return {
      error: r.error,
      fieldErrors: r.fieldErrors as Record<string, string[] | undefined> | undefined,
    }
  }
  return { ok: true }
}

export function NewEmployeeForm({ departments, managers }: Props) {
  const router = useRouter()
  const { state, dispatch, pending } = useActionForm(action, {
    successMessage: 'Employee created',
    onSuccess: () => router.push('/admin/employees'),
  })

  return (
    <Form action={dispatch} pending={pending}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee code" required error={fieldError(state, 'employeeCode')}>
          <Input name="employeeCode" required invalid={Boolean(fieldError(state, 'employeeCode'))} />
        </Field>
        <Field label="Email" required error={fieldError(state, 'email')}>
          <Input name="email" type="email" required invalid={Boolean(fieldError(state, 'email'))} />
        </Field>
        <Field label="First name" required error={fieldError(state, 'firstName')}>
          <Input name="firstName" required invalid={Boolean(fieldError(state, 'firstName'))} />
        </Field>
        <Field label="Last name" required error={fieldError(state, 'lastName')}>
          <Input name="lastName" required invalid={Boolean(fieldError(state, 'lastName'))} />
        </Field>
        <Field label="Join date" required error={fieldError(state, 'joinDate')}>
          <Input type="date" name="joinDate" required invalid={Boolean(fieldError(state, 'joinDate'))} />
        </Field>
        <Field label="Job title" error={fieldError(state, 'jobTitle')}>
          <Input name="jobTitle" invalid={Boolean(fieldError(state, 'jobTitle'))} />
        </Field>
        <Field label="Department" error={fieldError(state, 'departmentId')}>
          <Select name="departmentId" defaultValue="" invalid={Boolean(fieldError(state, 'departmentId'))}>
            <option value="">— None —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Manager" error={fieldError(state, 'managerId')}>
          <Select name="managerId" defaultValue="" invalid={Boolean(fieldError(state, 'managerId'))}>
            <option value="">— None —</option>
            {managers.map((m) => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)}
          </Select>
        </Field>
        <Field label="Temporary password" required error={fieldError(state, 'tempPassword')}>
          <Input
            name="tempPassword"
            type="text"
            defaultValue="welcome123"
            required
            invalid={Boolean(fieldError(state, 'tempPassword'))}
          />
        </Field>
      </div>
      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-rose-600" role="alert">{state.error}</p>
      )}
      <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create employee'}</Button>
    </Form>
  )
}
