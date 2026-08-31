/**
 * Shared building blocks for workflow task drawer overview tabs.
 * Used by MRF, mobilisation, and sales proposal overview tabs.
 */

import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/features/mrf/mrfBudgetContext'
import { cn } from '@/lib/cn'

// ─── TaskSummaryBand ─────────────────────────────────────────────────────────

export function TaskSummaryBand({
  title,
  subtitle,
  badges,
}: {
  title: string
  subtitle?: string | null
  badges?: ReactNode
}) {
  return (
    <div className="rounded-panel border border-app-border bg-app-surface px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-app-text">{title}</p>
          {subtitle?.trim() ? (
            <p className="mt-0.5 truncate text-xs text-app-secondary">{subtitle}</p>
          ) : null}
        </div>
        {badges ? (
          <div className="flex shrink-0 flex-wrap items-center gap-1.5">{badges}</div>
        ) : null}
      </div>
    </div>
  )
}

// ─── TaskMetricTile ──────────────────────────────────────────────────────────

export function TaskMetricTile({
  label,
  value,
  sub,
  highlight,
  compact,
}: {
  label: string
  value: string | number
  sub?: string | null
  highlight?: 'positive' | 'warning' | 'neutral'
  compact?: boolean
}) {
  const valueClass =
    highlight === 'positive' ? 'text-status-hired'
    : highlight === 'warning' ? 'text-status-warning'
    : 'text-app-text'

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-panel border border-app-border bg-app-surface px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">{label}</p>
      <p
        className={cn(
          'tabular-nums leading-none',
          compact ? 'text-sm font-semibold' : 'text-xl font-bold',
          valueClass,
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[10px] text-app-subtle">{sub}</p> : null}
    </div>
  )
}

// ─── TaskApprovalCard ────────────────────────────────────────────────────────

export function TaskApprovalCard({
  stepName,
  departmentName,
  activatedAt,
  dueAt,
}: {
  stepName: string
  departmentName: string | null | undefined
  activatedAt: string | null | undefined
  dueAt: string | null | undefined
}) {
  function fmt(iso: string | null | undefined): string {
    if (!iso) return '—'
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return String(iso)
    }
  }

  return (
    <div className="rounded-panel border border-brand-600/25 bg-brand-600/5 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
        Current approval
      </p>
      <p className="mt-1 text-sm font-semibold text-app-text">{stepName}</p>
      {departmentName?.trim() ? (
        <p className="mt-1 text-xs text-app-secondary">
          Assigned to {departmentName.trim()}
        </p>
      ) : null}
      <p className="mt-1 text-xs text-app-subtle">Activated {fmt(activatedAt)}</p>
      {dueAt?.trim() ? (
        <p className="mt-0.5 text-xs font-medium text-status-warning">
          Due {fmt(dueAt)}
        </p>
      ) : null}
    </div>
  )
}

// ─── TaskSectionCard ─────────────────────────────────────────────────────────

export function TaskSectionCard({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-panel border border-app-border bg-app-surface px-4 py-3', className)}>
      {title ? (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
          {title}
        </p>
      ) : null}
      {children}
    </div>
  )
}

// ─── TaskInfoGrid ────────────────────────────────────────────────────────────

