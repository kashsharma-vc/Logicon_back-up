import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  createFormTemplate,
  deleteOrDeactivateFormTemplate,
  listFormTemplates,
} from '@/api/formBuilder'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { suggestCode, validateSlug } from '@/features/formBuilder/slug'
import type { FormTemplateRow } from '@/features/formBuilder/types'

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

export function FormBuilderListPage() {
  const navigate = useNavigate()
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.CAMPAIGN_CREATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.CAMPAIGN_DELETE])

  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const is_active = parseBoolParam(params.get('is_active'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<FormTemplateRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({ name: '', code: '', description: '', is_active: true })
  const [keyTouched, setKeyTouched] = useState(false)

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.is_active !== undefined) p.delete('page')
    setParams(p)
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listFormTemplates({ search: search || undefined, is_active, page })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load templates').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, is_active, page])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  function openCreate() {
    setValues({ name: '', code: '', description: '', is_active: true })
    setKeyTouched(false)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSubmitting(false)
    setFormError(null)
  }

  const nameError = useMemo(() => (values.name.trim() ? null : 'Name is required.'), [values.name])
  const codeError = useMemo(() => validateSlug(values.code), [values.code])
  const canSubmit = !submitting && !nameError && !codeError

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setFormError(null)
    try {
      const created = await createFormTemplate({
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim() || undefined,
        is_active: values.is_active,
      })
      closeDrawer()
      navigate(`/form-builder/${created.id}`)
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeactivate(row: FormTemplateRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate template "${row.name}"?`)
    if (!ok) return
    try {
      await deleteOrDeactivateFormTemplate(row.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Form builder</h2>
          <p className="text-sm text-app-secondary">
            Build reusable intake form templates. Assign a template to a QR campaign to drive its public apply form.
          </p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start">
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Create template
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
              placeholder="Search name, code, description"
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search templates"
            />
          </div>
        </div>
        <div className="lg:w-60">
          <Select
            id="tpl_active_filter"
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
        <Spinner label="Loading templates..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No form templates yet"
          description="Create a template to define a reusable intake form (sections + fields) for QR campaigns."
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {rows.map((r) => (
              <div key={r.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text">{r.name}</p>
                    <p className="truncate font-mono text-xs text-app-secondary">{r.code}</p>
                    {r.description ? (
                      <p className="mt-1 line-clamp-2 text-xs text-app-secondary">{r.description}</p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-app-subtle">
                      Updated {new Date(r.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" className="min-h-9 px-3" onClick={() => navigate(`/form-builder/${r.id}`)}>
                    <Pencil className="mr-1 h-4 w-4" aria-hidden />
                    Open builder
                  </Button>
                  {canDelete ? (
                    <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(r)}>
                      <Trash2 className="mr-1 h-4 w-4" aria-hidden />
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table className="shadow-panel">
              <THead>
                <TR>
                  <TH>Template</TH>
                  <TH>Code</TH>
                  <TH>Description</TH>
                  <TH>Status</TH>
                  <TH>Updated</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id} className="align-top">
                    <TD className="min-w-[240px] py-3">
                      <p className="text-sm font-semibold text-app-text">{r.name}</p>
                    </TD>
                    <TD className="py-3">
                      <span className="rounded border border-app-border bg-app-muted px-2 py-0.5 font-mono text-xs text-app-secondary">
                        {r.code}
                      </span>
                    </TD>
                    <TD className="py-3 text-sm text-app-secondary">
                      <span className="line-clamp-2 max-w-[420px]">{r.description || '—'}</span>
                    </TD>
                    <TD className="py-3">
                      {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
                    </TD>
                    <TD className="py-3 text-xs text-app-subtle">{new Date(r.updated_at).toLocaleDateString()}</TD>
                    <TD className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="min-h-9 px-3" onClick={() => navigate(`/form-builder/${r.id}`)}>
                          <Pencil className="mr-1 h-4 w-4" aria-hidden />
                          Open builder
                        </Button>
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(r)}>
                            <Trash2 className="mr-1 h-4 w-4" aria-hidden />
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
        title="Create template"
        description="Start a new intake form template. You can add sections and fields next."
        onClose={closeDrawer}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="tpl-create-form" disabled={!canSubmit}>
              {submitting ? 'Creating...' : 'Create template'}
            </Button>
          </div>
        }
      >
        <form id="tpl-create-form" onSubmit={submit} className="space-y-4">
          {formError ? <ErrorState message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="tpl_create_name"
              label="Name"
              value={values.name}
              onChange={(e) => {
                const next = e.target.value
                setValues((v) => ({
                  ...v,
                  name: next,
                  code: !keyTouched ? suggestCode(next) : v.code,
                }))
              }}
              error={nameError ?? undefined}
              disabled={submitting}
              required
            />
            <Input
              id="tpl_create_code"
              label="Code"
              value={values.code}
              onChange={(e) => {
                setKeyTouched(true)
                setValues((v) => ({ ...v, code: e.target.value }))
              }}
              error={codeError ?? undefined}
              disabled={submitting}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="tpl_create_description" className="text-sm font-medium text-app-secondary">
              Description (optional)
            </label>
            <textarea
              id="tpl_create_description"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              disabled={submitting}
              className="min-h-20 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-app-secondary">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
              disabled={submitting}
            />
            Active
          </label>
          <button type="submit" hidden />
        </form>
      </Drawer>
    </div>
  )
}
