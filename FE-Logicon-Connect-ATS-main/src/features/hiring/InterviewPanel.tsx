import { useMemo, useState } from 'react'
import { CalendarClock, ListChecks, MessageSquarePlus, Star, Video, Phone, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'
import { hiringApplicationStatusLabel } from '@/features/talent/talentLabels'
import { InterviewFormDrawer } from '@/features/hiring/InterviewFormDrawer'
import { InterviewFeedbackDrawer } from '@/features/hiring/InterviewFeedbackDrawer'
import { ApplyInterviewPlanDrawer } from '@/features/hiring/ApplyInterviewPlanDrawer'
import {
  feedbackRecommendationTone,
  interviewModeLabel,
  interviewRoundLabel,
  interviewStatusTone,
  latestFeedback,
  screeningGuidance,
  type StageActionTone,
} from '@/features/hiring/hiringStageActions'
import type {
  HiringApplicationRow,
  InterviewFeedbackRow,
  InterviewPlanRoundRow,
  InterviewPlanRow,
  InterviewRow,
} from '@/features/hiring/types'

interface RoundChecklistEntry {
  key: number
  label: string
  state: string
  tone: StageActionTone
}

function buildRoundChecklist(
  plan: InterviewPlanRow,
  interviews: InterviewRow[],
  feedbacks: InterviewFeedbackRow[],
): RoundChecklistEntry[] {
  const rounds = plan.rounds
    .filter((r) => r.is_active)
    .sort((a, b) => a.round_number - b.round_number)

  const feedbackByInterview = new Map<number, InterviewFeedbackRow[]>()
  for (const f of feedbacks) {
    const list = feedbackByInterview.get(f.interview) ?? []
    list.push(f)
    feedbackByInterview.set(f.interview, list)
  }

  function matchInterview(round: InterviewPlanRoundRow): InterviewRow | undefined {
    return (
      interviews.find((iv) => iv.planned_round === round.id) ??
      interviews.find((iv) => iv.round_type === round.round_type && iv.round_number === round.round_number)
    )
  }

  return rounds.map((round) => {
    const label = `${interviewRoundLabel(round.round_type)}${round.is_required ? '' : ' (optional)'}`
    const iv = matchInterview(round)
    if (!iv || iv.status === 'pending') return { key: round.id, label, state: 'Pending', tone: 'neutral' }
    if (iv.status === 'scheduled' || iv.status === 'rescheduled') return { key: round.id, label, state: 'Scheduled', tone: 'info' }
    if (iv.status === 'cancelled' || iv.status === 'no_show') return { key: round.id, label, state: 'Cancelled', tone: 'danger' }
    const rec = latestFeedback(feedbackByInterview.get(iv.id) ?? [])?.recommendation
    if (rec === 'proceed') return { key: round.id, label, state: 'Cleared', tone: 'success' }
    if (rec === 'hold') return { key: round.id, label, state: 'On hold', tone: 'warning' }
    if (rec === 'reject') return { key: round.id, label, state: 'Rejected', tone: 'danger' }
    return { key: round.id, label, state: 'Awaiting feedback', tone: 'attention' }
  })
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(iso)
  }
}

function ModeIcon({ mode }: { mode: InterviewRow['mode'] }) {
  if (mode === 'video') return <Video className="h-3.5 w-3.5" aria-hidden />
  if (mode === 'phone') return <Phone className="h-3.5 w-3.5" aria-hidden />
  return <MapPin className="h-3.5 w-3.5" aria-hidden />
}

