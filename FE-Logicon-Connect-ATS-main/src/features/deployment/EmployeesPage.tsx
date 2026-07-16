import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LogOut, Search, UserCheck, UserMinus } from 'lucide-react'
import { listEmployees } from '@/api/deployment'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import {
  DeploymentActionDrawer,
  type DeploymentActionKind,
  type DeploymentActionResult,
} from '@/features/deployment/DeploymentActionDrawer'
import type { EmployeeRow } from '@/features/deployment/types'

const EMPLOYEE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'exited', label: 'Exited' },
]

function parseNum(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function parsePage(v: string | null): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function statusVariant(status: string): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'active') return 'success'
  if (status === 'suspended') return 'warning'
  if (status === 'exited') return 'danger'
  return 'neutral'
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

export function EmployeesPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const jobRole = parseNum(params.get('job_role'))
  const search = params.get('search') ?? ''
  const page = parsePage(params.get('page'))

  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canAct = hasAnyCapability(meCaps, [
    CAP.EMPLOYEE_UPDATE,
    CAP.EMPLOYEE_MANAGE,
    CAP.DEPLOYMENT_MANAGE,
  ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [roles, setRoles] = useState<JobRoleRow[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerAction, setDrawerAction] = useState<DeploymentActionKind | null>(null)
  const [drawerEmployee, setDrawerEmployee] = useState<EmployeeRow | null>(null)
  const [rowSuccess, setRowSuccess] = useState<Record<number, string>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await listJobRoles({ is_active: true, page: 1 })
        if (!cancelled) setRoles(r.items)
      } catch {
        if (!cancelled) setRoles([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await listEmployees({
          status: status || undefined,
          job_role: jobRole,
          search: search.trim() || undefined,
          page,
        })
        if (!cancelled) {
          setRows(res.items)
          setCount(res.count)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load employees').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, jobRole, search, page])

  function setField(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    p.set('page', '1')
    setParams(p, { replace: true })
  }

  function openAction(employee: EmployeeRow, action: DeploymentActionKind) {
    setDrawerEmployee(employee)
    setDrawerAction(action)
    setDrawerOpen(true)
  }

  function onSuccess(result: DeploymentActionResult) {
    if (result.kind !== 'employee') return
    setRows((prev) => prev.map((r) => (r.id === result.row.id ? result.row : r)))
    setRowSuccess((prev) => ({ ...prev, [result.row.id]: `Updated to ${result.row.status}.` }))
    setTimeout(() => {
      setRowSuccess((prev) => {
        const next = { ...prev }
        delete next[result.row.id]
        return next
      })
    }, 4000)
  }

  const roleNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of roles) m.set(r.id, r.name)
    return m
  }, [roles])

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Employees</h2>
        <p className="text-sm text-app-secondary">
          Manage hired workers and their deployment lifecycle.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtle" aria-hidden />
          <input
            type="search"
            placeholder="Search code, name, phone, email…"
            value={search}
            onChange={(e) => setField('search', e.target.value)}
            className="w-full rounded-panel border border-app-border bg-app-surface py-2 pl-9 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            id="emp_status"
            label="Status"
            value={status}
            onChange={(e) => setField('status', e.target.value)}
          >
            {EMPLOYEE_STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            id="emp_role"
            label="Job role"
            value={jobRole != null ? String(jobRole) : ''}
            onChange={(e) => setField('job_role', e.target.value)}
          >
            <option value="">Any role</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading employees…" /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No employees" description="Try changing filters, or convert an accepted hiring application." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Code</TH>
                  <TH className="py-2">Name</TH>
                  <TH className="py-2">Contact</TH>
                  <TH className="py-2">Job role</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Joined</TH>
                  <TH className="py-2">Exited</TH>
                  <TH className="py-2 text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((emp) => {
                  const success = rowSuccess[emp.id]
                  const canSuspend = canAct && emp.status === 'active'
                  const canReactivate = canAct && (emp.status === 'suspended' || emp.status === 'inactive')
                  const canExit = canAct && emp.status !== 'exited'
                  return (
                    <TR key={emp.id}>
                      <TD className="py-2 font-mono text-xs">{emp.employee_code}</TD>
                      <TD className="py-2">
                        <p className="text-sm font-medium text-app-text">
                          {emp.full_name ?? `${emp.first_name} ${emp.last_name}`.trim()}
                        </p>
                      </TD>
                      <TD className="py-2 text-xs text-app-secondary">
                        {emp.phone ? <p className="font-mono">{emp.phone}</p> : null}
                        {emp.email ? <p>{emp.email}</p> : null}
                        {!emp.phone && !emp.email ? <span className="text-app-subtle">—</span> : null}
                      </TD>
                      <TD className="py-2 text-xs">
                        {emp.job_role != null ? roleNameById.get(emp.job_role) ?? `Role #${emp.job_role}` : '—'}
                      </TD>
                      <TD className="py-2">
                        <Badge variant={statusVariant(emp.status)} className="text-[11px]">
                          {emp.status}
                        </Badge>
                      </TD>
                      <TD className="py-2 text-xs">{fmtDate(emp.joined_on)}</TD>
                      <TD className="py-2 text-xs">{fmtDate(emp.exited_on)}</TD>
                      <TD className="py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex flex-wrap justify-end gap-1">
                            {canReactivate ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-7 gap-1 px-2 text-xs"
                                onClick={() => openAction(emp, 'employee-reactivate')}
                              >
                                <UserCheck className="h-3 w-3" aria-hidden /> Reactivate
                              </Button>
                            ) : null}
                            {canSuspend ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-7 gap-1 px-2 text-xs"
                                onClick={() => openAction(emp, 'employee-suspend')}
                              >
                                <UserMinus className="h-3 w-3" aria-hidden /> Suspend
                              </Button>
                            ) : null}
                            {canExit ? (
                              <Button
                                type="button"
                                variant="danger"
                                className="min-h-7 gap-1 px-2 text-xs"
                                onClick={() => openAction(emp, 'employee-exit')}
                              >
                                <LogOut className="h-3 w-3" aria-hidden /> Exit
                              </Button>
                            ) : null}
                            {!canAct ? (
                              <span className="text-[11px] text-app-subtle">View only</span>
                            ) : null}
                          </div>
                          {success ? (
                            <p className="text-[11px] text-status-hired">{success}</p>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((emp) => {
              const success = rowSuccess[emp.id]
              const canSuspend = canAct && emp.status === 'active'
              const canReactivate = canAct && (emp.status === 'suspended' || emp.status === 'inactive')
              const canExit = canAct && emp.status !== 'exited'
              return (
                <div
                  key={emp.id}
                  className="rounded-panel border border-app-border bg-app-surface p-3 shadow-panel"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-app-text">
                        {emp.full_name ?? `${emp.first_name} ${emp.last_name}`.trim()}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-app-secondary">{emp.employee_code}</p>
                    </div>
                    <Badge variant={statusVariant(emp.status)} className="text-[11px]">
                      {emp.status}
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-app-secondary">
                    {emp.job_role != null ? roleNameById.get(emp.job_role) ?? `Role #${emp.job_role}` : '—'}
                    {emp.joined_on ? ` · Joined ${fmtDate(emp.joined_on)}` : null}
                    {emp.exited_on ? ` · Exited ${fmtDate(emp.exited_on)}` : null}
                  </div>
                  {(emp.phone || emp.email) ? (
                    <div className="mt-1 text-xs text-app-subtle">
                      {emp.phone ? <span className="font-mono">{emp.phone}</span> : null}
                      {emp.phone && emp.email ? ' · ' : null}
                      {emp.email ? <span>{emp.email}</span> : null}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1">
                    <Link
                      to={`/deployment/site-deployments?employee=${emp.id}`}
                      className="inline-flex min-h-7 items-center rounded border border-app-border px-2 text-xs text-app-text hover:bg-app-muted"
                    >
                      Deployments
                    </Link>
                    {canReactivate ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-7 px-2 text-xs"
                        onClick={() => openAction(emp, 'employee-reactivate')}
                      >
                        Reactivate
                      </Button>
                    ) : null}
                    {canSuspend ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-7 px-2 text-xs"
                        onClick={() => openAction(emp, 'employee-suspend')}
                      >
                        Suspend
                      </Button>
                    ) : null}
                    {canExit ? (
                      <Button
                        type="button"
                        variant="danger"
                        className="min-h-7 px-2 text-xs"
                        onClick={() => openAction(emp, 'employee-exit')}
                      >
                        Exit
                      </Button>
                    ) : null}
                  </div>
                  {success ? (
                    <p className="mt-2 text-[11px] text-status-hired">{success}</p>
                  ) : null}
                </div>
              )
            })}
          </div>

          {count != null ? <p className="text-xs text-app-subtle">Total: {count}</p> : null}
        </>
      ) : null}

      <DeploymentActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        action={drawerAction}
        employee={drawerEmployee}
        onSuccess={(r) => onSuccess(r)}
      />
    </div>
  )
}
