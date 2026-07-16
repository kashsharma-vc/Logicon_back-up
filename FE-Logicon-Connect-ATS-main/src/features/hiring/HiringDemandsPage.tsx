import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Search, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAllCapabilities } from '@/lib/capabilities'
import { listHiringDemands, type ListHiringDemandsParams } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { ManualResumeIntakeDrawer } from '@/features/talent/ManualResumeIntakeDrawer'
import { ResumePoolDrawer } from '@/features/hiring/ResumePoolDrawer'
import {
  hiringLaneBadgeLabel,
  hiringLaneBadgeVariant,
  isInternalNonBillable,
  hasLaneInfo,
} from '@/features/hiring/hiringLaneLabels'
import type { HiringDemandRow } from '@/features/hiring/types'

type BillingTypeFilter = '' | 'billable' | 'non_billable'
type HiringLaneFilter = '' | 'client_billable' | 'internal_non_billable'

export function HiringDemandsPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canFindFromPool = hasAllCapabilities(meCaps, [CAP.CANDIDATE_READ, CAP.HIRING_APPLICATION_CREATE])
  const canAddNewCandidate = hasAllCapabilities(meCaps, [CAP.CANDIDATE_CREATE, CAP.HIRING_APPLICATION_CREATE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<HiringDemandRow[]>([])
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [poolOpen, setPoolOpen] = useState(false)
  const [selectedDemand, setSelectedDemand] = useState<HiringDemandRow | null>(null)
  const [prefill, setPrefill] = useState<{ mrfId: number; lineId: number } | null>(null)

  // Filters
  const [billingTypeFilter, setBillingTypeFilter] = useState<BillingTypeFilter>('')
  const [hiringLaneFilter, setHiringLaneFilter] = useState<HiringLaneFilter>('')

  const refreshDemands = useCallback(async () => {
    const params: ListHiringDemandsParams = { page: 1 }
    if (billingTypeFilter) params.billing_type = billingTypeFilter
    if (hiringLaneFilter) params.hiring_lane = hiringLaneFilter
    const res = await listHiringDemands(params)
    setRows(res.items)
  }, [billingTypeFilter, hiringLaneFilter])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const params: ListHiringDemandsParams = { page: 1 }
        if (billingTypeFilter) params.billing_type = billingTypeFilter
        if (hiringLaneFilter) params.hiring_lane = hiringLaneFilter
        const res = await listHiringDemands(params)
        if (!cancelled) setRows(res.items)
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load hiring demands').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [billingTypeFilter, hiringLaneFilter])

  function openIntake(d: HiringDemandRow) {
    setPrefill({ mrfId: d.mrf_id, lineId: d.id })
    setIntakeOpen(true)
  }

  function closeIntake() {
    setIntakeOpen(false)
    setPrefill(null)
  }

  function openPool(d: HiringDemandRow) {
    setSelectedDemand(d)
    setPoolOpen(true)
  }

  function closePool() {
    setPoolOpen(false)
    setSelectedDemand(null)
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Open hiring demands</h2>
        <p className="text-sm text-app-secondary">
          Approved manpower requests ready for hiring.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          id="hd_billing_type"
          label="Billing type"
          value={billingTypeFilter}
          onChange={(e) => setBillingTypeFilter(e.target.value as BillingTypeFilter)}
          className="min-w-[140px]"
        >
          <option value="">All billing types</option>
          <option value="billable">Billable</option>
          <option value="non_billable">Non-billable</option>
        </Select>
        <Select
          id="hd_hiring_lane"
          label="Hiring lane"
          value={hiringLaneFilter}
          onChange={(e) => setHiringLaneFilter(e.target.value as HiringLaneFilter)}
          className="min-w-[180px]"
        >
          <option value="">All hiring lanes</option>
          <option value="client_billable">Client Billable</option>
          <option value="internal_non_billable">Internal Non-billable</option>
        </Select>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading hiring demands..." /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No open demands" description="Approved manpower requests will appear here once they are ready for hiring." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-panel border border-app-border bg-app-surface shadow-panel">
          <Table>
            <THead>
              <TR>
                <TH className="py-2">Client / site</TH>
                <TH className="py-2">Lane</TH>
                <TH className="py-2">Job role</TH>
                <TH className="py-2">Requested</TH>
                <TH className="py-2">Shortlisted</TH>
                <TH className="py-2">Selected</TH>
                <TH className="py-2">Offer accepted</TH>
                <TH className="py-2">Open</TH>
                <TH className="py-2 text-right"> </TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((d) => {
                const isInternal = isInternalNonBillable(d)
                return (
                <TR key={d.id}>
                  <TD className="py-2">
                    {isInternal ? (
                      <>
                        <p className="text-sm font-medium text-app-text">
                          {d.required_department_name?.trim() || 'Internal'}
                        </p>
                        {d.resolved_budget_plan_name ? (
                          <p className="text-xs text-app-secondary">{d.resolved_budget_plan_name}</p>
                        ) : null}
                        <p className="font-mono text-[11px] text-app-subtle">Request #{d.mrf_id}</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-app-text">{d.client_name?.trim() || 'Client'}</p>
                        <p className="text-xs text-app-secondary">{d.site_name?.trim() || '-'}</p>
                        <p className="font-mono text-[11px] text-app-subtle">Request #{d.mrf_id}</p>
                      </>
                    )}
                  </TD>
                  <TD className="py-2">
                    {hasLaneInfo(d) ? (
                      <Badge variant={hiringLaneBadgeVariant(d)} className="text-[10px]">
                        {hiringLaneBadgeLabel(d)}
                      </Badge>
                    ) : (
                      <span className="text-xs text-app-subtle">-</span>
                    )}
                  </TD>
                  <TD className="py-2 text-sm">{d.job_role_name ?? `Role #${d.job_role_id}`}</TD>
                  <TD className="py-2 text-xs">{d.requested_headcount}</TD>
                  <TD className="py-2 text-xs">{d.shortlisted_count}</TD>
                  <TD className="py-2 text-xs">{d.selected_count}</TD>
                  <TD className="py-2 text-xs">{d.offer_accepted_count}</TD>
                  <TD className="py-2 text-xs font-medium">{d.open_count}</TD>
                  <TD className="py-2 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Link
                        to={`/hiring/demands/${d.id}`}
                        className="inline-flex items-center gap-1 min-h-8 rounded-panel bg-brand-600 px-3 text-xs font-medium text-white shadow-panel transition-colors hover:bg-brand-700"
                      >
                        <Search className="h-3.5 w-3.5" aria-hidden />
                        Find candidates
                      </Link>
                      {canFindFromPool ? (
                        <Button type="button" variant="secondary" className="min-h-8 gap-1 px-2 text-xs" onClick={() => openPool(d)}>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Quick match from pool
                        </Button>
                      ) : null}
                      {canAddNewCandidate ? (
                        <Button type="button" variant="secondary" className="min-h-8 gap-1 px-2 text-xs" onClick={() => openIntake(d)}>
                          <UserPlus className="h-3.5 w-3.5" aria-hidden />
                          Add new candidate
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              )
              })}
            </TBody>
          </Table>
        </div>
      ) : null}

      <ManualResumeIntakeDrawer
        open={intakeOpen}
        onClose={closeIntake}
        defaultMrfId={prefill?.mrfId}
        defaultMrfLineItemId={prefill?.lineId}
        onSuccess={() => {
          void refreshDemands().catch(() => {
            /* ignore */
          })
        }}
      />

      <ResumePoolDrawer
        open={poolOpen}
        demand={selectedDemand}
        onClose={closePool}
        onLinked={() => {
          void refreshDemands().catch(() => {
            /* ignore */
          })
        }}
      />
    </div>
  )
}
