import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  listSiteRoleRequirements,
  createSiteRoleRequirement,
  updateSiteRoleRequirement,
  deactivateSiteRoleRequirement,
  type SiteRoleRequirementRow,
} from '@/api/siteRoleRequirements'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { listWageCategories, type WageCategoryRow } from '@/api/wages'
import { useAuthStore } from '@/features/auth/authStore'
import { isClientFacingUser } from '@/lib/userRoleMode'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { SiteRoleRequirementForm, type Option, type SiteRoleRequirementFormValues } from '@/features/siteRoleRequirements/SiteRoleRequirementForm'

function parseBoolParam(v: string | null): boolean | undefined {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

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

function toNumberOrNull(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n
}

function fmtHeadcount(v: number | null | undefined): string {
  return v == null ? '—' : String(v)
}

function CompactSelect({
  value,
  onChange,
  disabled,
  ariaLabel,
  children,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  ariaLabel: string
  children: React.ReactNode
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60"
    >
      {children}
    </select>
  )
}

export function SiteRoleRequirementsPage() {
  const me = useAuthStore((s) => s.me)
  const meCaps = me?.capabilities ?? []
  const isClient = isClientFacingUser(me)
  const canCreate = !isClient && hasAnyCapability(meCaps, [CAP.SITE_ROLE_REQUIREMENT_CREATE])
  const canUpdate = !isClient && hasAnyCapability(meCaps, [CAP.SITE_ROLE_REQUIREMENT_UPDATE])
  const canDelete = !isClient && hasAnyCapability(meCaps, [CAP.SITE_ROLE_REQUIREMENT_DELETE])
  const canLookupWage = hasAnyCapability(meCaps, [CAP.WAGE_READ])

  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const site = parseNumParam(params.get('site'))
  const job_role = parseNumParam(params.get('job_role'))
  const is_active = parseBoolParam(params.get('is_active'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<SiteRoleRequirementRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [wageCategories, setWageCategories] = useState<WageCategoryRow[]>([])

  const siteOptions: Option[] = useMemo(
    () => sites.map((s) => ({ id: s.id, label: `${s.name} (${s.code})` })),
    [sites],
  )
  const roleOptions: Option[] = useMemo(
    () => jobRoles.map((r) => ({ id: r.id, label: `${r.name} (${r.code})` })),
    [jobRoles],
  )
  const wageOptions: Option[] = useMemo(
    () => wageCategories.map((w) => ({ id: w.id, label: `${w.name} (${w.code})` })),
    [wageCategories],
  )

  const siteLabel = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites])
  const roleLabel = useMemo(() => new Map(jobRoles.map((r) => [r.id, r.name])), [jobRoles])
  const wageLabel = useMemo(() => new Map(wageCategories.map((w) => [w.id, w.name])), [wageCategories])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<SiteRoleRequirementRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => `srr-form-${drawerMode}`, [drawerMode])

  const [deactivateId, setDeactivateId] = useState<number | null>(null)
  const [deactivateBusyId, setDeactivateBusyId] = useState<number | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.site !== undefined || next.job_role !== undefined || next.is_active !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listSiteRoleRequirements({ search: search || undefined, site, job_role, is_active, page })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load site role requirements').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    setLookupsLoading(true)
    setLookupError(null)
    try {
      // Note: endpoints may be large; start with first page for now.
      // Client users only need site/role labels for filters; wage categories are an
      // internal master they have no access to, so skip that call for them.
      if (isClient) {
        const [s, r] = await Promise.all([listSites({ search: '', page: 1 }), listJobRoles()])
        setSites(s.items)
        setJobRoles(r)
        setWageCategories([])
      } else {
        const [s, r, w] = await Promise.all([listSites({ search: '', page: 1 }), listJobRoles(), listWageCategories()])
        setSites(s.items)
        setJobRoles(r)
        setWageCategories(w)
      }
    } catch (e: unknown) {
      setSites([])
      setJobRoles([])
      setWageCategories([])
      setLookupError(parseApiError(e, 'Lookup API failed').message)
    } finally {
      setLookupsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, site, job_role, is_active, page])

  useEffect(() => {
    void loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  function openCreate() {
    setDrawerMode('create')
    setEditing(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(r: SiteRoleRequirementRow) {
    setDrawerMode('edit')
    setEditing(r)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function submit(values: SiteRoleRequirementFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        site: Number(values.site),
        job_role: Number(values.job_role),
        approved_headcount: Number(values.approved_headcount),
        billing_type: values.billing_type,
        billing_rate: toNumberOrNull(values.billing_rate),
        wage_min: toNumberOrNull(values.wage_min),
        wage_max: toNumberOrNull(values.wage_max),
        shift_hours: toNumberOrNull(values.shift_hours),
        wage_category: values.wage_category ? Number(values.wage_category) : null,
        effective_from: values.effective_from,
        effective_to: values.effective_to || null,
        is_active: values.is_active,
      }

      if (drawerMode === 'create') {
        await createSiteRoleRequirement(payload)
      } else if (editing) {
        await updateSiteRoleRequirement(editing.id, payload)
      }

      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeactivate(r: SiteRoleRequirementRow) {
    if (!canDelete) return
    if (deactivateId !== r.id) {
      setDeactivateId(r.id)
      setDeactivateError(null)
      return
    }
    setDeactivateBusyId(r.id)
    setDeactivateError(null)
    try {
      await deactivateSiteRoleRequirement(r.id)
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
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">
                {siteLabel.get(r.site) ?? `Site #${r.site}`}
              </p>
              <p className="truncate text-xs text-app-secondary">
                {roleLabel.get(r.job_role) ?? `Job role #${r.job_role}`}
              </p>
            </div>
            {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
          </div>

          <dl className="mt-3 grid gap-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Approved</dt>
              <dd className="font-semibold text-app-text">{fmtHeadcount(r.approved_headcount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Allocated</dt>
              <dd className="font-medium text-app-text">{fmtHeadcount(r.allocated_headcount)}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Remaining</dt>
              <dd className="font-semibold text-app-text">{fmtHeadcount(r.remaining_headcount)}</dd>
            </div>
            {!isClient ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-subtle">Billing</dt>
                  <dd className="font-medium text-app-text">
                    {r.billing_type}
                    {r.billing_rate ? <span className="text-app-secondary"> · {r.billing_rate}</span> : null}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-subtle">Wage</dt>
                  <dd className="font-medium text-app-text">
                    {r.wage_min || r.wage_max ? `${r.wage_min ?? '—'} - ${r.wage_max ?? '—'}` : '—'}
                  </dd>
                </div>
                {r.wage_rate != null ? (
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-app-subtle">Matched wage rate</dt>
                    <dd className="max-w-[60%] text-right text-xs text-app-secondary">
                      #{r.wage_rate}
                      {r.wage_rate_monthly_snapshot ? ` · ${r.wage_rate_monthly_snapshot}/mo` : ''}
                      {r.wage_rate_source_snapshot ? ` · ${r.wage_rate_source_snapshot}` : ''}
                    </dd>
                  </div>
                ) : null}
                {r.wage_category ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-app-subtle">Category</dt>
                    <dd className="text-app-secondary">
                      {wageLabel.get(r.wage_category) ?? `#${r.wage_category}`}
                    </dd>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Effective</dt>
              <dd className="font-mono text-app-secondary">
                {r.effective_from}
                {r.effective_to ? ` → ${r.effective_to}` : ''}
              </dd>
            </div>
          </dl>

          {canUpdate || canDelete ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {canUpdate ? (
                <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)}>
                  Edit
                </Button>
              ) : null}
              {canDelete ? (
                <Button
                  variant="danger"
                  className="min-h-9 px-3"
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
          ) : null}
        </div>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Site role requirements</h2>
          <p className="text-sm text-app-secondary">Approved headcount and commercials per job role per site.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start" disabled={!!lookupError}>
            Create requirement
          </Button>
        ) : null}
      </div>

      {lookupError ? <ErrorState message={`Lookup API failed. Create/Edit is disabled. ${lookupError}`} /> : null}
      {deactivateError ? <ErrorState message={deactivateError} /> : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Filters</p>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
              <Search className="h-4 w-4" aria-hidden />
            </div>
            <input
              value={search}
              onChange={(e) => updateParam({ search: e.target.value })}
              placeholder="Search by site or job role"
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search by site or job role"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
          <div>
            <p className="mb-1 text-xs font-medium text-app-subtle">Site</p>
            <CompactSelect
              ariaLabel="Filter by site"
              value={site ? String(site) : ''}
              onChange={(v) => updateParam({ site: v || null })}
              disabled={lookupsLoading || !!lookupError}
            >
              <option value="">All</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </CompactSelect>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-app-subtle">Job role</p>
            <CompactSelect
              ariaLabel="Filter by job role"
              value={job_role ? String(job_role) : ''}
              onChange={(v) => updateParam({ job_role: v || null })}
              disabled={lookupsLoading || !!lookupError}
            >
              <option value="">All</option>
              {jobRoles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </CompactSelect>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-app-subtle">Status</p>
            <CompactSelect
              ariaLabel="Filter by status"
              value={typeof is_active === 'boolean' ? String(is_active) : ''}
              onChange={(v) => updateParam({ is_active: v || null })}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </CompactSelect>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner label="Loading requirements" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No requirements found" description="Try adjusting search or filters." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Site</TH>
                  <TH>Job role</TH>
                  <TH>Approved</TH>
                  <TH>Allocated</TH>
                  <TH>Remaining</TH>
                  {!isClient ? <TH>Billing</TH> : null}
                  {!isClient ? <TH>Wage</TH> : null}
                  <TH>Effective</TH>
                  <TH>Status</TH>
                  {!isClient ? <TH className="text-right">Actions</TH> : null}
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="text-app-text">{siteLabel.get(r.site) ?? `Site #${r.site}`}</TD>
                    <TD className="text-app-text">{roleLabel.get(r.job_role) ?? `Job role #${r.job_role}`}</TD>
                    <TD className="text-app-secondary">{fmtHeadcount(r.approved_headcount)}</TD>
                    <TD className="text-app-secondary">{fmtHeadcount(r.allocated_headcount)}</TD>
                    <TD className="font-semibold text-app-text">{fmtHeadcount(r.remaining_headcount)}</TD>
                    {!isClient ? (
                      <TD className="text-app-secondary">{r.billing_type}{r.billing_rate ? ` - ${r.billing_rate}` : ''}</TD>
                    ) : null}
                    {!isClient ? (
                      <TD className="text-app-secondary">
                        {r.wage_min || r.wage_max ? `${r.wage_min ?? '-'} - ${r.wage_max ?? '-'}` : '-'}
                        {r.wage_category ? <div className="text-xs text-app-subtle">{wageLabel.get(r.wage_category) ?? `#${r.wage_category}`}</div> : null}
                        {r.wage_rate != null ? (
                          <div className="mt-1 text-xs text-app-subtle">
                            Rate #{r.wage_rate}
                            {r.wage_rate_monthly_snapshot ? ` · ${r.wage_rate_monthly_snapshot}/mo` : ''}
                            {r.wage_rate_effective_from_snapshot ? ` · from ${r.wage_rate_effective_from_snapshot}` : ''}
                          </div>
                        ) : null}
                      </TD>
                    ) : null}
                    <TD className="text-app-secondary">
                      {r.effective_from}
                      {r.effective_to ? ` -> ${r.effective_to}` : ''}
                    </TD>
                    <TD>{r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}</TD>
                    {!isClient ? (
                      <TD className="text-right">
                        <div className="flex justify-end gap-2">
                          {canUpdate ? (
                            <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)}>
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              variant="danger"
                              className="min-h-9 px-3"
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
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-app-subtle">{typeof count === 'number' ? `${count} requirements` : `${rows.length} requirements`}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="min-h-9 px-3" disabled={page <= 1} onClick={() => updateParam({ page: String(page - 1) })}>
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
        title={drawerMode === 'create' ? 'Create requirement' : 'Edit requirement'}
        description={drawerMode === 'create' ? 'Create a new site role requirement.' : 'Update requirement details.'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={formSubmitting || !!lookupError}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        {lookupsLoading ? <p className="text-xs text-app-subtle">Loading lookups...</p> : null}
        <SiteRoleRequirementForm
          key={`${drawerMode}-${editing?.id ?? 'new'}`}
          formId={formId}
          submitting={formSubmitting}
          errorMessage={formError}
          lookupError={lookupError}
          canLookupWage={canLookupWage}
          siteOptions={siteOptions}
          jobRoleOptions={roleOptions}
          wageCategoryOptions={wageOptions}
          initialValues={
            drawerMode === 'edit' && editing
              ? {
                  site: String(editing.site),
                  job_role: String(editing.job_role),
                  approved_headcount: String(editing.approved_headcount),
                  billing_type: editing.billing_type,
                  billing_rate: editing.billing_rate ?? '',
                  wage_min: editing.wage_min ?? '',
                  wage_max: editing.wage_max ?? '',
                  shift_hours: editing.shift_hours ?? '',
                  wage_category: editing.wage_category ? String(editing.wage_category) : '',
                  effective_from: editing.effective_from,
                  effective_to: editing.effective_to ?? '',
                  is_active: editing.is_active,
                }
              : undefined
          }
          onSubmit={submit}
        />
      </Drawer>
    </div>
  )
}



