import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type { UserRow } from '@/api/users'
import type {
  GenerateRoleRequirementsResult,
  ProposalBreakupLine,
  ProposalBudgetLine,
  ProposalComponentRule,
  ProposalComponentRuleWriteInput,
  ProposalVersion,
  ProposalVersionWriteInput,
  SalesActivity,
  SalesDashboardSummary,
  SalesDocument,
  SalesDocumentWriteInput,
  SalesLead,
  SalesLeadSite,
  SalesLeadSiteWriteInput,
  SalesLeadWriteInput,
  SalesRoleRequirement,
  SalesRoleRequirementWriteInput,
  SiteSurvey,
  SiteSurveyScopeAnswer,
  SiteSurveyEquipmentLine,
  SiteSurveyIssueLine,
  SiteSurveyLocationLine,
  SiteSurveyShiftDeployment,
  SiteSurveyStructuredResponse,
  SiteSurveyWriteInput,
  SurveyRoleMapping,
} from '@/types/sales'

// ─── Dashboard ────────────────────────────────────────────────────────────────

export async function getSalesDashboardSummary(): Promise<SalesDashboardSummary> {
  const { data } = await api.get<SalesDashboardSummary>('/api/sales/dashboard/summary/')
  return data
}

// ─── Sales Leads ──────────────────────────────────────────────────────────────

export interface ListSalesLeadsParams {
  search?: string
  lead_type?: string
  current_stage?: string
  sales_person?: number
  page?: number
}

export async function listSalesLeads(
  params?: ListSalesLeadsParams,
): Promise<{ items: SalesLead[]; count?: number }> {
  const res = await api.get('/api/sales/leads/', { params })
  return unwrapDrfResults<SalesLead>(res.data)
}

export async function getSalesLead(id: number): Promise<SalesLead> {
  const { data } = await api.get<SalesLead>(`/api/sales/leads/${id}/`)
  return data
}

export async function createSalesLead(payload: SalesLeadWriteInput): Promise<SalesLead> {
  const { data } = await api.post<SalesLead>('/api/sales/leads/', payload)
  return data
}

export async function updateSalesLead(
  id: number,
  payload: Partial<SalesLeadWriteInput>,
): Promise<SalesLead> {
  const { data } = await api.patch<SalesLead>(`/api/sales/leads/${id}/`, payload)
  return data
}

export async function submitLeadToOperations(
  id: number,
  payload?: { operations_owner?: number },
): Promise<SalesLead> {
  const { data } = await api.post<SalesLead>(`/api/sales/leads/${id}/submit-to-operations/`, payload ?? {})
  return data
}

export async function listEligibleOperationsOwnersForLead(
  id: number,
): Promise<{ items: UserRow[]; count?: number }> {
  const { data } = await api.get<UserRow[]>(`/api/sales/leads/${id}/eligible-operations-owners/`)
  return { items: data, count: data.length }
}

export interface GenerateProposalError {
  message: string
  missingRuleCodes: string[] | null
}

/**
 * Parse the 400 error from generate-proposal to extract missing rule codes
 */
function parseGenerateProposalError(error: unknown): GenerateProposalError {
  const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  if (typeof detail === 'string' && detail.includes('Missing active rules:')) {
    const match = detail.match(/Missing active rules:\s*(.+)$/i)
    if (match?.[1]) {
      const codes = match[1].split(',').map((c) => c.trim()).filter(Boolean)
      return { message: detail, missingRuleCodes: codes }
    }
    return { message: detail, missingRuleCodes: [] }
  }
  return { message: detail ?? 'Failed to generate proposal', missingRuleCodes: null }
}

export async function generateProposalForLead(id: number): Promise<ProposalVersion> {
  try {
    const { data } = await api.post<ProposalVersion>(`/api/sales/leads/${id}/generate-proposal/`, {})
    return data
  } catch (error) {
    const parsed = parseGenerateProposalError(error)
    if (parsed.missingRuleCodes !== null) {
      const err = new Error(parsed.message) as Error & { missingRuleCodes: string[] }
      err.missingRuleCodes = parsed.missingRuleCodes
      throw err
    }
    throw error
  }
}

