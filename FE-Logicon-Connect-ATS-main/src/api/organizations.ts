import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export interface OrganizationRow {
  id: number
  name: string
  code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export async function listOrganizations(params?: { search?: string; page?: number }) {
  const { data } = await api.get<DrfPaginated<OrganizationRow> | OrganizationRow[]>('/api/core/organizations/', {
    params: {
      search: params?.search || undefined,
      page: params?.page ?? undefined,
    },
  })
  return unwrapDrfResults<OrganizationRow>(data)
}
