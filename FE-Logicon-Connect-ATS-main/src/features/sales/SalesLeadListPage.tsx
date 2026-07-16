import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listSalesLeads } from '@/api/sales'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import {
  ALL_LEAD_TYPES,
  LEAD_TYPE_LABELS,
  STAGE_OPTIONS,
  formatShortDate,
  leadTypeVariant,
  stageLabel,
  stageVariant,
} from '@/features/sales/salesUtils'
import { SalesLeadFormDrawer } from '@/features/sales/SalesLeadFormDrawer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type { SalesLead } from '@/types/sales'

function parsePage(v: string | null): number {
  if (!v) return 1
  const n = Number(v)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

export function SalesLeadListPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.SALES_LEAD_UPDATE])

  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const leadType = params.get('lead_type') ?? ''
  const stage = params.get('stage') ?? ''
  const page = parsePage(params.get('page'))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<SalesLead[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<SalesLead | null>(null)

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.lead_type !== undefined || next.stage !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listSalesLeads({
        search: search || undefined,
        lead_type: leadType || undefined,
        current_stage: stage || undefined,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load sales leads').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, leadType, stage, page])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  // ── Summary tiles ────────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total = count ?? rows.length
    const byType = (t: string) => rows.filter((r) => r.lead_type === t).length
    const won = rows.filter((r) => r.current_stage === 'won').length
    return {
      total,
      new_client: byType('new_client'),
      site_expansion: byType('site_expansion'),
      scope_expansion: byType('scope_expansion'),
      won,
    }
  }, [rows, count])

  function openCreate() {
    setEditing(null)
    setDrawerOpen(true)
  }

  function openEdit(r: SalesLead) {
    setEditing(r)
    setDrawerOpen(true)
  }

  const tiles = [
    { label: 'Total', value: summary.total },
    { label: 'New client', value: summary.new_client },
    { label: 'Site expansion', value: summary.site_expansion },
    { label: 'Scope expansion', value: summary.scope_expansion },
    { label: 'Won', value: summary.won },
  ]

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => navigate(`/sales/leads/${r.id}`)}
          className="w-full rounded-panel border border-app-border bg-app-surface p-4 text-left shadow-panel hover:bg-app-muted"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">{r.client_name}</p>
              {r.existing_client_name ? (
                <p className="truncate text-xs text-app-secondary">{r.existing_client_name}</p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <Badge variant={leadTypeVariant(r.lead_type)}>{LEAD_TYPE_LABELS[r.lead_type]}</Badge>
              <Badge variant={stageVariant(r.current_stage)}>{stageLabel(r.current_stage)}</Badge>
            </div>
          </div>
          <p className="mt-2 text-xs text-app-subtle">{formatShortDate(r.created_at)}</p>
          {r.lead_type === 'renewal' ? (
            <p className="mt-1 text-xs text-app-subtle italic">Renewal conversion not enabled yet</p>
          ) : null}
        </button>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Sales leads</h2>
          <p className="text-sm text-app-secondary">Track client opportunities from first contact to conversion.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start">
            New lead
          </Button>
        ) : null}
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
            <p className="text-2xl font-bold text-app-text">{t.value}</p>
            <p className="mt-1 text-xs text-app-secondary">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
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
                placeholder="Search client name…"
                className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                aria-label="Search sales leads"
              />
            </div>
          </div>
          <Button
            variant="ghost"
            className="min-h-9 shrink-0 px-2 text-sm text-app-secondary"
            onClick={() => setParams(new URLSearchParams())}
            disabled={!search && !leadType && !stage}
          >
            Clear
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            id="sl-lead-type-filter"
            label="Lead type"
            value={leadType}
            onChange={(e) => updateParam({ lead_type: e.target.value || null })}
          >
            <option value="">All types</option>
            {ALL_LEAD_TYPES.map((t) => (
              <option key={t} value={t}>
                {LEAD_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>

          <Select
            id="sl-stage-filter"
            label="Stage"
            value={stage}
            onChange={(e) => updateParam({ stage: e.target.value || null })}
          >
            <option value="">All stages</option>
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <Spinner label="Loading leads…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No sales leads found"
          description={
            search || leadType || stage
              ? 'Try adjusting the filters.'
              : canCreate
                ? 'Create your first lead to get started.'
                : 'No leads have been added yet.'
          }
        />
      ) : (
        <>
          {mobileCards}

          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Client / Lead</TH>
                  <TH className="py-2">Lead type</TH>
                  <TH className="py-2">Stage</TH>
                  <TH className="py-2">Sales owner</TH>
                  <TH className="py-2">Created</TH>
                  <TH className="py-2 text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR
                    key={r.id}
                    className="cursor-pointer hover:bg-app-muted"
                    onClick={() => navigate(`/sales/leads/${r.id}`)}
                  >
                    <TD className="py-2">
                      <p className="truncate text-sm font-medium text-app-text">{r.client_name}</p>
                      {r.existing_client_name ? (
                        <p className="truncate text-xs text-app-subtle">{r.existing_client_name}</p>
                      ) : null}
                    </TD>
                    <TD className="py-2">
                      <div className="flex flex-col gap-1">
                        <Badge variant={leadTypeVariant(r.lead_type)}>{LEAD_TYPE_LABELS[r.lead_type]}</Badge>
                        {r.lead_type === 'renewal' ? (
                          <span className="text-[10px] text-app-subtle italic">Conversion not enabled</span>
                        ) : null}
                      </div>
                    </TD>
                    <TD className="py-2">
                      <Badge variant={stageVariant(r.current_stage)}>{stageLabel(r.current_stage)}</Badge>
                    </TD>
                    <TD className="py-2 text-sm text-app-secondary">
                      {r.sales_person_name ?? (r.sales_person != null ? `#${r.sales_person}` : '—')}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{formatShortDate(r.created_at)}</TD>
                    <TD
                      className="py-2 text-right"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        {canCreate ? (
                          <Button
                            variant="secondary"
                            className="min-h-8 px-3 text-xs"
                            onClick={() => openEdit(r)}
                          >
                            Edit
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          className="min-h-8 px-3 text-xs"
                          onClick={() => navigate(`/sales/leads/${r.id}`)}
                        >
                          Open
                        </Button>
                      </div>
                    </TD>
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
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => updateParam({ page: String(page - 1) })}
                >
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

      <SalesLeadFormDrawer
        open={drawerOpen}
        initialLead={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => void refresh()}
      />
    </div>
  )
}
