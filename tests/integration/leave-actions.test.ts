import { beforeEach, describe, expect, it, vi } from 'vitest'
import { testPrisma, useIntegrationDb } from './db'

// Mock everything that would reach Redis / Next runtime / session machinery.
// Real Prisma calls flow through to the test schema so balance/status/audit
// rows are observable end-to-end.

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

import { submitLeaveRequest, decideLeaveRequest } from '@/lib/modules/leave/actions'

useIntegrationDb()

interface SeedUserOpts {
  email: string
  employeeCode: string
  firstName?: string
  lastName?: string
  managerId?: string
}

async function seedUserWithEmployee(opts: SeedUserOpts) {
  const user = await testPrisma.user.create({
    data: { email: opts.email, hashedPassword: 'x' },
  })
  const employee = await testPrisma.employee.create({
    data: {
      userId: user.id,
      employeeCode: opts.employeeCode,
      firstName: opts.firstName ?? 'Test',
      lastName: opts.lastName ?? 'User',
      joinDate: new Date('2024-01-01'),
      managerId: opts.managerId,
    },
  })
  return { user, employee }
}

async function seedLeaveBalance(employeeId: string, leaveType: string, balance: number, year: number) {
  return testPrisma.leaveBalance.create({
    data: { employeeId, leaveType, balance, year },
  })
}

function mockActor(user: { id: string; email: string }, employee: { id: string; firstName: string; lastName: string }) {
  const value = {
    id: user.id,
    email: user.email,
    employee,
    roles: ['employee'],
    permissions: ['leave:read'],
  }
  authMock.requireUser.mockResolvedValue(value)
  return value
}

function mockApprover(user: { id: string; email: string }) {
  const value = {
    id: user.id,
    email: user.email,
    employee: null,
    roles: ['manager'],
    permissions: ['leave:approve'],
  }
  authMock.requirePermission.mockResolvedValue(value)
  return value
}

function fd(entries: Record<string, string>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.append(k, v)
  return f
}

beforeEach(() => {
  authMock.requireUser.mockReset()
  authMock.requirePermission.mockReset()
})