// ─── Sales Lead Sites ─────────────────────────────────────────────────────────

export interface ListSalesLeadSitesParams {
  lead?: number
  page?: number
}

export async function listSalesLeadSites(
  params?: ListSalesLeadSitesParams,
): Promise<{ items: SalesLeadSite[]; count?: number }> {
  const res = await api.get('/api/sales/lead-sites/', { params })
  return unwrapDrfResults<SalesLeadSite>(res.data)
}

export async function createSalesLeadSite(payload: SalesLeadSiteWriteInput): Promise<SalesLeadSite> {
  const { data } = await api.post<SalesLeadSite>('/api/sales/lead-sites/', payload)
  return data
}

export async function updateSalesLeadSite(
  id: number,
  payload: Partial<SalesLeadSiteWriteInput>,
): Promise<SalesLeadSite> {
  const { data } = await api.patch<SalesLeadSite>(`/api/sales/lead-sites/${id}/`, payload)
  return data
}

// ─── Site Surveys ─────────────────────────────────────────────────────────────

export interface ListSiteSurveysParams {
  lead?: number
  status?: string
  assigned_to?: number
  page?: number
}

export async function listSiteSurveys(
  params?: ListSiteSurveysParams,
): Promise<{ items: SiteSurvey[]; count?: number }> {
  const res = await api.get('/api/sales/site-surveys/', { params })
  return unwrapDrfResults<SiteSurvey>(res.data)
}

export async function getSiteSurvey(id: number): Promise<SiteSurvey> {
  const { data } = await api.get<SiteSurvey>(`/api/sales/site-surveys/${id}/`)
  return data
}

export async function createSiteSurvey(payload: SiteSurveyWriteInput): Promise<SiteSurvey> {
  const { data } = await api.post<SiteSurvey>('/api/sales/site-surveys/', payload)
  return data
}

export async function updateSiteSurvey(
  id: number,
  payload: Partial<SiteSurveyWriteInput>,
): Promise<SiteSurvey> {
  const { data } = await api.patch<SiteSurvey>(`/api/sales/site-surveys/${id}/`, payload)
  return data
}

export async function getSiteSurveyStructured(id: number): Promise<SiteSurveyStructuredResponse> {
  const { data } = await api.get<SiteSurveyStructuredResponse>(
    `/api/sales/site-surveys/${id}/structured/`,
  )
  return data
}

export async function seedSiteSurveyDefaultLines(
  id: number,
  overwrite = false,
): Promise<SiteSurveyStructuredResponse> {
  const { data } = await api.post<SiteSurveyStructuredResponse>(
    `/api/sales/site-surveys/${id}/seed-default-lines/`,
    { overwrite },
  )
  return data
}

export async function assignSiteSurveyOwner(
  id: number,
  payload: { assigned_to: number },
): Promise<SiteSurvey> {
  const { data } = await api.post<SiteSurvey>(`/api/sales/site-surveys/${id}/assign-owner/`, payload)
  return data
}

export async function generateRoleRequirementsFromSurvey(id: number): Promise<GenerateRoleRequirementsResult> {
  const { data } = await api.post<GenerateRoleRequirementsResult>(
    `/api/sales/site-surveys/${id}/generate-role-requirements/`,
    {},
  )
  return data
}

export async function markSiteSurveyStarted(id: number): Promise<SiteSurvey> {
  const { data } = await api.post<SiteSurvey>(`/api/sales/site-surveys/${id}/mark-started/`, {})
  return data
}

export async function markSiteSurveyCompleted(id: number): Promise<SiteSurvey> {
  const { data } = await api.post<SiteSurvey>(`/api/sales/site-surveys/${id}/mark-completed/`, {})
  return data
}

