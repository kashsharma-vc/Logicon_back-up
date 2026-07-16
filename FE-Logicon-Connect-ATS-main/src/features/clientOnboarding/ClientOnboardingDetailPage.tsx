import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react'
import {
  deleteClientOnboardingRequest,
  getClientOnboardingRequest,
  updateClientOnboardingRequest,
} from '@/api/clientOnboarding'
import { getClientOnboardingConfigCheck, getWorkflowInstance, listAvailableApprovalRoutes, startClientOnboardingWorkflow } from '@/api/workflow'
import { getClient, listClients, type ClientRow } from '@/api/clients'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import {
  ClientOnboardingForm,
  clientOnboardingValuesToWritePayload,
  type ClientOnboardingFormValues,
} from '@/features/clientOnboarding/ClientOnboardingForm'
import { ClientOnboardingProposedSetup } from '@/features/clientOnboarding/ClientOnboardingProposedSetup'
import { ClientOnboardingReadinessPanel } from '@/features/clientOnboarding/ClientOnboardingReadinessPanel'
import { ClientOnboardingStatusBadge } from '@/features/clientOnboarding/ClientOnboardingStatusBadge'
import type { ClientOnboardingRow } from '@/features/clientOnboarding/types'
import { finalizationStatusLabel } from '@/features/clientOnboarding/types'
import { formatBudgetAmount } from '@/features/budgets/types'
import { ApprovalRouteSelector } from '@/features/workflow/ApprovalRouteSelector'
import { WorkflowActionBox } from '@/features/workflow/WorkflowActionBox'
import { WorkflowConfigCheckDrawer } from '@/features/workflow/WorkflowConfigCheckDrawer'
import { WorkflowReassignDrawer } from '@/features/workflow/WorkflowReassignDrawer'
import { WorkflowStatusPanel } from '@/features/workflow/WorkflowStatusPanel'
import { WorkflowTimeline } from '@/features/workflow/WorkflowTimeline'
import type { ApprovalRoutePreview, WorkflowConfigCheck, WorkflowInstance, WorkflowStatus } from '@/features/workflow/types'
import { cn } from '@/lib/cn'

function onboardingWorkflowStorageKey(id: number) {
  return `client-onboarding:${id}:workflow-instance`
}

function formatWorkflowStartError(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      const body = data as Record<string, unknown>
      const detail = typeof body.detail === 'string' ? body.detail : ''
      const errors = Array.isArray(body.errors)
        ? body.errors.map((x) => (typeof x === 'string' ? x : String(x))).filter(Boolean)
        : []
      if (errors.length > 0) {
        return [detail, ...errors].filter(Boolean).join('\n')
      }
    }
  }
  return parseApiError(e, fallback).message
}

function formatOnboardingType(t: string): string {
  if (t === 'new_client') return 'New client'
  if (t === 'new_site_expansion') return 'New site expansion'
  return t.replace(/_/g, ' ')
}

function clientOrProposedLabel(row: ClientOnboardingRow): string {
  if (row.client_name?.trim()) return row.client_name
  if (row.proposed_client_name?.trim()) return row.proposed_client_name.trim()
  return '—'
}

function finalizationBadgeVariant(s: string | null | undefined): 'success' | 'danger' | 'neutral' {
  if (s === 'finalized') return 'success'
  if (s === 'failed') return 'danger'
  return 'neutral'
}

type DetailTab = 'request' | 'sites' | 'departments' | 'roles' | 'budgets' | 'users'

const TAB_LABELS: { id: DetailTab; label: string }[] = [
  { id: 'request', label: 'Request details' },
  { id: 'sites', label: 'Proposed sites' },
  { id: 'departments', label: 'Proposed departments' },
  { id: 'roles', label: 'Role requirements' },
  { id: 'budgets', label: 'Proposed budgets' },
  { id: 'users', label: 'Proposed users' },
]

const FLOW_STEPS: { id: DetailTab; short: string }[] = [
  { id: 'request', short: 'Request' },
  { id: 'sites', short: 'Sites' },
  { id: 'departments', short: 'Departments' },
  { id: 'roles', short: 'Roles' },
  { id: 'budgets', short: 'Budgets' },
  { id: 'users', short: 'Users' },
]

