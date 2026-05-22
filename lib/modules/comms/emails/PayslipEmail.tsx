import { Button, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './Layout'

export interface PayslipEmailProps {
  recipientName: string
  periodLabel: string
  netPay: string
  currency?: string
  downloadUrl?: string
}

export function PayslipEmail({
  recipientName,
  periodLabel,
  netPay,
  currency = 'USD',
  downloadUrl,
}: PayslipEmailProps) {
  return (
    <EmailLayout preview={`Your ${periodLabel} payslip is ready.`}>
      <Text style={emailStyles.h1}>Your payslip is ready</Text>
      <Text style={emailStyles.p}>Hi {recipientName},</Text>
      <Text style={emailStyles.p}>
        Your payslip for <strong>{periodLabel}</strong> is now available.
      </Text>

      <div style={emailStyles.kv}>
        <Text style={emailStyles.kvRow}>
          <span style={emailStyles.kvKey}>Period:</span>
          {periodLabel}
        </Text>
        <Text style={emailStyles.kvRow}>
          <span style={emailStyles.kvKey}>Net pay:</span>
          <strong>
            {netPay} {currency}
          </strong>
        </Text>
      </div>

      {downloadUrl && (
        <Button href={downloadUrl} style={emailStyles.button}>
          View payslip
        </Button>
      )}
    </EmailLayout>
  )
}

export function payslipEmailText(p: PayslipEmailProps): string {
  const lines = [
    `Hi ${p.recipientName},`,
    '',
    `Your payslip for ${p.periodLabel} is ready.`,
    `Net pay: ${p.netPay} ${p.currency ?? 'USD'}`,
  ]
  if (p.downloadUrl) lines.push('', `View: ${p.downloadUrl}`)
  return lines.join('\n')
}