// ─── Survey Role Mappings ─────────────────────────────────────────────────────

export interface ListSurveyRoleMappingsParams {
  org?: number
  job_role?: number
  wage_category?: number
  service_category?: string
  is_active?: boolean
  search?: string
  page?: number
}

export async function listSurveyRoleMappings(
  params?: ListSurveyRoleMappingsParams,
): Promise<{ items: SurveyRoleMapping[]; count?: number }> {
  const res = await api.get('/api/sales/survey-role-mappings/', { params })
  return unwrapDrfResults<SurveyRoleMapping>(res.data)
}

export interface SurveyRoleMappingPayload {
  org?: number
  description_text: string
  job_role: number
  wage_category: number
  service_category: string
  shift_hours: number
  working_days: number
  is_active?: boolean
}

export async function createSurveyRoleMapping(payload: SurveyRoleMappingPayload): Promise<SurveyRoleMapping> {
  const { data } = await api.post<SurveyRoleMapping>('/api/sales/survey-role-mappings/', payload)
  return data
}

export async function updateSurveyRoleMapping(id: number, payload: Partial<SurveyRoleMappingPayload>): Promise<SurveyRoleMapping> {
  const { data } = await api.patch<SurveyRoleMapping>(`/api/sales/survey-role-mappings/${id}/`, payload)
  return data
}

export async function deleteSurveyRoleMapping(id: number): Promise<void> {
  await api.delete(`/api/sales/survey-role-mappings/${id}/`)
}

// ─── Site Survey: Scope Answers ───────────────────────────────────────────────

export interface ListSiteSurveyScopeAnswersParams {
  survey?: number
  page?: number
}

export async function listSiteSurveyScopeAnswers(
  params?: ListSiteSurveyScopeAnswersParams,
): Promise<{ items: SiteSurveyScopeAnswer[]; count?: number }> {
  const res = await api.get('/api/sales/site-survey-scope-answers/', { params })
  return unwrapDrfResults<SiteSurveyScopeAnswer>(res.data)
}

export async function updateSiteSurveyScopeAnswer(
  id: number,
  payload: Partial<SiteSurveyScopeAnswer>,
): Promise<SiteSurveyScopeAnswer> {
  const { data } = await api.patch<SiteSurveyScopeAnswer>(
    `/api/sales/site-survey-scope-answers/${id}/`,
    payload,
  )
  return data
}

// ─── Site Survey: Shift Deployments ──────────────────────────────────────────

export interface ListSiteSurveyShiftDeploymentsParams {
  survey?: number
  page?: number
}

export async function listSiteSurveyShiftDeployments(
  params?: ListSiteSurveyShiftDeploymentsParams,
): Promise<{ items: SiteSurveyShiftDeployment[]; count?: number }> {
  const res = await api.get('/api/sales/site-survey-shift-deployments/', { params })
  return unwrapDrfResults<SiteSurveyShiftDeployment>(res.data)
}

export async function updateSiteSurveyShiftDeployment(
  id: number,
  payload: Partial<SiteSurveyShiftDeployment>,
): Promise<SiteSurveyShiftDeployment> {
  const { data } = await api.patch<SiteSurveyShiftDeployment>(
    `/api/sales/site-survey-shift-deployments/${id}/`,
    payload,
  )
  return data
}

export async function createSiteSurveyShiftDeployment(
  payload: Partial<SiteSurveyShiftDeployment> & { survey: number },
): Promise<SiteSurveyShiftDeployment> {
  const { data } = await api.post<SiteSurveyShiftDeployment>(
    '/api/sales/site-survey-shift-deployments/',
    payload,
  )
  return data
}

// ─── Site Survey: Location Lines ──────────────────────────────────────────────

export interface ListSiteSurveyLocationLinesParams {
  survey?: number
  page?: number
}

