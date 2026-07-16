import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'

export interface AccessRole {
  id: number
  org: number
  name: string
  code: string
  node_type_scope: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AccessRoleWriteInput {
  name: string
  code: string
  node_type_scope: string
  is_active?: boolean
  org?: number | null
}

export interface Permission {
  id: number
  code: string
  resource: string
  action: string
  description: string
}

export interface RolePermission {
  id: number
  role: number
  role_code: string
  role_name: string
  permission: number
  permission_code: string
  permission_resource: string
  permission_action: string
  permission_description: string
}

export interface ListRolesParams {
  search?: string
  page?: number
  is_active?: boolean
}

export async function listRoles(params?: ListRolesParams): Promise<{ items: AccessRole[]; count?: number }> {
  const { data } = await api.get<DrfPaginated<AccessRole> | AccessRole[]>('/api/access/roles/', {
    params: {
      search: params?.search || undefined,
      page: params?.page ?? undefined,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
    },
  })
  return unwrapDrfResults<AccessRole>(data)
}

export async function getRole(id: number): Promise<AccessRole> {
  const { data } = await api.get<AccessRole>(`/api/access/roles/${id}/`)
  return data
}

export async function createRole(payload: AccessRoleWriteInput): Promise<AccessRole> {
  const { data } = await api.post<AccessRole>('/api/access/roles/', payload)
  return data
}

export async function updateRole(id: number, payload: Partial<AccessRoleWriteInput>): Promise<AccessRole> {
  const { data } = await api.patch<AccessRole>(`/api/access/roles/${id}/`, payload)
  return data
}

export async function deactivateRole(id: number): Promise<void> {
  await api.delete(`/api/access/roles/${id}/`)
}

export interface ListPermissionsParams {
  search?: string
  page?: number
}

export async function listPermissions(params?: ListPermissionsParams): Promise<{ items: Permission[]; count?: number }> {
  const { data } = await api.get<DrfPaginated<Permission> | Permission[]>('/api/access/permissions/', {
    params: {
      search: params?.search || undefined,
      page: params?.page ?? undefined,
    },
  })
  return unwrapDrfResults<Permission>(data)
}

export async function listRolePermissions(params: { role: number }): Promise<{ items: RolePermission[]; count?: number }> {
  const { data } = await api.get<DrfPaginated<RolePermission> | RolePermission[]>('/api/access/role-permissions/', {
    params: { role: params.role },
  })
  return unwrapDrfResults<RolePermission>(data)
}

export async function createRolePermission(payload: { role: number; permission: number }): Promise<RolePermission> {
  const { data } = await api.post<RolePermission>('/api/access/role-permissions/', payload)
  return data
}

export async function deleteRolePermission(id: number): Promise<void> {
  await api.delete(`/api/access/role-permissions/${id}/`)
}

export interface ScopeNode {
  id: number
  org: number
  parent: number | null
  name: string
  code: string
  node_type: string
  path: string
  depth: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserRoleAssignmentRow {
  id: number
  user: number
  role: number
  role_code: string
  role_name: string
  role_node_type_scope: string
  scope_node: number
  scope_node_path: string
  created_at: string
}

export interface UserScopeAssignmentRow {
  id: number
  user: number
  scope_node: number
  scope_node_path: string
  assignment_type: 'primary' | 'additional' | 'delegated'
  created_at: string
}

export async function listScopeNodes(search?: string) {
  const { data } = await api.get<DrfPaginated<ScopeNode> | ScopeNode[]>('/api/core/scope-nodes/', {
    params: { search: search || undefined },
  })
  return unwrapDrfResults<ScopeNode>(data).items
}

export async function listUserRoleAssignments(userId: number) {
  const { data } = await api.get<DrfPaginated<UserRoleAssignmentRow> | UserRoleAssignmentRow[]>(
    '/api/access/user-role-assignments/',
    { params: { user: userId } },
  )
  return unwrapDrfResults<UserRoleAssignmentRow>(data).items
}

export async function createUserRoleAssignment(payload: { user: number; role: number; scope_node: number }) {
  const { data } = await api.post<UserRoleAssignmentRow>('/api/access/user-role-assignments/', payload)
  return data
}

export async function deleteUserRoleAssignment(id: number) {
  await api.delete(`/api/access/user-role-assignments/${id}/`)
}

export async function listUserScopeAssignments(userId: number) {
  const { data } = await api.get<DrfPaginated<UserScopeAssignmentRow> | UserScopeAssignmentRow[]>(
    '/api/access/user-scope-assignments/',
    { params: { user: userId } },
  )
  return unwrapDrfResults<UserScopeAssignmentRow>(data).items
}

export async function createUserScopeAssignment(payload: {
  user: number
  scope_node: number
  assignment_type: UserScopeAssignmentRow['assignment_type']
}) {
  const { data } = await api.post<UserScopeAssignmentRow>('/api/access/user-scope-assignments/', payload)
  return data
}

export async function deleteUserScopeAssignment(id: number) {
  await api.delete(`/api/access/user-scope-assignments/${id}/`)
}
