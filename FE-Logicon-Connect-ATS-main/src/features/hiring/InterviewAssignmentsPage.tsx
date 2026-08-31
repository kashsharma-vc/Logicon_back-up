import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  ExternalLink,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  User,
  Video,
} from 'lucide-react'
import { listInterviewAssignments } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { InterviewFeedbackDrawer } from '@/features/hiring/InterviewFeedbackDrawer'
import {
  assignmentStateLabel,
  assignmentStateTone,
  interviewModeLabel,
  interviewRoundLabel,
} from '@/features/hiring/hiringStageActions'
import type {
  InterviewAssignmentRow,
  InterviewAssignmentState,
  InterviewRow,
} from '@/features/hiring/types'

type StateFilter = 'all' | InterviewAssignmentState

const STATE_TABS: { value: StateFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending_feedback', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'held', label: 'Held' },
  { value: 'rejected', label: 'Rejected' },
]

function formatDateTime(iso: string | null): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function assignmentRoundTitle(a: InterviewAssignmentRow): string {
  if (a.planned_round_name) return a.planned_round_name
  const roundType = interviewRoundLabel(a.round_type as InterviewRow['round_type'])
  return `Round ${a.round_number} - ${roundType}`
}

function ModeIcon({ mode }: { mode: string }) {
  switch (mode) {
    case 'phone':
      return <Phone className="h-3.5 w-3.5" aria-hidden />
    case 'video':
      return <Video className="h-3.5 w-3.5" aria-hidden />
    case 'in_person':
      return <MapPin className="h-3.5 w-3.5" aria-hidden />
    default:
      return null
  }
}

function badgeVariant(state: InterviewAssignmentState): 'info' | 'warning' | 'success' | 'danger' | 'neutral' {
  switch (assignmentStateTone(state)) {
    case 'info':
      return 'info'
    case 'warning':
      return 'warning'
    case 'success':
      return 'success'
    case 'danger':
      return 'danger'
    default:
      return 'neutral'
  }
}

/** Map InterviewAssignmentRow to InterviewRow for feedback drawer compatibility */
function assignmentToInterviewRow(a: InterviewAssignmentRow): InterviewRow {
  return {
    id: a.id,
    hiring_application: a.application,
    planned_round: a.planned_round,
    round_type: a.round_type as InterviewRow['round_type'],
    round_number: a.round_number,
    scheduled_at: a.scheduled_at,
    scheduled_by: a.scheduled_by,
    interviewer: a.interviewer,
    interviewer_username: a.interviewer_name ?? undefined,
    status: a.status as InterviewRow['status'],
    mode: a.mode as InterviewRow['mode'],
    location: a.location,
    meeting_link: a.meeting_link,
    created_at: a.created_at,
    updated_at: a.updated_at,
  }
}

function canShowFeedbackAction(a: InterviewAssignmentRow): boolean {
  return (
    a.assignment_state === 'pending_feedback' ||
    a.status === 'scheduled' ||
    a.status === 'rescheduled' ||
    a.status === 'completed'
  )
}

