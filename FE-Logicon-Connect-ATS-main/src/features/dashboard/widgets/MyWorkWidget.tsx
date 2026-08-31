import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { Badge } from '@/components/ui/Badge'
import type { DashboardMyWorkSection } from '@/features/dashboard/types'
import { formatCount, formatShortDate } from '@/features/dashboard/dashboardFormatters'

interface MyWorkWidgetProps {
  data: DashboardMyWorkSection
}

export function MyWorkWidget({ data }: MyWorkWidgetProps) {
  const { active_task_count, latest_tasks } = data

  return (
    <DashboardWidgetCard
      id="my-work"
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
      <div className="space-y-3">
        <p className="text-2xl font-semibold tabular-nums text-app-text">
          {formatCount(active_task_count)}
          <span className="ml-1.5 text-sm font-normal text-app-secondary">active tasks</span>
        </p>

        {latest_tasks.length === 0 ? (
          <p className="text-sm text-app-secondary">No active approval tasks.</p>
        ) : (
          <ul className="space-y-2">
            {latest_tasks.map((task) => (
              <li key={task.step_id} className="text-xs border-t border-app-border pt-2 first:border-t-0 first:pt-0">
                <div className="flex items-start gap-2">
                  <Badge variant="info" className="mt-0.5 shrink-0">
                    {task.target_type === 'mrf' ? 'MRF' : 'OB'}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-app-text">{task.target_title}</p>
                    <p className="text-app-subtle">{task.step_name} · {formatShortDate(task.activated_at)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardWidgetCard>
  )
}
