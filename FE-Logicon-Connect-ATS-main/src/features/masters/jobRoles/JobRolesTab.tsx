import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import {
  listJobRoles,
  createJobRole,
  updateJobRole,
  deleteJobRole,
  type JobRoleRow,
  type SkillCategory,
} from '@/api/jobs'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { JobRoleForm, type JobRoleFormValues } from '@/features/masters/jobRoles/JobRoleForm'
import { SKILL_CATEGORY_OPTIONS, skillCategoryLabel } from '@/features/masters/jobRoles/types'

function parseBoolParam(v: string | null): boolean | undefined {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
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

export function JobRolesTab() {
  const me = useAuthStore((s) => s.me)
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.JOB_ROLE_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.JOB_ROLE_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.JOB_ROLE_DELETE])

  const [search, setSearch] = useState('')
  const [skillCategory, setSkillCategory] = useState<SkillCategory | ''>('')
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined)
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<JobRoleRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<JobRoleRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => `jr-form-${drawerMode}`, [drawerMode])

  const orgId = me?.org ?? undefined

  const refresh = useCallback(
    async (pageOverride?: number) => {
      const usePage = pageOverride ?? page
      setLoading(true)
      setError(null)
      try {
        const res = await listJobRoles({
          search: search || undefined,
          org: orgId,
          skill_category: skillCategory || undefined,
          is_active: isActive,
          page: usePage,
        })
        setRows(res.items)
        setCount(res.count)
      } catch (e: unknown) {
        setRows([])
        setCount(undefined)
        setError(parseApiError(e, 'Failed to load job roles').message)
      } finally {
        setLoading(false)
      }
    },
    [search, orgId, skillCategory, isActive, page],
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

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

  function openEdit(r: JobRoleRow) {
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

  async function submit(values: JobRoleFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim() || '',
        skill_category: values.skill_category as SkillCategory,
        is_active: values.is_active,
      }
      if (drawerMode === 'create') {
        await createJobRole(payload)
      } else if (editing) {
        await updateJobRole(editing.id, payload)
      }
      closeDrawer()
      setPage(1)
      await refresh(1)
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeactivate(r: JobRoleRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate job role "${r.name}"? This sets inactive.`)
    if (!ok) return
    try {
      await deleteJobRole(r.id)
      await refresh()
    } catch (e: unknown) {
      alert(parseApiError(e, 'Deactivate failed').message)
    }
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((r) => (
        <div key={r.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">{r.name}</p>
              <p className="truncate font-mono text-xs text-app-secondary">{r.code}</p>
            </div>
            {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
          </div>
          <p className="mt-2 text-xs text-app-secondary">{skillCategoryLabel(r.skill_category, r.skill_category_display)}</p>
          {r.description ? <p className="mt-2 line-clamp-3 text-xs text-app-subtle">{r.description}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {canUpdate ? (
              <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)}>
                Edit
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(r)} disabled={!r.is_active}>
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
          <h3 className="text-base font-semibold text-app-text">Job roles</h3>
          <p className="text-sm text-app-secondary">Org-scoped roles used for sites, campaigns, and wage rates.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start">
            Create job role
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Search</p>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
              <Search className="h-4 w-4" aria-hidden />
            </div>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Name or code"
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search job roles"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
          <div>
            <p className="mb-1 text-xs font-medium text-app-subtle">Skill category</p>
            <CompactSelect
              ariaLabel="Filter by skill category"
              value={skillCategory}
              onChange={(v) => {
                setSkillCategory((v || '') as SkillCategory | '')
                setPage(1)
              }}
            >
              <option value="">All</option>
              {SKILL_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </CompactSelect>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-app-subtle">Status</p>
            <CompactSelect
              ariaLabel="Filter by status"
              value={typeof isActive === 'boolean' ? String(isActive) : ''}
              onChange={(v) => {
                const b = parseBoolParam(v || null)
                setIsActive(b)
                setPage(1)
              }}
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
          <Spinner label="Loading job roles" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No job roles found" description="Try adjusting search or filters." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Code</TH>
                  <TH>Skill category</TH>
                  <TH>Description</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR key={r.id}>
                    <TD className="font-medium text-app-text">{r.name}</TD>
                    <TD className="font-mono text-app-secondary">{r.code}</TD>
                    <TD className="text-app-secondary">{skillCategoryLabel(r.skill_category, r.skill_category_display)}</TD>
                    <TD className="max-w-[240px] truncate text-xs text-app-subtle">{r.description || '—'}</TD>
                    <TD>{r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}</TD>
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
                            onClick={() => handleDeactivate(r)}
                            disabled={!r.is_active}
                          >
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
            <p className="text-xs text-app-subtle">{typeof count === 'number' ? `${count} roles` : `${rows.length} roles`}</p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" className="min-h-9 px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
                onClick={() => setPage((p) => p + 1)}
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
        title={drawerMode === 'create' ? 'Create job role' : 'Edit job role'}
        description={drawerMode === 'create' ? 'Add a new job role for your organization.' : 'Update job role details.'}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={formSubmitting}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <JobRoleForm
          key={`${drawerMode}-${editing?.id ?? 'new'}`}
          formId={formId}
          submitting={formSubmitting}
          errorMessage={formError}
          initialValues={
            drawerMode === 'edit' && editing
              ? {
                  name: editing.name,
                  code: editing.code,
                  skill_category: editing.skill_category,
                  description: editing.description ?? '',
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
