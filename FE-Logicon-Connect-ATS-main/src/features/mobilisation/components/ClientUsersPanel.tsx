import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  Loader2,
  Mail,
  Phone,
  Plus,
  Send,
  Star,
  Trash2,
  UserPlus,
} from 'lucide-react'
import type { AccessRole } from '@/api/access'
import {
  createMobilisationUser,
  deleteMobilisationUser,
  getMobilisationEligibleClientRoles,
  getMobilisationSalesContext,
  listMobilisationUsers,
  updateMobilisationUser,
} from '@/api/mobilisation'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import type { MobilisationUser, MobilisationUserWriteInput } from '@/features/mobilisation/types'

interface UserFormState {
  full_name: string
  email: string
  phone: string
  user_type: string
  access_role: string
  scope_level: 'client' | 'site'
  real_site: string
  is_primary_contact: boolean
  send_invite_on_finalization: boolean
}

const USER_FORM_DEFAULTS: UserFormState = {
  full_name: '',
  email: '',
  phone: '',
  user_type: 'client',
  access_role: '',
  scope_level: 'client',
  real_site: '',
  is_primary_contact: false,
  send_invite_on_finalization: true,
}

function inviteStatusLabel(status: string): string {
  const s = status.trim().toLowerCase()
  if (!s || s === 'pending') return 'Pending'
  if (s === 'sent') return 'Invite sent'
  if (s === 'failed') return 'Invite failed'
  return status
}

function userToForm(user: MobilisationUser): UserFormState {
  return {
    full_name: user.full_name,
    email: user.email,
    phone: user.phone ?? '',
    user_type: user.user_type ?? 'client',
    access_role: user.access_role ? String(user.access_role) : '',
    scope_level: user.scope_level === 'site' ? 'site' : 'client',
    real_site: user.real_site != null ? String(user.real_site) : '',
    is_primary_contact: user.is_primary_contact,
    send_invite_on_finalization: user.send_invite_on_finalization,
  }
}

function formToPayload(form: UserFormState): MobilisationUserWriteInput {
  const siteId = form.scope_level === 'site' ? Number(form.real_site) : null
  return {
    full_name: form.full_name.trim(),
    email: form.email.trim(),
    phone: form.phone.trim() || undefined,
    user_type: form.user_type || 'client',
    access_role: Number(form.access_role),
    scope_level: form.scope_level,
    real_site: siteId != null && Number.isFinite(siteId) ? siteId : null,
    is_primary_contact: form.is_primary_contact,
    send_invite_on_finalization: form.send_invite_on_finalization,
    is_active: true,
  }
}

function validateUserForm(form: UserFormState): string | null {
  if (!form.full_name.trim()) return 'Full name is required.'
  if (!form.email.trim()) return 'Email is required.'
  if (!form.access_role) return 'Portal role is required.'
  if (form.scope_level === 'site' && !form.real_site) return 'Site is required for site-level users.'
  return null
}

export interface ClientUsersPanelProps {
  requestId: number
  isEditable: boolean
  isFinalized: boolean
  onMarkSetupCompleted: () => Promise<void>
  markingComplete: boolean
  onUsersChanged?: () => void
}

