/** MRF serializer workflow_status (includes synthetic not_started). */
export type WorkflowStatus = 'not_started' | 'active' | 'approved' | 'rejected' | 'cancelled' | string

export type WorkflowAction = 'approve' | 'reject' | 'request_changes'

export interface WorkflowActionPayload {
  action: WorkflowAction
  comment?: string
}

export interface WorkflowReassignPayload {
  new_user: number
  comment?: string
}

export interface WorkflowConfigCheckStep {
  step_code: string
  step_name: string
  assignment_ok: boolean
  assignment_level: null | 'org' | 'client' | 'site'
  department: string | null
  assigned_user: string | null
}

export interface WorkflowConfigCheck {
  ok: boolean
  /** Present for MRF workflow config checks. */
  mrf?: number | null
  /** Present for mobilisation workflow config checks; backend field name is compatibility-only. */
  client_onboarding_request?: number | null
  template: null | { id: number; name: string; code: string }
  mapping_level: null | 'org' | 'client' | 'site'
  steps: WorkflowConfigCheckStep[]
  errors: string[]
  warnings: string[]
}

/** Step instance from GET /api/workflow/instances/{id}/ — fields optional for defensive UI. */
export interface WorkflowStepInstance {
  id: number
  step_order?: number
  step_code?: string | null
  step_name?: string | null
  status?: string | null
  assigned_user?: number | null
  assigned_user_username?: string | null
  assigned_department_name_snapshot?: string | null
  acted_by?: number | null
  acted_by_username?: string | null
  acted_at?: string | null
  comment?: string | null
  action_taken?: string | null
  activated_at?: string | null
  due_at?: string | null
}

export interface WorkflowAuditEntry {
  id?: number
  action?: string | null
  actor?: number | null
  actor_username?: string | null
  comment?: string | null
  created_at?: string | null
  step_instance?: number | null
}

export interface WorkflowInstance {
  id: number
  mrf?: number | null
  client_onboarding_request?: number | null
  mobilisation?: number | null
  sales_proposal?: number | null
  org?: number
  template?: number
  status?: string
  started_at?: string | null
  completed_at?: string | null
  initiated_by?: number | null
  initiated_by_username?: string | null
  steps?: WorkflowStepInstance[]
  audit_trail?: WorkflowAuditEntry[]
  current_step?: WorkflowStepInstance | null
}

/** Row from GET /api/workflow/my-tasks/ */
export type WorkflowMyTaskTargetType = 'mrf' | 'client_onboarding' | 'mobilisation' | 'sales_proposal'

export interface WorkflowMyTask {
  workflow_id: number
  step_id: number
  step_code: string
  step_name: string
  step_status: string
  assigned_user: number | null
  assigned_user_username: string | null
  assigned_department_name: string | null
  assigned_department_code: string | null
  activated_at: string | null
  due_at: string | null

  target_type: WorkflowMyTaskTargetType
  target_id: number
  target_title: string
  target_status: string
  target_url: string

  client_id: number | null
  client_name: string | null
  site_id: number | null
  site_name: string | null

  requesting_department_name: string | null
  required_department_name: string | null
  line_item_count: number | null
}

export interface WorkflowMyTaskListResponse {
  count: number
  results: WorkflowMyTask[]
}

/** GET /api/workflow/my-tasks/{step_id}/ */
export interface WorkflowTaskDetailResponse {
  task: WorkflowMyTask
  workflow: WorkflowTaskWorkflow
  target: WorkflowTaskTarget
  actions: WorkflowTaskActions
}

export interface WorkflowTaskWorkflow {
  id: number
  status: string
  template: number | null
  template_name: string | null
  template_version: number | null
  started_at: string | null
  completed_at: string | null
  current_step_id: number | null
  steps: WorkflowTaskStep[]
  audit_trail: WorkflowTaskAuditEntry[]
}

export interface WorkflowTaskStep {
  id: number
  step_order: number
  step_code: string
  step_name: string
  status: string
  assigned_user: number | null
  assigned_user_username: string | null
  assigned_department_name: string | null
  acted_by_username: string | null
  acted_at: string | null
  action_taken: string
}

export interface WorkflowTaskAuditEntry {
  id: number
  action: string
  actor_username: string | null
  comment: string
  created_at: string
}

export type WorkflowTaskTarget =
  | {
      type: 'mrf'
      mrf: WorkflowTaskMRF
      line_items: WorkflowTaskMRFLineItem[]
    }
  | {
      type: 'client_onboarding'
      client_onboarding: WorkflowTaskMobilisationSetup
      line_items: []
    }
  | {
      type: 'mobilisation'
      mobilisation: WorkflowTaskMobilisation
      line_items: []
    }
  | {
      type: 'sales_proposal'
      sales_proposal: WorkflowTaskSalesProposal
      budget_lines: WorkflowTaskSalesProposalBudgetLine[]
      breakup_lines: WorkflowTaskSalesProposalBreakupLine[]
      line_items: []
    }

