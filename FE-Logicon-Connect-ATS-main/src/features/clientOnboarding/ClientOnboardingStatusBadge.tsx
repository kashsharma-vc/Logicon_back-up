import { Badge } from '@/components/ui/Badge'
import type { ClientOnboardingStatus } from '@/features/clientOnboarding/types'

function variantForStatus(s: ClientOnboardingStatus): 'neutral' | 'info' | 'attention' | 'success' | 'danger' {
  switch (s) {
    case 'draft':
    case 'cancelled':
      return 'neutral'
    case 'submitted':
      return 'info'
    case 'in_review':
      return 'attention'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

function label(s: ClientOnboardingStatus) {
  return String(s).replace(/_/g, ' ')
}

export function ClientOnboardingStatusBadge({ status }: { status: ClientOnboardingStatus }) {
  return <Badge variant={variantForStatus(status)}>{label(status)}</Badge>
}
