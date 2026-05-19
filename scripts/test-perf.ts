import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const jane = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0002' } })
  const goal = await p.goal.create({
    data: {
      employeeId: jane.id,
      createdById: jane.id,
      title: 'Ship the new analytics dashboard',
      description: 'End-to-end with charts and exports',
      type: 'objective',
      targetDate: new Date('2026-08-01'),
      progress: 30,
    },
  })
  console.log('Goal created:', goal.id, 'progress:', goal.progress)

  const cycle = await p.reviewCycle.create({
    data: { name: '2026 Q2 Review', startDate: new Date('2026-04-01'), endDate: new Date('2026-06-30'), status: 'active' },
  })
  console.log('Cycle:', cycle.id)

  const admin = await p.employee.findUniqueOrThrow({ where: { employeeCode: 'EMP-0001' } })
  await p.employee.update({ where: { id: jane.id }, data: { managerId: admin.id } })

  const review = await p.review.create({
    data: { cycleId: cycle.id, subjectId: jane.id, reviewerId: admin.id, type: 'manager' },
  })
  console.log('Review for admin to write:', review.id)

  const pip = await p.pIP.create({
    data: {
      subjectId: jane.id,
      managerId: admin.id,
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-07-01'),
      reason: 'Sample PIP for smoke testing — close communication on deliverables',
      goals: JSON.stringify([
        { title: 'Weekly progress updates', dueDate: '2026-05-15', status: 'pending' },
        { title: 'Complete dashboard project', dueDate: '2026-06-30', status: 'pending' },
      ]),
    },
  })
  console.log('PIP:', pip.id)
  await p.$disconnect()
}
main()
