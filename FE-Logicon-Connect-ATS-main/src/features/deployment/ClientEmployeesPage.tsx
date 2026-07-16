import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { listEmployees, listSiteDeployments } from '@/api/deployment'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type { EmployeeRow, SiteDeploymentRow } from '@/features/deployment/types'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'inactive', label: 'Inactive' },
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

function employeeName(emp: EmployeeRow): string {
  return emp.full_name?.trim() || `${emp.first_name} ${emp.last_name}`.trim()
}

export function ClientEmployeesPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const siteFilter = parseNum(params.get('site'))
  const jobRole = parseNum(params.get('job_role'))
  const status = params.get('status') ?? ''
  const page = parsePage(params.get('page'))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<EmployeeRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [deploymentByEmployee, setDeploymentByEmployee] = useState<Map<number, SiteDeploymentRow>>(new Map())
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [roles, setRoles] = useState<JobRoleRow[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [siteRes, roleRes, depRes] = await Promise.all([
          listSites({ search: '', page: 1 }),
          listJobRoles({ is_active: true, page: 1 }),
          listSiteDeployments({ status: 'active', page: 1 }),
        ])
        if (cancelled) return
        setSites(siteRes.items)
        setRoles(roleRes.items)
        const map = new Map<number, SiteDeploymentRow>()
        for (const dep of depRes.items) {
          if (!map.has(dep.employee)) map.set(dep.employee, dep)
        }
        setDeploymentByEmployee(map)
      } catch {
        if (!cancelled) {
          setSites([])
          setRoles([])
          setDeploymentByEmployee(new Map())
        }
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

  function goToPage(next: number) {
    const p = new URLSearchParams(params)
    p.set('page', String(next))
    setParams(p, { replace: true })
  }

  const roleNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of roles) m.set(r.id, r.name)
    return m
  }, [roles])

  const visibleRows = useMemo(() => {
    if (siteFilter == null) return rows
    return rows.filter((emp) => deploymentByEmployee.get(emp.id)?.site === siteFilter)
  }, [rows, siteFilter, deploymentByEmployee])

  function currentSiteLabel(emp: EmployeeRow): string {
    const dep = deploymentByEmployee.get(emp.id)
    if (!dep) return '—'
    const site = dep.site_name?.trim() || `Site #${dep.site}`
    return dep.job_role_name?.trim() ? `${site} · ${dep.job_role_name}` : site
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Deployed employees</h2>
        <p className="text-sm text-app-secondary">Employees currently deployed at your sites.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtle" aria-hidden />
          <input
            type="search"
            placeholder="Search code, name, phone, email…"
            value={search}
            onChange={(e) => setField('search', e.target.value)}
            className="w-full rounded-panel border border-app-border bg-app-muted py-2 pl-9 pr-3 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select id="emp_site" label="Site" value={siteFilter != null ? String(siteFilter) : ''} onChange={(e) => setField('site', e.target.value)}>
            <option value="">Any site</option>
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select id="emp_role" label="Job role" value={jobRole != null ? String(jobRole) : ''} onChange={(e) => setField('job_role', e.target.value)}>
            <option value="">Any role</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select id="emp_status" label="Status" value={status} onChange={(e) => setField('status', e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading employees…" /> : null}
      {!loading && !error && visibleRows.length === 0 ? (
        <EmptyState title="No deployed employees yet." description="Employees deployed at your sites will appear here." />
      ) : null}

      {!loading && !error && visibleRows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Code</TH>
                  <TH className="py-2">Name</TH>
                  <TH className="py-2">Contact</TH>
                  <TH className="py-2">Job role</TH>
                  <TH className="py-2">Current site</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Joined</TH>
                </TR>
              </THead>
              <TBody>
                {visibleRows.map((emp) => (
                  <TR key={emp.id}>
                    <TD className="py-2 font-mono text-xs">{emp.employee_code}</TD>
                    <TD className="py-2 text-sm font-medium text-app-text">{employeeName(emp)}</TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {emp.phone ? <p className="font-mono">{emp.phone}</p> : null}
                      {emp.email ? <p>{emp.email}</p> : null}
                      {!emp.phone && !emp.email ? <span className="text-app-subtle">—</span> : null}
                    </TD>
                    <TD className="py-2 text-xs">
                      {emp.job_role != null ? roleNameById.get(emp.job_role) ?? `Role #${emp.job_role}` : '—'}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{currentSiteLabel(emp)}</TD>
                    <TD className="py-2">
                      <Badge variant={statusVariant(emp.status)} className="text-[11px]">
                        {emp.status}
                      </Badge>
                    </TD>
                    <TD className="py-2 text-xs">{fmtDate(emp.joined_on)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {visibleRows.map((emp) => (
              <div key={emp.id} className="rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-app-text">{employeeName(emp)}</p>
                    <p className="mt-0.5 font-mono text-xs text-app-secondary">{emp.employee_code}</p>
                  </div>
                  <Badge variant={statusVariant(emp.status)} className="text-[11px]">
                    {emp.status}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-app-secondary">
                  {emp.job_role != null ? roleNameById.get(emp.job_role) ?? `Role #${emp.job_role}` : '—'}
                  {emp.joined_on ? ` · Joined ${fmtDate(emp.joined_on)}` : null}
                </div>
                <div className="mt-1 text-xs text-app-subtle">Site: {currentSiteLabel(emp)}</div>
                {(emp.phone || emp.email) ? (
                  <div className="mt-1 text-xs text-app-subtle">
                    {emp.phone ? <span className="font-mono">{emp.phone}</span> : null}
                    {emp.phone && emp.email ? ' · ' : null}
                    {emp.email ? <span>{emp.email}</span> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <p className="text-xs text-app-subtle">
              {typeof count === 'number' ? `${count} employees` : `${visibleRows.length} employees`}
              {siteFilter != null ? <span> · site filter applies to this page</span> : null}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="min-h-9 px-3"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Prev
              </Button>
              <span className="text-xs text-app-secondary">Page {page}</span>
              <Button
                variant="secondary"
                className="min-h-9 px-3"
                disabled={rows.length < 50}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
