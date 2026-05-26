export type StatusFilter = 'all' | 'late' | 'on-time' | 'working' | 'done' | 'overtime' | 'missed'

export const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'on-time', label: 'On-time' },
  { value: 'late', label: 'Late' },
  { value: 'working', label: 'Working' },
  { value: 'done', label: 'Done' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'missed', label: 'Missed' },
]

export function resolveStatusFilter(raw: string | undefined): StatusFilter {
  switch (raw) {
    case 'late':
    case 'on-time':
    case 'working':
    case 'done':
    case 'overtime':
    case 'missed':
      return raw
    default:
      return 'all'
  }
}
