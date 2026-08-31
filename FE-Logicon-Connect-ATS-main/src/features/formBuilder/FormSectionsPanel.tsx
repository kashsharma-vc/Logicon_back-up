import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Layers, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import {
  createFormSection,
  deleteFormSection,
  listFormSections,
  updateFormSection,
} from '@/api/formBuilder'
import { parseApiError } from '@/lib/apiError'
import { suggestCode, validateSlug } from '@/features/formBuilder/slug'
import type { FormSectionRow } from '@/features/formBuilder/types'

export function FormSectionsPanel({
  templateId,
  canEdit,
  canDelete,
  onSectionsChanged,
}: {
  templateId: number
  canEdit: boolean
  canDelete: boolean
  onSectionsChanged?: (rows: FormSectionRow[]) => void
}) {
  const [rows, setRows] = useState<FormSectionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<FormSectionRow | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [values, setValues] = useState({
    name: '',
    code: '',
    description: '',
    sort_order: '0',
    is_active: true,
  })
  const [keyTouched, setKeyTouched] = useState(false)

  const sorted = useMemo(
    () => rows.slice().sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [rows],
  )

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listFormSections({ template: templateId })
      setRows(res.items)
      onSectionsChanged?.(res.items)
    } catch (e: unknown) {
      setRows([])
      setError(parseApiError(e, 'Failed to load sections').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId])

  function openCreate() {
    setDrawerMode('create')
    setEditing(null)
    setFormError(null)
    setKeyTouched(false)
    const nextOrder = sorted.length ? Math.max(...sorted.map((s) => s.sort_order)) + 10 : 0
    setValues({ name: '', code: '', description: '', sort_order: String(nextOrder), is_active: true })
    setDrawerOpen(true)
  }

  function openEdit(row: FormSectionRow) {
    setDrawerMode('edit')
    setEditing(row)
    setFormError(null)
    setKeyTouched(true)
    setValues({
      name: row.name,
      code: row.code,
      description: row.description ?? '',
      sort_order: String(row.sort_order),
      is_active: row.is_active,
    })
    setDrawerOpen(true)
  }

  function close() {
    setDrawerOpen(false)
    setSubmitting(false)
    setFormError(null)
  }

  const nameError = useMemo(() => (values.name.trim() ? null : 'Name is required.'), [values.name])
  const codeError = useMemo(() => validateSlug(values.code), [values.code])
  const sortError = useMemo(() => {
    const n = Number(values.sort_order)
    return Number.isFinite(n) ? null : 'Sort order must be numeric.'
  }, [values.sort_order])
  const canSubmit = !submitting && !nameError && !codeError && !sortError

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        template: templateId,
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim() || undefined,
        sort_order: Number(values.sort_order) || 0,
        is_active: values.is_active,
      }
      if (drawerMode === 'create') {
        await createFormSection(payload)
      } else if (editing) {
        await updateFormSection(editing.id, payload)
      }
      close()
      await refresh()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  async function move(row: FormSectionRow, dir: -1 | 1) {
    const idx = sorted.findIndex((s) => s.id === row.id)
    const target = sorted[idx + dir]
    if (!target) return
    try {
      await Promise.all([
        updateFormSection(row.id, { sort_order: target.sort_order }),
        updateFormSection(target.id, { sort_order: row.sort_order }),
      ])
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Reorder failed').message)
    }
  }

  async function handleDelete(row: FormSectionRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate section "${row.name}"?`)
    if (!ok) return
    try {
      await deleteFormSection(row.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
            <Layers className="h-5 w-5 text-brand-600" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-text">Form Sections</h3>
            <p className="text-sm text-app-secondary">Organize your form into logical groups</p>
          </div>
        </div>
        {canEdit ? (
          <Button onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            Add Section
          </Button>
        ) : null}
      </div>

      {/* Sections List */}
      <div className="rounded-xl border border-app-border bg-app-surface shadow-sm">
        {loading ? (
          <div className="p-6">
            <Spinner label="Loading sections..." />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState message={error} />
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No sections yet"
              description="Add sections such as Contact Details, Applying For, General Information, and Documents."
            />
          </div>
        ) : (
          <ul className="divide-y divide-app-border">
            {sorted.map((row, idx) => (
              <li
                key={row.id}
                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-app-muted/50"
              >
                {/* Position Number */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-app-text">{row.name}</span>
                    <span className="rounded bg-app-muted px-1.5 py-0.5 font-mono text-[11px] text-app-subtle">
                      {row.code}
                    </span>
                    {row.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </div>
                  {row.description ? (
                    <p className="mt-0.5 text-xs text-app-secondary">{row.description}</p>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 opacity-60 group-hover:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-8 px-2"
                    onClick={() => move(row, -1)}
                    disabled={!canEdit || idx === 0}
                    aria-label="Move up"
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-8 px-2"
                    onClick={() => move(row, 1)}
                    disabled={!canEdit || idx === sorted.length - 1}
                    aria-label="Move down"
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </Button>
                  {canEdit ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-8 px-2"
                      onClick={() => openEdit(row)}
                      aria-label="Edit section"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-8 px-2 text-status-danger hover:bg-status-danger/10"
                      onClick={() => handleDelete(row)}
                      aria-label="Deactivate section"
                      title="Deactivate"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        title={drawerMode === 'create' ? 'Add section' : 'Edit section'}
        onClose={close}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" form="section-form" disabled={!canSubmit}>
              {submitting ? 'Saving...' : 'Save section'}
            </Button>
          </div>
        }
      >
        <form id="section-form" onSubmit={submit} className="space-y-4">
          {formError ? <ErrorState message={formError} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="section_name"
              label="Name"
              value={values.name}
              onChange={(e) => {
                const next = e.target.value
                setValues((v) => ({
                  ...v,
                  name: next,
                  code: !keyTouched && drawerMode === 'create' ? suggestCode(next) : v.code,
                }))
              }}
              error={nameError ?? undefined}
              disabled={submitting}
              required
            />
            <Input
              id="section_code"
              label="Code"
              value={values.code}
              onChange={(e) => {
                setKeyTouched(true)
                setValues((v) => ({ ...v, code: e.target.value }))
              }}
              error={codeError ?? undefined}
              disabled={submitting || drawerMode === 'edit'}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="section_description" className="text-sm font-medium text-app-secondary">
              Description
            </label>
            <textarea
              id="section_description"
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              disabled={submitting}
              className="min-h-20 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
            <Input
              id="section_sort_order"
              label="Sort order"
              type="number"
              value={values.sort_order}
              onChange={(e) => setValues((v) => ({ ...v, sort_order: e.target.value }))}
              error={sortError ?? undefined}
              disabled={submitting}
            />
            <label className="flex items-center gap-2 text-sm text-app-secondary">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
                disabled={submitting}
              />
              Active
            </label>
          </div>
          <button type="submit" hidden />
        </form>
      </Drawer>
    </div>
  )
}
