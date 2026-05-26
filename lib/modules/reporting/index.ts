import 'server-only'
import { prisma } from '@/lib/db/client'
import { startOfMonth, startOfNextMonth } from './_time'

export {
  headcountByDepartment,
  headcountTotals,
  headcountMonthlyFlow,
  headcountTrend,
  tenureDistribution,
} from './headcount'

export {
  attritionForWindow,
  attritionThisYear,
  attritionMonthlyTrend,
  attritionByDepartment,
  attritionByTenure,
} from './attrition'

export {
  hiringFunnel,
  candidatesBySource,
  applicationsMonthlyTrend,
  timeToHire,
  openJobsSummary,
} from './hiring'

export {
  attendanceInsights,
  attendanceDailyTrend,
  topLateComers,
  topAbsentees,
  dailyAttendanceRoster,
  monthlyAttendanceInsights,
  monthlyLateCheckIns,
  monthlyOvertimeLogs,
  type DailyAttendanceRow,
  type MonthlyLateRow,
  type MonthlyOvertimeRow,
} from './attendance'

export async function leaveSummary() {
  const requests = await prisma.leaveRequest.findMany()
  return {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  }
}

export async function monthlyLeaveSummary(ref: Date = new Date()) {
  const start = startOfMonth(ref)
  const end = startOfNextMonth(ref)
  const requests = await prisma.leaveRequest.findMany({
    where: {
      OR: [
        { startDate: { gte: start, lt: end } },
        { startDate: { lt: end }, endDate: { gte: start } },
      ],
    },
    select: { status: true, days: true },
  })
  let approvedDays = 0
  let pending = 0
  let approved = 0
  for (const r of requests) {
    if (r.status === 'approved') {
      approved++
      approvedDays += r.days
    } else if (r.status === 'pending') {
      pending++
    }
  }
  return {
    monthLabel: ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    total: requests.length,
    approved,
    pending,
    approvedDays: Math.round(approvedDays * 10) / 10,
  }
}
