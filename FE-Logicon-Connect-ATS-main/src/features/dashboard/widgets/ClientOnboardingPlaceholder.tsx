import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'

export function ClientOnboardingPlaceholder() {
  return (
    <DashboardWidgetCard
      id="client-onboarding-pipeline"
      title="Mobilisation"
      description="Sales-led expansion requests."
      action={
        <Link
          to="/mobilisation"
          className="inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-muted px-3 py-1.5 text-xs font-medium text-app-text hover:border-brand-600 hover:text-brand-700"
        >
          Open pipeline
        </Link>
      }
    >
      <p className="text-sm text-app-secondary">Mobilisation pipeline will appear here.</p>
    </DashboardWidgetCard>
  )
}
