/**
 * Mobilisation API.
 *
 * Backend still uses "proposed" in table/endpoint names for setup rows, but
 * visible frontend terminology is Mobilisation departments/users.
 */
import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type { AccessRole } from '@/api/access'
import type {
  AssignOperationsOwnerPayload,
  ApplyMobilisationSetupSuggestionsResult,
  MobilisationDepartment,
  MobilisationDepartmentWriteInput,
  MobilisationSalesContext,
  MobilisationSetupBuilder,
  MobilisationSetupRequest,
  MobilisationSetupStrategy,
  MobilisationSetupSuggestions,
  MobilisationUser,
  MobilisationUserWriteInput,
  SaveMobilisationSetupBuilderPayload,
} from '@/features/mobilisation/types'

export { getMobilisationConfigCheck, startMobilisationWorkflow } from '@/api/workflow'

export interface ListMobilisationSetupRequestsParams {
  search?: string
  status?: string
  page?: number
  source_proposal_version?: number
  source_sales_lead?: number
}

export async function listMobilisationSetupRequests(
  params?: ListMobilisationSetupRequestsParams,
): Promise<{ items: MobilisationSetupRequest[]; count?: number }> {
  const res = await api.get('/api/mobilisation/setup-requests/', { params })
  return unwrapDrfResults<MobilisationSetupRequest>(res.data)
}

export async function getMobilisationSetupRequest(id: number): Promise<MobilisationSetupRequest> {
  const res = await api.get(`/api/mobilisation/setup-requests/${id}/`)
  return res.data as MobilisationSetupRequest
}

export async function assignMobilisationOperationsOwner(
  id: number,
  payload: AssignOperationsOwnerPayload,
): Promise<MobilisationSetupRequest> {
  const res = await api.post(`/api/mobilisation/setup-requests/${id}/assign-operations-owner/`, payload)
  return res.data as MobilisationSetupRequest
}

export async function markMobilisationSetupCompleted(id: number): Promise<MobilisationSetupRequest> {
  const res = await api.post(`/api/mobilisation/setup-requests/${id}/mark-setup-completed/`, {})
  return res.data as MobilisationSetupRequest
}

export async function getMobilisationSetupSuggestions(id: number): Promise<MobilisationSetupSuggestions> {
  const { data } = await api.get(`/api/mobilisation/setup-requests/${id}/setup-suggestions/`)
  return data as MobilisationSetupSuggestions
}

export async function applyMobilisationSetupSuggestions(id: number): Promise<ApplyMobilisationSetupSuggestionsResult> {
  const { data } = await api.post(`/api/mobilisation/setup-requests/${id}/apply-setup-suggestions/`, {})
  return data as ApplyMobilisationSetupSuggestionsResult
}

// —— Departments ——————————————————————————————————————————————————————————————

export async function listMobilisationDepartments(
  requestId: number,
): Promise<{ items: MobilisationDepartment[]; count?: number }> {
  const res = await api.get(`/api/mobilisation/setup-requests/${requestId}/proposed-departments/`)
  return unwrapDrfResults<MobilisationDepartment>(res.data)
}

export async function createMobilisationDepartment(
  requestId: number,
  payload: MobilisationDepartmentWriteInput,
): Promise<MobilisationDepartment> {
  const res = await api.post(`/api/mobilisation/setup-requests/${requestId}/proposed-departments/`, payload)
  return res.data as MobilisationDepartment
}

export async function updateMobilisationDepartment(
  requestId: number,
  deptId: number,
  payload: Partial<MobilisationDepartmentWriteInput>,
): Promise<MobilisationDepartment> {
  const res = await api.patch(
    `/api/mobilisation/setup-requests/${requestId}/proposed-departments/${deptId}/`,
    payload,
  )
  return res.data as MobilisationDepartment
}

export async function deleteMobilisationDepartment(requestId: number, deptId: number): Promise<void> {
  await api.delete(`/api/mobilisation/setup-requests/${requestId}/proposed-departments/${deptId}/`)
}

// —— Users ————————————————————————————————————————————————————————————————————

export async function listMobilisationUsers(
  requestId: number,
): Promise<{ items: MobilisationUser[]; count?: number }> {
  const res = await api.get(`/api/mobilisation/setup-requests/${requestId}/proposed-users/`)
  return unwrapDrfResults<MobilisationUser>(res.data)
}

export async function createMobilisationUser(
  requestId: number,
  payload: MobilisationUserWriteInput,
): Promise<MobilisationUser> {
  const res = await api.post(`/api/mobilisation/setup-requests/${requestId}/proposed-users/`, payload)
  return res.data as MobilisationUser
}

export async function updateMobilisationUser(
  requestId: number,
  userId: number,
  payload: Partial<MobilisationUserWriteInput>,
): Promise<MobilisationUser> {
  const res = await api.patch(
    `/api/mobilisation/setup-requests/${requestId}/proposed-users/${userId}/`,
    payload,
  )
  return res.data as MobilisationUser
}

export async function deleteMobilisationUser(requestId: number, userId: number): Promise<void> {
  await api.delete(`/api/mobilisation/setup-requests/${requestId}/proposed-users/${userId}/`)
}

// —— Finalization ————————————————————————————————————————————————————————————

export async function finalizeMobilisationDirectly(id: number): Promise<unknown> {
  const { data } = await api.post(`/api/mobilisation/setup-requests/${id}/finalize-directly/`, {
    override_approval_required: true,
  })
  return data
}

// —— Sales Context ———————————————————————————————————————————————————————————

export async function getMobilisationSalesContext(id: number): Promise<MobilisationSalesContext> {
  const res = await api.get(`/api/mobilisation/setup-requests/${id}/sales-context/`)
  return res.data as MobilisationSalesContext
}

// —— Setup Builder ———————————————————————————————————————————————————————————

export async function getMobilisationSetupBuilder(id: number): Promise<MobilisationSetupBuilder> {
  const res = await api.get(`/api/mobilisation/setup-requests/${id}/setup-builder/`)
  return res.data as MobilisationSetupBuilder
}

export async function saveMobilisationSetupBuilder(
  id: number,
  payload: SaveMobilisationSetupBuilderPayload,
): Promise<MobilisationSetupBuilder> {
  const res = await api.put(`/api/mobilisation/setup-requests/${id}/setup-builder/`, payload)
  return res.data as MobilisationSetupBuilder
}

export async function applyMobilisationSetupBuilderTemplate(
  id: number,
  setup_strategy: MobilisationSetupStrategy,
): Promise<MobilisationSetupBuilder> {
  const res = await api.post(`/api/mobilisation/setup-requests/${id}/setup-builder/apply-template/`, { setup_strategy })
  return res.data as MobilisationSetupBuilder
}

// Eligible client roles

export async function getMobilisationEligibleClientRoles(
  requestId: number,
  scopeLevel: 'client' | 'site',
): Promise<{ items: AccessRole[]; count?: number }> {
  const { data } = await api.get<AccessRole[]>(
    `/api/mobilisation/setup-requests/${requestId}/eligible-client-roles/`,
    { params: { scope_level: scopeLevel } },
  )
  return { items: data, count: data.length }
}
