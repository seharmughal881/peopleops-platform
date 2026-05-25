import { requireUser } from '@/lib/modules/auth'
import { getEmployeeByUserId } from '@/lib/modules/employee'
import { parseEmergencyContacts } from '@/lib/modules/employee/contacts-schema'
import { listMySkills } from '@/lib/modules/employee/skills'
import { getMyDiversity } from '@/lib/modules/diversity'
import { Card, CardHeader } from '@/lib/ui/Card'
import { ProfileForm } from './ProfileForm'
import { EmergencyContactsForm } from './EmergencyContactsForm'
import { SkillsManager } from './SkillsManager'
import { DiversityForm } from './DiversityForm'
import { ChangePasswordForm } from './ChangePasswordForm'

export default async function ProfilePage() {
  const user = await requireUser()
  const employee = user.employee ? await getEmployeeByUserId(user.id) : null

  if (!employee) {
    return (
      <Card>
        <p>No employee record linked to your account.</p>
      </Card>
    )
  }

  const [contacts, skills, diversity] = await Promise.all([
    parseEmergencyContacts(employee.profile?.emergencyContacts),
    listMySkills(employee.id),
    getMyDiversity(employee.id),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader title="Employment" subtitle={`Code: ${employee.employeeCode}`} />
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-foreground-muted">Job title</dt>
          <dd>{employee.jobTitle ?? '—'}</dd>
          <dt className="text-foreground-muted">Department</dt>
          <dd>{employee.department?.name ?? '—'}</dd>
          <dt className="text-foreground-muted">Join date</dt>
          <dd>{new Date(employee.joinDate).toLocaleDateString()}</dd>
          <dt className="text-foreground-muted">Manager</dt>
          <dd>{employee.manager ? `${employee.manager.firstName} ${employee.manager.lastName}` : '—'}</dd>
        </dl>
      </Card>

      <Card>
        <CardHeader title="Personal information" subtitle="Update your contact details" />
        <ProfileForm
          defaults={{
            firstName: employee.firstName,
            lastName: employee.lastName,
            phone: employee.profile?.phone ?? '',
            personalEmail: employee.profile?.personalEmail ?? '',
            address: employee.profile?.address ?? '',
          }}
        />
      </Card>

      <Card>
        <CardHeader
          title="Change password"
          subtitle="Update the password used to sign in to your account"
        />
        <ChangePasswordForm />
      </Card>

      <Card>
        <CardHeader title="Emergency contacts" subtitle="People we should contact in an emergency" />
        <EmergencyContactsForm defaults={contacts} />
      </Card>

      <Card>
        <CardHeader title="Skills & certifications" />
        <SkillsManager skills={skills} />
      </Card>

      <Card>
        <CardHeader
          title="Diversity & inclusion"
          subtitle="Voluntary, confidential — aggregated only, never shared individually"
        />
        <DiversityForm
          defaults={{
            gender: diversity?.gender ?? '',
            pronouns: diversity?.pronouns ?? '',
            ethnicity: diversity?.ethnicity ?? '',
            veteranStatus: diversity?.veteranStatus ?? '',
            disabilityStatus: diversity?.disabilityStatus ?? '',
          }}
        />
      </Card>
    </div>
  )
}
