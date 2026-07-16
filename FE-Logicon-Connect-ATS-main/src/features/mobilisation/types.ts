import type { WorkflowStatus } from '@/features/workflow/types'

export type MobilisationStatus =
  | 'draft'
  | 'operations_setup'
  | 'setup_completed'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | string

export type MobilisationFinalizationStatus = 'not_finalized' | 'finalized' | 'failed' | string

export function mobilisationFinalizationLabel(s: MobilisationFinalizationStatus | null | undefined): string {
  if (!s || s === 'not_finalized') return 'Not finalized'
  if (s === 'finalized') return 'Finalized'
  if (s === 'failed') return 'Finalization failed'
  return s.replace(/_/g, ' ')
}

export function mobilisationStatusLabel(s: MobilisationStatus | null | undefined): string {
  if (!s) return '—'
  const map: Record<string, string> = {
    draft: 'Draft',
    operations_setup: 'Operations setup',
    setup_completed: 'Setup completed',
    submitted: 'Submitted',
    in_review: 'In review',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }
  return map[s] ?? s.replace(/_/g, ' ')
}

export interface MobilisationSetupRequest {
  id: number
  org: number
  status: MobilisationStatus
  requested_by: number
  requested_by_username: string
  assigned_operations_owner: number | null
  assigned_operations_owner_username: string | null
  submitted_to_operations_at: string | null
  setup_completed_at: string | null
  setup_completed_by: number | null
  setup_completed_by_username: string | null
  source_sales_lead: number | null
  source_sales_lead_name: string | null
  source_proposal_version: number | null
  source_proposal_version_number: number | null
  source_proposal_grand_total?: string | null
  source_proposal_manpower_total?: number | null
  mobilisation_requires_approval: boolean
  finalization_status: MobilisationFinalizationStatus
  finalized_at: string | null
  finalization_error: string
  summary: string
  operations_notes: string
  workflow_status?: WorkflowStatus
  workflow_instance_id?: number | null
  workflow_current_step_id?: number | null
  workflow_current_step_code?: string | null
  workflow_current_step_name?: string | null
  workflow_current_assigned_user?: number | null
  workflow_current_assigned_user_name?: string | null
  workflow_current_department_name?: string | null
  readiness_ok?: boolean
  readiness_errors?: string[]
  readiness_warnings?: string[]
  created_at: string
  updated_at: string
}

export interface AssignOperationsOwnerPayload {
  operations_owner: number
}

export interface ConvertToMobilisationPayload {
  operations_owner?: number | null
}

export interface MobilisationDepartmentSuggestion {
  key: string
  scope_level: 'client' | 'site'
  real_site: number | null
  real_site_name: string | null
  name: string
  code: string
  description: string
  exists: boolean
  can_apply: boolean
  reason: string
}

export interface MobilisationUserSuggestion {
  key: string
  full_name: string
  email: string
  phone: string
  user_type: 'client'
  access_role: number | null
  access_role_code: string | null
  access_role_name: string | null
  scope_level: 'client' | 'site'
  real_site: number | null
  real_site_name: string | null
  is_primary_contact: boolean
  send_invite_on_finalization: boolean
  exists: boolean
  can_apply: boolean
  reason: string
}

export interface MobilisationSetupSuggestions {
  departments: MobilisationDepartmentSuggestion[]
  users: MobilisationUserSuggestion[]
}

export interface ApplyMobilisationSetupSuggestionsResult {
  created: {
    departments: number[]
    users: number[]
  }
  skipped: {
    departments: { key: string; reason: string }[]
    users: { key: string; reason: string }[]
  }
  suggestions: MobilisationSetupSuggestions
}

