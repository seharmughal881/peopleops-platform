import { Button, Text } from '@react-email/components'
import { EmailLayout, emailStyles } from './Layout'

export interface InviteEmailProps {
  recipientName: string
  loginUrl: string
  tempPassword?: string
  inviterName?: string
}

export function InviteEmail({
  recipientName,
  loginUrl,
  tempPassword,
  inviterName,
}: InviteEmailProps) {
  return (
    <EmailLayout preview={`Welcome to the team, ${recipientName}.`}>
      <Text style={emailStyles.h1}>Welcome, {recipientName} 👋</Text>
      <Text style={emailStyles.p}>
        {inviterName ?? 'Your team'} has set up an account for you. Sign in to access your
        profile, leave balances, payslips, and more.
      </Text>
      <Button href={loginUrl} style={emailStyles.button}>
        Sign in
      </Button>
      {tempPassword && (
        <>
          <Text style={{ ...emailStyles.muted, marginTop: 18 }}>
            Your temporary password:
          </Text>
          <Text
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 14,
              background: '#f3f4f6',
              padding: '8px 12px',
              borderRadius: 6,
              display: 'inline-block',
              margin: 0,
            }}
          >
            {tempPassword}
          </Text>
          <Text style={emailStyles.muted}>
            You&apos;ll be asked to change it on first sign-in.
          </Text>
        </>
      )}
    </EmailLayout>
  )
}

export function inviteEmailText({
  recipientName,
  loginUrl,
  tempPassword,
  inviterName,
}: InviteEmailProps): string {
  const lines = [
    `Welcome, ${recipientName}.`,
    '',
    `${inviterName ?? 'Your team'} has set up an account for you.`,
    `Sign in: ${loginUrl}`,
  ]
  if (tempPassword) {
    lines.push('', `Temporary password: ${tempPassword}`, 'Please change it on first sign-in.')
  }
  return lines.join('\n')
}
