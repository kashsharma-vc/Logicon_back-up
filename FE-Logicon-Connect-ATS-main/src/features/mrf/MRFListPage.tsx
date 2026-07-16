import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { deleteMRF, listMRFs } from '@/api/mrf'
import { departmentToFormOption, listDepartments, type DepartmentOption, type DepartmentRow } from '@/api/departments'
import { listClients, type ClientRow } from '@/api/clients'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { useAuthStore } from '@/features/auth/authStore'
import { isClientFacingUser } from '@/lib/userRoleMode'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type { SiteOption } from '@/features/mrf/MRFForm'
import { MRFCreateWorkspaceDrawer } from '@/features/mrf/MRFCreateWorkspaceDrawer'
import { MRFStatusBadge } from '@/features/mrf/MRFStatusBadge'
import type { MRFRow, RequestedByType, MRFType, BillingType } from '@/features/mrf/types'
import { budgetReservationStatusLabel, budgetReservationStatusVariant } from '@/features/budgets/budgetDisplay'

function parseNumParam(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}

function parsePage(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.floor(n)
}

function formatMrfDeptSummary(r: MRFRow): { requesting: string; required: string } {
  const requesting =
    r.requesting_department_name?.trim() ||
    (r.requesting_department != null ? `#${r.requesting_department}` : '—')
  const required =
    r.required_department_name?.trim() || (r.required_department != null ? `#${r.required_department}` : '—')
  return { requesting, required }
}

async function loadAllActiveDepartmentOptions(): Promise<DepartmentOption[]> {
  const all: DepartmentRow[] = []
  let page = 1
  while (page <= 40) {
    const res = await listDepartments({ is_active: true, page })
    all.push(...res.items)
    if (res.items.length < 50) break
    page += 1
  }
  return all.map(departmentToFormOption)
}

