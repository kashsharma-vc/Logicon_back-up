import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type {
  DeploymentCompleteInput,
  DeploymentHistoryRow,
  DeploymentNoteInput,
  DeploymentTransferInput,
  DeploymentTransferResult,
  EmployeeExitInput,
  EmployeeNoteInput,
  EmployeeRow,
  SiteDeploymentRow,
} from '@/features/deployment/types'

// ─── Employees ────────────────────────────────────────────────────────────────

export interface ListEmployeesParams {
  org?: number
  job_role?: number
  status?: string
  search?: string
  page?: number
}

export async function listEmployees(params?: ListEmployeesParams): Promise<{ items: EmployeeRow[]; count?: number }> {
  const res = await api.get('/api/deployment/employees/', { params })
  return unwrapDrfResults<EmployeeRow>(res.data)
}

export async function getEmployee(id: number): Promise<EmployeeRow> {
  const res = await api.get(`/api/deployment/employees/${id}/`)
  return res.data as EmployeeRow
}

export async function suspendEmployee(id: number, payload: EmployeeNoteInput = {}): Promise<EmployeeRow> {
  const res = await api.post(`/api/deployment/employees/${id}/suspend/`, payload)
  return res.data as EmployeeRow
}

export async function reactivateEmployee(id: number, payload: EmployeeNoteInput = {}): Promise<EmployeeRow> {
  const res = await api.post(`/api/deployment/employees/${id}/reactivate/`, payload)
  return res.data as EmployeeRow
}

export async function exitEmployee(id: number, payload: EmployeeExitInput = {}): Promise<EmployeeRow> {
  const res = await api.post(`/api/deployment/employees/${id}/exit/`, payload)
  return res.data as EmployeeRow
}

// ─── Site Deployments ─────────────────────────────────────────────────────────

export interface ListSiteDeploymentsParams {
  org?: number
  site?: number
  employee?: number
  job_role?: number
  status?: string
  billing_type?: string
  page?: number
}

export async function listSiteDeployments(
  params?: ListSiteDeploymentsParams,
): Promise<{ items: SiteDeploymentRow[]; count?: number }> {
  const res = await api.get('/api/deployment/site-deployments/', { params })
  return unwrapDrfResults<SiteDeploymentRow>(res.data)
}

export async function getSiteDeployment(id: number): Promise<SiteDeploymentRow> {
  const res = await api.get(`/api/deployment/site-deployments/${id}/`)
  return res.data as SiteDeploymentRow
}

export async function activateDeployment(id: number, payload: DeploymentNoteInput = {}): Promise<SiteDeploymentRow> {
  const res = await api.post(`/api/deployment/site-deployments/${id}/activate/`, payload)
  return res.data as SiteDeploymentRow
}

export async function cancelDeployment(id: number, payload: DeploymentNoteInput = {}): Promise<SiteDeploymentRow> {
  const res = await api.post(`/api/deployment/site-deployments/${id}/cancel/`, payload)
  return res.data as SiteDeploymentRow
}

export async function completeDeployment(id: number, payload: DeploymentCompleteInput = {}): Promise<SiteDeploymentRow> {
  const res = await api.post(`/api/deployment/site-deployments/${id}/complete/`, payload)
  return res.data as SiteDeploymentRow
}

export async function transferDeployment(id: number, payload: DeploymentTransferInput): Promise<DeploymentTransferResult> {
  const res = await api.post(`/api/deployment/site-deployments/${id}/transfer/`, payload)
  return res.data as DeploymentTransferResult
}

// ─── Deployment History ───────────────────────────────────────────────────────

export interface ListDeploymentHistoryParams {
  org?: number
  employee?: number
  deployment?: number
  action_type?: string
  search?: string
  page?: number
}

export async function listDeploymentHistory(
  params?: ListDeploymentHistoryParams,
): Promise<{ items: DeploymentHistoryRow[]; count?: number }> {
  const res = await api.get('/api/deployment/history/', { params })
  return unwrapDrfResults<DeploymentHistoryRow>(res.data)
}
