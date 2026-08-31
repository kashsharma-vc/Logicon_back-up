import { Badge } from '@/components/ui/Badge'

export function BudgetStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'draft':
      return <Badge variant="neutral">Draft</Badge>
    case 'active':
      return <Badge variant="success">Active</Badge>
    case 'closed':
      return <Badge variant="attention">Closed</Badge>
    case 'inactive':
      return <Badge variant="neutral">Inactive</Badge>
    default:
      return <Badge variant="neutral">{status}</Badge>
  }
}
