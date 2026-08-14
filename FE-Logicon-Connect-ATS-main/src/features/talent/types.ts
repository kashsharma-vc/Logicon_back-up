import type { HiringApplicationRow } from '@/features/hiring/types'

export type DocumentTypeCode = 'pdf' | 'docx' | 'doc' | 'txt' | 'xlsx' | 'csv' | 'unknown'

/** Backend-computed profile completeness (do not recompute on frontend). */
export interface ProfileQualityChecks {
  phone_present?: boolean
  mapped_role_present?: boolean
  resume_file_present?: boolean
  skills_present?: boolean
  experience_present?: boolean
  education_present?: boolean
  location_present?: boolean
}

export interface ProfileQuality {
  score: number
  checks: ProfileQualityChecks
  missing: string[]
}

/** GET /api/talent/candidates/ */
export interface CandidateRow {
  id: number
  org?: number
  phone: string
  phone_normalized?: string
  first_name: string
  middle_name?: string
  last_name: string
  full_name?: string
  email?: string
  current_location?: string | null
  total_experience_years?: string | number | null
  current_ctc?: string | null
  expected_ctc?: string | null
  source?: string
  is_blacklisted?: boolean
  blacklist_reason?: string | null
  lifecycle_status?: string
  availability_status?: string | null
  preferred_location?: string | null
  notice_period_days?: number | null
  current_company?: string | null
  current_role?: string | null
  collar_type?: string | null
  billing_type?: 'billable' | 'non_billable' | null
  source_reference?: string | null
  is_duplicate?: boolean
  duplicate_of?: number | null
  do_not_contact?: boolean
  profile_quality?: ProfileQuality | null
  profile_quality_score?: number | null
  skills_count?: number
  resume_count?: number
  latest_resume_status?: string | null
  latest_document_type?: DocumentTypeCode | null
  latest_source_type?: string | null
  active_application_count?: number
  target_job_role?: number | null
  target_job_role_name?: string | null
  target_job_role_code?: string | null
  mapped_job_roles?: Array<{ id: number; name: string; code?: string }>
  created_at?: string
  updated_at?: string
  // Candidate journey fields (computed by backend)
  journey_status?: string | null
  journey_status_label?: string | null
  latest_application_id?: number | null
  latest_application_status?: string | null
  latest_offer_status?: string | null
  employee_id?: number | null
  employee_status?: string | null
  deployment_id?: number | null
  deployment_status?: string | null
}

export interface CandidateWriteInput {
  phone: string
  first_name: string
  middle_name?: string
  last_name: string
  email?: string
  current_location?: string
  total_experience_years?: string | number | null
  current_ctc?: string | number | null
  expected_ctc?: string | number | null
  source?: string
  lifecycle_status?: string
  availability_status?: string
  preferred_location?: string
  notice_period_days?: number | null
  current_company?: string
  current_role?: string
  collar_type?: string
  billing_type?: string | null
  source_reference?: string
}

export interface ResumeRow {
  id: number
  candidate: number
  candidate_full_name?: string | null
  candidate_phone?: string | null
  candidate_billing_type?: string | null
  file?: string
  original_filename?: string
  content_type?: string
  size_bytes?: number | null
  parsed_status?: string
  uploaded_at?: string
  view_only_note?: string
  status?: string
  file_hash?: string
  source_type?: string
  document_type?: DocumentTypeCode | string | null
  target_job_role?: number | null
  target_job_role_name?: string | null
  target_job_role_code?: string | null
  target_role_source?: string | null
  import_batch_id?: string | null
  error_message?: string
  manual_review_reason?: string
  uploaded_by?: number | null
}

/** One file row in an async resume import batch. */
export interface ResumeImportItem {
  id: number
  original_filename?: string | null
  document_type?: DocumentTypeCode | string | null
  row_number?: number | null
  status: string
  error_message?: string | null
  candidate?: number | null
  candidate_name?: string | null
  candidate_phone?: string | null
  resume?: number | null
  processed_at?: string | null
}

/** Async bulk resume upload batch (POST bulk-upload + GET import-batches/{id}/). */
export interface ResumeImportBatch {
  id: number
  target_job_role?: number | null
  target_job_role_name?: string | null
  source_type?: string | null
  document_type?: DocumentTypeCode | string | null
  import_file?: string | null
  original_filename?: string | null
  created_by?: number | null
  created_at?: string
  status: string
  total_count: number
  processed_count: number
  success_count: number
  duplicate_count: number
  failed_count: number
  manual_review_count: number
  items: ResumeImportItem[]
}

/** One row in an Excel/CSV candidate import response. */
export interface ExcelImportItem {
  status: string
  row?: number | null
  row_number?: number | null
  candidate?: number | null
  candidate_id?: number | null
  candidate_full_name?: string | null
  target_job_role?: number | null
  phone?: string | null
  error?: string | null
}

/** POST /api/talent/resumes/excel-import/ */
export interface ExcelImportResponse {
  batch_id?: string | null
  imported: number
  duplicates?: number
  failed: number
  items: ExcelImportItem[]
}

export interface ManualResumeIntakeInput {
  first_name: string
  middle_name?: string
  last_name: string
  phone: string
  email?: string
  source?: string
  current_role?: string
  current_location?: string
  total_experience_years?: string | number | null
  preferred_location?: string
  notice_period_days?: number | null
  current_company?: string
  expected_ctc?: string | number | null
  current_ctc?: string | number | null
  resume_file: File
  view_only_note?: string
  skills?: string
  mrf?: number | null
  mrf_line_item?: number | null
  current_stage?: number | null
}

