import {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Plus,
  SendHorizontal,
  Trash2,
} from 'lucide-react'
import {
  createMRF,
  createMRFLineItem,
  deleteMRFLineItem,
  getMRF,
  getMRFReadiness,
  listMRFLineItems,
  updateMRF,
  updateMRFLineItem,
} from '@/api/mrf'
import {
  getMRFWorkflowConfigCheck,
  listAvailableApprovalRoutes,
  startMRFWorkflow,
} from '@/api/workflow'
import { listSiteRoleRequirements, type SiteRoleRequirementRow } from '@/api/siteRoleRequirements'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ApprovalRouteSelector } from '@/features/workflow/ApprovalRouteSelector'
import { DefaultWorkflowConfigPreview } from '@/features/workflow/DefaultWorkflowConfigPreview'
import type { ApprovalRoutePreview, WorkflowConfigCheck } from '@/features/workflow/types'
import type { SiteOption } from '@/features/mrf/MRFForm'
import { compareBillingRates } from '@/features/mrf/mrfClientMode'
import {
  applySrrToRoleRow,
  clientLineItemWritePayload,
  clientMrfHeaderToWritePayload,
  clientRoleRowFromLineItem,
  getRateStatusMessage,
  getRateStatusVariant,
  newClientRoleRow,
  summarizeClientRequest,
  validateClientRoleRows,
  type ClientRoleRequestRow,
} from '@/features/mrf/mrfClientLineItem'
import { formatCommercialMoney } from '@/features/mrf/mrfCommercialOverride'
import { formatMrfWorkflowStartError, normalizeMrfReadiness } from '@/features/mrf/mrfReadiness'
import { MrfSectionPanel, SummaryWidgets } from '@/features/mrf/mrfClientFormLayout'
import { formatSrrOptionLabel } from '@/features/mrf/mrfSrrDisplay'
import type { MRFRow } from '@/features/mrf/types'
import { cn } from '@/lib/cn'

export type MRFClientRequestFormHandle = {
  saveDraft: () => Promise<void>
  submitForApproval: () => Promise<void>
}

type BusyMode = 'idle' | 'saving' | 'sending'

function isPastDate(yyyyMmDd: string): boolean {
  if (!yyyyMmDd) return false
  const d = new Date(`${yyyyMmDd}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

type FlowStepId = 'site' | 'roles' | 'details' | 'approval'

const FLOW_STEPS: { id: FlowStepId; label: string; step: number }[] = [
  { id: 'site', label: 'Site', step: 1 },
  { id: 'roles', label: 'Roles', step: 2 },
  { id: 'details', label: 'Details', step: 3 },
  { id: 'approval', label: 'Approval', step: 4 },
]

function FlowStepConnector({ filled }: { filled: boolean }) {
  return (
    <div className="mx-2 mt-4 h-px min-w-[0.75rem] flex-1 bg-app-border" aria-hidden>
      <div
        className={cn(
          'h-full bg-brand-600 transition-all duration-500 ease-out',
          filled ? 'w-full' : 'w-0',
        )}
      />
    </div>
  )
}

function FlowStepIndicator({
  step,
  active,
  complete,
}: {
  step: number
  active: boolean
  complete: boolean
}) {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center">
      {active && !complete ? (
        <span
          className="absolute -inset-1 animate-pulse rounded-full border border-brand-500/60"
          aria-hidden
        />
      ) : null}
      <span
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
          complete && 'bg-brand-600 text-white',
          active && !complete && 'border-2 border-brand-600 bg-app-surface text-brand-700 dark:text-brand-300',
          !active && !complete && 'border-2 border-app-border bg-app-surface text-app-subtle',
        )}
      >
        {complete ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : step}
      </span>
    </div>
  )
}

function FlowStepper({
  activeId,
  complete,
}: {
  activeId: FlowStepId
  complete: Record<FlowStepId, boolean>
}) {
  return (
    <nav aria-label="Form progress" className="border-b border-app-border pb-5">
      <div className="flex items-start">
        {FLOW_STEPS.map(({ id, label, step }, index) => (
          <Fragment key={id}>
            <div className="flex min-w-[4.5rem] flex-1 flex-col items-center gap-2">
              <FlowStepIndicator
                step={step}
                active={activeId === id}
                complete={complete[id]}
              />
              <span
                className={cn(
                  'text-center text-[11px] font-medium leading-tight',
                  complete[id] || activeId === id ? 'text-app-text' : 'text-app-subtle',
                )}
              >
                {label}
              </span>
            </div>
            {index < FLOW_STEPS.length - 1 ? (
              <FlowStepConnector filled={complete[id]} />
            ) : null}
          </Fragment>
        ))}
      </div>
    </nav>
  )
}

function RoleRowPanel({
  index,
  title,
  subtitle,
  canRemove,
  busy,
  onRemove,
  children,
}: {
  index: number
  title: string
  subtitle?: string | null
  canRemove: boolean
  busy: boolean
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 bg-slate-200/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/70">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Role {index}
          </p>
          <p className="truncate text-sm font-semibold text-app-text">{title}</p>
          {subtitle ? <p className="mt-0.5 text-xs text-app-secondary">{subtitle}</p> : null}
        </div>
        {canRemove ? (
          <button
            type="button"
            className="shrink-0 text-app-subtle transition-colors hover:text-status-danger disabled:opacity-50"
            disabled={busy}
            onClick={onRemove}
            aria-label={`Remove ${title}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="space-y-3 bg-white p-3 dark:bg-app-surface">{children}</div>
    </div>
  )
}

