/** TypeScript types for the Sales & Site-Survey domain. Field names match DRF serializers. */

// ─── Sales Lead ───────────────────────────────────────────────────────────────

export type SalesLeadType = 'new_client' | 'site_expansion' | 'scope_expansion' | 'renewal'

export interface SalesLead {
  id: number
  org: number
  lead_type: SalesLeadType
  client_name: string
  client_contact_person?: string
  client_email?: string
  client_phone?: string
  existing_client?: number | null
  existing_client_name?: string | null
  current_stage: string
  sales_person?: number | null
  sales_person_name?: string | null
  current_status?: string
  lead_source?: string
  industry?: string
  priority?: string
  expected_start_date?: string | null
  expected_contract_months?: number | null
  estimated_monthly_value?: string | number | null
  rfp_required?: boolean
  rfq_required?: boolean
  requirement_details?: string
  initial_business_requirement?: string
  sales_remarks?: string
  operations_owner?: number | null
  operations_owner_name?: string | null
  submitted_to_operations_at?: string | null
  submitted_to_operations_by_name?: string | null
  created_at: string
  updated_at: string
}

export type SalesLeadWriteInput = {
  lead_type: SalesLeadType
  client_name: string
  existing_client?: number | null
  current_stage?: string
  client_contact_person?: string
  client_email?: string
  client_phone?: string
  sales_person?: number | null
  lead_source?: string
  industry?: string
  priority?: string
  expected_start_date?: string | null
  expected_contract_months?: number | null
  estimated_monthly_value?: string | number | null
  rfp_required?: boolean
  rfq_required?: boolean
  requirement_details?: string
  initial_business_requirement?: string
  sales_remarks?: string
}

export interface SalesLeadSite {
  id: number
  lead: number
  site_name: string
  location_area?: number | null
  site_address?: string
  city?: string
  state?: string
  is_active?: boolean
  remarks?: string
  created_at: string
  updated_at: string
}

export type SalesLeadSiteWriteInput = {
  lead: number
  site_name: string
  location_area?: number | null
  site_address?: string
  city?: string
  state?: string
  is_active?: boolean
  remarks?: string
}

// ─── Activity ─────────────────────────────────────────────────────────────────

export interface SalesLeadActivity {
  id: number
  lead: number
  client_name: string
  lead_type: SalesLeadType
  current_stage: string
  updated_at: string
}

// ─── Site Survey ──────────────────────────────────────────────────────────────

export interface SiteSurvey {
  id: number
  lead: number
  lead_client_name?: string | null
  site?: number | null
  site_name?: string | null
  status: string
  assigned_to?: number | null
  assigned_to_name?: string | null
  assigned_at?: string | null
  due_date?: string | null
  survey_date?: string | null
  notes?: string
  created_at: string
  updated_at: string
}

export type SiteSurveyWriteInput = {
  lead: number
  site?: number | null
  status?: string
  assigned_to?: number | null
  survey_date?: string | null
  notes?: string
}

export interface SiteSurveyScopeAnswer {
  id: number
  survey: number
  field_key: string
  field_label?: string
  category?: string | null
  input_type?: string | null
  sort_order?: number
  value_text?: string | null
  created_at?: string
  updated_at?: string
}

export type SurveyRowType = 'item' | 'subtotal' | 'total' | 'header' | string

export interface SiteSurveyShiftDeployment {
  id: number
  survey: number
  line_type?: SurveyRowType
  sort_order?: number
  description?: string
  job_role?: number | null
  job_role_name?: string | null
  job_role_code?: string | null
  shift_label?: string
  general_count?: number | null
  first_shift_count?: number | null
  second_shift_count?: number | null
  night_shift_count?: number | null
  total_count?: number | null // Read-only, calculated by backend
  remarks?: string
  is_applicable?: boolean
  not_applicable_reason?: string | null
  created_at?: string
  updated_at?: string
}

export interface SiteSurveyLocationLine {
  id: number
  survey: number
  row_type?: SurveyRowType
  sort_order?: number
  location_name?: string
  present_count?: number | null
  proposed_count?: number | null
  remarks?: string
  is_applicable?: boolean
  not_applicable_reason?: string | null
  created_at?: string
  updated_at?: string
}

export type EquipmentCategory = 'major' | 'minor' | string
export type EquipmentLineType = 'item' | 'aggregate' | 'header' | string

