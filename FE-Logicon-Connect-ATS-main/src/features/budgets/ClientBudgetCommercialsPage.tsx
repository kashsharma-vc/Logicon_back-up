import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Banknote, Layers, Users } from 'lucide-react'
import { getBudgetClientCommercials, type BudgetClientCommercials } from '@/api/budgets'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { getBreakupComponentStyle, getBreakupRoleBandStyle } from '@/features/sales/salesBreakupGrouping'
import { buildBudgetRoleGroups } from '@/features/budgets/budgetCommercialGrouping'

type TabId = 'overview' | 'budget-lines' | 'salary-breakup'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget-lines', label: 'Budget Lines' },
  { id: 'salary-breakup', label: 'Salary Breakup' },
]

function formatNumber(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (!Number.isFinite(num)) return '—'
  const parts = num.toFixed(2).split('.')
  const intPart = parts[0] ?? '0'
  const decPart = parts[1] ?? '00'
  const sign = intPart.startsWith('-') ? '-' : ''
  const digits = sign ? intPart.slice(1) : intPart
  const lastThree = digits.slice(-3)
  const rest = digits.slice(0, -3)
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (rest ? ',' : '') + lastThree
  const body = decPart === '00' ? formatted : `${formatted}.${decPart}`
  return `${sign}${body}`
}

function moneyFormatter(currency: string) {
  const prefix = currency === 'INR' ? '₹' : `${currency} `
  return (value: string | number | null | undefined): string => {
    const formatted = formatNumber(value)
    return formatted === '—' ? '—' : `${prefix}${formatted}`
  }
}

function formatPeriod(start: string | null, end: string | null): string {
  const s = start ? start.slice(0, 10) : '—'
  const e = end ? end.slice(0, 10) : '—'
  return `${s} → ${e}`
}

