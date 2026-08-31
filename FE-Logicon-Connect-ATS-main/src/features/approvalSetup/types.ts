/** Types for workflow config admin APIs (`/api/workflow/config/...`). Field names follow DRF serializers. */

export type RequestType = 'mrf' | 'client_onboarding' | 'mobilisation' | 'sales_proposal' | string

export type AssignmentMode = 'named_user' | 'queue' | 'claim' | string

export type ActorType = 'internal' | 'client' | 'field' | string

export interface ApprovalFlowRow {
  id: number
  org: number | null
  name: string
  code: string
  trigger_type: RequestType
  version: number
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ApprovalFlowWriteInput {
  name: string
  code: string
  trigger_type: RequestType
  version?: number
  description?: string
  is_active?: boolean
  org?: number | null
}

export interface ApprovalStepRow {
  id: number
  template: number
  order: number
  code: string
  name: string
  assignment_mode: AssignmentMode
  actor_type: ActorType
  on_approve_next: string
  on_reject_target: string
  on_request_changes_target: string
  requires_comment_on_reject: boolean
  requires_comment_on_request_changes: boolean
  sla_hours: number | null
}

export interface ApprovalStepWriteInput {
  template: number
  order: number
  code: string
  name: string
  assignment_mode?: AssignmentMode
  actor_type?: ActorType
  on_approve_next?: string
  on_reject_target?: string
  on_request_changes_target?: string
  requires_comment_on_reject?: boolean
  requires_comment_on_request_changes?: boolean
  sla_hours?: number | null
}

export interface ApprovalRuleRow {
  id: number
  org: number
  trigger_type: RequestType
  template: number
  /** Resolved display name when API provides it */
  template_name?: string | null
  template_code?: string | null
  client: number | null
  site: number | null
  is_active: boolean
  mapping_level?: 'company' | 'client' | 'site' | string | null
  created_at: string
  updated_at: string
  client_name?: string | null
  site_name?: string | null
}

export interface ApprovalRuleWriteInput {
  org?: number
  trigger_type: RequestType
  template: number
  client?: number | null
  site?: number | null
  is_active?: boolean
}

export interface ApprovalAssignmentRow {
  id: number
  org: number
  trigger_type: RequestType
  step_code: string
  client: number | null
  site: number | null
  department: number | null
  assignment_mode: AssignmentMode
  named_user: number | null
  eligible_role: number | null
  eligible_scope: number | null
  effective_from: string | null
  effective_to: string | null
  note: string
  is_active: boolean
  created_at: string
  updated_at: string
  step_name?: string | null
  named_user_name?: string | null
  department_name?: string | null
  client_name?: string | null
  site_name?: string | null
  assignment_level?: string | null
}

export interface ApprovalAssignmentWriteInput {
  org?: number
  trigger_type: RequestType
  step_code: string
  client?: number | null
  site?: number | null
  department?: number | null
  assignment_mode?: AssignmentMode
  named_user?: number | null
  eligible_role?: number | null
  eligible_scope?: number | null
  effective_from?: string | null
  effective_to?: string | null
  note?: string
  is_active?: boolean
}

export interface ApprovalPreviewStep {
  order: number
  code: string
  name: string
  department?: string | null
  responsible_person?: string | null
  assignment_level?: string | null
  assignment_ok?: boolean
}

export interface ApprovalPreviewResponse {
  ok: boolean
  request_type: RequestType
  selected_flow: { id: number; name: string; code: string } | null
  selected_rule_level: string | null
  steps: ApprovalPreviewStep[]
  errors: string[]
  warnings: string[]
}
