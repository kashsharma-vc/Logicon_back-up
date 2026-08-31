import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { listClients, deactivateClient, createClient, updateClient, type ClientRow } from '@/api/clients'
import { listUsers, type UserRow } from '@/api/users'
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
import { ClientForm, type ClientFormValues, type InternalUserOption } from '@/features/clients/ClientForm'

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

function userLabel(u: UserRow): string {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return name ? `${name} (@${u.username})` : `@${u.username}`
}

export function ClientsPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.CLIENT_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.CLIENT_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.CLIENT_DELETE])

  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const is_active = parseBoolParam(params.get('is_active'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ClientRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [ownersLoading, setOwnersLoading] = useState(false)
  const [ownerError, setOwnerError] = useState<string | null>(null)
  const [owners, setOwners] = useState<InternalUserOption[]>([])
  const ownerMap = useMemo(() => new Map(owners.map((o) => [o.id, o.label])), [owners])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<ClientRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => `client-form-${drawerMode}`, [drawerMode])

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.is_active !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listClients({ search: search || undefined, is_active, page })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load clients').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadOwners() {
    setOwnersLoading(true)
    setOwnerError(null)
    try {
      const res = await listUsers({ user_type: 'internal', search: '', page: 1 })
      setOwners(res.items.map((u) => ({ id: u.id, label: userLabel(u) })))
    } catch (e: unknown) {
      setOwners([])
      setOwnerError(parseApiError(e, 'Owner lookup failed').message)
    } finally {
      setOwnersLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, is_active, page])

  useEffect(() => {
    void loadOwners()
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

  function openEdit(c: ClientRow) {
    setDrawerMode('edit')
    setEditing(c)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function submit(values: ClientFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim(),
        contact_name: values.contact_name.trim() || undefined,
        contact_email: values.contact_email.trim() || undefined,
        contact_phone: values.contact_phone.trim() || undefined,
        industry: values.industry.trim() || undefined,
        billing_address: values.billing_address.trim() || undefined,
        gst_number: values.gst_number.trim() || undefined,
        owner_sales_user: values.owner_sales_user ? Number(values.owner_sales_user) : null,
        is_active: values.is_active,
      }

      if (drawerMode === 'create') {
        await createClient(payload)
      } else if (editing) {
        await updateClient(editing.id, payload)
      }

      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeactivate(c: ClientRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate client "${c.name}"? This sets is_active=false.`)
    if (!ok) return
    try {
      await deactivateClient(c.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((c) => (
        <div key={c.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">{c.name}</p>
              <p className="truncate text-xs text-app-secondary">{c.code}</p>
              {c.industry ? <p className="truncate text-xs text-app-subtle">{c.industry}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {c.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
            </div>
          </div>
          <div className="mt-3 grid gap-1 text-xs text-app-secondary">
            {c.contact_name ? <p>Contact: {c.contact_name}</p> : null}
            {c.contact_email ? <p>Email: {c.contact_email}</p> : null}
            {c.contact_phone ? <p>Phone: {c.contact_phone}</p> : null}
            {c.owner_sales_user ? (
              <p>Owner: {ownerMap.get(c.owner_sales_user) ?? `User #${c.owner_sales_user}`}</p>
            ) : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {canUpdate ? (
              <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(c)}>
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(c)}>
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
          <h2 className="text-lg font-semibold text-app-text">Clients</h2>
          <p className="text-sm text-app-secondary">Master client setup and ownership.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start">
            Create client
          </Button>
        ) : null}
      </div>

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
              placeholder="Search name, code, contact"
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search clients"
            />
          </div>
        </div>
        <div className="lg:w-[240px]">
          <Select
            id="client_active_filter"
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
          <Spinner label="Loading clients" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No clients found" description="Try adjusting search or filters." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Client</TH>
                  <TH>Industry</TH>
                  <TH>Contact</TH>
                  <TH>Owner</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <p className="font-semibold text-app-text">{c.name}</p>
                      <p className="text-xs text-app-secondary">{c.code}</p>
                    </TD>
                    <TD className="text-app-secondary">{c.industry || '-'}</TD>
                    <TD className="text-app-secondary">
                      <div className="space-y-1">
                        <p>{c.contact_name || '-'}</p>
                        {c.contact_email ? <p className="text-xs text-app-subtle">{c.contact_email}</p> : null}
                        {c.contact_phone ? <p className="text-xs text-app-subtle">{c.contact_phone}</p> : null}
                      </div>
                    </TD>
                    <TD className="text-app-secondary">
                      {c.owner_sales_user ? ownerMap.get(c.owner_sales_user) ?? `User #${c.owner_sales_user}` : '-'}
                    </TD>
                    <TD>{c.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(c)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(c)}>
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
            <p className="text-xs text-app-subtle">{typeof count === 'number' ? `${count} clients` : `${rows.length} clients`}</p>
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
        title={drawerMode === 'create' ? 'Create client' : 'Edit client'}
        description={drawerMode === 'create' ? 'Create a new client (scope node is created by backend).' : 'Update client details.'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={formSubmitting || (ownerError != null && !!editing?.owner_sales_user)}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        {ownersLoading ? <p className="text-xs text-app-subtle">Loading internal users...</p> : null}
        <ClientForm
          formId={formId}
          mode={drawerMode}
          submitting={formSubmitting}
          errorMessage={formError}
          ownerOptions={owners}
          lookupError={ownerError}
          initialValues={
            drawerMode === 'edit' && editing
              ? {
                  name: editing.name ?? '',
                  code: editing.code ?? '',
                  contact_name: editing.contact_name ?? '',
                  contact_email: editing.contact_email ?? '',
                  contact_phone: editing.contact_phone ?? '',
                  industry: editing.industry ?? '',
                  billing_address: editing.billing_address ?? '',
                  gst_number: editing.gst_number ?? '',
                  owner_sales_user: editing.owner_sales_user ? String(editing.owner_sales_user) : '',
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