export async function listSiteSurveyLocationLines(
  params?: ListSiteSurveyLocationLinesParams,
): Promise<{ items: SiteSurveyLocationLine[]; count?: number }> {
  const res = await api.get('/api/sales/site-survey-location-lines/', { params })
  return unwrapDrfResults<SiteSurveyLocationLine>(res.data)
}

export async function updateSiteSurveyLocationLine(
  id: number,
  payload: Partial<SiteSurveyLocationLine>,
): Promise<SiteSurveyLocationLine> {
  const { data } = await api.patch<SiteSurveyLocationLine>(
    `/api/sales/site-survey-location-lines/${id}/`,
    payload,
  )
  return data
}

export async function createSiteSurveyLocationLine(
  payload: Partial<SiteSurveyLocationLine> & { survey: number },
): Promise<SiteSurveyLocationLine> {
  const { data } = await api.post<SiteSurveyLocationLine>(
    '/api/sales/site-survey-location-lines/',
    payload,
  )
  return data
}

// ─── Site Survey: Equipment Lines ────────────────────────────────────────────

export interface ListSiteSurveyEquipmentLinesParams {
  survey?: number
  page?: number
}

export async function listSiteSurveyEquipmentLines(
  params?: ListSiteSurveyEquipmentLinesParams,
): Promise<{ items: SiteSurveyEquipmentLine[]; count?: number }> {
  const res = await api.get('/api/sales/site-survey-equipment-lines/', { params })
  return unwrapDrfResults<SiteSurveyEquipmentLine>(res.data)
}

export async function updateSiteSurveyEquipmentLine(
  id: number,
  payload: Partial<SiteSurveyEquipmentLine>,
): Promise<SiteSurveyEquipmentLine> {
  const { data } = await api.patch<SiteSurveyEquipmentLine>(
    `/api/sales/site-survey-equipment-lines/${id}/`,
    payload,
  )
  return data
}

export async function createSiteSurveyEquipmentLine(
  payload: Partial<SiteSurveyEquipmentLine> & { survey: number },
): Promise<SiteSurveyEquipmentLine> {
  const { data } = await api.post<SiteSurveyEquipmentLine>(
    '/api/sales/site-survey-equipment-lines/',
    payload,
  )
  return data
}

// ─── Site Survey: Issue Lines ─────────────────────────────────────────────────

export interface ListSiteSurveyIssueLinesParams {
  survey?: number
  page?: number
}

export async function listSiteSurveyIssueLines(
  params?: ListSiteSurveyIssueLinesParams,
): Promise<{ items: SiteSurveyIssueLine[]; count?: number }> {
  const res = await api.get('/api/sales/site-survey-issue-lines/', { params })
  return unwrapDrfResults<SiteSurveyIssueLine>(res.data)
}

export async function updateSiteSurveyIssueLine(
  id: number,
  payload: Partial<SiteSurveyIssueLine>,
): Promise<SiteSurveyIssueLine> {
  const { data } = await api.patch<SiteSurveyIssueLine>(
    `/api/sales/site-survey-issue-lines/${id}/`,
    payload,
  )
  return data
}

export async function createSiteSurveyIssueLine(
  payload: Partial<SiteSurveyIssueLine> & { survey: number },
): Promise<SiteSurveyIssueLine> {
  const { data } = await api.post<SiteSurveyIssueLine>(
    '/api/sales/site-survey-issue-lines/',
    payload,
  )
  return data
}

// ─── Proposal Versions ────────────────────────────────────────────────────────

export interface ListProposalVersionsParams {
  lead?: number
  status?: string
  page?: number
}

export async function listProposalVersions(
  params?: ListProposalVersionsParams,
): Promise<{ items: ProposalVersion[]; count?: number }> {
  const res = await api.get('/api/sales/proposal-versions/', { params })
  return unwrapDrfResults<ProposalVersion>(res.data)
}

export async function getProposalVersion(id: number): Promise<ProposalVersion> {
  const { data } = await api.get<ProposalVersion>(`/api/sales/proposal-versions/${id}/`)
  return data
}

