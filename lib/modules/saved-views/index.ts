'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db/client'
import { requireUser } from '@/lib/modules/auth'

export interface SavedViewDTO {
  id: string
  name: string
  path: string
  query: string
  pinned: boolean
}

export async function listMySavedViews(path?: string): Promise<SavedViewDTO[]> {
  const user = await requireUser()
  const rows = await prisma.savedView.findMany({
    where: { userId: user.id, ...(path ? { path } : {}) },
    orderBy: [{ pinned: 'desc' }, { name: 'asc' }],
  })
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    path: r.path,
    query: r.query,
    pinned: r.pinned,
  }))
}

export async function createSavedView(input: {
  name: string
  path: string
  query: string
  pinned?: boolean
}) {
  const user = await requireUser()
  const name = input.name.trim()
  if (!name) return { error: 'Name is required' }
  if (name.length > 60) return { error: 'Name too long (max 60 chars)' }
  if (!input.path.startsWith('/')) return { error: 'Invalid path' }

  try {
    const view = await prisma.savedView.create({
      data: {
        userId: user.id,
        name,
        path: input.path,
        query: input.query,
        pinned: input.pinned ?? false,
      },
    })
    revalidatePath(input.path)
    return { ok: true, id: view.id }
  } catch (e) {
    // Unique constraint: same name on the same path for this user.
    if (e instanceof Error && e.message.includes('Unique')) {
      return { error: 'A view with that name already exists for this page.' }
    }
    return { error: 'Failed to save view.' }
  }
}

export async function deleteSavedView(id: string) {
  const user = await requireUser()
  const view = await prisma.savedView.findUnique({ where: { id } })
  if (!view || view.userId !== user.id) return { error: 'Not found' }
  await prisma.savedView.delete({ where: { id } })
  revalidatePath(view.path)
  return { ok: true }
}

export async function togglePinSavedView(id: string) {
  const user = await requireUser()
  const view = await prisma.savedView.findUnique({ where: { id } })
  if (!view || view.userId !== user.id) return { error: 'Not found' }
  const updated = await prisma.savedView.update({
    where: { id },
    data: { pinned: !view.pinned },
  })
  revalidatePath(view.path)
  return { ok: true, pinned: updated.pinned }
}
