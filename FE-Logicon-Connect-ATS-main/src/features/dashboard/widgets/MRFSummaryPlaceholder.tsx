import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'

export function MRFSummaryPlaceholder() {
  return (
    <DashboardWidgetCard
      id="mrf-summary"
      title="MRF"
      description="Manpower requests."
      action={
        <Link
          to="/mrf"
          className="inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-muted px-3 py-1.5 text-xs font-medium text-app-text hover:border-brand-600 hover:text-brand-700"
        >
          Open MRF
        </Link>
      }
    >
      <p className="text-sm text-app-secondary">MRF activity summary will appear here.</p>
    </DashboardWidgetCard>
  )
}