export function MRFListPage() {
  const me = useAuthStore((s) => s.me)
  const meCaps = me?.capabilities ?? []
  const isClient = isClientFacingUser(me)
  const canCreate = hasAnyCapability(meCaps, [CAP.MRF_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.MRF_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.MRF_DELETE])
  const canReadBudget = hasAnyCapability(meCaps, [CAP.BUDGET_READ])

  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const site = parseNumParam(params.get('site'))
  const client = parseNumParam(params.get('client')) // frontend-only filter
  const requested_by_type = (params.get('requested_by_type') ?? '') as RequestedByType | ''
  const mrf_type = (params.get('mrf_type') ?? '') as MRFType | ''
  const billing_type = (params.get('billing_type') ?? '') as BillingType | ''
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MRFRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)

  const siteOptions: SiteOption[] = useMemo(
    () => sites.map((s) => ({ id: s.id, label: `${s.name} (${s.code})`, client: s.client })),
    [sites],
  )
  const siteById = useMemo(() => new Map(sites.map((s) => [s.id, s])), [sites])
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [workspaceInitialMRF, setWorkspaceInitialMRF] = useState<MRFRow | null>(null)
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null)
  const [deleteBusyId, setDeleteBusyId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (
      next.search !== undefined ||
      next.status !== undefined ||
      next.site !== undefined ||
      next.client !== undefined ||
      next.requested_by_type !== undefined ||
      next.mrf_type !== undefined ||
      next.billing_type !== undefined
    ) {
      p.delete('page')
    }
    setParams(p)
  }

  function clearFilters() {
    setParams(new URLSearchParams())
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listMRFs({
        search: search || undefined,
        status: status || undefined,
        site,
        requested_by_type: requested_by_type || undefined,
        mrf_type: mrf_type || undefined,
        billing_type: billing_type || undefined,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load MRFs').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    setLookupsLoading(true)
    setLookupError(null)
    setDepartmentsLoading(true)
    setDepartmentsError(null)
    try {
      const [s, c] = await Promise.all([listSites({ search: '', page: 1 }), listClients({ search: '', page: 1 })])
      setSites(s.items)
      setClients(c.items)
    } catch (e: unknown) {
      setSites([])
      setClients([])
      setLookupError(parseApiError(e, 'Lookup failed').message)
    } finally {
      setLookupsLoading(false)
    }

    if (isClient) {
      setDepartmentOptions([])
      setDepartmentsLoading(false)
      return
    }

    try {
      const deptOpts = await loadAllActiveDepartmentOptions()
      setDepartmentOptions(deptOpts)
    } catch (e: unknown) {
      setDepartmentOptions([])
      setDepartmentsError(parseApiError(e, 'Department lookup failed').message)
    } finally {
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, site, requested_by_type, mrf_type, billing_type, page])

  useEffect(() => {
    void loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  const visibleRows = useMemo(() => {
    if (!client) return rows
    return rows.filter((r) => {
      const s = siteById.get(r.site)
      return s?.client === client
    })
  }, [rows, client, siteById])

  function openCreate() {
    setWorkspaceInitialMRF(null)
    setWorkspaceOpen(true)
  }

  function openEdit(r: MRFRow) {
    setWorkspaceInitialMRF(r)
    setWorkspaceOpen(true)
  }

  async function handleDelete(r: MRFRow) {
    if (!canDelete) return
    if (deleteCandidateId !== r.id) {
      setDeleteCandidateId(r.id)
      setDeleteError(null)
      return
    }
    setDeleteBusyId(r.id)
    setDeleteError(null)
    try {
      await deleteMRF(r.id)
      setDeleteCandidateId(null)
      await refresh()
    } catch (e: unknown) {
      setDeleteError(parseApiError(e, 'Delete failed').message)
    } finally {
      setDeleteBusyId(null)
    }
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {visibleRows.map((r) => {
        const s = siteById.get(r.site)
        const c = s ? clientById.get(s.client) : undefined
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => navigate(`/mrf/${r.id}`)}
            className="w-full rounded-panel border border-app-border bg-app-surface p-4 text-left shadow-panel hover:bg-app-muted"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-app-text">
                  MRF #{r.id}
                  {r.request_number?.trim() ? (
                    <span className="ml-1 font-mono text-xs font-normal text-app-secondary">({r.request_number})</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-app-secondary">{c ? c.name : '-'}</p>
                <p className="truncate text-xs text-app-subtle">{s ? s.name : `Site #${r.site}`}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <MRFStatusBadge status={r.status} />
                <Badge variant="neutral">{r.line_items?.length ?? 0} items</Badge>
              </div>
            </div>
            <p className="mt-3 text-xs text-app-secondary">{new Date(r.created_at).toLocaleString()}</p>
            {!isClient ? (
              <p className="mt-2 text-xs text-app-subtle">
                <span className="block truncate">Requesting: {formatMrfDeptSummary(r).requesting}</span>
                <span className="block truncate">Required: {formatMrfDeptSummary(r).required}</span>
              </p>
            ) : null}
            <p className="mt-1 text-xs text-app-secondary">
              Budget:{' '}
              {r.budget_plan != null && (r.budget_plan_name || r.budget_plan_code)
                ? `${r.budget_plan_name ?? 'Budget'}${r.budget_plan_code ? ` (${r.budget_plan_code})` : ''}`
                : '—'}
            </p>
            {r.budget_reservation_status != null && r.budget_reservation_status !== '' ? (
              <div className="mt-2">
                <Badge variant={budgetReservationStatusVariant(r.budget_reservation_status)}>
                  {budgetReservationStatusLabel(r.budget_reservation_status)}
                </Badge>
              </div>
            ) : null}
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">MRF</h2>
          <p className="text-sm text-app-secondary">Manpower requests raised for sites, with role line items.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start" disabled={!!lookupError}>
            Create MRF
          </Button>
        ) : null}
      </div>

      {lookupError ? <ErrorState message={`Lookup API failed. Create/Edit is disabled. ${lookupError}`} /> : null}
      {deleteError ? <ErrorState message={deleteError} /> : null}

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
                placeholder={isClient ? 'Search reason' : 'Search department or reason'}
                className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                aria-label="Search MRFs"
              />
            </div>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-sm text-app-secondary"
              onClick={clearFilters}
              disabled={!search && !status && !site && !client && !requested_by_type && !mrf_type && !billing_type}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select id="mrf_status" label="Status" value={status} onChange={(e) => updateParam({ status: e.target.value || null })}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="hr_review">HR review</option>
            <option value="finance_review">Finance review</option>
            <option value="admin_review">Admin review</option>
            <option value="client_review">Client review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>

          <Select
            id="mrf_client"
            label="Client (page filter)"
            value={client ? String(client) : ''}
            onChange={(e) => updateParam({ client: e.target.value || null })}
            disabled={lookupsLoading || !!lookupError}
          >
            <option value="">All</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </Select>

          <Select
            id="mrf_site"
            label="Site"
            value={site ? String(site) : ''}
            onChange={(e) => updateParam({ site: e.target.value || null })}
            disabled={lookupsLoading || !!lookupError}
          >
            <option value="">All</option>
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select
            id="mrf_requested_by_type"
            label="Requested by type"
            value={requested_by_type}
            onChange={(e) => updateParam({ requested_by_type: e.target.value || null })}
          >
            <option value="">All</option>
            <option value="internal">Internal</option>
            <option value="client">Client</option>
          </Select>

          <Select id="mrf_type" label="MRF type" value={mrf_type} onChange={(e) => updateParam({ mrf_type: e.target.value || null })}>
            <option value="">All</option>
            <option value="new_hiring">New hiring</option>
            <option value="replacement">Replacement</option>
            <option value="headcount_increase">Headcount increase</option>
            <option value="rate_revision">Rate revision</option>
          </Select>

          <Select
            id="mrf_billing_type"
            label="Billing type"
            value={billing_type}
            onChange={(e) => updateParam({ billing_type: e.target.value || null })}
          >
            <option value="">All</option>
            <option value="billable">Billable</option>
            <option value="non_billable">Non-billable</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading MRFs..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : visibleRows.length === 0 ? (
        <EmptyState title="No MRFs found" description="Try adjusting filters, or create a new request." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">MRF</TH>
                  <TH className="py-2">Client</TH>
                  <TH className="py-2">Site</TH>
                  {!isClient ? <TH className="py-2">Departments</TH> : null}
                  <TH className="py-2">Budget</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Requested by</TH>
                  <TH className="py-2">Required by</TH>
                  <TH className="py-2">Items</TH>
                  <TH className="py-2 text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {visibleRows.map((r) => {
                  const s = siteById.get(r.site)
                  const c = s ? clientById.get(s.client) : undefined
                  const { requesting, required } = formatMrfDeptSummary(r)
                  return (
                    <TR key={r.id} className="cursor-pointer hover:bg-app-muted" onClick={() => navigate(`/mrf/${r.id}`)}>
                      <TD className="py-2 text-xs text-app-secondary">
                        <span className="font-mono">#{r.id}</span>
                        {r.request_number?.trim() ? (
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-app-subtle">{r.request_number}</span>
                        ) : null}
                      </TD>
                      <TD className="py-2 text-sm text-app-secondary">{c?.name ?? '-'}</TD>
                      <TD className="py-2 text-sm text-app-secondary">{s?.name ?? `Site #${r.site}`}</TD>
                      {!isClient ? (
                        <TD className="max-w-[200px] py-2 text-xs text-app-secondary">
                          <div className="truncate" title={`Requesting: ${requesting}`}>
                            Req: {requesting}
                          </div>
                          <div className="truncate" title={`Required: ${required}`}>
                            Need: {required}
                          </div>
                        </TD>
                      ) : null}
                      <TD className="max-w-[140px] py-2 text-xs text-app-secondary">
                        {r.budget_plan != null && (r.budget_plan_name || r.budget_plan_code) ? (
                          <div className="truncate" title={r.budget_plan_name ?? ''}>
                            {r.budget_plan_name ?? 'Budget'}
                            {r.budget_plan_code ? (
                              <span className="font-mono text-app-subtle"> ({r.budget_plan_code})</span>
                            ) : null}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TD>
                      <TD className="py-2">
                        <MRFStatusBadge status={r.status} />
                      </TD>
                      <TD className="py-2 text-xs text-app-secondary">User #{r.requested_by}</TD>
                      <TD className="py-2 text-xs text-app-secondary">{r.required_by_date || '-'}</TD>
                      <TD className="py-2 text-xs text-app-secondary">{r.line_items?.length ?? 0}</TD>
                      <TD className="py-2 text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          {canUpdate ? (
                            <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)} disabled={!!lookupError}>
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              variant="danger"
                              className="min-h-9 px-3"
                              onClick={() => void handleDelete(r)}
                              disabled={deleteBusyId === r.id}
                            >
                              {deleteBusyId === r.id ? 'Deleting...' : deleteCandidateId === r.id ? 'Confirm delete' : 'Delete'}
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

          {typeof totalPages === 'number' ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-app-secondary">
                Page {page} of {totalPages}
                {client ? <span className="text-app-subtle"> - Client filter applies to this page</span> : null}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => updateParam({ page: String(page - 1) })}>
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  disabled={totalPages ? page >= totalPages : visibleRows.length < 50}
                  onClick={() => updateParam({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {workspaceOpen ? (
        <MRFCreateWorkspaceDrawer
          open={workspaceOpen}
          initialMRF={workspaceInitialMRF}
          onClose={() => {
            setWorkspaceOpen(false)
            setWorkspaceInitialMRF(null)
            void refresh()
          }}
          onFinished={() => {
            void refresh()
          }}
          siteOptions={siteOptions}
          departmentOptions={departmentOptions}
          departmentsLoading={departmentsLoading}
          departmentsError={departmentsError}
          lookupError={lookupError}
          canReadBudget={canReadBudget}
        />
      ) : null}
    </div>
  )
}

