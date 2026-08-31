import { useCallback, useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { reassignWorkflowStep } from '@/api/workflow'
import { listUsers, type UserRow } from '@/api/users'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'

export function WorkflowReassignDrawer({
  open,
  onClose,
  instanceId,
  stepId,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  instanceId: number | null
  stepId: number | null
  onSuccess: () => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [users, setUsers] = useState<UserRow[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [newUser, setNewUser] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async (q: string) => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const res = await listUsers({ search: q || undefined, page: 1, is_active: true })
      setUsers(res.items)
    } catch (e: unknown) {
      setUsers([])
      setUsersError(parseApiError(e, 'Failed to load users').message)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setNewUser('')
      setComment('')
      setError(null)
      setSearch('')
      return
    }
    const t = window.setTimeout(() => void loadUsers(search), 350)
    return () => window.clearTimeout(t)
  }, [open, search, loadUsers])

  async function submit() {
    if (!instanceId || !stepId) return
    const uid = Number(newUser)
    if (!Number.isFinite(uid) || uid < 1) {
      setError('Select a user.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await reassignWorkflowStep(instanceId, stepId, {
        new_user: uid,
        comment: comment.trim() || undefined,
      })
      onClose()
      setNewUser('')
      setComment('')
      await onSuccess()
    } catch (e: unknown) {
      setError(parseApiError(e, 'Reassign failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Reassign workflow step"
      description="Choose an active user to receive this step. Does not change template configuration."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={submitting || !instanceId || !stepId}>
            {submitting ? 'Saving…' : 'Reassign'}
          </Button>
        </div>
      }
    >
      {error ? <ErrorState message={error} /> : null}
      {usersError ? <ErrorState message={usersError} /> : null}

      <div className="relative mt-2">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
          <Search className="h-4 w-4" aria-hidden />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users by name, email, username"
          className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          aria-label="Search users"
        />
      </div>

      {usersLoading ? (
        <div className="mt-4 flex justify-center">
          <Spinner label="Loading users" />
        </div>
      ) : (
        <div className="mt-4 max-h-48 overflow-y-auto rounded-panel border border-app-border bg-app-surface shadow-panel">
          {users.length === 0 ? (
            <p className="p-3 text-sm text-app-secondary">No users match. Try another search.</p>
          ) : (
            <ul className="divide-y divide-app-border text-sm">
              {users.map((u) => (
                <li key={u.id}>
                  <label className="flex cursor-pointer items-start gap-3 px-3 py-2 hover:bg-app-muted">
                    <input
                      type="radio"
                      name="reassign-user"
                      value={String(u.id)}
                      checked={newUser === String(u.id)}
                      onChange={() => setNewUser(String(u.id))}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-app-text">
                        {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
                      </span>
                      <span className="ml-2 font-mono text-xs text-app-secondary">{u.username}</span>
                      {u.email ? <span className="block text-xs text-app-subtle">{u.email}</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-4">
        <Input
          id="wf_reassign_comment"
          label="Comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={submitting}
        />
      </div>
    </Drawer>
  )
}
