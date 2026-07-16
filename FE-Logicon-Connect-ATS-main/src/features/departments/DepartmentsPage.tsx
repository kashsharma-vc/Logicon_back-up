/**
 * Departments Page - CRUD for organization, client, and site-level departments.
 */
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, MapPin, Search, X } from 'lucide-react'
import {
  listDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type DepartmentRow,
  type DepartmentWriteInput,
} from '@/api/departments'
import { listClients, type ClientRow } from '@/api/clients'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'

type ScopeFilter = 'all' | 'org' | 'client' | 'site'

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

function getScopeLevel(row: DepartmentRow): 'org' | 'client' | 'site' {
  if (row.site != null) return 'site'
  if (row.client != null) return 'client'
  return 'org'
}

function getScopeBadge(row: DepartmentRow) {
  const level = getScopeLevel(row)
  switch (level) {
    case 'site':
      return <Badge variant="info">Site</Badge>
    case 'client':
      return <Badge variant="warning">Client</Badge>
    default:
      return <Badge variant="neutral">Org</Badge>
  }
}

interface DepartmentFormValues {
  scope: 'org' | 'client' | 'site'
  client: string
  site: string
  name: string
  code: string
  description: string
  is_active: boolean
}

const FORM_DEFAULTS: DepartmentFormValues = {
  scope: 'site',
  client: '',
  site: '',
  name: '',
  code: '',
  description: '',
  is_active: true,
}

