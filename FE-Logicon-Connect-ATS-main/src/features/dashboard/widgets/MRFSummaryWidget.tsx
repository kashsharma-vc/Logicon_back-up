import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { DonutSummary } from '@/features/dashboard/components/DonutSummary'
import { HorizontalBarChart } from '@/features/dashboard/components/HorizontalBarChart'
import { TrendSparkline } from '@/features/dashboard/components/TrendSparkline'
import { WidgetDrilldownAction } from '@/features/dashboard/components/WidgetDrilldownAction'
import { Badge } from '@/components/ui/Badge'
import type { DashboardMRFSection } from '@/features/dashboard/types'
import { mrfStatusVariant } from '@/features/dashboard/dashboardChartUtils'
import { formatShortDate, mrfStatusLabel, mrfStatusVariant as mrfBadgeVariant } from '@/features/dashboard/dashboardFormatters'
import type { StatusBadgeVariant } from '@/features/dashboard/dashboardFormatters'

interface MRFSummaryWidgetProps {
  data: DashboardMRFSection
}

export function MRFSummaryWidget({ data }: MRFSummaryWidgetProps) {
  const { total, recent, charts, drilldowns } = data
  const byStatus = charts?.by_status ?? []
  const bySite = charts?.by_site ?? []
  const monthlyTrend = charts?.monthly_trend ?? []

  return (
    <DashboardWidgetCard
      id="mrf-summary"
      title="MRF"
      description={`${total} manpower request${total !== 1 ? 's' : ''} in scope.`}
      action={<WidgetDrilldownAction to={drilldowns?.all} label="View MRFs" fallbackTo="/mrf" />}
      empty={total === 0 && !byStatus.some((s) => s.count > 0) ? 'No MRF records in scope.' : undefined}
    >
      <div className="space-y-4">
        <ChartCard title="Status distribution">
          <DonutSummary
            segments={byStatus.map((item) => ({
              key: item.key,
              label: item.label,
              value: item.count,
              url: item.url,
              variant: mrfStatusVariant(item.key),
            }))}
            centerLabel="MRFs"
            centerValue={total}
            emptyLabel="No status breakdown."
          />
        </ChartCard>

        {bySite.length > 0 ? (
          <ChartCard title="Top sites">
            <HorizontalBarChart
              items={bySite.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: 'info',
              }))}
              emptyLabel="No site breakdown."
            />
          </ChartCard>
        ) : null}

        {monthlyTrend.length > 0 ? (
          <ChartCard title="6-month trend">
            <TrendSparkline items={monthlyTrend} />
          </ChartCard>
        ) : null}

        {recent.length > 0 ? (
          <div className="border-t border-app-border pt-3">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-app-subtle">Recent</p>
            <ul className="space-y-1.5">
              {recent.map((mrf) => (
                <li key={mrf.id} className="flex items-center gap-2 text-xs">
                  <Badge variant={mrfBadgeVariant(mrf.status) as StatusBadgeVariant}>
                    {mrfStatusLabel(mrf.status)}
                  </Badge>
                  <Link to={`/mrf/${mrf.id}`} className="truncate text-app-text hover:text-brand-600 hover:underline">
                    {mrf.request_number || `#${mrf.id}`}
                    {mrf.site_name ? ` · ${mrf.site_name}` : ''}
                  </Link>
                  <span className="ml-auto shrink-0 text-app-subtle">{formatShortDate(mrf.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </DashboardWidgetCard>
  )
}
