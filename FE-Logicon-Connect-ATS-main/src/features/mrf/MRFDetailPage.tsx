import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { deleteMRF, getMRF, getMRFReadiness, listMRFLineItems } from '@/api/mrf'
import { departmentToFormOption, listDepartments, type DepartmentOption, type DepartmentRow } from '@/api/departments'
import {
  getMRFWorkflowConfigCheck,
  getWorkflowInstance,
  listAvailableApprovalRoutes,
  startMRFWorkflow,
} from '@/api/workflow'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import type { SiteOption } from '@/features/mrf/MRFForm'
import { MRFCreateWorkspaceDrawer } from '@/features/mrf/MRFCreateWorkspaceDrawer'
import { MRFLineItemsTable } from '@/features/mrf/MRFLineItemsTable'
import { MRFClientDetailApproval } from '@/features/mrf/MRFClientDetailApproval'
import { MrfSectionPanel } from '@/features/mrf/mrfClientFormLayout'
import { MRFClientDetailOverview } from '@/features/mrf/MRFClientDetailOverview'
import { MRFClientFormDisplay } from '@/features/mrf/MRFClientFormDisplay'
import { useClientMrfWorkspace } from '@/features/mrf/mrfClientMode'
import { isClientFacingUser } from '@/lib/userRoleMode'
import { MRFStatusBadge } from '@/features/mrf/MRFStatusBadge'
import { MRFReadinessPanel } from '@/features/mrf/MRFReadinessPanel'
import { formatMrfWorkflowStartError, normalizeMrfReadiness } from '@/features/mrf/mrfReadiness'
import type { MRFLineItemRow, MRFReadinessResponse, MRFRow } from '@/features/mrf/types'
import { MRFBudgetImpactPanel, mrfReservationStatusCopy } from '@/features/mrf/mrfBudgetContext'
import { WorkflowActionBox } from '@/features/workflow/WorkflowActionBox'
import { WorkflowConfigCheckDrawer } from '@/features/workflow/WorkflowConfigCheckDrawer'
import { WorkflowReassignDrawer } from '@/features/workflow/WorkflowReassignDrawer'
import { WorkflowStatusPanel } from '@/features/workflow/WorkflowStatusPanel'
import { WorkflowTimeline } from '@/features/workflow/WorkflowTimeline'
import { ApprovalRouteSelector } from '@/features/workflow/ApprovalRouteSelector'
import type { ApprovalRoutePreview, WorkflowConfigCheck, WorkflowInstance } from '@/features/workflow/types'

async function loadAllActiveDepartmentOptions(): Promise<DepartmentOption[]> {
  const all: DepartmentRow[] = []
  let page = 1
  while (page <= 40) {
    const res = await listDepartments({ is_active: true, page })
    all.push(...res.items)
    if (res.items.length < 50) break
    page += 1
  }
  return all.map(departmentToFormOption)
}

