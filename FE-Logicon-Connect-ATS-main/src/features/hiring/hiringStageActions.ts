import type { HiringApplicationRow, InterviewAssignmentState, InterviewFeedbackRow, InterviewRow } from '@/features/hiring/types'

export type StageActionKind =
  | 'send_to_client'
  | 'awaiting_client'
  | 'schedule_or_offer'
  | 'submit_feedback'
  | 'awaiting_offer'
  | 'convert'
  | 'deployed'
  | 'closed'
  | 'none'

export type StageActionTone = 'info' | 'success' | 'warning' | 'neutral' | 'danger' | 'attention'

export interface StageAction {
  kind: StageActionKind
  label: string
  tone: StageActionTone
  /** When true the CTA should navigate to the application detail rather than act inline. */
  navigates: boolean
}

/**
 * Single source of truth for the "next action" derived from a hiring application's
 * backend status. Used by both the pipeline card and the application detail page so
 * the two never drift. Stage transitions are always driven by the backend response.
 */
export function applicationStageAction(status: string): StageAction {
  switch (status) {
    case 'draft':
    case 'shortlisted':
      return { kind: 'send_to_client', label: 'Send to client', tone: 'info', navigates: false }
    case 'client_review':
      return { kind: 'awaiting_client', label: 'Awaiting client', tone: 'warning', navigates: false }
    case 'selected':
      return { kind: 'schedule_or_offer', label: 'Schedule interview / Create offer', tone: 'attention', navigates: true }
    case 'interview_scheduled':
    case 'interview_in_progress':
      return { kind: 'submit_feedback', label: 'Submit feedback', tone: 'attention', navigates: true }
    case 'offer_released':
      return { kind: 'awaiting_offer', label: 'Awaiting offer acceptance', tone: 'info', navigates: false }
    case 'offer_accepted':
      return { kind: 'convert', label: 'Convert to deployment', tone: 'success', navigates: true }
    case 'deployed':
      return { kind: 'deployed', label: 'Deployed', tone: 'success', navigates: false }
    case 'rejected':
    case 'offer_declined':
    case 'cancelled':
      return { kind: 'closed', label: 'Closed', tone: 'danger', navigates: false }
    default:
      return { kind: 'none', label: '', tone: 'neutral', navigates: false }
  }
}

export interface ScreeningGuidance {
  tone: StageActionTone
  message: string
}

/** Latest feedback = most recently created across all rounds. */
export function latestFeedback(feedbacks: InterviewFeedbackRow[]): InterviewFeedbackRow | null {
  if (feedbacks.length === 0) return null
  return [...feedbacks].sort((a, b) => {
    const ta = a.created_at ?? ''
    const tb = b.created_at ?? ''
    return tb.localeCompare(ta)
  })[0] ?? null
}

/**
 * Operational guidance shown in the screening/interview section, derived from
 * backend status + interviews + latest feedback. Returns null when no banner applies.
 */
export function screeningGuidance(
  app: HiringApplicationRow,
  interviews: InterviewRow[],
  feedbacks: InterviewFeedbackRow[],
): ScreeningGuidance | null {
  if (app.status === 'rejected' || app.status === 'cancelled' || app.status === 'offer_declined') {
    return { tone: 'danger', message: 'This candidate is closed. No further screening actions are available.' }
  }

  const latest = latestFeedback(feedbacks)

  if (latest?.recommendation === 'hold') {
    return { tone: 'warning', message: 'Candidate is on hold after feedback.' }
  }

  if (interviews.length > 0 && latest?.recommendation === 'proceed') {
    return { tone: 'success', message: 'Screening passed. Candidate is ready for offer.' }
  }

  const clientApproved =
    app.client_decision === 'approved' ||
    ['selected', 'offer_released', 'offer_accepted', 'offer_declined', 'deployed'].includes(app.status)

  if (clientApproved && app.status === 'selected' && interviews.length === 0) {
    return { tone: 'info', message: 'Client approved. Schedule screening or create an offer.' }
  }

  return null
}

const ROUND_TYPE_LABELS: Record<InterviewRow['round_type'], string> = {
  hr: 'HR',
  technical: 'Technical',
  manager: 'Manager',
  client: 'Client',
  final: 'Final',
}

export function interviewRoundLabel(roundType: InterviewRow['round_type']): string {
  return ROUND_TYPE_LABELS[roundType] ?? roundType
}

const MODE_LABELS: Record<InterviewRow['mode'], string> = {
  phone: 'Phone',
  video: 'Video',
  in_person: 'In person',
}

export function interviewModeLabel(mode: InterviewRow['mode']): string {
  return MODE_LABELS[mode] ?? mode
}

export function interviewStatusTone(status: InterviewRow['status']): StageActionTone {
  switch (status) {
    case 'completed':
      return 'success'
    case 'scheduled':
      return 'info'
    case 'rescheduled':
      return 'attention'
    case 'cancelled':
    case 'no_show':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function feedbackRecommendationTone(rec: InterviewFeedbackRow['recommendation']): StageActionTone {
  switch (rec) {
    case 'proceed':
      return 'success'
    case 'hold':
      return 'warning'
    case 'reject':
      return 'danger'
    default:
      return 'neutral'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Interview assignment helpers
// ─────────────────────────────────────────────────────────────────────────────

export function assignmentStateLabel(state: InterviewAssignmentState): string {
  switch (state) {
    case 'upcoming':
      return 'Upcoming'
    case 'pending_feedback':
      return 'Feedback pending'
    case 'completed':
      return 'Completed'
    case 'held':
      return 'On hold'
    case 'rejected':
      return 'Rejected'
    default:
      return state
  }
}

export function assignmentStateTone(state: InterviewAssignmentState): StageActionTone {
  switch (state) {
    case 'upcoming':
      return 'info'
    case 'pending_feedback':
      return 'warning'
    case 'completed':
      return 'success'
    case 'held':
      return 'warning'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}
