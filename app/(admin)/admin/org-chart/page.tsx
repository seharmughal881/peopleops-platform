import { getOrgChart, type OrgNode } from '@/lib/modules/employee'
import { Card, CardHeader } from '@/lib/ui/Card'

function Tree({ nodes, depth = 0 }: { nodes: OrgNode[]; depth?: number }) {
  return (
    <ul className={depth === 0 ? 'space-y-2' : 'ml-6 mt-2 space-y-2 border-l border-border pl-4'}>
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="font-medium">{n.firstName} {n.lastName}</p>
            <p className="text-xs text-foreground-muted">{n.jobTitle ?? '—'} · {n.department?.name ?? '—'}</p>
          </div>
          {n.reports.length > 0 && <Tree nodes={n.reports} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  )
}

export default async function OrgChartPage() {
  const tree = await getOrgChart()
  return (
    <Card>
      <CardHeader title="Organizational chart" />
      {tree.length === 0 ? <p className="text-sm text-foreground-muted">No employees yet.</p> : <Tree nodes={tree} />}
    </Card>
  )
}
