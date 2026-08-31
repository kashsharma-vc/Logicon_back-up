import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export interface DepartmentRow {
  id: number
  org: number
  client: number | null
  site: number | null
  name: string
  code: string
  description?: string
  is_active: boolean
  client_name?: string | null
  site_name?: string | null
  created_at?: string
  updated_at?: string
}

export interface DepartmentWriteInput {
  org?: number | null
  client?: number | null
  site?: number | null
  name: string
  code: string
  description?: string
  is_active?: boolean
}

export type DepartmentUpdateInput = Partial<DepartmentWriteInput>

export interface DepartmentOption {
  id: number
  label: string
  scopeLabel?: string
  client?: number | null
  site?: number | null
}

export function departmentToFormOption(d: DepartmentRow): DepartmentOption {
  const scope =
    d.site != null
      ? d.site_name
        ? `${d.site_name} - Site`
        : `Site #${d.site}`
      : d.client != null
        ? d.client_name
          ? `${d.client_name} - Client`
          : `Client #${d.client}`
        : 'Org'
  return {
    id: d.id,
    label: `${d.name} (${d.code})`,
    scopeLabel: scope,
    client: d.client,
    site: d.site,
  }
}

export async function listDepartments(params?: {
  search?: string
  org?: number
  client?: number
  site?: number
  is_active?: boolean
  page?: number
}): Promise<{ items: DepartmentRow[]; count?: number }> {
  const { data } = await api.get<DrfPaginated<DepartmentRow> | DepartmentRow[]>('/api/core/departments/', {
    params: {
      search: params?.search || undefined,
      org: params?.org ?? undefined,
      client: params?.client ?? undefined,
      site: params?.site ?? undefined,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
      page: params?.page ?? undefined,
    },
  })
  return unwrapDrfResults<DepartmentRow>(data)
}

export async function getDepartment(id: number): Promise<DepartmentRow> {
  const { data } = await api.get<DepartmentRow>(`/api/core/departments/${id}/`)
  return data
}

export async function createDepartment(payload: DepartmentWriteInput): Promise<DepartmentRow> {
  const { data } = await api.post<DepartmentRow>('/api/core/departments/', payload)
  return data
}

export async function updateDepartment(id: number, payload: DepartmentUpdateInput): Promise<DepartmentRow> {
  const { data } = await api.patch<DepartmentRow>(`/api/core/departments/${id}/`, payload)
  return data
}

/** Soft delete: backend sets is_active=false */
export async function deleteDepartment(id: number): Promise<void> {
  await api.delete(`/api/core/departments/${id}/`)
}
