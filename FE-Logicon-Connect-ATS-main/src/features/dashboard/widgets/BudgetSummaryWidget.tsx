import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { DonutSummary } from '@/features/dashboard/components/DonutSummary'
import { HorizontalBarChart } from '@/features/dashboard/components/HorizontalBarChart'
import { StackedAmountBar } from '@/features/dashboard/components/StackedAmountBar'
import { WidgetDrilldownAction } from '@/features/dashboard/components/WidgetDrilldownAction'
import { MetricTile } from '@/features/dashboard/components/MetricTile'
import type { DashboardBudgetSection } from '@/features/dashboard/types'
import { formatMoney, parseAmount } from '@/features/dashboard/dashboardFormatters'

interface BudgetSummaryWidgetProps {
  data: DashboardBudgetSection
}

export function BudgetSummaryWidget({ data }: BudgetSummaryWidgetProps) {
  const {
    plan_count,
    total_amount,
    available_amount,
    charts,
    drilldowns,
  } = data

  const utilization = charts?.utilization ?? []
  const byNature = charts?.by_nature ?? []
  const byScope = charts?.by_scope ?? []
  const topPlans = charts?.top_plans ?? []
  const available = parseAmount(available_amount)

  return (
    <DashboardWidgetCard
      id="budget-summary"
      title="Budget"
      description={`${plan_count} active plan${plan_count !== 1 ? 's' : ''}.`}
      action={<WidgetDrilldownAction to={drilldowns?.all} label="View budgets" fallbackTo="/budgets" />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricTile label="Total" value={formatMoney(total_amount)} />
          <MetricTile
            label="Available"
            value={formatMoney(available_amount)}
            subtext={available < 0 ? 'Over-utilized' : undefined}
          />
        </div>

        <ChartCard title="Utilization">
          <StackedAmountBar
            items={utilization}
            totalAmount={total_amount}
            highlightNegativeAvailable
          />
        </ChartCard>

        {byNature.length > 0 ? (
          <ChartCard title="By nature">
            <DonutSummary
              segments={byNature.map((item) => ({
                key: item.key,
                label: item.label,
                value: parseAmount(item.amount),
                url: item.url,
                variant: item.key === 'billable' ? 'success' : 'attention',
              }))}
              centerLabel="Total"
              centerValue={formatMoney(total_amount)}
              emptyLabel="No nature breakdown."
            />
          </ChartCard>
        ) : null}

        {byScope.length > 0 ? (
          <ChartCard title="By scope">
            <HorizontalBarChart
              items={byScope.map((item) => ({
                label: item.label,
                value: parseAmount(item.amount),
                amount: item.amount,
                url: item.url,
                displayAs: 'amount',
                variant: 'info',
              }))}
              emptyLabel="No scope breakdown."
            />
          </ChartCard>
        ) : null}

        {topPlans.length > 0 ? (
          <ChartCard title="Top plans">
            <HorizontalBarChart
              items={topPlans.map((item) => ({
                label: item.label,
                value: parseAmount(item.amount),
                amount: item.amount,
                url: item.url,
                displayAs: 'amount',
                variant: 'neutral',
              }))}
              emptyLabel="No plans."
            />
          </ChartCard>
        ) : null}
      </div>
    </DashboardWidgetCard>
  )
}