export interface SiteSurveyEquipmentLine {
  id: number
  survey: number
  equipment_category?: EquipmentCategory | null
  line_type?: EquipmentLineType
  sort_order?: number
  description?: string
  unit_count?: number | null
  amount?: string | null
  total?: string | null
  is_applicable?: boolean
  not_applicable_reason?: string | null
  amortisation_months?: number | null
  created_at?: string
  updated_at?: string
}

export interface SiteSurveyIssueLine {
  id: number
  survey: number
  row_type?: SurveyRowType
  sort_order?: number
  issue?: string
  improvement_details?: string | null
  is_applicable?: boolean
  not_applicable_reason?: string | null
  created_at?: string
  updated_at?: string
}

export interface SiteSurveyStructuredResponse {
  survey: SiteSurvey
  scope_answers: SiteSurveyScopeAnswer[]
  shift_deployments: SiteSurveyShiftDeployment[]
  location_lines: SiteSurveyLocationLine[]
  equipment_lines: SiteSurveyEquipmentLine[]
  issue_lines: SiteSurveyIssueLine[]
}

// ─── Proposal ─────────────────────────────────────────────────────────────────

export interface ProposalVersion {
  id: number
  lead: number
  version_number: number
  status: string
  valid_from?: string | null
  valid_to?: string | null
  notes?: string
  created_at: string
  updated_at: string
  // Financial summary (returned by backend, read-only)
  manpower_total?: number | null
  subtotal_amount?: string | null
  management_fee_amount?: string | null
  gst_amount?: string | null
  grand_total?: string | null
  // Internal approval
  internal_approval_status?: string | null
  submitted_internal_at?: string | null
  internally_approved_at?: string | null
  // Client response
  client_approval_status?: string | null
  client_remarks?: string | null
  client_response_at?: string | null
  client_approved_at?: string | null
  sent_to_client_at?: string | null
}

export type ProposalVersionWriteInput = {
  lead: number
  notes?: string
  valid_from?: string | null
  valid_to?: string | null
}

export interface ProposalBudgetLine {
  id: number
  proposal_version: number
  site?: number | null
  site_name?: string | null
  role_requirement?: number | null
  service_category?: string
  job_role?: number | null
  job_role_name?: string | null
  description?: string
  manpower_count?: number | null
  unit_cost?: string | null
  total_cost?: string | null
  remarks?: string
  sort_order?: number
  is_manual_override?: boolean
  created_at?: string
  updated_at?: string
}

export interface ProposalBreakupLine {
  id: number
  proposal_version: number
  site?: number | null
  site_name?: string | null
  role_requirement?: number | null
  job_role?: number | null
  job_role_name?: string | null
  component_name?: string
  component_type?: string
  percentage?: string | null
  amount?: string | null
  remarks?: string
  sort_order?: number
  is_manual_override?: boolean
  created_at?: string
  updated_at?: string
}

// ─── Sales Role Requirements (lead-level) ────────────────────────────────────

export interface SalesRoleRequirement {
  id: number
  lead: number
  survey?: number | null
  site?: number | null
  site_name?: string | null
  job_role?: number | null
  job_role_name?: string | null
  wage_category?: number | null
  wage_category_name?: string | null
  service_category?: string
  manpower_count: number
  shift_hours?: string | null
  working_days?: number | null
  remarks?: string
  is_active?: boolean
  created_from_survey?: boolean
  approved_by_operations?: boolean
  approved_at?: string | null
  approved_by?: number | null
  approved_by_name?: string | null
  created_at: string
  updated_at: string
}

export type SalesRoleRequirementWriteInput = {
  lead: number
  survey?: number | null
  site?: number | null
  job_role?: number | null
  wage_category?: number | null
  service_category?: string
  manpower_count: number
  shift_hours?: string | null
  working_days?: number | null
  remarks?: string
  is_active?: boolean
  created_from_survey?: boolean
}

export interface GenerateRoleRequirementCreated {
  description: string
  sales_role_requirement_id: number
  job_role_id: number
  wage_category_id?: number | null
  service_category?: string
  manpower_count: number
  used_mapping?: boolean
}

export interface GenerateRoleRequirementSkipped {
  description: string
  reason: string
  sales_role_requirement_id?: number
}

export interface GenerateRoleRequirementError {
  description: string
  reason: string
}

export interface GenerateRoleRequirementsResult {
  created: GenerateRoleRequirementCreated[]
  updated: GenerateRoleRequirementCreated[]
  skipped: GenerateRoleRequirementSkipped[]
  errors: GenerateRoleRequirementError[]
}

// ─── Survey Role Mapping ──────────────────────────────────────────────────────

