import { prisma } from '@/lib/db/client'

async function run() {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const emp = await prisma.employee.findFirst({
    where: { firstName: { contains: 'Habiba', mode: 'insensitive' } },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!emp) {
    console.log('Habiba not found')
    return
  }

  const logs = await prisma.attendanceLog.findMany({
    where: { employeeId: emp.id, clockIn: { gte: dayStart, lt: dayEnd } },
    select: { id: true, clockIn: true, clockOut: true, status: true },
  })
  console.log(`Found ${logs.length} log(s) for ${emp.firstName} ${emp.lastName}`)
  for (const l of logs) {
    console.log(` - ${l.id} | ${l.clockIn.toISOString()} | status=${l.status}`)
  }

  if (logs.length === 0) {
    console.log('Nothing to delete.')
    return
  }

  const result = await prisma.attendanceLog.deleteMany({
    where: { employeeId: emp.id, clockIn: { gte: dayStart, lt: dayEnd } },
  })
  console.log(`Deleted ${result.count} log(s)`)
}

run()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
