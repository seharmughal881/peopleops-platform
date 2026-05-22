import { Button, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './Layout'

export interface LeaveDecisionEmailProps {
  recipientName: string
  decision: 'approved' | 'rejected' | 'pending'
  leaveType: string
  startDate: string
  endDate: string
  days: number
  comments?: string | null
  decidedBy?: string
  link?: string
}

const PALETTE = {
  approved: { color: '#047857', label: 'Approved' },
  rejected: { color: '#b91c1c', label: 'Rejected' },
  pending: { color: '#92400e', label: 'Awaiting decision' },
}

export function LeaveDecisionEmail({
  recipientName,
  decision,
  leaveType,
  startDate,
  endDate,
  days,
  comments,
  decidedBy,
  link,
}: LeaveDecisionEmailProps) {
  const pal = PALETTE[decision]
  return (
    <EmailLayout preview={`Your ${leaveType} request was ${pal.label.toLowerCase()}.`}>
      <Text style={emailStyles.h1}>Leave request — {pal.label}</Text>
      <Text style={emailStyles.p}>Hi {recipientName},</Text>
      <Text style={emailStyles.p}>
        Your request for <strong>{leaveType}</strong> has been{' '}
        <span style={{ color: pal.color, fontWeight: 600 }}>{pal.label.toLowerCase()}</span>
        {decidedBy ? ` by ${decidedBy}` : ''}.
      </Text>

      <div style={emailStyles.kv}>
        <Text style={emailStyles.kvRow}>
          <span style={emailStyles.kvKey}>Dates:</span>
          {startDate} → {endDate}
        </Text>
        <Text style={emailStyles.kvRow}>
          <span style={emailStyles.kvKey}>Days:</span>
          {days}
        </Text>
        {comments && (
          <Text style={emailStyles.kvRow}>
            <span style={emailStyles.kvKey}>Comments:</span>
            {comments}
          </Text>
        )}
      </div>

      {link && (
        <Button href={link} style={emailStyles.button}>
          View request
        </Button>
      )}
    </EmailLayout>
  )
}

export function leaveDecisionEmailText(p: LeaveDecisionEmailProps): string {
  const label = PALETTE[p.decision].label
  const lines = [
    `Hi ${p.recipientName},`,
    '',
    `Your ${p.leaveType} request has been ${label.toLowerCase()}${p.decidedBy ? ` by ${p.decidedBy}` : ''}.`,
    `Dates: ${p.startDate} → ${p.endDate}`,
    `Days: ${p.days}`,
  ]
  if (p.comments) lines.push(`Comments: ${p.comments}`)
  if (p.link) lines.push('', `View: ${p.link}`)
  return lines.join('\n')
}
