import { useEffect, useMemo, useState } from 'react'
import {
  activateDeployment,
  cancelDeployment,
  completeDeployment,
  exitEmployee,
  reactivateEmployee,
  suspendEmployee,
  transferDeployment,
} from '@/api/deployment'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import type {
  DeploymentTransferResult,
  EmployeeRow,
  SiteDeploymentRow,
} from '@/features/deployment/types'

export type DeploymentActionKind =
  | 'employee-suspend'
  | 'employee-reactivate'
  | 'employee-exit'
  | 'deployment-activate'
  | 'deployment-cancel'
  | 'deployment-complete'
  | 'deployment-transfer'

export type DeploymentActionResult =
  | { kind: 'employee'; row: EmployeeRow }
  | { kind: 'deployment'; row: SiteDeploymentRow }
  | { kind: 'transfer'; result: DeploymentTransferResult }

interface DeploymentActionDrawerProps {
  open: boolean
  onClose: () => void
  action: DeploymentActionKind | null
  employee?: EmployeeRow | null
  deployment?: SiteDeploymentRow | null
  onSuccess: (result: DeploymentActionResult) => void
}

interface ActionMeta {
  title: string
  description?: string
  confirmLabel: string
  variant: 'primary' | 'danger' | 'secondary'
}

function metaFor(action: DeploymentActionKind, name?: string | null): ActionMeta {
  const subject = name ? ` for ${name}` : ''
  switch (action) {
    case 'employee-suspend':
      return {
        title: 'Suspend employee',
        description: `Pause active deployments${subject}. The employee can be reactivated later.`,
        confirmLabel: 'Confirm suspend',
        variant: 'secondary',
      }
    case 'employee-reactivate':
      return {
        title: 'Reactivate employee',
        description: `Restore employee${subject} to active status.`,
        confirmLabel: 'Confirm reactivate',
        variant: 'primary',
      }
    case 'employee-exit':
      return {
        title: 'Exit employee',
        description: `Record the exit${subject}. This terminates any active deployment.`,
        confirmLabel: 'Confirm exit',
        variant: 'danger',
      }
    case 'deployment-activate':
      return {
        title: 'Activate deployment',
        description: 'Move this deployment from planned to active.',
        confirmLabel: 'Activate',
        variant: 'primary',
      }
    case 'deployment-cancel':
      return {
        title: 'Cancel deployment',
        description: 'Mark this deployment as cancelled. Cannot be undone.',
        confirmLabel: 'Confirm cancel',
        variant: 'danger',
      }
    case 'deployment-complete':
      return {
        title: 'Complete deployment',
        description: 'Mark this deployment as completed. Optionally set the end date.',
        confirmLabel: 'Complete',
        variant: 'primary',
      }
    case 'deployment-transfer':
      return {
        title: 'Transfer deployment',
        description: 'Move this employee to a different site (and optionally a different job role).',
        confirmLabel: 'Transfer',
        variant: 'primary',
      }
  }
}

