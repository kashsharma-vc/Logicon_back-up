import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { CheckCircle2, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { createMRF, getMRF, getMRFReadiness, updateMRF } from '@/api/mrf'
import { listAvailableApprovalRoutes, startMRFWorkflow } from '@/api/workflow'
import type { DepartmentOption } from '@/api/departments'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import {
  MRFClientRequestForm,
  type MRFClientRequestFormHandle,
} from '@/features/mrf/MRFClientRequestForm'
import { MRFForm, mrfFormValuesToWritePayload, type MRFFormValues, type SiteOption } from '@/features/mrf/MRFForm'
import { useClientMrfWorkspace } from '@/features/mrf/mrfClientMode'
import { MRFLineItemsTable } from '@/features/mrf/MRFLineItemsTable'
import { MRFReadinessPanel } from '@/features/mrf/MRFReadinessPanel'
import { MRFStatusBadge } from '@/features/mrf/MRFStatusBadge'
import { formatMrfWorkflowStartError, normalizeMrfReadiness } from '@/features/mrf/mrfReadiness'
import { ApprovalRouteSelector } from '@/features/workflow/ApprovalRouteSelector'
import type { ApprovalRoutePreview } from '@/features/workflow/types'
import type { MRFReadinessResponse, MRFRow } from '@/features/mrf/types'

type WorkspaceStep = 'request' | 'line_items' | 'readiness' | 'approval'

const STEPS: { id: WorkspaceStep; label: string }[] = [
  { id: 'request', label: 'Request details' },
  { id: 'line_items', label: 'Line items' },
  { id: 'readiness', label: 'Readiness & budget' },
  { id: 'approval', label: 'Send for approval' },
]

function stepIdx(step: WorkspaceStep): number {
  return STEPS.findIndex((s) => s.id === step)
}

export interface MRFCreateWorkspaceDrawerProps {
  open: boolean
  onClose: () => void
  onFinished?: () => void
  initialMRF?: MRFRow | null
  siteOptions: SiteOption[]
  departmentOptions: DepartmentOption[]
  departmentsLoading: boolean
  departmentsError: string | null
  lookupError: string | null
  canReadBudget: boolean
}

const FORM_ID = 'mrf-workspace-request-form'

export function MRFCreateWorkspaceDrawer({
  open,
  onClose,
  onFinished,
  initialMRF = null,
  siteOptions,
  departmentOptions,
  departmentsLoading,
  departmentsError,
  lookupError,
  canReadBudget,
}: MRFCreateWorkspaceDrawerProps) {
  const navigate = useNavigate()
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canWorkflowStart = hasAnyCapability(meCaps, [CAP.WORKFLOW_START])
  const isClientWorkspace = useClientMrfWorkspace(initialMRF)
  const clientFormRef = useRef<MRFClientRequestFormHandle>(null)
  const [clientBusyMode, setClientBusyMode] = useState<'idle' | 'saving' | 'sending'>('idle')
  const [clientSubmitBlocked, setClientSubmitBlocked] = useState(false)

  const [currentStep, setCurrentStep] = useState<WorkspaceStep>('request')
  const [createdMrf, setCreatedMrf] = useState<MRFRow | null>(null)

  const clientWorkflowStarted =
    Boolean(initialMRF?.workflow_status && initialMRF.workflow_status !== 'not_started') ||
    Boolean(createdMrf?.workflow_status && createdMrf.workflow_status !== 'not_started')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [readiness, setReadiness] = useState<MRFReadinessResponse | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [lineItemsVersion, setLineItemsVersion] = useState(0)
  const [lineItemsOpenCreate, setLineItemsOpenCreate] = useState(false)

  const [availableRoutes, setAvailableRoutes] = useState<ApprovalRoutePreview[]>([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [routesError, setRoutesError] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)

  const [startBusy, setStartBusy] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [workflowDone, setWorkflowDone] = useState(false)

  const isWorkflowNotStarted = !createdMrf?.workflow_status || createdMrf.workflow_status === 'not_started'
  const isReadyForApproval = readiness?.ok === true
  const isEditMode = initialMRF != null

  useEffect(() => {
    if (!open) return
    setCurrentStep('request')
    setCreatedMrf(initialMRF)
    setFormSubmitting(false)
    setFormError(null)
    setReadiness(null)
    setReadinessLoading(false)
    setReadinessError(null)
    setLineItemsVersion(0)
    setLineItemsOpenCreate(false)
    setAvailableRoutes([])
    setRoutesLoading(false)
    setRoutesError(null)
    setSelectedRouteId(null)
    setStartBusy(false)
    setStartError(null)
    setWorkflowDone(false)
    setClientBusyMode('idle')
    setClientSubmitBlocked(false)
  }, [open, initialMRF?.id])

  const siteForMrf = useMemo(
    () => (createdMrf ? siteOptions.find((s) => s.id === createdMrf.site) : undefined),
    [createdMrf, siteOptions],
  )

  const selectedRoute = useMemo(
    () => availableRoutes.find((r) => r.id === selectedRouteId) ?? null,
    [availableRoutes, selectedRouteId],
  )

  const startDisabledByRoutes =
    routesLoading ||
    !!routesError ||
    (availableRoutes.length > 0 && (selectedRouteId == null || selectedRoute?.ok === false))

  const startDisabledByReadiness = !isReadyForApproval || readinessLoading || !!readinessError

  // ─── Load readiness ─────────────────────────────────────────────────────
  const loadReadiness = useCallback(async (mrf: MRFRow) => {
    setReadinessLoading(true)
    setReadinessError(null)
    try {
      const raw = await getMRFReadiness(mrf.id)
      setReadiness(normalizeMrfReadiness(raw, mrf))
    } catch (e: unknown) {
      setReadiness(null)
      setReadinessError(parseApiError(e, 'Failed to load readiness').message)
    } finally {
      setReadinessLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!createdMrf || (currentStep !== 'readiness' && currentStep !== 'approval')) return
    void loadReadiness(createdMrf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, createdMrf?.id, lineItemsVersion, loadReadiness])

  // ─── Load approval routes ────────────────────────────────────────────────
  useEffect(() => {
    if (currentStep !== 'approval' || !createdMrf || !canWorkflowStart || !isWorkflowNotStarted) return
    let cancelled = false
    setRoutesLoading(true)
    setRoutesError(null)
    setAvailableRoutes([])
    setSelectedRouteId(null)

    void (async () => {
      try {
        const clientId = siteForMrf?.client
        const res = await listAvailableApprovalRoutes({
          trigger_type: 'mrf',
          site: createdMrf.site,
          ...(clientId != null && Number.isFinite(clientId) ? { client: clientId } : {}),
        })
        if (cancelled) return
        let list = res.results ?? []
        if (createdMrf.billing_type === 'non_billable') {
          list = list.filter((r) => !r.code.includes('fast_track'))
        }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, createdMrf?.id, canWorkflowStart, isWorkflowNotStarted, siteForMrf?.client])

  // ─── Handlers ────────────────────────────────────────────────────────────
  async function handleFormSubmit(values: MRFFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const payload = mrfFormValuesToWritePayload(values, createdMrf ? 'edit' : 'create')
      if (!createdMrf) {
        const created = await createMRF(payload)
        setCreatedMrf(created)
      } else {
        const updated = await updateMRF(createdMrf.id, payload)
        setCreatedMrf(updated)
      }
      setCurrentStep('line_items')
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleLineItemsChanged() {
    setLineItemsVersion((v) => v + 1)
    if (!createdMrf) return
    try {
      const refreshed = await getMRF(createdMrf.id)
      setCreatedMrf(refreshed)
      await loadReadiness(refreshed)
    } catch {
      await loadReadiness(createdMrf)
    }
  }

  async function handleStartWorkflow() {
    if (!createdMrf) return
    setStartError(null)

    let readyNow = readiness?.ok === true
    try {
      const raw = await getMRFReadiness(createdMrf.id)
      const normalized = normalizeMrfReadiness(raw, createdMrf)
      setReadiness(normalized)
      readyNow = normalized.ok
    } catch {
      setStartError('Could not verify MRF readiness. Try again.')
      return
    }

    if (!readyNow) {
      setStartError('MRF is not ready for approval. Fix setup issues first.')
      setCurrentStep('readiness')
      return
    }
    if (availableRoutes.length > 0) {
      if (selectedRouteId == null) {
        setStartError('Select an approval route before sending.')
        return
      }
      if (selectedRoute?.ok === false) {
        setStartError('This route is missing approvers. Choose another route.')
        return
      }
    }

    setStartBusy(true)
    try {
      const routeArg = availableRoutes.length > 0 ? (selectedRouteId ?? undefined) : undefined
      await startMRFWorkflow(createdMrf.id, routeArg)
      const refreshed = await getMRF(createdMrf.id)
      setCreatedMrf(refreshed)
      setWorkflowDone(true)
      onFinished?.()
    } catch (e: unknown) {
      setStartError(formatMrfWorkflowStartError(e))
    } finally {
      setStartBusy(false)
    }
  }

  function goTo(step: WorkspaceStep) {
    const targetIdx = stepIdx(step)
    if (targetIdx > 0 && !createdMrf) return
    setCurrentStep(step)
  }

  // ─── Stepper ─────────────────────────────────────────────────────────────
  const stepper = (
    <div className="sticky top-0 z-10 -mx-5 mb-4 flex items-center gap-1 overflow-x-auto border-b border-app-border bg-app-surface px-5 pb-3 pt-1">
      {STEPS.map((s, i) => {
        const isActive = s.id === currentStep
        const isDone = stepIdx(currentStep) > i
        const isLocked = !createdMrf && i > 0
        return (
          <button
            key={s.id}
            type="button"
            disabled={isLocked}
            onClick={() => goTo(s.id)}
            className={cn(
              'flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
              isActive
                ? 'bg-brand-600 font-medium text-white'
                : isDone
                  ? 'font-medium text-brand-700 hover:bg-brand-50'
                  : isLocked
                    ? 'cursor-not-allowed text-app-subtle opacity-40'
                    : 'text-app-secondary hover:bg-app-muted',
            )}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
                isActive
                  ? 'border-white/60 text-white'
                  : isDone
                    ? 'border-brand-400 text-brand-600'
                    : 'border-app-border text-app-subtle',
              )}
            >
              {isDone ? '✓' : i + 1}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </button>
        )
      })}
    </div>
  )

  // ─── MRF summary chip ─────────────────────────────────────────────────────
  const mrfSummary =
    createdMrf && currentStep !== 'request' ? (
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-panel border border-app-border bg-app-muted p-3 text-sm">
        <span className="font-mono font-semibold text-app-text">MRF #{createdMrf.id}</span>
        <MRFStatusBadge status={createdMrf.status} />
        {createdMrf.requested_by_type !== 'client' && createdMrf.required_department_name ? (
          <span className="text-xs text-app-secondary">Dept: {createdMrf.required_department_name}</span>
        ) : null}
        {createdMrf.requested_by_type !== 'client' ? (
          <span className="text-xs text-app-subtle">
            {createdMrf.billing_type} · {createdMrf.mrf_type}
          </span>
        ) : (
          <span className="text-xs text-app-subtle">Client manpower request</span>
        )}
        <button
          type="button"
          className="ml-auto text-xs font-medium text-brand-600 hover:underline"
          onClick={() => setCurrentStep('request')}
        >
          Edit details
        </button>
      </div>
    ) : null

  // ─── Step: request ───────────────────────────────────────────────────────
  let content: React.ReactNode
  let footer: React.ReactNode

  if (currentStep === 'request') {
    content = (
      <MRFForm
        key={createdMrf ? `ws-edit-${createdMrf.id}` : 'ws-create'}
        formId={FORM_ID}
        mode={createdMrf ? 'edit' : 'create'}
        initialMRF={createdMrf}
        siteOptions={siteOptions}
        departmentOptions={departmentOptions}
        departmentsLoading={departmentsLoading}
        departmentLookupError={departmentsError}
        lookupError={lookupError}
        canReadBudget={canReadBudget}
        submitting={formSubmitting}
        errorMessage={formError}
        onSubmit={handleFormSubmit}
      />
    )
    footer = (
      <div className="flex items-center justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={formSubmitting}>
          Cancel
        </Button>
        <Button type="submit" form={FORM_ID} disabled={formSubmitting || !!lookupError}>
          {formSubmitting ? 'Saving...' : createdMrf ? 'Save changes' : 'Save request details'}
        </Button>
      </div>
    )
  } else if (currentStep === 'line_items') {
    // ─── Step: line items ──────────────────────────────────────────────────
    content = (
      <>
        {mrfSummary}
        <MRFLineItemsTable
          mrfId={createdMrf!.id}
          siteId={createdMrf!.site}
          parentMrf={createdMrf!}
          siteOptions={siteOptions}
          readinessLineItems={readiness?.line_items}
          onChanged={handleLineItemsChanged}
          openCreateSignal={lineItemsOpenCreate}
          onOpenCreateHandled={() => setLineItemsOpenCreate(false)}
        />
        {!createdMrf!.line_items?.length ? (
          <p className="mt-3 text-xs text-app-subtle">
            Add at least one line item before sending for approval.
          </p>
        ) : null}
      </>
    )
    footer = (
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => setCurrentStep('request')}>
          Back
        </Button>
        <Button onClick={() => setCurrentStep('readiness')}>Continue to readiness</Button>
      </div>
    )
  } else if (currentStep === 'readiness') {
    // ─── Step: readiness ───────────────────────────────────────────────────
    const errText = (readiness?.errors ?? []).join(' ').toLowerCase()
    const hasLineItemIssue =
      !(readiness?.line_items?.length ?? 0) ||
      errText.includes('line item') ||
      errText.includes('site role') ||
      errText.includes('srr') ||
      errText.includes('headcount')
    const hasRequestIssue =
      errText.includes('department') || errText.includes('billing') || errText.includes('site')

    content = (
      <>
        {mrfSummary}
        <MRFReadinessPanel
          readiness={readiness}
          loading={readinessLoading}
          error={readinessError}
          mrf={createdMrf!}
          onAddLineItem={() => {
            setLineItemsOpenCreate(true)
            setCurrentStep('line_items')
          }}
        />
      </>
    )
    footer = (
      <div className="flex items-center justify-between gap-2">
        <Button variant="secondary" onClick={() => setCurrentStep('line_items')}>
          Back
        </Button>
        <div className="flex gap-2">
          {!isReadyForApproval && hasLineItemIssue ? (
            <Button variant="secondary" onClick={() => setCurrentStep('line_items')}>
              Go to line items
            </Button>
          ) : null}
          {!isReadyForApproval && hasRequestIssue ? (
            <Button variant="secondary" onClick={() => setCurrentStep('request')}>
              Go to request details
            </Button>
          ) : null}
          <Button disabled={!isReadyForApproval || readinessLoading} onClick={() => setCurrentStep('approval')}>
            Continue to approval
          </Button>
        </div>
      </div>
    )
  } else {
    // ─── Step: approval ────────────────────────────────────────────────────
    if (workflowDone) {
      content = (
        <div className="space-y-4">
          {mrfSummary}
          <div className="flex gap-3 rounded-panel border border-status-success/30 bg-status-success/5 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-status-success" aria-hidden />
            <div>
              <p className="font-medium text-app-text">MRF sent for approval.</p>
              <p className="mt-1 text-sm text-app-secondary">
                MRF #{createdMrf!.id} has been submitted for approval.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate(`/mrf/${createdMrf!.id}`)}>Open MRF detail</Button>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )
      footer = undefined
    } else {
      content = (
        <div className="space-y-4">
          {mrfSummary}
          <MRFReadinessPanel
            readiness={readiness}
            loading={readinessLoading}
            error={readinessError}
            mrf={createdMrf!}
            compact={isReadyForApproval}
            onAddLineItem={
              isReadyForApproval
                ? undefined
                : () => {
                    setCurrentStep('readiness')
                  }
            }
          />

          {!isReadyForApproval && !readinessLoading ? (
            <div className="flex items-start gap-3 rounded-panel border border-app-border bg-app-muted p-4">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-app-subtle" aria-hidden />
              <div>
                <p className="text-sm font-medium text-app-text">Approval blocked</p>
                <p className="mt-1 text-sm text-app-secondary">
                  Complete MRF setup before sending for approval.
                </p>
                <Button variant="secondary" className="mt-3" onClick={() => setCurrentStep('readiness')}>
                  Go to readiness
                </Button>
              </div>
            </div>
          ) : null}

          {isReadyForApproval && isWorkflowNotStarted && canWorkflowStart ? (
            <ApprovalRouteSelector
              routes={availableRoutes}
              selectedRouteId={selectedRouteId}
              onChange={(id) => {
                setSelectedRouteId(id)
                setStartError(null)
              }}
              loading={routesLoading}
              error={routesError}
              disabled={startBusy}
            />
          ) : null}

          {startError ? <ErrorState message={startError} /> : null}
        </div>
      )

      if (isReadyForApproval && isWorkflowNotStarted && canWorkflowStart) {
        footer = (
          <div className="flex items-center justify-between gap-2">
            <Button variant="secondary" onClick={() => setCurrentStep('readiness')}>
              Back
            </Button>
            <Button
              disabled={startDisabledByRoutes || startDisabledByReadiness || startBusy}
              onClick={() => void handleStartWorkflow()}
            >
              {startBusy ? 'Sending…' : 'Send for approval'}
            </Button>
          </div>
        )
      } else {
        footer = (
          <div className="flex justify-start">
            <Button variant="secondary" onClick={() => setCurrentStep('readiness')}>
              Back to readiness
            </Button>
          </div>
        )
      }
    }
  }

  if (isClientWorkspace) {
    const showSubmitForApproval = canWorkflowStart && !clientWorkflowStarted

    return (
      <Drawer
        open={open}
        title={isEditMode ? 'Edit manpower request' : 'New manpower request'}
        description="One scrollable form — site, roles, dates, and approval."
        onClose={onClose}
        panelClassName="max-w-[780px]"
        footer={
          <div className="flex flex-col gap-2 border-t border-app-border/60 bg-app-muted/20 pt-1 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button variant="secondary" onClick={onClose} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              disabled={formSubmitting || !!lookupError}
              onClick={() => void clientFormRef.current?.saveDraft()}
            >
              {clientBusyMode === 'saving' ? 'Saving…' : 'Save draft'}
            </Button>
            {showSubmitForApproval ? (
              <Button
                disabled={formSubmitting || !!lookupError || clientSubmitBlocked}
                onClick={() => void clientFormRef.current?.submitForApproval()}
              >
                {clientBusyMode === 'sending' ? 'Sending…' : 'Submit for approval'}
              </Button>
            ) : null}
          </div>
        }
      >
        <MRFClientRequestForm
          ref={clientFormRef}
          initialMRF={initialMRF ?? createdMrf}
          siteOptions={siteOptions}
          lookupError={lookupError}
          canWorkflowStart={canWorkflowStart}
          onSubmittingChange={setFormSubmitting}
          onBusyModeChange={setClientBusyMode}
          onSubmitBlockedChange={setClientSubmitBlocked}
          onSaved={(mrf) => {
            setCreatedMrf(mrf)
            setFormError(null)
            onFinished?.()
            onClose()
          }}
          onSubmittedForApproval={(mrf) => {
            setCreatedMrf(mrf)
            setFormError(null)
            onFinished?.()
            onClose()
          }}
        />
      </Drawer>
    )
  }

  return (
    <Drawer
      open={open}
      title={isEditMode ? 'Edit MRF' : 'Create MRF'}
      description="Request details → Line items → Readiness → Approval"
      onClose={onClose}
      panelClassName="max-w-[940px]"
      footer={footer}
    >
      {stepper}
      {content}
    </Drawer>
  )
}
