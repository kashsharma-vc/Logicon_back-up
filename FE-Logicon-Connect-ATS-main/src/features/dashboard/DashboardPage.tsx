import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { getDashboardSummary } from '@/api/dashboard'
import { listClientReviewApplications } from '@/api/hiring'
import { listEmployees } from '@/api/deployment'
import type { DashboardSummaryResponse } from '@/features/dashboard/types'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { MyWorkWidget } from '@/features/dashboard/widgets/MyWorkWidget'
import { ClientKpiRow } from '@/features/dashboard/widgets/ClientKpiRow'
import { ClientOverviewWidget } from '@/features/dashboard/widgets/ClientOverviewWidget'
import { MRFSummaryWidget } from '@/features/dashboard/widgets/MRFSummaryWidget'
import { OnboardingSummaryWidget } from '@/features/dashboard/widgets/OnboardingSummaryWidget'
import { BudgetSummaryWidget } from '@/features/dashboard/widgets/BudgetSummaryWidget'
import { HiringSummaryWidget } from '@/features/dashboard/widgets/HiringSummaryWidget'
import { TalentSummaryWidget } from '@/features/dashboard/widgets/TalentSummaryWidget'
import { RecentActivityWidget } from '@/features/dashboard/widgets/RecentActivityWidget'
import { hasAnyCount } from '@/features/dashboard/dashboardChartUtils'

// ─── grid helpers ─────────────────────────────────────────────────────────────

const SPAN_SINGLE = 'col-span-1'
const SPAN_DOUBLE = 'col-span-1 md:col-span-2'
const SPAN_FULL = 'col-span-1 md:col-span-2 lg:col-span-4'

function hasHiringData(hiring: DashboardSummaryResponse['sections']['hiring']): boolean {
  return (
    hiring.application_count > 0 ||
    hiring.demand_count > 0 ||
    hasAnyCount(hiring.charts?.by_status) ||
    hasAnyCount(hiring.charts?.by_stage) ||
    hasAnyCount(hiring.charts?.by_job_role)
  )
}

function hasTalentData(talent: DashboardSummaryResponse['sections']['talent']): boolean {
  return (
    talent.candidate_count > 0 ||
    talent.resume_count > 0 ||
    hasAnyCount(talent.charts?.by_resume_status) ||
    hasAnyCount(talent.charts?.by_availability) ||
    hasAnyCount(talent.charts?.top_skills)
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function getFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  return parts[0] ?? fullName
}

// ─── DashboardPage ────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingReviews, setPendingReviews] = useState<number | null>(null)
  const [deployedEmployees, setDeployedEmployees] = useState<number | null>(null)

  const fetchSummary = useCallback(() => {
    setLoading(true)
    setError(null)
    getDashboardSummary()
      .then((res) => {
        setData(res)
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.detail ??
          err?.message ??
          'Failed to load dashboard. Please try again.'
        setError(String(msg))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const isClientAudience = data?.audience === 'client'

  useEffect(() => {
    if (!isClientAudience) return
    let cancelled = false
    setPendingReviews(null)
    setDeployedEmployees(null)
    void (async () => {
      const [reviewRes, employeeRes] = await Promise.allSettled([
        listClientReviewApplications({ only_pending: true }),
        listEmployees({ status: 'active' }),
      ])
      if (cancelled) return
      if (reviewRes.status === 'fulfilled') {
        setPendingReviews(reviewRes.value.count ?? reviewRes.value.items.length)
      }
      if (employeeRes.status === 'fulfilled') {
        setDeployedEmployees(employeeRes.value.count ?? employeeRes.value.items.length)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isClientAudience])

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading dashboard" />
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="w-full space-y-4">
        <ErrorState message={error} />
        <button
          type="button"
          onClick={fetchSummary}
          className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-medium text-app-text shadow-sm hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    )
  }

  if (!data) return null

  const { audience, user, sections } = data
  const isClient = audience === 'client'
  const firstName = getFirstName(user.username)

  return (
    <div className="w-full space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-app-text">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-app-secondary">
            Here's your operational overview for today
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSummary}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-4 py-2.5 text-sm font-medium text-app-text shadow-sm transition-all hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50 dark:hover:bg-brand-950"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Client KPI row */}
      {isClient ? (
        <ClientKpiRow
          activeSites={sections.client_overview.site_count}
          approvedBudgets={sections.budget.plan_count}
          availableBudget={sections.budget.available_amount}
          mrfsInApproval={sections.mrf.in_review}
          candidateReviewsPending={pendingReviews}
          deployedEmployees={deployedEmployees}
        />
      ) : null}

      {/* Widgets Grid */}
      {isClient ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Row 1: My work + Client overview */}
          <div className={SPAN_SINGLE}>
            <MyWorkWidget data={sections.my_work} />
          </div>
          <div className={SPAN_DOUBLE}>
            <ClientOverviewWidget data={sections.client_overview} compactForClientAudience />
          </div>

          {/* Row 2: MRF + Budget charts */}
          <div className={SPAN_DOUBLE}>
            <MRFSummaryWidget data={sections.mrf} />
          </div>
          <div className={SPAN_DOUBLE}>
            <BudgetSummaryWidget data={sections.budget} />
          </div>

          {/* Row 3: Recent activity */}
          <div className={SPAN_FULL}>
            <RecentActivityWidget items={sections.recent_activity} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className={SPAN_SINGLE}>
            <MyWorkWidget data={sections.my_work} />
          </div>

          <div className={SPAN_DOUBLE}>
            <OnboardingSummaryWidget data={sections.onboarding} />
          </div>

          <div className={SPAN_DOUBLE}>
            <MRFSummaryWidget data={sections.mrf} />
          </div>

          <div className={SPAN_DOUBLE}>
            <BudgetSummaryWidget data={sections.budget} />
          </div>

          {hasHiringData(sections.hiring) ? (
            <div className={SPAN_DOUBLE}>
              <HiringSummaryWidget data={sections.hiring} />
            </div>
          ) : null}

          {hasTalentData(sections.talent) ? (
            <div className={SPAN_DOUBLE}>
              <TalentSummaryWidget data={sections.talent} />
            </div>
          ) : null}

          <div className={SPAN_FULL}>
            <RecentActivityWidget items={sections.recent_activity} />
          </div>
        </div>
      )}
    </div>
  )
}
