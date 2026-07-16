import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'

export function MyTasksPreviewWidget() {
  return (
    <DashboardWidgetCard
      id="my-tasks-preview"
      title="My tasks"
      description="Approval steps assigned to you."
      action={
        <Link
          to="/my-tasks"
          className="inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-muted px-3 py-1.5 text-xs font-medium text-app-text hover:border-brand-600 hover:text-brand-700"
        >
          Open inbox
        </Link>
      }
    >
      <p className="text-sm text-app-secondary">Your assigned approval tasks will appear here.</p>
    </DashboardWidgetCard>
  )
}
