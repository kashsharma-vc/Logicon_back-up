import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createClientOnboardingRequest,
  deleteClientOnboardingRequest,
  listClientOnboardingRequests,
  updateClientOnboardingRequest,
} from '@/api/clientOnboarding'
import { listClients, type ClientRow } from '@/api/clients'
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
import {
  ClientOnboardingForm,
  clientOnboardingValuesToWritePayload,
  type ClientOnboardingFormValues,
} from '@/features/clientOnboarding/ClientOnboardingForm'
import { ClientOnboardingStatusBadge } from '@/features/clientOnboarding/ClientOnboardingStatusBadge'
import type { ClientOnboardingRow } from '@/features/clientOnboarding/types'
import { finalizationStatusLabel } from '@/features/clientOnboarding/types'

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

function formatOnboardingType(t: string): string {
  if (t === 'new_client') return 'New client'
  if (t === 'new_site_expansion') return 'New site expansion'
  return t.replace(/_/g, ' ')
}

function displayOnboardingClient(r: ClientOnboardingRow, clientById: Map<number, ClientRow>): string {
  if (r.client_name?.trim()) return r.client_name
  if (r.proposed_client_name?.trim()) return r.proposed_client_name.trim()
  if (r.client != null) return clientById.get(r.client)?.name ?? `Client #${r.client}`
  return '—'
}

function finalizationBadgeVariant(s: string | null | undefined): 'success' | 'danger' | 'neutral' {
  if (s === 'finalized') return 'success'
  if (s === 'failed') return 'danger'
  return 'neutral'
}

