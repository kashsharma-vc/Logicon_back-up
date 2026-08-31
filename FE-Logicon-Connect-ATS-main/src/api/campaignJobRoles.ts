import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type { CampaignJobRoleRow, CampaignJobRoleWriteInput } from '@/features/campaigns/types'

export interface ListCampaignJobRolesParams {
  campaign?: number
  page?: number
}

export async function listCampaignJobRoles(
  params: ListCampaignJobRolesParams,
): Promise<{ items: CampaignJobRoleRow[]; count?: number }> {
  const res = await api.get('/api/intake/campaign-job-roles/', { params })
  return unwrapDrfResults<CampaignJobRoleRow>(res.data)
}

export async function createCampaignJobRole(payload: CampaignJobRoleWriteInput): Promise<CampaignJobRoleRow> {
  const res = await api.post('/api/intake/campaign-job-roles/', payload)
  return res.data as CampaignJobRoleRow
}

export async function updateCampaignJobRole(
  id: number,
  payload: Partial<CampaignJobRoleWriteInput>,
): Promise<CampaignJobRoleRow> {
  const res = await api.patch(`/api/intake/campaign-job-roles/${id}/`, payload)
  return res.data as CampaignJobRoleRow
}

export async function deleteCampaignJobRole(id: number): Promise<void> {
  await api.delete(`/api/intake/campaign-job-roles/${id}/`)
}


