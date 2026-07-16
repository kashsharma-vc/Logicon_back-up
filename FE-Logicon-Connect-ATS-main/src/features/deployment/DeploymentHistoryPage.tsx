import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { listDeploymentHistory } from '@/api/deployment'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type { DeploymentHistoryRow } from '@/features/deployment/types'

const ACTION_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Any action' },
  { value: 'deployment_activated', label: 'Deployment activated' },
  { value: 'deployment_cancelled', label: 'Deployment cancelled' },
  { value: 'deployment_completed', label: 'Deployment completed' },
  { value: 'deployment_transferred_out', label: 'Transferred (out)' },
  { value: 'deployment_transferred_in', label: 'Transferred (in)' },
  { value: 'employee_suspended', label: 'Employee suspended' },
  { value: 'employee_reactivated', label: 'Employee reactivated' },
  { value: 'employee_exited', label: 'Employee exited' },
]

function actionLabel(actionType: string): string {
  const match = ACTION_TYPE_OPTIONS.find((o) => o.value === actionType)
  return match?.label ?? actionType
}

function actionVariant(actionType: string): 'success' | 'info' | 'warning' | 'neutral' | 'danger' | 'attention' {
  if (actionType === 'deployment_activated' || actionType === 'employee_reactivated') return 'success'
  if (actionType === 'deployment_completed') return 'neutral'
  if (actionType === 'deployment_cancelled') return 'danger'
  if (actionType === 'deployment_transferred_out' || actionType === 'deployment_transferred_in') return 'attention'
  if (actionType === 'employee_suspended') return 'warning'
  if (actionType === 'employee_exited') return 'danger'
  return 'info'
}

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

function fmtDateTime(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return d
  }
}