export interface CandidateSkillRow {
  id: number
  skill_name: string
  normalized_skill_name?: string
  confidence?: string | number | null
  years_experience?: string | number | null
  proficiency?: string | null
  source?: string | null
}

export interface ManualResumeIntakeResponse {
  candidate: CandidateRow
  resume: ResumeRow
  skills: CandidateSkillRow[]
  hiring_application: HiringApplicationRow | null
}

export interface CandidateExperienceRow {
  id: number
  candidate: number
  job_title: string
  normalized_title?: string | null
  company_name?: string | null
  industry?: string | null
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
  duration_months?: number | null
  description?: string
  responsibilities?: string[] | string | null
  confidence?: string | number | null
  created_at?: string
  updated_at?: string
}

export interface CandidateEducationRow {
  id: number
  candidate: number
  degree: string
  normalized_degree?: string | null
  specialization?: string | null
  institute?: string | null
  start_year?: number | null
  end_year?: number | null
  confidence?: string | number | null
  created_at?: string
  updated_at?: string
}

export interface ParsedResumeRow {
  id: number
  resume: number
  parsed_json?: unknown
  normalized_json?: unknown
  summary?: string | null
  career_level?: string | null
  primary_domain?: string | null
  validation_errors?: unknown
  missing_fields?: unknown
  confidence?: string | number | null
  created_at?: string
  updated_at?: string
}

export interface CandidateQueueSummary {
  id: number
  full_name: string | null
  phone: string
  email: string
  lifecycle_status: string
}

export interface ParsedResumeSummary {
  id: number
  confidence: string | number | null
  career_level: string | null
  primary_domain: string | null
  validation_errors: unknown
  missing_fields: unknown
}

/** GET /api/talent/resumes/review-queue/ */
export interface ResumeReviewQueueItem {
  id: number
  original_filename?: string | null
  status?: string
  document_type?: DocumentTypeCode | string | null
  manual_review_reason?: string | null
  error_message?: string | null
  parser_engine?: string | null
  parser_confidence?: string | number | null
  extraction_engine?: string | null
  extraction_confidence?: string | number | null
  uploaded_at?: string | null
  source_type?: string | null
  uploaded_by?: number | null
  candidate_summary?: CandidateQueueSummary | null
  parsed_resume_summary?: ParsedResumeSummary | null
}

/** GET /api/talent/resumes/{id}/review-detail/ */
export interface ResumeReviewDetail {
  id: number
  original_filename?: string | null
  content_type?: string | null
  size_bytes?: number | null
  status?: string
  manual_review_reason?: string | null
  error_message?: string | null
  parser_engine?: string | null
  parser_confidence?: string | number | null
  extraction_engine?: string | null
  extraction_confidence?: string | number | null
  raw_text?: string | null
  cleaned_text?: string | null
  uploaded_at?: string | null
  source_type?: string | null
  candidate?: CandidateRow | null
  parsed_resume?: ParsedResumeRow | null
  parsed_skills?: CandidateSkillRow[]
  parsed_experience?: CandidateExperienceRow[]
  parsed_education?: CandidateEducationRow[]
}

/** POST apply-review - candidate sub-object */
export interface ApplyReviewCandidateInput {
  first_name?: string
  middle_name?: string
  last_name?: string
  email?: string
  phone?: string
  current_role?: string
  current_company?: string
  current_location?: string
  total_experience_years?: string | number | null
  expected_ctc?: string | number | null
  current_ctc?: string | number | null
  collar_type?: string
  notice_period_days?: number | null
}

export interface ApplyReviewSkillInput {
  skill_name: string
  years_experience?: string | number | null
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | ''
}

export interface ApplyReviewExperienceInput {
  job_title?: string
  company_name?: string
  industry?: string
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
  duration_months?: number | null
  description?: string
  responsibilities?: string[]
}

export interface ApplyReviewEducationInput {
  degree?: string
  specialization?: string
  institute?: string
  start_year?: number | null
  end_year?: number | null
}

/** POST /api/talent/resumes/{id}/apply-review/ */
export interface ApplyReviewPayload {
  candidate?: ApplyReviewCandidateInput
  skills?: ApplyReviewSkillInput[]
  experience?: ApplyReviewExperienceInput[]
  education?: ApplyReviewEducationInput[]
  review_note?: string
}

/** POST /api/talent/resumes/{id}/resolve-duplicate/ */
export interface DuplicateResolutionPayload {
  resolution: 'link_existing' | 'keep_separate' | 'mark_duplicate'
  candidate?: number | null
  note?: string
}

/** POST /api/talent/candidates/{id}/merge/ */
export interface CandidateMergeInput {
  target_candidate: number
  note?: string
}

export interface CandidateMergeResult {
  source_candidate: CandidateRow
  target_candidate: CandidateRow
  profile_quality: ProfileQuality
}

/** Returned by apply-review, resolve-duplicate, mark-reviewed audit endpoints */
export interface TalentResumeReviewRow {
  id: number
  resume: number
  candidate: number | null
  reviewed_by: number | null
  reviewed_by_name: string | null
  review_type: string
  previous_status: string
  new_status: string
  review_note: string
  correction_payload: unknown
  created_at: string
}
