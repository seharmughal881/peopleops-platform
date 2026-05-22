import { prisma } from '@/lib/db/client'
import { notify } from '@/lib/modules/notifications'
import { documentsExpiringSoon } from '@/lib/modules/compliance'
import { activeShiftFor, shiftStartDate } from '@/lib/modules/attendance/shift-lookup'
import { postToSlack, announcementMessage, isSlackConfigured } from '@/lib/modules/integrations/slack'
import {
  postToTeams,
  teamsAnnouncementMessage,
  teamsNotificationMessage,
  isTeamsConfigured,
} from '@/lib/modules/integrations/teams'
import type { JobPayload } from './queue'
import nodemailer, { type Transporter } from 'nodemailer'

let transporter: Transporter | null | undefined

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter
  const host = process.env.SMTP_HOST
  if (!host) {
    transporter = null
    return null
  }
  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' }
      : undefined,
  })
  return transporter
}

async function handleEmail(p: Extract<JobPayload, { kind: 'notification.email' }>) {
  const user = await prisma.user.findUnique({ where: { id: p.userId }, select: { email: true } })
  if (!user) throw new Error(`User ${p.userId} not found`)

  const tx = getTransporter()
  if (!tx) {
    console.log(`[email:no-smtp] to=${user.email} subj="${p.subject}"`)
    return
  }
  await tx.sendMail({
    from: process.env.SMTP_FROM ?? 'no-reply@example.com',
    to: user.email,
    subject: p.subject,
    text: p.body,
    ...(p.html ? { html: p.html } : {}),
  })
}

async function handleSlack(p: Extract<JobPayload, { kind: 'notification.slack' }>) {
  if (!isSlackConfigured()) {
    console.log(`[slack:no-webhook] user=${p.userId} title="${p.title}"`)
    return
  }
  const result = await postToSlack({ text: `*${p.title}*\n${p.body ?? ''}` })
  if (!result.ok) throw new Error(result.error)
}

async function handleAnnouncementSlack(p: Extract<JobPayload, { kind: 'announcement.slack-broadcast' }>) {
  if (!isSlackConfigured()) return
  const ann = await prisma.announcement.findUnique({
    where: { id: p.announcementId },
    include: { author: { include: { employee: true } } },
  })
  if (!ann) return
  const authorName = ann.author.employee
    ? `${ann.author.employee.firstName} ${ann.author.employee.lastName}`
    : ann.author.email
  const result = await postToSlack(announcementMessage(ann.title, ann.body, authorName))
  if (!result.ok) throw new Error(result.error)
}

async function handleTeams(p: Extract<JobPayload, { kind: 'notification.teams' }>) {
  if (!isTeamsConfigured()) {
    console.log(`[teams:no-webhook] user=${p.userId} title="${p.title}"`)
    return
  }
  const result = await postToTeams(teamsNotificationMessage(p.title, p.body))
  if (!result.ok) throw new Error(result.error)
}

async function handleAnnouncementTeams(p: Extract<JobPayload, { kind: 'announcement.teams-broadcast' }>) {
  if (!isTeamsConfigured()) return
  const ann = await prisma.announcement.findUnique({
    where: { id: p.announcementId },
    include: { author: { include: { employee: true } } },
  })
  if (!ann) return
  const authorName = ann.author.employee
    ? `${ann.author.employee.firstName} ${ann.author.employee.lastName}`
    : ann.author.email
  const result = await postToTeams(teamsAnnouncementMessage(ann.title, ann.body, authorName))
  if (!result.ok) throw new Error(result.error)
}

async function handleDocumentsExpirationCheck() {
  const docs = await documentsExpiringSoon(30)
  if (docs.length === 0) return

  const hrAdminRole = await prisma.role.findUnique({ where: { name: 'hr_admin' } })
  if (!hrAdminRole) return
  const recipients = await prisma.userRole.findMany({
    where: { roleId: hrAdminRole.id },
    select: { userId: true },
  })

  for (const r of recipients) {
    await notify({
      userId: r.userId,
      title: `${docs.length} document(s) expiring soon`,
      body: docs.map((d) => `${d.employee.firstName} ${d.employee.lastName} — ${d.type}`).join('\n'),
      link: '/admin',
    })
  }
}

async function handleApprovalReminder(p: Extract<JobPayload, { kind: 'leave.approval-reminder' }>) {
  const approval = await prisma.approval.findUnique({ where: { id: p.approvalId } })
  if (!approval || approval.status !== 'pending') return
  await notify({
    userId: approval.approverId,
    title: 'Approval reminder',
    body: 'You have a pending approval awaiting your decision.',
    link: '/manager/approvals',
  })
}

