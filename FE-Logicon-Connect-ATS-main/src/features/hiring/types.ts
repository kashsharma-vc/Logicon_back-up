/** GET /api/hiring/pipeline-stages/ */
export interface PipelineStageRow {
  id: number
  org: number
  name: string
  code: string
  order: number
  stage_type: string
  is_terminal: boolean
  is_active: boolean
}

/** GET /api/hiring/demands/ — approved MRF line item rows */
export interface HiringDemandRow {
  id: number
  mrf_id: number
  site_id?: number | null
  site_name?: string | null
  client_id?: number | null
  client_name?: string | null
  job_role_id: number
  job_role_name?: string | null
  billing_type?: 'billable' | 'non_billable' | string | null
  requested_headcount: number
  application_count: number
  shortlisted_count: number
  selected_count: number
  offer_accepted_count: number
  open_count: number
  // Lane fields (backend source of truth)
  hiring_lane?: 'client_billable' | 'internal_non_billable' | string | null
  hiring_lane_label?: string | null
  requires_client_review?: boolean | null
  // Department fields
  requesting_department_id?: number | null
  requesting_department_name?: string | null
  requesting_department_code?: string | null
  required_department_id?: number | null
  required_department_name?: string | null
  required_department_code?: string | null
  // Resolved budget fields
  resolved_budget_plan_id?: number | null
  resolved_budget_plan_name?: string | null
  resolved_budget_plan_code?: string | null
}

export interface ApplicationStageHistoryBriefRow {
  id: number
  from_stage?: number | null
  from_stage_name?: string | null
  to_stage?: number | null
  to_stage_name?: string | null
  from_status?: string
  to_status?: string
  moved_by?: number | null
  moved_by_username?: string | null
  comment?: string
  created_at?: string
}

/** GET /api/hiring/applications/ */
export interface HiringApplicationRow {
  id: number
  org?: number
  candidate: number
  candidate_name?: string
  candidate_phone?: string
  mrf: number
  site: number
  site_name?: string
  client_name?: string | null
  job_role: number
  job_role_name?: string
  mrf_line_item: number
  current_stage?: number | null
  current_stage_name?: string | null
  current_stage_code?: string | null
  status: string
  interview_plan?: number | null
  match_score?: string | number | null
  match_result?: number | null
  match_snapshot?: MatchSnapshot | null
  shortlisted_by?: number | null
  shortlisted_at?: string | null
  client_visible?: boolean
  client_decision?: string | null
  client_decision_by?: number | null
  client_decision_at?: string | null
  client_decision_note?: string | null
  source_intake_submission?: number | null
  offer_status?: string | null
  offered_ctc?: string | null
  offer_joining_date?: string | null
  recent_stage_history?: ApplicationStageHistoryBriefRow[]
  created_at?: string
  updated_at?: string
  // Lane fields (backend source of truth)
  billing_type?: 'billable' | 'non_billable' | string | null
  hiring_lane?: 'client_billable' | 'internal_non_billable' | string | null
  hiring_lane_label?: string | null
  requires_client_review?: boolean | null
  mrf_budget_max?: string | null
}

export interface HiringApplicationWriteInput {
  candidate: number
  mrf?: number
  mrf_line_item?: number
  current_stage?: number | null
  source_intake_submission?: number | null
  match_score?: string | number | null
}

export interface MoveStageInput {
  stage_id?: number | null
  status?: string | null
  comment?: string
}

