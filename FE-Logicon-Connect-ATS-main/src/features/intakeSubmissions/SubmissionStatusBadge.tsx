import { Badge } from '@/components/ui/Badge'
import type { SubmissionStatus } from '@/features/intakeSubmissions/types'

function labelForStatus(status: string): string {
  return status
    .split('_')
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ')
}

function variantForStatus(status: string) {
  const s = status as SubmissionStatus
  if (s === 'new') return 'info'
  if (s === 'reviewed') return 'neutral'
  if (s === 'shortlisted') return 'attention'
  if (s === 'rejected') return 'danger'
  if (s === 'contacted') return 'warning'
  if (s === 'hired') return 'success'
  if (s === 'duplicate') return 'warning'
  return 'neutral'
}

export function SubmissionStatusBadge({ status }: { status: string }) {
  return <Badge variant={variantForStatus(status)}>{labelForStatus(status)}</Badge>
}


