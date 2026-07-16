import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { DonutSummary } from '@/features/dashboard/components/DonutSummary'
import { HorizontalBarChart } from '@/features/dashboard/components/HorizontalBarChart'
import { WidgetDrilldownAction } from '@/features/dashboard/components/WidgetDrilldownAction'
import { MetricTile } from '@/features/dashboard/components/MetricTile'
import type { DashboardHiringSection } from '@/features/dashboard/types'
import { hasAnyCount, hiringStatusVariant } from '@/features/dashboard/dashboardChartUtils'
import { formatCount } from '@/features/dashboard/dashboardFormatters'

interface HiringSummaryWidgetProps {
  data: DashboardHiringSection
}

export function HiringSummaryWidget({ data }: HiringSummaryWidgetProps) {
  const {
    application_count,
    demand_count,
    charts,
    drilldowns,
  } = data

  const byStatus = charts?.by_status ?? []
  const byStage = charts?.by_stage ?? []
  const byJobRole = charts?.by_job_role ?? []

  const hasChartData =
    hasAnyCount(byStatus) || hasAnyCount(byStage) || hasAnyCount(byJobRole)

  if (application_count === 0 && demand_count === 0 && !hasChartData) {
    return null
  }

  return (
    <DashboardWidgetCard
      id="hiring-summary"
      title="Hiring"
      description={`${formatCount(application_count)} application${application_count !== 1 ? 's' : ''} · ${formatCount(demand_count)} open demand${demand_count !== 1 ? 's' : ''}.`}
      action={
        <WidgetDrilldownAction to={drilldowns?.all} label="View applications" fallbackTo="/hiring/applications" />
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricTile label="Applications" value={formatCount(application_count)} />
          <MetricTile label="Open demands" value={formatCount(demand_count)} />
        </div>

        {hasAnyCount(byStatus) ? (
          <ChartCard title="By status">
            <DonutSummary
              segments={byStatus.map((item) => ({
                key: item.key,
                label: item.label,
                value: item.count,
                url: item.url,
                variant: hiringStatusVariant(item.key),
              }))}
              centerLabel="Apps"
              centerValue={application_count}
            />
          </ChartCard>
        ) : null}

        {hasAnyCount(byStage) ? (
          <ChartCard title="By stage">
            <HorizontalBarChart
              items={byStage.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: 'info',
              }))}
            />
          </ChartCard>
        ) : null}

        {hasAnyCount(byJobRole) ? (
          <ChartCard title="By job role">
            <HorizontalBarChart
              items={byJobRole.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: 'attention',
              }))}
            />
          </ChartCard>
        ) : null}
      </div>
    </DashboardWidgetCard>
  )
}
