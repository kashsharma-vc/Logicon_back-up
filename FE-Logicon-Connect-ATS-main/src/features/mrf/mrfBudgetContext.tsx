import { Badge } from '@/components/ui/Badge'
import { formatMoneyAmount } from '@/features/budgets/budgetDisplay'
import type { ReservationBadgeVariant } from '@/features/budgets/budgetDisplay'
import type { MRFReadinessBudget, MRFReadinessLineItem, MRFRow } from '@/features/mrf/types'
import type { WorkflowTaskMRF } from '@/features/workflow/types'
import { cn } from '@/lib/cn'

export type ResolvedBudgetScope = 'department' | 'site' | 'client' | 'explicit' | 'none' | string

/** Fields shared by MRF detail and workflow task drawer. */
export interface MRFBudgetContextSource {
  resolved_budget_plan_id?: number | null
  resolved_budget_plan_name?: string | null
  resolved_budget_plan_code?: string | null
  resolved_budget_scope?: ResolvedBudgetScope | null
  resolved_budget_total_amount?: string | null
  resolved_budget_reserved_amount?: string | null
  resolved_budget_committed_amount?: string | null
  resolved_budget_available_amount?: string | null
  requested_budget_amount?: string | null
  budget_after_request_available_amount?: string | null
  budget_plan?: number | null
  budget_plan_name?: string | null
  budget_plan_code?: string | null
  budget_plan_currency?: string | null
  budget_reserved_amount?: string | null
  budget_committed_amount?: string | null
  budget_reservation_status?: string | null
  workflow_status?: string | null
  billing_type?: string | null
}

export function budgetScopeLabel(scope: ResolvedBudgetScope | null | undefined): string {
  switch (scope) {
    case 'department':
      return 'Department budget'
    case 'site':
      return 'Site budget'
    case 'client':
      return 'Client budget'
    case 'explicit':
      return 'Selected budget'
    case 'none':
    default:
      return 'No budget linked'
  }
}

export function formatMoney(value: string | number | null | undefined, currency = 'INR'): string {
  return formatMoneyAmount(value != null ? String(value) : null, currency)
}

