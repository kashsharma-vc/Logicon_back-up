import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type { CandidateRow } from '@/features/talent/types'
import type {
  BulkSendToClientReviewInput,
  CandidateMatchResultRow,
  CandidatePoolResultRow,
  ClientDecisionInput,
  ClientReviewApplicationRow,
  HiringApplicationRow,
  ApplicationStageHistoryBriefRow,
  HiringApplicationWriteInput,
  HiringDeploymentConversionInput,
  HiringDeploymentConversionResult,
  HiringDemandRow,
  ApplyInterviewPlanResult,
  InterviewAssignmentState,
  InterviewAssignmentsResponse,
  InterviewCreateInput,
  InterviewFeedbackCreateInput,
  InterviewFeedbackRow,
  InterviewPlanRow,
  InterviewPipelineResponse,
  InterviewRow,
  InterviewUpdateInput,
  MoveStageInput,
  OfferActionInput,
  OfferCreateInput,
  OfferRow,
  OfferUpdateInput,
  PipelineStageRow,
  SendToClientReviewInput,
  ShortlistCandidateInput,
} from '@/features/hiring/types'

export interface ListHiringDemandsParams {
  mrf?: number
  job_role?: number
  page?: number
  // Lane filters
  billing_type?: 'billable' | 'non_billable'
  hiring_lane?: 'client_billable' | 'internal_non_billable'
}

export async function listHiringDemands(params?: ListHiringDemandsParams): Promise<{ items: HiringDemandRow[]; count?: number }> {
  const res = await api.get('/api/hiring/demands/', { params })
  return unwrapDrfResults<HiringDemandRow>(res.data)
}

export async function getHiringDemand(id: number): Promise<HiringDemandRow> {
  const res = await api.get(`/api/hiring/demands/${id}/`)
  return res.data as HiringDemandRow
}

export interface ListDemandCandidatePoolParams {
  ranked?: 'true' | 'false'
  role?: string
  location?: string
  skill?: string
  min_experience?: string | number
  max_experience?: string | number
  page?: number
}

export async function listDemandCandidatePool(
  demandId: number,
  params?: ListDemandCandidatePoolParams,
): Promise<{ items: CandidateRow[]; count?: number }> {
  const res = await api.get(`/api/hiring/demands/${demandId}/candidate-pool/`, {
    params: { ranked: 'false', ...params },
  })
  return unwrapDrfResults<CandidateRow>(res.data)
}

export interface ListPipelineStagesParams {
  stage_type?: string
  is_terminal?: boolean
  page?: number
}

export async function listPipelineStages(params?: ListPipelineStagesParams): Promise<{ items: PipelineStageRow[]; count?: number }> {
  const res = await api.get('/api/hiring/pipeline-stages/', { params })
  return unwrapDrfResults<PipelineStageRow>(res.data)
}

export interface ListHiringApplicationsParams {
  org?: number
  site?: number
  job_role?: number
  status?: string
  client_visible?: boolean
  client_decision?: string
  search?: string
  page?: number
  page_size?: number
}

export async function listHiringApplications(
  params?: ListHiringApplicationsParams,
): Promise<{ items: HiringApplicationRow[]; count?: number }> {
  const res = await api.get('/api/hiring/applications/', {
    params: {
      ...params,
      client_visible: typeof params?.client_visible === 'boolean' ? String(params.client_visible) : params?.client_visible,
    },
  })
  return unwrapDrfResults<HiringApplicationRow>(res.data)
}

export async function getHiringApplicationTimeline(id: number): Promise<ApplicationStageHistoryBriefRow[]> {
  const res = await api.get(`/api/hiring/applications/${id}/timeline/`)
  return res.data
}

export async function getTATDashboard(params?: ListHiringApplicationsParams): Promise<{ items: HiringApplicationRow[]; count?: number }> {
  const res = await api.get('/api/hiring/applications/tat-dashboard/', {
    params: { page_size: 50, ...params },
  })
  return unwrapDrfResults<HiringApplicationRow>(res.data)
}

export async function getHiringApplication(id: number): Promise<HiringApplicationRow> {
  const res = await api.get(`/api/hiring/applications/${id}/`)
  return res.data as HiringApplicationRow
}

export async function createHiringApplication(payload: HiringApplicationWriteInput): Promise<HiringApplicationRow> {
  const res = await api.post('/api/hiring/applications/', payload)
  return res.data as HiringApplicationRow
}

export async function updateHiringApplication(
  id: number,
  payload: Partial<{ client_visible: boolean; client_decision: string | null; client_decision_note: string; match_score: string | null }>,
): Promise<HiringApplicationRow> {
  const res = await api.patch(`/api/hiring/applications/${id}/`, payload)
  return res.data as HiringApplicationRow
}

