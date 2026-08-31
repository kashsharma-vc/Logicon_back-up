import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export interface ClientRow {
  id: number
  org: number
  name: string
  code: string
  contact_name: string
  contact_email: string
  contact_phone: string
  industry: string
  billing_address: string
  gst_number: string
  scope_node: number | null
  created_by: number | null
  owner_sales_user: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ListClientsParams {
  search?: string
  is_active?: boolean
  industry?: string
  page?: number
}

export async function listClients(params: ListClientsParams) {
  const { data } = await api.get<DrfPaginated<ClientRow> | ClientRow[]>('/api/sites/clients/', {
    params: {
      search: params.search || undefined,
      is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
      industry: params.industry || undefined,
      page: params.page ?? undefined,
    },
  })
  return unwrapDrfResults<ClientRow>(data)
}

export async function getClient(id: number) {
  const { data } = await api.get<ClientRow>(`/api/sites/clients/${id}/`)
  return data
}

export interface ClientWriteInput {
  org?: number | null
  name: string
  code: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  industry?: string
  billing_address?: string
  gst_number?: string
  owner_sales_user?: number | null
  is_active?: boolean
}

export async function createClient(payload: ClientWriteInput) {
  const { data } = await api.post<ClientRow>('/api/sites/clients/', payload)
  return data
}

export async function updateClient(id: number, payload: ClientWriteInput) {
  const { data } = await api.patch<ClientRow>(`/api/sites/clients/${id}/`, payload)
  return data
}

/** Soft delete: backend sets is_active=false */
export async function deactivateClient(id: number) {
  await api.delete(`/api/sites/clients/${id}/`)
}



