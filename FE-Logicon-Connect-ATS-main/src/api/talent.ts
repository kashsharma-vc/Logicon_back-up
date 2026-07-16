import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import { saveBlob } from '@/lib/fileDownload'
import type {
  ApplyReviewPayload,
  CandidateEducationRow,
  CandidateExperienceRow,
  CandidateMergeInput,
  CandidateMergeResult,
  CandidateSkillRow,
  CandidateRow,
  CandidateWriteInput,
  DuplicateResolutionPayload,
  ExcelImportResponse,
  ManualResumeIntakeResponse,
  ParsedResumeRow,
  ResumeImportBatch,
  ResumeReviewDetail,
  ResumeReviewQueueItem,
  ResumeRow,
  TalentResumeReviewRow,
} from '@/features/talent/types'

export interface ListCandidatesParams {
  search?: string
  skill?: string
  document_type?: string
  min_experience?: string | number
  max_experience?: string | number
  location?: string
  lifecycle_status?: string
  availability_status?: string
  journey_status?: string
  source_type?: string
  target_job_role?: number
  is_blacklisted?: boolean
  page?: number
}

export async function listCandidates(params?: ListCandidatesParams): Promise<{ items: CandidateRow[]; count?: number }> {
  const res = await api.get('/api/talent/candidates/', { params })
  return unwrapDrfResults<CandidateRow>(res.data)
}

export async function getCandidate(id: number): Promise<CandidateRow> {
  const res = await api.get(`/api/talent/candidates/${id}/`)
  return res.data as CandidateRow
}

export async function createCandidate(payload: CandidateWriteInput): Promise<CandidateRow> {
  const res = await api.post('/api/talent/candidates/', payload)
  return res.data as CandidateRow
}

export async function updateCandidate(id: number, payload: Partial<CandidateWriteInput>): Promise<CandidateRow> {
  const res = await api.patch(`/api/talent/candidates/${id}/`, payload)
  return res.data as CandidateRow
}

export interface ListResumesParams {
  candidate?: number
  status?: string
  parsed_status?: string
  source_type?: string
  target_job_role?: number
  target_role_source?: string
  import_batch_id?: string
  page?: number
}

export async function listResumes(params?: ListResumesParams): Promise<{ items: ResumeRow[]; count?: number }> {
  const res = await api.get('/api/talent/resumes/', { params })
  return unwrapDrfResults<ResumeRow>(res.data)
}

export async function getResume(id: number): Promise<ResumeRow> {
  const res = await api.get(`/api/talent/resumes/${id}/`)
  return res.data as ResumeRow
}

export async function uploadResume(formData: FormData): Promise<ResumeRow> {
  const res = await api.post('/api/talent/resumes/', formData)
  return res.data as ResumeRow
}

/** POST /api/talent/manual-resume-intake/ - multipart FormData */
export async function manualResumeIntake(formData: FormData): Promise<ManualResumeIntakeResponse> {
  const res = await api.post<ManualResumeIntakeResponse>('/api/talent/manual-resume-intake/', formData)
  return res.data
}

export interface BulkUploadResumesInput {
  target_job_role: number
  files: File[]
  source_type?: string
  view_only_note?: string
  billing_type?: string | null
}

/** POST /api/talent/resumes/bulk-upload/ - queues async role-tagged multi-file intake */
export async function bulkUploadResumes(input: BulkUploadResumesInput): Promise<ResumeImportBatch> {
  const fd = new FormData()
  fd.append('target_job_role', String(input.target_job_role))
  fd.append('source_type', input.source_type ?? 'bulk_upload')
  if (input.billing_type) fd.append('billing_type', input.billing_type)
  if (input.view_only_note?.trim()) fd.append('view_only_note', input.view_only_note.trim())
  for (const file of input.files) {
    fd.append('files', file)
  }
  const res = await api.post<ResumeImportBatch>('/api/talent/resumes/bulk-upload/', fd)
  return res.data
}

export interface ListResumeImportBatchesParams {
  target_job_role?: number
  status?: string
  document_type?: string
  source_type?: string
  created_by?: string | number
  created_from?: string
  created_to?: string
  page?: number
}

/** GET /api/talent/resumes/import-batches/ */
export async function listResumeImportBatches(
  params?: ListResumeImportBatchesParams,
): Promise<{ items: ResumeImportBatch[]; count?: number }> {
  const res = await api.get('/api/talent/resumes/import-batches/', { params })
  return unwrapDrfResults<ResumeImportBatch>(res.data)
}

/** GET /api/talent/resumes/import-batches/{id}/ */
export async function getResumeImportBatch(id: number): Promise<ResumeImportBatch> {
  const res = await api.get<ResumeImportBatch>(`/api/talent/resumes/import-batches/${id}/`)
  return res.data
}

export interface ExcelImportCandidatesInput {
  target_job_role: number
  file: File
  source_type?: string
  billing_type?: string | null
}

/** POST /api/talent/resumes/excel-import/ - role-tagged candidate import from CSV/XLSX */
export async function excelImportCandidates(input: ExcelImportCandidatesInput): Promise<ExcelImportResponse> {
  const fd = new FormData()
  fd.append('target_job_role', String(input.target_job_role))
  fd.append('source_type', input.source_type ?? 'excel_import')
  if (input.billing_type) fd.append('billing_type', input.billing_type)
  fd.append('file', input.file)
  const res = await api.post<ExcelImportResponse>('/api/talent/resumes/excel-import/', fd)
  return res.data
}

