import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'

export function BudgetPlaceholder() {
  return (
    <DashboardWidgetCard
      id="budget-status"
      title="Budget"
      description="Plans and utilization."
      action={
        <Link
          to="/budgets"
          className="inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-muted px-3 py-1.5 text-xs font-medium text-app-text hover:border-brand-600 hover:text-brand-700"
        >
          Open budgets
        </Link>
      }
    >
      <p className="text-sm text-app-secondary">Budget status and exceptions will appear here.</p>
    </DashboardWidgetCard>
  )
}
