import { render } from '@react-email/render'
import { prisma } from '@/lib/db/client'
import { enqueue } from '@/lib/jobs/queue'
import { publishNotification } from '@/lib/modules/notifications/bus'
import { InviteEmail, inviteEmailText, type InviteEmailProps } from './InviteEmail'
import {
  LeaveDecisionEmail,
  leaveDecisionEmailText,
  type LeaveDecisionEmailProps,
} from './LeaveDecisionEmail'
import { PayslipEmail, payslipEmailText, type PayslipEmailProps } from './PayslipEmail'

export {
  InviteEmail,
  LeaveDecisionEmail,
  PayslipEmail,
  type InviteEmailProps,
  type LeaveDecisionEmailProps,
  type PayslipEmailProps,
}

interface SendOpts {
  userId: string
  subject: string
}

async function enqueueRendered(
  opts: SendOpts,
  component: React.ReactElement,
  text: string,
) {
  const html = await render(component)
  // Persist an in-app notification too, so users see it on next page load.
  try {
    const created = await prisma.notification.create({
      data: {
        userId: opts.userId,
        title: opts.subject,
        body: text,
        channel: 'email',
      },
    })
    publishNotification(opts.userId, {
      id: created.id,
      title: created.title,
      body: created.body,
      link: created.link,
      channel: created.channel,
      createdAt: created.createdAt.toISOString(),
    }).catch(() => {})
  } catch {
    // If the notification row fails (e.g. user gone), still try the email.
  }
  await enqueue({
    kind: 'notification.email',
    userId: opts.userId,
    subject: opts.subject,
    body: text,
    html,
  })
}

export async function sendInviteEmail(userId: string, props: InviteEmailProps) {
  return enqueueRendered(
    { userId, subject: `Welcome, ${props.recipientName}` },
    <InviteEmail {...props} />,
    inviteEmailText(props),
  )
}

export async function sendLeaveDecisionEmail(
  userId: string,
  props: LeaveDecisionEmailProps,
) {
  const subj =
    props.decision === 'approved'
      ? `Leave approved: ${props.leaveType}`
      : props.decision === 'rejected'
        ? `Leave rejected: ${props.leaveType}`
        : `Leave pending: ${props.leaveType}`
  return enqueueRendered(
    { userId, subject: subj },
    <LeaveDecisionEmail {...props} />,
    leaveDecisionEmailText(props),
  )
}

export async function sendPayslipEmail(userId: string, props: PayslipEmailProps) {
  return enqueueRendered(
    { userId, subject: `Payslip ready — ${props.periodLabel}` },
    <PayslipEmail {...props} />,
    payslipEmailText(props),
  )
}
