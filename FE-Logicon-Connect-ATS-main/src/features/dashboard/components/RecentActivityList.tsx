import { Badge } from '@/components/ui/Badge'
import { DrilldownLink } from '@/features/dashboard/components/DrilldownLink'
import type { DashboardRecentActivityItem } from '@/features/dashboard/types'
import { activityTypeBadge } from '@/features/dashboard/dashboardChartUtils'
import { formatShortDate } from '@/features/dashboard/dashboardFormatters'

interface RecentActivityListProps {
  items: DashboardRecentActivityItem[]
}

function resolveUrl(item: DashboardRecentActivityItem): string | undefined {
  if (item.url) return item.url
  if (item.type === 'mrf') return `/mrf/${item.id}`
  if (item.type === 'onboarding') return `/mobilisation/${item.id}`
  return undefined
}

export function RecentActivityList({ items }: RecentActivityListProps) {
  if (!items.length) {
    return <p className="text-sm text-app-secondary">No recent activity.</p>
  }

  return (
    <ul className="space-y-2">
      {items.map((item, idx) => {
        const url = resolveUrl(item)
        const badge = activityTypeBadge(item.type, item.target_type)
        const subtitle = item.subtitle ?? item.status.replace(/_/g, ' ')

        return (
          <li key={`${item.type}-${item.id}-${idx}`} className="flex items-start gap-2 text-xs">
            <Badge variant="neutral" className="mt-0.5 shrink-0 uppercase">
              {badge}
            </Badge>
            <div className="min-w-0 flex-1">
              <DrilldownLink
                url={url}
                className="block truncate font-medium text-app-text hover:underline"
              >
                {item.title}
              </DrilldownLink>
              <span className="block truncate text-app-subtle">
                {subtitle}
                {' · '}
                {formatShortDate(item.created_at)}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
