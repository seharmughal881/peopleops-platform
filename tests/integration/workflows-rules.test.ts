import { describe, expect, it } from 'vitest'
import { testPrisma, useIntegrationDb } from './db'
import { resolveApprovers } from '@/lib/modules/workflows/rules'

useIntegrationDb()

async function makeUser(email: string) {
  return testPrisma.user.create({
    data: { email, hashedPassword: 'x' },
  })
}

async function makeEmployee(opts: {
  firstName: string
  lastName: string
  employeeCode: string
  managerId?: string
}) {
  const user = await makeUser(`${opts.employeeCode}@example.com`)
  return testPrisma.employee.create({
    data: {
      userId: user.id,
      employeeCode: opts.employeeCode,
      firstName: opts.firstName,
      lastName: opts.lastName,
      joinDate: new Date('2024-01-01'),
      managerId: opts.managerId,
    },
  })
}

async function makeRole(name: string, perms: string[] = []) {
  return testPrisma.role.create({
    data: { name, permissions: JSON.stringify(perms) },
  })
}

async function makeRule(opts: {
  name: string
  entityType: string
  priority?: number
  condition?: object
  approverChain: string[]
  active?: boolean
}) {
  return testPrisma.approvalRule.create({
    data: {
      name: opts.name,
      entityType: opts.entityType,
      priority: opts.priority ?? 100,
      condition: JSON.stringify(opts.condition ?? {}),
      approverChain: JSON.stringify(opts.approverChain),
      active: opts.active ?? true,
    },
  })
}

