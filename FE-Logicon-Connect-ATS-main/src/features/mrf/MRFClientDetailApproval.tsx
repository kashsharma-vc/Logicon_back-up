import { MrfSectionPanel } from '@/features/mrf/mrfClientFormLayout'
import { MRFReadinessPanel } from '@/features/mrf/MRFReadinessPanel'
import type { MRFReadinessResponse, MRFRow } from '@/features/mrf/types'
import { ApprovalRouteSelector } from '@/features/workflow/ApprovalRouteSelector'
import { DefaultWorkflowConfigPreview } from '@/features/workflow/DefaultWorkflowConfigPreview'
import {
  WorkflowApprovalStepper,
  WorkflowAuditTrailList,
} from '@/features/workflow/WorkflowHistoryViews'
import { WorkflowActionBox } from '@/features/workflow/WorkflowActionBox'
import { WorkflowStatusPanel } from '@/features/workflow/WorkflowStatusPanel'
import { ErrorState } from '@/components/ui/ErrorState'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { ApprovalRoutePreview, WorkflowConfigCheck, WorkflowInstance } from '@/features/workflow/types'

export function MRFClientDetailApproval({
  row,
  readiness,
  readinessLoading,
  readinessError,
  isWorkflowNotStarted,
  isReadyForApproval,
  showApprovalWorkflow,
  canWorkflowStart,
  canWorkflowRead,
  canWorkflowApprove,
  canWorkflowReject,
  canWorkflowReassign,
  canConfigCheck,
  availableRoutes,
  routesLoading,
  routesError,
  selectedRouteId,
  onRouteChange,
  startBusy,
  startInlineError,
  startDisabledByRoutes,
  startDisabledByReadiness,
  configCheck,
  configLoading,
  configError,
  onCheckConfig,
  onStartWorkflow,
  wfInstance,
  wfInstanceLoading,
  wfInstanceError,
  onReassign,
  onWorkflowActionSuccess,
  meId,
  isSuperuser,
}: {
  row: MRFRow
  readiness: MRFReadinessResponse | null
  readinessLoading: boolean
  readinessError: string | null
  isWorkflowNotStarted: boolean
  isReadyForApproval: boolean
  showApprovalWorkflow: boolean
  canWorkflowStart: boolean
  canWorkflowRead: boolean
  canWorkflowApprove: boolean
  canWorkflowReject: boolean
  canWorkflowReassign: boolean
  canConfigCheck: boolean
  availableRoutes: ApprovalRoutePreview[]
  routesLoading: boolean
  routesError: string | null
  selectedRouteId: number | null
  onRouteChange: (id: number | null) => void
  startBusy: boolean
  startInlineError: string | null
  startDisabledByRoutes: boolean
  startDisabledByReadiness: boolean
  configCheck: WorkflowConfigCheck | null
  configLoading: boolean
  configError: string | null
  onCheckConfig: () => void
  onStartWorkflow: () => void
  wfInstance: WorkflowInstance | null
  wfInstanceLoading: boolean
  wfInstanceError: string | null
  onReassign: () => void
  onWorkflowActionSuccess: () => Promise<void>
  meId?: number
  isSuperuser: boolean
}) {
  if (!showApprovalWorkflow && isWorkflowNotStarted) {
    return null
  }

  const hasWorkflowInstance =
    row.workflow_instance_id != null && row.workflow_instance_id > 0

  const showHistoryPanels = hasWorkflowInstance && canWorkflowRead && !isWorkflowNotStarted

  if (isWorkflowNotStarted) {
    return (
      <MrfSectionPanel title="Approval" tone="approval">
        {!isReadyForApproval ? (
          <MRFReadinessPanel
            readiness={readiness}
            loading={readinessLoading}
            error={readinessError}
            mrf={row}
            compact
          />
        ) : (
          <p className="text-sm text-app-secondary">
            Review the approval path below, then send for approval.
          </p>
        )}

        {canWorkflowStart && isReadyForApproval ? (
          <div className="space-y-3">
            {routesLoading ? (
              <Spinner label="Loading approval routes…" />
            ) : routesError ? (
              <ErrorState message={routesError} />
            ) : availableRoutes.length > 0 ? (
              <ApprovalRouteSelector
                compact
                routes={availableRoutes}
                selectedRouteId={selectedRouteId}
                onChange={onRouteChange}
                disabled={startBusy}
              />
            ) : (
              <DefaultWorkflowConfigPreview
                compact
                loading={configLoading}
                errorMessage={configError}
                data={configCheck}
              />
            )}
          </div>
        ) : null}

        {startInlineError ? <ErrorState message={startInlineError} /> : null}

        {showApprovalWorkflow ? (
          <WorkflowStatusPanel
            workflowStatus={row.workflow_status}
            workflowInstanceId={row.workflow_instance_id}
            workflowCurrentStepCode={row.workflow_current_step_code}
            workflowCurrentStepName={row.workflow_current_step_name}
            workflowCurrentAssignedUserName={row.workflow_current_assigned_user_name}
            workflowCurrentDepartmentName={row.workflow_current_department_name}
            canConfigCheck={canConfigCheck}
            canStart={canWorkflowStart && isReadyForApproval}
            checkingConfig={false}
            starting={startBusy}
            onCheckConfig={onCheckConfig}
            onStartWorkflow={onStartWorkflow}
            startButtonLabel="Submit for approval"
            startDisabled={startDisabledByRoutes || startDisabledByReadiness}
          />
        ) : null}
      </MrfSectionPanel>
    )
  }

  return (
    <div className="space-y-4">
      <MrfSectionPanel title="Approval" tone="approval">
        <WorkflowStatusPanel
          workflowStatus={row.workflow_status}
          workflowInstanceId={row.workflow_instance_id}
          workflowCurrentStepCode={row.workflow_current_step_code}
          workflowCurrentStepName={row.workflow_current_step_name}
          workflowCurrentAssignedUserName={row.workflow_current_assigned_user_name}
          workflowCurrentDepartmentName={row.workflow_current_department_name}
          canConfigCheck={canConfigCheck}
          canStart={false}
          checkingConfig={false}
          starting={false}
          onCheckConfig={onCheckConfig}
          onStartWorkflow={onStartWorkflow}
          startButtonLabel="Submit for approval"
          startDisabled
        />

        {canWorkflowReassign &&
        row.workflow_status === 'active' &&
        hasWorkflowInstance &&
        row.workflow_current_step_id != null &&
        row.workflow_current_step_id > 0 ? (
          <Button variant="secondary" className="min-h-9" type="button" onClick={onReassign}>
            Reassign current step
          </Button>
        ) : null}

        {hasWorkflowInstance &&
        row.workflow_current_step_id != null &&
        row.workflow_current_step_id > 0 &&
        row.workflow_instance_id != null &&
        row.workflow_instance_id > 0 ? (
          <div className="border-t border-app-border/60 pt-4">
            <WorkflowActionBox
              instanceId={row.workflow_instance_id}
              stepId={row.workflow_current_step_id}
              workflowStatus={row.workflow_status}
              assignedUserId={row.workflow_current_assigned_user}
              meId={meId}
              isSuperuser={isSuperuser}
              canApprove={canWorkflowApprove}
              canReject={canWorkflowReject}
              onSuccess={onWorkflowActionSuccess}
            />
          </div>
        ) : null}
      </MrfSectionPanel>

      {showHistoryPanels ? (
        <>
          <MrfSectionPanel title="Approval history" tone="approval">
            <WorkflowApprovalStepper
              steps={wfInstance?.steps ?? []}
              currentStepId={row.workflow_current_step_id ?? null}
              loading={wfInstanceLoading}
              errorMessage={wfInstanceError}
            />
          </MrfSectionPanel>

          <MrfSectionPanel title="Audit trail" tone="roles">
            <WorkflowAuditTrailList
              entries={wfInstance?.audit_trail ?? []}
              loading={wfInstanceLoading}
              errorMessage={wfInstanceError}
            />
          </MrfSectionPanel>
        </>
      ) : null}
    </div>
  )
}