export interface SurveyRoleMapping {
  id: number
  org: number
  description_text: string
  job_role: number
  job_role_name?: string | null
  wage_category: number
  wage_category_name?: string | null
  service_category?: string
  shift_hours?: string | number | null
  working_days?: string | number | null
  is_active: boolean
  remarks?: string
  created_at?: string
  updated_at?: string
}

// ─── Sales Activity ───────────────────────────────────────────────────────────

export interface SalesActivity {
  id: number
  lead: number
  activity_type: string
  title: string
  message?: string | null
  actor?: number | null
  actor_username?: string | null
  created_at: string
}

// ─── Sales Document ───────────────────────────────────────────────────────────

export interface SalesDocument {
  id: number
  lead: number
  proposal_version?: number | null
  site?: number | null
  document_type: string
  title: string
  file_name?: string | null
  file_size?: number | null
  content_type?: string | null
  file_url?: string | null
  notes?: string | null
  uploaded_by?: number | null
  uploaded_by_username?: string | null
  created_at: string
}

export type SalesDocumentWriteInput = {
  lead: number
  proposal_version?: number | null
  site?: number | null
  document_type: string
  title: string
  notes?: string | null
}

export type ProposalCalculationType =
  | 'percent_of_basic'
  | 'percent_of_gross'
  | 'percent_of_other'
  | 'fixed'

export interface ProposalComponentRule {
  id: number
  org?: number | null
  code: string
  component_name: string
  component_type: string
  calculation_type: ProposalCalculationType
  percentage?: string | null
  fixed_amount?: string | null
  base_component_code?: string
  sort_order: number
  is_active: boolean
  effective_from?: string | null
  effective_to?: string | null
  remarks?: string
}

export type ProposalComponentRuleWriteInput = {
  org?: number | null
  code: string
  component_name: string
  component_type: string
  calculation_type: ProposalCalculationType
  percentage?: string | null
  fixed_amount?: string | null
  base_component_code?: string
  sort_order?: number
  is_active?: boolean
  effective_from?: string | null
  effective_to?: string | null
  remarks?: string
}

// ─── Dashboard Summary ────────────────────────────────────────────────────────

export interface SalesDashboardSummary {
  leads: {
    total: number
    by_stage: { stage: string; count: number }[]
    by_type: { lead_type: string; count: number }[]
  }
  surveys: {
    pending_assignment: number
    in_progress: number
    completed: number
  }
  proposals: {
    draft: number
    pending_internal_approval: number
    internally_approved: number
    sent_to_client: number
    client_approved: number
    client_rejected: number
    revision_requested: number
  }
  conversion: {
    won_pending_mobilisation: number
    converted: number
  }
  recent_activity: SalesLeadActivity[]
}

// ─── Public proposal response ─────────────────────────────────────────────────

export interface PublicBudgetLine {
  id: number
  site?: number | null
  site_id?: number | null
  site_name?: string | null
  role_requirement?: number | null
  job_role?: number | null
  job_role_id?: number | null
  job_role_name?: string | null
  description?: string
  service_category?: string | null
  manpower_count?: number | null
  unit_cost?: string | null
  total_cost?: string | null
  sort_order?: number
}

export interface PublicBreakupLine {
  id: number
  site?: number | null
  site_id?: number | null
  site_name?: string | null
  role_requirement?: number | null
  job_role?: number | null
  job_role_id?: number | null
  job_role_name?: string | null
  component_name?: string
  component_type?: string
  percentage?: string | null
  amount?: string | null
  sort_order?: number
}

export interface PublicProposalResponse {
  token: string
  client_name: string
  client_contact_person?: string | null
  client_email?: string | null
  client_phone?: string | null
  recipient_name?: string | null
  recipient_email?: string | null
  proposal_version_number?: number | null
  proposal_status?: string | null
  grand_total?: string | null
  manpower_total?: number | null
  management_fee_percent?: string | null
  gst_applicable?: boolean
  already_responded: boolean
  can_respond: boolean
  responded_at?: string | null
  client_response?: string | null
  client_remarks?: string | null
  expires_at?: string | null
  sales_owner_name?: string | null
  notes?: string | null
  valid_to?: string | null
  budget_lines?: PublicBudgetLine[] | null
  breakup_lines?: PublicBreakupLine[] | null
}

export type PublicProposalResponseSubmit = {
  response: 'approved' | 'rejected' | 'revision_required' | 'negotiation_required'
  respondent_name: string
  respondent_email: string
  remarks?: string
}
