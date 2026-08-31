import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export interface UserRow {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  phone_number: string
  employee_code: string
  user_type: 'internal' | 'client' | 'field'
  org: number | null
  /** Present when API includes department (e.g. accounts serializers). */
  department?: number | null
  department_name?: string | null
  department_code?: string | null
  is_active: boolean
  is_invited: boolean
  last_invited_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface ListUsersParams {
  search?: string
  user_type?: UserRow['user_type']
  is_active?: boolean
  page?: number
}

export async function listUsers(params: ListUsersParams) {
  const { data } = await api.get<DrfPaginated<UserRow> | UserRow[]>('/api/accounts/users/', {
    params: {
      search: params.search || undefined,
      user_type: params.user_type || undefined,
      is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
      page: params.page ?? undefined,
    },
  })
  return unwrapDrfResults<UserRow>(data)
}

export async function getUser(id: number) {
  const { data } = await api.get<UserRow>(`/api/accounts/users/${id}/`)
  return data
}

export interface CreateUserInput {
  username: string
  email?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  employee_code?: string
  user_type: UserRow['user_type']
  is_active?: boolean
  is_invited?: boolean
  org?: number | null
  department?: number | null
  password?: string
}

export async function createUser(payload: CreateUserInput) {
  const { data } = await api.post<UserRow>('/api/accounts/users/', payload)
  return data
}

export type UpdateUserInput = Omit<CreateUserInput, 'username' | 'password'> & { password?: never }

export async function updateUser(id: number, input: UpdateUserInput) {
  const { data } = await api.patch<UserRow>(`/api/accounts/users/${id}/`, input)
  return data
}

export async function sendPasswordResetLink(id: number): Promise<{ detail: string }> {
  const { data } = await api.post<{ detail: string }>(`/api/accounts/users/${id}/send_reset_link/`)
  return data
}

/** Soft delete: backend sets is_active=false */
export async function deactivateUser(id: number) {
  await api.delete(`/api/accounts/users/${id}/`)
}




