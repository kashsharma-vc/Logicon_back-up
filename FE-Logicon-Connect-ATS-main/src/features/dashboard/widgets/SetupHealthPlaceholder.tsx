import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'

export function SetupHealthPlaceholder() {
  return (
    <DashboardWidgetCard
      id="setup-health"
      title="Setup health"
      description="Reference data and approval configuration."
    >
      <p className="text-sm text-app-secondary">Configuration health checks will appear here.</p>
    </DashboardWidgetCard>
  )
}
