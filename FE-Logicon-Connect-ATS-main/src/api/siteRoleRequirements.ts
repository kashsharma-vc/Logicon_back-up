import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export type BillingType = 'billable' | 'non_billable'

export interface SiteRoleRequirementRow {
  id: number
  site: number
  department: number | null
  department_name: string | null
  department_code: string | null
  site_name: string | null
  job_role: number
  job_role_name: string | null
  job_role_code: string | null
  approved_headcount: number
  allocated_headcount?: number | null
  remaining_headcount?: number | null
  billing_type: BillingType
  billing_rate: string | null
  wage_min: string | null
  wage_max: string | null
  shift_hours: string | null
  wage_category: number | null
  wage_category_name: string | null
  wage_category_code: string | null
  location_area_name: string | null
  effective_from: string
  effective_to: string | null
  is_active: boolean
  wage_rate: number | null
  wage_rate_monthly_snapshot: string | null
  wage_rate_daily_snapshot: string | null
  wage_rate_effective_from_snapshot: string | null
  wage_rate_source_snapshot: string
  created_at: string
  updated_at: string
}

export interface ListSiteRoleRequirementsParams {
  search?: string
  site?: number
  department?: number
  job_role?: number
  is_active?: boolean
  billing_type?: BillingType
  page?: number
}

export async function listSiteRoleRequirements(params: ListSiteRoleRequirementsParams) {
  const { data } = await api.get<DrfPaginated<SiteRoleRequirementRow> | SiteRoleRequirementRow[]>(
    '/api/sites/role-requirements/',
    {
      params: {
        search: params.search || undefined,
        site: params.site ?? undefined,
        department: params.department ?? undefined,
        job_role: params.job_role ?? undefined,
        is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
        billing_type: params.billing_type || undefined,
        page: params.page ?? undefined,
      },
    },
  )
  return unwrapDrfResults<SiteRoleRequirementRow>(data)
}

export async function getSiteRoleRequirement(id: number) {
  const { data } = await api.get<SiteRoleRequirementRow>(`/api/sites/role-requirements/${id}/`)
  return data
}

export interface SiteRoleRequirementWriteInput {
  site: number
  job_role: number
  approved_headcount: number
  billing_type?: BillingType
  billing_rate?: number | null
  wage_min?: number | null
  wage_max?: number | null
  shift_hours?: number | null
  wage_category?: number | null
  effective_from: string
  effective_to?: string | null
  is_active?: boolean
}

export async function createSiteRoleRequirement(payload: SiteRoleRequirementWriteInput) {
  const { data } = await api.post<SiteRoleRequirementRow>('/api/sites/role-requirements/', payload)
  return data
}

export async function updateSiteRoleRequirement(id: number, payload: Partial<SiteRoleRequirementWriteInput>) {
  const { data } = await api.patch<SiteRoleRequirementRow>(`/api/sites/role-requirements/${id}/`, payload)
  return data
}

/** Soft delete: backend sets is_active=false */
export async function deactivateSiteRoleRequirement(id: number) {
  await api.delete(`/api/sites/role-requirements/${id}/`)
}


