export type MRFType = 'new_hiring' | 'replacement' | 'headcount_increase' | 'rate_revision'

export type MRFStatus =
  | 'draft'
  | 'submitted'
  | 'hr_review'
  | 'finance_review'
  | 'admin_review'
  | 'client_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type BillingType = 'billable' | 'non_billable'

export type MRFBudgetReservationStatus = 'reserved' | 'committed' | 'released' | 'cancelled'

export type RequestedByType = 'internal' | 'client'

export interface MRFLineItemRow {
  id: number
  mrf: number
  site_role_requirement: number | null
  job_role: number
  headcount: number
  replacement_for_employee: string
  required_skills: string[]
  wage_category: number | null
  min_wage_snapshot: string | null
  wage_min_requested: string | null
  wage_max_requested: string | null
  billing_rate_snapshot: string | null
  budget_min: string | null
  budget_max: string | null
  budget_plan?: number | null
  budget_plan_name?: string | null
  budget_plan_code?: string | null
  budget_plan_amount?: string | null
  budget_plan_currency?: string | null
  budget_plan_status?: string | null
  budget_plan_nature?: string | null
  site_role_requirement_label?: string | null
  srr_department_name?: string | null
  srr_approved_headcount?: number | null
  srr_remaining_headcount?: number | null
  srr_wage_min?: string | null
  srr_wage_max?: string | null
  srr_billing_rate?: string | null
  srr_shift_hours?: string | null
  master_wage_min_snapshot?: string | null
  master_wage_max_snapshot?: string | null
  master_billing_rate_snapshot?: string | null
  master_shift_hours_snapshot?: string | null
  commercial_override_enabled?: boolean
  commercial_override_reason?: string | null
  commercial_overridden_by?: number | null
  commercial_overridden_at?: string | null
  effective_wage_min?: string | null
  effective_wage_max?: string | null
  approved_billing_rate?: string | null
  requested_billing_rate?: string | null
  billing_rate_variance?: string | null
  is_over_approved_billing_rate?: boolean
  line_approved_amount?: string | null
  line_requested_amount?: string | null
  internal_requested_monthly_gross?: string | null
  internal_previous_employee_budget?: string | null
  internal_budget_variance?: string | null
  internal_budget_variance_reason?: string | null
}

export type MRFWorkflowStatus = 'not_started' | 'active' | 'approved' | 'rejected' | 'cancelled' | string

export interface MRFSupportRequirement {
  laptop_required: boolean
  desktop_required: boolean
  mail_id_required: boolean
  hrms_login_required: boolean
  outlook_required: boolean
  ms_office_required: boolean
  windows_required: boolean
  own_or_rental: string

  sim_card_required: boolean
  data_card_required: boolean
  uniform_required: boolean
  visiting_cards_required: boolean
  seating_required: boolean
  admin_location: string
  admin_other: string
}

export interface MRFRow {
  id: number
  org: number
  site: number
  requested_by: number
  requested_by_name: string | null
  requested_by_type: RequestedByType
  mrf_type: MRFType | string
  status: MRFStatus | string
  department: string
  billing_type: BillingType | string
  required_by_date: string | null
  reason: string
  client_visible: boolean
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  line_items: MRFLineItemRow[]
  created_at: string
  updated_at: string
  requesting_department?: number | null
  requesting_department_name?: string | null
  requesting_department_code?: string | null
  required_department?: number | null
  required_department_name?: string | null
  required_department_code?: string | null
  request_number?: string
  experience_min_years?: string | number | null
  experience_max_years?: string | number | null
  reporting_to?: string
  mis_requirement?: string
  education_requirement?: string
  gender_preference?: string
  special_requirement?: string
  salary_range_text?: string
  ctc_budget_text?: string
  reference_note?: string
  other_remarks?: string
  is_budget_deviation?: boolean
  has_special_client_req?: boolean
  preferred_flow_type?: 'standard' | 'fast_track' | string | null
  support_requirement?: MRFSupportRequirement | null
  /** Approval workflow (from backend serializer). */
  workflow_status?: MRFWorkflowStatus
  workflow_instance_id?: number | null
  workflow_current_step_id?: number | null
  workflow_current_step_code?: string | null
  workflow_current_step_name?: string | null
  workflow_current_assigned_user?: number | null
  workflow_current_assigned_user_name?: string | null
  workflow_current_department_name?: string | null
  workflow_resolved_by_name?: string | null
  budget_plan?: number | null
  budget_plan_name?: string | null
  budget_plan_code?: string | null
  budget_plan_amount?: string | null
  budget_plan_currency?: string | null
  budget_plan_status?: string | null
  budget_plan_nature?: string | null
  budget_reserved_amount?: string | null
  budget_committed_amount?: string | null
  budget_reservation_status?: MRFBudgetReservationStatus | string | null
  resolved_budget_plan_id?: number | null
  resolved_budget_plan_name?: string | null
  resolved_budget_plan_code?: string | null
  resolved_budget_scope?: string | null
  resolved_budget_total_amount?: string | null
  resolved_budget_reserved_amount?: string | null
  resolved_budget_committed_amount?: string | null
  resolved_budget_available_amount?: string | null
  requested_budget_amount?: string | null
  budget_after_request_available_amount?: string | null
}

export interface MRFWriteInput {
  site: number
  requested_by_type?: RequestedByType
  mrf_type: MRFType
  billing_type: BillingType
  requesting_department?: number | null
  required_department?: number | null
  department?: string
  required_by_date?: string | null
  reason?: string
  client_visible?: boolean
  status?: MRFStatus
  budget_plan?: number | null
  request_number?: string
  experience_min_years?: number | string | null
  experience_max_years?: number | string | null
  reporting_to?: string
  mis_requirement?: string
  education_requirement?: string
  gender_preference?: string
  special_requirement?: string
  salary_range_text?: string
  ctc_budget_text?: string
  reference_note?: string
  other_remarks?: string
  is_budget_deviation?: boolean
  has_special_client_req?: boolean
  preferred_flow_type?: 'standard' | 'fast_track' | string | null
  support_requirement?: Partial<MRFSupportRequirement> | null
}

export interface MRFLineItemWriteInput {
  mrf: number
  site_role_requirement?: number | null
  job_role: number
  headcount: number
  replacement_for_employee?: string
  required_skills?: string[]
  wage_category?: number | null
  wage_min_requested?: number | null
  wage_max_requested?: number | null
  billing_rate_snapshot?: number | null
  budget_min?: number | null
  budget_max?: number | null
  budget_plan?: number | null
  commercial_override_reason?: string
  internal_requested_monthly_gross?: string | null
  internal_budget_variance_reason?: string | null
}

// ─── Readiness (GET /api/mrf/requests/{id}/readiness/) ─────────────────────

export interface MRFReadinessLineItem {
  line_item_id: number | null
  ok: boolean
  errors: string[]
  warnings: string[]
  requested_headcount: number
  approved_headcount: number | null
  already_allocated_headcount: number
  remaining_headcount: number | null
  estimated_amount: string
}

export interface MRFReadinessBudget {
  budget_plan_id?: number | null
  plan_id?: number | null
  plan_name?: string | null
  plan_code?: string | null
  scope?: string | null
  total_amount?: string | null
  available_amount: string
  requested_amount?: string | null
  available_after_request?: string | null
  required_amount: string
  reserved_amount: string
  committed_amount: string
  ok: boolean
  sufficient?: boolean
}

export interface MRFReadinessResponse {
  ok: boolean
  errors: string[]
  warnings: string[]
  line_items: MRFReadinessLineItem[]
  budget: MRFReadinessBudget
}
