import { type ReactNode } from 'react'
import { requireUser } from '@/lib/modules/auth'
import { PortalShell, type NavGroup } from '@/lib/ui/PortalShell'
import { redirect } from 'next/navigation'
import {
  HomeIcon,
  CheckSquareIcon,
  ClockIcon,
  BarChartIcon,
  ArrowLeftIcon,
  BriefcaseIcon,
} from '@/lib/ui/icons'

const GROUPS: NavGroup[] = [
  {
    label: 'Team',
    items: [
      { label: 'Team overview', href: '/manager', icon: <HomeIcon /> },
      { label: 'Approvals', href: '/manager/approvals', icon: <CheckSquareIcon /> },
      { label: 'Team attendance', href: '/manager/attendance', icon: <ClockIcon /> },
      { label: 'Team timesheets', href: '/manager/timesheets', icon: <ClockIcon /> },
      { label: 'Performance', href: '/manager/performance', icon: <BarChartIcon /> },
      { label: 'Hiring requests', href: '/manager/hiring-requests', icon: <BriefcaseIcon /> },
    ],
  },
  {
    label: 'Navigation',
    items: [{ label: 'Back to dashboard', href: '/dashboard', icon: <ArrowLeftIcon /> }],
  },
]

export default async function ManagerLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  if (!user.permissions.includes('leave:approve') && !user.permissions.includes('*')) {
    redirect('/dashboard')
  }
  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : undefined

  return (
    <PortalShell title="Manager Portal" user={{ email: user.email, name }} groups={GROUPS}>
      {children}
    </PortalShell>
  )
}