describe('submitLeaveRequest', () => {
  it('returns a validation error on malformed input', async () => {
    const { user, employee } = await seedUserWithEmployee({ email: 'a@x.com', employeeCode: 'E1' })
    mockActor(user, employee)

    const result = await submitLeaveRequest(
      fd({ leaveType: 'vacation', startDate: '2026-06-10', endDate: '2026-06-05' }),
    )

    expect(result).toMatchObject({ error: 'Validation failed' })
    expect(await testPrisma.leaveRequest.count()).toBe(0)
  })

  it('rejects when the user has no employee record', async () => {
    const user = await testPrisma.user.create({ data: { email: 'b@x.com', hashedPassword: 'x' } })
    authMock.requireUser.mockResolvedValue({
      id: user.id,
      email: user.email,
      employee: null,
      roles: [],
      permissions: [],
    })

    await expect(
      submitLeaveRequest(fd({ leaveType: 'vacation', startDate: '2026-06-01', endDate: '2026-06-03' })),
    ).rejects.toThrow(/No employee record/)
  })

  it('blocks paid leave when balance is insufficient', async () => {
    const { user, employee } = await seedUserWithEmployee({ email: 'c@x.com', employeeCode: 'E2' })
    mockActor(user, employee)
    await seedLeaveBalance(employee.id, 'vacation', 1, 2026)

    const result = await submitLeaveRequest(
      fd({ leaveType: 'vacation', startDate: '2026-06-01', endDate: '2026-06-05' }),
    )

    expect(result).toMatchObject({ error: expect.stringContaining('Insufficient vacation balance') })
    expect(await testPrisma.leaveRequest.count()).toBe(0)
  })

  it('skips the balance check entirely for unpaid leave', async () => {
    const { user, employee } = await seedUserWithEmployee({ email: 'd@x.com', employeeCode: 'E3' })
    mockActor(user, employee)
    // Seed an hr_admin so the fallback approver path can resolve.
    const hr = await testPrisma.user.create({ data: { email: 'hr@x.com', hashedPassword: 'x' } })
    const hrRole = await testPrisma.role.create({
      data: { name: 'hr_admin', permissions: JSON.stringify(['*']) },
    })
    await testPrisma.userRole.create({ data: { userId: hr.id, roleId: hrRole.id } })

    const result = await submitLeaveRequest(
      fd({ leaveType: 'unpaid', startDate: '2026-06-01', endDate: '2026-06-10' }),
    )

    expect(result).toMatchObject({ ok: true })
    const requests = await testPrisma.leaveRequest.findMany()
    expect(requests).toHaveLength(1)
    expect(requests[0]?.leaveType).toBe('unpaid')
  })

  it('routes to the direct manager by default and creates an approval row', async () => {
    const { user: mgrUser, employee: manager } = await seedUserWithEmployee({
      email: 'mgr@x.com',
      employeeCode: 'M01',
    })
    const { user, employee } = await seedUserWithEmployee({
      email: 'sub@x.com',
      employeeCode: 'S01',
      managerId: manager.id,
    })
    mockActor(user, employee)
    await seedLeaveBalance(employee.id, 'vacation', 10, 2026)

    const result = await submitLeaveRequest(
      fd({ leaveType: 'vacation', startDate: '2026-06-01', endDate: '2026-06-03', reason: 'beach' }),
    )

    expect(result).toMatchObject({ ok: true })

    const request = await testPrisma.leaveRequest.findFirstOrThrow()
    expect(request).toMatchObject({
      employeeId: employee.id,
      leaveType: 'vacation',
      days: 3,
      reason: 'beach',
      status: 'pending',
    })

    const approvals = await testPrisma.approval.findMany({ where: { entityId: request.id } })
    expect(approvals).toHaveLength(1)
    expect(approvals[0]).toMatchObject({
      approverId: mgrUser.id,
      entityType: 'LeaveRequest',
      status: 'pending',
    })

    const audits = await testPrisma.auditLog.findMany({ where: { entityId: request.id } })
    expect(audits.map((a) => a.action)).toEqual(['leave.submitted'])
  })

  it('falls back to an hr_admin when the employee has no direct manager', async () => {
    const { user, employee } = await seedUserWithEmployee({ email: 'orphan@x.com', employeeCode: 'O01' })
    mockActor(user, employee)
    await seedLeaveBalance(employee.id, 'vacation', 10, 2026)

    const hr = await testPrisma.user.create({ data: { email: 'hr2@x.com', hashedPassword: 'x' } })
    const role = await testPrisma.role.create({
      data: { name: 'hr_admin', permissions: JSON.stringify(['*']) },
    })
    await testPrisma.userRole.create({ data: { userId: hr.id, roleId: role.id } })

    await submitLeaveRequest(
      fd({ leaveType: 'vacation', startDate: '2026-06-01', endDate: '2026-06-02' }),
    )

    const approval = await testPrisma.approval.findFirstOrThrow()
    expect(approval.approverId).toBe(hr.id)
  })

  it('prefers an ApprovalRule chain over the manager fallback when one matches', async () => {
    const { user: mgrUser, employee: manager } = await seedUserWithEmployee({
      email: 'mgr2@x.com',
      employeeCode: 'M02',
    })
    const { user, employee } = await seedUserWithEmployee({
      email: 'sub2@x.com',
      employeeCode: 'S02',
      managerId: manager.id,
    })
    mockActor(user, employee)
    await seedLeaveBalance(employee.id, 'vacation', 30, 2026)

    // Finance gets long-leave approvals.
    const finance = await testPrisma.user.create({ data: { email: 'fin@x.com', hashedPassword: 'x' } })
    const finRole = await testPrisma.role.create({
      data: { name: 'finance', permissions: JSON.stringify([]) },
    })
    await testPrisma.userRole.create({ data: { userId: finance.id, roleId: finRole.id } })
    await testPrisma.approvalRule.create({
      data: {
        name: 'long-leave',
        entityType: 'LeaveRequest',
        priority: 1,
        condition: JSON.stringify({ field: 'days', op: 'gte', value: 5 }),
        approverChain: JSON.stringify(['finance']),
        active: true,
      },
    })

    await submitLeaveRequest(
      fd({ leaveType: 'vacation', startDate: '2026-06-01', endDate: '2026-06-10' }),
    )

    const approval = await testPrisma.approval.findFirstOrThrow()
    expect(approval.approverId).toBe(finance.id)
    expect(approval.approverId).not.toBe(mgrUser.id)
  })
})

