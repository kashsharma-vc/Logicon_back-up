import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listUsers, type UserRow, createUser, updateUser, deactivateUser, sendPasswordResetLink } from '@/api/users'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Drawer } from '@/components/ui/Drawer'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { UserForm, type UserFormValues } from '@/features/users/UserForm'
import { displayName, userTypeLabel, type UserType } from '@/features/users/types'
import { parseApiError } from '@/lib/apiError'

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

function badgeVariantForUserType(t: UserType) {
  if (t === 'internal') return 'info'
  if (t === 'client') return 'neutral'
  return 'attention'
}

export function UsersPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.USER_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.USER_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.USER_DELETE])
  const canManageAccess = hasAnyCapability(meCaps, [CAP.ROLE_READ])

  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const user_type = (params.get('user_type') as UserType | null) ?? ''
  const is_active = parseBoolParam(params.get('is_active'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<UserRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create')
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formFieldErrors, setFormFieldErrors] = useState<Partial<Record<keyof UserFormValues, string>>>({})
  const formId = useMemo(() => `user-form-${drawerMode}`, [drawerMode])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listUsers({
        search: search || undefined,
        user_type: user_type || undefined,
        is_active,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, user_type, is_active, page])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (next.search !== undefined || next.user_type !== undefined || next.is_active !== undefined) {
      p.delete('page')
    }
    setParams(p)
  }

  function openCreate() {
    setDrawerMode('create')
    setEditing(null)
    setFormError(null)
    setFormFieldErrors({})
    setDrawerOpen(true)
  }

  function openEdit(u: UserRow) {
    setDrawerMode('edit')
    setEditing(u)
    setFormError(null)
    setFormFieldErrors({})
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
    setFormFieldErrors({})
  }

  async function submit(values: UserFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    setFormFieldErrors({})
    try {
      if (drawerMode === 'create') {
        await createUser({
          username: values.username.trim(),
          email: values.email.trim() || undefined,
          first_name: values.first_name.trim() || undefined,
          last_name: values.last_name.trim() || undefined,
          phone_number: values.phone_number.trim() || undefined,
          employee_code: values.employee_code.trim() || undefined,
          user_type: values.user_type,
          is_active: values.is_active,
          is_invited: values.is_invited,
          department: values.department,
          password: values.password.trim() || undefined,
        })
      } else if (editing) {
        await updateUser(editing.id, {
          email: values.email.trim() || undefined,
          first_name: values.first_name.trim() || undefined,
          last_name: values.last_name.trim() || undefined,
          phone_number: values.phone_number.trim() || undefined,
          employee_code: values.employee_code.trim() || undefined,
          user_type: values.user_type,
          is_active: values.is_active,
          is_invited: values.is_invited,
          department: values.department,
        })
      }
      closeDrawer()
      await refresh()
    } catch (e: unknown) {
      const parsed = parseApiError(e, 'Save failed')
      setFormError(parsed.message)
      setFormFieldErrors(parsed.fields as Partial<Record<keyof UserFormValues, string>>)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleSendResetLink() {
    if (!editing) return
    setResetSubmitting(true)
    setFormError(null)
    try {
      const res = await sendPasswordResetLink(editing.id)
      alert(res.detail || 'Password reset link sent.')
    } catch (err: unknown) {
      const parsed = parseApiError(err, 'Failed to send reset link.')
      setFormError(parsed.message)
    } finally {
      setResetSubmitting(false)
    }
  }

  async function handleDeactivate(u: UserRow) {
    if (!canDelete) return
    const ok = window.confirm(`Deactivate user "${u.username}"? This sets is_active=false.`)
    if (!ok) return
    try {
      await deactivateUser(u.id)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Deactivate failed')
    }
  }

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((u) => (
        <div key={u.id} className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">{displayName(u)}</p>
              <p className="truncate text-xs text-app-secondary">@{u.username}</p>
              {u.email ? <p className="truncate text-xs text-app-subtle">{u.email}</p> : null}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <Badge variant={badgeVariantForUserType(u.user_type)}>{userTypeLabel(u.user_type)}</Badge>
              {!u.is_active ? <Badge variant="danger">Inactive</Badge> : <Badge variant="success">Active</Badge>}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-app-secondary">
            {u.phone_number ? <span>Phone: {u.phone_number}</span> : null}
            {u.employee_code ? <span>Emp: {u.employee_code}</span> : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {canUpdate ? (
              <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(u)}>
                Edit
              </Button>
            ) : null}
            {canManageAccess ? (
              <Link
                to={`/users/${u.id}/access`}
                className="inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text hover:bg-app-muted"
              >
                Manage access
              </Link>
            ) : null}
            {canDelete ? (
              <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(u)}>
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
          <h2 className="text-lg font-semibold text-app-text">Users</h2>
          <p className="text-sm text-app-secondary">Manage internal, client, and field users.</p>
        </div>
        {canCreate ? (
          <Button onClick={openCreate} className="sm:self-start">
            Create user
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
              placeholder="Search username, email, name, phone, employee code"
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search users"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:w-[520px]">
          <Select
            id="user_type_filter"
            label="User type"
            value={user_type}
            onChange={(e) => updateParam({ user_type: e.target.value || null })}
          >
            <option value="">All</option>
            <option value="internal">Internal</option>
            <option value="client">Client</option>
            <option value="field">Field</option>
          </Select>
          <Select
            id="is_active_filter"
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
          <Spinner label="Loading users" />
        </div>
      ) : error ? (
        <div className="space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No users found" description="Try adjusting search or filters." />
      ) : (
        <>
          {mobileCards}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Type</TH>
                  <TH>Department</TH>
                  <TH>Status</TH>
                  <TH>Phone</TH>
                  <TH>Employee</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((u) => (
                  <TR key={u.id}>
                    <TD>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-app-text">{displayName(u)}</p>
                        <p className="truncate text-xs text-app-secondary">@{u.username}</p>
                        {u.email ? <p className="truncate text-xs text-app-subtle">{u.email}</p> : null}
                      </div>
                    </TD>
                    <TD>
                      <Badge variant={badgeVariantForUserType(u.user_type)}>{userTypeLabel(u.user_type)}</Badge>
                    </TD>
                    <TD className="text-sm text-app-secondary">
                      {u.department_name ? (
                        <span title={u.department_code || ''}>{u.department_name}</span>
                      ) : (
                        '-'
                      )}
                    </TD>
                    <TD>
                      {u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
                    </TD>
                    <TD className="text-app-secondary">{u.phone_number || '-'}</TD>
                    <TD className="text-app-secondary">{u.employee_code || '-'}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        {canManageAccess ? (
                          <Link
                            to={`/users/${u.id}/access`}
                            className="inline-flex min-h-9 items-center rounded-panel border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text hover:bg-app-muted"
                          >
                            Manage access
                          </Link>
                        ) : null}
                        {canUpdate ? (
                          <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(u)}>
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <Button variant="danger" className="min-h-9 px-3" onClick={() => handleDeactivate(u)}>
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
            <p className="text-xs text-app-subtle">
              {typeof count === 'number' ? `${count} users` : `${rows.length} users`}
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
              <span className="text-xs text-app-secondary">Page {page}{totalPages ? ` / ${totalPages}` : ''}</span>
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
        title={drawerMode === 'create' ? 'Create user' : 'Edit user'}
        description={drawerMode === 'create' ? 'Create a new user in this organization.' : 'Update user details.'}
        footer={
          <div className="flex w-full items-center justify-between">
            <div>
              {drawerMode === 'edit' && editing && (
                <Button 
                  variant="secondary" 
                  onClick={handleSendResetLink} 
                  disabled={formSubmitting || resetSubmitting}
                >
                  {resetSubmitting ? 'Sending...' : 'Send Password Reset Link'}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting || resetSubmitting}>
                Cancel
              </Button>
              <Button type="submit" form={formId} disabled={formSubmitting || resetSubmitting}>
                {formSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        }
      >
        <UserForm
          mode={drawerMode}
          formId={formId}
          submitting={formSubmitting}
          errorMessage={formError}
          fieldErrors={formFieldErrors}
          initialValues={
            drawerMode === 'edit' && editing
              ? {
                  username: editing.username,
                  email: editing.email ?? '',
                  first_name: editing.first_name ?? '',
                  last_name: editing.last_name ?? '',
                  phone_number: editing.phone_number ?? '',
                  employee_code: editing.employee_code ?? '',
                  user_type: editing.user_type,
                  is_active: editing.is_active,
                  is_invited: editing.is_invited,
                  department: editing.department,
                }
              : undefined
          }
          onSubmit={submit}
        />
      </Drawer>
    </div>
  )
}




