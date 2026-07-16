/** GET /api/deployment/employees/ */
export interface EmployeeRow {
  id: number
  org: number
  candidate?: number | null
  user?: number | null
  employee_code: string
  first_name: string
  middle_name?: string
  last_name: string
  full_name?: string
  phone?: string
  phone_normalized?: string
  email?: string
  job_role?: number | null
  status: 'active' | 'inactive' | 'suspended' | 'exited' | string
  joined_on?: string | null
  exited_on?: string | null
  created_at?: string
  updated_at?: string
}

/** GET /api/deployment/site-deployments/ */
export interface SiteDeploymentRow {
  id: number
  org: number
  employee: number
  employee_full_name?: string | null
  employee_code?: string | null
  site: number
  site_name?: string | null
  job_role: number
  job_role_name?: string | null
  mrf_line_item?: number | null
  hiring_application?: number | null
  status: 'planned' | 'active' | 'completed' | 'transferred' | 'cancelled' | string
  start_date: string
  end_date?: string | null
  shift_hours?: string | number | null
  billing_type: 'billable' | 'non_billable' | string
  created_by?: number | null
  created_at?: string
  updated_at?: string
}

/** GET /api/deployment/history/ */
export interface DeploymentHistoryRow {
  id: number
  org: number
  employee: number
  employee_full_name?: string | null
  employee_code?: string | null
  deployment?: number | null
  action_type: string
  from_status?: string
  to_status?: string
  from_site?: number | null
  from_site_name?: string | null
  to_site?: number | null
  to_site_name?: string | null
  from_job_role?: number | null
  from_job_role_name?: string | null
  to_job_role?: number | null
  to_job_role_name?: string | null
  actor?: number | null
  actor_username?: string | null
  note?: string
  metadata?: unknown
  created_at?: string
}

export interface DeploymentNoteInput {
  note?: string
}

export interface DeploymentCompleteInput {
  note?: string
  end_date?: string | null
}

export interface DeploymentTransferInput {
  site: number
  job_role?: number | null
  start_date?: string | null
  activate_new?: boolean
  note?: string
}

export interface EmployeeNoteInput {
  note?: string
}

export interface EmployeeExitInput {
  note?: string
  exited_on?: string | null
}

export interface DeploymentTransferResult {
  old: SiteDeploymentRow
  new: SiteDeploymentRow
}
