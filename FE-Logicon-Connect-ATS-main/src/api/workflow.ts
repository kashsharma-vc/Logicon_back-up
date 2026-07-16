import { api } from '@/api/client'
import type {
  ApprovalRoutePreviewListResponse,
  WorkflowActionPayload,
  WorkflowConfigCheck,
  WorkflowInstance,
  WorkflowMyTaskListResponse,
  WorkflowReassignPayload,
  WorkflowTaskDetailResponse,
} from '@/features/workflow/types'

export async function startMRFWorkflow(mrfId: number, approvalRoute?: number | null) {
  const payload =
    approvalRoute != null && Number.isFinite(approvalRoute) && approvalRoute > 0 ? { approval_route: approvalRoute } : {}
  const { data } = await api.post<WorkflowInstance>(`/api/workflow/mrf/${mrfId}/start/`, payload)
  return data
}

export async function listAvailableApprovalRoutes(params: {
  trigger_type: 'mrf' | 'client_onboarding' | 'mobilisation' | 'sales_proposal'
  client?: number | null
  site?: number | null
}) {
  const { data } = await api.get<ApprovalRoutePreviewListResponse>('/api/workflow/routes/available/', { params })
  return data
}

export async function getMRFWorkflowConfigCheck(mrfId: number) {
  const { data } = await api.get<WorkflowConfigCheck>(`/api/workflow/mrf/${mrfId}/config-check/`)
  return data
}

export async function getClientOnboardingConfigCheck(onboardingId: number) {
  const { data } = await api.get<WorkflowConfigCheck>(`/api/workflow/client-onboarding/${onboardingId}/config-check/`)
  return data
}

export async function startClientOnboardingWorkflow(onboardingId: number, approvalRoute?: number | null) {
  const payload =
    approvalRoute != null && Number.isFinite(approvalRoute) && approvalRoute > 0 ? { approval_route: approvalRoute } : {}
  const { data } = await api.post<WorkflowInstance>(`/api/workflow/client-onboarding/${onboardingId}/start/`, payload)
  return data
}

export async function getMobilisationConfigCheck(mobilisationId: number) {
  const { data } = await api.get<WorkflowConfigCheck>(`/api/workflow/client-onboarding/${mobilisationId}/config-check/`)
  return data
}

export async function startMobilisationWorkflow(mobilisationId: number, approvalRoute?: number | null) {
  const payload =
    approvalRoute != null && Number.isFinite(approvalRoute) && approvalRoute > 0 ? { approval_route: approvalRoute } : {}
  const { data } = await api.post<WorkflowInstance>(`/api/workflow/client-onboarding/${mobilisationId}/start/`, payload)
  return data
}

export async function listMyWorkflowTasks() {
  const { data } = await api.get<WorkflowMyTaskListResponse>('/api/workflow/my-tasks/')
  return data
}

export async function getMyWorkflowTaskDetail(stepId: number) {
  const { data } = await api.get<WorkflowTaskDetailResponse>(`/api/workflow/my-tasks/${stepId}/`)
  return data
}

export async function getWorkflowInstance(instanceId: number) {
  const { data } = await api.get<WorkflowInstance>(`/api/workflow/instances/${instanceId}/`)
  return data
}

export async function actOnWorkflowStep(instanceId: number, stepId: number, payload: WorkflowActionPayload) {
  const { data } = await api.post<unknown>(`/api/workflow/instances/${instanceId}/steps/${stepId}/act/`, payload)
  return data
}

export async function reassignWorkflowStep(instanceId: number, stepId: number, payload: WorkflowReassignPayload) {
  const { data } = await api.post<unknown>(`/api/workflow/instances/${instanceId}/steps/${stepId}/reassign/`, payload)
  return data
}
