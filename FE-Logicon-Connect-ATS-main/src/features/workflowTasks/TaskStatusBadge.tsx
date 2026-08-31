import { Badge } from '@/components/ui/Badge'

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'

function normalize(s: string): BadgeVariant {
  const t = s.trim().toLowerCase()
  if (t === 'active' || t === 'pending') return 'attention'
  if (t === 'completed' || t === 'approved') return 'success'
  if (t === 'rejected' || t === 'cancelled') return 'danger'
  if (t === 'skipped') return 'neutral'
  return 'info'
}

/** Human-friendly label for a workflow step status from the inbox API. */
export function TaskStatusBadge({ status }: { status: string }) {
  const variant = normalize(status)
  const label = status.replace(/_/g, ' ')
  return <Badge variant={variant}>{label}</Badge>
}