export const MRFClientRequestForm = forwardRef<MRFClientRequestFormHandle, {
  siteOptions: SiteOption[]
  lookupError: string | null
  initialMRF?: MRFRow | null
  canWorkflowStart: boolean
  onSaved: (mrf: MRFRow) => void
  onSubmittedForApproval?: (mrf: MRFRow) => void
  onSubmittingChange?: (busy: boolean) => void
  onBusyModeChange?: (mode: BusyMode) => void
  onSubmitBlockedChange?: (blocked: boolean) => void
}>(function MRFClientRequestForm(
  {
    siteOptions,
    lookupError,
    initialMRF,
    canWorkflowStart,
    onSaved,
    onSubmittedForApproval,
    onSubmittingChange,
    onBusyModeChange,
    onSubmitBlockedChange,
  },
  ref,
) {
  const [mrfRecord, setMrfRecord] = useState<MRFRow | null>(initialMRF ?? null)
  const [site, setSite] = useState(() => (initialMRF?.site != null ? String(initialMRF.site) : ''))
  const [requiredByDate, setRequiredByDate] = useState(() => initialMRF?.required_by_date ?? '')
  const [reason, setReason] = useState(() => initialMRF?.reason ?? '')
  const [roleRows, setRoleRows] = useState<ClientRoleRequestRow[]>(() => [newClientRoleRow()])
  const [originalLineIds, setOriginalLineIds] = useState<number[]>([])

  const [srrRows, setSrrRows] = useState<SiteRoleRequirementRow[]>([])
  const [srrLoading, setSrrLoading] = useState(false)
  const [srrError, setSrrError] = useState<string | null>(null)

  const [busyMode, setBusyMode] = useState<BusyMode>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [readinessErrors, setReadinessErrors] = useState<string[]>([])
  const [workflowSuccess, setWorkflowSuccess] = useState(false)

  const [availableRoutes, setAvailableRoutes] = useState<ApprovalRoutePreview[]>([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [routesError, setRoutesError] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)

  const [configCheck, setConfigCheck] = useState<WorkflowConfigCheck | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)

  const [removeTarget, setRemoveTarget] = useState<ClientRoleRequestRow | null>(null)

  const busy = busyMode !== 'idle'

  useEffect(() => {
    onSubmittingChange?.(busy)
    onBusyModeChange?.(busyMode)
  }, [busy, busyMode, onSubmittingChange, onBusyModeChange])

  useEffect(() => {
    if (!initialMRF) return
    setMrfRecord(initialMRF)
    setSite(String(initialMRF.site))
    setRequiredByDate(initialMRF.required_by_date ?? '')
    setReason(initialMRF.reason ?? '')
    setWorkflowSuccess(false)

    void (async () => {
      try {
        const items =
          (initialMRF.line_items?.length ?? 0) > 0
            ? (initialMRF.line_items ?? [])
            : (await listMRFLineItems({ mrf: initialMRF.id })).items
        if (items.length > 0) {
          setRoleRows(items.map(clientRoleRowFromLineItem))
          setOriginalLineIds(items.map((li) => li.id))
        }
      } catch {
        setRoleRows([newClientRoleRow()])
        setOriginalLineIds([])
      }
    })()
  }, [initialMRF?.id])

  const selectedSite = useMemo(
    () => siteOptions.find((s) => s.id === Number(site)),
    [siteOptions, site],
  )

  const isWorkflowNotStarted =
    !mrfRecord?.workflow_status || mrfRecord.workflow_status === 'not_started'

  const selectedRoute = useMemo(
    () => availableRoutes.find((r) => r.id === selectedRouteId) ?? null,
    [availableRoutes, selectedRouteId],
  )

  useEffect(() => {
    const siteId = Number(site)
    if (!Number.isFinite(siteId) || siteId <= 0) {
      setSrrRows([])
      setSrrError(null)
      return
    }
    let cancelled = false
    setSrrLoading(true)
    setSrrError(null)
    void (async () => {
      try {
        const res = await listSiteRoleRequirements({
          site: siteId,
          is_active: true,
          billing_type: 'billable',
          page: 1,
        })
        if (!cancelled) setSrrRows(res.items)
      } catch (e: unknown) {
        if (!cancelled) {
          setSrrRows([])
          setSrrError(parseApiError(e, 'Failed to load approved roles for this site').message)
        }
      } finally {
        if (!cancelled) setSrrLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [site])

  useEffect(() => {
    if (!canWorkflowStart || !isWorkflowNotStarted) {
      setAvailableRoutes([])
      setRoutesError(null)
      setSelectedRouteId(null)
      return
    }
    const siteId = Number(site)
    if (!Number.isFinite(siteId) || siteId <= 0) {
      setAvailableRoutes([])
      return
    }

    let cancelled = false
    setRoutesLoading(true)
    setRoutesError(null)
    setAvailableRoutes([])
    setSelectedRouteId(null)

    void (async () => {
      try {
        const clientId = selectedSite?.client
        const res = await listAvailableApprovalRoutes({
          trigger_type: 'mrf',
          site: siteId,
          ...(clientId != null && Number.isFinite(clientId) ? { client: clientId } : {}),
        })
        if (cancelled) return
        const list = res.results ?? []
        setAvailableRoutes(list)
        if (list.length === 1 && list[0]) {
          setSelectedRouteId(list[0].id)
        } else {
          const def = list.filter((r) => r.is_default)
          if (def.length === 1 && def[0]) setSelectedRouteId(def[0].id)
        }
      } catch (e: unknown) {
        if (cancelled) return
        if (axios.isAxiosError(e) && e.response?.status === 403) {
          setRoutesError('You do not have permission to view approval routes.')
        } else {
          setRoutesError(parseApiError(e, 'Failed to load approval routes').message)
        }
      } finally {
        if (!cancelled) setRoutesLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [site, selectedSite?.client, canWorkflowStart, isWorkflowNotStarted])

  useEffect(() => {
    if (!canWorkflowStart || !isWorkflowNotStarted || workflowSuccess) {
      setConfigCheck(null)
      setConfigLoading(false)
      setConfigError(null)
      return
    }

    const mrfId = mrfRecord?.id
    if (!mrfId) {
      setConfigCheck(null)
      setConfigLoading(false)
      setConfigError(null)
      return
    }

    if (routesLoading) return

    if (availableRoutes.length > 0) {
      setConfigCheck(null)
      setConfigLoading(false)
      setConfigError(null)
      return
    }

    let cancelled = false
    setConfigLoading(true)
    setConfigError(null)
    setConfigCheck(null)

    void (async () => {
      try {
        const data = await getMRFWorkflowConfigCheck(mrfId)
        if (!cancelled) setConfigCheck(data)
      } catch (e: unknown) {
        if (!cancelled) {
          setConfigCheck(null)
          setConfigError(parseApiError(e, 'Could not verify default approval flow.').message)
        }
      } finally {
        if (!cancelled) setConfigLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    mrfRecord?.id,
    canWorkflowStart,
    isWorkflowNotStarted,
    workflowSuccess,
    routesLoading,
    availableRoutes.length,
  ])

  const defaultFlowSubmitBlocked = useMemo(() => {
    if (!canWorkflowStart || !isWorkflowNotStarted || !mrfRecord?.id) return false
    if (availableRoutes.length > 0) return false
    if (routesLoading) return true
    return configLoading || !!configError || configCheck?.ok !== true
  }, [
    canWorkflowStart,
    isWorkflowNotStarted,
    mrfRecord?.id,
    availableRoutes.length,
    routesLoading,
    configLoading,
    configError,
    configCheck?.ok,
  ])

  useEffect(() => {
    onSubmitBlockedChange?.(defaultFlowSubmitBlocked)
  }, [defaultFlowSubmitBlocked, onSubmitBlockedChange])

  const siteError = useMemo(() => (site ? null : 'Site is required.'), [site])
  const requiredByError = useMemo(() => {
    if (!requiredByDate) return null
    return isPastDate(requiredByDate) ? 'Required by date cannot be in the past.' : null
  }, [requiredByDate])
  const roleRowsError = useMemo(() => validateClientRoleRows(roleRows), [roleRows])
  const summary = useMemo(() => summarizeClientRequest(roleRows), [roleRows])

  const srrById = useMemo(() => new Map(srrRows.map((s) => [String(s.id), s])), [srrRows])

  const formValid =
    !lookupError && !siteError && !requiredByError && !roleRowsError && !srrError

  function handleSiteChange(nextSite: string) {
    setSite(nextSite)
    setRoleRows([newClientRoleRow()])
    setOriginalLineIds([])
    setReadinessErrors([])
    setSubmitError(null)
  }

  function updateRoleRow(localKey: string, patch: Partial<ClientRoleRequestRow>) {
    setRoleRows((prev) => prev.map((r) => (r.localKey === localKey ? { ...r, ...patch } : r)))
  }

  function handleSrrSelect(localKey: string, srrId: string) {
    const srr = srrById.get(srrId)
    if (!srr) {
      updateRoleRow(localKey, {
        siteRoleRequirementId: '',
        jobRoleId: '',
        roleLabel: '',
        approvedRate: '',
      })
      return
    }
    setRoleRows((prev) =>
      prev.map((r) => (r.localKey === localKey ? applySrrToRoleRow(r, srr) : r)),
    )
  }

  function addRoleRow() {
    setRoleRows((prev) => [...prev, newClientRoleRow()])
  }

  function confirmRemoveRole() {
    if (!removeTarget) return
    setRoleRows((prev) => prev.filter((r) => r.localKey !== removeTarget.localKey))
    setRemoveTarget(null)
  }

  async function persistMrf(): Promise<MRFRow> {
    const validationMsg =
      lookupError ||
      siteError ||
      requiredByError ||
      roleRowsError ||
      srrError ||
      null
    if (validationMsg) {
      throw new Error(validationMsg)
    }

    const headerPayload = clientMrfHeaderToWritePayload({
      site,
      required_by_date: requiredByDate,
      reason,
    })

    let mrf: MRFRow
    if (mrfRecord?.id) {
      mrf = await updateMRF(mrfRecord.id, headerPayload)
    } else {
      mrf = await createMRF(headerPayload)
    }

    const keptLineIds = new Set<number>()
    const activeRows = roleRows.filter((r) => r.siteRoleRequirementId.trim())

    for (const row of activeRows) {
      const payload = clientLineItemWritePayload(mrf.id, row)
      if (row.lineItemId != null) {
        await updateMRFLineItem(row.lineItemId, payload)
        keptLineIds.add(row.lineItemId)
      } else {
        const created = await createMRFLineItem(payload)
        keptLineIds.add(created.id)
      }
    }

    for (const id of originalLineIds) {
      if (!keptLineIds.has(id)) {
        await deleteMRFLineItem(id)
      }
    }

    const refreshedItems = await listMRFLineItems({ mrf: mrf.id })
    const fullMrf: MRFRow = { ...mrf, line_items: refreshedItems.items }
    setMrfRecord(fullMrf)
    setOriginalLineIds(refreshedItems.items.map((li) => li.id))
    setRoleRows(refreshedItems.items.map(clientRoleRowFromLineItem))
    return fullMrf
  }

  async function saveDraft() {
    if (!formValid || busy) return
    setBusyMode('saving')
    setSubmitError(null)
    setReadinessErrors([])
    try {
      const mrf = await persistMrf()
      onSaved(mrf)
    } catch (err: unknown) {
      setSubmitError(parseApiError(err, 'Save failed').message)
    } finally {
      setBusyMode('idle')
    }
  }

  async function submitForApproval() {
    if (!formValid || busy) return
    if (!canWorkflowStart) {
      setSubmitError('You do not have permission to submit for approval.')
      return
    }
    if (!isWorkflowNotStarted) return

    setBusyMode('sending')
    setSubmitError(null)
    setReadinessErrors([])
    setWorkflowSuccess(false)

    try {
      const mrf = await persistMrf()

      const raw = await getMRFReadiness(mrf.id)
      const readiness = normalizeMrfReadiness(raw, mrf)
      if (!readiness.ok) {
        setReadinessErrors(readiness.errors)
        setSubmitError('MRF is not ready for approval. Fix the issues below.')
        return
      }

      if (availableRoutes.length > 0) {
        if (selectedRouteId == null) {
          setSubmitError('Select an approval route before sending.')
          return
        }
        if (selectedRoute?.ok === false) {
          setSubmitError('This route is missing approvers. Choose another route.')
          return
        }
      } else {
        let check = configCheck
        if (!check && !configError && !configLoading) {
          try {
            check = await getMRFWorkflowConfigCheck(mrf.id)
            setConfigCheck(check)
          } catch (err: unknown) {
            setConfigError(parseApiError(err, 'Could not verify default approval flow.').message)
            setSubmitError('Default approval flow is not ready.')
            return
          }
        }
        if (configLoading) {
          setSubmitError('Default approval flow is still being checked.')
          return
        }
        if (configError || check?.ok !== true) {
          setSubmitError('Default approval flow is not ready.')
          return
        }
      }

      const routeArg = availableRoutes.length > 0 ? (selectedRouteId ?? undefined) : undefined
      await startMRFWorkflow(mrf.id, routeArg)
      const refreshed = await getMRF(mrf.id)
      setMrfRecord(refreshed)
      setWorkflowSuccess(true)
      onSubmittedForApproval?.(refreshed)
    } catch (err: unknown) {
      setSubmitError(formatMrfWorkflowStartError(err))
    } finally {
      setBusyMode('idle')
    }
  }

  const filledRoleCount = useMemo(
    () => roleRows.filter((r) => r.siteRoleRequirementId.trim()).length,
    [roleRows],
  )

  const flowComplete = useMemo(
    (): Record<FlowStepId, boolean> => ({
      site: Boolean(site),
      roles: filledRoleCount > 0 && !roleRowsError,
      details: Boolean(requiredByDate) && !requiredByError,
      approval: workflowSuccess || !isWorkflowNotStarted,
    }),
    [
      site,
      filledRoleCount,
      roleRowsError,
      requiredByDate,
      requiredByError,
      workflowSuccess,
      isWorkflowNotStarted,
    ],
  )

  const activeFlowStep = useMemo((): FlowStepId => {
    if (!site) return 'site'
    if (!flowComplete.roles) return 'roles'
    if (!flowComplete.details) return 'details'
    return 'approval'
  }, [site, flowComplete.roles, flowComplete.details])

  useImperativeHandle(ref, () => ({ saveDraft, submitForApproval }), [
    formValid,
    busy,
    canWorkflowStart,
    isWorkflowNotStarted,
    availableRoutes,
    selectedRouteId,
    selectedRoute,
    site,
    requiredByDate,
    reason,
    roleRows,
    originalLineIds,
    mrfRecord,
    configCheck,
    configLoading,
    configError,
  ])

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-app-text">Manpower request</h2>
            <p className="mt-0.5 text-sm text-app-secondary">
              {selectedSite?.label ?? 'Complete each section below, then submit for approval.'}
            </p>
          </div>
          {mrfRecord?.id ? (
            <span className="text-xs text-app-subtle">Draft #{mrfRecord.id}</span>
          ) : null}
        </div>

        <FlowStepper activeId={activeFlowStep} complete={flowComplete} />

        {lookupError ? <ErrorState message={`Site lookup failed. ${lookupError}`} /> : null}
        {submitError ? (
          <div className="flex gap-3 rounded-xl border border-status-danger/30 bg-status-danger/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-status-danger" aria-hidden />
            <p className="text-sm text-status-danger">{submitError}</p>
          </div>
        ) : null}

        {workflowSuccess ? (
          <div className="flex gap-3 rounded-xl border border-status-success/30 bg-gradient-to-r from-status-success/10 to-emerald-500/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-success" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-app-text">MRF sent for approval</p>
              <p className="mt-0.5 text-xs text-app-secondary">Your request is now with the approvers.</p>
            </div>
          </div>
        ) : null}

        {!isWorkflowNotStarted && !workflowSuccess ? (
          <div className="flex items-center gap-3 rounded-xl border border-app-border bg-app-muted/50 px-4 py-3">
            <SendHorizontal className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <p className="text-sm text-app-secondary">Already sent for approval.</p>
          </div>
        ) : null}

        <MrfSectionPanel title="Site" tone="site">
          <Select
            id="client_mrf_site"
            label="Site"
            value={site}
            onChange={(e) => handleSiteChange(e.target.value)}
            disabled={busy || !!lookupError}
            error={siteError ?? undefined}
          >
            <option value="">Select a site…</option>
            {siteOptions.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.label}
              </option>
            ))}
          </Select>
          {selectedSite ? (
            <p className="text-xs text-app-secondary">
              {srrRows.length} approved role{srrRows.length === 1 ? '' : 's'} at this site
            </p>
          ) : null}
        </MrfSectionPanel>

        <MrfSectionPanel title="Roles" tone="roles">
          {srrError ? <ErrorState message={srrError} /> : null}
          {srrLoading ? <Spinner label="Loading approved roles…" /> : null}
          {!site ? (
            <p className="text-sm text-app-secondary">Select a site to add roles.</p>
          ) : (
            <div className="space-y-4">
              {roleRows.map((row, index) => {
                const rateStatus = compareBillingRates(row.requestedRate, row.approvedRate)
                const rateMsg = getRateStatusMessage(rateStatus)
                const rateVariant = getRateStatusVariant(rateStatus)
                const rowTotal = summarizeClientRequest([row]).totalAmount
                const canRemove = roleRows.length > 1
                const hasRole = Boolean(row.siteRoleRequirementId.trim())

                const roleSubtitle =
                  hasRole && row.approvedRate
                    ? `Approved ${formatCommercialMoney(row.approvedRate) ?? '—'} · ${formatCommercialMoney(String(rowTotal)) ?? '—'} / mo`
                    : null

                return (
                  <RoleRowPanel
                    key={row.localKey}
                    index={index + 1}
                    title={row.roleLabel.trim() || `Role ${index + 1}`}
                    subtitle={roleSubtitle}
                    canRemove={canRemove}
                    busy={busy}
                    onRemove={() => setRemoveTarget(row)}
                  >
                        <Select
                          id={`client_mrf_srr_${row.localKey}`}
                          label="Approved role"
                          value={row.siteRoleRequirementId}
                          onChange={(e) => handleSrrSelect(row.localKey, e.target.value)}
                          disabled={busy || srrLoading || !site}
                        >
                          <option value="">Select approved role…</option>
                          {srrRows.map((srr) => (
                            <option key={srr.id} value={String(srr.id)}>
                              {formatSrrOptionLabel(srr)}
                            </option>
                          ))}
                        </Select>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Input
                            id={`client_mrf_rate_${row.localKey}`}
                            label="Requested rate"
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.requestedRate}
                            onChange={(e) =>
                              updateRoleRow(row.localKey, { requestedRate: e.target.value })
                            }
                            disabled={busy || !row.siteRoleRequirementId}
                          />
                          <Input
                            id={`client_mrf_hc_${row.localKey}`}
                            label="Headcount"
                            type="number"
                            min={1}
                            step={1}
                            value={row.headcount}
                            onChange={(e) =>
                              updateRoleRow(row.localKey, { headcount: e.target.value })
                            }
                            disabled={busy || !row.siteRoleRequirementId}
                          />
                        </div>

                        {rateMsg && rateVariant === 'warning' ? (
                          <p className="text-xs text-amber-700 dark:text-amber-400">{rateMsg}</p>
                        ) : null}
                        {rateMsg && rateVariant === 'neutral' ? (
                          <p className="text-xs text-app-subtle">{rateMsg}</p>
                        ) : null}
                  </RoleRowPanel>
                )
              })}

              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={busy || !site || srrLoading}
                onClick={addRoleRow}
              >
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                Add another role
              </Button>
            </div>
          )}
          {roleRowsError ? (
            <p className="rounded-lg border border-status-danger/30 bg-status-danger/5 px-3 py-2 text-sm text-status-danger">
              {roleRowsError}
            </p>
          ) : null}
        </MrfSectionPanel>

        <MrfSectionPanel title="When & why" tone="details">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,11rem)_1fr] sm:items-start">
            <Input
              id="client_mrf_required_by"
              label="Required by"
              type="date"
              value={requiredByDate}
              onChange={(e) => setRequiredByDate(e.target.value)}
              disabled={busy}
              error={requiredByError ?? undefined}
            />
            <div className="space-y-1">
              <label htmlFor="client_mrf_reason" className="text-sm font-medium text-app-secondary">
                Remarks
              </label>
              <textarea
                id="client_mrf_reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={busy}
                rows={2}
                placeholder="Optional context for approvers"
                className="min-h-[2.75rem] w-full resize-y rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>
        </MrfSectionPanel>

        <SummaryWidgets
          headcount={summary.totalHeadcount}
          amount={formatCommercialMoney(String(summary.totalAmount)) ?? '—'}
        />

        {canWorkflowStart && isWorkflowNotStarted && !workflowSuccess ? (
          <MrfSectionPanel title="Approval" tone="approval">
            {routesLoading ? (
              <Spinner label="Loading approval routes…" />
            ) : routesError ? (
              <ErrorState message={routesError} />
            ) : availableRoutes.length > 0 ? (
              <ApprovalRouteSelector
                compact
                routes={availableRoutes}
                selectedRouteId={selectedRouteId}
                onChange={(id) => {
                  setSelectedRouteId(id)
                  setSubmitError(null)
                }}
                disabled={busy || !site}
              />
            ) : mrfRecord?.id ? (
              <DefaultWorkflowConfigPreview
                compact
                loading={configLoading}
                errorMessage={configError}
                data={configCheck}
              />
            ) : (
              <p className="text-sm text-app-secondary">
                Save a draft to preview approval steps before submitting.
              </p>
            )}
            {readinessErrors.length > 0 ? (
              <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 px-3 py-2">
                <p className="text-xs font-semibold text-status-danger">Readiness issues</p>
                <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-status-danger">
                  {readinessErrors.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </MrfSectionPanel>
        ) : null}

        {!canWorkflowStart ? (
          <p className="rounded-xl border border-app-border bg-app-muted/40 px-4 py-3 text-center text-xs text-app-subtle">
            You can save a draft. Submit for approval requires workflow start permission.
          </p>
        ) : null}
      </div>

      <Drawer
        open={removeTarget != null}
        title="Remove role"
        description={
          removeTarget?.roleLabel.trim()
            ? `Remove ${removeTarget.roleLabel} from this request?`
            : 'Remove this role row from the request?'
        }
        onClose={() => setRemoveTarget(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemoveRole}>
              Remove
            </Button>
          </div>
        }
      >
        {null}
      </Drawer>
    </>
  )
})