export interface ListCandidateExperiencesParams {
  candidate: number
  page?: number
}

export async function listCandidateExperiences(
  params: ListCandidateExperiencesParams,
): Promise<{ items: CandidateExperienceRow[]; count?: number }> {
  const res = await api.get('/api/talent/experiences/', { params })
  return unwrapDrfResults<CandidateExperienceRow>(res.data)
}

export interface ListCandidateEducationsParams {
  candidate: number
  page?: number
}

export async function listCandidateEducations(
  params: ListCandidateEducationsParams,
): Promise<{ items: CandidateEducationRow[]; count?: number }> {
  const res = await api.get('/api/talent/educations/', { params })
  return unwrapDrfResults<CandidateEducationRow>(res.data)
}

export interface ListCandidateSkillsParams {
  candidate: number
  page?: number
}

export async function listCandidateSkills(
  params: ListCandidateSkillsParams,
): Promise<{ items: CandidateSkillRow[]; count?: number }> {
  const res = await api.get('/api/talent/skills/', { params })
  return unwrapDrfResults<CandidateSkillRow>(res.data)
}

export interface ListParsedResumesParams {
  resume?: number
  page?: number
}

export async function listParsedResumes(params?: ListParsedResumesParams): Promise<{ items: ParsedResumeRow[]; count?: number }> {
  const res = await api.get('/api/talent/parsed-resumes/', { params })
  return unwrapDrfResults<ParsedResumeRow>(res.data)
}

export async function getResumeStatus(id: number): Promise<{ status: string; parsed_status: string }> {
  const res = await api.get(`/api/talent/resumes/${id}/status/`)
  return res.data as { status: string; parsed_status: string }
}

export interface ReprocessResumeOptions {
  override_duplicate?: boolean
  note?: string
}

export async function reprocessResume(id: number, opts?: ReprocessResumeOptions): Promise<{ detail: string }> {
  const res = await api.post(`/api/talent/resumes/${id}/reprocess/`, opts ?? {})
  return res.data as { detail: string }
}

export async function markResumeReviewed(id: number): Promise<{ detail: string }> {
  const res = await api.post(`/api/talent/resumes/${id}/mark-reviewed/`, {})
  return res.data as { detail: string }
}

export interface ListResumeReviewQueueParams {
  status?: string
  document_type?: string
  source_type?: string
  uploaded_by?: string | number
  confidence_below?: string | number
  candidate?: string
  uploaded_from?: string
  uploaded_to?: string
  reason_contains?: string
}

export async function listResumeReviewQueue(
  params?: ListResumeReviewQueueParams,
): Promise<{ items: ResumeReviewQueueItem[]; count?: number }> {
  const res = await api.get('/api/talent/resumes/review-queue/', { params })
  return unwrapDrfResults<ResumeReviewQueueItem>(res.data)
}

export async function getResumeReviewDetail(id: number): Promise<ResumeReviewDetail> {
  const res = await api.get(`/api/talent/resumes/${id}/review-detail/`)
  return res.data as ResumeReviewDetail
}

export async function applyResumeReview(id: number, payload: ApplyReviewPayload): Promise<TalentResumeReviewRow> {
  const res = await api.post(`/api/talent/resumes/${id}/apply-review/`, payload)
  return res.data as TalentResumeReviewRow
}

export async function getResumeReviewHistory(id: number): Promise<TalentResumeReviewRow[]> {
  const res = await api.get(`/api/talent/resumes/${id}/review-history/`)
  const result = unwrapDrfResults<TalentResumeReviewRow>(res.data)
  return result.items
}

export async function resolveResumeDuplicate(
  id: number,
  payload: DuplicateResolutionPayload,
): Promise<TalentResumeReviewRow> {
  const res = await api.post(`/api/talent/resumes/${id}/resolve-duplicate/`, payload)
  return res.data as TalentResumeReviewRow
}

/** POST /api/talent/candidates/{id}/merge/ — merge source candidate into target */
export async function mergeCandidate(id: number, payload: CandidateMergeInput): Promise<CandidateMergeResult> {
  const res = await api.post<CandidateMergeResult>(`/api/talent/candidates/${id}/merge/`, payload)
  return res.data
}

export async function duplicateMergeCandidates(
  targetId: number,
  sourceIds: number[],
  inputs: CandidateMergeInput
): Promise<CandidateMergeResult> {
  const res = await api.post<CandidateMergeResult>(`/talent/candidates/${targetId}/merge_duplicates/`, {
    source_ids: sourceIds,
    ...inputs,
  })
  return res.data
}

export async function bulkGenerateResumes(file: File, options?: { collarType?: string, billingType?: string }): Promise<{ message: string }> {
  const formData = new FormData()
  formData.append('file', file)
  if (options?.collarType) formData.append('collar_type', options.collarType)
  if (options?.billingType) formData.append('billing_type', options.billingType)
  
  const res = await api.post<{ message: string }>('/api/talent/resumes/bulk-generate/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return res.data
}

/** GET /api/talent/resumes/excel-template/ — download standard import template */
export async function downloadResumeExcelTemplate(): Promise<void> {
  const res = await api.get('/api/talent/resumes/excel-template/', { responseType: 'blob' })
  saveBlob(res.data as Blob, 'candidate_import_template.csv')
}