function parsePositiveAmount(v: string | null | undefined): number | null {
  if (v == null || String(v).trim() === '') return null
  const n = Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

export function hasBudgetContext(source: MRFBudgetContextSource): boolean {
  if (source.resolved_budget_plan_id != null) return true
  const scope = source.resolved_budget_scope
  if (scope && scope !== 'none') return true
  return source.budget_plan != null && !!(source.budget_plan_name?.trim() || source.budget_plan_code?.trim())
}

export function budgetHealthVariant(
  availableAfterRequest: string | number | null | undefined,
): ReservationBadgeVariant {
  const n = parsePositiveAmount(availableAfterRequest != null ? String(availableAfterRequest) : null)
  if (n == null) return 'neutral'
  if (n <= 0) return 'danger'
  return 'success'
}

export function resolvedPlanLabel(source: MRFBudgetContextSource): string | null {
  const name = source.resolved_budget_plan_name?.trim() || source.budget_plan_name?.trim()
  const code = source.resolved_budget_plan_code?.trim() || source.budget_plan_code?.trim()
  if (!name && !code) return null
  if (name && code) return `${name} (${code})`
  return name ?? code ?? null
}

export function mrfReservationStatusCopy(
  source: MRFBudgetContextSource,
  workflowStatus?: string | null,
): { label: string; variant: ReservationBadgeVariant } {
  const currency = source.budget_plan_currency ?? 'INR'
  const wf = workflowStatus ?? source.workflow_status ?? 'not_started'
  const reservationStatus = source.budget_reservation_status

  if (!hasBudgetContext(source) || source.resolved_budget_scope === 'none') {
    return { label: 'No budget linked', variant: 'warning' }
  }

  const requested = parsePositiveAmount(source.requested_budget_amount)

  if (reservationStatus === 'committed') {
    const amt =
      parsePositiveAmount(source.budget_committed_amount) ??
      parsePositiveAmount(source.resolved_budget_committed_amount) ??
      requested
    return {
      label: amt != null ? `Committed ${formatMoney(amt, currency)}` : 'Committed',
      variant: 'success',
    }
  }

  if (reservationStatus === 'reserved') {
    const amt =
      parsePositiveAmount(source.budget_reserved_amount) ??
      parsePositiveAmount(source.resolved_budget_reserved_amount) ??
      requested
    return {
      label: amt != null ? `Reserved ${formatMoney(amt, currency)}` : 'Reserved',
      variant: 'attention',
    }
  }

  if ((!wf || wf === 'not_started') && requested != null) {
    return {
      label: `Will reserve ${formatMoney(requested, currency)} when sent for approval`,
      variant: 'info',
    }
  }

  return { label: 'Not reserved', variant: 'neutral' }
}

export function mrfBudgetWorkflowNote(
  source: MRFBudgetContextSource,
  workflowStatus?: string | null,
): string | null {
  const wf = workflowStatus ?? source.workflow_status ?? 'not_started'
  const status = source.budget_reservation_status

  if (status === 'committed') return 'Budget committed after approval.'
  if (status === 'reserved') return 'Budget is reserved while approval is in progress.'
  if (status === 'released') return 'Budget reservation released.'
  if (status === 'cancelled') return 'Budget reservation cancelled.'
  if (wf === 'not_started' && hasBudgetContext(source)) {
    return 'This budget will be reserved when workflow starts.'
  }
  return null
}

export function approverBudgetImpactCopy(
  source: MRFBudgetContextSource & {
    client_name?: string | null
    required_department_name?: string | null
  },
): string | null {
  if (!hasBudgetContext(source)) return null
  const dept = source.required_department_name?.trim()
  const client = source.client_name?.trim()
  const scope = budgetScopeLabel(source.resolved_budget_scope)
  if (dept) {
    return `This request is consuming the ${scope.toLowerCase()} for ${dept}.`
  }
  if (client) {
    return `This request is consuming the ${scope.toLowerCase()} for ${client}.`
  }
  return `This request will draw from the linked ${scope.toLowerCase()}.`
}

function StatRow({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-app-subtle">{label}</dt>
      <dd className={cn('text-right tabular-nums', emphasis ? 'font-semibold text-app-text' : 'font-medium text-app-text')}>
        {value}
      </dd>
    </div>
  )
}

export function MRFBudgetImpactPanel({
  source,
  currency = 'INR',
  workflowStatus,
  clientName,
  siteName,
  departmentName,
  className,
  title = 'Budget impact',
  approverMode = false,
}: {
  source: MRFBudgetContextSource &
    Partial<Pick<WorkflowTaskMRF, 'client_name' | 'required_department_name'>>
  currency?: string
  workflowStatus?: string | null
  clientName?: string | null
  siteName?: string | null
  departmentName?: string | null
  className?: string
  title?: string
  approverMode?: boolean
}) {
  const cur = source.budget_plan_currency ?? currency
  const hasPlan = hasBudgetContext(source)
  const planLabel = resolvedPlanLabel(source)
  const scope = source.resolved_budget_scope ?? (hasPlan ? 'explicit' : 'none')
  const reservation = mrfReservationStatusCopy(source, workflowStatus)
  const workflowNote = mrfBudgetWorkflowNote(source, workflowStatus)
  const approverCopy = approverMode ? approverBudgetImpactCopy(source) : null
  const afterVariant = budgetHealthVariant(source.budget_after_request_available_amount)

  if (!hasPlan) {
    return (
      <section
        className={cn(
          'rounded-panel border border-status-warning/40 bg-status-warning/5 p-4',
          className,
        )}
      >
        <p className="text-sm font-semibold text-app-text">{title}</p>
        <p className="mt-2 text-sm text-status-warning">
          No matching budget plan found for this site/department. Workflow cannot start until budget is
          configured.
        </p>
      </section>
    )
  }

  return (
    <section className={cn('rounded-panel border border-app-border bg-app-muted/40 p-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-semibold text-app-text">{title}</p>
        <Badge variant={reservation.variant}>{reservation.label}</Badge>
      </div>

      {approverCopy ? <p className="mt-2 text-sm text-app-secondary">{approverCopy}</p> : null}
      {workflowNote ? <p className="mt-2 text-xs text-app-secondary">{workflowNote}</p> : null}

      <dl className="mt-4 space-y-2">
        <StatRow label="Budget source" value={planLabel ?? '—'} />
        <StatRow label="Scope" value={budgetScopeLabel(scope)} />
        {clientName?.trim() ? <StatRow label="Client" value={clientName.trim()} /> : null}
        {siteName?.trim() ? <StatRow label="Site" value={siteName.trim()} /> : null}
        {departmentName?.trim() ? <StatRow label="Department" value={departmentName.trim()} /> : null}
        <StatRow
          label="Total budget"
          value={formatMoney(source.resolved_budget_total_amount, cur)}
        />
        <StatRow
          label="Already reserved"
          value={formatMoney(source.resolved_budget_reserved_amount, cur)}
        />
        <StatRow
          label="Committed"
          value={formatMoney(source.resolved_budget_committed_amount, cur)}
        />
        <StatRow label="This request" value={formatMoney(source.requested_budget_amount, cur)} emphasis />
        <StatRow
          label="Available after this request"
          value={formatMoney(source.budget_after_request_available_amount, cur)}
          emphasis
        />
      </dl>

      {source.budget_after_request_available_amount != null ? (
        <p className="mt-3 text-xs text-app-secondary">
          <Badge variant={afterVariant} className="mr-1.5">
            {afterVariant === 'danger' ? 'Insufficient' : afterVariant === 'success' ? 'Sufficient' : 'Pending'}
          </Badge>
          Remaining plan balance after this MRF is reserved.
        </p>
      ) : null}
    </section>
  )
}

export function MRFReadinessBudgetBlock({
  budget,
  currency = 'INR',
  mrf,
}: {
  budget: MRFReadinessBudget
  currency?: string
  mrf?: MRFRow | null
}) {
  const cur = mrf?.budget_plan_currency ?? currency
  const planLabel =
    budget.plan_name?.trim() && budget.plan_code?.trim()
      ? `${budget.plan_name} (${budget.plan_code})`
      : budget.plan_name?.trim() || budget.plan_code?.trim() || resolvedPlanLabel(mrf ?? {}) || '—'
  const variant = budget.ok ? 'success' : 'danger'
  const borderClass = budget.ok
    ? 'border-status-success/30 bg-status-success/5'
    : 'border-status-danger/30 bg-status-danger/5'

  return (
    <div className={cn('mt-4 rounded-panel border p-3', borderClass)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Budget readiness</p>
        <Badge variant={variant}>{budget.ok ? 'Sufficient' : 'Insufficient'}</Badge>
      </div>
      <p className="mt-1 text-sm font-medium text-app-text">{planLabel}</p>
      {budget.scope ? (
        <p className="text-xs text-app-secondary">{budgetScopeLabel(budget.scope)}</p>
      ) : null}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-app-subtle">Total</dt>
          <dd className="font-medium tabular-nums text-app-text">{formatMoney(budget.total_amount, cur)}</dd>
        </div>
        <div>
          <dt className="text-app-subtle">Reserved</dt>
          <dd className="font-medium tabular-nums text-app-text">
            {formatMoney(budget.reserved_amount, cur)}
          </dd>
        </div>
        <div>
          <dt className="text-app-subtle">Committed</dt>
          <dd className="font-medium tabular-nums text-app-text">
            {formatMoney(budget.committed_amount, cur)}
          </dd>
        </div>
        <div>
          <dt className="text-app-subtle">Available now</dt>
          <dd className="font-medium tabular-nums text-app-text">
            {formatMoney(budget.available_amount, cur)}
          </dd>
        </div>
        <div>
          <dt className="text-app-subtle">This request</dt>
          <dd className="font-semibold tabular-nums text-app-text">
            {formatMoney(budget.requested_amount ?? budget.required_amount, cur)}
          </dd>
        </div>
        <div>
          <dt className="text-app-subtle">Available after request</dt>
          <dd className="font-semibold tabular-nums text-app-text">
            {formatMoney(budget.available_after_request, cur)}
          </dd>
        </div>
      </dl>
      {!budget.ok ? (
        <p className="mt-2 text-xs font-medium text-status-danger">
          Insufficient available budget for this request.
        </p>
      ) : null}
    </div>
  )
}

export function formatLineItemBillableImpact(
  row: {
    headcount: number
    billing_rate_snapshot?: string | null
    srr_billing_rate?: string | null
    srr_approved_headcount?: number | null
  },
  readiness?: MRFReadinessLineItem | null,
): { headcountLine: string; amountLine: string | null } {
  const approved = row.srr_approved_headcount ?? readiness?.approved_headcount ?? null
  const requested = readiness?.requested_headcount ?? row.headcount
  const remaining = readiness?.remaining_headcount ?? null

  const headParts: string[] = []
  if (approved != null) headParts.push(`Approved ${approved}`)
  headParts.push(`Requested ${requested}`)
  if (remaining != null) headParts.push(`Remaining ${remaining}`)

  const rateStr = row.billing_rate_snapshot ?? row.srr_billing_rate
  const rate = rateStr != null && rateStr !== '' ? Number(rateStr) : null
  let amountLine: string | null = null

  if (rate != null && Number.isFinite(rate) && requested > 0) {
    const est = readiness?.estimated_amount
    const estN = est != null && est !== '' ? Number(est) : rate * requested
    const estFormatted = Number.isFinite(estN) ? formatMoney(estN) : null
    amountLine = estFormatted
      ? `${formatMoney(rateStr)} × ${requested} = ${estFormatted}`
      : `${formatMoney(rateStr)} × ${requested}`
  }

  return { headcountLine: headParts.join(' | '), amountLine }
}
