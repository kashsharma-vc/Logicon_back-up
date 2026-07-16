import type { WorkflowStatus } from '@/features/workflow/types'

export type ClientOnboardingStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | string

export type ClientOnboardingType = 'new_client' | 'new_site_expansion' | string

export type ProposedDepartmentScopeLevel = 'client' | 'site' | string

export type FinalizationStatus = 'not_finalized' | 'finalized' | 'failed' | string

export function finalizationStatusLabel(status: FinalizationStatus | null | undefined): string {
  if (status == null || status === '') return 'Not finalized'
  if (status === 'not_finalized') return 'Not finalized'
  if (status === 'finalized') return 'Finalized'
  if (status === 'failed') return 'Finalization failed'
  return status.replace(/_/g, ' ')
}

/** Nested read shape from GET client-requests/:id/ */
export interface ProposedSiteRow {
  id: number
  request: number
  name: string
  code: string
  address: string
  city: string
  state: string
  pincode: string
  contact_person: string
  contact_phone: string
  contact_email: string
  location_area: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProposedSiteWriteInput {
  name: string
  code: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  contact_person?: string
  contact_phone?: string
  contact_email?: string
  location_area?: number | null
  is_active?: boolean
}

export interface ProposedDepartmentRow {
  id: number
  request: number
  proposed_site: number | null
  scope_level: ProposedDepartmentScopeLevel
  name: string
  code: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProposedDepartmentWriteInput {
  proposed_site?: number | null
  scope_level: ProposedDepartmentScopeLevel
  name: string
  code: string
  description?: string
  is_active?: boolean
}

export interface ProposedRoleRequirementRow {
  id: number
  request: number
  proposed_site: number
  proposed_department: number | null
  job_role: number
  approved_headcount: number
  billing_rate: string | null
  wage_min: string | null
  wage_max: string | null
  shift_hours: string | null
  billing_type: string
  wage_category: number | null
  effective_from: string | null
  effective_to: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProposedRoleRequirementWriteInput {
  proposed_site: number
  proposed_department?: number | null
  job_role: number
  approved_headcount: number
  billing_rate?: string | number | null
  wage_min?: string | number | null
  wage_max?: string | number | null
  shift_hours?: string | number | null
  billing_type?: string
  wage_category?: number | null
  effective_from?: string | null
  effective_to?: string | null
  is_active?: boolean
}

export type ProposedBudgetScopeLevel = 'client' | 'site' | 'department' | string

/** Nested read shape from GET client-requests/:id/ and proposed-budgets list. */
export interface ClientOnboardingProposedBudgetRow {
  id: number
  request: number
  name: string
  code: string
  budget_nature: string
  budget_type: string
  scope_level: ProposedBudgetScopeLevel
  proposed_site: number | null
  proposed_site_name: string | null
  proposed_site_code: string | null
  proposed_department: number | null
  proposed_department_name: string | null
  proposed_department_code: string | null
  amount: string
  currency: string
  period_start: string
  period_end: string | null
  notes: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ClientOnboardingProposedUser {
  id: number
  request: number
  full_name: string
  email: string
  phone: string
  user_type: 'client' | 'site_manager' | string
  access_role: number
  access_role_code: string | null
  access_role_name: string | null
  scope_level: 'client' | 'site' | string
  proposed_site: number | null
  proposed_site_name: string | null
  is_primary_contact: boolean
  send_invite_on_finalization: boolean
  is_active: boolean
  created_user: number | null
  invite_status: 'pending' | 'not_required' | 'sent' | 'failed' | string
  invite_error: string
  created_at: string
  updated_at: string
}

export interface ClientOnboardingProposedUserWriteInput {
  full_name: string
  email: string
  phone?: string
  user_type: 'client' | 'site_manager' | string
  access_role: number
  scope_level: 'client' | 'site' | string
  proposed_site?: number | null
  is_primary_contact?: boolean
  send_invite_on_finalization?: boolean
  is_active?: boolean
}

export function proposedUserTypeLabel(type: string | null | undefined): string {
  if (type === 'client') return 'Client user'
  if (type === 'site_manager') return 'Site manager'
  if (!type?.trim()) return '—'
  return type.replace(/_/g, ' ')
}

export function proposedUserScopeLabel(scope: string | null | undefined): string {
  if (scope === 'client') return 'Client'
  if (scope === 'site') return 'Site'
  if (!scope?.trim()) return '—'
  return scope.replace(/_/g, ' ')
}

export function proposedUserInviteStatusLabel(status: string | null | undefined): string {
  if (status == null || status === '') return '—'
  if (status === 'pending') return 'Pending'
  if (status === 'not_required') return 'Not required'
  if (status === 'sent') return 'Sent'
  if (status === 'failed') return 'Failed'
  return status.replace(/_/g, ' ')
}

export interface ClientOnboardingProposedBudgetWriteInput {
  name: string
  code: string
  budget_nature: string
  budget_type: string
  scope_level: ProposedBudgetScopeLevel
  proposed_site?: number | null
  proposed_department?: number | null
  amount: string
  currency: string
  period_start: string
  period_end?: string | null
  notes?: string
  is_active?: boolean
}

/** Writable fields for create / partial update (matches backend write serializer). */
export interface ClientOnboardingWriteInput {
  client?: number | null
  onboarding_type: ClientOnboardingType
  expected_site_count?: number | null
  summary?: string
  operations_notes?: string
  hr_notes?: string
  finance_notes?: string
  budget_plan?: number | null
  proposed_client_name?: string
  proposed_client_code?: string
  proposed_contact_name?: string
  proposed_contact_email?: string
  proposed_contact_phone?: string
  proposed_industry?: string
  proposed_billing_address?: string
  proposed_gst_number?: string
}

export interface ClientOnboardingRow {
  id: number
  org: number
  client: number | null
  client_name: string | null
  requested_by: number
  requested_by_username: string
  status: ClientOnboardingStatus
  onboarding_type: ClientOnboardingType
  expected_site_count: number | null
  summary: string
  operations_notes: string
  hr_notes: string
  finance_notes: string
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  created_at: string
  updated_at: string
  /** new_client */
  proposed_client_name?: string
  proposed_client_code?: string
  proposed_contact_name?: string
  proposed_contact_email?: string
  proposed_contact_phone?: string
  proposed_industry?: string
  proposed_billing_address?: string
  proposed_gst_number?: string
  created_client?: number | null
  finalization_status?: FinalizationStatus | null
  finalized_at?: string | null
  finalized_by?: number | null
  finalization_error?: string
  proposed_sites?: ProposedSiteRow[]
  proposed_departments?: ProposedDepartmentRow[]
  proposed_role_requirements?: ProposedRoleRequirementRow[]
  proposed_budgets?: ClientOnboardingProposedBudgetRow[]
  proposed_users?: ClientOnboardingProposedUser[]
  /** Present when backend exposes workflow summary on the request (optional). */
  workflow_status?: WorkflowStatus
  workflow_instance_id?: number | null
  workflow_current_step_id?: number | null
  workflow_current_step_code?: string | null
  workflow_current_step_name?: string | null
  workflow_current_assigned_user?: number | null
  workflow_current_assigned_user_name?: string | null
  workflow_current_department_name?: string | null
  budget_plan?: number | null
  budget_plan_name?: string | null
  budget_plan_code?: string | null
  budget_plan_amount?: string | null
  budget_plan_currency?: string | null
  budget_plan_status?: string | null
  readiness_ok?: boolean
  readiness_errors?: string[]
  readiness_warnings?: string[]
}
