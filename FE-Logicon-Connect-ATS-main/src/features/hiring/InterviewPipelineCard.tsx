import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CalendarClock, ListChecks, MessageSquarePlus, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { hiringApplicationStatusLabel } from '@/features/talent/talentLabels'
import { statusBadgeVariant } from '@/features/hiring/hiringPipelineUtils'
import { feedbackRecommendationTone, interviewRoundLabel, latestFeedback } from '@/features/hiring/hiringStageActions'
import { hasLaneInfo, hiringLaneBadgeLabel, hiringLaneBadgeVariant } from '@/features/hiring/hiringLaneLabels'
import type { InterviewPipelineBucketItem, InterviewPipelineBucketKey, InterviewRow } from '@/features/hiring/types'

const ROUND_KEYS = ['hr', 'technical', 'manager', 'client', 'final'] as const

function isRoundKey(key: InterviewPipelineBucketKey): key is InterviewRow['round_type'] {
  return (ROUND_KEYS as readonly string[]).includes(key)
}

export function InterviewPipelineCard({
  item,
  bucketKey,
  highlighted = false,
  canInterview,
  canCreateOffer,
  onApplyPlan,
  onScheduleRound,
  onSubmitFeedback,
}: {
  item: InterviewPipelineBucketItem
  bucketKey: InterviewPipelineBucketKey
  highlighted?: boolean
  canInterview: boolean
  canCreateOffer: boolean
  onApplyPlan: (item: InterviewPipelineBucketItem) => void
  onScheduleRound: (item: InterviewPipelineBucketItem, bucketKey: InterviewPipelineBucketKey) => void
  onSubmitFeedback: (item: InterviewPipelineBucketItem) => void
}) {
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement | null>(null)
  const app = item.application

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [highlighted])

  const meta = [app.job_role_name, app.site_name, app.client_name].filter(Boolean).join(' · ')
  const requiredTotal = item.required_round_ids.length
  const passedTotal = item.passed_round_ids.length
  const latest = latestFeedback(item.feedbacks)

  function renderCta() {
    if (bucketKey === 'ready_for_screening') {
      if (!canInterview) return null
      return (
        <Button type="button" variant="primary" className="h-7 min-h-0 w-full gap-1 px-2 py-0 text-xs" onClick={() => onApplyPlan(item)}>
          <ListChecks className="h-3 w-3" aria-hidden />
          Apply interview plan
        </Button>
      )
    }
    if (isRoundKey(bucketKey)) {
      if (!canInterview) return null
      return (
        <Button type="button" variant="secondary" className="h-7 min-h-0 w-full gap-1 px-2 py-0 text-xs" onClick={() => onScheduleRound(item, bucketKey)}>
          <CalendarClock className="h-3 w-3" aria-hidden />
          Schedule / Update round
        </Button>
      )
    }
    if (bucketKey === 'feedback_pending') {
      if (!canInterview) return null
      return (
        <Button type="button" variant="primary" className="h-7 min-h-0 w-full gap-1 px-2 py-0 text-xs" onClick={() => onSubmitFeedback(item)}>
          <MessageSquarePlus className="h-3 w-3" aria-hidden />
          Submit feedback
        </Button>
      )
    }
    if (bucketKey === 'on_hold') {
      return (
        <Button type="button" variant="secondary" className="h-7 min-h-0 w-full gap-1 px-2 py-0 text-xs" onClick={() => navigate(`/hiring/applications/${app.id}`)}>
          Open application
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Button>
      )
    }
    if (bucketKey === 'cleared_for_offer') {
      if (!canCreateOffer) return null
      return (
        <Button type="button" variant="primary" className="h-7 min-h-0 w-full gap-1 px-2 py-0 text-xs" onClick={() => navigate(`/hiring/applications/${app.id}`)}>
          Create offer
          <ArrowRight className="h-3 w-3" aria-hidden />
        </Button>
      )
    }
    return null
  }

  return (
    <div
      ref={ref}
      className={cn(
        'space-y-2 rounded-panel border bg-app-surface p-3 shadow-panel transition-all',
        highlighted ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-app-border',
      )}
    >
      <div className="flex items-start gap-2">
        <Link to={`/hiring/applications/${app.id}`} className="min-w-0 flex-1 text-sm font-medium leading-tight text-app-text hover:text-brand-600">
          {app.candidate_name ?? `Candidate #${app.candidate}`}
        </Link>
        <Badge variant={statusBadgeVariant(app.status)} className="shrink-0 text-[10px]">
          {hiringApplicationStatusLabel(app.status)}
        </Badge>
      </div>

      {app.candidate_phone ? (
        <div className="flex items-center gap-1 text-xs text-app-secondary">
          <Phone className="h-3 w-3 shrink-0" aria-hidden />
          {app.candidate_phone}
        </div>
      ) : null}

      {meta ? <p className="truncate text-xs text-app-secondary">{meta}</p> : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {hasLaneInfo(app) ? (
          <Badge variant={hiringLaneBadgeVariant(app)} className="text-[10px]">
            {hiringLaneBadgeLabel(app)}
          </Badge>
        ) : null}
        {app.interview_plan != null ? (
          <Badge variant="info" className="text-[10px]">Plan applied</Badge>
        ) : (
          <Badge variant="neutral" className="text-[10px]">No plan selected</Badge>
        )}
        {requiredTotal > 0 ? (
          <span className="text-[10px] text-app-secondary">
            {passedTotal}/{requiredTotal} rounds cleared
          </span>
        ) : null}
      </div>

      {latest ? (
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="text-app-subtle">Latest:</span>
          <Badge variant={feedbackRecommendationTone(latest.recommendation)} className="text-[10px] capitalize">
            {latest.recommendation}
          </Badge>
        </div>
      ) : null}

      {isRoundKey(bucketKey) ? (
        <p className="text-[10px] text-app-subtle">Current round: {interviewRoundLabel(bucketKey)}</p>
      ) : null}

      {renderCta()}
    </div>
  )
}
