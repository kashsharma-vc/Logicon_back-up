import { useCallback, useEffect, useMemo, useState } from 'react'
import { MousePointerClick, Search } from 'lucide-react'
import { deactivateRole, listRolePermissions, listRoles, type AccessRole } from '@/api/access'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { RoleCatalogDetail } from '@/features/roles/RoleCatalogDetail'

export function RolesPage() {
  const caps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canDelete = hasAnyCapability(caps, [CAP.ROLE_DELETE])

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => window.clearTimeout(t)
  }, [search])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<AccessRole[]>([])

  const [selected, setSelected] = useState<AccessRole | null>(null)
  const [permissionCounts, setPermissionCounts] = useState<Map<number, number>>(new Map())

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listRoles({ search: debouncedSearch || undefined, page: 1 })
      setRows(res.items)
    } catch (e: unknown) {
      setRows([])
      setError(parseApiError(e, 'Failed to load roles').message)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (rows.length === 0) {
      setPermissionCounts(new Map())
      return
    }
    let cancelled = false
    void (async () => {
      const entries = await Promise.all(
        rows.map(async (r) => {
          try {
            const res = await listRolePermissions({ role: r.id })
            return [r.id, res.items.length] as const
          } catch {
            return [r.id, null] as const
          }
        }),
      )
      if (cancelled) return
      const next = new Map<number, number>()
      for (const [id, n] of entries) {
        if (n !== null) next.set(id, n)
      }
      setPermissionCounts(next)
    })()
    return () => {
      cancelled = true
    }
  }, [rows])

  useEffect(() => {
    if (!selected) return
    const still = rows.find((r) => r.id === selected.id)
    if (still) setSelected(still)
  }, [rows, selected?.id])

  const handleDeactivate = useCallback(
    async (r: AccessRole) => {
      if (!canDelete || !r.is_active) return
      const ok = window.confirm(
        `Deactivate role '${r.name}'? Existing users with this role may lose access after profile refresh.`,
      )
      if (!ok) return
      try {
        await deactivateRole(r.id)
        await refresh()
        setSelected((prev) => (prev?.id === r.id ? null : prev))
      } catch (e: unknown) {
        alert(parseApiError(e, 'Deactivate failed').message)
      }
    },
    [canDelete, refresh],
  )

  const mobileCards = useMemo(
    () => (
      <div className="grid gap-3 lg:hidden">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(r)}
            className={`w-full rounded-panel border p-4 text-left shadow-panel ${
              selected?.id === r.id ? 'border-brand-600 bg-brand-600/5' : 'border-app-border bg-app-surface hover:bg-app-muted'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-app-text">{r.name}</p>
                <p className="font-mono text-xs text-app-secondary">{r.code}</p>
              </div>
              {r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}
            </div>
            {canDelete && r.is_active ? (
              <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                <Button variant="danger" className="min-h-9 px-3" type="button" onClick={() => void handleDeactivate(r)}>
                  Deactivate
                </Button>
              </div>
            ) : null}
          </button>
        ))}
      </div>
    ),
    [rows, selected?.id, canDelete, handleDeactivate],
  )

  function permissionCountCell(roleId: number): string {
    const n = permissionCounts.get(roleId)
    return n === undefined ? '—' : String(n)
  }

  if (loading && rows.length === 0 && !error) return <Spinner label="Loading roles..." />
  if (error) return <ErrorState message={error} />

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Role catalog</h2>
        <p className="text-sm text-app-secondary">
          Approved roles available for user assignment. Permission setup is managed by system administrators.
        </p>
      </div>

      <div className="relative max-w-md">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
          <Search className="h-4 w-4" aria-hidden />
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code"
          className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          aria-label="Search roles"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 space-y-3">
          {rows.length === 0 ? (
            <EmptyState title="No roles" description="Try a different search or contact your administrator." />
          ) : (
            <>
              {mobileCards}
              <div className="hidden lg:block">
                <Table>
                  <THead>
                    <TR>
                      <TH className="py-2">Name</TH>
                      <TH className="py-2">Code</TH>
                      <TH className="py-2">Status</TH>
                      <TH className="py-2 text-right">Permissions</TH>
                      <TH className="py-2 text-right">Actions</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {rows.map((r) => (
                      <TR
                        key={r.id}
                        className={`cursor-pointer ${selected?.id === r.id ? 'bg-brand-600/5' : 'hover:bg-app-muted'}`}
                        onClick={() => setSelected(r)}
                      >
                        <TD className="py-2 font-medium text-app-text">{r.name}</TD>
                        <TD className="py-2 font-mono text-xs text-app-secondary">{r.code}</TD>
                        <TD className="py-2">{r.is_active ? <Badge variant="success">Active</Badge> : <Badge variant="neutral">Inactive</Badge>}</TD>
                        <TD className="py-2 text-right font-mono text-xs text-app-secondary">{permissionCountCell(r.id)}</TD>
                        <TD className="py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          {canDelete && r.is_active ? (
                            <Button variant="danger" className="min-h-9 px-3" type="button" onClick={() => void handleDeactivate(r)}>
                              Deactivate
                            </Button>
                          ) : (
                            <span className="text-xs text-app-subtle">—</span>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 rounded-xl border border-app-border bg-app-surface shadow-sm lg:min-h-[320px]">
          {selected ? (
            <RoleCatalogDetail role={selected} />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-100">
                <MousePointerClick className="h-7 w-7 text-brand-600" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-medium text-app-text">No role selected</p>
              <p className="mt-1 text-sm text-app-secondary">
                Select a role from the list to view details and permissions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