export function MRFDetailPage() {
  const { id } = useParams<{ id: string }>()
  const mrfId = Number(id)
  const navigate = useNavigate()

  const me = useAuthStore((s) => s.me)
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canUpdate = hasAnyCapability(meCaps, [CAP.MRF_UPDATE])
  const canDelete = hasAnyCapability(meCaps, [CAP.MRF_DELETE])
  const canWorkflowRead = hasAnyCapability(meCaps, [CAP.WORKFLOW_READ])
  const canWorkflowStart = hasAnyCapability(meCaps, [CAP.WORKFLOW_START])
  const canWorkflowApprove = hasAnyCapability(meCaps, [CAP.WORKFLOW_APPROVE])
  const canWorkflowReject = hasAnyCapability(meCaps, [CAP.WORKFLOW_REJECT])
  const canWorkflowReassign = hasAnyCapability(meCaps, [CAP.WORKFLOW_REASSIGN])
  const canConfigCheck = canWorkflowRead || canWorkflowStart
  const canReadBudget = hasAnyCapability(meCaps, [CAP.BUDGET_READ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<MRFRow | null>(null)

  const [sitesError, setSitesError] = useState<string | null>(null)
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const siteOptions: SiteOption[] = useMemo(
    () => sites.map((s) => ({ id: s.id, label: `${s.name} (${s.code})`, client: s.client })),
    [sites],
  )
  const siteNameById = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites])
  const siteRowForMrf = useMemo(
    () => (row != null ? sites.find((s) => s.id === row.site) : undefined),
    [sites, row],
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [wfInstance, setWfInstance] = useState<WorkflowInstance | null>(null)
  const [wfInstanceLoading, setWfInstanceLoading] = useState(false)
  const [wfInstanceError, setWfInstanceError] = useState<string | null>(null)

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

  const [inlineConfigCheck, setInlineConfigCheck] = useState<WorkflowConfigCheck | null>(null)
  const [inlineConfigLoading, setInlineConfigLoading] = useState(false)
  const [inlineConfigError, setInlineConfigError] = useState<string | null>(null)

  const [readiness, setReadiness] = useState<MRFReadinessResponse | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [lineItemsVersion, setLineItemsVersion] = useState(0)
  const [lineItemsOpenCreate, setLineItemsOpenCreate] = useState(false)
  const [detailLineItems, setDetailLineItems] = useState<MRFLineItemRow[]>([])

  const selectedRoute = useMemo(
    () => availableRoutes.find((r) => r.id === selectedRouteId) ?? null,
    [availableRoutes, selectedRouteId],
  )

  const isWorkflowNotStarted = !row?.workflow_status || row.workflow_status === 'not_started'
  const isReadyForApproval = readiness?.ok === true
  const showApprovalWorkflow = !isWorkflowNotStarted || isReadyForApproval

  const startDisabledByRoutes =
    routesLoading ||
    !!routesError ||
    (availableRoutes.length > 0 && (selectedRouteId == null || selectedRoute?.ok === false))

  const startDisabledByReadiness =
    isWorkflowNotStarted && (!isReadyForApproval || readinessLoading || !!readinessError)

  const budgetReservationCopy = useMemo(
    () => (row ? mrfReservationStatusCopy(row, row.workflow_status) : null),
    [row],
  )

  const isClientView = useClientMrfWorkspace(row)

  const loadWorkflowInstance = useCallback(async (instanceId: number) => {
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
  }, [canWorkflowRead])

  const loadReadiness = useCallback(
    async (mrfRow: MRFRow) => {
      setReadinessLoading(true)
      setReadinessError(null)
      try {
        const raw = await getMRFReadiness(mrfId)
        setReadiness(normalizeMrfReadiness(raw, mrfRow))
      } catch (e: unknown) {
        setReadiness(null)
        setReadinessError(parseApiError(e, 'Failed to load MRF readiness').message)
      } finally {
        setReadinessLoading(false)
      }
    },
    [mrfId],
  )

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await getMRF(mrfId)
      setRow(res)
      void loadReadiness(res)
    } catch (e: unknown) {
      setRow(null)
      setError(parseApiError(e, 'Failed to load MRF').message)
    } finally {
      setLoading(false)
    }
  }

  async function reloadMrfAndWorkflow() {
    try {
      const res = await getMRF(mrfId)
      setRow(res)
      await loadReadiness(res)
      if (canWorkflowRead && res.workflow_instance_id != null && res.workflow_instance_id > 0) {
        await loadWorkflowInstance(res.workflow_instance_id)
      } else {
        setWfInstance(null)
        setWfInstanceError(null)
      }
    } catch (e: unknown) {
      setWfInstanceError(parseApiError(e, 'Failed to reload MRF').message)
    }
  }

  function handleLineItemsChanged() {
    setLineItemsVersion((v) => v + 1)
    void reloadMrfAndWorkflow()
  }

  async function handleCheckConfig() {
    setConfigDrawerOpen(true)
    setConfigBusy(true)
    setConfigData(null)
    setConfigError(null)
    try {
      const d = await getMRFWorkflowConfigCheck(mrfId)
      setConfigData(d)
    } catch (e: unknown) {
      setConfigError(parseApiError(e, 'Config check failed').message)
    } finally {
      setConfigBusy(false)
    }
  }

  async function handleStartWorkflow() {
    setStartInlineError(null)
    let readyNow = readiness?.ok === true
    if (row) {
      try {
        const raw = await getMRFReadiness(mrfId)
        const normalized = normalizeMrfReadiness(raw, row)
        setReadiness(normalized)
        readyNow = normalized.ok
      } catch {
        setStartInlineError('Could not verify MRF readiness. Try again.')
        return
      }
    }
    if (!readyNow) {
      setStartInlineError('MRF is not ready for approval. Complete setup items below.')
      return
    }
    if (availableRoutes.length > 0) {
      if (selectedRouteId == null) {
        setStartInlineError('Select an approval route before sending for approval.')
        return
      }
      const r = availableRoutes.find((x) => x.id === selectedRouteId)
      if (!r?.ok) {
        setStartInlineError('This route is missing approvers. Choose another route or ask an administrator.')
        return
      }
    }
    setStartBusy(true)
    try {
      const routeArg = availableRoutes.length > 0 ? selectedRouteId : undefined
      await startMRFWorkflow(mrfId, routeArg ?? undefined)
      await reloadMrfAndWorkflow()
    } catch (e: unknown) {
      setStartInlineError(formatMrfWorkflowStartError(e))
    } finally {
      setStartBusy(false)
    }
  }

  async function loadSitesLookup() {
    setSitesError(null)
    try {
      const res = await listSites({ search: '', page: 1 })
      setSites(res.items)
    } catch (e: unknown) {
      setSites([])
      setSitesError(parseApiError(e, 'Site lookup failed').message)
    }
  }

  async function loadDepartmentOptions() {
    if (isClientFacingUser(me)) {
      setDepartmentOptions([])
      setDepartmentsLoading(false)
      return
    }
    setDepartmentsLoading(true)
    setDepartmentsError(null)
    try {
      const opts = await loadAllActiveDepartmentOptions()
      setDepartmentOptions(opts)
    } catch (e: unknown) {
      setDepartmentOptions([])
      setDepartmentsError(parseApiError(e, 'Department lookup failed').message)
    } finally {
      setDepartmentsLoading(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(mrfId)) {
      setError('Invalid MRF id.')
      setLoading(false)
      return
    }
    void refresh()
    void loadSitesLookup()
    void loadDepartmentOptions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mrfId])

  useEffect(() => {
    if (!row || !canWorkflowRead) {
      setWfInstance(null)
      setWfInstanceError(null)
      return
    }
    const instId = row.workflow_instance_id
    if (typeof instId === 'number' && instId > 0) {
      void loadWorkflowInstance(instId)
    } else {
      setWfInstance(null)
      setWfInstanceError(null)
    }
  }, [row?.workflow_instance_id, row?.id, canWorkflowRead, loadWorkflowInstance])

  useEffect(() => {
    if (!row || row.workflow_status !== 'not_started' || !canWorkflowStart) {
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
        const clientId = siteRowForMrf?.client
        const res = await listAvailableApprovalRoutes({
          trigger_type: 'mrf',
          site: row.site,
          ...(clientId != null && Number.isFinite(clientId) ? { client: clientId } : {}),
        })
        if (cancelled) return
        let list = res.results ?? []
        if (row.billing_type === 'non_billable') {
          list = list.filter((r) => !r.code.includes('fast_track'))
        }
        setAvailableRoutes(list)
        if (list.length === 1) {
          const only = list[0]
          if (only != null) setSelectedRouteId(only.id)
        } else if (row.preferred_flow_type) {
          // Attempt to match the preferred flow type to the route code
          const pref = list.find((r) => r.code.toLowerCase().includes(row.preferred_flow_type?.toLowerCase() || ''))
          if (pref) {
            setSelectedRouteId(pref.id)
          } else {
            const defaults = list.filter((r) => r.is_default)
            if (defaults.length === 1) {
              const d = defaults[0]
              if (d != null) setSelectedRouteId(d.id)
            }
          }
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
            setRoutesError('This MRF site or client is not accessible.')
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
  }, [row, row?.site, canWorkflowStart, siteRowForMrf?.client])

  useEffect(() => {
    if (!isClientView || !row || !isWorkflowNotStarted || !canWorkflowStart) {
      setInlineConfigCheck(null)
      setInlineConfigLoading(false)
      setInlineConfigError(null)
      return
    }
    if (routesLoading) return
    if (availableRoutes.length > 0) {
      setInlineConfigCheck(null)
      setInlineConfigLoading(false)
      setInlineConfigError(null)
      return
    }

    let cancelled = false
    setInlineConfigLoading(true)
    setInlineConfigError(null)
    setInlineConfigCheck(null)

    void (async () => {
      try {
        const data = await getMRFWorkflowConfigCheck(mrfId)
        if (!cancelled) setInlineConfigCheck(data)
      } catch (e: unknown) {
        if (!cancelled) {
          setInlineConfigCheck(null)
          setInlineConfigError(parseApiError(e, 'Could not verify default approval flow.').message)
        }
      } finally {
        if (!cancelled) setInlineConfigLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    isClientView,
    row,
    isWorkflowNotStarted,
    canWorkflowStart,
    routesLoading,
    availableRoutes.length,
    mrfId,
  ])

  useEffect(() => {
    if (!Number.isFinite(mrfId)) return
    let cancelled = false
    void (async () => {
      try {
        const res = await listMRFLineItems({ mrf: mrfId })
        if (!cancelled) setDetailLineItems(res.items)
      } catch {
        if (!cancelled) setDetailLineItems([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mrfId, lineItemsVersion])

  useEffect(() => {
    if (!row) return
    void loadReadiness(row)
  }, [row?.id, row?.budget_plan, row?.billing_type, lineItemsVersion, loadReadiness])

  function openEdit() {
    if (!canUpdate) return
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    void reloadMrfAndWorkflow()
  }

  async function handleDelete() {
    if (!row || !canDelete) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      setDeleteError(null)
      return
    }
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteMRF(row.id)
      navigate('/mrf')
    } catch (e: unknown) {
      setDeleteError(parseApiError(e, 'Delete failed').message)
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading MRF..." />
  if (error) return <ErrorState message={error} />
  if (!row) return <EmptyState title="MRF not found" description="This request may have been removed." />

  const siteLabel = siteNameById.get(row.site) ?? `Site #${row.site}`

  const pageHeader = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {isClientView ? (
          <>
            <h2 className="text-base font-semibold text-app-text">Manpower request #{row.id}</h2>
            <p className="mt-0.5 text-sm text-app-secondary">{siteLabel}</p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">MRF</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-app-text">
              #{row.id}
              {row.request_number?.trim() ? (
                <span className="ml-2 font-mono text-sm font-normal text-app-secondary">
                  ({row.request_number})
                </span>
              ) : null}
            </h2>
            <p className="mt-1 text-sm text-app-secondary">
              {siteLabel} - {new Date(row.created_at).toLocaleString()}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <MRFStatusBadge status={row.status} />
        {!isClientView && row.client_visible ? <Badge variant="info">Client visible</Badge> : null}
        <Button
          variant="secondary"
          className="min-h-9 px-2"
          onClick={() => navigate('/mrf')}
          aria-label="Back to MRF list"
          title="Back"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Button>
        {canUpdate ? (
          <Button variant="secondary" className="min-h-9 px-2" onClick={openEdit} aria-label="Edit MRF" title="Edit">
            <Pencil className="h-4 w-4" aria-hidden />
          </Button>
        ) : null}
        {canDelete && !isClientView ? (
          deleteConfirm ? (
            <>
              <Button variant="secondary" className="min-h-9 px-3" onClick={() => setDeleteConfirm(false)} disabled={deleteBusy}>
                Cancel
              </Button>
              <Button variant="danger" className="min-h-9 px-3" onClick={handleDelete} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting...' : 'Confirm delete'}
              </Button>
            </>
          ) : (
            <Button variant="danger" className="min-h-9 px-2" onClick={handleDelete} aria-label="Delete MRF" title="Delete">
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          )
        ) : null}
      </div>
    </div>
  )

  const lineItemsBlock = (
    <MRFLineItemsTable
      mrfId={row.id}
      siteId={row.site}
      parentMrf={row}
      siteOptions={siteOptions}
      readinessLineItems={readiness?.line_items}
      onChanged={handleLineItemsChanged}
      openCreateSignal={lineItemsOpenCreate}
      onOpenCreateHandled={() => setLineItemsOpenCreate(false)}
      embedded={isClientView}
    />
  )

  const lineItemsSection = isClientView ? (
    <MrfSectionPanel title="Line items" tone="roles">
      {lineItemsBlock}
    </MrfSectionPanel>
  ) : (
    lineItemsBlock
  )

  const sharedDrawers = (
    <>
      <WorkflowConfigCheckDrawer
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        loading={configBusy}
        errorMessage={configError}
        data={configData}
      />

      <WorkflowReassignDrawer
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        instanceId={row.workflow_instance_id ?? null}
        stepId={row.workflow_current_step_id ?? null}
        onSuccess={() => reloadMrfAndWorkflow()}
      />

      {drawerOpen ? (
        <MRFCreateWorkspaceDrawer
          open={drawerOpen}
          initialMRF={row}
          onClose={closeDrawer}
          onFinished={() => {
            void reloadMrfAndWorkflow()
          }}
          siteOptions={siteOptions}
          departmentOptions={departmentOptions}
          departmentsLoading={departmentsLoading}
          departmentsError={departmentsError}
          lookupError={sitesError}
          canReadBudget={canReadBudget}
        />
      ) : null}
    </>
  )

  if (isClientView) {
    return (
      <div className="w-full space-y-5">
        {pageHeader}
        {deleteError ? <ErrorState message={deleteError} /> : null}

        <MRFClientDetailOverview
          row={row}
          siteLabel={siteLabel}
          lineItems={detailLineItems}
          readinessLineItems={readiness?.line_items}
        />

        {lineItemsSection}

        <MRFClientDetailApproval
          row={row}
          readiness={readiness}
          readinessLoading={readinessLoading}
          readinessError={readinessError}
          isWorkflowNotStarted={isWorkflowNotStarted}
          isReadyForApproval={isReadyForApproval}
          showApprovalWorkflow={showApprovalWorkflow}
          canWorkflowStart={canWorkflowStart}
          canWorkflowRead={canWorkflowRead}
          canWorkflowApprove={canWorkflowApprove}
          canWorkflowReject={canWorkflowReject}
          canWorkflowReassign={canWorkflowReassign}
          canConfigCheck={canConfigCheck}
          availableRoutes={availableRoutes}
          routesLoading={routesLoading}
          routesError={routesError}
          selectedRouteId={selectedRouteId}
          onRouteChange={(id) => {
            setSelectedRouteId(id)
            setStartInlineError(null)
          }}
          startBusy={startBusy}
          startInlineError={startInlineError}
          startDisabledByRoutes={startDisabledByRoutes}
          startDisabledByReadiness={startDisabledByReadiness}
          configCheck={inlineConfigCheck}
          configLoading={inlineConfigLoading}
          configError={inlineConfigError}
          onCheckConfig={() => void handleCheckConfig()}
          onStartWorkflow={() => void handleStartWorkflow()}
          wfInstance={wfInstance}
          wfInstanceLoading={wfInstanceLoading}
          wfInstanceError={wfInstanceError}
          onReassign={() => setReassignOpen(true)}
          onWorkflowActionSuccess={reloadMrfAndWorkflow}
          meId={me?.id}
          isSuperuser={!!me?.is_superuser}
        />

        {sharedDrawers}
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
        {pageHeader}
        {deleteError ? (
          <div className="mt-3">
            <ErrorState message={deleteError} />
          </div>
        ) : null}
      </div>

      <MRFClientFormDisplay row={row} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel lg:col-span-2">
          <p className="text-sm font-semibold text-app-text">Details</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Raised by</dt>
              <dd className="max-w-[60%] text-right font-medium text-app-text">
                {row.requested_by_name ? row.requested_by_name : `User #${row.requested_by}`}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Source / Channel</dt>
              <dd className="font-medium text-app-text">
                {row.requested_by_type === 'client' ? 'Client Portal' : 'Internal Ops'}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">MRF type</dt>
              <dd className="font-medium text-app-text">{row.mrf_type}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Billing type</dt>
              <dd>
                {row.billing_type === 'non_billable' ? (
                  <Badge variant="warning">Internal Non-Billable</Badge>
                ) : (
                  <Badge variant="info">Client Billable</Badge>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Requesting department</dt>
              <dd className="max-w-[60%] text-right font-medium text-app-text">
                {row.requesting_department_name?.trim() ||
                  (row.requesting_department != null ? `#${row.requesting_department}` : '�')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Required department</dt>
              <dd className="max-w-[60%] text-right font-medium text-app-text">
                {row.required_department_name?.trim() ||
                  (row.required_department != null ? `#${row.required_department}` : '�')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Legacy department text</dt>
              <dd className="max-w-[60%] text-right text-app-text">{row.department?.trim() ? row.department : '�'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">Required by</dt>
              <dd className="font-medium text-app-text">{row.required_by_date || '-'}</dd>
            </div>
            {row.billing_type === 'billable' && (
              <>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-subtle">Budget deviation</dt>
                  <dd className="font-medium text-app-text">{row.is_budget_deviation ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-subtle">Special client req.</dt>
                  <dd className="font-medium text-app-text">{row.has_special_client_req ? 'Yes' : 'No'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-app-subtle">Preferred Flow</dt>
                  <dd className="font-medium text-app-text">
                    {row.preferred_flow_type === 'fast_track' ? 'Fast-Track' : 'Standard'}
                  </dd>
                </div>
              </>
            )}
            <div className="flex items-start justify-between gap-3 border-t border-app-border pt-2">
              <dt className="text-app-subtle shrink-0">Budget status</dt>
              <dd className="max-w-[60%] text-right text-sm text-app-text">
                {budgetReservationCopy ? (
                  <Badge variant={budgetReservationCopy.variant}>{budgetReservationCopy.label}</Badge>
                ) : (
                  <span className="text-app-secondary">—</span>
                )}
              </dd>
            </div>
          </dl>
          {row.reason ? (
            <div className="mt-4 rounded-panel border border-app-border bg-app-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Reason</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-app-secondary">{row.reason}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
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
            {row.workflow_resolved_by_name ? (
              <div className="flex items-center justify-between gap-3 border-t border-app-border pt-2">
                <dt className="text-app-subtle shrink-0">Closed by</dt>
                <dd className="max-w-[60%] text-right font-medium text-app-text">{row.workflow_resolved_by_name}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </div>

      {lineItemsSection}

      <section className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
        <p className="text-sm font-semibold text-app-text">Approval workflow</p>
        {isWorkflowNotStarted ? (
          <p className="mt-1 text-xs text-app-secondary">
            {isReadyForApproval
              ? 'MRF setup is complete. Choose an approval route and send for approval.'
              : 'Approval workflow appears after MRF setup is complete.'}
          </p>
        ) : (
          <p className="mt-1 text-xs text-app-secondary">Track approval progress and act on the current step.</p>
        )}
        <div className="mt-4">
          <MRFBudgetImpactPanel
            source={row}
            workflowStatus={row.workflow_status}
            clientName={undefined}
            siteName={siteNameById.get(row.site) ?? siteRowForMrf?.name}
            departmentName={row.required_department_name}
          />
        </div>

        <div className="mt-4">
          <MRFReadinessPanel
            readiness={readiness}
            loading={readinessLoading}
            error={readinessError}
            mrf={row}
            compact={isReadyForApproval && isWorkflowNotStarted}
            onAddLineItem={canUpdate ? () => setLineItemsOpenCreate(true) : undefined}
          />
        </div>

        {showApprovalWorkflow && isWorkflowNotStarted && canWorkflowStart ? (
          <div className="mt-4 space-y-3">
            <ApprovalRouteSelector
              routes={availableRoutes}
              selectedRouteId={selectedRouteId}
              onChange={(id) => {
                setSelectedRouteId(id)
                setStartInlineError(null)
              }}
              loading={routesLoading}
              error={routesError}
              disabled={startBusy}
            />
          </div>
        ) : null}
        {startInlineError ? (
          <div className="mt-4">
            <ErrorState message={startInlineError} />
          </div>
        ) : null}
        {showApprovalWorkflow || !isWorkflowNotStarted ? (
          <div className="mt-4 border-t border-app-border pt-4">
            <WorkflowStatusPanel
              workflowStatus={row.workflow_status}
              workflowInstanceId={row.workflow_instance_id}
              workflowCurrentStepCode={row.workflow_current_step_code}
              workflowCurrentStepName={row.workflow_current_step_name}
              workflowCurrentAssignedUserName={row.workflow_current_assigned_user_name}
              workflowCurrentDepartmentName={row.workflow_current_department_name}
              canConfigCheck={canConfigCheck}
              canStart={canWorkflowStart && isReadyForApproval}
              checkingConfig={configBusy}
              starting={startBusy}
              onCheckConfig={() => void handleCheckConfig()}
              onStartWorkflow={() => void handleStartWorkflow()}
              startButtonLabel="Send for approval"
              startDisabled={startDisabledByRoutes || startDisabledByReadiness}
            />
          </div>
        ) : null}

        {canWorkflowReassign &&
        row.workflow_status === 'active' &&
        row.workflow_instance_id != null &&
        row.workflow_instance_id > 0 &&
        row.workflow_current_step_id != null &&
        row.workflow_current_step_id > 0 ? (
          <div className="mt-4 border-t border-app-border pt-4">
            <Button variant="secondary" className="min-h-9" type="button" onClick={() => setReassignOpen(true)}>
              Reassign current step
            </Button>
          </div>
        ) : null}

        {row.workflow_instance_id != null && row.workflow_instance_id > 0 && canWorkflowRead ? (
          <div className="mt-6 border-t border-app-border pt-4">
            <WorkflowTimeline
              instance={wfInstance}
              loading={wfInstanceLoading}
              errorMessage={wfInstanceError}
              currentStepId={row.workflow_current_step_id ?? null}
              layout="stacked"
            />
          </div>
        ) : canWorkflowRead ? null : (
          <p className="mt-4 text-xs text-app-subtle">Workflow instance details require the workflow.read capability.</p>
        )}

        {row.workflow_instance_id != null &&
        row.workflow_instance_id > 0 &&
        row.workflow_current_step_id != null &&
        row.workflow_current_step_id > 0 ? (
          <div className="mt-6 border-t border-app-border pt-4">
            <WorkflowActionBox
              instanceId={row.workflow_instance_id}
              stepId={row.workflow_current_step_id}
              workflowStatus={row.workflow_status}
              assignedUserId={row.workflow_current_assigned_user}
              meId={me?.id}
              isSuperuser={!!me?.is_superuser}
              canApprove={canWorkflowApprove}
              canReject={canWorkflowReject}
              onSuccess={() => reloadMrfAndWorkflow()}
            />
          </div>
        ) : null}
      </section>

      {sharedDrawers}
    </div>
  )
}