export function InterviewAssignmentsPage() {
  const me = useAuthStore((s) => s.me)
  const meCaps = me?.capabilities ?? []
  const canManage = hasAnyCapability(meCaps, [CAP.INTERVIEW_MANAGE])

  const [assignments, setAssignments] = useState<InterviewAssignmentRow[]>([])
  const [counts, setCounts] = useState<Record<InterviewAssignmentState, number>>({
    upcoming: 0,
    pending_feedback: 0,
    completed: 0,
    held: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stateFilter, setStateFilter] = useState<StateFilter>('all')
  const [mineOnly, setMineOnly] = useState(true)
  const [searchText, setSearchText] = useState('')

  const [feedbackDrawerOpen, setFeedbackDrawerOpen] = useState(false)
  const [feedbackTarget, setFeedbackTarget] = useState<InterviewAssignmentRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: { mine?: boolean; assignment_state?: StateFilter } = {}
      if (canManage && !mineOnly) {
        params.mine = false
      }
      if (stateFilter !== 'all') {
        params.assignment_state = stateFilter
      }
      const res = await listInterviewAssignments(params)
      setAssignments(res.results)
      setCounts(res.counts)
    } catch (e) {
      setError(parseApiError(e, 'Could not load interview assignments.').message)
    } finally {
      setLoading(false)
    }
  }, [canManage, mineOnly, stateFilter])

  useEffect(() => {
    void load()
  }, [load])

  // Client-side search filtering
  const filtered = useMemo(() => {
    if (!searchText.trim()) return assignments
    const q = searchText.toLowerCase()
    return assignments.filter((a) => {
      const fields = [
        a.candidate_name,
        a.candidate_phone,
        a.job_role_name,
        a.site_name,
        a.client_name,
        a.interviewer_name,
      ]
      return fields.some((f) => f?.toLowerCase().includes(q))
    })
  }, [assignments, searchText])

  function openFeedback(a: InterviewAssignmentRow) {
    setFeedbackTarget(a)
    setFeedbackDrawerOpen(true)
  }

  function onFeedbackSuccess() {
    setFeedbackDrawerOpen(false)
    setFeedbackTarget(null)
    void load()
  }

  const emptyMessages: Record<StateFilter, { title: string; subtitle: string }> = {
    all: {
      title: 'No interview assignments',
      subtitle: 'When HR schedules an interview and assigns it to you, it will appear here.',
    },
    upcoming: {
      title: 'No upcoming interviews',
      subtitle: 'Scheduled interviews assigned to you will appear here.',
    },
    pending_feedback: {
      title: 'No feedback pending',
      subtitle: 'Completed interviews waiting for your feedback will appear here.',
    },
    completed: {
      title: 'No completed interviews',
      subtitle: 'Interviews you have completed with feedback will appear here.',
    },
    held: {
      title: 'No interviews on hold',
      subtitle: 'Interviews placed on hold will appear here.',
    },
    rejected: {
      title: 'No rejected interviews',
      subtitle: 'Rejected interview rounds will appear here.',
    },
  }

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Interview assignments</h2>
          <p className="text-sm text-app-secondary">
            Interviews assigned to you and rounds waiting for feedback.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} aria-hidden />
          Refresh
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtle" aria-hidden />
          <input
            type="search"
            placeholder="Search candidate, phone, role, site..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full rounded-panel border border-app-border bg-app-surface py-2 pl-9 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {/* Tabs + Toggle */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* State tabs */}
          <div className="flex flex-wrap gap-1.5">
            {STATE_TABS.map((tab) => {
              const isActive = stateFilter === tab.value
              const count = tab.value === 'all' ? assignments.length : counts[tab.value as InterviewAssignmentState]
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStateFilter(tab.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                    isActive
                      ? 'bg-brand-600 text-white'
                      : 'bg-app-muted text-app-secondary hover:bg-app-border',
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[10px] font-bold',
                        isActive ? 'bg-white/20 text-white' : 'bg-app-border text-app-subtle',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Mine toggle */}
          {canManage && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-app-secondary">Show:</span>
              <button
                type="button"
                onClick={() => setMineOnly(true)}
                className={cn(
                  'rounded-l-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                  mineOnly
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-app-border bg-app-surface text-app-secondary hover:bg-app-muted',
                )}
              >
                My interviews
              </button>
              <button
                type="button"
                onClick={() => setMineOnly(false)}
                className={cn(
                  '-ml-px rounded-r-full border px-3 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                  !mineOnly
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-app-border bg-app-surface text-app-secondary hover:bg-app-muted',
                )}
              >
                All scoped
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {error && <ErrorState message={error} />}

      {loading && !assignments.length ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Spinner label="Loading assignments..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={searchText ? 'No matches' : emptyMessages[stateFilter].title}
          description={searchText ? 'Try a different search term.' : emptyMessages[stateFilter].subtitle}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-3 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-app-text">{a.candidate_name}</p>
                  <p className="text-xs text-app-subtle">{a.candidate_phone}</p>
                </div>
                <Badge variant={badgeVariant(a.assignment_state)}>
                  {assignmentStateLabel(a.assignment_state)}
                </Badge>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-xs text-app-secondary">
                {(a.client_name || a.site_name) && (
                  <p className="truncate">
                    {a.client_name}
                    {a.client_name && a.site_name && ' - '}
                    {a.site_name}
                  </p>
                )}
                {a.job_role_name && <p className="truncate">{a.job_role_name}</p>}

                {/* Round info */}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-app-text">{assignmentRoundTitle(a)}</span>
                  <span className="text-app-subtle">({a.status})</span>
                </div>

                {/* Schedule */}
                {a.scheduled_at && (
                  <div className="flex items-center gap-1.5 text-app-text">
                    <Calendar className="h-3.5 w-3.5 text-app-subtle" aria-hidden />
                    {formatDateTime(a.scheduled_at)}
                  </div>
                )}

                {/* Mode */}
                <div className="flex items-center gap-1.5">
                  <ModeIcon mode={a.mode} />
                  <span>{interviewModeLabel(a.mode as InterviewRow['mode'])}</span>
                  {a.location && a.mode === 'in_person' && (
                    <span className="truncate text-app-subtle">- {a.location}</span>
                  )}
                </div>

                {/* Interviewer */}
                {a.interviewer_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-app-subtle" aria-hidden />
                    <span>{a.interviewer_name}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-wrap gap-2 border-t border-app-border pt-3">
                <Link
                  to={`/hiring/applications/${a.application}`}
                  className="inline-flex items-center gap-1 rounded-panel bg-app-muted px-2.5 py-1.5 text-xs font-medium text-app-text transition-colors hover:bg-app-border focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  Open application
                </Link>

                {canShowFeedbackAction(a) && (
                  <button
                    type="button"
                    onClick={() => openFeedback(a)}
                    className="inline-flex items-center gap-1 rounded-panel bg-brand-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                    Submit feedback
                  </button>
                )}

                {a.meeting_link && (
                  <a
                    href={a.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-panel bg-app-muted px-2.5 py-1.5 text-xs font-medium text-app-text transition-colors hover:bg-app-border focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                  >
                    <Video className="h-3.5 w-3.5" aria-hidden />
                    Join meeting
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feedback drawer */}
      <InterviewFeedbackDrawer
        open={feedbackDrawerOpen}
        interviews={feedbackTarget ? [assignmentToInterviewRow(feedbackTarget)] : []}
        defaultInterviewId={feedbackTarget?.id}
        onClose={() => {
          setFeedbackDrawerOpen(false)
          setFeedbackTarget(null)
        }}
        onSuccess={onFeedbackSuccess}
      />
    </div>
  )
}