export function ClientBudgetCommercialsPage() {
  const { id } = useParams<{ id: string }>()
  const planId = Number(id)
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<BudgetClientCommercials | null>(null)
  const [tab, setTab] = useState<TabId>('overview')

  const load = useCallback(async (budgetId: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await getBudgetClientCommercials(budgetId)
      setData(res)
    } catch (e: unknown) {
      setData(null)
      setError(parseApiError(e, 'Failed to load approved budget').message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (Number.isFinite(planId)) {
      void load(planId)
    }
  }, [planId, load])

  const currency = data?.budget.currency ?? 'INR'
  const money = useMemo(() => moneyFormatter(currency), [currency])

  const roleGroups = useMemo(
    () => (data ? buildBudgetRoleGroups(data.breakup_lines, data.budget_lines) : []),
    [data],
  )

  function overviewTab() {
    if (!data) return null
    const { budget, proposal } = data

    const cards = [
      {
        label: 'Total manpower',
        value: proposal?.manpower_total != null ? String(proposal.manpower_total) : '—',
        icon: Users,
        highlight: false,
      },
      { label: 'Subtotal', value: money(proposal?.subtotal_amount), icon: Banknote, highlight: false },
      { label: 'Management fee', value: money(proposal?.management_fee_amount), icon: Banknote, highlight: false },
      { label: 'GST', value: money(proposal?.gst_amount), icon: Banknote, highlight: false },
      { label: 'Grand total', value: money(proposal?.grand_total), icon: Banknote, highlight: true },
      { label: 'Budget amount', value: money(budget.amount), icon: Banknote, highlight: true },
    ]

    const utilization = [
      { label: 'Budget amount', value: money(budget.amount), highlight: true },
      { label: 'Reserved', value: money(budget.reserved_amount) },
      { label: 'Committed', value: money(budget.committed_amount) },
      { label: 'Available', value: money(budget.available_amount), highlight: true },
    ]

    return (
      <div className="space-y-6">
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <Banknote className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Budget utilization</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {utilization.map(({ label, value, highlight }) => (
              <div
                key={label}
                className={cn(
                  'rounded-xl border p-4 shadow-sm transition-all hover:shadow-md',
                  highlight
                    ? 'border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:border-brand-800 dark:from-brand-900/20 dark:to-brand-900/10'
                    : 'border-app-border bg-app-surface',
                )}
              >
                <p
                  className={cn(
                    'truncate text-lg font-bold',
                    highlight ? 'text-brand-700 dark:text-brand-400' : 'text-app-text',
                  )}
                >
                  {value}
                </p>
                <p
                  className={cn(
                    'mt-1 text-xs',
                    highlight ? 'text-brand-600/70 dark:text-brand-500/70' : 'text-app-subtle',
                  )}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <Banknote className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Commercial summary</h3>
          </div>
          {!proposal ? (
            <EmptyState
              title="No commercial proposal linked"
              description="Detailed commercial proposal is not linked to this budget."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {cards.map(({ label, value, icon: Icon, highlight }) => (
                <div
                  key={label}
                  className={cn(
                    'rounded-xl border p-4 shadow-sm transition-all hover:shadow-md',
                    highlight
                      ? 'border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:border-brand-800 dark:from-brand-900/20 dark:to-brand-900/10'
                      : 'border-app-border bg-app-surface',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'truncate text-lg font-bold',
                          highlight ? 'text-brand-700 dark:text-brand-400' : 'text-app-text',
                        )}
                      >
                        {value}
                      </p>
                      <p
                        className={cn(
                          'mt-1 text-xs',
                          highlight ? 'text-brand-600/70 dark:text-brand-500/70' : 'text-app-subtle',
                        )}
                      >
                        {label}
                      </p>
                    </div>
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        highlight ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-500/10 text-slate-500',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <Layers className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Budget details</h3>
          </div>
          <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {budget.client_name ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-app-subtle">Client</dt>
                  <dd className="mt-0.5 font-medium text-app-text">{budget.client_name}</dd>
                </div>
              ) : null}
              {budget.site_name ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-app-subtle">Site</dt>
                  <dd className="mt-0.5 font-medium text-app-text">{budget.site_name}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-subtle">Period</dt>
                <dd className="mt-0.5 font-medium text-app-text">
                  {formatPeriod(budget.period_start, budget.period_end)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-app-subtle">Budget amount</dt>
                <dd className="mt-0.5 font-medium text-app-text">{money(budget.amount)}</dd>
              </div>
              {proposal?.validity_days != null ? (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-app-subtle">Validity</dt>
                  <dd className="mt-0.5 font-medium text-app-text">{proposal.validity_days} days</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      </div>
    )
  }

  function budgetLinesTab() {
    if (!data) return null
    if (data.budget_lines.length === 0) {
      return <EmptyState title="No budget lines" description="This approved budget has no manpower lines." />
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <THead>
            <TR>
              <TH className="py-2">Role / service</TH>
              <TH className="py-2">Site</TH>
              <TH className="py-2 text-right">Manpower</TH>
              <TH className="py-2 text-right">Unit monthly cost</TH>
              <TH className="py-2 text-right">Total monthly cost</TH>
            </TR>
          </THead>
          <TBody>
            {data.budget_lines.map((line) => (
              <TR key={line.id}>
                <TD className="py-2 align-top">
                  <p className="text-sm font-medium text-app-text">
                    {line.job_role_name ?? line.description ?? '—'}
                  </p>
                  {line.service_category ? (
                    <p className="text-xs text-app-secondary">{line.service_category}</p>
                  ) : null}
                </TD>
                <TD className="py-2 align-top text-sm text-app-secondary">{line.site_name ?? '—'}</TD>
                <TD className="py-2 align-top text-right text-sm text-app-secondary">{line.manpower_count ?? '—'}</TD>
                <TD className="py-2 align-top text-right text-sm text-app-secondary">{money(line.unit_cost)}</TD>
                <TD className="py-2 align-top text-right text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {money(line.total_cost)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    )
  }

  function salaryBreakupTab() {
    if (!data) return null
    if (data.breakup_lines.length === 0) {
      return (
        <EmptyState
          title="No salary breakup"
          description="A salary breakup is not available for this approved budget."
        />
      )
    }

    return (
      <div className="space-y-5">
        <p className="text-xs text-app-subtle">
          {roleGroups.length} role{roleGroups.length !== 1 ? 's' : ''} · {data.breakup_lines.length} component
          {data.breakup_lines.length !== 1 ? 's' : ''}
        </p>

        <div className="space-y-6">
          {roleGroups.map((roleGroup, roleIndex) => {
            const band = getBreakupRoleBandStyle(roleIndex, roleGroup.groupKey)
            const metaParts: string[] = []
            if (roleGroup.siteName) metaParts.push(`Site: ${roleGroup.siteName}`)
            if (roleGroup.headcount != null) metaParts.push(`Headcount: ${roleGroup.headcount}`)
            if (roleGroup.totalCost != null) {
              metaParts.push(`Budget total: ${money(roleGroup.totalCost)}`)
            } else if (roleGroup.unitCost != null) {
              metaParts.push(`Unit cost: ${money(roleGroup.unitCost)}`)
            }

            return (
              <section
                key={roleGroup.groupKey}
                className={cn('overflow-hidden rounded-xl border border-l-4 shadow-sm', band.border, band.borderAccent)}
              >
                <div className={cn('border-b px-4 py-3.5', band.headerBorder, band.headerBg)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', band.iconBg)}>
                        <Users className={cn('h-5 w-5', band.iconText)} aria-hidden />
                      </div>
                      <div className="min-w-0">
                        <h3 className={cn('text-base font-semibold', band.titleText)}>{roleGroup.title}</h3>
                        {metaParts.length > 0 ? (
                          <p className={cn('mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs', band.metaText)}>
                            {metaParts.map((part) => (
                              <span key={part}>{part}</span>
                            ))}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-lg border border-app-border/60 bg-app-surface/80 px-3 py-2 text-left sm:text-right dark:bg-app-surface/40">
                      <p className={cn('text-base font-bold tabular-nums', band.totalText)}>
                        {money(roleGroup.total)}
                      </p>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-app-subtle">Role total</p>
                    </div>
                  </div>
                </div>

                <div className={cn('divide-y divide-app-border/80', band.bodyBg)}>
                  {roleGroup.sections.map((section) => {
                    const style = getBreakupComponentStyle(section.componentType)
                    return (
                      <div key={`${roleGroup.groupKey}-${section.componentType}`}>
                        <div
                          className={cn(
                            'flex items-center justify-between border-b px-4 py-2.5 bg-app-muted/30',
                            style.border,
                          )}
                        >
                          <h4 className={cn('text-xs font-semibold uppercase tracking-wider', style.text)}>
                            {section.label}
                          </h4>
                          <p className={cn('text-sm font-semibold', style.text)}>{money(section.total)}</p>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <THead>
                              <TR className="bg-slate-50/50 dark:bg-slate-800/30">
                                <TH className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">
                                  Component
                                </TH>
                                <TH className="w-28 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-app-subtle">
                                  Percentage
                                </TH>
                                <TH className="w-32 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-app-subtle">
                                  Amount
                                </TH>
                              </TR>
                            </THead>
                            <TBody>
                              {section.rows.map((row, idx) => (
                                <TR
                                  key={row.id}
                                  className={cn(
                                    'transition-colors hover:bg-app-muted/50',
                                    idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/10',
                                  )}
                                >
                                  <TD className="px-4 py-2.5">
                                    <p className="text-sm font-medium text-app-text">{row.component_name ?? '—'}</p>
                                  </TD>
                                  <TD className="px-4 py-2.5 text-right">
                                    {row.percentage != null && row.percentage !== '' ? (
                                      <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                                        {row.percentage}%
                                      </span>
                                    ) : (
                                      <span className="text-sm text-app-subtle">—</span>
                                    )}
                                  </TD>
                                  <TD className="px-4 py-2.5 text-right">
                                    <span className={cn('text-sm font-semibold', style.text)}>{money(row.amount)}</span>
                                  </TD>
                                </TR>
                              ))}
                            </TBody>
                          </Table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-5">
      <div>
        <Button
          variant="ghost"
          className="min-h-9 px-2 text-sm text-app-secondary"
          onClick={() => navigate('/budgets')}
        >
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          Approved budgets
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner label="Loading approved budget" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => void load(planId)}>
            Retry
          </Button>
        </div>
      ) : !data ? (
        <EmptyState
          title="Approved budget not found"
          description="This budget may not be available."
        />
      ) : (
        <>
          <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">Approved budget</p>
                <h2 className="mt-1 truncate text-lg font-semibold text-app-text">{data.budget.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-app-secondary">
                  {data.budget.code ? <Badge variant="neutral">{data.budget.code}</Badge> : null}
                  {data.budget.client_name ? <span>{data.budget.client_name}</span> : null}
                  {data.budget.site_name ? <span>· {data.budget.site_name}</span> : null}
                  <span>· {formatPeriod(data.budget.period_start, data.budget.period_end)}</span>
                </div>
              </div>
              <div className="shrink-0 rounded-lg border border-app-border bg-app-muted/40 px-4 py-2 text-left sm:text-right">
                <p className="text-lg font-bold text-app-text">{money(data.budget.amount)}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-app-subtle">Budget amount</p>
              </div>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto border-b border-app-border">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  '-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-app-secondary hover:text-app-text',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="min-h-40 rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
            {tab === 'overview' && overviewTab()}
            {tab === 'budget-lines' && budgetLinesTab()}
            {tab === 'salary-breakup' && salaryBreakupTab()}
          </div>
        </>
      )}

      <p className="text-xs text-app-subtle">
        Need the full list?{' '}
        <Link to="/budgets" className="text-brand-600 hover:underline">
          Back to approved budgets
        </Link>
      </p>
    </div>
  )
}
