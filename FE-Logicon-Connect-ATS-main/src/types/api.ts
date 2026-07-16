export interface TokenPair {
  access: string
  refresh: string
}

export type PortalMode = 'internal' | 'client'

export type NavPersona =
  | 'admin'
  | 'sales'
  | 'operations'
  | 'finance'
  | 'hr'
  | 'client'
  | 'mixed'

export interface DrfPaginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export function unwrapDrfResults<T>(data: DrfPaginated<T> | T[]): { items: T[]; count?: number } {
  if (Array.isArray(data)) {
    return { items: data }
  }
  return { items: data.results, count: data.count }
}

export interface UserScopeAssignment {
  id: number
  user: number
  scope_node: number
  scope_node_path: string
  assignment_type: string
  created_at: string
}

export interface UserRoleAssignment {
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

/** Matches GET /api/core/me/ today; optional fields if backend extends. */
export interface MeResponse {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  scope_assignments: UserScopeAssignment[]
  role_assignments: UserRoleAssignment[]
  capabilities: string[]
  user_type: string
  org: number | null
  is_superuser: boolean
  /** Backend-driven: true if user should see client portal */
  is_client_facing: boolean
  /** Backend-driven: 'internal' or 'client' portal mode */
  portal_mode: PortalMode
  /** Backend-driven: primary role codes for display/debug */
  primary_role_codes: string[]
  /** Backend-driven: persona for nav grouping */
  nav_persona: NavPersona
}




