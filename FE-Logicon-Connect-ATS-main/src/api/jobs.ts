import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export type SkillCategory = 'unskilled' | 'semi_skilled' | 'skilled' | 'highly_skilled' | 'supervisor'

export interface JobRoleRow {
  id: number
  org: number
  name: string
  code: string
  description: string
  skill_category: SkillCategory
  skill_category_display?: string
  is_internal: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ListJobRolesParams {
  search?: string
  org?: number
  skill_category?: SkillCategory
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface JobRoleWriteInput {
  name: string
  code: string
  description?: string
  skill_category: SkillCategory
  is_internal?: boolean
  is_active?: boolean
  org?: number | null
}

/** @deprecated Prefer overload with explicit params object for pagination. */
export function listJobRoles(): Promise<JobRoleRow[]>
export function listJobRoles(search: string): Promise<JobRoleRow[]>
export function listJobRoles(params: ListJobRolesParams): Promise<{ items: JobRoleRow[]; count?: number }>
export async function listJobRoles(
  params?: string | ListJobRolesParams,
): Promise<JobRoleRow[] | { items: JobRoleRow[]; count?: number }> {
  const normalized: ListJobRolesParams =
    params === undefined ? {} : typeof params === 'string' ? { search: params || undefined } : { ...params }

  const { data } = await api.get<DrfPaginated<JobRoleRow> | JobRoleRow[]>('/api/jobs/roles/', {
    params: {
      search: normalized.search || undefined,
      org: normalized.org ?? undefined,
      skill_category: normalized.skill_category || undefined,
      is_active: typeof normalized.is_active === 'boolean' ? String(normalized.is_active) : undefined,
      page: normalized.page ?? undefined,
      page_size: normalized.page_size ?? undefined,
    },
  })
  const out = unwrapDrfResults<JobRoleRow>(data)
  if (params === undefined || typeof params === 'string') {
    return out.items
  }
  return out
}

export async function fetchAllJobRoles(params?: ListJobRolesParams): Promise<JobRoleRow[]> {
  const allItems: JobRoleRow[] = []
  let currentPage = 1
  let hasMore = true
  const maxPages = 50 // Safety cap

  while (hasMore && currentPage <= maxPages) {
    const res = await listJobRoles({
      ...params,
      page: currentPage,
      page_size: 1000,
    })
    if (!res.items || res.items.length === 0) {
      hasMore = false
      break
    }
    allItems.push(...res.items)
    if (res.count != null && allItems.length >= res.count) {
      hasMore = false
    } else {
      currentPage++
    }
  }
  return allItems
}

export async function createJobRole(payload: JobRoleWriteInput) {
  const { data } = await api.post<JobRoleRow>('/api/jobs/roles/', payload)
  return data
}

export async function updateJobRole(id: number, payload: Partial<JobRoleWriteInput>) {
  const { data } = await api.patch<JobRoleRow>(`/api/jobs/roles/${id}/`, payload)
  return data
}

/** Soft delete: backend sets is_active=false */
export async function deleteJobRole(id: number) {
  await api.delete(`/api/jobs/roles/${id}/`)
}
