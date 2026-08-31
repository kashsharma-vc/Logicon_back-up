import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listMobilisationSetupRequests } from '@/api/mobilisation'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { NotificationBanner } from '@/features/notifications/NotificationBanner'
import {
  mobilisationFinalizationLabel,
  mobilisationStatusLabel,
  type MobilisationFinalizationStatus,
  type MobilisationSetupRequest,
  type MobilisationStatus,
} from '@/features/mobilisation/types'

function parsePage(v: string | null): number {
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

function statusBadgeVariant(s: MobilisationStatus): 'success' | 'danger' | 'info' | 'attention' | 'neutral' {
  if (s === 'approved') return 'success'
  if (s === 'rejected' || s === 'cancelled') return 'danger'
  if (s === 'setup_completed') return 'success'
  if (s === 'operations_setup') return 'attention'
  if (s === 'submitted') return 'info'
  if (s === 'in_review') return 'attention'
  return 'neutral'
}

function finalizationBadgeVariant(s: MobilisationFinalizationStatus | null | undefined): 'success' | 'danger' | 'neutral' {
  if (s === 'finalized') return 'success'
  if (s === 'failed') return 'danger'
  return 'neutral'
}

function GrandTotalCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-app-subtle">—</span>
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return <span className="tabular-nums">{value}</span>
  return (
    <span className="tabular-nums">
      {n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
    </span>
  )
}

export function MobilisationListPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canRead = hasAnyCapability(meCaps, [CAP.MOBILISATION_READ])

  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const page = parsePage(params.get('page'))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MobilisationSetupRequest[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.status !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listMobilisationSetupRequests({
        search: search || undefined,
        status: status || undefined,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load mobilisation requests').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, page])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  if (!canRead) {
    return <ErrorState message="You do not have permission to view mobilisation requests." />
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => navigate(`/mobilisation/${r.id}`)}
          className="w-full rounded-panel border border-app-border bg-app-surface p-4 text-left shadow-panel hover:bg-app-muted"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">#{r.id}</p>
              {r.source_sales_lead_name ? (
                <p className="truncate text-xs text-app-secondary">{r.source_sales_lead_name}</p>
              ) : null}
              {r.source_proposal_version_number != null ? (
                <p className="truncate text-xs text-app-subtle">
                  Proposal v{r.source_proposal_version_number}
                  {r.source_proposal_grand_total ? (
                    <> · <GrandTotalCell value={r.source_proposal_grand_total} /></>
                  ) : null}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant={statusBadgeVariant(r.status)}>{mobilisationStatusLabel(r.status)}</Badge>
              <Badge variant={finalizationBadgeVariant(r.finalization_status)}>
                {mobilisationFinalizationLabel(r.finalization_status)}
              </Badge>
            </div>
          </div>
          {r.assigned_operations_owner_username ? (
            <p className="mt-2 text-xs text-app-secondary">
              <span className="text-app-subtle">Ops owner:</span> {r.assigned_operations_owner_username}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-app-subtle">{new Date(r.created_at).toLocaleString()}</p>
        </button>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      <NotificationBanner area="mobilisation" />

      <div>
        <h2 className="text-lg font-semibold text-app-text">Mobilisation</h2>
        <p className="text-sm text-app-secondary">Post-win client user setup for portal access and MRFs, sourced from won sales proposals.</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Filters</p>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
                <Search className="h-4 w-4" aria-hidden />
              </div>
              <input
                value={search}
                onChange={(e) => updateParam({ search: e.target.value })}
                placeholder="Search by lead name or summary"
                className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                aria-label="Search mobilisation requests"
              />
            </div>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-sm text-app-secondary"
              onClick={() => setParams(new URLSearchParams())}
              disabled={!search && !status}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="max-w-xs">
          <Select id="mob_status" label="Status" value={status} onChange={(e) => updateParam({ status: e.target.value || null })}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="operations_setup">Operations setup</option>
            <option value="setup_completed">Setup completed</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading mobilisation requests..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No mobilisation requests found"
          description="Mobilisation is created automatically when a sales proposal is converted after client approval."
        />
      ) : (
        <>
          {mobileCards}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">ID</TH>
                  <TH className="py-2">Lead</TH>
                  <TH className="py-2">Proposal</TH>
                  <TH className="py-2">Grand total</TH>
                  <TH className="py-2">Ops owner</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Finalization</TH>
                  <TH className="py-2">Created</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR
                    key={r.id}
                    className="cursor-pointer hover:bg-app-muted"
                    onClick={() => navigate(`/mobilisation/${r.id}`)}
                  >
                    <TD className="py-2 font-mono text-xs text-app-secondary">#{r.id}</TD>
                    <TD className="py-2 text-sm text-app-text">
                      {r.source_sales_lead_name?.trim() || <span className="text-app-subtle">—</span>}
                      {r.source_sales_lead != null ? (
                        <span className="ml-1 font-mono text-xs text-app-subtle">(#{r.source_sales_lead})</span>
                      ) : null}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {r.source_proposal_version_number != null
                        ? `v${r.source_proposal_version_number}`
                        : <span className="text-app-subtle">—</span>}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      <GrandTotalCell value={r.source_proposal_grand_total} />
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {r.assigned_operations_owner_username ?? <span className="text-app-subtle">—</span>}
                    </TD>
                    <TD className="py-2">
                      <Badge variant={statusBadgeVariant(r.status)}>{mobilisationStatusLabel(r.status)}</Badge>
                    </TD>
                    <TD className="py-2">
                      <Badge variant={finalizationBadgeVariant(r.finalization_status)}>
                        {mobilisationFinalizationLabel(r.finalization_status)}
                      </Badge>
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{new Date(r.created_at).toLocaleString()}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {typeof totalPages === 'number' ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-app-secondary">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => updateParam({ page: String(page - 1) })}>
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  disabled={totalPages ? page >= totalPages : rows.length < 50}
                  onClick={() => updateParam({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