export function ClientUsersPanel({
  requestId,
  isEditable,
  isFinalized,
  onMarkSetupCompleted,
  markingComplete,
  onUsersChanged,
}: ClientUsersPanelProps) {
  const [users, setUsers] = useState<MobilisationUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [accessRoles, setAccessRoles] = useState<AccessRole[]>([])
  const [accessRolesLoading, setAccessRolesLoading] = useState(false)

  const [availableSites, setAvailableSites] = useState<Array<{ id: number; name: string | null }>>([])

  const [addDrawerOpen, setAddDrawerOpen] = useState(false)
  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [form, setForm] = useState<UserFormState>(USER_FORM_DEFAULTS)
  const [formError, setFormError] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<MobilisationUser | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [toggleBusyId, setToggleBusyId] = useState<number | null>(null)

  const userFormDirty = addDrawerOpen || editDrawerOpen

  const refreshUsers = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await listMobilisationUsers(requestId)
      setUsers(res.items)
    } catch (e: unknown) {
      setLoadError(parseApiError(e, 'Failed to load client users').message)
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    void refreshUsers()
  }, [refreshUsers])

  useEffect(() => {
    if (!isEditable || (!addDrawerOpen && !editDrawerOpen)) return
    let cancelled = false
    void (async () => {
      setAccessRolesLoading(true)
      try {
        const res = await getMobilisationEligibleClientRoles(requestId, form.scope_level)
        if (cancelled) return
        setAccessRoles(res.items)
        // Clear role if not in eligible list
        setForm((prev) => {
          const currentRoleId = Number(prev.access_role)
          if (currentRoleId && !res.items.some((r) => r.id === currentRoleId)) {
            return { ...prev, access_role: '' }
          }
          return prev
        })
      } catch {
        if (!cancelled) setAccessRoles([])
      } finally {
        if (!cancelled) setAccessRolesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [requestId, form.scope_level, addDrawerOpen, editDrawerOpen, isEditable])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const ctx = await getMobilisationSalesContext(requestId)
        if (cancelled) return
        setAvailableSites(
          (ctx.sites ?? []).map((s) => ({ id: s.id, name: s.site_name })),
        )
      } catch {
        if (!cancelled) setAvailableSites([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [requestId])

  const activeUsers = useMemo(() => users.filter((u) => u.is_active), [users])
  const hasPrimaryContact = activeUsers.some((u) => u.is_primary_contact)
  const allInvitesDisabled =
    activeUsers.length > 0 && activeUsers.every((u) => !u.send_invite_on_finalization)
  const isReady = true

  function setField(field: keyof UserFormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleScopeChange(newScope: 'client' | 'site') {
    setForm((prev) => ({
      ...prev,
      scope_level: newScope,
      real_site: newScope === 'client' ? '' : prev.real_site,
    }))
  }

  function openAddDrawer() {
    setForm(USER_FORM_DEFAULTS)
    setFormError(null)
    setAddDrawerOpen(true)
  }

  function openEditDrawer(user: MobilisationUser) {
    setForm(userToForm(user))
    setEditingUserId(user.id)
    setFormError(null)
    setEditDrawerOpen(true)
  }

  async function handleCreateUser() {
    const err = validateUserForm(form)
    if (err) {
      setFormError(err)
      return
    }
    setFormSubmitting(true)
    setFormError(null)
    try {
      await createMobilisationUser(requestId, formToPayload(form))
      setAddDrawerOpen(false)
      setForm(USER_FORM_DEFAULTS)
      await refreshUsers()
      onUsersChanged?.()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Could not add user').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleUpdateUser() {
    if (editingUserId == null) return
    const err = validateUserForm(form)
    if (err) {
      setFormError(err)
      return
    }
    setFormSubmitting(true)
    setFormError(null)
    try {
      await updateMobilisationUser(requestId, editingUserId, formToPayload(form))
      setEditDrawerOpen(false)
      setEditingUserId(null)
      setForm(USER_FORM_DEFAULTS)
      await refreshUsers()
      onUsersChanged?.()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Could not update user').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteMobilisationUser(requestId, deleteTarget.id)
      setDeleteTarget(null)
      await refreshUsers()
      onUsersChanged?.()
    } catch (e: unknown) {
      setDeleteError(parseApiError(e, 'Could not remove user').message)
    } finally {
      setDeleteBusy(false)
    }
  }

  async function patchUser(
    user: MobilisationUser,
    patch: Partial<MobilisationUserWriteInput>,
  ) {
    setToggleBusyId(user.id)
    try {
      await updateMobilisationUser(requestId, user.id, patch)
      await refreshUsers()
      onUsersChanged?.()
    } catch (e: unknown) {
      setLoadError(parseApiError(e, 'Could not update user').message)
    } finally {
      setToggleBusyId(null)
    }
  }

  let markDisabledReason = ''
  let markDisabled = true
  if (!isEditable) {
    markDisabledReason = 'Setup is locked in the current status.'
  } else if (userFormDirty) {
    markDisabledReason = 'Finish or cancel the open user form first.'
  } else if (markingComplete) {
    markDisabledReason = 'Completing setup…'
  } else {
    markDisabled = false
  }

  const userFormDrawer = (
    <div className="space-y-4">
      {formError ? <ErrorState message={formError} /> : null}
      <Input
        id="mob_user_full_name"
        label="Full name *"
        value={form.full_name}
        onChange={(e) => setField('full_name', e.target.value)}
        disabled={formSubmitting}
      />
      <Input
        id="mob_user_email"
        label="Email *"
        type="email"
        value={form.email}
        onChange={(e) => setField('email', e.target.value)}
        disabled={formSubmitting}
      />
      <Input
        id="mob_user_phone"
        label="Phone"
        value={form.phone}
        onChange={(e) => setField('phone', e.target.value)}
        disabled={formSubmitting}
      />
      <Select
        id="mob_user_scope"
        label="User scope"
        value={form.scope_level}
        onChange={(e) => handleScopeChange(e.target.value as 'client' | 'site')}
        disabled={formSubmitting}
      >
        <option value="client">Client-level user</option>
        <option value="site">Site-level user</option>
      </Select>
      <p className="mt-1 text-xs text-app-subtle">
        {form.scope_level === 'client'
          ? 'Can access company-level portal data for this client.'
          : 'Can access only the selected site.'}
      </p>
      <Select
        id="mob_user_access_role"
        label="Portal role *"
        value={form.access_role}
        onChange={(e) => setField('access_role', e.target.value)}
        disabled={formSubmitting || accessRolesLoading}
      >
        <option value="">{accessRolesLoading ? 'Loading roles...' : 'Select a portal role'}</option>
        {accessRoles.map((role) => (
          <option key={role.id} value={String(role.id)}>
            {role.name}
          </option>
        ))}
      </Select>
      {accessRoles.length === 0 && !accessRolesLoading && (
        <p className="text-xs text-amber-600">
          No eligible portal roles are configured for this scope.
        </p>
      )}
      {form.scope_level === 'site' ? (
        <Select
          id="mob_user_site"
          label="Site *"
          value={form.real_site}
          onChange={(e) => setField('real_site', e.target.value)}
          disabled={formSubmitting}
        >
          <option value="">Select a site</option>
          {availableSites.map((site) => (
            <option key={site.id} value={String(site.id)}>
              {site.name ?? `Site #${site.id}`}
            </option>
          ))}
        </Select>
      ) : null}
      <div className="space-y-3 border-t border-app-border pt-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={form.is_primary_contact}
            onChange={(e) => setField('is_primary_contact', e.target.checked)}
            disabled={formSubmitting}
            className="rounded border-app-border"
          />
          Primary contact
        </label>
        <label className="flex cursor-pointer items-start gap-2 text-sm text-app-text">
          <input
            type="checkbox"
            checked={form.send_invite_on_finalization}
            onChange={(e) => setField('send_invite_on_finalization', e.target.checked)}
            disabled={formSubmitting}
            className="mt-0.5 rounded border-app-border"
          />
          <span>
            Send invite on finalization
            <span className="mt-0.5 block text-xs text-app-subtle">Portal access email after mobilisation is finalized</span>
          </span>
        </label>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-app-secondary">
        Add the client users who will access the portal and raise manpower requests.
      </p>

      {loadError ? <ErrorState message={loadError} /> : null}

      {loading ? (
        <Spinner label="Loading client users..." />
      ) : (
        <>
          {isEditable ? (
            <div className="flex justify-end">
              <Button variant="secondary" className="min-h-9" onClick={openAddDrawer}>
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Add user
              </Button>
            </div>
          ) : null}

          {users.length === 0 ? (
            <div className="rounded-xl border border-dashed border-app-border bg-app-muted/30 p-8 text-center">
              <UserPlus className="mx-auto h-8 w-8 text-app-subtle" aria-hidden />
              <p className="mt-3 text-sm font-medium text-app-text">No client users yet</p>
              {isEditable ? (
                <p className="mt-1 text-xs text-app-secondary">Add at least one user before marking setup completed.</p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <UserRowCard
                  key={user.id}
                  user={user}
                  isEditable={isEditable && !isFinalized}
                  isFinalized={isFinalized}
                  toggleBusy={toggleBusyId === user.id}
                  onEdit={() => openEditDrawer(user)}
                  onRemove={() => {
                    setDeleteError(null)
                    setDeleteTarget(user)
                  }}
                  onTogglePrimary={() =>
                    void patchUser(user, { is_primary_contact: !user.is_primary_contact })
                  }
                  onToggleInvite={() =>
                    void patchUser(user, {
                      send_invite_on_finalization: !user.send_invite_on_finalization,
                    })
                  }
                  onDeactivate={() =>
                    void patchUser(user, { is_active: false })
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="rounded-xl border border-app-border bg-app-surface shadow-sm overflow-hidden">
        <div className="border-b border-app-border bg-slate-50/80 px-4 py-3 dark:bg-slate-800/30">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-brand-600" aria-hidden />
            <p className="text-sm font-semibold text-app-text">Client user setup</p>
            {isReady ? (
              <Badge variant="success" className="text-xs">
                Ready
              </Badge>
            ) : (
              <Badge variant="attention" className="text-xs">
                Not ready
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-app-secondary">
            Optional: Add client users who will access the portal and raise manpower requests.
          </p>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            {activeUsers.length >= 1 ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
            )}
            <span className="text-app-text">
              {activeUsers.length} active user{activeUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          {!hasPrimaryContact && activeUsers.length > 0 ? (
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              No primary contact selected.
            </p>
          ) : null}
          {allInvitesDisabled ? (
            <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Invite is disabled for all users.
            </p>
          ) : null}

          {isEditable ? (
            <div>
              <Button
                className="min-h-9 w-full sm:w-auto"
                disabled={markDisabled}
                onClick={() => void onMarkSetupCompleted()}
              >
                {markingComplete ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  'Mark setup completed'
                )}
              </Button>
              {markDisabled && markDisabledReason ? (
                <p className="mt-2 text-xs text-app-subtle">{markDisabledReason}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <Drawer
        open={addDrawerOpen}
        title="Add client user"
        description="This user will be created in the portal when mobilisation is finalized."
        onClose={() => !formSubmitting && setAddDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={formSubmitting} onClick={() => setAddDrawerOpen(false)}>
              Cancel
            </Button>
            <Button disabled={formSubmitting} onClick={() => void handleCreateUser()}>
              {formSubmitting ? 'Saving…' : 'Add user'}
            </Button>
          </div>
        }
      >
        {userFormDrawer}
      </Drawer>

      <Drawer
        open={editDrawerOpen}
        title="Edit client user"
        onClose={() => !formSubmitting && setEditDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={formSubmitting} onClick={() => setEditDrawerOpen(false)}>
              Cancel
            </Button>
            <Button disabled={formSubmitting} onClick={() => void handleUpdateUser()}>
              {formSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        {userFormDrawer}
      </Drawer>

      <Drawer
        open={deleteTarget != null}
        title="Remove client user"
        description={
          deleteTarget
            ? `Remove ${deleteTarget.full_name} from this mobilisation setup?`
            : undefined
        }
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button disabled={deleteBusy} onClick={() => void handleConfirmDelete()}>
              {deleteBusy ? 'Removing…' : 'Remove'}
            </Button>
          </div>
        }
      >
        {deleteError ? <ErrorState message={deleteError} /> : null}
      </Drawer>
    </div>
  )
}

function UserRowCard({
  user,
  isEditable,
  isFinalized,
  toggleBusy,
  onEdit,
  onRemove,
  onTogglePrimary,
  onToggleInvite,
  onDeactivate,
}: {
  user: MobilisationUser
  isEditable: boolean
  isFinalized: boolean
  toggleBusy: boolean
  onEdit: () => void
  onRemove: () => void
  onTogglePrimary: () => void
  onToggleInvite: () => void
  onDeactivate: () => void
}) {
  const statusLine = useMemo(() => {
    if (!user.is_active) return 'Inactive'
    if (user.created_user != null) {
      const invite = inviteStatusLabel(user.invite_status)
      return `User #${user.created_user} · ${invite}`
    }
    if (isFinalized) return 'Awaiting user record'
    return 'Proposed'
  }, [user, isFinalized])

  return (
    <div
      className={`rounded-xl border border-app-border bg-app-surface p-4 shadow-sm ${!user.is_active ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-app-text">{user.full_name}</p>
            {user.is_primary_contact ? (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-amber-600">
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden />
                Primary
              </span>
            ) : null}
            <Badge variant={user.scope_level === 'site' ? 'info' : 'neutral'} className="text-xs">
              {user.scope_level === 'site' ? 'Site' : 'Client'}
            </Badge>
            {!user.is_active ? (
              <Badge variant="neutral" className="text-xs">
                Inactive
              </Badge>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-secondary">
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" aria-hidden />
              {user.email}
            </span>
            {user.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="h-3 w-3" aria-hidden />
                {user.phone}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {user.access_role_name ? (
              <Badge variant="neutral">{user.access_role_name}</Badge>
            ) : null}
            {user.real_site_name ? <span className="text-app-subtle">Site: {user.real_site_name}</span> : null}
            {user.send_invite_on_finalization ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Send className="h-3 w-3" aria-hidden />
                Invite enabled
              </span>
            ) : (
              <span className="text-app-subtle">Invite disabled</span>
            )}
          </div>
          <p className="mt-2 text-xs text-app-subtle">{statusLine}</p>
          {user.invite_error?.trim() ? (
            <p className="mt-1 text-xs text-status-danger">{user.invite_error}</p>
          ) : null}
        </div>
        {isEditable && user.is_active ? (
          <div className="flex shrink-0 flex-wrap gap-1">
            <Button variant="secondary" className="min-h-8 px-3 text-xs" onClick={onEdit} disabled={toggleBusy}>
              Edit
            </Button>
            <Button variant="secondary" className="min-h-8 px-2" onClick={onRemove} disabled={toggleBusy}>
              <Trash2 className="h-3.5 w-3.5 text-status-danger" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>
      {isEditable && user.is_active ? (
        <div className="mt-3 flex flex-wrap gap-4 border-t border-app-border pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-app-secondary">
            <input
              type="checkbox"
              checked={user.is_primary_contact}
              onChange={onTogglePrimary}
              disabled={toggleBusy}
              className="rounded border-app-border"
            />
            Primary contact
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-app-secondary">
            <input
              type="checkbox"
              checked={user.send_invite_on_finalization}
              onChange={onToggleInvite}
              disabled={toggleBusy}
              className="rounded border-app-border"
            />
            Invite on finalization
          </label>
          <Button
            variant="secondary"
            className="min-h-7 px-2 text-xs"
            disabled={toggleBusy}
            onClick={onDeactivate}
          >
            Deactivate
          </Button>
        </div>
      ) : null}
    </div>
  )
}
