import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'

export function IntakePlaceholder() {
  return (
    <DashboardWidgetCard
      id="intake-signals"
      title="Intake"
      description="Applications from campaigns."
      action={
        <Link
          to="/intake-submissions"
          className="inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-muted px-3 py-1.5 text-xs font-medium text-app-text hover:border-brand-600 hover:text-brand-700"
        >
          Open submissions
        </Link>
      }
    >
      <p className="text-sm text-app-secondary">Candidate intake signals will appear here.</p>
    </DashboardWidgetCard>
  )
}