export function InterviewPanel({
  app,
  plan,
  interviews,
  feedbacks,
  loading,
  canCreate,
  canManage,
  onChanged,
}: {
  app: HiringApplicationRow
  plan?: InterviewPlanRow | null
  interviews: InterviewRow[]
  feedbacks: InterviewFeedbackRow[]
  loading: boolean
  canCreate: boolean
  canManage: boolean
  onChanged: () => void | Promise<void>
}) {
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  const sortedInterviews = useMemo(
    () => [...interviews].sort((a, b) => a.round_number - b.round_number || a.id - b.id),
    [interviews],
  )

  const feedbackByInterview = useMemo(() => {
    const map = new Map<number, InterviewFeedbackRow[]>()
    for (const f of feedbacks) {
      const list = map.get(f.interview) ?? []
      list.push(f)
      map.set(f.interview, list)
    }
    return map
  }, [feedbacks])

  const guidance = screeningGuidance(app, interviews, feedbacks)
  const latest = latestFeedback(feedbacks)

  const isClosed = app.status === 'rejected' || app.status === 'cancelled' || app.status === 'offer_declined'
  const nextRoundNumber = sortedInterviews.length > 0 ? Math.max(...sortedInterviews.map((i) => i.round_number)) + 1 : 1
  const hasActionableInterview = interviews.some((i) => i.status === 'scheduled' || i.status === 'completed')
  const canSubmitFeedback = (canCreate || canManage) && hasActionableInterview && !isClosed

  const clientApproved =
    app.client_decision === 'approved' ||
    ['selected', 'offer_released', 'offer_accepted', 'offer_declined', 'deployed'].includes(app.status)
  const canManagePlan = canCreate || canManage
  const showApplyPlan = canManagePlan && !isClosed && app.interview_plan == null && clientApproved
  const checklist = useMemo(
    () => (plan ? buildRoundChecklist(plan, interviews, feedbacks) : []),
    [plan, interviews, feedbacks],
  )

  return (
    <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-app-text">Screening &amp; interviews</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="neutral" className="text-[11px]">{hiringApplicationStatusLabel(app.status)}</Badge>
            {app.current_stage_name ? (
              <Badge variant="info" className="text-[11px]">{app.current_stage_name}</Badge>
            ) : null}
          </div>
        </div>
        {!isClosed ? (
          <div className="flex flex-wrap gap-2">
            {showApplyPlan ? (
              <Button type="button" variant="primary" className="min-h-8 gap-1 px-3 text-xs" onClick={() => setApplyOpen(true)}>
                <ListChecks className="h-3.5 w-3.5" aria-hidden />
                Apply interview plan
              </Button>
            ) : null}
            {canCreate ? (
              <Button type="button" variant="secondary" className="min-h-8 gap-1 px-3 text-xs" onClick={() => setScheduleOpen(true)}>
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Schedule interview
              </Button>
            ) : null}
            {canSubmitFeedback ? (
              <Button type="button" className="min-h-8 gap-1 px-3 text-xs" onClick={() => setFeedbackOpen(true)}>
                <MessageSquarePlus className="h-3.5 w-3.5" aria-hidden />
                Submit feedback
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {guidance ? (
        <div
          className={cn(
            'mt-3 rounded-panel border px-3 py-2 text-xs',
            guidance.tone === 'success' && 'border-status-success/30 bg-status-success/5 text-status-hired',
            guidance.tone === 'warning' && 'border-status-warning/30 bg-status-warning/10 text-status-warning',
            guidance.tone === 'danger' && 'border-status-danger/30 bg-status-danger/5 text-status-danger',
            guidance.tone === 'info' && 'border-brand-600/20 bg-brand-600/5 text-brand-700',
          )}
        >
          {guidance.message}
        </div>
      ) : null}

      {plan && checklist.length > 0 ? (
        <div className="mt-3 rounded-panel border border-app-border bg-app-muted/30 px-3 py-2.5">
          <p className="text-xs font-medium text-app-text">
            Required rounds <span className="text-app-subtle">· {plan.name}</span>
          </p>
          <ul className="mt-2 space-y-1.5">
            {checklist.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-app-secondary">{entry.label}</span>
                <Badge variant={entry.tone} className="text-[10px]">{entry.state}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {latest ? (
        <div className="mt-3 rounded-panel border border-app-border bg-app-muted/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-app-text">Latest feedback</span>
            <Badge variant={feedbackRecommendationTone(latest.recommendation)} className="text-[11px] capitalize">
              {latest.recommendation}
            </Badge>
            {latest.rating != null ? (
              <span className="inline-flex items-center gap-0.5 text-app-secondary">
                <Star className="h-3 w-3 fill-status-warning text-status-warning" aria-hidden />
                {latest.rating}/5
              </span>
            ) : null}
            {latest.given_by_username ? <span className="text-app-subtle">by {latest.given_by_username}</span> : null}
          </div>
          {latest.feedback?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap text-xs text-app-secondary">{latest.feedback.trim()}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4">
        {loading ? (
          <Spinner label="Loading interviews…" />
        ) : sortedInterviews.length === 0 ? (
          <p className="text-xs text-app-secondary">
            No interviews scheduled yet{canCreate && !isClosed ? '. Use “Schedule interview” to add a screening round.' : '.'}
          </p>
        ) : (
          <ol className="space-y-2">
            {sortedInterviews.map((iv) => {
              const ivFeedback = feedbackByInterview.get(iv.id) ?? []
              return (
                <li key={iv.id} className="rounded-panel border border-app-border bg-app-muted/30 px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-app-text">
                      {interviewRoundLabel(iv.round_type)} · Round {iv.round_number}
                    </span>
                    <Badge variant={interviewStatusTone(iv.status)} className="text-[11px] capitalize">
                      {iv.status.replace(/_/g, ' ')}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-[11px] text-app-subtle">
                      <ModeIcon mode={iv.mode} />
                      {interviewModeLabel(iv.mode)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-app-secondary">
                    <span>{fmtDateTime(iv.scheduled_at)}</span>
                    {iv.interviewer_username ? <span>· {iv.interviewer_username}</span> : null}
                    {iv.meeting_link ? (
                      <a href={iv.meeting_link} target="_blank" rel="noopener noreferrer" className="text-brand-700 underline">
                        Join link
                      </a>
                    ) : null}
                    {iv.location ? <span>· {iv.location}</span> : null}
                  </div>
                  {ivFeedback.length > 0 ? (
                    <ul className="mt-2 space-y-1 border-t border-app-border/60 pt-2">
                      {ivFeedback.map((f) => (
                        <li key={f.id} className="flex flex-wrap items-center gap-2 text-[11px]">
                          <Badge variant={feedbackRecommendationTone(f.recommendation)} className="text-[10px] capitalize">
                            {f.recommendation}
                          </Badge>
                          {f.rating != null ? <span className="text-app-secondary">{f.rating}/5</span> : null}
                          {f.feedback?.trim() ? <span className="text-app-secondary">{f.feedback.trim()}</span> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              )
            })}
          </ol>
        )}
      </div>

      <InterviewFormDrawer
        open={scheduleOpen}
        applicationId={app.id}
        defaultRoundNumber={nextRoundNumber}
        onClose={() => setScheduleOpen(false)}
        onSuccess={() => {
          setScheduleOpen(false)
          void onChanged()
        }}
      />

      <InterviewFeedbackDrawer
        open={feedbackOpen}
        interviews={interviews.filter((i) => i.status === 'scheduled' || i.status === 'completed')}
        onClose={() => setFeedbackOpen(false)}
        onSuccess={() => {
          setFeedbackOpen(false)
          void onChanged()
        }}
      />

      <ApplyInterviewPlanDrawer
        open={applyOpen}
        application={app}
        onClose={() => setApplyOpen(false)}
        onApplied={() => {
          setApplyOpen(false)
          void onChanged()
        }}
      />
    </section>
  )
}