export interface WorkflowTaskMRF {
  id: number
  status: string
  mrf_type: string
  requested_by_username: string | null
  requested_by_type: string
  site: number | null
  site_name: string | null
  client_id: number | null
  client_name: string | null
  requesting_department: number | null
  requesting_department_name: string | null
  required_department: number | null
  required_department_name: string | null
  billing_type: string
  required_by_date: string | null
  reason: string
  client_visible: boolean
  budget_plan: number | null
  budget_plan_name: string | null
  budget_plan_code: string | null
  budget_plan_amount: string | null
  budget_plan_currency: string | null
  budget_plan_status: string | null
  budget_reserved_amount?: string | null
  budget_committed_amount?: string | null
  budget_reservation_status?: string | null
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

export interface WorkflowTaskMRFLineItem {
  id: number
  job_role: number | null
  job_role_name: string | null
  headcount: number
  site_role_requirement: number | null
  site_role_requirement_label?: string | null
  srr_approved_headcount?: number | null
  srr_remaining_headcount?: number | null
  wage_category_name: string | null
  wage_min_requested: string | null
  wage_max_requested: string | null
  billing_rate_snapshot: string | null
  srr_billing_rate?: string | null
  master_wage_min_snapshot?: string | null
  master_wage_max_snapshot?: string | null
  master_billing_rate_snapshot?: string | null
  commercial_override_enabled?: boolean
  commercial_override_reason?: string | null
  commercial_overridden_at?: string | null
  budget_plan: number | null
  budget_plan_name: string | null
}

export interface WorkflowTaskOnboardingProposedDepartment {
  id: number
  name: string
  code: string
  scope_level: string
  description: string
  real_site: number | null
  real_site_name: string | null
  real_site_code: string | null
  is_active: boolean
}

export interface WorkflowTaskOnboardingProposedUser {
  id: number
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
  real_site_code: string | null
  is_primary_contact: boolean
  send_invite_on_finalization: boolean
  is_active: boolean
  created_user: number | null
  invite_status: string
}

export interface WorkflowTaskMobilisationSetup {
  id: number
  status: string
  onboarding_type?: string
  mobilisation_type?: string
  client: number | null
  client_name: string | null
  requested_by_username: string | null
  summary: string
  expected_sites_count: number | null
  budget_plan: number | null
  budget_plan_name: string | null
  notes: string
  proposed_client_name: string
  proposed_client_code: string
  proposed_contact_name: string
  proposed_contact_email: string
  proposed_contact_phone: string
  proposed_industry: string
  proposed_billing_address: string
  proposed_gst_number: string
  finalization_status: string
  created_client: number | null
  source_sales_lead?: number | null
  source_sales_lead_name?: string | null
  source_proposal_version?: number | null
  source_proposal_version_number?: number | null
  source_proposal_grand_total?: string | null
  source_proposal_manpower_total?: number | null
  source_proposal_client_approval_status?: string | null
  proposed_departments: WorkflowTaskOnboardingProposedDepartment[]
  proposed_users: WorkflowTaskOnboardingProposedUser[]
}

export type WorkflowTaskMobilisation = WorkflowTaskMobilisationSetup

export interface WorkflowTaskSalesProposalBudgetLine {
  id: number
  site?: number | null
  site_id?: number | null
  site_name?: string | null
  role_requirement?: number | null
  job_role?: number | null
  job_role_id?: number | null
  job_role_name?: string | null
  description?: string | null
  service_category?: string | null
  manpower_count?: number | null
  unit_cost?: string | null
  total_cost?: string | null
  is_manual_override?: boolean
  sort_order?: number
}

export interface WorkflowTaskSalesProposalBreakupLine {
  id: number
  site?: number | null
  site_id?: number | null
  site_name?: string | null
  role_requirement?: number | null
  job_role?: number | null
  job_role_id?: number | null
  job_role_name?: string | null
  component_code?: string | null
  component_name?: string | null
  component_type?: string | null
  percentage?: string | null
  sort_order?: number
  amount?: string | null
}

export interface WorkflowTaskSalesProposalLead {
  id: number
  client_name?: string | null
  client_contact_person?: string | null
  client_email?: string | null
  client_phone?: string | null
  current_stage?: string | null
}

export interface WorkflowTaskSalesProposalUserRef {
  id: number
  username: string
}

export interface WorkflowTaskSalesProposalClientResponseSummary {
  client_response?: string | null
  client_remarks?: string | null
  responded_at?: string | null
  responded_by_name?: string | null
  responded_by_email?: string | null
}

export interface WorkflowTaskSalesProposal {
  id: number
  lead?: WorkflowTaskSalesProposalLead | null
  lead_type?: string | null
  client_name?: string | null
  sales_person?: WorkflowTaskSalesProposalUserRef | null
  sales_person_name?: string | null
  version_number?: number | null
  status?: string | null
  internal_approval_status?: string | null
  client_approval_status?: string | null
  client_remarks?: string | null
  management_fee_percent?: string | null
  gst_applicable?: boolean
  sales_remarks?: string | null
  submitted_internal_at?: string | null
  internally_approved_at?: string | null
  valid_from?: string | null
  valid_to?: string | null
  manpower_total?: number | null
  grand_total?: string | null
  budget_lines?: WorkflowTaskSalesProposalBudgetLine[]
  breakup_lines?: WorkflowTaskSalesProposalBreakupLine[]
  created_at?: string | null
  created_by_username?: string | null
  client_response_summary?: WorkflowTaskSalesProposalClientResponseSummary | null
}

export interface WorkflowTaskActions {
  can_approve: boolean
  can_reject: boolean
  can_request_changes: boolean
  act_url: string
}

/** GET /api/workflow/routes/available/ preview step (matches backend `build_approval_route_preview`). */
export interface ApprovalRouteStepPreview {
  order: number
  step_code: string
  step_name: string
  assignment_ok: boolean
  assigned_user: number | null
  assigned_user_username: string | null
  assigned_user_name?: string | null
  department: number | null
  department_name: string | null
  errors?: string[]
}

export interface ApprovalRoutePreview {
  id: number
  name: string
  code: string
  trigger_type: string
  template: number
  template_name: string
  template_code: string
  scope_level: 'org' | 'client' | 'site'
  is_default: boolean
  description?: string | null
  ok: boolean
  errors: string[]
  steps: ApprovalRouteStepPreview[]
}

export interface ApprovalRoutePreviewListResponse {
  count: number
  results: ApprovalRoutePreview[]
}
