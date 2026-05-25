import { requireUser } from '@/lib/modules/auth'
import { getMfaStatus } from '@/lib/modules/auth/mfa'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Badge } from '@/lib/ui/Table'
import { PageHeader } from '@/lib/ui/PageHeader'
import { MfaPanel } from './MfaPanel'
import { ChangePasswordForm } from '../ChangePasswordForm'

export default async function SecurityPage() {
  const user = await requireUser()
  const mfa = await getMfaStatus(user.id)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Security" description="Manage account security settings." />

      <Card>
        <CardHeader
          title="Change password"
          subtitle="Update the password used to sign in to your account."
        />
        <ChangePasswordForm />
      </Card>

      <Card>
        <CardHeader
          title="Two-factor authentication"
          subtitle="Add a second step when signing in using an authenticator app (Google Authenticator, 1Password, Authy, etc.)."
          action={<Badge tone={mfa.enabled ? 'success' : 'neutral'} dot>{mfa.enabled ? 'Enabled' : 'Disabled'}</Badge>}
        />
        <MfaPanel initiallyEnabled={mfa.enabled} />
      </Card>
    </div>
  )
}