export async function moveHiringApplicationStage(id: number, payload: MoveStageInput): Promise<HiringApplicationRow> {
  const body: Record<string, unknown> = {}
  if (payload.stage_id != null) body.stage_id = payload.stage_id
  if (payload.status != null && payload.status !== '') body.status = payload.status
  if (payload.comment != null) body.comment = payload.comment
  const res = await api.post(`/api/hiring/applications/${id}/move-stage/`, body)
  return res.data as HiringApplicationRow
}

export interface ListCandidateMatchResultsParams {
  org?: number
  candidate?: number
  mrf_line_item?: number
  match_source?: string
  is_auto_match?: boolean
  page?: number
}

export async function listCandidateMatchResults(
  params?: ListCandidateMatchResultsParams,
): Promise<{ items: CandidateMatchResultRow[]; count?: number }> {
  const res = await api.get('/api/hiring/match-results/', {
    params: {
      ...params,
      is_auto_match: typeof params?.is_auto_match === 'boolean' ? String(params.is_auto_match) : params?.is_auto_match,
    },
  })
  return unwrapDrfResults<CandidateMatchResultRow>(res.data)
}

export async function sendApplicationToClientReview(id: number, payload: SendToClientReviewInput): Promise<{ result: string; application: HiringApplicationRow }> {
  const res = await api.post(`/api/hiring/applications/${id}/send-to-client-review/`, payload)
  return res.data as { result: string; application: HiringApplicationRow }
}

export async function recordClientDecision(id: number, payload: ClientDecisionInput): Promise<HiringApplicationRow> {
  const res = await api.post(`/api/hiring/applications/${id}/client-decision/`, payload)
  return res.data as HiringApplicationRow
}

export async function convertApplicationToDeployment(
  id: number,
  payload: HiringDeploymentConversionInput,
): Promise<HiringDeploymentConversionResult> {
  const res = await api.post(`/api/hiring/applications/${id}/convert-to-deployment/`, payload)
  return res.data as HiringDeploymentConversionResult
}

export interface RankedCandidatePoolParams {
  ranked?: 'true' | 'false'
  min_score?: string | number
  save_results?: 'true' | 'false'
  skills?: string
  min_experience?: string | number
  max_experience?: string | number
  location?: string
  page?: number
}

export async function getRankedCandidatePool(
  demandId: number,
  params?: RankedCandidatePoolParams,
): Promise<{ items: CandidatePoolResultRow[]; count?: number }> {
  const res = await api.get(`/api/hiring/demands/${demandId}/candidate-pool/`, {
    params: { ranked: 'true', ...params },
  })
  return unwrapDrfResults<CandidatePoolResultRow>(res.data)
}

export async function shortlistCandidateForDemand(
  demandId: number,
  payload: ShortlistCandidateInput,
): Promise<HiringApplicationRow> {
  const res = await api.post(`/api/hiring/demands/${demandId}/shortlist-candidate/`, payload)
  return res.data as HiringApplicationRow
}

export async function sendShortlistedToClientReview(
  demandId: number,
  payload: BulkSendToClientReviewInput,
): Promise<{ sent: number; skipped: number; errors: unknown[] }> {
  const res = await api.post(`/api/hiring/demands/${demandId}/send-shortlisted-to-client-review/`, payload)
  return res.data as { sent: number; skipped: number; errors: unknown[] }
}

// Offers

export interface ListOffersParams {
  status?: string
  joining_date?: string
  hiring_application?: number
  page?: number
}

export async function listOffers(params?: ListOffersParams): Promise<{ items: OfferRow[]; count?: number }> {
  const res = await api.get('/api/hiring/offers/', { params })
  return unwrapDrfResults<OfferRow>(res.data)
}

export async function getOffer(id: number): Promise<OfferRow> {
  const res = await api.get(`/api/hiring/offers/${id}/`)
  return res.data as OfferRow
}

export async function createOffer(payload: OfferCreateInput): Promise<OfferRow> {
  const res = await api.post('/api/hiring/offers/', payload)
  return res.data as OfferRow
}

export async function updateOffer(id: number, payload: OfferUpdateInput): Promise<OfferRow> {
  const res = await api.patch(`/api/hiring/offers/${id}/`, payload)
  return res.data as OfferRow
}

export async function releaseOffer(id: number, payload: OfferActionInput = {}): Promise<OfferRow> {
  const res = await api.post(`/api/hiring/offers/${id}/release/`, payload)
  return res.data as OfferRow
}

export async function acceptOffer(id: number, payload: OfferActionInput = {}): Promise<OfferRow> {
  const res = await api.post(`/api/hiring/offers/${id}/accept/`, payload)
  return res.data as OfferRow
}

