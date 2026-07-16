/**
 * Timeline stepper and audit trail components for workflow task drawer.
 */

import type { WorkflowTaskAuditEntry, WorkflowTaskStep } from '@/features/workflow/types'
import { TaskStatusBadge } from '@/features/workflowTasks/TaskStatusBadge'
import { cn } from '@/lib/cn'

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

type StepState = 'active' | 'approved' | 'rejected' | 'skipped' | 'pending'

function getStepState(s: WorkflowTaskStep, currentStepId: number | null): StepState {
  const isCurrent = currentStepId != null && s.id === currentStepId
  if (isCurrent || s.status === 'active') return 'active'
  if (s.action_taken === 'approve' || s.status === 'completed') return 'approved'
  if (s.action_taken === 'reject') return 'rejected'
  if (s.status === 'skipped') return 'skipped'
  return 'pending'
}

function StepCircle({ state, order }: { state: StepState; order: number }) {
  const base =
    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold select-none'
  const cls = {
    active: 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-600/25',
    approved: 'bg-status-success text-white',
    rejected: 'bg-status-danger text-white',
    skipped: 'border border-app-border bg-app-muted text-app-subtle',
    pending: 'border-2 border-app-border bg-app-surface text-app-subtle',
  }[state]

  const symbol =
    state === 'approved' ? '✓'
    : state === 'rejected' ? '✕'
    : String(order)

  return <div className={cn(base, cls)}>{symbol}</div>
}

function connectorClass(state: StepState): string {
  if (state === 'active') return 'border-brand-600/30'
  if (state === 'approved' || state === 'rejected') return 'border-app-border'
  return 'border-dashed border-app-border/50'
}

// ─── TaskTimelineStepper ──────────────────────────────────────────────────────

export function TaskTimelineStepper({
  steps,
  currentStepId,
}: {
  steps: WorkflowTaskStep[]
  currentStepId: number | null
}) {
  if (steps.length === 0) {
    return <p className="text-sm text-app-secondary">No steps found.</p>
  }

  return (
    <ul>
      {steps.map((s, idx) => {
        const state = getStepState(s, currentStepId)
        const isLast = idx === steps.length - 1
        const isActive = state === 'active'

        return (
          <li key={s.id} className="relative flex gap-3 pb-4">
            {/* Vertical connector line to next step */}
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[11px] top-6 bottom-0 w-0 border-l-2',
                  connectorClass(state),
                )}
              />
            )}

            {/* Circle indicator */}
            <div className="relative z-10 shrink-0">
              <StepCircle state={state} order={s.step_order} />
            </div>

            {/* Step content */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isActive ? 'text-brand-700' : 'text-app-text',
                  )}
                >
                  {s.step_name}
                </span>
                <TaskStatusBadge status={s.status} />
              </div>

              {/* Assignee info */}
              {(s.assigned_user_username || s.assigned_department_name) ? (
                <p className="mt-0.5 text-xs text-app-secondary">
                  {[s.assigned_user_username, s.assigned_department_name]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}

              {/* Outcome (if acted upon) */}
              {(s.action_taken || s.acted_by_username || s.acted_at) ? (
                <p className="mt-0.5 text-[11px] text-app-subtle">
                  {[
                    s.action_taken ? s.action_taken.replace(/_/g, ' ') : null,
                    s.acted_by_username ? `by ${s.acted_by_username}` : null,
                    s.acted_at ? fmt(s.acted_at) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── TaskAuditList ────────────────────────────────────────────────────────────

export function TaskAuditList({ entries }: { entries: WorkflowTaskAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-app-secondary">No activity recorded yet.</p>
    )
  }

  return (
    <ul className="space-y-2">
      {entries.map((a) => (
        <li key={a.id} className="border-l-2 border-app-border pl-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium capitalize text-app-text">
              {a.action.replace(/_/g, ' ')}
            </span>
            {a.actor_username ? (
              <span className="text-app-secondary">by {a.actor_username}</span>
            ) : null}
            <span className="text-app-subtle">{fmt(a.created_at)}</span>
          </div>
          {a.comment?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap text-app-secondary">
              {a.comment}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
