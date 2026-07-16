import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { getInterviewPipeline } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { InterviewPipelineColumn } from '@/features/hiring/InterviewPipelineColumn'
import { InterviewPipelineCard } from '@/features/hiring/InterviewPipelineCard'
import { ApplyInterviewPlanDrawer } from '@/features/hiring/ApplyInterviewPlanDrawer'
import { InterviewFormDrawer } from '@/features/hiring/InterviewFormDrawer'
import { InterviewFeedbackDrawer } from '@/features/hiring/InterviewFeedbackDrawer'
import { isInternalNonBillable, isClientBillable } from '@/features/hiring/hiringLaneLabels'
import type {
  InterviewPipelineBucket,
  InterviewPipelineBucketItem,
  InterviewPipelineBucketKey,
  InterviewRow,
} from '@/features/hiring/types'

type LaneFilter = '' | 'client_billable' | 'internal_non_billable'

const BUCKET_ORDER: { key: InterviewPipelineBucketKey; label: string; emptyHint: string }[] = [
  { key: 'ready_for_screening', label: 'Ready for screening', emptyHint: 'No candidates waiting.' },
  { key: 'hr', label: 'HR round', emptyHint: 'No candidates in HR round.' },
  { key: 'technical', label: 'Technical round', emptyHint: 'No candidates in technical round.' },
  { key: 'manager', label: 'Manager round', emptyHint: 'No candidates in manager round.' },
  { key: 'client', label: 'Client round', emptyHint: 'No candidates in client round.' },
  { key: 'final', label: 'Final round', emptyHint: 'No candidates in final round.' },
  { key: 'feedback_pending', label: 'Feedback pending', emptyHint: 'No feedback pending.' },
  { key: 'on_hold', label: 'On hold', emptyHint: 'No candidates on hold.' },
  { key: 'cleared_for_offer', label: 'Cleared for offer', emptyHint: 'No candidates cleared yet.' },
]

function findRoundInterview(item: InterviewPipelineBucketItem, key: InterviewPipelineBucketKey): InterviewRow | undefined {
  const matches = item.interviews.filter((iv) => iv.round_type === (key as InterviewRow['round_type']))
  return (
    matches.find((iv) => iv.status === 'pending') ??
    matches.find((iv) => iv.status === 'scheduled' || iv.status === 'rescheduled') ??
    matches[0]
  )
}

function completedAwaitingFeedback(item: InterviewPipelineBucketItem): InterviewRow[] {
  const withFeedback = new Set(item.feedbacks.map((f) => f.interview))
  const completed = item.interviews.filter((iv) => iv.status === 'completed')
  const awaiting = completed.filter((iv) => !withFeedback.has(iv.id))
  return awaiting.length > 0 ? awaiting : completed
}

