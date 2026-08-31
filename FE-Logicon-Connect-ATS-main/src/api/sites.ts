import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export interface SiteProfileRow {
  id: number
  org: number
  client: number
  scope_node: number | null
  name: string
  code: string
  address: string
  location_area: number | null
  location_area_name?: string | null
  location_area_type?: string | null
  city: string
  state: string
  pincode: string
  latitude: string | null
  longitude: string | null
  geofence_radius_meters: number
  shift_type: string
  contact_person: string
  contact_phone: string
  contact_email: string
  created_by: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ListSitesParams {
  search?: string
  client?: number
  is_active?: boolean
  city?: string
  state?: string
  page?: number
}

export async function listSites(params: ListSitesParams) {
  const { data } = await api.get<DrfPaginated<SiteProfileRow> | SiteProfileRow[]>('/api/sites/profiles/', {
    params: {
      search: params.search || undefined,
      client: params.client ?? undefined,
      is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
      city: params.city || undefined,
      state: params.state || undefined,
      page: params.page ?? undefined,
    },
  })
  return unwrapDrfResults<SiteProfileRow>(data)
}

export async function getSite(id: number) {
  const { data } = await api.get<SiteProfileRow>(`/api/sites/profiles/${id}/`)
  return data
}

export interface SiteWriteInput {
  client: number
  name: string
  code: string
  location_area?: number | null
  address?: string
  city?: string
  state?: string
  pincode?: string
  latitude?: string | null
  longitude?: string | null
  geofence_radius_meters?: number
  shift_type?: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  is_active?: boolean
}

export async function createSite(payload: SiteWriteInput) {
  const { data } = await api.post<SiteProfileRow>('/api/sites/profiles/', payload)
  return data
}

export async function updateSite(id: number, payload: Partial<SiteWriteInput>) {
  const { data } = await api.patch<SiteProfileRow>(`/api/sites/profiles/${id}/`, payload)
  return data
}

/** Soft delete: backend sets is_active=false */
export async function deactivateSite(id: number) {
  await api.delete(`/api/sites/profiles/${id}/`)
}



