import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { listSites, createSite, updateSite, deactivateSite, type SiteProfileRow } from '@/api/sites'
import { listClients, type ClientRow } from '@/api/clients'
import { listLocationAreas, type LocationAreaRow } from '@/api/wages'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { SiteForm, type ClientOption, type LocationAreaOption, type SiteFormValues } from '@/features/sites/SiteForm'

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

function siteLocationDisplay(s: SiteProfileRow): string {
  const name = s.location_area_name?.trim()
  if (name) return name
  const cityState = [s.city, s.state].filter(Boolean).join(', ')
  return cityState || '—'
}

function locationAreaOptionLabel(r: LocationAreaRow): string {
  const type = r.area_type_display ?? r.area_type
  const tail = [r.parent_name, r.state_name].filter(Boolean).join(' · ')
  return tail ? `${r.name} (${type}) — ${tail}` : `${r.name} (${type})`
}

async function loadAllActiveLocationAreas(): Promise<LocationAreaRow[]> {
  const all: LocationAreaRow[] = []
  let page = 1
  const maxPages = 40
  while (page <= maxPages) {
    const res = await listLocationAreas({ is_active: true, page })
    all.push(...res.items)
    if (res.items.length < 50) break
    page++
  }
  return all
}

export function SitesPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.SITE_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.SITE_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.SITE_DELETE])

  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const client = parseNumParam(params.get('client'))
  const is_active = parseBoolParam(params.get('is_active'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<SiteProfileRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [clientsLoading, setClientsLoading] = useState(false)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [locationsError, setLocationsError] = useState<string | null>(null)
  const [locationAreas, setLocationAreas] = useState<LocationAreaRow[]>([])
  const clientOptions: ClientOption[] = useMemo(
    () => clients.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })),
    [clients],
  )
  const locationOptions: LocationAreaOption[] = useMemo(
    () => locationAreas.map((r) => ({ id: r.id, label: locationAreaOptionLabel(r) })),
    [locationAreas],
  )
  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<SiteProfileRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => `site-form-${drawerMode}`, [drawerMode])

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.client !== undefined || next.is_active !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listSites({ search: search || undefined, client, is_active, page })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load sites').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadClientsLookup() {
    setClientsLoading(true)
    setClientsError(null)
    try {
      // just first page is enough for now; if org has many clients we can add search later
      const res = await listClients({ search: '', page: 1 })
      setClients(res.items)
    } catch (e: unknown) {
      setClients([])
      setClientsError(parseApiError(e, 'Client lookup failed').message)
    } finally {
      setClientsLoading(false)
    }
  }

  async function loadLocationAreasLookup() {
    setLocationsLoading(true)
    setLocationsError(null)
    try {
      const items = await loadAllActiveLocationAreas()
      setLocationAreas(items)
    } catch (e: unknown) {
      setLocationAreas([])
      setLocationsError(parseApiError(e, 'Location master list could not be loaded').message)
    } finally {
      setLocationsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, client, is_active, page])

  useEffect(() => {
    void loadClientsLookup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    void loadLocationAreasLookup()
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

  function openEdit(s: SiteProfileRow) {
    setDrawerMode('edit')
    setEditing(s)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function submit(values: SiteFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        client: Number(values.client),
        name: values.name.trim(),
        code: values.code.trim(),
        location_area: values.location_area.trim() ? Number(values.location_area) : null,
        address: values.address.trim() || undefined,
        city: values.city.trim() || undefined,
        state: values.state.trim() || undefined,
        pincode: values.pincode.trim() || undefined,
        shift_type: values.shift_type || undefined,
        contact_person: values.contact_person.trim() || undefined,
        contact_phone: values.contact_phone.trim() || undefined,
        contact_email: values.contact_email.trim() || undefined,
        is_active: values.is_active,
      }

      if (drawerMode === 'create') {
        await createSite(payload)
      } else if (editing) {
        await updateSite(editing.id, payload)
      }
      closeDrawer()
      await refresh()
      await loadClientsLookup()
      await loadLocationAreasLookup()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeactivate(s: SiteProfileRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate site "${s.name}"? This sets is_active=false.`)
    if (!ok) return
    try {
      await deactivateSite(s.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((s) => (
        <div key={s.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">{s.name}</p>
              <p className="truncate text-xs text-app-secondary">{s.code}</p>
              <p className="truncate text-xs text-app-subtle">
                {clientNameById.get(s.client) ?? `Client #${s.client}`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {s.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
            </div>
          </div>
          <div className="mt-3 grid gap-1 text-xs text-app-secondary">
            <p>Location: {siteLocationDisplay(s)}</p>
            {s.contact_person ? <p>Contact: {s.contact_person}</p> : null}
            {s.contact_phone ? <p>Phone: {s.contact_phone}</p> : null}
            {s.contact_email ? <p>Email: {s.contact_email}</p> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canUpdate ? (
              <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(s)}>
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(s)}>
                Deactivate
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
          <h2 className="text-lg font-semibold text-app-text">Sites</h2>
          <p className="text-sm text-app-secondary">Site profiles under clients.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start" disabled={!!clientsError}>
            Create site
          </Button>
        ) : null}
      </div>

      {clientsError ? <ErrorState message={`Client lookup failed. Create/Edit is disabled. ${clientsError}`} /> : null}

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
              placeholder="Search name, code, city, state"
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search sites"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
          <Select
            id="client_filter"
            label="Client"
            value={client ? String(client) : ''}
            onChange={(e) => updateParam({ client: e.target.value || null })}
            disabled={clientsLoading || !!clientsError}
          >
            <option value="">All</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            id="site_active_filter"
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

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner label="Loading sites" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No sites found" description="Try adjusting search or filters." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Site</TH>
                  <TH>Client</TH>
                  <TH>Location</TH>
                  <TH>Contact</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((s) => (
                  <TR key={s.id}>
                    <TD>
                      <p className="font-semibold text-app-text">{s.name}</p>
                      <p className="text-xs text-app-secondary">{s.code}</p>
                    </TD>
                    <TD className="text-app-secondary">{clientNameById.get(s.client) ?? `Client #${s.client}`}</TD>
                    <TD className="text-app-secondary">{siteLocationDisplay(s)}</TD>
                    <TD className="text-app-secondary">
                      <div className="space-y-1">
                        <p>{s.contact_person || '-'}</p>
                        {s.contact_phone ? <p className="text-xs text-app-subtle">{s.contact_phone}</p> : null}
                        {s.contact_email ? <p className="text-xs text-app-subtle">{s.contact_email}</p> : null}
                      </div>
                    </TD>
                    <TD>{s.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(s)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(s)}>
                            Deactivate
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
            <p className="text-xs text-app-subtle">{typeof count === 'number' ? `${count} sites` : `${rows.length} sites`}</p>
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
        title={drawerMode === 'create' ? 'Create site' : 'Edit site'}
        description={drawerMode === 'create' ? 'Create a new site under a client (scope node is created by backend).' : 'Update site details.'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={formSubmitting || !!clientsError}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        {clientsLoading ? <p className="text-xs text-app-subtle">Loading clients...</p> : null}
        {locationsLoading ? <p className="text-xs text-app-subtle">Loading location master…</p> : null}
        <SiteForm
          key={`${drawerMode}-${editing?.id ?? 'new'}`}
          formId={formId}
          mode={drawerMode}
          submitting={formSubmitting}
          errorMessage={formError}
          clientOptions={clientOptions}
          locationOptions={locationOptions}
          lookupError={clientsError}
          locationLookupError={locationsError}
          initialValues={
            drawerMode === 'edit' && editing
              ? {
                  client: String(editing.client),
                  name: editing.name ?? '',
                  code: editing.code ?? '',
                  address: editing.address ?? '',
                  location_area: editing.location_area != null ? String(editing.location_area) : '',
                  city: editing.city ?? '',
                  state: editing.state ?? '',
                  pincode: editing.pincode ?? '',
                  shift_type: editing.shift_type ?? '',
                  contact_person: editing.contact_person ?? '',
                  contact_phone: editing.contact_phone ?? '',
                  contact_email: editing.contact_email ?? '',
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