export function InterviewPipelinePage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canInterview = hasAnyCapability(meCaps, [CAP.INTERVIEW_CREATE, CAP.INTERVIEW_MANAGE])
  const canCreateOffer = hasAnyCapability(meCaps, [CAP.OFFER_CREATE])

  const [buckets, setBuckets] = useState<InterviewPipelineBucket[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [laneFilter, setLaneFilter] = useState<LaneFilter>('')

  const [applyTarget, setApplyTarget] = useState<InterviewPipelineBucketItem | null>(null)
  const [scheduleState, setScheduleState] = useState<{ item: InterviewPipelineBucketItem; interview?: InterviewRow } | null>(null)
  const [feedbackState, setFeedbackState] = useState<{ item: InterviewPipelineBucketItem; interviews: InterviewRow[] } | null>(null)

  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('application')
  const highlightedAppId = highlightParam && Number.isFinite(Number(highlightParam)) ? Number(highlightParam) : null

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await getInterviewPipeline()
      setBuckets(res.buckets)
    } catch (e) {
      setLoadError(parseApiError(e, 'Could not load interview pipeline.').message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const bucketByKey = useMemo(() => {
    const map = new Map<InterviewPipelineBucketKey, InterviewPipelineBucket>()
    for (const b of buckets) map.set(b.key, b)
    return map
  }, [buckets])

  const allItems = useMemo(() => buckets.flatMap((b) => b.applications), [buckets])

  const uniqueRoles = useMemo(() => {
    const seen = new Set<string>()
    return allItems.flatMap((i) => (i.application.job_role_name ? [i.application.job_role_name] : [])).filter((r) => (seen.has(r) ? false : seen.add(r) && true))
  }, [allItems])

  const uniqueSites = useMemo(() => {
    const seen = new Set<string>()
    return allItems.flatMap((i) => (i.application.site_name ? [i.application.site_name] : [])).filter((s) => (seen.has(s) ? false : seen.add(s) && true))
  }, [allItems])

  const matchesFilter = useCallback(
    (item: InterviewPipelineBucketItem) => {
      const q = searchText.trim().toLowerCase()
      const app = item.application
      if (q) {
        const nameMatch = (app.candidate_name ?? '').toLowerCase().includes(q)
        const phoneMatch = (app.candidate_phone ?? '').includes(q)
        if (!nameMatch && !phoneMatch) return false
      }
      if (roleFilter && app.job_role_name !== roleFilter) return false
      if (siteFilter && app.site_name !== siteFilter) return false
      if (laneFilter === 'client_billable' && !isClientBillable(app)) return false
      if (laneFilter === 'internal_non_billable' && !isInternalNonBillable(app)) return false
      return true
    },
    [searchText, roleFilter, siteFilter, laneFilter],
  )

  const hasActiveFilter = Boolean(searchText || roleFilter || siteFilter || laneFilter)

  function clearFilters() {
    setSearchText('')
    setRoleFilter('')
    setSiteFilter('')
    setLaneFilter('')
  }

  function openScheduleRound(item: InterviewPipelineBucketItem, key: InterviewPipelineBucketKey) {
    setScheduleState({ item, interview: findRoundInterview(item, key) })
  }

  function openSubmitFeedback(item: InterviewPipelineBucketItem) {
    setFeedbackState({ item, interviews: completedAwaitingFeedback(item) })
  }

  if (loading) return <Spinner label="Loading interview pipeline…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-app-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Hiring &amp; deployment</p>
          <h1 className="text-xl font-semibold tracking-tight text-app-text">Interview / Verification</h1>
          <p className="mt-1 text-sm text-app-secondary">
            Manage client-approved candidates through screening rounds and feedback.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()} className="shrink-0 gap-1.5">
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ivp_search" className="text-sm font-medium text-app-secondary">Search</label>
          <input
            id="ivp_search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Name or phone…"
            className="min-h-10 w-48 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {uniqueRoles.length > 0 ? (
          <Select id="ivp_role" label="Job role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-44">
            <option value="">All roles</option>
            {uniqueRoles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
        ) : null}

        {uniqueSites.length > 0 ? (
          <Select id="ivp_site" label="Site" value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className="w-44">
            <option value="">All sites</option>
            {uniqueSites.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        ) : null}

        <Select id="ivp_lane" label="Hiring lane" value={laneFilter} onChange={(e) => setLaneFilter(e.target.value as LaneFilter)} className="w-44">
          <option value="">All lanes</option>
          <option value="client_billable">Client Billable</option>
          <option value="internal_non_billable">Internal Non-billable</option>
        </Select>

        {hasActiveFilter ? (
          <div className="flex flex-col gap-1">
            <span className="invisible select-none text-sm">x</span>
            <Button variant="ghost" onClick={clearFilters} className="min-h-10">Clear filters</Button>
          </div>
        ) : null}
      </div>

      {allItems.length === 0 ? (
        <p className="text-xs text-app-secondary">No candidates in the interview pipeline yet.</p>
      ) : null}

      <div className="min-h-[420px] min-w-0 flex-1 overflow-x-auto">
        <div className="flex h-full gap-3 pb-2">
          {BUCKET_ORDER.map(({ key, label, emptyHint }) => {
            const bucket = bucketByKey.get(key)
            const items = (bucket?.applications ?? []).filter(matchesFilter)
            return (
              <InterviewPipelineColumn key={key} label={label} count={items.length} emptyHint={hasActiveFilter ? 'No matches.' : emptyHint}>
                {items.map((item) => (
                  <InterviewPipelineCard
                    key={item.application.id}
                    item={item}
                    bucketKey={key}
                    highlighted={highlightedAppId != null && item.application.id === highlightedAppId}
                    canInterview={canInterview}
                    canCreateOffer={canCreateOffer}
                    onApplyPlan={setApplyTarget}
                    onScheduleRound={openScheduleRound}
                    onSubmitFeedback={openSubmitFeedback}
                  />
                ))}
              </InterviewPipelineColumn>
            )
          })}
        </div>
      </div>

      {applyTarget ? (
        <ApplyInterviewPlanDrawer
          open={applyTarget != null}
          application={applyTarget.application}
          onClose={() => setApplyTarget(null)}
          onApplied={() => {
            setApplyTarget(null)
            void load()
          }}
        />
      ) : null}

      {scheduleState ? (
        <InterviewFormDrawer
          open={scheduleState != null}
          applicationId={scheduleState.item.application.id}
          interview={scheduleState.interview}
          plannedRound={scheduleState.interview?.planned_round ?? null}
          onClose={() => setScheduleState(null)}
          onSuccess={() => {
            setScheduleState(null)
            void load()
          }}
        />
      ) : null}

      {feedbackState ? (
        <InterviewFeedbackDrawer
          open={feedbackState != null}
          interviews={feedbackState.interviews}
          defaultInterviewId={feedbackState.interviews[0]?.id}
          onClose={() => setFeedbackState(null)}
          onSuccess={() => {
            setFeedbackState(null)
            void load()
          }}
        />
      ) : null}
    </div>
  )
}
