import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, Shield, User } from 'lucide-react'
import { getUser, type UserRow } from '@/api/users'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { UserRoleAssignments } from '@/features/users/UserRoleAssignments'
import { displayName, userTypeLabel } from '@/features/users/types'

function getInitials(user: UserRow): string {
  const first = user.first_name?.[0] ?? ''
  const last = user.last_name?.[0] ?? ''
  if (first || last) return (first + last).toUpperCase()
  return user.username?.[0]?.toUpperCase() ?? 'U'
}

export function UserAccessPage() {
  const { userId } = useParams()
  const id = Number(userId)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<UserRow | null>(null)

  async function load() {
    if (!Number.isFinite(id)) {
      setError('Invalid user id')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const u = await getUser(id)
      setUser(u)
    } catch (e: unknown) {
      setUser(null)
      setError(e instanceof Error ? e.message : 'Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading access" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text shadow-sm hover:bg-app-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to users
        </Link>
        <ErrorState message={error} />
        <Button variant="secondary" onClick={() => load()}>
          Retry
        </Button>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <Link
          to="/users"
          className="inline-flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text shadow-sm hover:bg-app-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to users
        </Link>
        <ErrorState message="User not found." />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white shadow-sm">
            {getInitials(user)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to="/users"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                Users
              </Link>
              <span className="text-xs text-app-subtle">/</span>
              <span className="text-xs font-medium text-app-secondary">Access</span>
            </div>
            <h2 className="mt-1 truncate text-xl font-semibold text-app-text">{displayName(user)}</h2>
            <p className="mt-0.5 text-sm text-app-secondary">@{user.username}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{userTypeLabel(user.user_type)}</Badge>
          {user.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="danger">Inactive</Badge>}
        </div>
      </div>

      {/* User Info Card */}
      <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
            <Shield className="h-5 w-5 text-brand-600" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-app-text">Manage Access</h3>
            <p className="text-sm text-app-secondary">
              Assign roles at company, client, or site level
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border border-app-border bg-app-surface px-4 py-3">
            <User className="h-4 w-4 text-app-subtle" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-app-subtle">Full Name</p>
              <p className="truncate text-sm font-medium text-app-text">{displayName(user)}</p>
            </div>
          </div>
          {user.email ? (
            <div className="flex items-center gap-3 rounded-lg border border-app-border bg-app-surface px-4 py-3">
              <Mail className="h-4 w-4 text-app-subtle" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-app-subtle">Email</p>
                <p className="truncate text-sm font-medium text-app-text">{user.email}</p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3 rounded-lg border border-app-border bg-app-surface px-4 py-3">
            <Shield className="h-4 w-4 text-app-subtle" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-app-subtle">User Type</p>
              <p className="truncate text-sm font-medium text-app-text">{userTypeLabel(user.user_type)}</p>
            </div>
          </div>
        </div>
      </div>

      <UserRoleAssignments userId={user.id} />
    </div>
  )
}
