import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { TaskStatusBadge } from '@/features/workflowTasks/TaskStatusBadge'
import type { WorkflowAuditEntry, WorkflowStepInstance } from '@/features/workflow/types'
import { cn } from '@/lib/cn'

type StepState = 'active' | 'approved' | 'rejected' | 'skipped' | 'pending'

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

function str(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'string' || typeof v === 'number') return String(v)
  return '—'
}

function getWorkflowStepState(step: WorkflowStepInstance, currentStepId: number | null): StepState {
  if (currentStepId != null && step.id === currentStepId) return 'active'
  const status = step.status?.toLowerCase() ?? ''
  if (status === 'active') return 'active'
  const action = step.action_taken?.toLowerCase() ?? ''
  if (action === 'approve' || status === 'completed' || status === 'approved') return 'approved'
  if (action === 'reject' || status === 'rejected') return 'rejected'
  if (status === 'skipped') return 'skipped'
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
    state === 'approved' ? '✓' : state === 'rejected' ? '✕' : String(order)

  return <div className={cn(base, cls)}>{symbol}</div>
}

function connectorClass(state: StepState): string {
  if (state === 'active') return 'border-brand-600/30'
  if (state === 'approved' || state === 'rejected') return 'border-app-border'
  return 'border-dashed border-app-border/50'
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
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

function auditActionLabel(action: string | null | undefined): string {
  const raw = str(action)
  if (raw === '—') return raw
  return raw.replace(/_/g, ' ')
}

function auditActionVariant(
  action: string | null | undefined,
): 'success' | 'info' | 'warning' | 'neutral' | 'danger' | 'attention' {
  const key = (action ?? '').toLowerCase()
  if (key.includes('approve')) return 'success'
  if (key.includes('reject')) return 'danger'
  if (key.includes('reassign')) return 'attention'
  if (key.includes('request') && key.includes('change')) return 'warning'
  if (key.includes('start') || key.includes('submit') || key.includes('initiat')) return 'info'
  if (key.includes('complete') || key.includes('skip')) return 'neutral'
  return 'info'
}

export function WorkflowApprovalStepper({
  steps,
  currentStepId = null,
  loading,
  errorMessage,
}: {
  steps: WorkflowStepInstance[]
  currentStepId?: number | null
  loading?: boolean
  errorMessage?: string | null
}) {
  if (loading) {
    return (
      <div className="py-2">
        <Spinner label="Loading approval history…" />
      </div>
    )
  }

  if (errorMessage) {
    return <p className="text-sm text-status-danger">{errorMessage}</p>
  }

  const sorted = [...steps].sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0))

  if (sorted.length === 0) {
    return <p className="text-sm text-app-secondary">No approval steps recorded yet.</p>
  }

  return (
    <ul>
      {sorted.map((step, idx) => {
        const state = getWorkflowStepState(step, currentStepId ?? null)
        const isLast = idx === sorted.length - 1
        const isActive = state === 'active'
        const order = step.step_order ?? idx + 1

        return (
          <li key={step.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast ? (
              <div
                className={cn(
                  'absolute left-[11px] top-6 bottom-0 w-0 border-l-2',
                  connectorClass(state),
                )}
                aria-hidden
              />
            ) : null}

            <div className="relative z-10 shrink-0">
              <StepCircle state={state} order={order} />
            </div>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isActive ? 'text-brand-700 dark:text-brand-300' : 'text-app-text',
                  )}
                >
                  {str(step.step_name)}
                </span>
                {step.status ? <TaskStatusBadge status={step.status} /> : null}
              </div>

              {(step.assigned_user_username?.trim() || step.assigned_department_name_snapshot?.trim()) ? (
                <p className="mt-0.5 text-xs text-app-secondary">
                  {[
                    step.assigned_user_username?.trim() || null,
                    step.assigned_department_name_snapshot?.trim() || null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}

              {step.acted_by_username || step.acted_at || step.action_taken ? (
                <p className="mt-0.5 text-[11px] text-app-subtle">
                  {[
                    step.action_taken ? step.action_taken.replace(/_/g, ' ') : null,
                    step.acted_by_username ? `by ${step.acted_by_username}` : null,
                    step.acted_at ? fmt(step.acted_at) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              ) : null}

              {step.comment?.trim() ? (
                <p className="mt-1 whitespace-pre-wrap text-xs text-app-secondary">
                  {step.comment.trim()}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export function WorkflowAuditTrailList({
  entries,
  loading,
  errorMessage,
}: {
  entries: WorkflowAuditEntry[]
  loading?: boolean
  errorMessage?: string | null
}) {
  if (loading) {
    return (
      <div className="py-2">
        <Spinner label="Loading audit trail…" />
      </div>
    )
  }

  if (errorMessage) {
    return <p className="text-sm text-status-danger">{errorMessage}</p>
  }

  const sorted = [...entries].sort((a, b) => {
    const ta = typeof a.created_at === 'string' ? a.created_at : ''
    const tb = typeof b.created_at === 'string' ? b.created_at : ''
    return tb.localeCompare(ta)
  })

  if (sorted.length === 0) {
    return <p className="text-sm text-app-secondary">No activity recorded yet.</p>
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-md border border-app-border/80 bg-white/90 sm:block dark:bg-app-surface/90">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="border-b border-app-border bg-app-muted/50 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold">When</th>
              <th className="px-3 py-2.5 text-left font-semibold">Action</th>
              <th className="px-3 py-2.5 text-left font-semibold">Actor</th>
              <th className="px-3 py-2.5 text-left font-semibold">Comment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border/60">
            {sorted.map((entry, index) => (
              <tr key={entry.id ?? `audit-${index}`} className="hover:bg-app-muted/30">
                <td className="px-3 py-2.5 align-top text-xs whitespace-nowrap text-app-secondary">
                  {fmtDateTime(entry.created_at)}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <Badge variant={auditActionVariant(entry.action)} className="text-[11px] capitalize">
                    {auditActionLabel(entry.action)}
                  </Badge>
                </td>
                <td className="px-3 py-2.5 align-top text-xs text-app-text">
                  {entry.actor_username?.trim() || <span className="text-app-subtle">—</span>}
                </td>
                <td className="max-w-md px-3 py-2.5 align-top text-xs text-app-secondary">
                  {entry.comment?.trim() ? (
                    <span className="whitespace-pre-wrap">{entry.comment.trim()}</span>
                  ) : (
                    <span className="text-app-subtle">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 sm:hidden">
        {sorted.map((entry, index) => (
          <li
            key={entry.id ?? `audit-mobile-${index}`}
            className="rounded-md border border-app-border/80 bg-white/90 p-3 dark:bg-app-surface/90"
          >
            <div className="flex items-start justify-between gap-2">
              <Badge variant={auditActionVariant(entry.action)} className="text-[11px] capitalize">
                {auditActionLabel(entry.action)}
              </Badge>
              <span className="shrink-0 text-[11px] text-app-subtle">{fmtDateTime(entry.created_at)}</span>
            </div>
            {entry.actor_username?.trim() ? (
              <p className="mt-2 text-xs text-app-text">
                <span className="text-app-subtle">Actor · </span>
                {entry.actor_username.trim()}
              </p>
            ) : null}
            {entry.comment?.trim() ? (
              <p className="mt-1.5 whitespace-pre-wrap text-xs text-app-secondary">{entry.comment.trim()}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  )
}
