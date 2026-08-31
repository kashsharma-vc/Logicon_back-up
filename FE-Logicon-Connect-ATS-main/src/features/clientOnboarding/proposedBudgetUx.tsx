import { budgetNatureLabel, budgetTypeLabel, formatBudgetAmount, formatBudgetPeriod } from '@/features/budgets/types'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { cn } from '@/lib/cn'

export interface ProposedBudgetLike {
  id: number
  name: string
  code: string
  budget_nature: string
  budget_type: string
  scope_level: string
  proposed_site: number | null
  proposed_site_name?: string | null
  proposed_site_code?: string | null
  proposed_department: number | null
  proposed_department_name?: string | null
  proposed_department_code?: string | null
  amount: string
  currency: string
  period_start: string
  period_end: string | null
  notes?: string
  is_active: boolean
}

export function isClientScopeBudget(b: ProposedBudgetLike): boolean {
  return b.scope_level === 'client'
}

export function partitionProposedBudgets(budgets: ProposedBudgetLike[]) {
  const clientTotal = budgets.filter(isClientScopeBudget)
  const breakup = budgets.filter((b) => !isClientScopeBudget(b))
  return { clientTotal, breakup }
}

function sumActiveAmounts(rows: ProposedBudgetLike[]): number {
  return rows
    .filter((b) => b.is_active !== false)
    .reduce((sum, b) => {
      const n = Number(b.amount)
      return sum + (Number.isFinite(n) ? n : 0)
    }, 0)
}

export interface ProposedBudgetSummary {
  currency: string
  envelope: number
  breakupTotal: number
  unallocated: number
  hasEnvelope: boolean
  breakupExceedsEnvelope: boolean
  excess: number
}

export function computeProposedBudgetSummary(budgets: ProposedBudgetLike[]): ProposedBudgetSummary {
  const { clientTotal, breakup } = partitionProposedBudgets(budgets)
  const currency = clientTotal.find((b) => b.currency?.trim())?.currency || breakup.find((b) => b.currency?.trim())?.currency || 'INR'
  const envelope = sumActiveAmounts(clientTotal)
  const breakupTotal = sumActiveAmounts(breakup)
  const unallocated = envelope - breakupTotal
  return {
    currency,
    envelope,
    breakupTotal,
    unallocated,
    hasEnvelope: envelope > 0,
    breakupExceedsEnvelope: envelope > 0 && breakupTotal > envelope,
    excess: Math.max(0, breakupTotal - envelope),
  }
}

export function proposedBudgetScopeLabel(scopeLevel: string): string {
  if (scopeLevel === 'client') return 'Client total'
  if (scopeLevel === 'site') return 'Site'
  if (scopeLevel === 'department') return 'Department'
  return scopeLevel.replace(/_/g, ' ')
}

export function proposedBudgetSiteDisplay(
  b: ProposedBudgetLike,
  resolveSite?: (id: number) => string,
): string {
  if (b.scope_level === 'client') return 'All sites'
  if (b.proposed_site_name?.trim()) {
    const code = b.proposed_site_code?.trim()
    return code ? `${b.proposed_site_name} (${code})` : b.proposed_site_name
  }
  if (b.proposed_site != null) return resolveSite?.(b.proposed_site) ?? `Site #${b.proposed_site}`
  return '-'
}

export function proposedBudgetDeptDisplay(
  b: ProposedBudgetLike,
  resolveDept?: (id: number) => string,
): string {
  if (b.scope_level === 'client' || b.scope_level === 'site') return 'All departments'
  if (b.proposed_department_name?.trim()) {
    const code = b.proposed_department_code?.trim()
    return code ? `${b.proposed_department_name} (${code})` : b.proposed_department_name
  }
  if (b.proposed_department != null) return resolveDept?.(b.proposed_department) ?? `Department #${b.proposed_department}`
  return '-'
}

export function proposedBudgetScopeHelpText(scopeLevel: 'client' | 'site' | 'department'): string {
  if (scopeLevel === 'client') return 'Use this as the total budget envelope for the client.'
  if (scopeLevel === 'site') return 'Use this for all departments under a selected site.'
  return 'Use this for one department under a selected site.'
}

function formatSummaryAmount(amount: number, currency: string): string {
  return formatBudgetAmount(amount.toFixed(2), currency)
}

