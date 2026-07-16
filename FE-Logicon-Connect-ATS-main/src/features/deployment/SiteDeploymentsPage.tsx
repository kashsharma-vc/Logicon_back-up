import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRightLeft, CheckCircle2, Play, Search, XCircle } from 'lucide-react'
import { listSiteDeployments } from '@/api/deployment'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import {
  DeploymentActionDrawer,
  type DeploymentActionKind,
  type DeploymentActionResult,
} from '@/features/deployment/DeploymentActionDrawer'
import type { SiteDeploymentRow } from '@/features/deployment/types'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any status' },
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'cancelled', label: 'Cancelled' },
]

const BILLING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any billing' },
  { value: 'billable', label: 'Billable' },
  { value: 'non_billable', label: 'Non-billable' },
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

function statusVariant(status: string): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
  if (status === 'active') return 'success'
  if (status === 'planned') return 'info'
  if (status === 'completed') return 'neutral'
  if (status === 'transferred') return 'warning'
  if (status === 'cancelled') return 'danger'
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

export function SiteDeploymentsPage() {
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const site = parseNum(params.get('site'))
  const employee = parseNum(params.get('employee'))
  const jobRole = parseNum(params.get('job_role'))
  const billingType = params.get('billing_type') ?? ''
  const page = parsePage(params.get('page'))

  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canAct = hasAnyCapability(meCaps, [
    CAP.SITE_DEPLOYMENT_UPDATE,
    CAP.SITE_DEPLOYMENT_MANAGE,
    CAP.DEPLOYMENT_MANAGE,
  ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<SiteDeploymentRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [roles, setRoles] = useState<JobRoleRow[]>([])

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerAction, setDrawerAction] = useState<DeploymentActionKind | null>(null)
  const [drawerDeployment, setDrawerDeployment] = useState<SiteDeploymentRow | null>(null)
  const [rowSuccess, setRowSuccess] = useState<Record<number, string>>({})

  const [employeeInput, setEmployeeInput] = useState(employee != null ? String(employee) : '')

  useEffect(() => {
    setEmployeeInput(employee != null ? String(employee) : '')
  }, [employee])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [siteRes, roleRes] = await Promise.all([
          listSites({ is_active: true, page: 1 }),
          listJobRoles({ is_active: true, page: 1 }),
        ])
        if (!cancelled) {
          setSites(siteRes.items)
          setRoles(roleRes.items)
        }
      } catch {
        if (!cancelled) {
          setSites([])
          setRoles([])
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
        const res = await listSiteDeployments({
          status: status || undefined,
          site,
          employee,
          job_role: jobRole,
          billing_type: billingType || undefined,
          page,
        })
        if (!cancelled) {
          setRows(res.items)
          setCount(res.count)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load deployments').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, site, employee, jobRole, billingType, page])

  function setField(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    p.set('page', '1')
    setParams(p, { replace: true })
  }

  function applyEmployeeFilter() {
    const trimmed = employeeInput.trim()
    setField('employee', trimmed)
  }

  function openAction(deployment: SiteDeploymentRow, action: DeploymentActionKind) {
    setDrawerDeployment(deployment)
    setDrawerAction(action)
    setDrawerOpen(true)
  }

  function onSuccess(result: DeploymentActionResult) {
    if (result.kind === 'deployment') {
      setRows((prev) => prev.map((r) => (r.id === result.row.id ? result.row : r)))
      setRowSuccess((prev) => ({ ...prev, [result.row.id]: `Updated to ${result.row.status}.` }))
      const id = result.row.id
      setTimeout(() => {
        setRowSuccess((prev) => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, 4000)
    } else if (result.kind === 'transfer') {
      const oldId = result.result.old.id
      setRows((prev) => prev.map((r) => (r.id === oldId ? result.result.old : r)))
      const newSite = result.result.new.site_name ?? `Site #${result.result.new.site}`
      setRowSuccess((prev) => ({
        ...prev,
        [oldId]: `Transferred. New deployment #${result.result.new.id} @ ${newSite}.`,
      }))
      setTimeout(() => {
        setRowSuccess((prev) => {
          const next = { ...prev }
          delete next[oldId]
          return next
        })
      }, 6000)
    }
  }

  const siteNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const s of sites) m.set(s.id, s.name)
    return m
  }, [sites])

  const roleNameById = useMemo(() => {
    const m = new Map<number, string>()
    for (const r of roles) m.set(r.id, r.name)
    return m
  }, [roles])

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Site deployments</h2>
        <p className="text-sm text-app-secondary">
          Track planned and active deployments and manage their lifecycle.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select id="sd_status" label="Status" value={status} onChange={(e) => setField('status', e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select id="sd_site" label="Site" value={site != null ? String(site) : ''} onChange={(e) => setField('site', e.target.value)}>
            <option value="">Any site</option>
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select id="sd_role" label="Job role" value={jobRole != null ? String(jobRole) : ''} onChange={(e) => setField('job_role', e.target.value)}>
            <option value="">Any role</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select
            id="sd_billing"
            label="Billing type"
            value={billingType}
            onChange={(e) => setField('billing_type', e.target.value)}
          >
            {BILLING_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              id="sd_employee"
              label="Employee ID"
              type="number"
              min={1}
              placeholder="Enter employee id…"
              value={employeeInput}
              onChange={(e) => setEmployeeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyEmployeeFilter()
              }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-10 gap-1 px-3 text-sm"
            onClick={applyEmployeeFilter}
          >
            <Search className="h-4 w-4" aria-hidden /> Apply
          </Button>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading deployments…" /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No deployments"
          description="Try changing filters, or convert an accepted hiring application to create one."
        />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Employee</TH>
                  <TH className="py-2">Site</TH>
                  <TH className="py-2">Role</TH>
                  <TH className="py-2">Billing</TH>
                  <TH className="py-2">Shift hrs</TH>
                  <TH className="py-2">Start → End</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2 text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((d) => {
                  const success = rowSuccess[d.id]
                  const canActivate = canAct && d.status === 'planned'
                  const canCancel = canAct && d.status === 'planned'
                  const canComplete = canAct && (d.status === 'planned' || d.status === 'active')
                  const canTransfer = canAct && (d.status === 'planned' || d.status === 'active')
                  const isTerminal = d.status === 'completed' || d.status === 'cancelled' || d.status === 'transferred'
                  return (
                    <TR key={d.id}>
                      <TD className="py-2">
                        <p className="text-sm font-medium text-app-text">
                          {d.employee_full_name ?? `Employee #${d.employee}`}
                        </p>
                        {d.employee_code ? (
                          <p className="font-mono text-xs text-app-secondary">{d.employee_code}</p>
                        ) : null}
                      </TD>
                      <TD className="py-2 text-xs">
                        {d.site_name ?? siteNameById.get(d.site) ?? `Site #${d.site}`}
                      </TD>
                      <TD className="py-2 text-xs">
                        {d.job_role_name ?? roleNameById.get(d.job_role) ?? `Role #${d.job_role}`}
                      </TD>
                      <TD className="py-2 text-xs">
                        <Badge variant="neutral" className="text-[11px]">{d.billing_type}</Badge>
                      </TD>
                      <TD className="py-2 text-xs">
                        {d.shift_hours != null ? String(d.shift_hours) : '—'}
                      </TD>
                      <TD className="py-2 text-xs">
                        {fmtDate(d.start_date)} <span className="text-app-subtle">→</span> {fmtDate(d.end_date)}
                      </TD>
                      <TD className="py-2">
                        <Badge variant={statusVariant(d.status)} className="text-[11px]">
                          {d.status}
                        </Badge>
                      </TD>
                      <TD className="py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          {isTerminal ? (
                            <span className="text-[11px] text-app-subtle">Read-only</span>
                          ) : !canAct ? (
                            <span className="text-[11px] text-app-subtle">View only</span>
                          ) : (
                            <div className="flex flex-wrap justify-end gap-1">
                              {canActivate ? (
                                <Button
                                  type="button"
                                  variant="primary"
                                  className="min-h-7 gap-1 px-2 text-xs"
                                  onClick={() => openAction(d, 'deployment-activate')}
                                >
                                  <Play className="h-3 w-3" aria-hidden /> Activate
                                </Button>
                              ) : null}
                              {canComplete ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-7 gap-1 px-2 text-xs"
                                  onClick={() => openAction(d, 'deployment-complete')}
                                >
                                  <CheckCircle2 className="h-3 w-3" aria-hidden /> Complete
                                </Button>
                              ) : null}
                              {canTransfer ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  className="min-h-7 gap-1 px-2 text-xs"
                                  onClick={() => openAction(d, 'deployment-transfer')}
                                >
                                  <ArrowRightLeft className="h-3 w-3" aria-hidden /> Transfer
                                </Button>
                              ) : null}
                              {canCancel ? (
                                <Button
                                  type="button"
                                  variant="danger"
                                  className="min-h-7 gap-1 px-2 text-xs"
                                  onClick={() => openAction(d, 'deployment-cancel')}
                                >
                                  <XCircle className="h-3 w-3" aria-hidden /> Cancel
                                </Button>
                              ) : null}
                            </div>
                          )}
                          {success ? <p className="text-[11px] text-status-hired">{success}</p> : null}
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((d) => {
              const success = rowSuccess[d.id]
              const canActivate = canAct && d.status === 'planned'
              const canCancel = canAct && d.status === 'planned'
              const canComplete = canAct && (d.status === 'planned' || d.status === 'active')
              const canTransfer = canAct && (d.status === 'planned' || d.status === 'active')
              const isTerminal = d.status === 'completed' || d.status === 'cancelled' || d.status === 'transferred'
              return (
                <div key={d.id} className="rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-app-text">
                        {d.employee_full_name ?? `Employee #${d.employee}`}
                      </p>
                      {d.employee_code ? (
                        <p className="mt-0.5 font-mono text-xs text-app-secondary">{d.employee_code}</p>
                      ) : null}
                    </div>
                    <Badge variant={statusVariant(d.status)} className="text-[11px]">
                      {d.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-app-secondary">
                    {d.site_name ?? siteNameById.get(d.site) ?? `Site #${d.site}`} ·{' '}
                    {d.job_role_name ?? roleNameById.get(d.job_role) ?? `Role #${d.job_role}`}
                  </p>
                  <p className="mt-1 text-xs text-app-subtle">
                    {d.billing_type} · {fmtDate(d.start_date)} → {fmtDate(d.end_date)}
                  </p>
                  {!isTerminal && canAct ? (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {canActivate ? (
                        <Button type="button" className="min-h-7 px-2 text-xs" onClick={() => openAction(d, 'deployment-activate')}>
                          Activate
                        </Button>
                      ) : null}
                      {canComplete ? (
                        <Button type="button" variant="secondary" className="min-h-7 px-2 text-xs" onClick={() => openAction(d, 'deployment-complete')}>
                          Complete
                        </Button>
                      ) : null}
                      {canTransfer ? (
                        <Button type="button" variant="secondary" className="min-h-7 px-2 text-xs" onClick={() => openAction(d, 'deployment-transfer')}>
                          Transfer
                        </Button>
                      ) : null}
                      {canCancel ? (
                        <Button type="button" variant="danger" className="min-h-7 px-2 text-xs" onClick={() => openAction(d, 'deployment-cancel')}>
                          Cancel
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {success ? <p className="mt-2 text-[11px] text-status-hired">{success}</p> : null}
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
        deployment={drawerDeployment}
        onSuccess={(r) => onSuccess(r)}
      />
    </div>
  )
}
