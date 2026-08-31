import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type {
  ClientOnboardingProposedBudgetRow,
  ClientOnboardingProposedBudgetWriteInput,
  ClientOnboardingProposedUser,
  ClientOnboardingProposedUserWriteInput,
  ClientOnboardingRow,
  ClientOnboardingWriteInput,
  ProposedDepartmentRow,
  ProposedDepartmentWriteInput,
  ProposedRoleRequirementRow,
  ProposedRoleRequirementWriteInput,
  ProposedSiteRow,
  ProposedSiteWriteInput,
} from '@/features/clientOnboarding/types'

export { getClientOnboardingConfigCheck, startClientOnboardingWorkflow } from '@/api/workflow'

export interface ListClientOnboardingRequestsParams {
  search?: string
  status?: string
  onboarding_type?: string
  client?: number
  requested_by?: number
  page?: number
}

export async function listClientOnboardingRequests(
  params?: ListClientOnboardingRequestsParams,
): Promise<{ items: ClientOnboardingRow[]; count?: number }> {
  const res = await api.get('/api/onboarding/client-requests/', { params })
  return unwrapDrfResults<ClientOnboardingRow>(res.data)
}

export async function getClientOnboardingRequest(id: number): Promise<ClientOnboardingRow> {
  const res = await api.get(`/api/onboarding/client-requests/${id}/`)
  return res.data as ClientOnboardingRow
}

export async function createClientOnboardingRequest(payload: ClientOnboardingWriteInput): Promise<ClientOnboardingRow> {
  const res = await api.post('/api/onboarding/client-requests/', payload)
  return res.data as ClientOnboardingRow
}

export async function updateClientOnboardingRequest(
  id: number,
  payload: Partial<ClientOnboardingWriteInput>,
): Promise<ClientOnboardingRow> {
  const res = await api.patch(`/api/onboarding/client-requests/${id}/`, payload)
  return res.data as ClientOnboardingRow
}

export async function deleteClientOnboardingRequest(id: number): Promise<void> {
  await api.delete(`/api/onboarding/client-requests/${id}/`)
}

// —— Proposed sites ——————————————————————————————————————————————————

export async function listProposedSites(requestId: number): Promise<{ items: ProposedSiteRow[]; count?: number }> {
  const res = await api.get(`/api/onboarding/client-requests/${requestId}/proposed-sites/`)
  return unwrapDrfResults<ProposedSiteRow>(res.data)
}

export async function createProposedSite(requestId: number, payload: ProposedSiteWriteInput): Promise<ProposedSiteRow> {
  const res = await api.post(`/api/onboarding/client-requests/${requestId}/proposed-sites/`, payload)
  return res.data as ProposedSiteRow
}

export async function updateProposedSite(
  requestId: number,
  siteId: number,
  payload: Partial<ProposedSiteWriteInput>,
): Promise<ProposedSiteRow> {
  const res = await api.patch(`/api/onboarding/client-requests/${requestId}/proposed-sites/${siteId}/`, payload)
  return res.data as ProposedSiteRow
}

export async function deleteProposedSite(requestId: number, siteId: number): Promise<void> {
  await api.delete(`/api/onboarding/client-requests/${requestId}/proposed-sites/${siteId}/`)
}

// —— Proposed departments —————————————————————————————————————————————

export async function listProposedDepartments(
  requestId: number,
): Promise<{ items: ProposedDepartmentRow[]; count?: number }> {
  const res = await api.get(`/api/onboarding/client-requests/${requestId}/proposed-departments/`)
  return unwrapDrfResults<ProposedDepartmentRow>(res.data)
}

export async function createProposedDepartment(
  requestId: number,
  payload: ProposedDepartmentWriteInput,
): Promise<ProposedDepartmentRow> {
  const res = await api.post(`/api/onboarding/client-requests/${requestId}/proposed-departments/`, payload)
  return res.data as ProposedDepartmentRow
}

export async function updateProposedDepartment(
  requestId: number,
  departmentId: number,
  payload: Partial<ProposedDepartmentWriteInput>,
): Promise<ProposedDepartmentRow> {
  const res = await api.patch(
    `/api/onboarding/client-requests/${requestId}/proposed-departments/${departmentId}/`,
    payload,
  )
  return res.data as ProposedDepartmentRow
}

export async function deleteProposedDepartment(requestId: number, departmentId: number): Promise<void> {
  await api.delete(`/api/onboarding/client-requests/${requestId}/proposed-departments/${departmentId}/`)
}