/** GET /api/hiring/offers/ */
export interface OfferRow {
  id: number
  hiring_application: number
  offered_ctc?: string | number | null
  salary_breakup?: unknown
  joining_date?: string | null
  status: string
  released_by?: number | null
  released_by_username?: string | null
  released_at?: string | null
  accepted_at?: string | null
  declined_at?: string | null
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface OfferCreateInput {
  hiring_application: number
  offered_ctc?: string | number | null
  salary_breakup?: unknown
  joining_date?: string | null
  notes?: string
}

export interface OfferUpdateInput {
  offered_ctc?: string | number | null
  salary_breakup?: unknown
  joining_date?: string | null
  notes?: string
}

export interface OfferActionInput {
  note?: string
}

export interface ShortlistCandidateInput {
  candidate: number
  match_result?: number | null
  comment?: string
}

export interface SendToClientReviewInput {
  note?: string
}

export interface BulkSendToClientReviewInput {
  application_ids?: number[] | null
  note?: string
}

export interface ClientDecisionInput {
  decision: 'approved' | 'rejected'
  note?: string
  override?: boolean
}

/** Candidate summary embedded in client review rows */
export interface ClientCandidateSummary {
  id: number
  full_name: string | null
  phone: string
  email: string
  current_role: string
  current_location: string
  total_experience_years: string | null
  availability_status: string
}

/** Resume summary embedded in client review rows (never includes raw_text) */
export interface ClientResumeSummary {
  confidence: string | null
  summary: string
  career_level: string
  primary_domain: string
}

/** GET /api/hiring/client-review/ */
export interface ClientReviewApplicationRow {
  id: number
  org?: number
  candidate: number
  candidate_summary?: ClientCandidateSummary | null
  mrf: number
  mrf_line_item?: number | null
  site: number
  site_name?: string | null
  client_name?: string | null
  job_role: number
  job_role_name?: string | null
  match_score?: string | number | null
  status: string
  current_stage?: number | null
  current_stage_name?: string | null
  client_visible?: boolean
  client_decision?: string | null
  client_decision_by?: number | null
  client_decision_by_username?: string | null
  client_decision_at?: string | null
  client_decision_note?: string | null
  resume_summary?: ClientResumeSummary | null
  created_at?: string
  updated_at?: string
  // Lane fields (backend source of truth)
  billing_type?: 'billable' | 'non_billable' | string | null
  hiring_lane?: 'client_billable' | 'internal_non_billable' | string | null
  hiring_lane_label?: string | null
  requires_client_review?: boolean | null
}

/** Candidate summary embedded in ranked pool results */
export interface PoolCandidateSummary {
  id: number
  first_name: string
  last_name: string
  middle_name?: string
  full_name?: string | null
  phone: string
  email?: string | null
  current_role?: string | null
  current_company?: string | null
  current_location?: string | null
  preferred_location?: string | null
  collar_type?: string | null
  billing_type?: string | null
  target_job_role?: number | null
  target_job_role_name?: string | null
  total_experience_years?: string | number | null
  skills_count?: number
  lifecycle_status?: string
  availability_status?: string | null
  latest_source_type?: string | null
  // Candidate journey fields (computed by backend)
  journey_status?: string | null
  journey_status_label?: string | null
}

/** Per-dimension match score breakdown (0–100 each). */
export interface MatchScoreBreakdown {
  role?: number | null
  skills?: number | null
  experience?: number | null
  location?: number | null
  availability?: number | null
  industry?: number | null
  education?: number | null
  salary?: number | null
  semantic?: number | null
  data_quality?: number | null
}

/** Captured at shortlist time — GET /api/hiring/applications/ match_snapshot */
export interface MatchSnapshot {
  match_result?: number | null
  score?: number | null
  match_source?: string | null
  score_breakdown?: MatchScoreBreakdown | null
  matched_skills?: string[]
  missing_skills?: string[]
  reasons?: string[]
  warnings?: string[]
  details?: Record<string, unknown> | null
}

/** Shared props for candidate match scorecard UI. */
export interface CandidateMatchScorecardData {
  candidateName?: string
  candidatePhone?: string
  score?: number | null
  matchStatus?: string | null
  scoreBreakdown?: MatchScoreBreakdown | null
  matchedSkills?: string[]
  missingSkills?: string[]
  extraCandidateSkills?: string[]
  reasons?: string[]
  warnings?: string[]
}

/** GET /api/hiring/demands/{id}/candidate-pool/?ranked=true */
export interface CandidatePoolResultRow {
  candidate: PoolCandidateSummary
  match_result?: number | null
  score?: number | null
  match_status?: string | null
  score_breakdown?: MatchScoreBreakdown | null
  matched_skills?: string[]
  missing_skills?: string[]
  extra_candidate_skills?: string[]
  reasons?: string[]
  warnings?: string[]
}

/** POST /api/hiring/applications/{id}/convert-to-deployment/ */
export interface HiringDeploymentConversionInput {
  employee_code?: string | null
  joined_on?: string | null
  deployment_start_date?: string | null
  deployment_status?: 'planned' | 'active' | 'completed' | 'transferred' | 'cancelled'
  shift_hours?: string | number | null
  billing_type?: 'billable' | 'non_billable' | null
  allow_existing_employee?: boolean
}

export interface HiringDeploymentConversionResult {
  application: unknown
  employee: unknown
  deployment: unknown
  created_employee: boolean
  created_deployment: boolean
}

/** GET /api/hiring/interviews/ */
export interface InterviewRow {
  id: number
  hiring_application: number
  planned_round?: number | null
  round_type: 'hr' | 'technical' | 'manager' | 'client' | 'final'
  round_number: number
  scheduled_at?: string | null
  scheduled_by?: number | null
  interviewer?: number | null
  interviewer_username?: string | null
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'no_show' | 'rescheduled'
  mode: 'phone' | 'video' | 'in_person'
  location?: string
  meeting_link?: string
  created_at?: string
  updated_at?: string
}

export interface InterviewCreateInput {
  hiring_application: number
  planned_round?: number | null
  round_type: InterviewRow['round_type']
  round_number?: number
  scheduled_at?: string | null
  interviewer?: number | null
  status?: InterviewRow['status']
  mode?: InterviewRow['mode']
  location?: string
  meeting_link?: string
}

export interface InterviewUpdateInput {
  planned_round?: number | null
  scheduled_at?: string | null
  interviewer?: number | null
  status?: InterviewRow['status']
  mode?: InterviewRow['mode']
  location?: string
  meeting_link?: string
}

/** GET /api/hiring/interview-plans/ (rounds nested) */
export interface InterviewPlanRoundRow {
  id: number
  plan: number
  round_type: 'hr' | 'technical' | 'manager' | 'client' | 'final'
  round_number: number
  mode: 'phone' | 'video' | 'in_person'
  is_required: boolean
  is_active: boolean
  instructions?: string
  created_at?: string
  updated_at?: string
}

export interface InterviewPlanRow {
  id: number
  org: number
  job_role?: number | null
  job_role_name?: string | null
  name: string
  code: string
  description?: string
  is_default: boolean
  is_active: boolean
  rounds: InterviewPlanRoundRow[]
  created_at?: string
  updated_at?: string
}

/** POST /api/hiring/applications/{id}/apply-interview-plan/ */
export interface ApplyInterviewPlanResult {
  application: HiringApplicationRow
  plan: InterviewPlanRow
  interviews: InterviewRow[]
  created_count: number
  attached_count: number
}

/** GET /api/hiring/applications/interview-pipeline/ */
export interface InterviewPipelineBucketItem {
  application: HiringApplicationRow
  interviews: InterviewRow[]
  feedbacks: InterviewFeedbackRow[]
  required_round_ids: number[]
  passed_round_ids: number[]
}

export type InterviewPipelineBucketKey =
  | 'ready_for_screening'
  | 'hr'
  | 'technical'
  | 'manager'
  | 'client'
  | 'final'
  | 'feedback_pending'
  | 'on_hold'
  | 'cleared_for_offer'

export interface InterviewPipelineBucket {
  key: InterviewPipelineBucketKey
  count: number
  applications: InterviewPipelineBucketItem[]
}

export interface InterviewPipelineResponse {
  buckets: InterviewPipelineBucket[]
}

/** GET /api/hiring/interview-feedbacks/ */
export interface InterviewFeedbackRow {
  id: number
  interview: number
  given_by?: number | null
  given_by_username?: string | null
  rating?: number | null
  feedback?: string
  recommendation: 'proceed' | 'hold' | 'reject'
  created_at?: string
  updated_at?: string
}

export interface InterviewFeedbackCreateInput {
  interview: number
  rating?: number | null
  feedback?: string
  recommendation: InterviewFeedbackRow['recommendation']
}

export interface CandidateMatchResultRow {
  id: number
  org?: number
  candidate: number
  mrf_line_item: number
  final_score?: string | number | null
  role_score?: string | number | null
  skill_score?: string | number | null
  experience_score?: string | number | null
  location_score?: string | number | null
  availability_score?: string | number | null
  industry_score?: string | number | null
  education_score?: string | number | null
  salary_score?: string | number | null
  semantic_score?: string | number | null
  matched_skills?: string[]
  missing_skills?: string[]
  match_reason?: string[] | string | null
  warnings?: string[]
  match_details?: MatchScoreBreakdown | null
  match_score?: string | number | null
  match_source?: string | null
  is_auto_match?: boolean
  created_by?: number | null
  created_at?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Interview Assignments
// ─────────────────────────────────────────────────────────────────────────────

export type InterviewAssignmentState =
  | 'upcoming'
  | 'pending_feedback'
  | 'completed'
  | 'held'
  | 'rejected'

/** GET /api/hiring/interviews/assignments/ */
export interface InterviewAssignmentRow {
  id: number
  application: number
  candidate_name: string
  candidate_phone: string
  client_name: string | null
  site_name: string | null
  job_role_name: string | null
  application_status: string
  planned_round: number | null
  planned_round_name: string | null
  round_type: string
  round_number: number
  scheduled_at: string | null
  scheduled_by: number | null
  scheduled_by_name: string | null
  interviewer: number | null
  interviewer_name: string | null
  status: string
  assignment_state: InterviewAssignmentState
  mode: string
  location: string
  meeting_link: string
  latest_feedback: InterviewFeedbackRow | null
  created_at: string
  updated_at: string
}

export interface InterviewAssignmentsResponse {
  count: number
  counts: {
    upcoming: number
    pending_feedback: number
    completed: number
    held: number
    rejected: number
  }
  results: InterviewAssignmentRow[]
}
