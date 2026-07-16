import { useMemo } from 'react'
import { Mail, Shield, ShieldCheck, User, Briefcase, MapPin, Building2, Users } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { displayName, userTypeLabel } from '@/features/users/types'
import type { UserType } from '@/features/users/types'
import { formatAssignableLevel } from '@/features/roles/displayLabels'
import { groupCapabilities } from '@/features/me/capabilitySummary'
import type { UserRoleAssignment } from '@/types/api'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

function formatUserTypeLabel(raw: string | undefined): string {
  if (raw == null || String(raw).trim() === '') return 'Unknown'
  const t = String(raw).trim()
  if (t === 'internal' || t === 'client' || t === 'field') return userTypeLabel(t as UserType)
  return t.replace(/_/g, ' ')
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '??'
  if (parts.length === 1) return (parts[0] ?? '').slice(0, 2).toUpperCase()
  const first = parts[0] ?? ''
  const last = parts[parts.length - 1] ?? ''
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase()
}

function getScopeIcon(scope: string) {
  if (scope.includes('site')) return <MapPin className="h-4 w-4 text-emerald-500" />
  if (scope.includes('client')) return <Building2 className="h-4 w-4 text-amber-500" />
  return <Users className="h-4 w-4 text-blue-500" />
}

export function MePage() {
  const me = useAuthStore((s) => s.me)
  const meLoading = useAuthStore((s) => s.meLoading)
  const meError = useAuthStore((s) => s.meError)

  const caps = me?.capabilities ?? []
  const roleAssignments = me?.role_assignments ?? []

  const groupedCaps = useMemo(() => groupCapabilities(caps), [caps])

  if (meLoading && !me) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner label="Loading profile" />
      </div>
    )
  }

  if (meError && !me) {
    return <ErrorState message={meError} />
  }

  if (!me) {
    return <ErrorState message="No profile data loaded." />
  }

  const name = displayName(me)
  const initials = getInitials(name)

  return (
    <div className="w-full space-y-6">
      {/* Profile Card */}
      <div className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-2xl font-bold text-white shadow-md">
            {initials}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-xl font-bold text-app-text sm:text-2xl">{name}</h1>
              <p className="text-sm text-app-secondary">@{me.username}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="info">{formatUserTypeLabel(me.user_type)}</Badge>
              {me.is_staff ? <Badge variant="neutral">Staff</Badge> : null}
              {me.is_superuser ? <Badge variant="warning">Superuser</Badge> : null}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-6 border-t border-app-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div className="text-center">
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{roleAssignments.length}</p>
              <p className="text-xs text-app-subtle">Roles</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{groupedCaps.length}</p>
              <p className="text-xs text-app-subtle">Access Areas</p>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="mt-6 grid gap-4 border-t border-app-border pt-5 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-app-subtle" />
            <div>
              <p className="text-xs text-app-subtle">Email</p>
              <p className="text-sm font-medium text-app-text">{me.email?.trim() || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-app-subtle" />
            <div>
              <p className="text-xs text-app-subtle">Username</p>
              <p className="text-sm font-medium text-app-text">{me.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Briefcase className="h-5 w-5 text-app-subtle" />
            <div>
              <p className="text-xs text-app-subtle">Account Type</p>
              <p className="text-sm font-medium text-app-text">{formatUserTypeLabel(me.user_type)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Assignments */}
      <section className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <Shield className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-app-text">My Roles</h2>
        </div>

        {roleAssignments.length === 0 ? (
          <EmptyState
            title="No roles assigned"
            description="You do not have any role-based access recorded yet."
          />
        ) : (
          <div className="space-y-3">
            {roleAssignments.map((r: UserRoleAssignment) => (
              <div
                key={r.id}
                className="flex flex-col gap-3 rounded-xl border border-app-border bg-app-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
                    <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-app-text">{r.role_name}</p>
                    <p className="text-xs text-app-subtle">{r.role_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-app-surface px-3 py-1.5">
                    {getScopeIcon(r.scope_node_path)}
                    <span className="max-w-[200px] truncate font-mono text-xs text-app-secondary">
                      {r.scope_node_path}
                    </span>
                  </div>
                  <Badge variant="neutral">{formatAssignableLevel(r.role_node_type_scope)}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Capabilities */}
      <section className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-green-500" />
          <h2 className="text-lg font-semibold text-app-text">What I Can Access</h2>
        </div>

        {caps.length === 0 || groupedCaps.length === 0 ? (
          <p className="text-sm text-app-secondary">No permissions returned for this account.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedCaps.map((g) => (
              <div
                key={`${g.sortKey}-${g.areaLabel}`}
                className="rounded-xl border border-app-border bg-app-muted/30 p-4"
              >
                <p className="font-semibold text-app-text">{g.areaLabel}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.actions.map((a) => (
                    <span
                      key={a.raw}
                      className="inline-flex rounded-md bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    >
                      {a.friendly}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
