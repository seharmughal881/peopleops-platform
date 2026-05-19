import 'server-only'
import { prisma } from '@/lib/db/client'

export {
  headcountByDepartment,
  headcountTotals,
  headcountMonthlyFlow,
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
