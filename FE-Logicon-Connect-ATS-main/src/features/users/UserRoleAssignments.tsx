import { useEffect, useState } from 'react'
import { Building2, Key, MapPin, Plus, Trash2 } from 'lucide-react'
import { listRoles, listScopeNodes, listUserRoleAssignments, createUserRoleAssignment, deleteUserRoleAssignment, type AccessRole, type ScopeNode, type UserRoleAssignmentRow } from '@/api/access'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { parseApiError } from '@/lib/apiError'

function scopeTypeLabel(nodeType: string | undefined): string | null {
  if (!nodeType) return null
  const map: Record<string, string> = {
    company: 'Company',
    client: 'Client',
    site: 'Site',
    department: 'Department',
    region: 'Region',
    city: 'City',
    cost_center: 'Cost center',
  }
  return map[nodeType] ?? nodeType
}

function scopeTypeVariant(nodeType: string | undefined): 'info' | 'success' | 'warning' | 'neutral' {
  if (!nodeType) return 'neutral'
  const map: Record<string, 'info' | 'success' | 'warning' | 'neutral'> = {
    company: 'info',
    client: 'success',
    site: 'warning',
  }
  return map[nodeType] ?? 'neutral'
}

export function UserRoleAssignments({ userId }: { userId: number }) {
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canEdit = hasAnyCapability(caps, [CAP.ROLE_UPDATE])
  const canView = hasAnyCapability(caps, [CAP.ROLE_READ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<UserRoleAssignmentRow[]>([])

  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [roles, setRoles] = useState<AccessRole[]>([])
  const [scopeNodes, setScopeNodes] = useState<ScopeNode[]>([])

  const [roleId, setRoleId] = useState<number | ''>('')
  const [scopeNodeId, setScopeNodeId] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  async function refresh() {
    if (!canView) {
      setRows([])
      setError('Missing capability: role.read')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await listUserRoleAssignments(userId)
      setRows(data)
    } catch (e: unknown) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Failed to load access assignments')
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    setLookupsLoading(true)
    setLookupError(null)
    try {
      const [r, s] = await Promise.all([listRoles(), listScopeNodes()])
      setRoles(r.items)
      setScopeNodes(s)
    } catch (e: unknown) {
      setRoles([])
      setScopeNodes([])
      setLookupError(e instanceof Error ? e.message : 'Lookup API failed')
    } finally {
      setLookupsLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    if (canEdit) {
      void loadLookups()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit])

  const addDisabled = !canEdit || !!lookupError || lookupsLoading || !roleId || !scopeNodeId || submitting

  async function add() {
    if (addDisabled || typeof roleId !== 'number' || typeof scopeNodeId !== 'number') return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createUserRoleAssignment({ user: userId, role: roleId, scope_node: scopeNodeId })
      setRoleId('')
      setScopeNodeId('')
      await refresh()
    } catch (e: unknown) {
      const parsed = parseApiError(e, 'Failed to add access assignment')
      setSubmitError(parsed.fields.scope_node || parsed.message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: number) {
    if (!canEdit) return
    const ok = window.confirm('Remove this access assignment?')
    if (!ok) return
    try {
      await deleteUserRoleAssignment(id)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Remove failed')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
            <Key className="h-5 w-5 text-brand-600" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-text">Access Assignments</h3>
            <p className="text-sm text-app-secondary">Role-based access at company, client, or site level</p>
          </div>
        </div>
        {canEdit ? (
          <Badge variant="info">Editable</Badge>
        ) : (
          <Badge variant="neutral">Read-only</Badge>
        )}
      </div>

      {/* Assignments List */}
      <div className="rounded-xl border border-app-border bg-app-surface shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner label="Loading access assignments" />
          </div>
        ) : error ? (
          <div className="p-5 space-y-3">
            <ErrorState message={error} />
            <Button variant="secondary" onClick={() => refresh()}>
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No access assignments"
              description="Add a role at a company, client, or site to grant access."
            />
          </div>
        ) : (
          <ul className="divide-y divide-app-border">
            {rows.map((r) => {
              const typeLbl = scopeTypeLabel(r.role_node_type_scope)
              return (
                <li
                  key={r.id}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-app-muted/50"
                >
                  {/* Icon */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                    {r.role_node_type_scope === 'site' ? (
                      <MapPin className="h-5 w-5 text-brand-600" aria-hidden />
                    ) : (
                      <Building2 className="h-5 w-5 text-brand-600" aria-hidden />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-app-text">{r.role_name}</span>
                      <span className="rounded bg-app-muted px-1.5 py-0.5 font-mono text-[11px] text-app-subtle">
                        {r.role_code}
                      </span>
                      {typeLbl ? (
                        <Badge variant={scopeTypeVariant(r.role_node_type_scope)}>{typeLbl}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-app-secondary">{r.scope_node_path}</p>
                  </div>

                  {/* Actions */}
                  {canEdit ? (
                    <div className="shrink-0 opacity-60 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        className="min-h-9 px-3 text-status-danger hover:bg-status-danger/10"
                        onClick={() => remove(r.id)}
                        aria-label="Remove assignment"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Add Assignment Card */}
      {canEdit ? (
        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100">
              <Plus className="h-4 w-4 text-brand-600" aria-hidden />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-app-text">Add Access Assignment</h4>
              {lookupsLoading ? (
                <span className="text-xs text-app-subtle">Loading options...</span>
              ) : null}
            </div>
          </div>

          {lookupError ? (
            <div className="mb-4">
              <ErrorState message={`Lookup API failed. Add is disabled. ${lookupError}`} />
            </div>
          ) : null}

          {submitError ? (
            <div className="mb-4">
              <ErrorState message={submitError} />
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="role"
              label="Role"
              value={roleId === '' ? '' : String(roleId)}
              onChange={(e) => setRoleId(e.target.value ? Number(e.target.value) : '')}
              disabled={!canEdit || lookupsLoading || !!lookupError}
            >
              <option value="">Select role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} ({role.code})
                </option>
              ))}
            </Select>
            <Select
              id="scope_node"
              label="Company / Client / Site"
              value={scopeNodeId === '' ? '' : String(scopeNodeId)}
              onChange={(e) => setScopeNodeId(e.target.value ? Number(e.target.value) : '')}
              disabled={!canEdit || lookupsLoading || !!lookupError}
            >
              <option value="">Select location</option>
              {scopeNodes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.path || `${s.name} (${s.node_type})`}
                </option>
              ))}
            </Select>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={add}
              disabled={addDisabled}
              className="gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden />
              {submitting ? 'Adding...' : 'Add Assignment'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