function normalizeDetailTab(raw: string | null): DetailTab {
  if (
    raw === 'request' ||
    raw === 'sites' ||
    raw === 'departments' ||
    raw === 'roles' ||
    raw === 'budgets' ||
    raw === 'users'
  )
    return raw
  return 'request'
}

export function ClientOnboardingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const requestId = Number(id)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const detailTab = useMemo(() => normalizeDetailTab(params.get('tab')), [params])

  const setDetailTab = useCallback(
    (next: DetailTab) => {
      const p = new URLSearchParams(params)
      p.set('tab', next)
      setParams(p, { replace: true })
    },
    [params, setParams],
  )

  const me = useAuthStore((s) => s.me)
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canUpdate = hasAnyCapability(meCaps, [CAP.CLIENT_ONBOARDING_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.CLIENT_ONBOARDING_DELETE])
  const canWorkflowRead = hasAnyCapability(meCaps, [CAP.WORKFLOW_READ])
  const canWorkflowStart = hasAnyCapability(meCaps, [CAP.WORKFLOW_START])
  const canWorkflowApprove = hasAnyCapability(meCaps, [CAP.WORKFLOW_APPROVE])
  const canWorkflowReject = hasAnyCapability(meCaps, [CAP.WORKFLOW_REJECT])
  const canWorkflowReassign = hasAnyCapability(meCaps, [CAP.WORKFLOW_REASSIGN])
  const canConfigCheck = canWorkflowRead || canWorkflowStart
  const canReadBudget = hasAnyCapability(meCaps, [CAP.BUDGET_READ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<ClientOnboardingRow | null>(null)
  const [createdClientName, setCreatedClientName] = useState<string | null>(null)

  const [clientsError, setClientsError] = useState<string | null>(null)
  const [clientsLoading, setClientsLoading] = useState(false)
  const [clients, setClients] = useState<ClientRow[]>([])
  const clientOptions = useMemo(
    () => clients.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` })),
    [clients],
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => `co-edit-${requestId}`, [requestId])

  const [wfInstance, setWfInstance] = useState<WorkflowInstance | null>(null)
  const [wfInstanceLoading, setWfInstanceLoading] = useState(false)
  const [wfInstanceError, setWfInstanceError] = useState<string | null>(null)
  const [rememberedInstanceId, setRememberedInstanceId] = useState<number | null>(null)

  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [configBusy, setConfigBusy] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configData, setConfigData] = useState<WorkflowConfigCheck | null>(null)

  const [startBusy, setStartBusy] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)

  const [availableRoutes, setAvailableRoutes] = useState<ApprovalRoutePreview[]>([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [routesError, setRoutesError] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)
  const [startInlineError, setStartInlineError] = useState<string | null>(null)

  const selectedRoute = useMemo(
    () => availableRoutes.find((r) => r.id === selectedRouteId) ?? null,
    [availableRoutes, selectedRouteId],
  )

  const startDisabledByRoutes =
    routesLoading ||
    !!routesError ||
    availableRoutes.length === 0 ||
    selectedRouteId == null ||
    selectedRoute?.ok === false

  const loadWorkflowInstance = useCallback(
    async (instanceId: number) => {
      if (!canWorkflowRead) {
        setWfInstance(null)
        setWfInstanceError(null)
        return
      }
      setWfInstanceLoading(true)
      setWfInstanceError(null)
      try {
        const inst = await getWorkflowInstance(instanceId)
        setWfInstance(inst)
      } catch (e: unknown) {
        setWfInstance(null)
        setWfInstanceError(parseApiError(e, 'Failed to load workflow instance').message)
      } finally {
        setWfInstanceLoading(false)
      }
    },
    [canWorkflowRead],
  )

  const resolveRememberedInstanceId = useCallback(
    async (r: ClientOnboardingRow): Promise<number | null> => {
      const key = onboardingWorkflowStorageKey(r.id)
      const raw = sessionStorage.getItem(key)
      if (!raw) return null
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 1) {
        sessionStorage.removeItem(key)
        return null
      }
      if (!canWorkflowRead) return null
      try {
        const inst = await getWorkflowInstance(n)
        if (inst.client_onboarding_request === r.id) return n
      } catch {
        // fall through
      }
      sessionStorage.removeItem(key)
      return null
    },
    [canWorkflowRead],
  )

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await getClientOnboardingRequest(requestId)
      setRow(res)
    } catch (e: unknown) {
      setRow(null)
      setError(parseApiError(e, 'Failed to load onboarding request').message)
    } finally {
      setLoading(false)
    }
  }

  async function reloadRowAndWorkflow() {
    if (!Number.isFinite(requestId)) return
    try {
      const res = await getClientOnboardingRequest(requestId)
      setRow(res)
      const backendId =
        res.workflow_instance_id != null && res.workflow_instance_id > 0 ? res.workflow_instance_id : null
      if (backendId != null && canWorkflowRead) {
        sessionStorage.removeItem(onboardingWorkflowStorageKey(res.id))
        setRememberedInstanceId(null)
        await loadWorkflowInstance(backendId)
        return
      }
      const remembered = await resolveRememberedInstanceId(res)
      setRememberedInstanceId(remembered)
      if (remembered != null && canWorkflowRead) {
        await loadWorkflowInstance(remembered)
      } else {
        setWfInstance(null)
        setWfInstanceError(null)
      }
    } catch (e: unknown) {
      setWfInstanceError(parseApiError(e, 'Failed to reload').message)
    }
  }

  async function handleCheckConfig() {
    setConfigDrawerOpen(true)
    setConfigBusy(true)
    setConfigData(null)
    setConfigError(null)
    try {
      const d = await getClientOnboardingConfigCheck(requestId)
      setConfigData(d)
    } catch (e: unknown) {
      setConfigError(parseApiError(e, 'Config check failed').message)
    } finally {
      setConfigBusy(false)
    }
  }

  async function handleStartWorkflow() {
    setStartInlineError(null)
    if (availableRoutes.length === 0) {
      setStartInlineError('No approval route is configured for this mobilisation setup.')
      return
    }
    if (selectedRouteId == null) {
      setStartInlineError('Select an approval route before sending for approval.')
      return
    }
    const r = availableRoutes.find((x) => x.id === selectedRouteId)
    if (!r?.ok) {
      setStartInlineError('This route is missing approvers. Choose another route or ask an administrator.')
      return
    }
    setStartBusy(true)
    try {
      const inst = await startClientOnboardingWorkflow(requestId, selectedRouteId)
      sessionStorage.setItem(onboardingWorkflowStorageKey(requestId), String(inst.id))
      setRememberedInstanceId(inst.id)
      if (canWorkflowRead) {
        await loadWorkflowInstance(inst.id)
      }
      await reloadRowAndWorkflow()
    } catch (e: unknown) {
      setStartInlineError(formatWorkflowStartError(e, 'Send for approval failed'))
    } finally {
      setStartBusy(false)
    }
  }

  async function loadClientsLookup() {
    setClientsLoading(true)
    setClientsError(null)
    try {
      const res = await listClients({ search: '', page: 1 })
      setClients(res.items)
    } catch (e: unknown) {
      setClients([])
      setClientsError(parseApiError(e, 'Client lookup failed').message)
    } finally {
      setClientsLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(requestId)) {
      setError('Invalid request id.')
      setLoading(false)
      return
    }
    void refresh()
    void loadClientsLookup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  useEffect(() => {
    if (!Number.isFinite(requestId)) return
    const raw = params.get('tab')
    const n = normalizeDetailTab(raw)
    if (raw !== n) {
      const p = new URLSearchParams(params)
      p.set('tab', n)
      setParams(p, { replace: true })
    }
  }, [requestId, params, setParams])

  useEffect(() => {
    if (!row || !canWorkflowRead) {
      setWfInstance(null)
      setWfInstanceError(null)
      setRememberedInstanceId(null)
      return
    }
    const backendId = row.workflow_instance_id != null && row.workflow_instance_id > 0 ? row.workflow_instance_id : null
    if (backendId != null) {
      sessionStorage.removeItem(onboardingWorkflowStorageKey(row.id))
      setRememberedInstanceId(null)
      void loadWorkflowInstance(backendId)
      return
    }
    void (async () => {
      const remembered = await resolveRememberedInstanceId(row)
      setRememberedInstanceId(remembered)
      if (remembered != null) {
        await loadWorkflowInstance(remembered)
      } else {
        setWfInstance(null)
        setWfInstanceError(null)
      }
    })()
  }, [row?.id, row?.workflow_instance_id, row?.updated_at, canWorkflowRead, loadWorkflowInstance, resolveRememberedInstanceId])

  useEffect(() => {
    let cancelled = false
    const cid = row?.created_client
    if (cid == null || cid < 1) {
      setCreatedClientName(null)
      return
    }
    void (async () => {
      try {
        const c = await getClient(cid)
        if (!cancelled) setCreatedClientName(c.name)
      } catch {
        if (!cancelled) setCreatedClientName(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [row?.created_client])

  useEffect(() => {
    if (!row || row.workflow_status !== 'not_started' || row.readiness_ok !== true || !canWorkflowStart) {
      setAvailableRoutes([])
      setRoutesError(null)
      setRoutesLoading(false)
      setSelectedRouteId(null)
      return
    }

    let cancelled = false
    setRoutesLoading(true)
    setRoutesError(null)
    setAvailableRoutes([])
    setSelectedRouteId(null)

    void (async () => {
      try {
        const res = await listAvailableApprovalRoutes({
          trigger_type: 'client_onboarding',
          ...(row.client != null && row.client > 0 ? { client: row.client } : {}),
        })
        if (cancelled) return
        const list = res.results ?? []
        setAvailableRoutes(list)
        if (list.length === 1) {
          const only = list[0]
          if (only != null) setSelectedRouteId(only.id)
        } else {
          const defaults = list.filter((r) => r.is_default)
          if (defaults.length === 1) {
            const d = defaults[0]
            if (d != null) setSelectedRouteId(d.id)
          }
        }
      } catch (e: unknown) {
        if (cancelled) return
        setAvailableRoutes([])
        setSelectedRouteId(null)
        if (axios.isAxiosError(e)) {
          if (e.response?.status === 403) {
            setRoutesError('You do not have permission to view approval routes.')
          } else if (e.response?.status === 404) {
            setRoutesError('This mobilisation setup is not accessible for route listing.')
          } else {
            setRoutesError(parseApiError(e, 'Failed to load approval routes').message)
          }
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
  }, [row, canWorkflowStart, row?.client, row?.readiness_ok, row?.workflow_status])

  const workflowModel = useMemo(() => {
    if (!row) return null
    const backendId = row.workflow_instance_id != null && row.workflow_instance_id > 0 ? row.workflow_instance_id : null
    const instanceId = backendId ?? rememberedInstanceId
    const cs = wfInstance?.current_step
    const resolvedStatus: WorkflowStatus =
      (row.workflow_status as WorkflowStatus | undefined) ??
      (wfInstance?.status as WorkflowStatus | undefined) ??
      (instanceId && wfInstanceLoading ? 'active' : 'not_started')

    const stepId =
      row.workflow_current_step_id != null && row.workflow_current_step_id > 0
        ? row.workflow_current_step_id
        : cs?.id != null && cs.id > 0
          ? cs.id
          : null
    const stepCode = row.workflow_current_step_code ?? cs?.step_code ?? undefined
    const stepName = row.workflow_current_step_name ?? cs?.step_name ?? undefined
    const assignedUserId = row.workflow_current_assigned_user ?? cs?.assigned_user ?? undefined
    const assignedUserName = row.workflow_current_assigned_user_name ?? cs?.assigned_user_username ?? undefined
    const deptName = row.workflow_current_department_name ?? cs?.assigned_department_name_snapshot ?? undefined

    return {
      instanceId,
      workflowStatus: resolvedStatus,
      stepId,
      stepCode,
      stepName,
      assignedUserId,
      assignedUserName,
      deptName,
      backendHasInstanceId: backendId != null,
    }
  }, [row, wfInstance, rememberedInstanceId, wfInstanceLoading])

  function openEdit() {
    if (!canUpdate) return
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function submit(values: ClientOnboardingFormValues) {
    if (!row) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      const updated = await updateClientOnboardingRequest(row.id, clientOnboardingValuesToWritePayload(values))
      setRow(updated)
      closeDrawer()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!row || !canDelete) return
    const ok = window.confirm('Delete this mobilisation setup request? This cannot be undone.')
    if (!ok) return
    try {
      await deleteClientOnboardingRequest(row.id)
      sessionStorage.removeItem(onboardingWorkflowStorageKey(row.id))
      navigate('/mobilisation')
    } catch (e: unknown) {
      alert(parseApiError(e, 'Delete failed').message)
    }
  }

  if (loading) return <Spinner label="Loading mobilisation setup..." />
  if (error) return <ErrorState message={error} />
  if (!row) return <EmptyState title="Request not found" description="This mobilisation setup may have been removed." />

  const wm = workflowModel
  const fin = row.finalization_status ?? 'not_finalized'
  const isReadyForApproval = row.readiness_ok === true
  const isWorkflowAlreadyStarted = Boolean(row.workflow_status && row.workflow_status !== 'not_started')
  const showApprovalWorkflow = isWorkflowAlreadyStarted || isReadyForApproval
  const showReadinessPanel = !isWorkflowAlreadyStarted && !isReadyForApproval

  const requestDetails = (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-panel border border-app-border bg-app-surface p-4 lg:col-span-2">
        <p className="text-sm font-semibold text-app-text">Details</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Client</dt>
            <dd className="max-w-[60%] text-right font-medium text-app-text">{clientOrProposedLabel(row)}</dd>
          </div>
          {row.onboarding_type === 'new_client' && row.proposed_client_code?.trim() ? (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Proposed code</dt>
              <dd className="font-mono text-xs text-app-secondary">{row.proposed_client_code}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Requested by</dt>
            <dd className="text-xs text-app-secondary">
              {row.requested_by_username ? `${row.requested_by_username} (#${row.requested_by})` : `User #${row.requested_by}`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Expected site count</dt>
            <dd className="font-medium text-app-text">{row.expected_site_count ?? '-'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Proposed budgets</dt>
            <dd className="font-medium text-app-text">{row.proposed_budgets?.length ?? 0}</dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-app-border pt-2">
            <dt className="text-app-subtle">Budget plan</dt>
            <dd className="max-w-[60%] text-right text-sm text-app-text">
              {row.budget_plan != null && (row.budget_plan_name || row.budget_plan_code) ? (
                <div>
                  <p className="font-medium">
                    {row.budget_plan_name ?? 'Budget'}{' '}
                    {row.budget_plan_code ? (
                      <span className="font-mono text-xs text-app-secondary">({row.budget_plan_code})</span>
                    ) : null}
                  </p>
                  {row.budget_plan_amount != null ? (
                    <p className="mt-1 text-xs text-app-secondary">
                      {formatBudgetAmount(String(row.budget_plan_amount), row.budget_plan_currency ?? 'INR')} —{' '}
                      {row.budget_plan_status ?? '—'}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-app-secondary">{row.budget_plan_status ?? '—'}</p>
                  )}
                </div>
              ) : (
                <span className="text-app-secondary">No budget linked</span>
              )}
            </dd>
          </div>
        </dl>

        {row.onboarding_type === 'new_client' ? (
          <div className="mt-4 rounded-panel border border-app-border bg-app-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Proposed client contact</p>
            <dl className="mt-2 grid gap-1 text-xs text-app-secondary">
              <div className="flex justify-between gap-2">
                <dt>Contact name</dt>
                <dd className="text-right text-app-text">{row.proposed_contact_name?.trim() || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Email</dt>
                <dd className="text-right text-app-text">{row.proposed_contact_email?.trim() || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Phone</dt>
                <dd className="text-right text-app-text">{row.proposed_contact_phone?.trim() || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Industry</dt>
                <dd className="text-right text-app-text">{row.proposed_industry?.trim() || '—'}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>GST number</dt>
                <dd className="text-right font-mono text-app-text">{row.proposed_gst_number?.trim() || '—'}</dd>
              </div>
            </dl>
            {row.proposed_billing_address?.trim() ? (
              <p className="mt-2 whitespace-pre-wrap text-xs text-app-secondary">{row.proposed_billing_address}</p>
            ) : null}
          </div>
        ) : null}

        {row.summary?.trim() ? (
          <div className="mt-4 rounded-panel border border-app-border bg-app-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Summary</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-app-secondary">{row.summary}</p>
          </div>
        ) : null}
        {row.operations_notes?.trim() ? (
          <div className="mt-4 rounded-panel border border-app-border bg-app-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Operations notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-app-secondary">{row.operations_notes}</p>
          </div>
        ) : null}
        {row.hr_notes?.trim() ? (
          <div className="mt-4 rounded-panel border border-app-border bg-app-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">HR notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-app-secondary">{row.hr_notes}</p>
          </div>
        ) : null}
        {row.finance_notes?.trim() ? (
          <div className="mt-4 rounded-panel border border-app-border bg-app-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Finance notes</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-app-secondary">{row.finance_notes}</p>
          </div>
        ) : null}
        {fin === 'finalized' ? (
          <p className="mt-3 text-xs text-app-subtle">
            Finalization created real budget plans from active proposed budgets where configured.
          </p>
        ) : null}
      </div>

      <div className="rounded-panel border border-app-border bg-app-surface p-4">
        <p className="text-sm font-semibold text-app-text">Timeline</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Submitted</dt>
            <dd className="text-xs text-app-secondary">{row.submitted_at ? new Date(row.submitted_at).toLocaleString() : '-'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Approved</dt>
            <dd className="text-xs text-app-secondary">{row.approved_at ? new Date(row.approved_at).toLocaleString() : '-'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Rejected</dt>
            <dd className="text-xs text-app-secondary">{row.rejected_at ? new Date(row.rejected_at).toLocaleString() : '-'}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-app-subtle">Created</dt>
            <dd className="text-xs text-app-secondary">{new Date(row.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  )

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-app-border pb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Mobilisation</p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-app-text">#{row.id}</h2>
            <p className="mt-1 text-sm text-app-secondary">
              {formatOnboardingType(String(row.onboarding_type))}
              {row.onboarding_type === 'new_site_expansion' && row.client_name ? ` · ${row.client_name}` : null}
              {row.onboarding_type === 'new_client' && row.proposed_client_name?.trim()
                ? ` · ${row.proposed_client_name.trim()}`
                : null}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ClientOnboardingStatusBadge status={row.status} />
              <Badge variant={finalizationBadgeVariant(fin)}>{finalizationStatusLabel(fin)}</Badge>
            </div>
            <p className="mt-2 text-xs text-app-secondary">
              <span className="font-medium text-app-text">{row.proposed_budgets?.length ?? 0}</span> proposed budget
              {(row.proposed_budgets?.length ?? 0) === 1 ? '' : 's'}
              {fin === 'finalized'
                ? ' · Real budget plans were created from active proposed budgets at finalization.'
                : null}
            </p>
            {fin === 'finalized' && row.created_client != null && row.created_client > 0 ? (
              <p className="mt-2 text-sm text-app-secondary">
                New client record:{' '}
                <Link to="/clients" className="font-medium text-brand-700 underline">
                  {createdClientName ?? `Client #${row.created_client}`}
                </Link>{' '}
                (open Clients to manage)
              </p>
            ) : null}
            {fin === 'finalized' && (row.proposed_users?.length ?? 0) > 0 ? (
              <p className="mt-2 text-xs text-app-secondary">
                <span className="font-medium text-app-text">
                  {(row.proposed_users ?? []).filter((u) => u.created_user != null && u.created_user > 0).length}
                </span>{' '}
                of {(row.proposed_users ?? []).length} proposed user(s) have login records. Open{' '}
                <button type="button" className="font-medium text-brand-700 underline" onClick={() => setDetailTab('users')}>
                  Proposed users
                </button>{' '}
                for invite status.
              </p>
            ) : null}
            {fin === 'failed' ? (
              <div className="mt-3 rounded-panel border border-status-danger/30 bg-status-danger/5 p-3 text-sm">
                <p className="font-medium text-status-danger">Approval completed, but client setup could not be created.</p>
                {row.finalization_error?.trim() ? (
                  <p className="mt-2 whitespace-pre-wrap text-xs text-app-secondary">{row.finalization_error}</p>
                ) : null}
                <p className="mt-2 text-xs text-app-subtle">An administrator can retry finalization from Django admin.</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="secondary"
              className="min-h-9 px-2"
              onClick={() => navigate('/mobilisation')}
              aria-label="Back to list"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
            {canUpdate ? (
              <Button variant="secondary" className="min-h-9 px-2" onClick={openEdit} aria-label="Edit" title="Edit">
                <Pencil className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
            {canDelete ? (
              <Button variant="danger" className="min-h-9 px-2" onClick={handleDelete} aria-label="Delete" title="Delete">
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="-mx-4 border-y border-app-border bg-app-muted/40 md:-mx-6">
        <span className="sr-only">Suggested review order — use steps to jump between sections</span>
        <div className="overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] lg:overflow-x-visible">
          <div className="flex w-full min-w-[34rem] snap-x snap-mandatory items-stretch lg:min-w-0 lg:snap-none">
          {FLOW_STEPS.map((step, i) => {
            const isActive = detailTab === step.id
            return (
            <Fragment key={step.id}>
              {i > 0 ? (
                <>
                  <div className="w-px shrink-0 self-stretch bg-app-border/90 lg:hidden" aria-hidden />
                  <div
                    className="hidden shrink-0 items-center justify-center self-stretch lg:flex lg:w-8 xl:w-10"
                    aria-hidden
                  >
                    <ChevronRight className="h-7 w-7 text-app-secondary xl:h-8 xl:w-8" strokeWidth={2.25} />
                  </div>
                </>
              ) : null}
              <button
                type="button"
                onClick={() => setDetailTab(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'relative flex min-h-[3.5rem] min-w-[5.25rem] shrink-0 snap-center flex-col items-center justify-center gap-0.5 border-l border-app-border/70 px-2 py-2 text-center transition-colors first:border-l-0 focus-visible:z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 focus-visible:ring-inset sm:min-h-[4.25rem] sm:px-3 lg:min-w-0 lg:flex-1 lg:shrink',
                  isActive
                    ? 'z-10 text-app-text shadow-[inset_0_0_0_1px_rgba(46,123,220,0.35)]'
                    : 'text-app-secondary hover:bg-app-surface/60 hover:text-app-text',
                )}
              >
                {isActive ? (
                  <>
                    <span className="co-step-active-gradient pointer-events-none absolute inset-0" aria-hidden />
                    <span className="co-step-active-top-line pointer-events-none absolute inset-x-0 top-0 h-0.5" aria-hidden />
                    <span
                      className="pointer-events-none absolute bottom-0 left-1/2 h-1 w-2/3 max-w-[4rem] -translate-x-1/2 rounded-full bg-brand-500/90"
                      aria-hidden
                    />
                  </>
                ) : null}
                <span
                  className={cn(
                    'relative z-10 text-[10px] font-semibold uppercase tracking-[0.12em] text-app-subtle sm:text-[11px] sm:tracking-[0.14em]',
                    isActive && 'text-brand-800 dark:text-brand-200',
                  )}
                >
                  Step {i + 1}
                </span>
                <span
                  className={cn(
                    'relative z-10 max-w-full truncate text-xs font-medium sm:text-sm',
                    isActive && 'font-semibold text-app-text',
                  )}
                >
                  {step.short}
                </span>
              </button>
            </Fragment>
            )
          })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-8 border-b border-app-border">
        {TAB_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setDetailTab(t.id)}
            className={cn(
              'border-b-2 pb-3 pt-1 text-sm transition-colors -mb-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
              detailTab === t.id
                ? 'border-app-text font-semibold text-app-text'
                : 'border-transparent font-normal text-app-secondary hover:text-app-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {detailTab === 'request' ? (
        requestDetails
      ) : (
        <ClientOnboardingProposedSetup
          requestId={row.id}
          row={row}
          onRefresh={() => reloadRowAndWorkflow()}
          focus={
            detailTab === 'sites'
              ? 'sites'
              : detailTab === 'departments'
                ? 'departments'
                : detailTab === 'roles'
                  ? 'roles'
                  : detailTab === 'budgets'
                    ? 'budgets'
                    : detailTab === 'users'
                      ? 'users'
                      : 'all'
          }
        />
      )}

      {showReadinessPanel ? (
        <ClientOnboardingReadinessPanel row={row} onGoToTab={setDetailTab} />
      ) : null}

      {showApprovalWorkflow ? (
      <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
        <p className="text-sm font-semibold text-app-text">Approval workflow</p>
        <p className="mt-1 text-xs text-app-secondary">
          {isWorkflowAlreadyStarted
            ? 'Track approval progress, reassign steps, and act on the current step.'
            : 'Choose an approval route and send this request for approval.'}
        </p>

        {row.workflow_status === 'not_started' && canWorkflowStart && isReadyForApproval ? (
          <div className="mt-4 space-y-3">
            <ApprovalRouteSelector
              routes={availableRoutes}
              selectedRouteId={selectedRouteId}
              onChange={(rid) => {
                setSelectedRouteId(rid)
                setStartInlineError(null)
              }}
              loading={routesLoading}
              error={routesError}
              disabled={startBusy}
              emptyMessage="No approval route is configured for this mobilisation setup."
            />
          </div>
        ) : null}
        {startInlineError ? (
          <div className="mt-4">
            <ErrorState message={startInlineError} />
          </div>
        ) : null}

        <div className="mt-4 border-t border-app-border pt-4">
          {wm ? (
            <WorkflowStatusPanel
              workflowStatus={wm.workflowStatus}
              workflowInstanceId={wm.instanceId}
              workflowCurrentStepCode={wm.stepCode}
              workflowCurrentStepName={wm.stepName}
              workflowCurrentAssignedUserName={wm.assignedUserName}
              workflowCurrentDepartmentName={wm.deptName}
              canConfigCheck={canConfigCheck}
              canStart={canWorkflowStart}
              checkingConfig={configBusy}
              starting={startBusy}
              onCheckConfig={() => void handleCheckConfig()}
              onStartWorkflow={() => void handleStartWorkflow()}
              startButtonLabel="Send for approval"
              startDisabled={startDisabledByRoutes}
              configCheckButtonLabel="Check approval setup"
            />
          ) : null}
        </div>

        {canWorkflowReassign &&
        wm?.workflowStatus === 'active' &&
        wm.instanceId != null &&
        wm.instanceId > 0 &&
        wm.stepId != null &&
        wm.stepId > 0 ? (
          <div className="mt-4 border-t border-app-border pt-4">
            <Button variant="secondary" className="min-h-9" type="button" onClick={() => setReassignOpen(true)}>
              Reassign current step
            </Button>
          </div>
        ) : null}

        {wm?.instanceId != null && wm.instanceId > 0 && canWorkflowRead ? (
          <div className="mt-6 border-t border-app-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Instance & history</p>
            <div className="mt-3">
              <WorkflowTimeline instance={wfInstance} loading={wfInstanceLoading} errorMessage={wfInstanceError} />
            </div>
          </div>
        ) : canWorkflowRead ? null : (
          <p className="mt-4 text-xs text-app-subtle">Workflow instance details require the workflow.read capability.</p>
        )}

        {wm?.instanceId != null && wm.instanceId > 0 && wm.stepId != null && wm.stepId > 0 ? (
          <div className="mt-6 border-t border-app-border pt-4">
            <WorkflowActionBox
              instanceId={wm.instanceId}
              stepId={wm.stepId}
              workflowStatus={wm.workflowStatus}
              assignedUserId={wm.assignedUserId}
              meId={me?.id}
              isSuperuser={!!me?.is_superuser}
              canApprove={canWorkflowApprove}
              canReject={canWorkflowReject}
              onSuccess={() => reloadRowAndWorkflow()}
            />
          </div>
        ) : null}
      </section>
      ) : null}

      <WorkflowConfigCheckDrawer
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        loading={configBusy}
        errorMessage={configError}
        data={configData}
        title="Approval setup check"
        description="Shows the route and approvers before sending."
        loadingLabel="Loading approval setup check"
      />

      <WorkflowReassignDrawer
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        instanceId={wm?.instanceId ?? null}
        stepId={wm?.stepId ?? null}
        onSuccess={() => reloadRowAndWorkflow()}
      />

      <Drawer
        open={drawerOpen}
        title="Edit mobilisation setup"
        description="Update mobilisation type, client or proposed client details, and notes."
        onClose={closeDrawer}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={formSubmitting || (!!clientsError && row.onboarding_type === 'new_site_expansion')}
            >
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <ClientOnboardingForm
          key={`co-edit-${row.id}`}
          formId={formId}
          mode="edit"
          initialRow={row}
          clientOptions={clientOptions}
          clientsLookupError={clientsError}
          clientsLoading={clientsLoading}
          canReadBudget={canReadBudget}
          submitting={formSubmitting}
          errorMessage={formError}
          onSubmit={submit}
        />
      </Drawer>
    </div>
  )
}