export function DeploymentActionDrawer({
  open,
  onClose,
  action,
  employee,
  deployment,
  onSuccess,
}: DeploymentActionDrawerProps) {
  const [note, setNote] = useState('')
  const [exitedOn, setExitedOn] = useState('')
  const [endDate, setEndDate] = useState('')
  const [transferSiteId, setTransferSiteId] = useState('')
  const [transferJobRoleId, setTransferJobRoleId] = useState('')
  const [transferStartDate, setTransferStartDate] = useState('')
  const [activateNew, setActivateNew] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [roles, setRoles] = useState<JobRoleRow[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const isTransfer = action === 'deployment-transfer'

  useEffect(() => {
    if (open) {
      setNote('')
      setExitedOn('')
      setEndDate('')
      setTransferSiteId('')
      setTransferJobRoleId('')
      setTransferStartDate('')
      setActivateNew(false)
      setError(null)
      setLookupError(null)
    }
  }, [open, action])

  useEffect(() => {
    if (!open || !isTransfer) return
    let cancelled = false
    void (async () => {
      setLookupsLoading(true)
      setLookupError(null)
      try {
        const [siteRes, roleRes] = await Promise.all([
          listSites({ is_active: true, page: 1 }),
          listJobRoles({ is_active: true, page: 1 }),
        ])
        if (cancelled) return
        setSites(siteRes.items)
        setRoles(roleRes.items)
      } catch (e: unknown) {
        if (!cancelled) {
          setLookupError(parseApiError(e, 'Could not load sites or job roles').message)
        }
      } finally {
        if (!cancelled) setLookupsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, isTransfer])

  const meta = useMemo<ActionMeta | null>(() => {
    if (!action) return null
    const name = action.startsWith('employee-')
      ? employee?.full_name ?? `${employee?.first_name ?? ''} ${employee?.last_name ?? ''}`.trim()
      : deployment?.employee_full_name ?? null
    return metaFor(action, name)
  }, [action, employee, deployment])

  async function handleSubmit() {
    if (!action || busy) return
    setBusy(true)
    setError(null)
    try {
      switch (action) {
        case 'employee-suspend': {
          if (!employee) throw new Error('Missing employee.')
          const row = await suspendEmployee(employee.id, { note: note.trim() })
          onSuccess({ kind: 'employee', row })
          onClose()
          break
        }
        case 'employee-reactivate': {
          if (!employee) throw new Error('Missing employee.')
          const row = await reactivateEmployee(employee.id, { note: note.trim() })
          onSuccess({ kind: 'employee', row })
          onClose()
          break
        }
        case 'employee-exit': {
          if (!employee) throw new Error('Missing employee.')
          const row = await exitEmployee(employee.id, {
            note: note.trim(),
            exited_on: exitedOn || null,
          })
          onSuccess({ kind: 'employee', row })
          onClose()
          break
        }
        case 'deployment-activate': {
          if (!deployment) throw new Error('Missing deployment.')
          const row = await activateDeployment(deployment.id, { note: note.trim() })
          onSuccess({ kind: 'deployment', row })
          onClose()
          break
        }
        case 'deployment-cancel': {
          if (!deployment) throw new Error('Missing deployment.')
          const row = await cancelDeployment(deployment.id, { note: note.trim() })
          onSuccess({ kind: 'deployment', row })
          onClose()
          break
        }
        case 'deployment-complete': {
          if (!deployment) throw new Error('Missing deployment.')
          const row = await completeDeployment(deployment.id, {
            note: note.trim(),
            end_date: endDate || null,
          })
          onSuccess({ kind: 'deployment', row })
          onClose()
          break
        }
        case 'deployment-transfer': {
          if (!deployment) throw new Error('Missing deployment.')
          const siteId = Number(transferSiteId)
          if (!Number.isFinite(siteId) || siteId < 1) {
            setError('Choose a destination site.')
            setBusy(false)
            return
          }
          const roleId = transferJobRoleId ? Number(transferJobRoleId) : null
          const result = await transferDeployment(deployment.id, {
            site: siteId,
            job_role: roleId,
            start_date: transferStartDate || null,
            activate_new: activateNew,
            note: note.trim(),
          })
          onSuccess({ kind: 'transfer', result })
          onClose()
          break
        }
      }
    } catch (e: unknown) {
      setError(parseApiError(e, 'Action failed').message)
    } finally {
      setBusy(false)
    }
  }

  if (!action || !meta) return null

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title={meta.title}
      description={meta.description}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 px-3 text-sm"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={meta.variant}
            className="min-h-9 px-3 text-sm"
            disabled={busy || (isTransfer && (lookupsLoading || !transferSiteId))}
            onClick={() => void handleSubmit()}
          >
            {busy ? 'Saving…' : meta.confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {action === 'employee-exit' ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="da_exited_on" className="text-sm font-medium text-app-secondary">
              Exit date
            </label>
            <input
              id="da_exited_on"
              type="date"
              value={exitedOn}
              onChange={(e) => setExitedOn(e.target.value)}
              disabled={busy}
              className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <p className="text-xs text-app-subtle">Optional. Defaults to today on the backend if left blank.</p>
          </div>
        ) : null}

        {action === 'deployment-complete' ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="da_end_date" className="text-sm font-medium text-app-secondary">
              End date
            </label>
            <input
              id="da_end_date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={busy}
              className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            <p className="text-xs text-app-subtle">Optional. Defaults to today on the backend if left blank.</p>
          </div>
        ) : null}

        {isTransfer ? (
          <div className="space-y-3">
            {lookupError ? <ErrorState message={lookupError} /> : null}
            <Select
              id="da_transfer_site"
              label="Destination site"
              value={transferSiteId}
              onChange={(e) => setTransferSiteId(e.target.value)}
              disabled={busy || lookupsLoading}
            >
              <option value="">{lookupsLoading ? 'Loading sites…' : 'Select a site'}</option>
              {sites.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select
              id="da_transfer_role"
              label="New job role (optional)"
              value={transferJobRoleId}
              onChange={(e) => setTransferJobRoleId(e.target.value)}
              disabled={busy || lookupsLoading}
            >
              <option value="">Keep current role</option>
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </Select>
            <div className="flex flex-col gap-1">
              <label htmlFor="da_transfer_start" className="text-sm font-medium text-app-secondary">
                New deployment start date
              </label>
              <input
                id="da_transfer_start"
                type="date"
                value={transferStartDate}
                onChange={(e) => setTransferStartDate(e.target.value)}
                disabled={busy}
                className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              <p className="text-xs text-app-subtle">Optional. Defaults to today on the backend.</p>
            </div>
            <label className="flex items-start gap-2 text-sm text-app-text">
              <input
                type="checkbox"
                checked={activateNew}
                onChange={(e) => setActivateNew(e.target.checked)}
                disabled={busy}
                className="mt-0.5 h-4 w-4 rounded border-app-border"
              />
              <span>
                Activate new deployment immediately
                <span className="block text-xs text-app-subtle">
                  Otherwise the new deployment will start in <em>planned</em> status.
                </span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="da_note" className="text-sm font-medium text-app-secondary">
            Note (optional)
          </label>
          <textarea
            id="da_note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            placeholder="Add context for the audit log…"
            className="min-h-[72px] rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
          />
        </div>

        {error ? <ErrorState message={error} /> : null}

        {employee ? (
          <p className="text-xs text-app-subtle">
            Employee:{' '}
            <span className="font-medium text-app-text">
              {employee.full_name ?? `${employee.first_name} ${employee.last_name}`.trim()}
            </span>{' '}
            <span className="font-mono">[{employee.employee_code}]</span>
          </p>
        ) : null}

        {deployment ? (
          <p className="text-xs text-app-subtle">
            Deployment #{deployment.id} ·{' '}
            <span className="font-medium text-app-text">
              {deployment.employee_full_name ?? `Employee #${deployment.employee}`}
            </span>{' '}
            @ {deployment.site_name ?? `Site #${deployment.site}`}
          </p>
        ) : null}
      </div>
    </Drawer>
  )
}