export interface MobilisationDepartment {
  id: number
  request: number
  real_site: number | null
  real_site_name: string | null
  name: string
  code: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MobilisationDepartmentWriteInput {
  real_site?: number | null
  name: string
  code: string
  description?: string
  is_active?: boolean
}

export interface MobilisationUser {
  id: number
  request: number
  full_name: string
  email: string
  phone: string
  user_type: string
  access_role: number
  access_role_code: string | null
  access_role_name: string | null
  scope_level: string
  real_site: number | null
  real_site_name: string | null
  is_primary_contact: boolean
  send_invite_on_finalization: boolean
  is_active: boolean
  created_user: number | null
  invite_status: string
  invite_error: string
  created_at: string
  updated_at: string
}

export interface MobilisationUserWriteInput {
  full_name: string
  email: string
  phone?: string
  user_type?: string
  access_role: number
  scope_level?: string
  real_site?: number | null
  is_primary_contact?: boolean
  send_invite_on_finalization?: boolean
  is_active?: boolean
}

// ─── Sales Context Types ────────────────────────────────────────────────────

export interface MobilisationSalesContextRole {
  id: number
  job_role_name: string | null
  wage_category_name: string | null
  service_category: string
  manpower_count: number
  shift_hours: string | null
  working_days: string | null
}

export interface MobilisationSalesContextSite {
  id: number
  site_name: string
  site_address: string
  city: string
  state: string
  location_area_name: string | null
  headcount: number
  roles: MobilisationSalesContextRole[]
}

export interface MobilisationSalesContextBudgetLine {
  id: number
  site_name: string | null
  job_role_name: string | null
  description: string
  manpower_count: number
  unit_cost: string
  total_cost: string
}

export interface MobilisationSalesContextProposalVersion {
  id: number
  version_number: number
  status: string
  grand_total: string
  client_approval_status: string
  client_remarks: string
}

export interface MobilisationSalesContextReadiness {
  expected_departments: number
  created_departments: number
  expected_users: number
  created_users: number
  missing_departments: number
  missing_users: number
  ready_to_finalize: boolean
}

export interface MobilisationSalesContextMobilisation {
  id: number
  status: string
  mobilisation_type: string
  client_name: string | null
  created_at: string | null
  finalization_status: string
  mobilisation_requires_approval: boolean
}

export interface MobilisationSalesContextLead {
  id: number
  client_name: string
  lead_type: string
  current_stage: string
  sales_person_name: string | null
  client_contact_person: string
  client_email: string
  client_phone: string
}

export interface MobilisationSalesContextProposal {
  id: number
  version_number: number
  status: string
  subtotal_amount: string
  management_fee_amount: string
  gst_amount: string
  grand_total: string
  manpower_total: number
  client_approval_status: string
  client_remarks: string
  client_approved_at: string | null
}

export interface MobilisationSalesContext {
  mobilisation: MobilisationSalesContextMobilisation
  lead: MobilisationSalesContextLead | null
  proposal: MobilisationSalesContextProposal | null
  sites: MobilisationSalesContextSite[]
  budget_lines: MobilisationSalesContextBudgetLine[]
  proposal_versions: MobilisationSalesContextProposalVersion[]
  readiness: MobilisationSalesContextReadiness
}

// ─── Legacy mobilisation setup API types (compatibility) ────────────────────

export type MobilisationSetupStrategy = 'simple' | 'role_grouped' | 'custom'

export interface MobilisationSetupBuilderRole {
  id: number
  site: number
  site_name: string | null
  job_role: number | null
  job_role_name: string | null
  job_role_code: string | null
  wage_category: number | null
  wage_category_name: string | null
  service_category: string
  approved_headcount: number
  shift_hours: string | null
  billing_type: string
  assigned_department: number | null
}

export interface MobilisationSetupBuilderDepartment {
  id: number
  scope_level: 'client' | 'site'
  real_site: number | null
  real_site_name: string | null
  name: string
  code: string
  description: string
  is_locked: boolean
  source_key: string
  sort_order: number
  role_requirement_ids: number[]
  roles: MobilisationSetupBuilderRole[]
}

export interface MobilisationSetupBuilderUser {
  id: number
  full_name: string
  email: string
  phone: string
  user_type: string
  access_role: number
  access_role_code: string | null
  access_role_name: string | null
  scope_level: 'client' | 'site'
  real_site: number | null
  real_site_name: string | null
  is_primary_contact: boolean
  send_invite_on_finalization: boolean
  is_active: boolean
}

export interface MobilisationSetupBuilderValidation {
  ok: boolean
  errors: string[]
  warnings: string[]
}

export interface MobilisationSetupBuilder {
  request: number
  setup_strategy: MobilisationSetupStrategy
  departments: MobilisationSetupBuilderDepartment[]
  users: MobilisationSetupBuilderUser[]
  available_roles: MobilisationSetupBuilderRole[]
  unassigned_roles: MobilisationSetupBuilderRole[]
  validation: MobilisationSetupBuilderValidation
}

export interface SaveMobilisationSetupBuilderPayload {
  setup_strategy: MobilisationSetupStrategy
  departments: Array<{
    id?: number
    scope_level: 'client' | 'site'
    real_site: number | null
    name: string
    code: string
    description?: string
    is_active?: boolean
    source_key?: string
    sort_order?: number
    role_requirement_ids: number[]
  }>
  users: Array<{
    id?: number
    full_name: string
    email: string
    phone?: string
    user_type?: string
    access_role: number
    scope_level: 'client' | 'site'
    real_site: number | null
    is_primary_contact?: boolean
    send_invite_on_finalization?: boolean
    is_active?: boolean
  }>
}
