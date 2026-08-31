import { Badge } from '@/components/ui/Badge'
import type { MRFStatus } from '@/features/mrf/types'

function label(status: string): string {
  return status
    .split('_')
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ')
}

function variant(status: string) {
  const s = status as MRFStatus
  if (s === 'draft' || s === 'cancelled') return 'neutral'
  if (s === 'submitted') return 'info'
  if (s === 'hr_review') return 'attention'
  if (s === 'finance_review' || s === 'admin_review') return 'warning'
  if (s === 'client_review') return 'info'
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  return 'neutral'
}

export function MRFStatusBadge({ status }: { status: string }) {
  return <Badge variant={variant(status)}>{label(status)}</Badge>
}



