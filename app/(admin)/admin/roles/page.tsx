import { prisma } from '@/lib/db/client'
import { Card, CardHeader } from '@/lib/ui/Card'
import { Table, THead, TR, TH, TD, Badge } from '@/lib/ui/Table'

export default async function RolesPage() {
  const roles = await prisma.role.findMany({ orderBy: { name: 'asc' }, include: { _count: { select: { userRoles: true } } } })
  return (
    <Card>
      <CardHeader title="Roles & permissions" subtitle="System-defined roles" />
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Users</TH>
            <TH>Permissions</TH>
            <TH>System</TH>
          </TR>
        </THead>
        <tbody>
          {roles.map((r) => {
            const perms: string[] = (() => { try { return JSON.parse(r.permissions) } catch { return [] } })()
            return (
              <TR key={r.id}>
                <TD>{r.name}</TD>
                <TD>{r._count.userRoles}</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {perms.slice(0, 8).map((p) => <Badge key={p}>{p}</Badge>)}
                    {perms.length > 8 && <Badge tone="info">+{perms.length - 8}</Badge>}
                  </div>
                </TD>
                <TD>{r.isSystem ? '✓' : ''}</TD>
              </TR>
            )
          })}
        </tbody>
      </Table>
    </Card>
  )
}
