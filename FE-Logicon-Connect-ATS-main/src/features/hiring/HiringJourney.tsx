import { Fragment } from 'react'
import { cn } from '@/lib/cn'
import { requiresClientReview } from '@/features/hiring/hiringLaneLabels'
import type { HiringApplicationRow, HiringDemandRow } from '@/features/hiring/types'

type StepState = 'done' | 'current' | 'pending' | 'rejected'

function StepDot({ state, index }: { state: StepState; index: number }) {
  return (
    <div
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold select-none',
        state === 'done' && 'bg-status-success text-white',
        state === 'current' && 'bg-brand-600 text-white ring-2 ring-brand-600/25',
        state === 'rejected' && 'bg-status-danger text-white',
        state === 'pending' && 'border-2 border-app-border bg-app-surface text-app-subtle',
      )}
    >
      {state === 'done' ? '✓' : state === 'rejected' ? '✕' : index + 1}
    </div>
  )
}

function connectorClass(state: StepState): string {
  if (state === 'done') return 'bg-status-success/40'
  if (state === 'current') return 'bg-brand-600/30'
  if (state === 'rejected') return 'bg-status-danger/40'
  return 'bg-app-border'
}

interface JourneyStep {
  label: string
  state: StepState
  value?: number
  hint?: string
}

function JourneyStrip({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
      <ol className="flex min-w-[640px] items-start">
        {steps.map((step, idx) => {
          const next = steps[idx + 1]
          const isLast = idx === steps.length - 1
          return (
            <Fragment key={step.label}>
              <li className="flex flex-1 flex-col items-center text-center">
                <StepDot state={step.state} index={idx} />
                <p
                  className={cn(
                    'mt-2 text-xs font-medium',
                    step.state === 'current' ? 'text-brand-700' : 'text-app-text',
                  )}
                >
                  {step.label}
                </p>
                {step.value != null ? (
                  <p className="text-sm font-semibold tabular-nums text-app-text">{step.value}</p>
                ) : null}
                {step.hint ? <p className="mt-0.5 text-[11px] text-app-subtle">{step.hint}</p> : null}
              </li>
              {!isLast && next ? (
                <li aria-hidden className="mt-3 h-0.5 flex-1">
                  <div className={cn('h-full w-full rounded', connectorClass(next.state))} />
                </li>
              ) : null}
            </Fragment>
          )
        })}
      </ol>
    </div>
  )
}

// ─── Demand journey ───────────────────────────────────────────────────────────

/**
 * Top-level journey for a hiring demand. Counts come straight from the demand row.
 * For client_billable lane: Shows "Sent to client" → "Client approved" steps.
 * For internal_non_billable lane: Shows "Interviews cleared" instead (skips client review).
 */
export function HiringDemandJourney({ demand }: { demand: HiringDemandRow }) {
  const received = demand.requested_headcount
  const shortlisted = demand.shortlisted_count
  const approved = demand.selected_count
  const offerAccepted = demand.offer_accepted_count
  const needsClientReview = requiresClientReview(demand)

  const steps: JourneyStep[] = needsClientReview
    ? [
        { label: 'Demand received', value: received, state: received > 0 ? 'done' : 'pending' },
        { label: 'Candidates shortlisted', value: shortlisted, state: shortlisted > 0 ? 'done' : 'current' },
        { label: 'Sent to client', state: shortlisted > 0 ? 'current' : 'pending' },
        { label: 'Client approved', value: approved, state: approved > 0 ? 'done' : 'pending' },
        { label: 'Offer accepted', value: offerAccepted, state: offerAccepted > 0 ? 'done' : 'pending' },
        { label: 'Deployed', state: 'pending' },
      ]
    : [
        { label: 'Demand received', value: received, state: received > 0 ? 'done' : 'pending' },
        { label: 'Candidates shortlisted', value: shortlisted, state: shortlisted > 0 ? 'done' : 'current' },
        { label: 'Interviews cleared', value: approved, state: approved > 0 ? 'done' : 'pending' },
        { label: 'Offer accepted', value: offerAccepted, state: offerAccepted > 0 ? 'done' : 'pending' },
        { label: 'Deployed', state: 'pending' },
      ]

  return <JourneyStrip steps={steps} />
}