export function TaskInfoGrid({
  title,
  rows,
}: {
  title?: string
  rows: Array<{ label: string; value: ReactNode }>
}) {
  return (
    <div className="rounded-panel border border-app-border bg-app-surface px-4 py-3">
      {title ? (
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
          {title}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {rows.map(({ label, value }, i) => (
          <div key={i}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
              {label}
            </p>
            <div className="mt-0.5 text-xs text-app-text">{value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── TaskBudgetImpactCard ────────────────────────────────────────────────────

export interface BudgetSource {
  resolved_budget_plan_id?: number | null
  resolved_budget_plan_name?: string | null
  resolved_budget_plan_code?: string | null
  resolved_budget_scope?: string | null
  resolved_budget_total_amount?: string | null
  resolved_budget_reserved_amount?: string | null
  resolved_budget_committed_amount?: string | null
  resolved_budget_available_amount?: string | null
  requested_budget_amount?: string | null
  budget_after_request_available_amount?: string | null
  budget_plan_currency?: string | null
}

function safeNum(v: string | null | undefined): number {
  if (v == null) return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function budgetScopeWord(scope: string | null | undefined): string {
  switch (scope) {
    case 'department':
      return 'department'
    case 'site':
      return 'site-level'
    case 'client':
      return 'client-level'
    case 'explicit':
      return 'assigned'
    default:
      return ''
  }
}

export function TaskBudgetImpactCard({
  source,
}: {
  source: BudgetSource
}) {
  const currency = source.budget_plan_currency?.trim() || 'INR'
  const planId = source.resolved_budget_plan_id
  const planName = source.resolved_budget_plan_name?.trim()
  const planCode = source.resolved_budget_plan_code?.trim()
  const scope = source.resolved_budget_scope
  const hasPlan = planId != null || (scope != null && scope !== 'none')

  if (!hasPlan) {
    return (
      <div className="rounded-panel border border-app-border bg-app-muted/60 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
          Budget impact
        </p>
        <p className="mt-2 text-xs text-app-secondary">
          Budget will resolve when workflow starts
        </p>
      </div>
    )
  }

  const planLabel =
    planName && planCode
      ? `${planName} (${planCode})`
      : (planName ?? planCode ?? '—')
  const scopeWord = budgetScopeWord(scope)
  const headerCopy = scopeWord
    ? `Using ${scopeWord} budget: ${planLabel}`
    : planLabel

  const total = safeNum(source.resolved_budget_total_amount)
  const committed = safeNum(source.resolved_budget_committed_amount)
  const reserved = safeNum(source.resolved_budget_reserved_amount)
  const available = safeNum(source.resolved_budget_available_amount)
  const requested = safeNum(source.requested_budget_amount)
  const availableAfter = safeNum(source.budget_after_request_available_amount)

  const pct = (v: number) =>
    total > 0 ? Math.min(100, Math.max(0, (v / total) * 100)) : 0
  const committedPct = pct(committed)
  const reservedPct = pct(reserved)
  const availablePct = pct(available)

  const bodyLine =
    requested > 0 && total > 0
      ? `This request reserves ${formatMoney(requested, currency)} from ${formatMoney(total, currency)}.`
      : null

  const insufficient = requested > 0 && availableAfter < 0

  return (
    <div
      className={cn(
        'rounded-panel border px-4 py-3',
        insufficient
          ? 'border-status-danger/30 bg-status-danger/5'
          : 'border-app-border bg-app-surface',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
          Budget impact
        </p>
        {insufficient ? (
          <Badge variant="danger">Insufficient</Badge>
        ) : requested > 0 ? (
          <Badge variant="attention">Pending reservation</Badge>
        ) : null}
      </div>

      <p
        className="mt-1.5 truncate text-sm font-medium text-app-text"
        title={headerCopy}
      >
        {headerCopy}
      </p>
      {bodyLine ? (
        <p className="mt-0.5 text-xs text-app-secondary">{bodyLine}</p>
      ) : null}

      {/* Segmented progress bar: committed / reserved / available */}
      {total > 0 ? (
        <div className="mt-3">
          <div className="flex h-2 overflow-hidden rounded-full bg-app-muted">
            {committedPct > 0 && (
              <div
                className="bg-status-danger/65 transition-all"
                style={{ width: `${committedPct}%` }}
              />
            )}
            {reservedPct > 0 && (
              <div
                className="bg-status-warning/65 transition-all"
                style={{ width: `${reservedPct}%` }}
              />
            )}
            {availablePct > 0 && (
              <div
                className="bg-status-success/50 transition-all"
                style={{ width: `${availablePct}%` }}
              />
            )}
          </div>

          {/* Legend */}
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-app-subtle">
            {committed > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger/65" />
                Committed {formatMoney(committed, currency)}
              </span>
            )}
            {reserved > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-status-warning/65" />
                Reserved {formatMoney(reserved, currency)}
              </span>
            )}
            {available > 0 && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-status-success/50" />
                Available {formatMoney(available, currency)}
              </span>
            )}
          </div>

          {/* This request + available-after summary */}
          {requested > 0 && (
            <div className="mt-2 space-y-1 border-t border-app-border pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-app-secondary">This request</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    insufficient ? 'text-status-danger' : 'text-app-text',
                  )}
                >
                  {formatMoney(requested, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-app-secondary">Available after</span>
                <span
                  className={cn(
                    'font-semibold tabular-nums',
                    insufficient ? 'text-status-danger' : 'text-status-hired',
                  )}
                >
                  {availableAfter >= 0
                    ? formatMoney(availableAfter, currency)
                    : 'Overdrawn'}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

// ─── ActionNudge ─────────────────────────────────────────────────────────────

export function ActionNudge({ onGoToAction }: { onGoToAction: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-app-border bg-app-muted/60 px-4 py-3">
      <p className="min-w-0 flex-1 text-xs text-app-secondary">
        Review request details, line items, and timeline before approving or
        rejecting.
      </p>
      <Button
        variant="ghost"
        className="h-8 shrink-0 px-3 text-xs"
        onClick={onGoToAction}
      >
        Go to action →
      </Button>
    </div>
  )
}