export async function declineOffer(id: number, payload: OfferActionInput = {}): Promise<OfferRow> {
  const res = await api.post(`/api/hiring/offers/${id}/decline/`, payload)
  return res.data as OfferRow
}

export async function withdrawOffer(id: number, payload: OfferActionInput = {}): Promise<OfferRow> {
  const res = await api.post(`/api/hiring/offers/${id}/withdraw/`, payload)
  return res.data as OfferRow
}

export async function expireOffer(id: number, payload: OfferActionInput = {}): Promise<OfferRow> {
  const res = await api.post(`/api/hiring/offers/${id}/expire/`, payload)
  return res.data as OfferRow
}

// Interviews

export interface ListInterviewsParams {
  hiring_application?: number
  round_type?: string
  status?: string
  mode?: string
  page?: number
}

export async function listInterviews(params?: ListInterviewsParams): Promise<{ items: InterviewRow[]; count?: number }> {
  const res = await api.get('/api/hiring/interviews/', { params })
  return unwrapDrfResults<InterviewRow>(res.data)
}

export async function createInterview(payload: InterviewCreateInput): Promise<InterviewRow> {
  const res = await api.post('/api/hiring/interviews/', payload)
  return res.data as InterviewRow
}

export async function updateInterview(id: number, payload: InterviewUpdateInput): Promise<InterviewRow> {
  const res = await api.patch(`/api/hiring/interviews/${id}/`, payload)
  return res.data as InterviewRow
}

export interface ListInterviewFeedbackParams {
  interview?: number
  recommendation?: string
  given_by?: number
  page?: number
}

export async function listInterviewFeedback(
  params?: ListInterviewFeedbackParams,
): Promise<{ items: InterviewFeedbackRow[]; count?: number }> {
  const res = await api.get('/api/hiring/interview-feedbacks/', { params })
  return unwrapDrfResults<InterviewFeedbackRow>(res.data)
}

export async function createInterviewFeedback(payload: InterviewFeedbackCreateInput): Promise<InterviewFeedbackRow> {
  const res = await api.post('/api/hiring/interview-feedbacks/', payload)
  return res.data as InterviewFeedbackRow
}

// Interview plans + pipeline

export interface ListInterviewPlansParams {
  job_role?: number
  is_default?: boolean
  is_active?: boolean
  page?: number
}

export async function listInterviewPlans(
  params?: ListInterviewPlansParams,
): Promise<{ items: InterviewPlanRow[]; count?: number }> {
  const res = await api.get('/api/hiring/interview-plans/', {
    params: {
      ...params,
      is_default: typeof params?.is_default === 'boolean' ? String(params.is_default) : params?.is_default,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : params?.is_active,
    },
  })
  return unwrapDrfResults<InterviewPlanRow>(res.data)
}

export async function getInterviewPlan(id: number): Promise<InterviewPlanRow> {
  const res = await api.get(`/api/hiring/interview-plans/${id}/`)
  return res.data as InterviewPlanRow
}

export async function applyInterviewPlan(applicationId: number, plan: number): Promise<ApplyInterviewPlanResult> {
  const res = await api.post(`/api/hiring/applications/${applicationId}/apply-interview-plan/`, { plan })
  return res.data as ApplyInterviewPlanResult
}

export async function getInterviewPipeline(): Promise<InterviewPipelineResponse> {
  const res = await api.get('/api/hiring/applications/interview-pipeline/')
  return res.data as InterviewPipelineResponse
}

// Client review

export interface ListClientReviewParams {
  client_decision?: string
  site?: number
  mrf?: number
  mrf_line_item?: number
  status?: string
  job_role?: number
  search?: string
  only_pending?: boolean
  page?: number
}

export async function listClientReviewApplications(
  params?: ListClientReviewParams,
): Promise<{ items: ClientReviewApplicationRow[]; count?: number }> {
  const res = await api.get('/api/hiring/client-review/', {
    params: {
      ...params,
      only_pending: typeof params?.only_pending === 'boolean' ? String(params.only_pending) : params?.only_pending,
    },
  })
  return unwrapDrfResults<ClientReviewApplicationRow>(res.data)
}

// Interview assignments

export interface ListInterviewAssignmentsParams {
  mine?: boolean
  assignment_state?: 'all' | InterviewAssignmentState
}

export async function listInterviewAssignments(
  params?: ListInterviewAssignmentsParams,
): Promise<InterviewAssignmentsResponse> {
  const res = await api.get('/api/hiring/interviews/assignments/', {
    params: {
      ...params,
      mine: typeof params?.mine === 'boolean' ? String(params.mine) : undefined,
    },
  })
  return res.data as InterviewAssignmentsResponse
}
