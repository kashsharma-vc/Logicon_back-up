import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type {
  MRFLineItemRow,
  MRFLineItemWriteInput,
  MRFReadinessResponse,
  MRFRow,
  MRFWriteInput,
} from '@/features/mrf/types'

export interface ListMRFsParams {
  search?: string
  status?: string
  site?: number
  mrf_type?: string
  billing_type?: string
  requested_by_type?: string
  requesting_department?: number
  required_department?: number
  client_visible?: boolean
  page?: number
}

export async function listMRFs(params: ListMRFsParams): Promise<{ items: MRFRow[]; count?: number }> {
  const res = await api.get('/api/mrf/requests/', {
    params: {
      ...params,
      client_visible: typeof params.client_visible === 'boolean' ? String(params.client_visible) : undefined,
    },
  })
  return unwrapDrfResults<MRFRow>(res.data)
}

export async function getMRF(id: number): Promise<MRFRow> {
  const res = await api.get(`/api/mrf/requests/${id}/`)
  return res.data as MRFRow
}

export async function getMRFReadiness(mrfId: number): Promise<MRFReadinessResponse> {
  const res = await api.get(`/api/mrf/requests/${mrfId}/readiness/`)
  return res.data as MRFReadinessResponse
}

export async function createMRF(payload: MRFWriteInput): Promise<MRFRow> {
  const res = await api.post('/api/mrf/requests/', payload)
  return res.data as MRFRow
}

export async function updateMRF(id: number, payload: Partial<MRFWriteInput>): Promise<MRFRow> {
  const res = await api.patch(`/api/mrf/requests/${id}/`, payload)
  return res.data as MRFRow
}

export async function deleteMRF(id: number): Promise<void> {
  await api.delete(`/api/mrf/requests/${id}/`)
}

export interface ListMRFLineItemsParams {
  mrf?: number
  job_role?: number
  site_role_requirement?: number
  wage_category?: number
  page?: number
}

export async function listMRFLineItems(
  params: ListMRFLineItemsParams,
): Promise<{ items: MRFLineItemRow[]; count?: number }> {
  const res = await api.get('/api/mrf/line-items/', { params })
  return unwrapDrfResults<MRFLineItemRow>(res.data)
}

export async function createMRFLineItem(payload: MRFLineItemWriteInput): Promise<MRFLineItemRow> {
  const res = await api.post('/api/mrf/line-items/', payload)
  return res.data as MRFLineItemRow
}

export async function updateMRFLineItem(
  id: number,
  payload: Partial<MRFLineItemWriteInput>,
): Promise<MRFLineItemRow> {
  const res = await api.patch(`/api/mrf/line-items/${id}/`, payload)
  return res.data as MRFLineItemRow
}

export async function deleteMRFLineItem(id: number): Promise<void> {
  await api.delete(`/api/mrf/line-items/${id}/`)
}

