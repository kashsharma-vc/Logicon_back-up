import { useCallback, useEffect, useState } from 'react'
import {
  createProposedUser,
  deleteProposedUser,
  resendProposedUserInvite,
  updateProposedUser,
} from '@/api/clientOnboarding'
import { listRoles, type AccessRole } from '@/api/access'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type {
  ClientOnboardingProposedUser,
  ClientOnboardingProposedUserWriteInput,
  ClientOnboardingRow,
  ProposedSiteRow,
} from '@/features/clientOnboarding/types'
import {
  proposedUserInviteStatusLabel,
  proposedUserScopeLabel,
  proposedUserTypeLabel,
} from '@/features/clientOnboarding/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function loadActiveRoles(): Promise<AccessRole[]> {
  const all: AccessRole[] = []
  let page = 1
  for (;;) {
    const res = await listRoles({ is_active: true, page })
    all.push(...res.items.filter((r) => r.is_active))
    if (!res.items.length) break
    if (res.count != null && all.length >= res.count) break
    page += 1
    if (page > 50) break
  }
  return all
}

function roleDisplay(u: ClientOnboardingProposedUser): string {
  if (u.access_role_name?.trim()) {
    return u.access_role_code?.trim() ?
        `${u.access_role_name} (${u.access_role_code})`
      : u.access_role_name
  }
  return u.access_role_code?.trim() || (u.access_role != null ? `Role #${u.access_role}` : '—')
}

const emptyUserForm = () => ({
  full_name: '',
  email: '',
  phone: '',
  user_type: 'client' as string,
  access_role: '',
  scope_level: 'client' as string,
  proposed_site: '',
  is_primary_contact: 'false',
  send_invite_on_finalization: 'true',
  is_active: 'true',
})

