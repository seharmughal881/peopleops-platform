import { type ReactNode } from 'react'
import { requireUser } from '@/lib/modules/auth'
import { PortalShell, type NavGroup } from '@/lib/ui/PortalShell'
import {
  HomeIcon,
  UserIcon,
  FileTextIcon,
  ClockIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ReceiptIcon,
  BarChartIcon,
  WalletIcon,
  UsersIcon,
  ShieldIcon,
  LaptopIcon,
  HeartIcon,
  PollIcon,
  KeyIcon,
} from '@/lib/ui/icons'

export default async function EmployeeLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : undefined

  const groups: NavGroup[] = [
    {
      label: 'Personal',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: <HomeIcon /> },
        { label: 'My Profile', href: '/profile', icon: <UserIcon /> },
        { label: 'My Documents', href: '/documents', icon: <FileTextIcon /> },
        { label: 'Security', href: '/profile/security', icon: <KeyIcon /> },
      ],
    },
    {
      label: 'Work',
      items: [
        { label: 'Attendance', href: '/attendance', icon: <ClockIcon /> },
        { label: 'Timesheet', href: '/timesheet', icon: <ClockIcon /> },
        { label: 'Leave', href: '/leave', icon: <CalendarIcon /> },
        { label: 'Expenses', href: '/expenses', icon: <ReceiptIcon /> },
        { label: 'Benefits', href: '/benefits', icon: <HeartIcon /> },
        { label: 'Performance', href: '/performance', icon: <BarChartIcon /> },
        { label: 'My KPIs', href: '/performance/kpi', icon: <BarChartIcon /> },
        { label: 'Payslips', href: '/payslips', icon: <WalletIcon /> },
        { label: 'My equipment', href: '/my-assets', icon: <LaptopIcon /> },
      ],
    },
    {
      label: 'Community',
      items: [
        { label: 'Recognition', href: '/recognition', icon: <HeartIcon /> },
        { label: 'Events', href: '/events', icon: <CalendarDaysIcon /> },
        { label: 'Surveys', href: '/surveys', icon: <PollIcon /> },
        { label: 'Policies', href: '/policies', icon: <FileTextIcon /> },
      ],
    },
  ]

  if (user.permissions.includes('leave:approve') || user.roles.includes('manager')) {
    groups.push({
      label: 'Team',
      items: [{ label: 'Manager portal', href: '/manager', icon: <UsersIcon /> }],
    })
  }
  if (user.roles.includes('super_admin') || user.roles.includes('hr_admin')) {
    groups.push({
      label: 'Admin',
      items: [{ label: 'Admin portal', href: '/admin', icon: <ShieldIcon /> }],
    })
  }

  return (
    <PortalShell title="Employee Portal" user={{ email: user.email, name }} groups={groups}>
      {children}
    </PortalShell>
  )
}