export async function updateProposalVersion(
  id: number,
  payload: Partial<ProposalVersionWriteInput>,
): Promise<ProposalVersion> {
  const { data } = await api.patch<ProposalVersion>(`/api/sales/proposal-versions/${id}/`, payload)
  return data
}

export async function cloneProposalRevision(
  id: number,
  payload?: { notes?: string },
): Promise<ProposalVersion> {
  const { data } = await api.post<ProposalVersion>(`/api/sales/proposal-versions/${id}/clone-revision/`, payload ?? {})
  return data
}

export async function submitProposalInternalApproval(
  id: number,
  payload?: { approval_route?: number | null },
): Promise<ProposalVersion> {
  const { data } = await api.post<ProposalVersion>(
    `/api/sales/proposal-versions/${id}/submit-internal-approval/`,
    payload ?? {},
  )
  return data
}

export interface SendProposalToClientPayload {
  recipient_email: string
  recipient_name?: string
  expires_days?: number | null
  email_subject?: string
  email_body?: string
  /** Legacy — not sent from UI; backend may still accept for older clients */
  note?: string
}

export interface SendProposalToClientResponse {
  proposal: ProposalVersion
  token_expires_at: string
  email_sent: boolean
  recipient_email: string
  email_subject?: string
  email_body?: string
}

export async function sendProposalToClient(
  id: number,
  payload: SendProposalToClientPayload,
): Promise<SendProposalToClientResponse> {
  const { data } = await api.post<SendProposalToClientResponse>(
    `/api/sales/proposal-versions/${id}/send-to-client/`,
    payload,
  )
  return data
}

export async function convertProposalToMobilisation(
  id: number,
  payload?: { operations_owner?: number | null },
): Promise<{ id: number }> {
  const { data } = await api.post<{ id: number }>(
    `/api/sales/proposal-versions/${id}/convert-to-onboarding/`,
    payload ?? {},
  )
  return data
}

// ─── Proposal Budget Lines ────────────────────────────────────────────────────

export interface ListProposalBudgetLinesParams {
  proposal_version?: number
  page?: number
}

export async function listProposalBudgetLines(
  params?: ListProposalBudgetLinesParams,
): Promise<{ items: ProposalBudgetLine[]; count?: number }> {
  const res = await api.get('/api/sales/proposal-budget-lines/', { params })
  return unwrapDrfResults<ProposalBudgetLine>(res.data)
}

export async function updateProposalBudgetLine(
  id: number,
  payload: Partial<ProposalBudgetLine>,
): Promise<ProposalBudgetLine> {
  const { data } = await api.patch<ProposalBudgetLine>(
    `/api/sales/proposal-budget-lines/${id}/`,
    payload,
  )
  return data
}

// ─── Proposal Breakup Lines ───────────────────────────────────────────────────

export interface ListProposalBreakupLinesParams {
  proposal_version?: number
  page?: number
}

export async function listProposalBreakupLines(
  params?: ListProposalBreakupLinesParams,
): Promise<{ items: ProposalBreakupLine[]; count?: number }> {
  const res = await api.get('/api/sales/proposal-breakup-lines/', { params })
  return unwrapDrfResults<ProposalBreakupLine>(res.data)
}

export async function updateProposalBreakupLine(
  id: number,
  payload: Partial<ProposalBreakupLine>,
): Promise<ProposalBreakupLine> {
  const { data } = await api.patch<ProposalBreakupLine>(
    `/api/sales/proposal-breakup-lines/${id}/`,
    payload,
  )
  return data
}

// ─── Proposal Component Rules ─────────────────────────────────────────────────

export interface ListProposalComponentRulesParams {
  is_active?: boolean
  component_type?: string
  page?: number
}

export async function listProposalComponentRules(
  params?: ListProposalComponentRulesParams,
): Promise<{ items: ProposalComponentRule[]; count?: number }> {
  const res = await api.get('/api/sales/proposal-component-rules/', { params })
  return unwrapDrfResults<ProposalComponentRule>(res.data)
}