export function ClientOnboardingListPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.CLIENT_ONBOARDING_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.CLIENT_ONBOARDING_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.CLIENT_ONBOARDING_DELETE])
  const canReadBudget = hasAnyCapability(meCaps, [CAP.BUDGET_READ])

  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const onboarding_type = params.get('onboarding_type') ?? ''
  const client = parseNumParam(params.get('client'))
  const requested_by = parseNumParam(params.get('requested_by'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ClientOnboardingRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])

  const clientOptions = useMemo(
    () => clients.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })),
    [clients],
  )
  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<ClientOnboardingRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => `co-form-${drawerMode}`, [drawerMode])

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (
      next.search !== undefined ||
      next.status !== undefined ||
      next.onboarding_type !== undefined ||
      next.client !== undefined ||
      next.requested_by !== undefined
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
      const res = await listClientOnboardingRequests({
        search: search || undefined,
        status: status || undefined,
        onboarding_type: onboarding_type || undefined,
        client,
        requested_by,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load onboarding requests').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadClients() {
    setLookupsLoading(true)
    setLookupError(null)
    try {
      const res = await listClients({ search: '', page: 1 })
      setClients(res.items)
    } catch (e: unknown) {
      setClients([])
      setLookupError(parseApiError(e, 'Client lookup failed').message)
    } finally {
      setLookupsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, onboarding_type, client, requested_by, page])

  useEffect(() => {
    void loadClients()
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

  function openEdit(r: ClientOnboardingRow) {
    setDrawerMode('edit')
    setEditing(r)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function submit(values: ClientOnboardingFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = clientOnboardingValuesToWritePayload(values)
      if (drawerMode === 'create') {
        const created = await createClientOnboardingRequest(payload)
        closeDrawer()
        navigate(`/mobilisation/${created.id}`)
        return
      }
      if (editing) {
        await updateClientOnboardingRequest(editing.id, payload)
      }
      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDelete(r: ClientOnboardingRow) {
    if (!canDelete) return
    const ok = window.confirm('Delete this mobilisation setup request? This cannot be undone.')
    if (!ok) return
    try {
      await deleteClientOnboardingRequest(r.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
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
              <p className="truncate text-xs text-app-secondary">{displayOnboardingClient(r, clientById)}</p>
              <p className="truncate text-xs text-app-subtle">{formatOnboardingType(String(r.onboarding_type))}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <ClientOnboardingStatusBadge status={r.status} />
              <Badge variant={finalizationBadgeVariant(r.finalization_status)}>
                {finalizationStatusLabel(r.finalization_status)}
              </Badge>
            </div>
          </div>
          <p className="mt-2 text-xs text-app-secondary">Expected sites: {r.expected_site_count ?? '-'}</p>
          <p className="mt-1 text-xs text-app-secondary">
            Requested by: {r.requested_by_username ? `${r.requested_by_username}` : `User #${r.requested_by}`}
          </p>
          <p className="mt-2 text-xs text-app-subtle">{new Date(r.created_at).toLocaleString()}</p>
        </button>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Mobilisation</h2>
          <p className="text-sm text-app-secondary">Sales-led client and site expansion requests with approval workflow.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start">
            Create request
          </Button>
        ) : null}
      </div>

      {lookupError ? (
        <ErrorState
          message={`Client lookup failed. Existing-client selection may be limited. New-client requests can still be created. ${lookupError}`}
        />
      ) : null}

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
                placeholder="Search summary or proposed client name"
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
              onClick={clearFilters}
              disabled={!search && !status && !onboarding_type && !client && !requested_by}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select id="co_status" label="Status" value={status} onChange={(e) => updateParam({ status: e.target.value || null })}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </Select>

          <Select
            id="co_onboarding_type"
            label="Mobilisation type"
            value={onboarding_type}
            onChange={(e) => updateParam({ onboarding_type: e.target.value || null })}
          >
            <option value="">All</option>
            <option value="new_client">New client</option>
            <option value="new_site_expansion">New site expansion</option>
          </Select>

          <Select
            id="co_client_filter"
            label="Client"
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

          <Input
            id="co_requested_by"
            label="Requested by (user id)"
            type="number"
            min={1}
            step={1}
            value={requested_by != null ? String(requested_by) : ''}
            onChange={(e) => updateParam({ requested_by: e.target.value.trim() || null })}
            placeholder="Optional"
          />
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading mobilisation requests..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No requests found" description="Try adjusting filters or create a new mobilisation setup." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">ID</TH>
                  <TH className="py-2">Client</TH>
                  <TH className="py-2">Type</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Finalization</TH>
                  <TH className="py-2">Expected sites</TH>
                  <TH className="py-2">Requested by</TH>
                  <TH className="py-2">Created</TH>
                  <TH className="py-2 text-right">Actions</TH>
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
                    <TD className="py-2 text-sm text-app-secondary">{displayOnboardingClient(r, clientById)}</TD>
                    <TD className="py-2 text-sm text-app-secondary">{formatOnboardingType(String(r.onboarding_type))}</TD>
                    <TD className="py-2">
                      <ClientOnboardingStatusBadge status={r.status} />
                    </TD>
                    <TD className="py-2">
                      <Badge variant={finalizationBadgeVariant(r.finalization_status)}>
                        {finalizationStatusLabel(r.finalization_status)}
                      </Badge>
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{r.expected_site_count ?? '-'}</TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {r.requested_by_username ? r.requested_by_username : `User #${r.requested_by}`}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{new Date(r.created_at).toLocaleString()}</TD>
                    <TD className="py-2 text-right" onClick={(e: MouseEvent) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {canUpdate ? (
                          <Button
                            variant="secondary"
                            className="min-h-9 px-3"
                            onClick={() => openEdit(r)}
                            disabled={!!lookupError && r.onboarding_type === 'new_site_expansion'}
                          >
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => void handleDelete(r)}>
                            Delete
                          </Button>
                        ) : null}
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

      <Drawer
        open={drawerOpen}
        title={drawerMode === 'create' ? 'New mobilisation setup' : 'Edit mobilisation setup'}
        description={
          drawerMode === 'create'
            ? 'Creates a draft request. Workflow is started from the detail page.'
            : 'Update mobilisation details. Status is managed by workflow and transitions.'
        }
        onClose={closeDrawer}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={formSubmitting || (!!lookupError && drawerMode === 'edit' && editing?.onboarding_type === 'new_site_expansion')}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <ClientOnboardingForm
          key={`${drawerMode}-${editing?.id ?? 'new'}`}
          formId={formId}
          mode={drawerMode}
          initialRow={editing}
          clientOptions={clientOptions}
          clientsLookupError={lookupError}
          clientsLoading={lookupsLoading}
          canReadBudget={canReadBudget}
          submitting={formSubmitting}
          errorMessage={formError}
          onSubmit={submit}
        />
      </Drawer>
    </div>
  )
}
