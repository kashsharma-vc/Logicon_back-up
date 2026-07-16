import { useEffect, useMemo, useState } from 'react'
import { Code, Key, Layers, Shield } from 'lucide-react'
import { listRolePermissions, type AccessRole, type RolePermission } from '@/api/access'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { formatAssignableLevel, permissionAreaLabel } from '@/features/roles/displayLabels'

export function RoleCatalogDetail({ role }: { role: AccessRole }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RolePermission[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setRows([])
    void (async () => {
      try {
        const res = await listRolePermissions({ role: role.id })
        if (!cancelled) setRows(res.items)
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Failed to load role permissions').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [role.id])

  const countsByArea = useMemo(() => {
    const m = new Map<string, number>()
    for (const rp of rows) {
      const r = (rp.permission_resource || 'other').trim() || 'other'
      m.set(r, (m.get(r) ?? 0) + 1)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [rows])

  if (loading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center p-6">
        <Spinner label="Loading role details..." />
      </div>
    )
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-100">
          <Shield className="h-6 w-6 text-brand-600" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Role Details</p>
          <h3 className="mt-0.5 truncate text-lg font-semibold text-app-text">{role.name}</h3>
        </div>
        {role.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="neutral">Inactive</Badge>
        )}
      </div>

      {/* Info Grid */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-app-subtle" aria-hidden />
            <span className="text-xs text-app-subtle">Code</span>
          </div>
          <p className="mt-1 truncate font-mono text-sm font-medium text-app-text">{role.code}</p>
        </div>
        <div className="rounded-lg border border-app-border bg-app-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-app-subtle" aria-hidden />
            <span className="text-xs text-app-subtle">Assignable Level</span>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-app-text">
            {formatAssignableLevel(role.node_type_scope)}
          </p>
        </div>
        <div className="col-span-2 rounded-lg border border-app-border bg-app-surface px-4 py-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-app-subtle" aria-hidden />
            <span className="text-xs text-app-subtle">Total Permissions</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-600">{rows.length}</p>
        </div>
      </div>

      <p className="mt-4 text-xs text-app-subtle">
        Permissions are managed by system administrators.
      </p>

      {error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : null}

      {/* Permissions by Area */}
      {!error && countsByArea.length > 0 ? (
        <div className="mt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-app-secondary">
            Permissions by Area
          </p>
          <div className="space-y-2">
            {countsByArea.map(([resource, n]) => (
              <div
                key={resource}
                className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-4 py-2.5"
              >
                <span className="text-sm text-app-text">{permissionAreaLabel(resource)}</span>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  {n}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