// ─── Application journey ──────────────────────────────────────────────────────

const POST_CLIENT_STATUSES = new Set([
  'selected',
  'offer_released',
  'offer_accepted',
  'offer_declined',
  'deployed',
])

const POST_SENT_STATUSES = new Set([
  'client_review',
  'interview_scheduled',
  'interview_in_progress',
  ...POST_CLIENT_STATUSES,
])

const POST_OFFER_RELEASED_STATUSES = new Set([
  'offer_released',
  'offer_accepted',
  'offer_declined',
  'deployed',
])

function isRejected(app: HiringApplicationRow): boolean {
  return app.status === 'rejected' || app.status === 'cancelled' || app.client_decision === 'rejected'
}

/**
 * Compute how far an application has progressed along the hiring journey.
 * For client_billable lane: Shows "Sent to client" → "Client approved" steps.
 * For internal_non_billable lane: Shows "Interviews cleared" instead (skips client review).
 */
export function applicationJourneySteps(app: HiringApplicationRow): JourneyStep[] {
  const rejected = isRejected(app)
  const needsClientReview = requiresClientReview(app)

  const reachedShortlisted = app.status !== 'draft' || !!app.shortlisted_at
  const reachedOfferReleased =
    POST_OFFER_RELEASED_STATUSES.has(app.status) ||
    (app.offer_status != null && app.offer_status !== '' && app.offer_status !== 'draft')
  const reachedOfferAccepted = app.offer_status === 'accepted' || app.status === 'offer_accepted' || app.status === 'deployed'
  const reachedDeployed = app.status === 'deployed'

  if (needsClientReview) {
    // Client billable flow: Shortlisted → Sent to client → Client approved → Offer released → Offer accepted → Deployed
    const reachedSent = !!app.client_visible || POST_SENT_STATUSES.has(app.status)
    const reachedApproved = app.client_decision === 'approved' || POST_CLIENT_STATUSES.has(app.status)

    const reached = [
      reachedShortlisted,
      reachedSent,
      reachedApproved,
      reachedOfferReleased,
      reachedOfferAccepted,
      reachedDeployed,
    ]

    const labels = [
      'Shortlisted',
      'Sent to client',
      'Client approved',
      'Offer released',
      'Offer accepted',
      'Deployed',
    ]

    let currentIdx = 0
    reached.forEach((ok, i) => {
      if (ok) currentIdx = i
    })

    return labels.map((label, i) => {
      let state: StepState
      if (rejected && i === currentIdx) state = 'rejected'
      else if (i < currentIdx) state = 'done'
      else if (i === currentIdx) state = reached[i] ? (reachedDeployed && i === 5 ? 'done' : 'current') : 'pending'
      else state = 'pending'
      return { label, state }
    })
  } else {
    // Internal non-billable flow: Shortlisted → Interviews cleared → Offer released → Offer accepted → Deployed
    const reachedCleared = app.status === 'selected' || POST_OFFER_RELEASED_STATUSES.has(app.status)

    const reached = [
      reachedShortlisted,
      reachedCleared,
      reachedOfferReleased,
      reachedOfferAccepted,
      reachedDeployed,
    ]

    const labels = [
      'Shortlisted',
      'Interviews cleared',
      'Offer released',
      'Offer accepted',
      'Deployed',
    ]

    let currentIdx = 0
    reached.forEach((ok, i) => {
      if (ok) currentIdx = i
    })

    return labels.map((label, i) => {
      let state: StepState
      if (rejected && i === currentIdx) state = 'rejected'
      else if (i < currentIdx) state = 'done'
      else if (i === currentIdx) state = reached[i] ? (reachedDeployed && i === 4 ? 'done' : 'current') : 'pending'
      else state = 'pending'
      return { label, state }
    })
  }
}

export function HiringApplicationJourney({ app }: { app: HiringApplicationRow }) {
  return <JourneyStrip steps={applicationJourneySteps(app)} />
}
