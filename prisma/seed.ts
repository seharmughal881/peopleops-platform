import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const PERMISSIONS = {
  super_admin: ['*'],
  hr_admin: [
    'employee:*', 'leave:*', 'attendance:*', 'payroll:*',
    'reports:read', 'audit:read', 'role:read', 'policy:*',
    'benefit:*', 'hiring:*',
  ],
  recruiter: ['employee:read', 'employee:create', 'hiring:*'],
  manager: [
    'employee:read', 'leave:approve', 'leave:read',
    'attendance:read', 'reports:read', 'team:read',
  ],
  employee: [
    'self:read', 'self:update', 'leave:submit',
    'attendance:clock', 'payslip:download:self',
  ],
  finance: ['payroll:*', 'expense:*', 'reports:read'],
  it_ops: ['asset:*', 'employee:read'],
}

async function main() {
  console.log('Seeding…')

  for (const [name, perms] of Object.entries(PERMISSIONS)) {
    await prisma.role.upsert({
      where: { name },
      update: { permissions: JSON.stringify(perms) },
      create: {
        name,
        permissions: JSON.stringify(perms),
        isSystem: true,
        description: `System role: ${name}`,
      },
    })
  }
  console.log('  Roles seeded')

  const engineering = await prisma.department.upsert({
    where: { name: 'Engineering' },
    update: {},
    create: { name: 'Engineering' },
  })
  await prisma.department.upsert({
    where: { name: 'Human Resources' },
    update: {},
    create: { name: 'Human Resources' },
  })
  await prisma.department.upsert({
    where: { name: 'Finance' },
    update: {},
    create: { name: 'Finance' },
  })
  console.log('  Departments seeded')

  const hashedPassword = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      hashedPassword,
      status: 'active',
    },
  })

  await prisma.employee.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      employeeCode: 'EMP-0001',
      firstName: 'Super',
      lastName: 'Admin',
      joinDate: new Date('2024-01-01'),
      jobTitle: 'Administrator',
      departmentId: engineering.id,
    },
  })

  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'super_admin' } })
  const existingSuperRole = await prisma.userRole.findFirst({
    where: { userId: adminUser.id, roleId: superAdminRole.id, scope: null },
  })
  if (!existingSuperRole) {
    await prisma.userRole.create({ data: { userId: adminUser.id, roleId: superAdminRole.id } })
  }
  console.log('  Super admin created (admin@example.com / admin123)')

  const empPassword = await bcrypt.hash('employee123', 10)
  const empUser = await prisma.user.upsert({
    where: { email: 'employee@example.com' },
    update: {},
    create: { email: 'employee@example.com', hashedPassword: empPassword, status: 'active' },
  })
  await prisma.employee.upsert({
    where: { userId: empUser.id },
    update: {},
    create: {
      userId: empUser.id,
      employeeCode: 'EMP-0002',
      firstName: 'Jane',
      lastName: 'Doe',
      joinDate: new Date('2024-03-15'),
      jobTitle: 'Software Engineer',
      departmentId: engineering.id,
    },
  })
  const empRole = await prisma.role.findUniqueOrThrow({ where: { name: 'employee' } })
  const existingEmpRole = await prisma.userRole.findFirst({
    where: { userId: empUser.id, roleId: empRole.id, scope: null },
  })
  if (!existingEmpRole) {
    await prisma.userRole.create({ data: { userId: empUser.id, roleId: empRole.id } })
  }
  console.log('  Sample employee created (employee@example.com / employee123)')

  const policies = [
    { name: 'Annual Vacation', leaveType: 'vacation', annualEntitlement: 20, carryForwardMax: 5 },
    { name: 'Sick Leave', leaveType: 'sick', annualEntitlement: 10, carryForwardMax: 0 },
    { name: 'Personal Leave', leaveType: 'personal', annualEntitlement: 5, carryForwardMax: 0 },
  ]
  for (const p of policies) {
    await prisma.leavePolicy.upsert({ where: { name: p.name }, update: {}, create: p })
  }
  console.log('  Leave policies seeded')

  const employees = await prisma.employee.findMany()
  const year = new Date().getFullYear()
  for (const emp of employees) {
    for (const p of policies) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveType_year: {
            employeeId: emp.id,
            leaveType: p.leaveType,
            year,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          leaveType: p.leaveType,
          year,
          balance: p.annualEntitlement,
        },
      })
    }
  }
  console.log('  Leave balances initialized')

  await prisma.shiftPattern.upsert({
    where: { name: 'Standard 9-5' },
    update: {},
    create: { name: 'Standard 9-5', startTime: '09:00', endTime: '17:00', breakMinutes: 60 },
  })
  console.log('  Default shift seeded')

  const benefitPlans = [
    {
      name: 'Health PPO',
      type: 'health',
      description: 'Comprehensive medical coverage with in- and out-of-network providers.',
      monthlyPremium: 450,
      employerShare: 300,
      coversDependents: true,
    },
    {
      name: 'Dental Standard',
      type: 'dental',
      description: 'Routine cleanings, fillings, and major dental procedures.',
      monthlyPremium: 35,
      employerShare: 20,
      coversDependents: true,
    },
    {
      name: 'Vision Care',
      type: 'vision',
      description: 'Annual eye exams plus allowance for frames or contacts.',
      monthlyPremium: 15,
      employerShare: 10,
      coversDependents: true,
    },
    {
      name: '401(k) Match',
      type: 'retirement',
      description: 'Employer matches up to 4% of salary contributions.',
      monthlyPremium: 0,
      employerShare: 0,
      coversDependents: false,
    },
  ]
  for (const plan of benefitPlans) {
    const existing = await prisma.benefitPlan.findFirst({ where: { name: plan.name } })
    if (!existing) await prisma.benefitPlan.create({ data: plan })
  }
  console.log('  Benefit plans seeded')

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
