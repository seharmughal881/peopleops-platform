import { type ReactNode } from 'react'
import { requireUser } from '@/lib/modules/auth'
import { PortalShell, type NavGroup } from '@/lib/ui/PortalShell'
import { redirect } from 'next/navigation'
import {
  HomeIcon,
  UsersIcon,
  NetworkIcon,
  BriefcaseIcon,
  BarChartIcon,
  CalendarIcon,
  CalendarDaysIcon,
  ClockIcon,
  WalletIcon,
  ReceiptIcon,
  HeartIcon,
  MegaphoneIcon,
  ScrollIcon,
  ShieldIcon,
  ArrowLeftIcon,
  LaptopIcon,
  KeyIcon,
  PollIcon,
  CheckSquareIcon,
} from '@/lib/ui/icons'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const allowed = user.roles.includes('super_admin') || user.roles.includes('hr_admin') || user.permissions.includes('*')
  if (!allowed) redirect('/dashboard')

  const name = user.employee ? `${user.employee.firstName} ${user.employee.lastName}` : undefined
  const groups: NavGroup[] = [
    {
      label: 'Overview',
      items: [{ label: 'Dashboard', href: '/admin', icon: <HomeIcon /> }],
    },
    {
      label: 'People',
      items: [
        { label: 'Employees', href: '/admin/employees', icon: <UsersIcon /> },
        { label: 'Org chart', href: '/admin/org-chart', icon: <NetworkIcon /> },
        { label: 'Recruitment', href: '/admin/recruitment', icon: <BriefcaseIcon /> },
        { label: 'Hiring requests', href: '/admin/hiring-requests', icon: <BriefcaseIcon /> },
        { label: 'Performance', href: '/admin/performance', icon: <BarChartIcon /> },
        { label: 'KPIs', href: '/admin/performance/kpi', icon: <BarChartIcon /> },
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Leave policies', href: '/admin/leave-policies', icon: <CalendarIcon /> },
        { label: 'Holidays', href: '/admin/holidays', icon: <CalendarDaysIcon /> },
        { label: 'Shifts', href: '/admin/shifts', icon: <ClockIcon /> },
        { label: 'Biometric devices', href: '/admin/biometric', icon: <KeyIcon /> },
        { label: 'Payroll', href: '/admin/payroll', icon: <WalletIcon /> },
        { label: 'Expenses', href: '/admin/expenses', icon: <ReceiptIcon /> },
        { label: 'Finance export', href: '/admin/finance', icon: <BarChartIcon /> },
        { label: 'Benefits', href: '/admin/benefits', icon: <HeartIcon /> },
        { label: 'Assets', href: '/admin/assets', icon: <LaptopIcon /> },
        { label: 'Licenses', href: '/admin/licenses', icon: <KeyIcon /> },
        { label: 'Announcements', href: '/admin/announcements', icon: <MegaphoneIcon /> },
        { label: 'Events', href: '/admin/events', icon: <CalendarDaysIcon /> },
        { label: 'Surveys', href: '/admin/surveys', icon: <PollIcon /> },
      ],
    },
    {
      label: 'System',
      items: [
        { label: 'Reports', href: '/admin/reports', icon: <BarChartIcon /> },
        { label: 'Audit logs', href: '/admin/audit-logs', icon: <ScrollIcon /> },
        { label: 'Roles', href: '/admin/roles', icon: <ShieldIcon /> },
        { label: 'Workflows', href: '/admin/workflows', icon: <CheckSquareIcon /> },
        { label: 'Policies', href: '/admin/policies', icon: <ScrollIcon /> },
      ],
    },
    {
      label: 'Navigation',
      items: [{ label: 'Back to dashboard', href: '/dashboard', icon: <ArrowLeftIcon /> }],
    },
  ]

  return (
    <PortalShell title="Admin Portal" user={{ email: user.email, name }} groups={groups} decorCount={9}>
      {children}
    </PortalShell>
  )
}
