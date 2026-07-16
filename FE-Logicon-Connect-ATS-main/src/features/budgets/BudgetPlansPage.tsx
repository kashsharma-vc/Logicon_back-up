import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listBudgetPlans, createBudgetPlan, deleteBudgetPlan, updateBudgetPlan } from '@/api/budgets'
import type { ClientRow } from '@/api/clients'
import type { DepartmentRow } from '@/api/departments'
import type { SiteProfileRow } from '@/api/sites'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { isClientFacingUser } from '@/lib/userRoleMode'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { BudgetPlanForm } from '@/features/budgets/BudgetPlanForm'
import { BudgetStatusBadge } from '@/features/budgets/BudgetStatusBadge'
import {
  BUDGET_NATURE_OPTIONS,
  BUDGET_STATUS_OPTIONS,
  BUDGET_TYPE_OPTIONS,
  budgetAppliesToDisplay,
  budgetNatureLabel,
  budgetTypeLabel,
  formatBudgetPeriod,
  type BudgetPlanRow,
  type BudgetPlanWritePayload,
} from '@/features/budgets/types'
import { formatMoneyAmount } from '@/features/budgets/budgetDisplay'
import { loadAllClients, loadAllDepartments, loadAllSites } from '@/features/budgets/loadPagedLookups'