export async function createProposalComponentRule(
  payload: ProposalComponentRuleWriteInput,
): Promise<ProposalComponentRule> {
  const { data } = await api.post<ProposalComponentRule>('/api/sales/proposal-component-rules/', payload)
  return data
}

export async function updateProposalComponentRule(
  id: number,
  payload: Partial<ProposalComponentRuleWriteInput>,
): Promise<ProposalComponentRule> {
  const { data } = await api.patch<ProposalComponentRule>(
    `/api/sales/proposal-component-rules/${id}/`,
    payload,
  )
  return data
}

export async function deleteProposalComponentRule(id: number): Promise<void> {
  await api.delete(`/api/sales/proposal-component-rules/${id}/`)
}

// ─── Sales Role Requirements ──────────────────────────────────────────────────

export interface ListSalesRoleRequirementsParams {
  lead?: number
  survey?: number
  page?: number
}

export async function listSalesRoleRequirements(
  params?: ListSalesRoleRequirementsParams,
): Promise<{ items: SalesRoleRequirement[]; count?: number }> {
  const res = await api.get('/api/sales/role-requirements/', { params })
  return unwrapDrfResults<SalesRoleRequirement>(res.data)
}

export async function createSalesRoleRequirement(
  payload: SalesRoleRequirementWriteInput,
): Promise<SalesRoleRequirement> {
  const { data } = await api.post<SalesRoleRequirement>('/api/sales/role-requirements/', payload)
  return data
}

export async function updateSalesRoleRequirement(
  id: number,
  payload: Partial<SalesRoleRequirementWriteInput>,
): Promise<SalesRoleRequirement> {
  const { data } = await api.patch<SalesRoleRequirement>(
    `/api/sales/role-requirements/${id}/`,
    payload,
  )
  return data
}

export async function deleteSalesRoleRequirement(id: number): Promise<void> {
  await api.delete(`/api/sales/role-requirements/${id}/`)
}

export async function approveSalesRoleRequirement(id: number): Promise<SalesRoleRequirement> {
  const { data } = await api.post<SalesRoleRequirement>(`/api/sales/role-requirements/${id}/approve/`, {})
  return data
}

// ─── Sales Activities ─────────────────────────────────────────────────────────

export interface ListSalesActivitiesParams {
  lead?: number
  page?: number
}

export async function listSalesActivities(
  params?: ListSalesActivitiesParams,
): Promise<{ items: SalesActivity[]; count?: number }> {
  const res = await api.get('/api/sales/activities/', { params })
  return unwrapDrfResults<SalesActivity>(res.data)
}

// ─── Sales Documents ──────────────────────────────────────────────────────────

export interface ListSalesDocumentsParams {
  lead?: number
  proposal_version?: number
  site?: number
  page?: number
}

export async function listSalesDocuments(
  params?: ListSalesDocumentsParams,
): Promise<{ items: SalesDocument[]; count?: number }> {
  const res = await api.get('/api/sales/documents/', { params })
  return unwrapDrfResults<SalesDocument>(res.data)
}

export async function uploadSalesDocument(
  payload: SalesDocumentWriteInput,
  file: File,
): Promise<SalesDocument> {
  const form = new FormData()
  form.append('lead', String(payload.lead))
  form.append('document_type', payload.document_type)
  form.append('title', payload.title)
  form.append('file', file)
  if (payload.proposal_version != null) form.append('proposal_version', String(payload.proposal_version))
  if (payload.site != null) form.append('site', String(payload.site))
  if (payload.notes) form.append('notes', payload.notes)
  const { data } = await api.post<SalesDocument>('/api/sales/documents/', form)
  return data
}

export async function deleteSalesDocument(id: number): Promise<void> {
  await api.delete(`/api/sales/documents/${id}/`)
}
