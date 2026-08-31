import { DashboardWidgetCard } from '@/features/dashboard/components/DashboardWidgetCard'
import { ChartCard } from '@/features/dashboard/components/ChartCard'
import { DonutSummary } from '@/features/dashboard/components/DonutSummary'
import { HorizontalBarChart } from '@/features/dashboard/components/HorizontalBarChart'
import { WidgetDrilldownAction } from '@/features/dashboard/components/WidgetDrilldownAction'
import { MetricTile } from '@/features/dashboard/components/MetricTile'
import type { DashboardTalentSection } from '@/features/dashboard/types'
import { hasAnyCount } from '@/features/dashboard/dashboardChartUtils'
import { formatCount } from '@/features/dashboard/dashboardFormatters'

interface TalentSummaryWidgetProps {
  data: DashboardTalentSection
}

export function TalentSummaryWidget({ data }: TalentSummaryWidgetProps) {
  const {
    candidate_count,
    active_candidate_count,
    resume_count,
    manual_review_count,
    charts,
    drilldowns,
  } = data

  const byResumeStatus = charts?.by_resume_status ?? []
  const byAvailability = charts?.by_availability ?? []
  const topSkills = charts?.top_skills ?? []

  const hasChartData =
    hasAnyCount(byResumeStatus) || hasAnyCount(byAvailability) || hasAnyCount(topSkills)

  if (candidate_count === 0 && resume_count === 0 && !hasChartData) {
    return null
  }

  return (
    <DashboardWidgetCard
      id="talent-summary"
      title="Talent pool"
      description="Candidates and resumes in scope."
      action={<WidgetDrilldownAction to={drilldowns?.all} label="View candidates" fallbackTo="/candidates" />}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <MetricTile
            label="Candidates"
            value={formatCount(candidate_count)}
            subtext={`${formatCount(active_candidate_count)} active`}
          />
          <MetricTile
            label="Resumes"
            value={formatCount(resume_count)}
            subtext={manual_review_count > 0 ? `${formatCount(manual_review_count)} need review` : undefined}
          />
        </div>

        {hasAnyCount(byResumeStatus) ? (
          <ChartCard title="Resume status">
            <DonutSummary
              segments={byResumeStatus.map((item) => ({
                key: item.key,
                label: item.label,
                value: item.count,
                url: item.url,
                variant: item.key === 'manual_review' ? 'attention' : 'info',
              }))}
              centerLabel="Resumes"
              centerValue={resume_count}
            />
          </ChartCard>
        ) : null}

        {hasAnyCount(byAvailability) ? (
          <ChartCard title="Availability">
            <HorizontalBarChart
              items={byAvailability.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: item.key === 'deployed' ? 'success' : 'info',
              }))}
            />
          </ChartCard>
        ) : null}

        {hasAnyCount(topSkills) ? (
          <ChartCard title="Top skills">
            <HorizontalBarChart
              items={topSkills.map((item) => ({
                label: item.label,
                value: item.count,
                url: item.url,
                variant: 'neutral',
              }))}
            />
          </ChartCard>
        ) : null}
      </div>
    </DashboardWidgetCard>
  )
}