function parseBoolParam(v: string | null): boolean | undefined {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

function parsePage(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.floor(n)
}

function parseNum(v: string | null): number | undefined {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function PlanAmountBreakdown({ row }: { row: BudgetPlanRow }) {
  const cur = row.currency || 'INR'
  return (
    <div className="space-y-0.5 text-sm">
      <p className="font-medium text-app-text">Total: {formatMoneyAmount(row.amount, cur)}</p>
      <p className="text-xs text-app-secondary">
        Reserved budget: {formatMoneyAmount(row.reserved_amount ?? null, cur)}
      </p>
      <p className="text-xs text-app-secondary">
        Committed budget: {formatMoneyAmount(row.committed_amount ?? null, cur)}
      </p>
      <p className="text-xs text-app-secondary">
        Available budget: {formatMoneyAmount(row.available_amount ?? null, cur)}
      </p>
    </div>
  )
}

export function BudgetPlansPage() {
  const me = useAuthStore((s) => s.me)
  const meCaps = me?.capabilities ?? []
  const isClient = isClientFacingUser(me)
  const canCreate = !isClient && hasAnyCapability(meCaps, [CAP.BUDGET_CREATE])
  const canUpdate = !isClient && hasAnyCapability(meCaps, [CAP.BUDGET_UPDATE])
  const canDelete = !isClient && hasAnyCapability(meCaps, [CAP.BUDGET_DELETE])
  const canReadClients = hasAnyCapability(meCaps, [CAP.CLIENT_READ])
  const canReadSites = hasAnyCapability(meCaps, [CAP.SITE_READ])
  const canReadDepartments = hasAnyCapability(meCaps, [CAP.DEPARTMENT_READ])
  const showClientFilter = !isClient && canReadClients
  const showSiteFilter = canReadSites
  const showDepartmentFilter = !isClient && canReadDepartments

  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const budget_nature = params.get('budget_nature') ?? ''
  const budget_type = params.get('budget_type') ?? ''
  const clientFilter = parseNum(params.get('client'))
  const siteFilter = parseNum(params.get('site'))
  const departmentFilter = parseNum(params.get('department'))
  const statusFilter = params.get('status') ?? ''
  const is_active = parseBoolParam(params.get('is_active'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<BudgetPlanRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])

  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<DepartmentRow[]>([])

  const [sitesLoading, setSitesLoading] = useState(false)
  const [sitesFilterError, setSitesFilterError] = useState<string | null>(null)
  const [sitesFilter, setSitesFilter] = useState<SiteProfileRow[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<BudgetPlanRow | null>(null)
  const [formPresetMode, setFormPresetMode] = useState<'internal_hiring' | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formFields, setFormFields] = useState<Record<string, string>>({})
  const formId = useMemo(() => `budget-form-${drawerMode}`, [drawerMode])

  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [deactivateBusyId, setDeactivateBusyId] = useState<number | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (
      next.search !== undefined ||
      next.budget_nature !== undefined ||
      next.budget_type !== undefined ||
      next.client !== undefined ||
      next.site !== undefined ||
      next.department !== undefined ||
      next.status !== undefined ||
      next.is_active !== undefined
    ) {
      p.delete('page')
    }
    setParams(p)
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listBudgetPlans({
        search: search || undefined,
        budget_nature: budget_nature || undefined,
        budget_type: budget_type || undefined,
        client: showClientFilter ? clientFilter : undefined,
        site: showSiteFilter ? siteFilter : undefined,
        department: showDepartmentFilter ? departmentFilter : undefined,
        status: statusFilter || undefined,
        is_active,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load budgets').message)
    } finally {
      setLoading(false)
    }
  }, [
    search,
    budget_nature,
    budget_type,
    clientFilter,
    showClientFilter,
    siteFilter,
    showSiteFilter,
    departmentFilter,
    showDepartmentFilter,
    statusFilter,
    is_active,
    page,
  ])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!showClientFilter) {
      setClients([])
      setClientsError(null)
      setClientsLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setClientsLoading(true)
      setClientsError(null)
      const res = await loadAllClients()
      if (cancelled) return
      if (res.ok) {
        setClients(res.items)
      } else {
        setClients([])
        setClientsError(res.error)
      }
      setClientsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [showClientFilter])

  useEffect(() => {
    if (!showDepartmentFilter) {
      setDepartments([])
      setDepartmentsError(null)
      setDepartmentsLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setDepartmentsLoading(true)
      setDepartmentsError(null)
      const res = await loadAllDepartments()
      if (cancelled) return
      if (res.ok) {
        setDepartments(res.items)
      } else {
        setDepartments([])
        setDepartmentsError(res.error)
      }
      setDepartmentsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [showDepartmentFilter])

  useEffect(() => {
    if (!showSiteFilter) {
      setSitesFilter([])
      setSitesFilterError(null)
      setSitesLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setSitesLoading(true)
      setSitesFilterError(null)
      const res = await loadAllSites(
        showClientFilter && typeof clientFilter === 'number' ? { client: clientFilter } : undefined,
      )
      if (cancelled) return
      if (res.ok) {
        setSitesFilter(res.items)
      } else {
        setSitesFilter([])
        setSitesFilterError(res.error)
      }
      setSitesLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [clientFilter, showClientFilter, showSiteFilter])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  // Preset detection
  const isInternalHiringPreset = budget_nature === 'non_billable' && budget_type === 'hiring'
  const isBillablePreset = budget_nature === 'billable' && !budget_type
  const isAllPreset = !budget_nature && !budget_type

  function openCreate(presetMode: 'internal_hiring' | null = null) {
    setDrawerMode('create')
    setEditing(null)
    setFormPresetMode(presetMode)
    setFormError(null)
    setFormFields({})
    setDrawerOpen(true)
  }

  function openEdit(row: BudgetPlanRow) {
    setDrawerMode('edit')
    setEditing(row)
    setFormPresetMode(null)
    setFormError(null)
    setFormFields({})
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormPresetMode(null)
    setFormError(null)
    setFormFields({})
  }

  async function submitPayload(payload: BudgetPlanWritePayload) {
    setFormSubmitting(true)
    setFormError(null)
    setFormFields({})
    try {
      if (drawerMode === 'create') {
        await createBudgetPlan(payload)
      } else if (editing) {
        await updateBudgetPlan(editing.id, payload)
      }
      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      const p = parseApiError(e, 'Save failed')
      setFormError(p.message)
      setFormFields(p.fields)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeactivate(row: BudgetPlanRow) {
    if (!canDelete || !row.is_active) return
    if (deactivateId !== row.id) {
      setDeactivateId(row.id)
      setDeactivateError(null)
      return
    }
    setDeactivateBusyId(row.id)
    setDeactivateError(null)
    try {
      await deleteBudgetPlan(row.id)
      setDeactivateId(null)
      await refresh()
    } catch (e: unknown) {
      setDeactivateError(parseApiError(e, 'Deactivate failed').message)
    } finally {
      setDeactivateBusyId(null)
    }
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((r) => (
        <div key={r.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-app-text">{r.name}</p>
              <p className="truncate font-mono text-xs text-app-secondary">{r.code}</p>
            </div>
            <BudgetStatusBadge status={r.status} />
          </div>
          <div className="mt-3 grid gap-1 text-xs text-app-secondary">
            <p>
              <span className="text-app-subtle">Nature:</span> {budgetNatureLabel(r.budget_nature)}
            </p>
            <p>
              <span className="text-app-subtle">Type:</span> {budgetTypeLabel(r.budget_type)}
            </p>
            <p>
              <span className="text-app-subtle">Applies to:</span> {budgetAppliesToDisplay(r)}
            </p>
            <p>
              <span className="text-app-subtle">Period:</span> {formatBudgetPeriod(r.period_start, r.period_end)}
            </p>
            <PlanAmountBreakdown row={r} />
            {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {isClient ? (
              <Button variant="secondary" className="min-h-9 px-3" type="button" onClick={() => navigate(`/budgets/${r.id}`)}>
                View commercials
              </Button>
            ) : null}
            {canUpdate ? (
              <Button variant="secondary" className="min-h-9 px-3" type="button" onClick={() => openEdit(r)}>
                Edit
              </Button>
            ) : null}
            {canDelete && r.is_active ? (
              <Button
                variant="danger"
                className="min-h-9 px-3"
                type="button"
                disabled={deactivateBusyId === r.id}
                onClick={() => void handleDeactivate(r)}
              >
                {deactivateBusyId === r.id
                  ? 'Deactivating...'
                  : deactivateId === r.id
                    ? 'Confirm deactivate'
                    : 'Deactivate'}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Budgets</h2>
          <p className="text-sm text-app-secondary">
            {isClient
              ? 'Approved budgets and their commercial summary.'
              : showDepartmentFilter
                ? 'Allocations by client, site, or department.'
                : 'Allocations by client or site.'}
          </p>
        </div>
        {canCreate ? (
          <Button
            onClick={() => openCreate(isInternalHiringPreset ? 'internal_hiring' : null)}
            className="sm:self-start"
          >
            {isInternalHiringPreset ? 'Create internal budget' : 'Create budget'}
          </Button>
        ) : null}
      </div>

      {deactivateError ? <ErrorState message={deactivateError} /> : null}

      {/* Preset filter buttons */}
      {!isClient ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isInternalHiringPreset ? 'primary' : 'secondary'}
            className="min-h-9 px-3 text-sm"
            onClick={() =>
              updateParam({
                budget_nature: 'non_billable',
                budget_type: 'hiring',
                client: null,
                site: null,
              })
            }
          >
            Internal hiring budgets
          </Button>
          <Button
            variant={isBillablePreset ? 'primary' : 'secondary'}
            className="min-h-9 px-3 text-sm"
            onClick={() =>
              updateParam({
                budget_nature: 'billable',
                budget_type: null,
                department: null,
              })
            }
          >
            Billable budgets
          </Button>
          <Button
            variant={isAllPreset ? 'primary' : 'secondary'}
            className="min-h-9 px-3 text-sm"
            onClick={() =>
              updateParam({
                budget_nature: null,
                budget_type: null,
              })
            }
          >
            All budgets
          </Button>
        </div>
      ) : null}

      <div className="space-y-3 rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Filters</p>
        {showClientFilter && clientsError ? <ErrorState message={`Client lookup failed. ${clientsError}`} /> : null}
        {showDepartmentFilter && departmentsError ? <ErrorState message={`Department lookup failed. ${departmentsError}`} /> : null}
        {showSiteFilter && sitesFilterError ? <ErrorState message={`Site lookup failed. ${sitesFilterError}`} /> : null}
        <div className="relative max-w-xl">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
            <Search className="h-4 w-4" aria-hidden />
          </div>
          <input
            value={search}
            onChange={(e) => updateParam({ search: e.target.value })}
            placeholder="Search name, code"
            className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            aria-label="Search budgets"
          />
        </div>
        {!isClient ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              id="bf-nature"
              label="Nature"
              value={budget_nature}
              onChange={(e) => updateParam({ budget_nature: e.target.value || null })}
            >
              <option value="">All</option>
              {BUDGET_NATURE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              id="bf-type"
              label="Type"
              value={budget_type}
              onChange={(e) => updateParam({ budget_type: e.target.value || null })}
            >
              <option value="">All</option>
              {BUDGET_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              id="bf-status"
              label="Status"
              value={statusFilter}
              onChange={(e) => updateParam({ status: e.target.value || null })}
            >
              <option value="">All</option>
              {BUDGET_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select
              id="bf-active"
              label="Active flag"
              value={typeof is_active === 'boolean' ? String(is_active) : ''}
              onChange={(e) => updateParam({ is_active: e.target.value || null })}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {showClientFilter ? (
            <Select
              id="bf-client"
              label="Client"
              value={typeof clientFilter === 'number' ? String(clientFilter) : ''}
              onChange={(e) =>
                updateParam({
                  client: e.target.value || null,
                  site: null,
                })
              }
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}
          {showSiteFilter ? (
          <Select
            id="bf-site"
            label="Site"
            value={typeof siteFilter === 'number' ? String(siteFilter) : ''}
            onChange={(e) => updateParam({ site: e.target.value || null })}
            disabled={sitesLoading || !!sitesFilterError}
          >
            <option value="">
              {sitesFilterError
                ? 'Sites unavailable'
                : sitesLoading
                  ? 'Loading sites…'
                  : 'All sites'}
            </option>
            {sitesFilter.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
          ) : null}
          {showDepartmentFilter ? (
            <Select
              id="bf-dept"
              label="Department"
              value={typeof departmentFilter === 'number' ? String(departmentFilter) : ''}
              onChange={(e) => updateParam({ department: e.target.value || null })}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </Select>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner label="Loading budgets" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No budget plans" description="Try adjusting filters or create a new budget." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Name / code</TH>
                  <TH className="py-2">Nature</TH>
                  <TH className="py-2">Type</TH>
                  <TH className="py-2">Applies to</TH>
                  <TH className="py-2">Period</TH>
                  <TH className="py-2">Amount</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2 text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="py-2 align-top">
                      <p className="font-semibold text-app-text">{r.name}</p>
                      <p className="font-mono text-xs text-app-secondary">{r.code}</p>
                    </TD>
                    <TD className="py-2 align-top text-sm text-app-secondary">{budgetNatureLabel(r.budget_nature)}</TD>
                    <TD className="py-2 align-top text-sm text-app-secondary">{budgetTypeLabel(r.budget_type)}</TD>
                    <TD className="py-2 align-top text-sm text-app-secondary">{budgetAppliesToDisplay(r)}</TD>
                    <TD className="py-2 align-top font-mono text-xs text-app-secondary">
                      {formatBudgetPeriod(r.period_start, r.period_end)}
                    </TD>
                    <TD className="max-w-[200px] py-2 align-top">
                      <PlanAmountBreakdown row={r} />
                    </TD>
                    <TD className="py-2 align-top">
                      <BudgetStatusBadge status={r.status} />
                    </TD>
                    <TD className="py-2 text-right align-top">
                      <div className="flex justify-end gap-2">
                        {isClient ? (
                          <Button variant="secondary" className="min-h-9 px-3" type="button" onClick={() => navigate(`/budgets/${r.id}`)}>
                            View commercials
                          </Button>
                        ) : null}
                        {canUpdate ? (
                          <Button variant="secondary" className="min-h-9 px-3" type="button" onClick={() => openEdit(r)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete && r.is_active ? (
                          <Button
                            variant="danger"
                            className="min-h-9 px-3"
                            type="button"
                            disabled={deactivateBusyId === r.id}
                            onClick={() => void handleDeactivate(r)}
                          >
                            {deactivateBusyId === r.id
                              ? 'Deactivating...'
                              : deactivateId === r.id
                                ? 'Confirm deactivate'
                                : 'Deactivate'}
                          </Button>
                        ) : null}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-app-subtle">
              {typeof count === 'number' ? `${count} budgets` : `${rows.length} budgets`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="min-h-9 px-3"
                disabled={page <= 1}
                onClick={() => updateParam({ page: String(page - 1) })}
              >
                Prev
              </Button>
              <span className="text-xs text-app-secondary">
                Page {page}
                {totalPages ? ` / ${totalPages}` : ''}
              </span>
              <Button
                variant="secondary"
                className="min-h-9 px-3"
                disabled={typeof totalPages === 'number' ? page >= totalPages : rows.length < 50}
                onClick={() => updateParam({ page: String(page + 1) })}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={
          drawerMode === 'edit'
            ? 'Edit budget plan'
            : formPresetMode === 'internal_hiring'
              ? 'Create internal hiring budget'
              : 'Create budget plan'
        }
        description={
          drawerMode === 'edit'
            ? 'Update allocation details.'
            : formPresetMode === 'internal_hiring'
              ? 'Internal hiring budget for a specific department. Used for non-billable MRF requests.'
              : 'Billable budgets require a client; non-billable require a department.'
        }
      >
        <BudgetPlanForm
          formId={formId}
          mode={drawerMode}
          submitting={formSubmitting}
          serverError={formError}
          serverFields={formFields}
          initial={editing}
          presetMode={formPresetMode}
          clients={clients}
          clientsLoading={clientsLoading}
          clientsError={showClientFilter ? clientsError : null}
          departments={departments}
          departmentsLoading={departmentsLoading}
          departmentsError={showDepartmentFilter ? departmentsError : null}
          onSubmit={submitPayload}
        />
      </Drawer>
    </div>
  )
}
