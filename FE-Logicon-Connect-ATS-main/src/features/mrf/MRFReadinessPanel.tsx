import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { formatCount } from '@/features/dashboard/dashboardFormatters'
import { formatMoney, MRFReadinessBudgetBlock } from '@/features/mrf/mrfBudgetContext'
import { friendlyCommercialReadinessWarning } from '@/features/mrf/mrfCommercialOverride'
import type { MRFReadinessResponse, MRFRow } from '@/features/mrf/types'

interface MRFReadinessPanelProps {
  readiness: MRFReadinessResponse | null
  loading?: boolean
  error?: string | null
  mrf: MRFRow
  compact?: boolean
  onAddLineItem?: () => void
}

function HintList({ hints }: { hints: string[] }) {
  if (!hints.length) return null
  return (
    <ul className="mt-3 flex flex-wrap gap-2 text-xs text-app-secondary">
      {hints.map((h) => (
        <li key={h} className="rounded-full border border-app-border bg-app-muted px-2.5 py-1">
          {h}
        </li>
      ))}
    </ul>
  )
}

export function MRFReadinessPanel({
  readiness,
  loading,
  error,
  mrf,
  compact = false,
  onAddLineItem,
}: MRFReadinessPanelProps) {
  if (loading) {
    return (
      <div className="py-4">
        <Spinner label="Checking MRF readiness" />
      </div>
    )
  }

  if (error) {
    return <ErrorState message={error} />
  }

  if (!readiness) {
    return <p className="text-sm text-app-secondary">Readiness check unavailable.</p>
  }

  const currency = mrf.budget_plan_currency ?? 'INR'
  const lineItems = readiness.line_items ?? []
  const errorText = readiness.errors.join(' ').toLowerCase()
  const hints: string[] = []
  if (!lineItems.length || errorText.includes('line item')) hints.push('Add line item')
  if (
    mrf.billing_type === 'billable' &&
    (errorText.includes('department') || errorText.includes('required department'))
  ) {
    hints.push('Set required department on MRF')
  }
  if (
    errorText.includes('site role') ||
    errorText.includes('site role requirement') ||
    errorText.includes('srr')
  ) {
    hints.push('Select site role requirement on each line')
  }
  if (
    (mrf.budget_plan == null && mrf.resolved_budget_plan_id == null) ||
    errorText.includes('budget')
  ) {
    hints.push('Select matching budget')
  }
  if (
    lineItems.some(
      (li) =>
        !li.ok &&
        li.remaining_headcount != null &&
        li.requested_headcount > (li.remaining_headcount ?? 0),
    ) ||
    errorText.includes('headcount') ||
    errorText.includes('remaining')
  ) {
    hints.push('Adjust headcount to SRR remaining')
  }
  if (readiness.warnings.some((w) => /commercial|override/i.test(w))) {
    hints.push('Approver will review commercial overrides')
  }

  if (readiness.ok) {
    const remainingTotal = lineItems.reduce((s, li) => s + (li.remaining_headcount ?? 0), 0)
    return (
      <section
        className={
          compact
            ? 'rounded-panel border border-status-success/30 bg-status-success/5 p-3'
            : 'rounded-panel border border-status-success/30 bg-status-success/5 p-4'
        }
      >
        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success" aria-hidden />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-medium text-app-text">MRF is ready for approval.</p>
            {lineItems.length > 0 ? (
              <p className="text-xs text-app-secondary">
                {formatCount(lineItems.length)} line item{lineItems.length !== 1 ? 's' : ''}
                {mrf.billing_type === 'billable' && remainingTotal > 0
                  ? ` · ${formatCount(remainingTotal)} headcount remaining across roles`
                  : null}
              </p>
            ) : null}
            {readiness.warnings.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs text-status-warning">
                {readiness.warnings.map((msg) => (
                  <li key={msg}>{friendlyCommercialReadinessWarning(msg) ?? msg}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        {(readiness.budget.plan_id != null ||
          readiness.budget.budget_plan_id != null ||
          readiness.budget.requested_amount != null ||
          readiness.budget.required_amount !== '0') && (
          <MRFReadinessBudgetBlock budget={readiness.budget} currency={currency} mrf={mrf} />
        )}
      </section>
    )
  }

  return (
    <section className="rounded-panel border border-app-border bg-app-muted/30 p-4">
      <div className="flex gap-3">
        <AlertCircle className="h-5 w-5 shrink-0 text-status-warning" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-app-text">Complete MRF setup before sending for approval</p>
          <p className="mt-1 text-xs text-app-secondary">
            Approval workflow appears after MRF setup is complete.
          </p>
        </div>
      </div>

      {readiness.errors.length > 0 ? (
        <div className="mt-4 rounded-panel border border-status-danger/30 bg-status-danger/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-status-danger">Required</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-app-secondary">
            {readiness.errors.map((msg) => (
              <li key={msg}>{msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {readiness.warnings.length > 0 ? (
        <div className="mt-4 rounded-panel border border-app-border bg-app-surface p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Warnings</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-app-secondary">
            {readiness.warnings.map((msg) => (
              <li key={msg}>{friendlyCommercialReadinessWarning(msg) ?? msg}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {lineItems.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-app-subtle">Line items</p>
          <table className="w-full min-w-[32rem] text-left text-xs">
            <thead>
              <tr className="border-b border-app-border text-app-subtle">
                <th className="py-1.5 pr-2 font-medium">#</th>
                <th className="py-1.5 pr-2 font-medium">Requested</th>
                <th className="py-1.5 pr-2 font-medium">Approved</th>
                <th className="py-1.5 pr-2 font-medium">Allocated</th>
                <th className="py-1.5 pr-2 font-medium">Remaining</th>
                <th className="py-1.5 pr-2 font-medium">Est. amount</th>
                <th className="py-1.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((li) => (
                <tr key={li.line_item_id ?? 'unknown'} className="border-b border-app-border/60">
                  <td className="py-2 pr-2 tabular-nums text-app-text">{li.line_item_id ?? '—'}</td>
                  <td className="py-2 pr-2 tabular-nums">{li.requested_headcount}</td>
                  <td className="py-2 pr-2 tabular-nums">{li.approved_headcount ?? '—'}</td>
                  <td className="py-2 pr-2 tabular-nums">{li.already_allocated_headcount}</td>
                  <td className="py-2 pr-2 tabular-nums">{li.remaining_headcount ?? '—'}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {formatMoney(li.estimated_amount, currency)}
                  </td>
                  <td className="py-2">
                    <Badge variant={li.ok ? 'success' : 'danger'}>{li.ok ? 'OK' : 'Issue'}</Badge>
                    {li.errors.length > 0 ? (
                      <p className="mt-1 max-w-[12rem] text-[10px] text-status-danger">{li.errors[0]}</p>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {readiness.budget.plan_id != null ||
      readiness.budget.budget_plan_id != null ||
      readiness.budget.requested_amount != null ||
      readiness.budget.required_amount !== '0' ? (
        <MRFReadinessBudgetBlock budget={readiness.budget} currency={currency} mrf={mrf} />
      ) : null}

      <HintList hints={hints} />
      {onAddLineItem &&
      (!lineItems.length ||
        errorText.includes('line item') ||
        errorText.includes('site role') ||
        errorText.includes('srr') ||
        errorText.includes('headcount') ||
        errorText.includes('department')) ? (
        <button
          type="button"
          className="mt-3 text-xs font-medium text-brand-600 hover:underline"
          onClick={onAddLineItem}
        >
          Add line item
        </button>
      ) : null}
    </section>
  )
}
