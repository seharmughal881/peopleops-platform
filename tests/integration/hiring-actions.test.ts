import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testPrisma, useIntegrationDb } from './db'

vi.mock('@/lib/jobs/queue', () => ({
  enqueue: vi.fn().mockResolvedValue(undefined),
  getQueue: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const authMock = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requirePermission: vi.fn(),
}))

vi.mock('@/lib/modules/auth', () => authMock)

import {
  createHiringRequest,
  decideHiringRequest,
} from '@/lib/modules/recruitment/hiring-requests'

useIntegrationDb()

function fd(entries: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

function mockUser(user: { id: string; email: string }, employee: { id: string; firstName: string; lastName: string } | null = null) {
  const value = {
    id: user.id,
    email: user.email,
    employee,
    roles: [],
    permissions: [],
  }
  authMock.requireUser.mockResolvedValue(value)
  return value
}

async function seedRole(name: string) {
  return testPrisma.role.create({ data: { name, permissions: JSON.stringify([]) } })
}

async function seedUserWithRole(email: string, roleId: string) {
  const user = await testPrisma.user.create({ data: { email, hashedPassword: 'x' } })
  await testPrisma.userRole.create({ data: { userId: user.id, roleId } })
  return user
}

async function seedEmployee(opts: {
  email: string
  employeeCode: string
  managerId?: string
}) {
  const user = await testPrisma.user.create({ data: { email: opts.email, hashedPassword: 'x' } })
  const employee = await testPrisma.employee.create({
    data: {
      userId: user.id,
      employeeCode: opts.employeeCode,
      firstName: 'Test',
      lastName: opts.employeeCode,
      joinDate: new Date('2024-01-01'),
      managerId: opts.managerId,
    },
  })
  return { user, employee }
}

beforeEach(() => {
  authMock.requireUser.mockReset()
  authMock.requirePermission.mockReset()
})

describe('createHiringRequest', () => {
  it('returns validation error on malformed input', async () => {
    const { user, employee } = await seedEmployee({ email: 'req@x.com', employeeCode: 'R1' })
    mockUser(user, employee)

    const result = await createHiringRequest(fd({ jobTitle: '', justification: '' }))
    expect(result).toMatchObject({ error: 'Validation failed' })
    expect(await testPrisma.hiringRequest.count()).toBe(0)
  })

  it('starts a 2-level chain (manager + hr_admin) when proposedBudget is 0', async () => {
    // requester ↳ manager
    const manager = await seedEmployee({ email: 'mgr1@x.com', employeeCode: 'MGR1' })
    const requester = await seedEmployee({
      email: 'req1@x.com',
      employeeCode: 'REQ1',
      managerId: manager.employee.id,
    })
    const hrRole = await seedRole('hr_admin')
    const hrUser = await seedUserWithRole('hr1@x.com', hrRole.id)
    mockUser(requester.user, requester.employee)

    const result = await createHiringRequest(
      fd({ jobTitle: 'Backend Engineer', headcount: '1', justification: 'Growth', proposedBudget: '0' }),
    )

    expect(result).toMatchObject({ ok: true, approverLevels: 2 })
    const approvals = await testPrisma.approval.findMany({
      where: { entityType: 'HiringRequest' },
      orderBy: { level: 'asc' },
    })
    expect(approvals).toHaveLength(2)
    expect(approvals[0]).toMatchObject({ approverId: manager.user.id, level: 1, status: 'pending' })
    expect(approvals[1]).toMatchObject({ approverId: hrUser.id, level: 2, status: 'waiting' })
  })

  it('adds finance as a 3rd level when proposedBudget > 0', async () => {
    const manager = await seedEmployee({ email: 'mgr2@x.com', employeeCode: 'MGR2' })
    const requester = await seedEmployee({
      email: 'req2@x.com',
      employeeCode: 'REQ2',
      managerId: manager.employee.id,
    })
    const hrRole = await seedRole('hr_admin')
    const finRole = await seedRole('finance')
    const hrUser = await seedUserWithRole('hr2@x.com', hrRole.id)
    const finUser = await seedUserWithRole('fin2@x.com', finRole.id)
    mockUser(requester.user, requester.employee)

    const result = await createHiringRequest(
      fd({ jobTitle: 'Senior PM', headcount: '1', justification: 'Roadmap', proposedBudget: '120000' }),
    )

    expect(result).toMatchObject({ ok: true, approverLevels: 3 })
    const approvals = await testPrisma.approval.findMany({
      where: { entityType: 'HiringRequest' },
      orderBy: { level: 'asc' },
    })
    expect(approvals.map((a) => a.approverId)).toEqual([manager.user.id, hrUser.id, finUser.id])
  })

  it('picks the lowest-userId HR admin deterministically when multiple exist', async () => {
    const manager = await seedEmployee({ email: 'mgrDet@x.com', employeeCode: 'MGRDET' })
    const requester = await seedEmployee({
      email: 'reqDet@x.com',
      employeeCode: 'REQDET',
      managerId: manager.employee.id,
    })
    const hrRole = await seedRole('hr_admin')
    // Seed several hr users; the one with the lowest userId (lex-sorted) must
    // be picked, otherwise routing is non-deterministic across requests.
    const hrA = await seedUserWithRole('hr-aaa@x.com', hrRole.id)
    const hrB = await seedUserWithRole('hr-bbb@x.com', hrRole.id)
    const hrC = await seedUserWithRole('hr-ccc@x.com', hrRole.id)
    mockUser(requester.user, requester.employee)

    const result = await createHiringRequest(
      fd({ jobTitle: 'Det Test', headcount: '1', justification: 'x', proposedBudget: '0' }),
    )
    expect(result).toMatchObject({ ok: true, approverLevels: 2 })

    const approvals = await testPrisma.approval.findMany({
      where: { entityType: 'HiringRequest' },
      orderBy: { level: 'asc' },
    })
    const lowestHr = [hrA, hrB, hrC].map((u) => u.id).sort()[0]
    expect(approvals[1].approverId).toBe(lowestHr)
  })

  it('honors a matching ApprovalRule over the hard-coded fallback', async () => {
    const manager = await seedEmployee({ email: 'mgr3@x.com', employeeCode: 'MGR3' })
    const requester = await seedEmployee({
      email: 'req3@x.com',
      employeeCode: 'REQ3',
      managerId: manager.employee.id,
    })
    const finRole = await seedRole('finance')
    const finUser = await seedUserWithRole('fin3@x.com', finRole.id)
    await testPrisma.approvalRule.create({
      data: {
        name: 'finance-only',
        entityType: 'HiringRequest',
        priority: 1,
        condition: '{}',
        approverChain: JSON.stringify(['finance']),
        active: true,
      },
    })
    mockUser(requester.user, requester.employee)

    const result = await createHiringRequest(
      fd({ jobTitle: 'Designer', headcount: '1', justification: 'New product', proposedBudget: '0' }),
    )

    expect(result).toMatchObject({ ok: true, approverLevels: 1 })
    const approvals = await testPrisma.approval.findMany({ where: { entityType: 'HiringRequest' } })
    expect(approvals.map((a) => a.approverId)).toEqual([finUser.id])
  })
})

describe('decideHiringRequest — multi-level chain', () => {
  async function setupThreeLevelChain() {
    const manager = await seedEmployee({ email: 'mgrD@x.com', employeeCode: 'MGRD' })
    const requester = await seedEmployee({
      email: 'reqD@x.com',
      employeeCode: 'REQD',
      managerId: manager.employee.id,
    })
    const hrRole = await seedRole('hr_admin')
    const finRole = await seedRole('finance')
    const hrUser = await seedUserWithRole('hrD@x.com', hrRole.id)
    const finUser = await seedUserWithRole('finD@x.com', finRole.id)

    mockUser(requester.user, requester.employee)
    const created = await createHiringRequest(
      fd({ jobTitle: 'Lead', headcount: '1', justification: 'Need', proposedBudget: '90000' }),
    )
    const requestId = (created as { ok: true; id: string }).id

    const approvals = await testPrisma.approval.findMany({
      where: { entityType: 'HiringRequest', entityId: requestId },
      orderBy: { level: 'asc' },
    })
    return { requestId, approvals, manager, requester, hrUser, finUser }
  }

  it('approves level 1 → keeps HiringRequest pending and creates a notification for level 2', async () => {
    const { requestId, approvals, manager, hrUser } = await setupThreeLevelChain()

    mockUser(manager.user)
    const res = await decideHiringRequest(
      fd({ approvalId: approvals[0].id, decision: 'approved', comments: 'looks good' }),
    )

    expect(res).toMatchObject({ ok: true, finalized: false })
    const request = await testPrisma.hiringRequest.findUniqueOrThrow({ where: { id: requestId } })
    expect(request.status).toBe('pending')

    const level2 = await testPrisma.approval.findUniqueOrThrow({ where: { id: approvals[1].id } })
    expect(level2.status).toBe('pending') // still pending — waiting on hr

    const notifsForHr = await testPrisma.notification.findMany({ where: { userId: hrUser.id } })
    expect(notifsForHr.some((n) => n.title.includes('needs your approval'))).toBe(true)
  })

  it('approves all levels in sequence → HiringRequest becomes approved on the final level', async () => {
    const { requestId, approvals, manager, hrUser, finUser, requester } = await setupThreeLevelChain()

    mockUser(manager.user)
    await decideHiringRequest(fd({ approvalId: approvals[0].id, decision: 'approved' }))

    mockUser(hrUser)
    await decideHiringRequest(fd({ approvalId: approvals[1].id, decision: 'approved' }))

    mockUser(finUser)
    const final = await decideHiringRequest(
      fd({ approvalId: approvals[2].id, decision: 'approved', comments: 'budget ok' }),
    )
    expect(final).toMatchObject({ ok: true, finalized: true })

    const request = await testPrisma.hiringRequest.findUniqueOrThrow({ where: { id: requestId } })
    expect(request.status).toBe('approved')
    expect(request.reviewedById).toBe(finUser.id)
    expect(request.reviewerComments).toBe('budget ok')

    const requesterNotifs = await testPrisma.notification.findMany({
      where: { userId: requester.user.id },
    })
    expect(requesterNotifs.some((n) => n.title.includes('approved'))).toBe(true)
  })

  it('rejection at an intermediate level finalizes the HiringRequest as rejected', async () => {
    const { requestId, approvals, manager, hrUser, requester } = await setupThreeLevelChain()

    mockUser(manager.user)
    await decideHiringRequest(fd({ approvalId: approvals[0].id, decision: 'approved' }))

    mockUser(hrUser)
    const res = await decideHiringRequest(
      fd({ approvalId: approvals[1].id, decision: 'rejected', comments: 'no budget yet' }),
    )
    expect(res).toMatchObject({ ok: true, finalized: true })

    const request = await testPrisma.hiringRequest.findUniqueOrThrow({ where: { id: requestId } })
    expect(request.status).toBe('rejected')
    expect(request.reviewerComments).toBe('no budget yet')

    const requesterNotifs = await testPrisma.notification.findMany({
      where: { userId: requester.user.id },
    })
    expect(requesterNotifs.some((n) => n.title.includes('rejected'))).toBe(true)
  })

  it('rejects an approver who is not the one assigned to the approval', async () => {
    const { approvals, hrUser } = await setupThreeLevelChain()

    // hrUser is level 2; trying to decide level 1 (which belongs to manager).
    mockUser(hrUser)
    const res = await decideHiringRequest(fd({ approvalId: approvals[0].id, decision: 'approved' }))
    expect(res).toMatchObject({ error: 'Not your approval to decide' })

    const reloaded = await testPrisma.approval.findUniqueOrThrow({ where: { id: approvals[0].id } })
    expect(reloaded.status).toBe('pending')
  })

  it('rejects deciding an approval that is already decided', async () => {
    const { approvals, manager } = await setupThreeLevelChain()

    mockUser(manager.user)
    await decideHiringRequest(fd({ approvalId: approvals[0].id, decision: 'approved' }))
    const second = await decideHiringRequest(fd({ approvalId: approvals[0].id, decision: 'approved' }))
    expect(second).toMatchObject({ error: 'Already decided' })
  })
})