describe('resolveApprovers', () => {
  it('returns null when no rules exist for the entityType', async () => {
    const result = await resolveApprovers('LeaveRequest', { days: 3 })
    expect(result).toBeNull()
  })

  it('resolves the manager selector via Employee.manager.userId', async () => {
    const manager = await makeEmployee({ firstName: 'Mgr', lastName: 'One', employeeCode: 'M001' })
    const subordinate = await makeEmployee({
      firstName: 'Sub',
      lastName: 'One',
      employeeCode: 'S001',
      managerId: manager.id,
    })

    await makeRule({
      name: 'leave-default',
      entityType: 'LeaveRequest',
      approverChain: ['manager'],
    })

    const result = await resolveApprovers('LeaveRequest', { employeeId: subordinate.id })
    expect(result).toEqual([manager.userId])
  })

  it('returns null when manager selector resolves to nothing', async () => {
    const orphan = await makeEmployee({ firstName: 'Lone', lastName: 'Wolf', employeeCode: 'L001' })
    await makeRule({
      name: 'leave-default',
      entityType: 'LeaveRequest',
      approverChain: ['manager'],
    })

    const result = await resolveApprovers('LeaveRequest', { employeeId: orphan.id })
    expect(result).toBeNull()
  })

  it('resolves a role selector to the first user holding that role', async () => {
    const hrUser = await makeUser('hr@example.com')
    const role = await makeRole('hr_admin', ['*'])
    await testPrisma.userRole.create({ data: { userId: hrUser.id, roleId: role.id } })

    await makeRule({
      name: 'leave-hr',
      entityType: 'LeaveRequest',
      approverChain: ['hr_admin'],
    })

    const result = await resolveApprovers('LeaveRequest', {})
    expect(result).toEqual([hrUser.id])
  })

  it('deduplicates approvers when manager and role selector resolve to the same user', async () => {
    // Manager is also the HR admin — should appear once.
    const role = await makeRole('hr_admin', ['*'])
    const manager = await makeEmployee({ firstName: 'Mgr', lastName: 'Hr', employeeCode: 'MH1' })
    await testPrisma.userRole.create({ data: { userId: manager.userId, roleId: role.id } })

    const subordinate = await makeEmployee({
      firstName: 'Sub',
      lastName: 'Two',
      employeeCode: 'S002',
      managerId: manager.id,
    })

    await makeRule({
      name: 'leave-chain',
      entityType: 'LeaveRequest',
      approverChain: ['manager', 'hr_admin'],
    })

    const result = await resolveApprovers('LeaveRequest', { employeeId: subordinate.id })
    expect(result).toEqual([manager.userId])
  })

  it('applies condition matching — gte threshold picks the high-value rule', async () => {
    const role = await makeRole('finance', [])
    const hrRole = await makeRole('hr_admin', [])
    const finance = await makeUser('fin@example.com')
    const hr = await makeUser('hr2@example.com')
    await testPrisma.userRole.create({ data: { userId: finance.id, roleId: role.id } })
    await testPrisma.userRole.create({ data: { userId: hr.id, roleId: hrRole.id } })

    // Lower priority number wins. The 5-day rule has priority 1; default has 100.
    await makeRule({
      name: 'big-leave',
      entityType: 'LeaveRequest',
      priority: 1,
      condition: { field: 'days', op: 'gte', value: 5 },
      approverChain: ['finance'],
    })
    await makeRule({
      name: 'small-leave',
      entityType: 'LeaveRequest',
      priority: 100,
      approverChain: ['hr_admin'],
    })

    expect(await resolveApprovers('LeaveRequest', { days: 10 })).toEqual([finance.id])
    expect(await resolveApprovers('LeaveRequest', { days: 2 })).toEqual([hr.id])
  })

  it('ignores inactive rules', async () => {
    const role = await makeRole('finance', [])
    const finance = await makeUser('fin2@example.com')
    await testPrisma.userRole.create({ data: { userId: finance.id, roleId: role.id } })

    await makeRule({
      name: 'inactive',
      entityType: 'LeaveRequest',
      approverChain: ['finance'],
      active: false,
    })

    const result = await resolveApprovers('LeaveRequest', { days: 10 })
    expect(result).toBeNull()
  })

  it('skips a rule with malformed condition JSON but evaluates later rules', async () => {
    const role = await makeRole('hr_admin', [])
    const hr = await makeUser('hr3@example.com')
    await testPrisma.userRole.create({ data: { userId: hr.id, roleId: role.id } })

    // Bad-condition rule has lower priority number (would normally win) but
    // its malformed JSON must cause it to be skipped, letting the next rule
    // produce the answer.
    await testPrisma.approvalRule.create({
      data: {
        name: 'broken',
        entityType: 'LeaveRequest',
        priority: 1,
        condition: '{not valid json',
        approverChain: JSON.stringify(['hr_admin']),
        active: true,
      },
    })
    await makeRule({
      name: 'fallback',
      entityType: 'LeaveRequest',
      priority: 50,
      approverChain: ['hr_admin'],
    })

    const result = await resolveApprovers('LeaveRequest', {})
    expect(result).toEqual([hr.id])
  })

  it('falls through to the next rule when its chain resolves to an empty list', async () => {
    // First (higher-priority) rule targets a role nobody holds → empty chain
    // → resolver moves to the next rule.
    await makeRole('finance', [])
    const hrRole = await makeRole('hr_admin', [])
    const hr = await makeUser('hr4@example.com')
    await testPrisma.userRole.create({ data: { userId: hr.id, roleId: hrRole.id } })

    await makeRule({
      name: 'finance-first',
      entityType: 'LeaveRequest',
      priority: 1,
      approverChain: ['finance'],
    })
    await makeRule({
      name: 'hr-fallback',
      entityType: 'LeaveRequest',
      priority: 100,
      approverChain: ['hr_admin'],
    })

    const result = await resolveApprovers('LeaveRequest', {})
    expect(result).toEqual([hr.id])
  })

  it('only considers rules for the requested entityType', async () => {
    const role = await makeRole('finance', [])
    const finance = await makeUser('fin3@example.com')
    await testPrisma.userRole.create({ data: { userId: finance.id, roleId: role.id } })

    await makeRule({
      name: 'expense-rule',
      entityType: 'Expense',
      approverChain: ['finance'],
    })

    expect(await resolveApprovers('LeaveRequest', {})).toBeNull()
    expect(await resolveApprovers('Expense', {})).toEqual([finance.id])
  })
})