export function ProposedBudgetSummaryPanel({ budgets }: { budgets: ProposedBudgetLike[] }) {
  const summary = computeProposedBudgetSummary(budgets)

  if (budgets.length === 0) {
    return null
  }

  return (
    <div className="rounded-panel border border-app-border bg-app-muted/50 p-3 text-sm">
      {!summary.hasEnvelope ? (
        <p className="text-app-secondary">No client total budget has been added yet.</p>
      ) : (
        <dl className="grid gap-2 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Total envelope</dt>
            <dd className="mt-0.5 font-medium text-app-text">{formatSummaryAmount(summary.envelope, summary.currency)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Breakup total</dt>
            <dd className="mt-0.5 font-medium text-app-text">{formatSummaryAmount(summary.breakupTotal, summary.currency)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Unallocated</dt>
            <dd
              className={cn(
                'mt-0.5 font-medium',
                summary.breakupExceedsEnvelope ? 'text-status-danger' : 'text-app-text',
              )}
            >
              {formatSummaryAmount(summary.unallocated, summary.currency)}
            </dd>
          </div>
        </dl>
      )}
      {summary.breakupExceedsEnvelope ? (
        <p className="mt-2 text-xs font-medium text-status-danger">
          Breakup exceeds total client budget by {formatSummaryAmount(summary.excess, summary.currency)}.
        </p>
      ) : null}
    </div>
  )
}

type BudgetTableProps = {
  rows: ProposedBudgetLike[]
  resolveSite?: (id: number) => string
  resolveDept?: (id: number) => string
  canMutate?: boolean
  onEdit?: (row: ProposedBudgetLike) => void
  onRemove?: (row: ProposedBudgetLike) => void
  emptyLabel?: string
}

function ProposedBudgetTable({
  rows,
  resolveSite,
  resolveDept,
  canMutate,
  onEdit,
  onRemove,
  emptyLabel = 'No rows in this section.',
}: BudgetTableProps) {
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-app-secondary">{emptyLabel}</p>
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <THead>
          <TR>
            <TH className="py-2">Name</TH>
            <TH className="py-2">Code</TH>
            <TH className="py-2">Scope</TH>
            <TH className="py-2">Site</TH>
            <TH className="py-2">Department</TH>
            <TH className="py-2">Nature</TH>
            <TH className="py-2">Type</TH>
            <TH className="py-2">Amount</TH>
            <TH className="py-2">Period</TH>
            <TH className="py-2">Active</TH>
            {canMutate ? <TH className="py-2 text-right">Actions</TH> : null}
          </TR>
        </THead>
        <TBody>
          {rows.map((b) => (
            <TR key={b.id}>
              <TD className="py-2 text-sm">{b.name}</TD>
              <TD className="py-2 font-mono text-xs">{b.code}</TD>
              <TD className="py-2 text-xs">{proposedBudgetScopeLabel(String(b.scope_level))}</TD>
              <TD className="py-2 text-xs text-app-secondary">{proposedBudgetSiteDisplay(b, resolveSite)}</TD>
              <TD className="py-2 text-xs text-app-secondary">{proposedBudgetDeptDisplay(b, resolveDept)}</TD>
              <TD className="py-2 text-xs">{budgetNatureLabel(b.budget_nature)}</TD>
              <TD className="py-2 text-xs">{budgetTypeLabel(b.budget_type)}</TD>
              <TD className="py-2 text-xs font-medium text-app-text">
                {formatBudgetAmount(String(b.amount), b.currency || 'INR')}
              </TD>
              <TD className="py-2 text-xs text-app-secondary">{formatBudgetPeriod(b.period_start, b.period_end)}</TD>
              <TD className="py-2">{b.is_active ? <Badge variant="success">Yes</Badge> : <Badge variant="neutral">No</Badge>}</TD>
              {canMutate && onEdit && onRemove ? (
                <TD className="py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" className="min-h-8 px-2" type="button" onClick={() => onEdit(b)}>
                      Edit
                    </Button>
                    <Button variant="danger" className="min-h-8 px-2" type="button" onClick={() => onRemove(b)}>
                      Remove
                    </Button>
                  </div>
                </TD>
              ) : null}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}

export function ProposedBudgetSections({
  budgets,
  title = 'Proposed budgets',
  canMutate,
  onAdd,
  onEdit,
  onRemove,
  resolveSite,
  resolveDept,
  emptyMessage = 'No proposed budgets yet.',
  className,
}: {
  budgets: ProposedBudgetLike[]
  title?: string
  canMutate?: boolean
  onAdd?: () => void
  onEdit?: (row: ProposedBudgetLike) => void
  onRemove?: (row: ProposedBudgetLike) => void
  resolveSite?: (id: number) => string
  resolveDept?: (id: number) => string
  emptyMessage?: string
  className?: string
}) {
  const { clientTotal, breakup } = partitionProposedBudgets(budgets)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-app-text">{title}</p>
        {canMutate && onAdd ? (
          <Button type="button" className="min-h-9" onClick={onAdd}>
            Add proposed budget
          </Button>
        ) : null}
      </div>
      {budgets.length === 0 ? (
        <p className="text-sm text-app-secondary">{emptyMessage}</p>
      ) : (
        <>
          <ProposedBudgetSummaryPanel budgets={budgets} />
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Total client budget</p>
            <p className="mt-0.5 text-xs text-app-secondary">Client-wide envelope applied across all sites.</p>
            <div className="mt-2">
              <ProposedBudgetTable
                rows={clientTotal}
                resolveSite={resolveSite}
                resolveDept={resolveDept}
                canMutate={canMutate}
                onEdit={onEdit}
                onRemove={onRemove}
                emptyLabel="No client total budget has been added yet."
              />
            </div>
          </section>
          <section>
            <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Budget breakup</p>
            <p className="mt-0.5 text-xs text-app-secondary">Site- and department-level allocations within the envelope.</p>
            <div className="mt-2">
              <ProposedBudgetTable
                rows={breakup}
                resolveSite={resolveSite}
                resolveDept={resolveDept}
                canMutate={canMutate}
                onEdit={onEdit}
                onRemove={onRemove}
                emptyLabel="No site or department budgets in the breakup yet."
              />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
