/** Mirrors GET /api/budgets/plans/ serializer fields. */
export interface BudgetPlanRow {
  id: number
  org: number
  name: string
  code: string
  budget_nature: string
  budget_type: string
  client: number | null
  client_name?: string | null
  site: number | null
  site_name?: string | null
  department: number | null
  department_name?: string | null
  period_start: string
  period_end: string | null
  amount: string
  currency: string
  reserved_amount?: string | null
  committed_amount?: string | null
  available_amount?: string | null
  status: string
  notes: string
  is_active: boolean
  created_by: number | null
  created_by_username?: string | null
  updated_by: number | null
  updated_by_username?: string | null
  created_at: string
  updated_at: string
}

export type BudgetNature = 'billable' | 'non_billable'

export interface BudgetPlanWritePayload {
  name: string
  code: string
  budget_nature: string
  budget_type: string
  client?: number | null
  site?: number | null
  department?: number | null
  period_start: string
  period_end?: string | null
  amount: string
  currency: string
  status: string
  notes?: string
  is_active?: boolean
}

export const BUDGET_NATURE_OPTIONS: { value: BudgetNature; label: string }[] = [
  { value: 'billable', label: 'Billable' },
  { value: 'non_billable', label: 'Non-billable' },
]

export const BUDGET_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'onboarding', label: 'Mobilisation' },
  { value: 'manpower', label: 'Manpower' },
  { value: 'hiring', label: 'Hiring' },
  { value: 'operations', label: 'Operations' },
  { value: 'deployment', label: 'Deployment' },
  { value: 'general', label: 'General' },
]

export const BUDGET_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'inactive', label: 'Inactive' },
]

const TYPE_LABEL = Object.fromEntries(BUDGET_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export function budgetTypeLabel(code: string): string {
  return TYPE_LABEL[code] ?? code.replace(/_/g, ' ')
}

export function budgetNatureLabel(code: string): string {
  if (code === 'billable') return 'Billable'
  if (code === 'non_billable') return 'Non-billable'
  return code.replace(/_/g, ' ')
}

export function budgetAppliesToDisplay(row: BudgetPlanRow): string {
  if (row.budget_nature === 'non_billable') {
    return row.department_name?.trim() || (row.department != null ? `Department #${row.department}` : '—')
  }
  if (row.site != null) {
    const sitePart = row.site_name?.trim() || `Site #${row.site}`
    const clientPart = row.client_name?.trim() || (row.client != null ? `Client #${row.client}` : '')
    return clientPart ? `${sitePart} · ${clientPart}` : sitePart
  }
  return row.client_name?.trim() || (row.client != null ? `Client #${row.client}` : '—')
}

export function formatBudgetPeriod(start: string, end: string | null): string {
  const s = start.slice(0, 10)
  if (!end) return `${s} → —`
  return `${s} → ${end.slice(0, 10)}`
}

export function formatBudgetAmount(amount: string, currency: string): string {
  const n = Number(amount)
  if (!Number.isFinite(n)) return `${currency} ${amount}`
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${currency} ${amount}`
  }
}