export function DepartmentsPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.DEPARTMENT_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.DEPARTMENT_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.DEPARTMENT_DELETE])

  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const scopeFilter = (params.get('scope') as ScopeFilter) || 'all'
  const is_active = parseBoolParam(params.get('is_active'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [rows, setRows] = useState<DepartmentRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  // Lookup data
  const [clients, setClients] = useState<ClientRow[]>([])
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(false)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<DepartmentRow | null>(null)
  const [form, setForm] = useState<DepartmentFormValues>(FORM_DEFAULTS)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Inline deactivate confirmation
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null)
  const [deactivating, setDeactivating] = useState(false)

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.scope !== undefined || next.is_active !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listDepartments({
        search: search || undefined,
        is_active,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load departments').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    setLookupsLoading(true)
    try {
      const [clientsRes, sitesRes] = await Promise.all([
        listClients({ is_active: true }),
        listSites({ is_active: true }),
      ])
      setClients(clientsRes.items)
      setSites(sitesRes.items)
    } catch {
      // Silently fail - lookups will be empty
    } finally {
      setLookupsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, is_active, page])

  useEffect(() => {
    void loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter rows by scope (client-side filter since backend doesn't support null filtering)
  const filteredRows = useMemo(() => {
    if (scopeFilter === 'all') return rows
    return rows.filter((r) => getScopeLevel(r) === scopeFilter)
  }, [rows, scopeFilter])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  // Sites filtered by selected client
  const filteredSites = useMemo(() => {
    if (!form.client) return sites
    return sites.filter((s) => s.client === Number(form.client))
  }, [sites, form.client])

  function openCreate() {
    setDrawerMode('create')
    setEditing(null)
    setForm(FORM_DEFAULTS)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(dept: DepartmentRow) {
    setDrawerMode('edit')
    setEditing(dept)
    const scope = getScopeLevel(dept)
    setForm({
      scope,
      client: dept.client ? String(dept.client) : '',
      site: dept.site ? String(dept.site) : '',
      name: dept.name,
      code: dept.code,
      description: dept.description ?? '',
      is_active: dept.is_active,
    })
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
  }

  function setFormField<K extends keyof DepartmentFormValues>(key: K, value: DepartmentFormValues[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Reset dependent fields when scope changes
      if (key === 'scope') {
        if (value === 'org') {
          next.client = ''
          next.site = ''
        } else if (value === 'client') {
          next.site = ''
        }
      }
      // Reset site when client changes
      if (key === 'client') {
        next.site = ''
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.code.trim()) {
      setFormError('Name and code are required.')
      return
    }
    if (form.scope === 'client' && !form.client) {
      setFormError('Client is required for client-level departments.')
      return
    }
    if (form.scope === 'site' && !form.site) {
      setFormError('Site is required for site-level departments.')
      return
    }

    setFormSubmitting(true)
    setFormError(null)

    try {
      const payload: DepartmentWriteInput = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim() || undefined,
        is_active: form.is_active,
      }

      if (form.scope === 'client') {
        payload.client = Number(form.client)
        payload.site = null
      } else if (form.scope === 'site') {
        payload.site = Number(form.site)
        // Backend auto-fills client from site
      } else {
        payload.client = null
        payload.site = null
      }

      if (drawerMode === 'create') {
        await createDepartment(payload)
      } else if (editing) {
        await updateDepartment(editing.id, payload)
      }

      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeactivate(id: number) {
    setDeactivating(true)
    setActionError(null)
    try {
      await deleteDepartment(id)
      setDeactivatingId(null)
      await refresh()
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Deactivate failed').message)
    } finally {
      setDeactivating(false)
    }
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {filteredRows.map((dept) => (
        <div key={dept.id} className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">{dept.name}</p>
              <p className="truncate text-xs text-app-secondary">{dept.code}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {getScopeBadge(dept)}
              {dept.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="danger">Inactive</Badge>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1 text-xs text-app-secondary">
            {dept.client_name ? (
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{dept.client_name}</span>
              </div>
            ) : null}
            {dept.site_name ? (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{dept.site_name}</span>
              </div>
            ) : null}
            {dept.description ? <p className="text-app-subtle">{dept.description}</p> : null}
          </div>

          {/* Inline deactivate confirmation */}
          {deactivatingId === dept.id ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-3">
              <p className="text-xs text-amber-800 dark:text-amber-200 mb-2">
                Deactivate "{dept.name}"?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="min-h-8 px-3 text-xs"
                  onClick={() => setDeactivatingId(null)}
                  disabled={deactivating}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="min-h-8 px-3 text-xs"
                  onClick={() => handleDeactivate(dept.id)}
                  disabled={deactivating}
                >
                  {deactivating ? 'Deactivating...' : 'Confirm'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {canUpdate ? (
                <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(dept)}>
                  Edit
                </Button>
              ) : null}
              {canDelete && dept.is_active ? (
                <Button
                  variant="danger"
                  className="min-h-9 px-3"
                  onClick={() => setDeactivatingId(dept.id)}
                >
                  Deactivate
                </Button>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Departments</h2>
          <p className="text-sm text-app-secondary">
            Manage organization, client, and site-level departments.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start">
            <Building2 className="mr-1.5 h-4 w-4" />
            Create department
          </Button>
        ) : null}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">
            Filters
          </p>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
              <Search className="h-4 w-4" aria-hidden />
            </div>
            <input
              value={search}
              onChange={(e) => updateParam({ search: e.target.value })}
              placeholder="Search name, code"
              className="min-h-10 w-full rounded-xl border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-sm placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search departments"
            />
          </div>
        </div>
        <div className="lg:w-[180px]">
          <Select
            id="dept_scope_filter"
            label="Scope"
            value={scopeFilter}
            onChange={(e) => updateParam({ scope: e.target.value || null })}
          >
            <option value="all">All scopes</option>
            <option value="org">Org-level</option>
            <option value="client">Client-level</option>
            <option value="site">Site-level</option>
          </Select>
        </div>
        <div className="lg:w-[160px]">
          <Select
            id="dept_active_filter"
            label="Status"
            value={typeof is_active === 'boolean' ? String(is_active) : ''}
            onChange={(e) => updateParam({ is_active: e.target.value || null })}
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </Select>
        </div>
      </div>

      {actionError ? <ErrorState message={actionError} /> : null}

      {/* Content */}
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner label="Loading departments" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      ) : filteredRows.length === 0 ? (
        <EmptyState
          title="No departments found"
          description="Departments are created manually or during mobilisation finalization."
        />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Department</TH>
                  <TH>Scope</TH>
                  <TH>Client</TH>
                  <TH>Site</TH>
                  <TH>Status</TH>
                  <TH>Updated</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filteredRows.map((dept) => (
                  <TR key={dept.id}>
                    <TD>
                      <p className="font-semibold text-app-text">{dept.name}</p>
                      <p className="text-xs text-app-secondary">{dept.code}</p>
                      {dept.description ? (
                        <p className="text-xs text-app-subtle truncate max-w-[200px]">
                          {dept.description}
                        </p>
                      ) : null}
                    </TD>
                    <TD>{getScopeBadge(dept)}</TD>
                    <TD className="text-app-secondary">
                      {dept.client_name ?? (dept.client ? `Client #${dept.client}` : '-')}
                    </TD>
                    <TD className="text-app-secondary">
                      {dept.site_name ?? (dept.site ? `Site #${dept.site}` : '-')}
                    </TD>
                    <TD>
                      {dept.is_active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="danger">Inactive</Badge>
                      )}
                    </TD>
                    <TD className="text-app-secondary text-xs">
                      {dept.updated_at
                        ? new Date(dept.updated_at).toLocaleDateString()
                        : '-'}
                    </TD>
                    <TD className="text-right">
                      {deactivatingId === dept.id ? (
                        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-3 py-2">
                          <span className="text-xs text-amber-800 dark:text-amber-200">
                            Deactivate?
                          </span>
                          <Button
                            variant="secondary"
                            className="min-h-7 px-2 text-xs"
                            onClick={() => setDeactivatingId(null)}
                            disabled={deactivating}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="danger"
                            className="min-h-7 px-2 text-xs"
                            onClick={() => handleDeactivate(dept.id)}
                            disabled={deactivating}
                          >
                            {deactivating ? '...' : 'Yes'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {canUpdate ? (
                            <Button
                              variant="secondary"
                              className="min-h-9 px-3"
                              onClick={() => openEdit(dept)}
                            >
                              Edit
                            </Button>
                          ) : null}
                          {canDelete && dept.is_active ? (
                            <Button
                              variant="danger"
                              className="min-h-9 px-3"
                              onClick={() => setDeactivatingId(dept.id)}
                            >
                              Deactivate
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-app-subtle">
              {typeof count === 'number'
                ? `${count} department${count !== 1 ? 's' : ''}`
                : `${filteredRows.length} department${filteredRows.length !== 1 ? 's' : ''}`}
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

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={drawerMode === 'create' ? 'Create department' : 'Edit department'}
        description={
          drawerMode === 'create'
            ? 'Create a new department for your organization, a client, or a site.'
            : 'Update department details.'
        }
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="department-form" disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        {lookupsLoading ? (
          <p className="text-xs text-app-subtle">Loading lookup data...</p>
        ) : null}

        <form id="department-form" onSubmit={handleSubmit} className="space-y-4">
          {formError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{formError}</p>
            </div>
          ) : null}

          <Select
            id="dept_scope"
            label="Scope level"
            value={form.scope}
            onChange={(e) => setFormField('scope', e.target.value as 'org' | 'client' | 'site')}
          >
            <option value="org">Organization-level</option>
            <option value="client">Client-level</option>
            <option value="site">Site-level</option>
          </Select>

          {form.scope === 'client' || form.scope === 'site' ? (
            <Select
              id="dept_client"
              label="Client"
              value={form.client}
              onChange={(e) => setFormField('client', e.target.value)}
            >
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}

          {form.scope === 'site' ? (
            <Select
              id="dept_site"
              label="Site"
              value={form.site}
              onChange={(e) => setFormField('site', e.target.value)}
              disabled={!form.client}
            >
              <option value="">{form.client ? 'Select a site' : 'Select a client first'}</option>
              {filteredSites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </Select>
          ) : null}

          <Input
            id="dept_name"
            label="Name"
            value={form.name}
            onChange={(e) => setFormField('name', e.target.value)}
            placeholder="e.g. Operations"
            required
          />

          <Input
            id="dept_code"
            label="Code"
            value={form.code}
            onChange={(e) => setFormField('code', e.target.value)}
            placeholder="e.g. OPS"
            required
          />

          <Input
            id="dept_description"
            label="Description"
            value={form.description}
            onChange={(e) => setFormField('description', e.target.value)}
            placeholder="Optional description"
          />

          <div className="pt-2">
            <label className="flex items-center gap-2 text-sm text-app-text cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setFormField('is_active', e.target.checked)}
                className="rounded border-app-border"
              />
              <span>Active</span>
            </label>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
