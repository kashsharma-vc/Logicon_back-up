import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { WorkflowStepTimeline } from '@/features/workflow/WorkflowStepTimeline'
import type { ApprovalRoutePreview } from '@/features/workflow/types'
import { cn } from '@/lib/cn'

function scopeLabel(level: ApprovalRoutePreview['scope_level']): string {
  if (level === 'site') return 'Site'
  if (level === 'client') return 'Client'
  return 'Organization'
}

function routeMetaLine(route: ApprovalRoutePreview): string {
  const parts = [scopeLabel(route.scope_level)]
  if (route.is_default) parts.push('Default')
  if (route.steps.length > 0) parts.unshift(`${route.steps.length} step${route.steps.length === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

export function ApprovalRouteSelector({
  routes,
  selectedRouteId,
  onChange,
  loading,
  error,
  disabled,
  emptyMessage,
  compact = false,
}: {
  routes: ApprovalRoutePreview[]
  selectedRouteId: number | null
  onChange: (id: number | null) => void
  loading?: boolean
  error?: string | null
  disabled?: boolean
  /** Shown when the routes list is empty (no error, not loading). */
  emptyMessage?: string
  /** Dense layout for client-facing forms. */
  compact?: boolean
}) {
  const selected = routes.find((r) => r.id === selectedRouteId) ?? null

  if (loading) {
    return (
      <div
        className={cn(
          'flex justify-center',
          compact ? 'py-4' : 'rounded-panel border border-app-border bg-app-muted p-4',
        )}
      >
        <Spinner label="Loading approval routes" />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} />
  }

  if (!routes.length) {
    return (
      <div
        className={cn(
          compact
            ? 'text-sm text-app-secondary'
            : 'rounded-panel border border-app-border bg-app-muted p-4',
        )}
      >
        {!compact ? <p className="text-sm font-medium text-app-text">Approval route</p> : null}
        <p className={cn(compact ? '' : 'mt-2', 'text-sm text-app-secondary')}>
          {emptyMessage ?? 'No approval route is configured for this MRF.'}
        </p>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <Select
          id="mrf_approval_route"
          label="Approval route"
          value={selectedRouteId != null ? String(selectedRouteId) : ''}
          onChange={(e) => {
            const v = e.target.value
            onChange(v ? Number(v) : null)
          }}
          disabled={disabled}
        >
          <option value="">Select a route…</option>
          {routes.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name}
              {!r.ok ? ' (needs setup)' : ''}
            </option>
          ))}
        </Select>

        {selected ? (
          <div className="rounded-lg border border-app-border/80 bg-app-muted/25 px-3 py-2.5">
            <p className="text-[11px] text-app-subtle">{routeMetaLine(selected)}</p>
            {!selected.ok && selected.errors?.length ? (
              <ul className="mt-1.5 list-inside list-disc text-[11px] text-status-danger">
                {selected.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-2.5">
              <WorkflowStepTimeline
                steps={selected.steps.map((step) => ({
                  order: step.order,
                  name: step.step_name,
                  approver:
                    step.assigned_user_name?.trim() ||
                    step.assigned_user_username?.trim() ||
                    null,
                  department: step.department_name,
                  assignmentOk: step.assignment_ok,
                }))}
              />
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-panel border border-app-border bg-app-muted p-4">
      <div className="space-y-1">
        <Select
          id="mrf_approval_route"
          label="Approval route"
          value={selectedRouteId != null ? String(selectedRouteId) : ''}
          onChange={(e) => {
            const v = e.target.value
            onChange(v ? Number(v) : null)
          }}
          disabled={disabled}
        >
          <option value="">Select a route…</option>
          {routes.map((r) => (
            <option key={r.id} value={String(r.id)}>
              {r.name}
              {!r.ok ? ' (needs setup)' : ''}
            </option>
          ))}
        </Select>
        {selected ? (
          <p className="pt-1 text-xs text-app-subtle">{routeMetaLine(selected)}</p>
        ) : null}
      </div>

      {selected ? (
        <div className="border-t border-app-border pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Route preview</p>
          {selected.description?.trim() ? (
            <p className="mt-1 text-xs text-app-secondary">{selected.description.trim()}</p>
          ) : null}
          {!selected.ok && selected.errors?.length ? (
            <ul className="mt-2 list-inside list-disc text-xs text-status-danger">
              {selected.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3">
            <WorkflowStepTimeline
              steps={selected.steps.map((step) => ({
                order: step.order,
                name: step.step_name,
                approver:
                  step.assigned_user_name?.trim() ||
                  step.assigned_user_username?.trim() ||
                  null,
                department: step.department_name,
                assignmentOk: step.assignment_ok,
              }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