// —— Proposed role requirements ———————————————————————————————————————

export async function listProposedRoleRequirements(
  requestId: number,
): Promise<{ items: ProposedRoleRequirementRow[]; count?: number }> {
  const res = await api.get(`/api/onboarding/client-requests/${requestId}/proposed-role-requirements/`)
  return unwrapDrfResults<ProposedRoleRequirementRow>(res.data)
}

export async function createProposedRoleRequirement(
  requestId: number,
  payload: ProposedRoleRequirementWriteInput,
): Promise<ProposedRoleRequirementRow> {
  const res = await api.post(`/api/onboarding/client-requests/${requestId}/proposed-role-requirements/`, payload)
  return res.data as ProposedRoleRequirementRow
}

export async function updateProposedRoleRequirement(
  requestId: number,
  rowId: number,
  payload: Partial<ProposedRoleRequirementWriteInput>,
): Promise<ProposedRoleRequirementRow> {
  const res = await api.patch(
    `/api/onboarding/client-requests/${requestId}/proposed-role-requirements/${rowId}/`,
    payload,
  )
  return res.data as ProposedRoleRequirementRow
}

export async function deleteProposedRoleRequirement(requestId: number, rowId: number): Promise<void> {
  await api.delete(`/api/onboarding/client-requests/${requestId}/proposed-role-requirements/${rowId}/`)
}

// —— Proposed budgets —————————————————————————————————————————————————

export async function listClientOnboardingProposedBudgets(
  requestId: number,
): Promise<{ items: ClientOnboardingProposedBudgetRow[]; count?: number }> {
  const res = await api.get(`/api/onboarding/client-requests/${requestId}/proposed-budgets/`)
  return unwrapDrfResults<ClientOnboardingProposedBudgetRow>(res.data)
}

export async function createClientOnboardingProposedBudget(
  requestId: number,
  payload: ClientOnboardingProposedBudgetWriteInput,
): Promise<ClientOnboardingProposedBudgetRow> {
  const res = await api.post(`/api/onboarding/client-requests/${requestId}/proposed-budgets/`, payload)
  return res.data as ClientOnboardingProposedBudgetRow
}

export async function updateClientOnboardingProposedBudget(
  requestId: number,
  budgetId: number,
  payload: Partial<ClientOnboardingProposedBudgetWriteInput>,
): Promise<ClientOnboardingProposedBudgetRow> {
  const res = await api.patch(`/api/onboarding/client-requests/${requestId}/proposed-budgets/${budgetId}/`, payload)
  return res.data as ClientOnboardingProposedBudgetRow
}

export async function deleteClientOnboardingProposedBudget(requestId: number, budgetId: number): Promise<void> {
  await api.delete(`/api/onboarding/client-requests/${requestId}/proposed-budgets/${budgetId}/`)
}

// —— Proposed users ———————————————————————————————————————————————————

export async function listProposedUsers(
  requestId: number,
): Promise<{ items: ClientOnboardingProposedUser[]; count?: number }> {
  const res = await api.get(`/api/onboarding/client-requests/${requestId}/proposed-users/`)
  return unwrapDrfResults<ClientOnboardingProposedUser>(res.data)
}

export async function createProposedUser(
  requestId: number,
  payload: ClientOnboardingProposedUserWriteInput,
): Promise<ClientOnboardingProposedUser> {
  const res = await api.post(`/api/onboarding/client-requests/${requestId}/proposed-users/`, payload)
  return res.data as ClientOnboardingProposedUser
}

export async function updateProposedUser(
  requestId: number,
  userId: number,
  payload: Partial<ClientOnboardingProposedUserWriteInput>,
): Promise<ClientOnboardingProposedUser> {
  const res = await api.patch(`/api/onboarding/client-requests/${requestId}/proposed-users/${userId}/`, payload)
  return res.data as ClientOnboardingProposedUser
}

export async function deleteProposedUser(requestId: number, userId: number): Promise<void> {
  await api.delete(`/api/onboarding/client-requests/${requestId}/proposed-users/${userId}/`)
}

export async function resendProposedUserInvite(
  requestId: number,
  userId: number,
): Promise<ClientOnboardingProposedUser> {
  const { data } = await api.post(
    `/api/onboarding/client-requests/${requestId}/proposed-users/${userId}/resend-invite/`,
    {},
  )
  return data as ClientOnboardingProposedUser
}
