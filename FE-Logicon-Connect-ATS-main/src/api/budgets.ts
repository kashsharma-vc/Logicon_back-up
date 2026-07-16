import { api } from '@/api/client'
import { unwrapDrfResults, type DrfPaginated } from '@/types/api'
import type { BudgetPlanRow, BudgetPlanWritePayload } from '@/features/budgets/types'

export interface ListBudgetPlansParams {
  search?: string
  budget_nature?: string
  budget_type?: string
  client?: number
  site?: number
  department?: number
  status?: string
  is_active?: boolean
  page?: number
}

export async function listBudgetPlans(params: ListBudgetPlansParams) {
  const { data } = await api.get<DrfPaginated<BudgetPlanRow> | BudgetPlanRow[]>('/api/budgets/plans/', {
    params: {
      search: params.search || undefined,
      budget_nature: params.budget_nature || undefined,
      budget_type: params.budget_type || undefined,
      client: params.client ?? undefined,
      site: params.site ?? undefined,
      department: params.department ?? undefined,
      status: params.status || undefined,
      is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
      page: params.page ?? undefined,
    },
  })
  return unwrapDrfResults<BudgetPlanRow>(data)
}

export async function getBudgetPlan(id: number) {
  const { data } = await api.get<BudgetPlanRow>(`/api/budgets/plans/${id}/`)
  return data
}

export async function createBudgetPlan(payload: BudgetPlanWritePayload) {
  const { data } = await api.post<BudgetPlanRow>('/api/budgets/plans/', payload)
  return data
}

export async function updateBudgetPlan(id: number, payload: Partial<BudgetPlanWritePayload>) {
  const { data } = await api.patch<BudgetPlanRow>(`/api/budgets/plans/${id}/`, payload)
  return data
}

/** Soft-deactivate on backend (sets is_active=false, status=inactive). */
export async function deleteBudgetPlan(id: number) {
  await api.delete(`/api/budgets/plans/${id}/`)
}

export interface BudgetCommercialBudgetLine {
  id: number
  site: number | null
  site_name: string | null
  role_requirement: number | null
  service_category: string | null
  job_role: number | null
  job_role_name: string | null
  description: string | null
  manpower_count: number | null
  unit_cost: string
  total_cost: string
  sort_order: number
}

export interface BudgetCommercialBreakupLine {
  id: number
  site: number | null
  site_name: string | null
  role_requirement: number | null
  job_role: number | null
  job_role_name: string | null
  component_name: string | null
  component_type: string | null
  percentage: string | null
  amount: string
  sort_order: number
}

export interface BudgetCommercialProposal {
  id: number
  lead: number | null
  version_number: number
  grand_total: string
  subtotal_amount: string
  management_fee_amount: string
  gst_amount: string
  manpower_total: number | null
  management_fee_percent: string | null
  gst_applicable: boolean
  client_approval_status: string
  client_approved_at: string | null
  validity_days: number | null
}

export interface BudgetClientCommercials {
  budget: {
    id: number
    name: string
    code: string | null
    budget_nature: string
    budget_type: string
    client: number | null
    client_name: string | null
    site: number | null
    site_name: string | null
    period_start: string | null
    period_end: string | null
    amount: string
    reserved_amount: string
    committed_amount: string
    available_amount: string
    currency: string
    status: string
    is_active: boolean
    source_type: string | null
    source_sales_lead: number | null
    source_proposal_version: number | null
  }
  proposal: BudgetCommercialProposal | null
  budget_lines: BudgetCommercialBudgetLine[]
  breakup_lines: BudgetCommercialBreakupLine[]
}

/** Client-safe commercial view for an approved budget (no internal sales/approval metadata). */
export async function getBudgetClientCommercials(id: number) {
  const { data } = await api.get<BudgetClientCommercials>(`/api/budgets/plans/${id}/client-commercials/`)
  return data
}
