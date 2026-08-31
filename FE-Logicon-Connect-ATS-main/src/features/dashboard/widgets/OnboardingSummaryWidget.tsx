import { Link } from 'react-router-dom'
import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { DonutSummary } from '@/features/dashboard/components/DonutSummary'
import { HorizontalBarChart } from '@/features/dashboard/components/HorizontalBarChart'
import { TrendSparkline } from '@/features/dashboard/components/TrendSparkline'
import { WidgetDrilldownAction } from '@/features/dashboard/components/WidgetDrilldownAction'
import { Badge } from '@/components/ui/Badge'
import type { DashboardOnboardingSection } from '@/features/dashboard/types'
import { finalizationVariant, onboardingStatusVariant } from '@/features/dashboard/dashboardChartUtils'
import {
  formatShortDate,
  onboardingStatusLabel,
  onboardingStatusVariant as onboardingBadgeVariant,
} from '@/features/dashboard/dashboardFormatters'
import type { StatusBadgeVariant } from '@/features/dashboard/dashboardFormatters'

interface OnboardingSummaryWidgetProps {
  data: DashboardOnboardingSection
}

export function OnboardingSummaryWidget({ data }: OnboardingSummaryWidgetProps) {
  const { total, finalization_failed, recent, charts, drilldowns } = data
  const byStatus = charts?.by_status ?? []
  const byFinalization = charts?.by_finalization ?? []
  const monthlyTrend = charts?.monthly_trend ?? []
  const failedUrl = drilldowns?.finalization_failed

  return (
    <DashboardWidgetCard
      id="onboarding-summary"
      title="Mobilisation"
      description={`${total} mobilisation request${total !== 1 ? 's' : ''} in scope.`}
      action={
        <WidgetDrilldownAction to={drilldowns?.all} label="View mobilisation" fallbackTo="/mobilisation" />
      }
      empty={total === 0 ? 'No mobilisation records in scope.' : undefined}
    >
      <div className="space-y-4">
        {finalization_failed > 0 ? (
          failedUrl ? (
            <Link
              to={failedUrl}
              className="flex items-center gap-2 rounded-panel border border-status-danger/25 bg-status-danger/5 px-3 py-2 hover:border-status-danger/50"
            >
              <span className="h-2 w-2 shrink-0 rounded-full bg-status-danger" />
              <span className="text-xs font-medium text-status-danger">
                {finalization_failed} finalization failure{finalization_failed !== 1 ? 's' : ''}
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-2 rounded-panel border border-status-danger/25 bg-status-danger/5 px-3 py-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-status-danger" />
              <span className="text-xs font-medium text-status-danger">
                {finalization_failed} finalization failure{finalization_failed !== 1 ? 's' : ''}
              </span>
            </div>
          )
        ) : null}

        <ChartCard title="Status distribution">
          <DonutSummary
            segments={byStatus.map((item) => ({
              key: item.key,
              label: item.label,
              value: item.count,
              url: item.url,
              variant: onboardingStatusVariant(item.key),
            }))}
            centerLabel="Total"
            centerValue={total}
            emptyLabel="No status breakdown."
          />
        </ChartCard>

        {byFinalization.length > 0 ? (
          <ChartCard title="Finalization health">
            <HorizontalBarChart
              items={byFinalization.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: finalizationVariant(item.key),
              }))}
              emptyLabel="No finalization data."
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
              {recent.map((ob) => (
                <li key={ob.id} className="flex items-center gap-2 text-xs">
                  <Badge variant={onboardingBadgeVariant(ob.status) as StatusBadgeVariant}>
                    {onboardingStatusLabel(ob.status)}
                  </Badge>
                  <Link
                    to={`/mobilisation/${ob.id}`}
                    className="truncate text-app-text hover:text-brand-600 hover:underline"
                  >
                    {ob.client_name || `#${ob.id}`}
                  </Link>
                  <span className="ml-auto shrink-0 text-app-subtle">{formatShortDate(ob.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </DashboardWidgetCard>
  )
}