describe('decideLeaveRequest', () => {
  async function seedPendingLeaveWithApproval(opts: {
    days?: number
    leaveType?: string
    balance?: number
  } = {}) {
    const days = opts.days ?? 3
    const leaveType = opts.leaveType ?? 'vacation'
    const balance = opts.balance ?? 10

    const { user: mgrUser } = await seedUserWithEmployee({ email: 'mgr3@x.com', employeeCode: 'M03' })
    const { user, employee } = await seedUserWithEmployee({ email: 'emp3@x.com', employeeCode: 'E03' })

    if (leaveType !== 'unpaid') {
      await seedLeaveBalance(employee.id, leaveType, balance, 2026)
    }

    const start = new Date(2026, 5, 1) // 1 June 2026
    const end = new Date(start)
    end.setDate(start.getDate() + days - 1)

    const request = await testPrisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        leaveType,
        startDate: start,
        endDate: end,
        days,
        status: 'pending',
      },
    })
    const approval = await testPrisma.approval.create({
      data: {
        entityType: 'LeaveRequest',
        entityId: request.id,
        approverId: mgrUser.id,
        level: 1,
        status: 'pending',
      },
    })

    return { request, approval, mgrUser, employee, employeeUser: user }
  }

  it('rejects an invalid decision payload', async () => {
    const { mgrUser } = await seedPendingLeaveWithApproval()
    mockApprover({ id: mgrUser.id, email: mgrUser.email })

    const result = await decideLeaveRequest(fd({ approvalId: '', decision: 'maybe' }))

    expect(result).toMatchObject({ error: 'Invalid decision payload' })
  })

  it('returns "Approval not found" for an unknown approval id', async () => {
    const { mgrUser } = await seedPendingLeaveWithApproval()
    mockApprover({ id: mgrUser.id, email: mgrUser.email })

    const result = await decideLeaveRequest(fd({ approvalId: 'nope', decision: 'approved' }))

    expect(result).toMatchObject({ error: 'Approval not found' })
  })

  it('approving a paid leave decrements the balance and marks the request approved', async () => {
    const { request, approval, mgrUser, employee, employeeUser } = await seedPendingLeaveWithApproval({
      days: 3,
      leaveType: 'vacation',
      balance: 10,
    })
    mockApprover({ id: mgrUser.id, email: mgrUser.email })

    const result = await decideLeaveRequest(
      fd({ approvalId: approval.id, decision: 'approved', comments: 'lgtm' }),
    )

    expect(result).toMatchObject({ ok: true })

    const updated = await testPrisma.leaveRequest.findUniqueOrThrow({ where: { id: request.id } })
    expect(updated.status).toBe('approved')
    expect(updated.decidedAt).not.toBeNull()

    const bal = await testPrisma.leaveBalance.findUniqueOrThrow({
      where: { employeeId_leaveType_year: { employeeId: employee.id, leaveType: 'vacation', year: 2026 } },
    })
    expect(bal.balance).toBe(7)

    const notif = await testPrisma.notification.findFirstOrThrow({ where: { userId: employeeUser.id } })
    expect(notif.title).toBe('Leave approved')
    expect(notif.body).toBe('lgtm')

    const audits = await testPrisma.auditLog.findMany({
      where: { entityId: request.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(audits.map((a) => a.action)).toEqual(['leave.approved'])
  })

  it('rejecting a request leaves the balance untouched and sets status=rejected', async () => {
    const { request, approval, mgrUser, employee } = await seedPendingLeaveWithApproval({
      days: 3,
      balance: 10,
    })
    mockApprover({ id: mgrUser.id, email: mgrUser.email })

    await decideLeaveRequest(fd({ approvalId: approval.id, decision: 'rejected' }))

    const updated = await testPrisma.leaveRequest.findUniqueOrThrow({ where: { id: request.id } })
    expect(updated.status).toBe('rejected')

    const bal = await testPrisma.leaveBalance.findUniqueOrThrow({
      where: { employeeId_leaveType_year: { employeeId: employee.id, leaveType: 'vacation', year: 2026 } },
    })
    expect(bal.balance).toBe(10)
  })

  it('approving unpaid leave skips the balance update entirely', async () => {
    const { request, approval, mgrUser } = await seedPendingLeaveWithApproval({
      days: 5,
      leaveType: 'unpaid',
    })
    mockApprover({ id: mgrUser.id, email: mgrUser.email })

    await decideLeaveRequest(fd({ approvalId: approval.id, decision: 'approved' }))

    const updated = await testPrisma.leaveRequest.findUniqueOrThrow({ where: { id: request.id } })
    expect(updated.status).toBe('approved')
    // No balance row should have been created for unpaid.
    expect(await testPrisma.leaveBalance.count()).toBe(0)
  })
})