export function ClientOnboardingProposedUsersSection({
  requestId,
  row,
  sites,
  onRefresh,
  showFinalizationFields,
}: {
  requestId: number
  row: ClientOnboardingRow
  sites: ProposedSiteRow[]
  onRefresh: () => void | Promise<void>
  showFinalizationFields: boolean
}) {
  const canMutate = row.status === 'draft' || row.status === 'rejected'
  const users = row.proposed_users ?? []

  const [roles, setRoles] = useState<AccessRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(true)
  const [rolesError, setRolesError] = useState<string | null>(null)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<ClientOnboardingProposedUser | null>(null)
  const [form, setForm] = useState(emptyUserForm)
  const [resendingId, setResendingId] = useState<number | null>(null)
  const [resentSuccessId, setResentSuccessId] = useState<number | null>(null)
  const [resendErrorById, setResendErrorById] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setRolesLoading(true)
      setRolesError(null)
      try {
        const items = await loadActiveRoles()
        if (!cancelled) setRoles(items)
      } catch (e: unknown) {
        if (!cancelled) setRolesError(parseApiError(e, 'Failed to load roles').message)
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const openCreate = useCallback(() => {
    setEdit(null)
    setForm(emptyUserForm())
    setError(null)
    setDrawerOpen(true)
  }, [])

  const openEdit = useCallback((u: ClientOnboardingProposedUser) => {
    setEdit(u)
    setForm({
      full_name: u.full_name,
      email: u.email,
      phone: u.phone ?? '',
      user_type: u.user_type,
      access_role: String(u.access_role),
      scope_level: u.scope_level,
      proposed_site: u.proposed_site != null ? String(u.proposed_site) : '',
      is_primary_contact: u.is_primary_contact ? 'true' : 'false',
      send_invite_on_finalization: u.send_invite_on_finalization ? 'true' : 'false',
      is_active: u.is_active ? 'true' : 'false',
    })
    setError(null)
    setDrawerOpen(true)
  }, [])

  async function save() {
    setError(null)
    const name = form.full_name.trim()
    const email = form.email.trim()
    if (!name) {
      setError('Full name is required.')
      return
    }
    if (!email || !EMAIL_RE.test(email)) {
      setError('A valid email is required.')
      return
    }
    const accessRole = Number(form.access_role)
    if (!Number.isFinite(accessRole) || accessRole <= 0) {
      setError('Access role is required.')
      return
    }
    if (form.scope_level === 'site' && !form.proposed_site) {
      setError('Proposed site is required for site-level users.')
      return
    }

    const payload: ClientOnboardingProposedUserWriteInput = {
      full_name: name,
      email,
      phone: form.phone.trim() || undefined,
      user_type: form.user_type,
      access_role: accessRole,
      scope_level: form.scope_level,
      proposed_site: form.scope_level === 'site' ? Number(form.proposed_site) : null,
      is_primary_contact: form.is_primary_contact === 'true',
      send_invite_on_finalization: form.send_invite_on_finalization === 'true',
      is_active: form.is_active === 'true',
    }

    setSaving(true)
    try {
      if (edit) {
        await updateProposedUser(requestId, edit.id, payload)
      } else {
        await createProposedUser(requestId, payload)
      }
      setDrawerOpen(false)
      await onRefresh()
    } catch (e: unknown) {
      setError(parseApiError(e, 'Save failed').message)
    } finally {
      setSaving(false)
    }
  }

  async function resendInvite(u: ClientOnboardingProposedUser) {
    setResendErrorById((prev) => {
      const next = { ...prev }
      delete next[u.id]
      return next
    })
    setResentSuccessId(null)
    setResendingId(u.id)
    try {
      await resendProposedUserInvite(requestId, u.id)
      setResentSuccessId(u.id)
      await onRefresh()
    } catch (e: unknown) {
      setResendErrorById((prev) => ({
        ...prev,
        [u.id]: parseApiError(e, 'Could not resend invite.').message,
      }))
    } finally {
      setResendingId(null)
    }
  }

  async function remove(u: ClientOnboardingProposedUser) {
    if (!window.confirm(`Remove proposed user ${u.full_name}?`)) return
    try {
      await deleteProposedUser(requestId, u.id)
      await onRefresh()
    } catch (e: unknown) {
      window.alert(parseApiError(e, 'Delete failed').message)
    }
  }

  return (
    <>
      <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-app-text">Proposed users</p>
          {canMutate ? (
            <Button type="button" className="min-h-9" onClick={openCreate} disabled={rolesLoading}>
              Add proposed user
            </Button>
          ) : null}
        </div>
        {rolesError ? <p className="mt-2 text-xs text-status-danger">{rolesError}</p> : null}
        {users.length === 0 ? (
          <p className="mt-2 text-sm text-app-secondary">No proposed users found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Name / email</TH>
                  <TH className="py-2">Phone</TH>
                  <TH className="py-2">User type</TH>
                  <TH className="py-2">Access role</TH>
                  <TH className="py-2">Scope</TH>
                  <TH className="py-2">Site</TH>
                  <TH className="py-2">Contact</TH>
                  <TH className="py-2">Invite</TH>
                  {showFinalizationFields ? <TH className="py-2">Created user</TH> : null}
                  <TH className="py-2">Active</TH>
                  {canMutate || showFinalizationFields ? <TH className="py-2 text-right">Actions</TH> : null}
                </TR>
              </THead>
              <TBody>
                {users.map((u) => (
                  <TR key={u.id}>
                    <TD className="py-2 text-sm">
                      <span className="font-medium text-app-text">{u.full_name}</span>
                      <br />
                      <span className="text-xs text-app-secondary">{u.email}</span>
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{u.phone?.trim() || '—'}</TD>
                    <TD className="py-2 text-xs">{proposedUserTypeLabel(u.user_type)}</TD>
                    <TD className="py-2 text-xs text-app-secondary">{roleDisplay(u)}</TD>
                    <TD className="py-2 text-xs">{proposedUserScopeLabel(u.scope_level)}</TD>
                    <TD className="py-2 text-xs text-app-secondary">{u.proposed_site_name?.trim() || '—'}</TD>
                    <TD className="py-2">
                      {u.is_primary_contact ? <Badge variant="info">Primary contact</Badge> : <span className="text-xs text-app-subtle">—</span>}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {proposedUserInviteStatusLabel(u.invite_status)}
                      {u.invite_status === 'failed' && u.invite_error?.trim() ? (
                        <p className="mt-0.5 text-status-danger">{u.invite_error}</p>
                      ) : null}
                    </TD>
                    {showFinalizationFields ? (
                      <TD className="py-2 text-xs text-app-secondary">
                        {u.created_user != null && u.created_user > 0 ? `#${u.created_user}` : '—'}
                      </TD>
                    ) : null}
                    <TD className="py-2">{u.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}</TD>
                    {canMutate || showFinalizationFields ? (
                      <TD className="py-2 text-right">
                        <div className="flex flex-col items-end gap-2">
                          {showFinalizationFields && u.created_user != null && u.created_user > 0 ? (
                            <>
                              <Button
                                variant="secondary"
                                className="min-h-8 px-2"
                                type="button"
                                disabled={resendingId === u.id}
                                onClick={() => void resendInvite(u)}
                              >
                                {resendingId === u.id ? 'Sending…' : 'Resend invite'}
                              </Button>
                              {resentSuccessId === u.id ? (
                                <p className="text-xs text-status-success">Invite sent.</p>
                              ) : null}
                              {resendErrorById[u.id] ? (
                                <p className="max-w-[14rem] text-right text-xs text-status-danger">{resendErrorById[u.id]}</p>
                              ) : null}
                            </>
                          ) : null}
                          {canMutate ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="secondary" className="min-h-8 px-2" type="button" onClick={() => openEdit(u)}>
                                Edit
                              </Button>
                              <Button variant="danger" className="min-h-8 px-2" type="button" onClick={() => void remove(u)}>
                                Remove
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        )}
      </section>

      <Drawer
        open={drawerOpen}
        onClose={() => !saving && setDrawerOpen(false)}
        title={edit ? 'Edit proposed user' : 'Add proposed user'}
        description="Login users are created only after final approval."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDrawerOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={saving || rolesLoading}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {error ? <ErrorState message={error} /> : null}
          <Input
            id="co_pu_name"
            label="Full name"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
          />
          <Input
            id="co_pu_email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            id="co_pu_phone"
            label="Phone (optional)"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Select
            id="co_pu_type"
            label="User type"
            value={form.user_type}
            onChange={(e) => setForm((f) => ({ ...f, user_type: e.target.value }))}
          >
            <option value="client">Client user</option>
            <option value="site_manager">Site manager</option>
          </Select>
          <Select
            id="co_pu_role"
            label="Access role"
            value={form.access_role}
            onChange={(e) => setForm((f) => ({ ...f, access_role: e.target.value }))}
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name} ({r.code})
              </option>
            ))}
          </Select>
          <Select
            id="co_pu_scope"
            label="Scope level"
            value={form.scope_level}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                scope_level: e.target.value,
                proposed_site: e.target.value === 'client' ? '' : f.proposed_site,
              }))
            }
          >
            <option value="client">Client</option>
            <option value="site">Site</option>
          </Select>
          {form.scope_level === 'site' ? (
            <Select
              id="co_pu_site"
              label="Proposed site"
              value={form.proposed_site}
              onChange={(e) => setForm((f) => ({ ...f, proposed_site: e.target.value }))}
            >
              <option value="">Select site</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name} ({s.code})
                </option>
              ))}
            </Select>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-app-secondary">
            <input
              type="checkbox"
              checked={form.is_primary_contact === 'true'}
              onChange={(e) => setForm((f) => ({ ...f, is_primary_contact: e.target.checked ? 'true' : 'false' }))}
            />
            Primary contact
          </label>
          <label className="flex items-center gap-2 text-sm text-app-secondary">
            <input
              type="checkbox"
              checked={form.send_invite_on_finalization === 'true'}
              onChange={(e) =>
                setForm((f) => ({ ...f, send_invite_on_finalization: e.target.checked ? 'true' : 'false' }))
              }
            />
            Send invite on finalization
          </label>
          <label className="flex items-center gap-2 text-sm text-app-secondary">
            <input
              type="checkbox"
              checked={form.is_active === 'true'}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked ? 'true' : 'false' }))}
            />
            Active
          </label>
        </div>
      </Drawer>
    </>
  )
}
