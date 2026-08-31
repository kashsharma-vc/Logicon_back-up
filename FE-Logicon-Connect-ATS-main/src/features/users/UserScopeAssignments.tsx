import { useEffect, useState } from 'react'
import {
  listScopeNodes,
  listUserScopeAssignments,
  createUserScopeAssignment,
  deleteUserScopeAssignment,
  type ScopeNode,
  type UserScopeAssignmentRow,
} from '@/api/access'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { assignmentTypeOptions, type AssignmentType } from '@/features/users/types'
import { parseApiError } from '@/lib/apiError'

export function UserScopeAssignments({ userId }: { userId: number }) {
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canEdit = hasAnyCapability(caps, [CAP.ROLE_UPDATE])
  const canView = hasAnyCapability(caps, [CAP.ROLE_READ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<UserScopeAssignmentRow[]>([])

  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [scopeNodes, setScopeNodes] = useState<ScopeNode[]>([])

  const [scopeNodeId, setScopeNodeId] = useState<number | ''>('')
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('primary')
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
      const data = await listUserScopeAssignments(userId)
      setRows(data)
    } catch (e: unknown) {
      setRows([])
      setError(e instanceof Error ? e.message : 'Failed to load scope assignments')
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    setLookupsLoading(true)
    setLookupError(null)
    try {
      const s = await listScopeNodes()
      setScopeNodes(s)
    } catch (e: unknown) {
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

  const addDisabled = !canEdit || !!lookupError || lookupsLoading || !scopeNodeId || submitting

  async function add() {
    if (addDisabled || typeof scopeNodeId !== 'number') return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await createUserScopeAssignment({ user: userId, scope_node: scopeNodeId, assignment_type: assignmentType })
      setScopeNodeId('')
      setAssignmentType('primary')
      await refresh()
    } catch (e: unknown) {
      setSubmitError(parseApiError(e, 'Failed to add scope assignment').message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: number) {
    if (!canEdit) return
    const ok = window.confirm('Remove this scope assignment?')
    if (!ok) return
    try {
      await deleteUserScopeAssignment(id)
      await refresh()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Remove failed')
    }
  }

  return (
    <section className="rounded-panel border border-app-border bg-app-surface p-5 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-app-text">Scope assignments</h3>
          <p className="mt-1 text-xs text-app-secondary">Scope membership rows (informational in backend).</p>
        </div>
        {canEdit ? <Badge variant="info">Editable</Badge> : <Badge variant="neutral">Read-only</Badge>}
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center">
          <Spinner label="Loading scope assignments" />
        </div>
      ) : error ? (
        <div className="mt-4 space-y-3">
          <ErrorState message={error} />
          <Button variant="secondary" onClick={() => refresh()}>
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No scope assignments" description="Add a scope assignment for membership context." />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 rounded-panel border border-app-border bg-app-muted p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-app-text">
                    <span className="font-mono text-xs text-app-secondary">{r.scope_node_path}</span>
                  </p>
                  <p className="mt-1 text-xs text-app-subtle">Type: {r.assignment_type}</p>
                </div>
                {canEdit ? (
                  <Button variant="danger" className="min-h-9 px-3" onClick={() => remove(r.id)}>
                    Remove
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-panel border border-app-border bg-app-muted p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-app-text">Add scope assignment</p>
          {lookupsLoading ? <span className="text-xs text-app-subtle">Loading lookups...</span> : null}
        </div>

        {lookupError ? (
          <div className="mt-3">
            <ErrorState message={`Lookup API failed. Add is disabled. ${lookupError}`} />
          </div>
        ) : null}

        {submitError ? (
          <div className="mt-3">
            <ErrorState message={submitError} />
          </div>
        ) : null}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Select
            id="scope_node_scope"
            label="Scope node"
            value={scopeNodeId === '' ? '' : String(scopeNodeId)}
            onChange={(e) => setScopeNodeId(e.target.value ? Number(e.target.value) : '')}
            disabled={!canEdit || lookupsLoading || !!lookupError}
          >
            <option value="">Select scope</option>
            {scopeNodes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.path || `${s.name} (${s.node_type})`}
              </option>
            ))}
          </Select>
          <Select
            id="assignment_type"
            label="Assignment type"
            value={assignmentType}
            onChange={(e) => setAssignmentType(e.target.value as AssignmentType)}
            disabled={!canEdit || lookupsLoading || !!lookupError}
          >
            {assignmentTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex justify-end">
          <Button variant="primary" onClick={add} disabled={addDisabled}>
            {submitting ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </div>
    </section>
  )
}