export function DeploymentHistoryPage() {
  const [params, setParams] = useSearchParams()
  const employee = parseNum(params.get('employee'))
  const deployment = parseNum(params.get('deployment'))
  const actionType = params.get('action_type') ?? ''
  const search = params.get('search') ?? ''
  const page = parsePage(params.get('page'))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<DeploymentHistoryRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [employeeInput, setEmployeeInput] = useState(employee != null ? String(employee) : '')
  const [deploymentInput, setDeploymentInput] = useState(deployment != null ? String(deployment) : '')

  useEffect(() => {
    setEmployeeInput(employee != null ? String(employee) : '')
  }, [employee])
  useEffect(() => {
    setDeploymentInput(deployment != null ? String(deployment) : '')
  }, [deployment])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await listDeploymentHistory({
          employee,
          deployment,
          action_type: actionType || undefined,
          search: search.trim() || undefined,
          page,
        })
        if (!cancelled) {
          setRows(res.items)
          setCount(res.count)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load deployment history').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [employee, deployment, actionType, search, page])

  function setField(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    p.set('page', '1')
    setParams(p, { replace: true })
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Deployment history</h2>
        <p className="text-sm text-app-secondary">
          Audit trail of every employee and deployment lifecycle action.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtle" aria-hidden />
          <input
            type="search"
            placeholder="Search employee code or name…"
            value={search}
            onChange={(e) => setField('search', e.target.value)}
            className="w-full rounded-panel border border-app-border bg-app-surface py-2 pl-9 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select id="dh_action" label="Action" value={actionType} onChange={(e) => setField('action_type', e.target.value)}>
            {ACTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="dh_emp"
                label="Employee ID"
                type="number"
                min={1}
                placeholder="e.g. 42"
                value={employeeInput}
                onChange={(e) => setEmployeeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setField('employee', employeeInput.trim())
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 px-3 text-sm"
              onClick={() => setField('employee', employeeInput.trim())}
            >
              Apply
            </Button>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="dh_dep"
                label="Deployment ID"
                type="number"
                min={1}
                placeholder="e.g. 17"
                value={deploymentInput}
                onChange={(e) => setDeploymentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setField('deployment', deploymentInput.trim())
                }}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              className="min-h-10 px-3 text-sm"
              onClick={() => setField('deployment', deploymentInput.trim())}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading history…" /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No history yet" description="No lifecycle actions match your filters." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">When</TH>
                  <TH className="py-2">Action</TH>
                  <TH className="py-2">Employee</TH>
                  <TH className="py-2">Deployment / Site</TH>
                  <TH className="py-2">Status change</TH>
                  <TH className="py-2">Actor</TH>
                  <TH className="py-2">Note</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((h) => {
                  const siteLabel = h.to_site_name ?? h.from_site_name ?? null
                  const deploymentLabel = h.deployment != null ? `Deployment #${h.deployment}` : 'Employee action'
                  return (
                    <TR key={h.id}>
                      <TD className="py-2 text-xs text-app-secondary">{fmtDateTime(h.created_at)}</TD>
                      <TD className="py-2">
                        <Badge variant={actionVariant(h.action_type)} className="text-[11px]">
                          {actionLabel(h.action_type)}
                        </Badge>
                      </TD>
                      <TD className="py-2 text-xs">
                        <Link
                          to={`/deployment/site-deployments?employee=${h.employee}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {h.employee_full_name ?? `Employee #${h.employee}`}
                        </Link>
                        {h.employee_code ? (
                          <p className="font-mono text-[11px] text-app-secondary">{h.employee_code}</p>
                        ) : null}
                      </TD>
                      <TD className="py-2 text-xs">
                        {h.deployment != null ? (
                          <Link
                            to={`/deployment/site-deployments?employee=${h.employee}`}
                            className="text-brand-700 hover:underline"
                          >
                            {deploymentLabel}
                          </Link>
                        ) : (
                          <span className="text-app-subtle">{deploymentLabel}</span>
                        )}
                        {siteLabel ? <p className="text-app-secondary">{siteLabel}</p> : null}
                      </TD>
                      <TD className="py-2 text-xs">
                        {h.from_status || h.to_status ? (
                          <span>
                            <span className="text-app-secondary">{h.from_status || '—'}</span>
                            <span className="mx-1 text-app-subtle">→</span>
                            <span className="font-medium text-app-text">{h.to_status || '—'}</span>
                          </span>
                        ) : (
                          <span className="text-app-subtle">—</span>
                        )}
                      </TD>
                      <TD className="py-2 text-xs">{h.actor_username ?? <span className="text-app-subtle">—</span>}</TD>
                      <TD className="py-2 max-w-xs text-xs">
                        {h.note ? (
                          <span className="block truncate" title={h.note}>
                            {h.note}
                          </span>
                        ) : (
                          <span className="text-app-subtle">—</span>
                        )}
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((h) => {
              const siteLabel = h.to_site_name ?? h.from_site_name ?? null
              return (
                <div key={h.id} className="rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant={actionVariant(h.action_type)} className="text-[11px]">
                      {actionLabel(h.action_type)}
                    </Badge>
                    <span className="text-[11px] text-app-subtle">{fmtDateTime(h.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm">
                    <Link
                      to={`/deployment/site-deployments?employee=${h.employee}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {h.employee_full_name ?? `Employee #${h.employee}`}
                    </Link>
                    {h.employee_code ? (
                      <span className="ml-2 font-mono text-[11px] text-app-secondary">{h.employee_code}</span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-app-secondary">
                    {h.deployment != null ? `Deployment #${h.deployment}` : 'Employee action'}
                    {siteLabel ? ` · ${siteLabel}` : ''}
                  </p>
                  {h.from_status || h.to_status ? (
                    <p className="mt-1 text-xs">
                      <span className="text-app-secondary">{h.from_status || '—'}</span>
                      <span className="mx-1 text-app-subtle">→</span>
                      <span className="font-medium text-app-text">{h.to_status || '—'}</span>
                    </p>
                  ) : null}
                  {h.actor_username ? (
                    <p className="mt-1 text-xs text-app-subtle">By {h.actor_username}</p>
                  ) : null}
                  {h.note ? <p className="mt-1 text-xs italic text-app-secondary">{h.note}</p> : null}
                </div>
              )
            })}
          </div>

          {count != null ? <p className="text-xs text-app-subtle">Total: {count}</p> : null}
        </>
      ) : null}
    </div>
  )
}
