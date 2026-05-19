'use client'

import { useRef, useState, useTransition } from 'react'
import { addMySkill, removeMySkill } from '@/lib/modules/employee/skills'
import { Button } from '@/lib/ui/Button'
import { Field, Input, Select } from '@/lib/ui/Input'
import { Badge } from '@/lib/ui/Table'

type Skill = {
  id: string
  skill: string
  level: string | null
  certifiedAt: Date | null
  expiresAt: Date | null
}

export function SkillsManager({ skills }: { skills: Skill[] }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function add(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const r = await addMySkill(formData)
      if (r?.error) setError(r.error)
      else formRef.current?.reset()
    })
  }
  function remove(id: string) {
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      await removeMySkill(fd)
    })
  }

  return (
    <div className="space-y-4">
      <ul className="flex flex-wrap gap-2">
        {skills.length === 0 && <li className="text-sm text-foreground-muted">No skills yet.</li>}
        {skills.map((s) => (
          <li key={s.id} className="flex items-center gap-1 rounded-full bg-surface-muted px-3 py-1 text-xs">
            <span>{s.skill}</span>
            {s.level && <Badge tone="info">{s.level}</Badge>}
            <button onClick={() => remove(s.id)} disabled={pending} className="ml-1 text-rose-600 hover:text-rose-700">
              ×
            </button>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={add} className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <Field label="Skill"><Input name="skill" required placeholder="e.g. TypeScript" /></Field>
        <Field label="Level">
          <Select name="level" defaultValue="">
            <option value="">—</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>Add</Button>
        </div>
      </form>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  )
}
