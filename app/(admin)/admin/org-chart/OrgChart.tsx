'use client'

import { useMemo, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export interface OrgPerson {
  id: string
  firstName: string
  lastName: string
  jobTitle: string | null
  department: string | null
  email: string | null
  managerId: string | null
}

const NODE_WIDTH = 220
const NODE_HEIGHT = 88
const H_GAP = 28
const V_GAP = 64
const LEAF_STRIDE = NODE_WIDTH + H_GAP
const LEVEL_STRIDE = NODE_HEIGHT + V_GAP

type EmployeeNodeData = {
  person: OrgPerson
  reportCount: number
  highlighted: boolean
}

type EmployeeNode = Node<EmployeeNodeData, 'employee'>

function layout(people: OrgPerson[]): { nodes: EmployeeNode[]; edges: Edge[] } {
  const byId = new Map<string, OrgPerson>(people.map((p) => [p.id, p]))
  const children = new Map<string, OrgPerson[]>()
  const roots: OrgPerson[] = []
  for (const p of people) {
    if (p.managerId && byId.has(p.managerId)) {
      const arr = children.get(p.managerId) ?? []
      arr.push(p)
      children.set(p.managerId, arr)
    } else {
      roots.push(p)
    }
  }
  for (const arr of children.values()) {
    arr.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
    )
  }
  roots.sort((a, b) =>
    `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`),
  )

  const leafCount = new Map<string, number>()
  function countLeaves(id: string): number {
    const cached = leafCount.get(id)
    if (cached !== undefined) return cached
    const kids = children.get(id) ?? []
    const n = kids.length === 0 ? 1 : kids.reduce((s, k) => s + countLeaves(k.id), 0)
    leafCount.set(id, n)
    return n
  }
  for (const p of people) countLeaves(p.id)

  const nodes: EmployeeNode[] = []
  const edges: Edge[] = []

  function place(id: string, depth: number, leafOffset: number) {
    const person = byId.get(id)!
    const kids = children.get(id) ?? []
    const myLeaves = leafCount.get(id) ?? 1
    const centerLeaf = leafOffset + (myLeaves - 1) / 2
    const x = centerLeaf * LEAF_STRIDE
    const y = depth * LEVEL_STRIDE
    nodes.push({
      id,
      type: 'employee',
      position: { x, y },
      data: { person, reportCount: kids.length, highlighted: false },
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
    let acc = leafOffset
    for (const k of kids) {
      edges.push({
        id: `${id}->${k.id}`,
        source: id,
        target: k.id,
        type: 'smoothstep',
        style: { stroke: 'var(--border-strong, #94a3b8)', strokeWidth: 1.5 },
      })
      place(k.id, depth + 1, acc)
      acc += leafCount.get(k.id) ?? 1
    }
  }

  let acc = 0
  for (const r of roots) {
    place(r.id, 0, acc)
    acc += leafCount.get(r.id) ?? 1
  }

  return { nodes, edges }
}

function EmployeeNodeView({ data, selected }: NodeProps<EmployeeNode>) {
  const initials = `${data.person.firstName.charAt(0)}${data.person.lastName.charAt(0)}`.toUpperCase()
  return (
    <div
      className={
        'flex h-full w-full items-center gap-3 rounded-md border bg-surface px-3 py-2 shadow-sm transition-colors ' +
        (selected
          ? 'border-accent shadow-[0_0_0_2px_color-mix(in_oklch,var(--accent)_30%,transparent)]'
          : data.highlighted
            ? 'border-accent'
            : 'border-border')
      }
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Top} className="!h-2 !w-2 !border-0 !bg-border-strong" />
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {data.person.firstName} {data.person.lastName}
        </p>
        <p className="truncate text-[11px] text-foreground-muted">
          {data.person.jobTitle ?? '—'}
        </p>
        <p className="truncate text-[10px] text-foreground-subtle">
          {data.person.department ?? '—'}
          {data.reportCount > 0 && ` · ${data.reportCount} report${data.reportCount === 1 ? '' : 's'}`}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="!h-2 !w-2 !border-0 !bg-border-strong" />
    </div>
  )
}

const nodeTypes = { employee: EmployeeNodeView }

export function OrgChart({ people }: { people: OrgPerson[] }) {
  const [filter, setFilter] = useState('')
  const baseGraph = useMemo(() => layout(people), [people])

  const graph = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return baseGraph
    const nodes = baseGraph.nodes.map((n) => {
      const p = n.data.person
      const hay = `${p.firstName} ${p.lastName} ${p.jobTitle ?? ''} ${p.department ?? ''} ${p.email ?? ''}`.toLowerCase()
      const match = hay.includes(q)
      return { ...n, data: { ...n.data, highlighted: match }, style: { opacity: match ? 1 : 0.25 } }
    })
    return { nodes, edges: baseGraph.edges }
  }, [baseGraph, filter])

  if (people.length === 0) {
    return <p className="text-sm text-foreground-muted">No employees yet.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Highlight by name, title, dept…"
          className="w-72 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-foreground-subtle outline-none focus:border-border-strong focus:ring-2 focus:ring-focus-ring/15"
        />
        <span className="text-xs text-foreground-subtle">
          {people.length} {people.length === 1 ? 'person' : 'people'}
        </span>
      </div>
      <div
        className="h-[640px] overflow-hidden rounded-md border border-border bg-surface-muted/30"
        style={{ ['--xy-background-color' as string]: 'transparent' }}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={graph.nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
          >
            <Background gap={24} color="color-mix(in oklch, var(--border) 80%, transparent)" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable className="!bg-surface" maskColor="color-mix(in oklch, var(--foreground) 8%, transparent)" />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}
