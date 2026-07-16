import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { RecentActivityList } from '@/features/dashboard/components/RecentActivityList'
import type { DashboardRecentActivityItem } from '@/features/dashboard/types'

interface RecentActivityWidgetProps {
  items: DashboardRecentActivityItem[]
}

export function RecentActivityWidget({ items }: RecentActivityWidgetProps) {
  return (
    <DashboardWidgetCard
      id="recent-activity"
      title="Recent activity"
      description="Latest MRFs and onboarding requests in your scope."
    >
      <RecentActivityList items={items.slice(0, 10)} />
    </DashboardWidgetCard>
  )
}
