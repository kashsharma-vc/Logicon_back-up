import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export type LocationAreaType = 'state' | 'region' | 'city' | 'zone'

export interface LocationAreaRow {
  id: number
  name: string
  code: string
  area_type: LocationAreaType
  area_type_display?: string
  parent: number | null
  parent_name?: string | null
  state_name: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface LocationAreaWriteInput {
  name: string
  code: string
  area_type: LocationAreaType
  parent?: number | null
  state_name?: string
  is_active?: boolean
}

export interface WageCategoryRow {
  id: number
  name: string
  code: string
  description: string
}

export interface WageCategoryWriteInput {
  name: string
  code: string
  description?: string
}

export interface MinimumWageRateRow {
  id: number
  org: number | null
  location: number | null
  location_name?: string | null
  state: string
  city: string | null
  wage_category: number
  wage_category_name?: string
  role: number | null
  role_name?: string | null
  role_code?: string | null
  monthly_wage: string
  daily_wage: string | null
  effective_from: string
  effective_to: string | null
  source_note: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface MinimumWageRateWriteInput {
  org?: number | null
  location?: number | null
  state?: string
  city?: string | null
  wage_category: number
  role?: number | null
  monthly_wage: string | number
  daily_wage?: string | number | null
  effective_from: string
  effective_to?: string | null
  source_note?: string
  is_active?: boolean
}

export interface LookupWageRateParams {
  site?: number
  job_role?: number
  wage_category: number
  date: string
  location?: number
}

export async function listLocationAreas(params?: {
  search?: string
  page?: number
  area_type?: LocationAreaType
  parent?: number
  is_active?: boolean
}) {
  const { data } = await api.get<DrfPaginated<LocationAreaRow> | LocationAreaRow[]>('/api/wages/locations/', {
    params: {
      search: params?.search || undefined,
      page: params?.page ?? undefined,
      area_type: params?.area_type ?? undefined,
      parent: params?.parent ?? undefined,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
    },
  })
  return unwrapDrfResults<LocationAreaRow>(data)
}

export async function createLocationArea(payload: LocationAreaWriteInput) {
  const { data } = await api.post<LocationAreaRow>('/api/wages/locations/', payload)
  return data
}

export async function updateLocationArea(id: number, payload: Partial<LocationAreaWriteInput>) {
  const { data } = await api.patch<LocationAreaRow>(`/api/wages/locations/${id}/`, payload)
  return data
}

/** Backend soft-deletes (sets is_active=false). */
export async function deleteLocationArea(id: number) {
  await api.delete(`/api/wages/locations/${id}/`)
}

export async function listWageCategories(searchOrParams?: string | { search?: string; page?: number }) {
  const p = typeof searchOrParams === 'string' ? { search: searchOrParams || undefined } : searchOrParams
  const { data } = await api.get<DrfPaginated<WageCategoryRow> | WageCategoryRow[]>('/api/wages/categories/', {
    params: { search: p?.search || undefined, page: p?.page ?? undefined },
  })
  return unwrapDrfResults<WageCategoryRow>(data).items
}

export async function listWageCategoriesPaginated(params?: { search?: string; page?: number }) {
  const { data } = await api.get<DrfPaginated<WageCategoryRow> | WageCategoryRow[]>('/api/wages/categories/', {
    params: { search: params?.search || undefined, page: params?.page ?? undefined },
  })
  return unwrapDrfResults<WageCategoryRow>(data)
}

export async function createWageCategory(payload: WageCategoryWriteInput) {
  const { data } = await api.post<WageCategoryRow>('/api/wages/categories/', payload)
  return data
}

export async function updateWageCategory(id: number, payload: Partial<WageCategoryWriteInput>) {
  const { data } = await api.patch<WageCategoryRow>(`/api/wages/categories/${id}/`, payload)
  return data
}

export async function deleteWageCategory(id: number) {
  await api.delete(`/api/wages/categories/${id}/`)
}

export async function listMinimumWageRates(params?: {
  search?: string
  page?: number
  org?: number
  location?: number
  wage_category?: number
  role?: number
  is_active?: boolean
}) {
  const { data } = await api.get<DrfPaginated<MinimumWageRateRow> | MinimumWageRateRow[]>('/api/wages/rates/', {
    params: {
      search: params?.search || undefined,
      page: params?.page ?? undefined,
      org: params?.org ?? undefined,
      location: params?.location ?? undefined,
      wage_category: params?.wage_category ?? undefined,
      role: params?.role ?? undefined,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
    },
  })
  return unwrapDrfResults<MinimumWageRateRow>(data)
}

export async function createMinimumWageRate(payload: MinimumWageRateWriteInput) {
  const { data } = await api.post<MinimumWageRateRow>('/api/wages/rates/', payload)
  return data
}

export async function updateMinimumWageRate(id: number, payload: Partial<MinimumWageRateWriteInput>) {
  const { data } = await api.patch<MinimumWageRateRow>(`/api/wages/rates/${id}/`, payload)
  return data
}

/** Backend soft-deletes (sets is_active=false). */
export async function deleteMinimumWageRate(id: number) {
  await api.delete(`/api/wages/rates/${id}/`)
}

export async function lookupWageRate(params: LookupWageRateParams) {
  const { data } = await api.get<MinimumWageRateRow>('/api/wages/rates/lookup/', {
    params: {
      site: params.site ?? undefined,
      job_role: params.job_role ?? undefined,
      wage_category: params.wage_category,
      date: params.date,
      location: params.location ?? undefined,
    },
  })
  return data
}