/**
 * Year-end leave rollover.
 * For every (employee, leaveType) pair with a balance in the previous year, create a new-year balance
 * equal to min(previous remaining balance, policy.carryForwardMax) + this year's annual entitlement.
 * Idempotent: skips employees who already have a balance for the new year.
 */
async function handleYearEndRollover(p: Extract<JobPayload, { kind: 'leave.year-end-rollover' }>) {
  const newYear = p.year ?? new Date().getFullYear()
  const prevYear = newYear - 1

  const policies = await prisma.leavePolicy.findMany({ where: { active: true } })
  const policyByType = new Map(policies.map((p) => [p.leaveType, p]))

  const prevBalances = await prisma.leaveBalance.findMany({ where: { year: prevYear } })
  let created = 0
  let skipped = 0
  let carriedTotal = 0

  for (const prev of prevBalances) {
    const exists = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveType_year: { employeeId: prev.employeeId, leaveType: prev.leaveType, year: newYear } },
    })
    if (exists) { skipped++; continue }

    const policy = policyByType.get(prev.leaveType)
    const carryCap = policy?.carryForwardMax ?? 0
    const carried = Math.min(Math.max(0, prev.balance), carryCap)
    const entitlement = policy?.annualEntitlement ?? 0

    await prisma.leaveBalance.create({
      data: {
        employeeId: prev.employeeId,
        leaveType: prev.leaveType,
        year: newYear,
        balance: carried + entitlement,
      },
    })
    created++
    carriedTotal += carried
  }

  console.log(`[year-end-rollover] year=${newYear} created=${created} skipped=${skipped} carried_total_days=${carriedTotal}`)

  // Notify HR admins
  const hrAdminRole = await prisma.role.findUnique({ where: { name: 'hr_admin' } })
  if (hrAdminRole) {
    const recipients = await prisma.userRole.findMany({
      where: { roleId: hrAdminRole.id },
      select: { userId: true },
    })
    for (const r of recipients) {
      await notify({
        userId: r.userId,
        title: `Leave balances rolled over for ${newYear}`,
        body: `${created} new balances created (${skipped} already existed). ${carriedTotal.toFixed(1)} days carried forward in total.`,
        link: '/admin/leave-policies',
      })
    }
  }
}

/**
 * Daily attendance reconciliation. For every active employee whose shift covered
 * the target day (defaults to yesterday) and who has no AttendanceLog that day,
 * insert a zero-hour log with status='missed' so the absence is reportable.
 * Idempotent: skips employees who already have any log for that day.
 */
async function handleDailyMissedCheck(p: Extract<JobPayload, { kind: 'attendance.daily-missed-check' }>) {
  const target = p.date ? new Date(p.date) : new Date(Date.now() - 24 * 60 * 60 * 1000)
  target.setHours(0, 0, 0, 0)
  const dayEnd = new Date(target)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const employees = await prisma.employee.findMany({
    where: { status: 'active' },
    select: { id: true },
  })

  let created = 0
  let skipped = 0
  let noShift = 0

  for (const emp of employees) {
    const shift = await activeShiftFor(emp.id, target)
    if (!shift) { noShift++; continue }

    const existing = await prisma.attendanceLog.findFirst({
      where: { employeeId: emp.id, clockIn: { gte: target, lt: dayEnd } },
      select: { id: true },
    })
    if (existing) { skipped++; continue }

    const anchor = shiftStartDate(target, shift)
    await prisma.attendanceLog.create({
      data: {
        employeeId: emp.id,
        clockIn: anchor,
        clockOut: anchor,
        status: 'missed',
        source: 'system',
      },
    })
    created++
  }

  console.log(
    `[attendance.daily-missed-check] day=${target.toISOString().slice(0, 10)} ` +
    `created=${created} skipped=${skipped} no_shift=${noShift}`,
  )
}

export async function processJob(payload: JobPayload): Promise<void> {
  switch (payload.kind) {
    case 'notification.email':
      return handleEmail(payload)
    case 'notification.slack':
      return handleSlack(payload)
    case 'notification.teams':
      return handleTeams(payload)
    case 'announcement.slack-broadcast':
      return handleAnnouncementSlack(payload)
    case 'announcement.teams-broadcast':
      return handleAnnouncementTeams(payload)
    case 'documents.expiration-check':
      return handleDocumentsExpirationCheck()
    case 'leave.approval-reminder':
      return handleApprovalReminder(payload)
    case 'leave.year-end-rollover':
      return handleYearEndRollover(payload)
    case 'attendance.daily-missed-check':
      return handleDailyMissedCheck(payload)
  }
}
