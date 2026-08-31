import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type {
  ApprovalAssignmentRow,
  ApprovalAssignmentWriteInput,
  ApprovalFlowRow,
  ApprovalFlowWriteInput,
  ApprovalPreviewResponse,
  ApprovalRuleRow,
  ApprovalRuleWriteInput,
  ApprovalStepRow,
  ApprovalStepWriteInput,
} from '@/features/approvalSetup/types'

const FLOWS = '/api/workflow/config/flows/'
const STEPS = '/api/workflow/config/steps/'
const RULES = '/api/workflow/config/rules/'
const ASSIGNMENTS = '/api/workflow/config/assignments/'
const PREVIEW = '/api/workflow/config/preview/'

// ─── Approval flows ───────────────────────────────────────────────────────────

export async function listApprovalFlows(params?: {
  search?: string
  trigger_type?: string
  is_active?: boolean
  page?: number
}): Promise<{ items: ApprovalFlowRow[]; count?: number }> {
  const res = await api.get(FLOWS, {
    params: {
      ...params,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
    },
  })
  return unwrapDrfResults<ApprovalFlowRow>(res.data)
}

export async function getApprovalFlow(id: number): Promise<ApprovalFlowRow> {
  const { data } = await api.get<ApprovalFlowRow>(`${FLOWS}${id}/`)
  return data
}

export async function createApprovalFlow(payload: ApprovalFlowWriteInput): Promise<ApprovalFlowRow> {
  const { data } = await api.post<ApprovalFlowRow>(FLOWS, payload)
  return data
}

export async function updateApprovalFlow(id: number, payload: Partial<ApprovalFlowWriteInput>): Promise<ApprovalFlowRow> {
  const { data } = await api.patch<ApprovalFlowRow>(`${FLOWS}${id}/`, payload)
  return data
}

export async function deleteApprovalFlow(id: number): Promise<void> {
  await api.delete(`${FLOWS}${id}/`)
}

// ─── Approval steps ───────────────────────────────────────────────────────────

export async function listApprovalSteps(params?: {
  template?: number
  search?: string
  page?: number
}): Promise<{ items: ApprovalStepRow[]; count?: number }> {
  const res = await api.get(STEPS, { params })
  return unwrapDrfResults<ApprovalStepRow>(res.data)
}

export async function getApprovalStep(id: number): Promise<ApprovalStepRow> {
  const { data } = await api.get<ApprovalStepRow>(`${STEPS}${id}/`)
  return data
}

export async function createApprovalStep(payload: ApprovalStepWriteInput): Promise<ApprovalStepRow> {
  const { data } = await api.post<ApprovalStepRow>(STEPS, payload)
  return data
}

export async function updateApprovalStep(id: number, payload: Partial<ApprovalStepWriteInput>): Promise<ApprovalStepRow> {
  const { data } = await api.patch<ApprovalStepRow>(`${STEPS}${id}/`, payload)
  return data
}

export async function deleteApprovalStep(id: number): Promise<void> {
  await api.delete(`${STEPS}${id}/`)
}

// ─── Flow rules (where it applies) ────────────────────────────────────────────

export async function listApprovalRules(params?: {
  trigger_type?: string
  client?: number
  site?: number
  is_active?: boolean
  page?: number
}): Promise<{ items: ApprovalRuleRow[]; count?: number }> {
  const res = await api.get(RULES, {
    params: {
      ...params,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
    },
  })
  return unwrapDrfResults<ApprovalRuleRow>(res.data)
}

export async function getApprovalRule(id: number): Promise<ApprovalRuleRow> {
  const { data } = await api.get<ApprovalRuleRow>(`${RULES}${id}/`)
  return data
}

export async function createApprovalRule(payload: ApprovalRuleWriteInput): Promise<ApprovalRuleRow> {
  const { data } = await api.post<ApprovalRuleRow>(RULES, payload)
  return data
}

export async function updateApprovalRule(id: number, payload: Partial<ApprovalRuleWriteInput>): Promise<ApprovalRuleRow> {
  const { data } = await api.patch<ApprovalRuleRow>(`${RULES}${id}/`, payload)
  return data
}

export async function deleteApprovalRule(id: number): Promise<void> {
  await api.delete(`${RULES}${id}/`)
}

// ─── Flow assignments (responsible people) ───────────────────────────────────

export async function listApprovalAssignments(params?: {
  trigger_type?: string
  step_code?: string
  template?: number
  client?: number
  site?: number
  is_active?: boolean
  page?: number
}): Promise<{ items: ApprovalAssignmentRow[]; count?: number }> {
  const res = await api.get(ASSIGNMENTS, {
    params: {
      ...params,
      is_active: typeof params?.is_active === 'boolean' ? String(params.is_active) : undefined,
    },
  })
  return unwrapDrfResults<ApprovalAssignmentRow>(res.data)
}

export async function getApprovalAssignment(id: number): Promise<ApprovalAssignmentRow> {
  const { data } = await api.get<ApprovalAssignmentRow>(`${ASSIGNMENTS}${id}/`)
  return data
}

export async function createApprovalAssignment(payload: ApprovalAssignmentWriteInput): Promise<ApprovalAssignmentRow> {
  const { data } = await api.post<ApprovalAssignmentRow>(ASSIGNMENTS, payload)
  return data
}

export async function updateApprovalAssignment(
  id: number,
  payload: Partial<ApprovalAssignmentWriteInput>,
): Promise<ApprovalAssignmentRow> {
  const { data } = await api.patch<ApprovalAssignmentRow>(`${ASSIGNMENTS}${id}/`, payload)
  return data
}

export async function deleteApprovalAssignment(id: number): Promise<void> {
  await api.delete(`${ASSIGNMENTS}${id}/`)
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export async function getApprovalSetupPreview(params: {
  request_type: string
  client?: number
  site?: number
}): Promise<ApprovalPreviewResponse> {
  const { data } = await api.get<ApprovalPreviewResponse>(PREVIEW, {
    params: {
      request_type: params.request_type,
      client: params.client ?? undefined,
      site: params.site ?? undefined,
    },
  })
  return data
}
