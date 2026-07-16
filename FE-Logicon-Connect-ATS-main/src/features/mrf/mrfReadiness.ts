import axios from 'axios'
import type {
  MRFLineItemRow,
  MRFReadinessBudget,
  MRFReadinessLineItem,
  MRFReadinessResponse,
  MRFRow,
} from '@/features/mrf/types'
import { parseApiError } from '@/lib/apiError'

/** Raw API payload (supports current billable_headcount shape and future line_items). */
interface RawMrfReadinessPayload {
  ok?: boolean
  errors?: string[]
  warnings?: string[]
  line_items?: MRFReadinessLineItem[]
  billable_headcount?: Record<
    string,
    {
      job_role?: string
      requested?: number
      already_allocated?: number
      approved_headcount?: number
      available?: number
    }
  >
  budget?: {
    budget_plan_id?: number | null
    plan_id?: number | null
    plan_name?: string | null
    plan_code?: string | null
    scope?: string | null
    total_amount?: string | number | null
    required_amount?: string | number
    available_amount?: string | number
    requested_amount?: string | number | null
    available_after_request?: string | number | null
    reserved_amount?: string | number
    committed_amount?: string | number
    sufficient?: boolean
    ok?: boolean
  } | null
}

function strAmount(v: string | number | null | undefined): string {
  if (v == null || v === '') return '0'
  return String(v)
}

function lineItemEstimatedAmount(li: MRFLineItemRow): string {
  if (li.budget_max) return String(li.budget_max)
  if (li.budget_min) return String(li.budget_min)
  return '0'
}

function buildLineItems(raw: RawMrfReadinessPayload, mrf: MRFRow): MRFReadinessLineItem[] {
  if (raw.line_items?.length) {
    return raw.line_items
  }

  const headcountById = raw.billable_headcount ?? {}
  const mrfLineItems = mrf.line_items ?? []

  if (!mrfLineItems.length) {
    return []
  }

  return mrfLineItems.map((li) => {
    const entry = headcountById[String(li.id)]
    const requested = entry?.requested ?? li.headcount
    const approved = entry?.approved_headcount ?? null
    const allocated = entry?.already_allocated ?? 0
    const remaining = entry?.available ?? null

    const itemErrors: string[] = []
    if (mrf.billing_type === 'billable') {
      if (!li.site_role_requirement) {
        itemErrors.push('Link a site role requirement for this billable line item.')
      } else if (remaining != null && requested > remaining) {
        itemErrors.push(
          `Requested ${requested} exceeds remaining ${remaining} (approved ${approved ?? '—'}, allocated ${allocated}).`,
        )
      }
    }

    const globalForRole = (raw.errors ?? []).filter((e) =>
      entry?.job_role ? e.includes(entry.job_role) : false,
    )

    return {
      line_item_id: li.id,
      ok: itemErrors.length === 0 && globalForRole.length === 0,
      errors: [...itemErrors, ...globalForRole],
      warnings: [],
      requested_headcount: requested,
      approved_headcount: approved,
      already_allocated_headcount: allocated,
      remaining_headcount: remaining,
      estimated_amount: lineItemEstimatedAmount(li),
    }
  })
}

function normalizeReadinessBudget(b: NonNullable<RawMrfReadinessPayload['budget']>, mrf: MRFRow): MRFReadinessBudget {
  const planId = b.plan_id ?? b.budget_plan_id ?? mrf.budget_plan ?? null
  const requested = strAmount(b.requested_amount ?? b.required_amount)
  return {
    budget_plan_id: planId,
    plan_id: planId,
    plan_name: b.plan_name ?? mrf.resolved_budget_plan_name ?? mrf.budget_plan_name ?? null,
    plan_code: b.plan_code ?? mrf.resolved_budget_plan_code ?? mrf.budget_plan_code ?? null,
    scope: b.scope ?? mrf.resolved_budget_scope ?? null,
    total_amount: b.total_amount != null ? strAmount(b.total_amount) : mrf.resolved_budget_total_amount ?? null,
    available_amount: strAmount(b.available_amount ?? mrf.resolved_budget_available_amount),
    requested_amount: requested,
    available_after_request:
      b.available_after_request != null
        ? strAmount(b.available_after_request)
        : mrf.budget_after_request_available_amount ?? null,
    required_amount: requested,
    reserved_amount: strAmount(b.reserved_amount ?? mrf.resolved_budget_reserved_amount ?? mrf.budget_reserved_amount),
    committed_amount: strAmount(
      b.committed_amount ?? mrf.resolved_budget_committed_amount ?? mrf.budget_committed_amount,
    ),
    ok: b.ok ?? b.sufficient !== false,
    sufficient: b.sufficient ?? b.ok ?? true,
  }
}

function buildBudget(raw: RawMrfReadinessPayload, mrf: MRFRow): MRFReadinessBudget {
  const b = raw.budget
  const hasPlan = mrf.budget_plan != null || mrf.resolved_budget_plan_id != null

  if (b && (b.plan_id != null || b.budget_plan_id != null || b.scope != null || b.total_amount != null)) {
    return normalizeReadinessBudget(b, mrf)
  }

  if (b && ('budget_plan_id' in b || b.required_amount != null)) {
    return normalizeReadinessBudget(b, mrf)
  }

  const sufficient = b?.sufficient !== false
  const budgetErrors = (raw.errors ?? []).some((e) => e.toLowerCase().includes('budget'))

  return {
    budget_plan_id: mrf.budget_plan ?? mrf.resolved_budget_plan_id ?? null,
    plan_id: mrf.resolved_budget_plan_id ?? mrf.budget_plan ?? null,
    plan_name: mrf.resolved_budget_plan_name ?? mrf.budget_plan_name ?? null,
    plan_code: mrf.resolved_budget_plan_code ?? mrf.budget_plan_code ?? null,
    scope: mrf.resolved_budget_scope ?? null,
    total_amount: mrf.resolved_budget_total_amount ?? null,
    available_amount: strAmount(b?.available_amount ?? mrf.resolved_budget_available_amount),
    requested_amount: strAmount(mrf.requested_budget_amount ?? b?.required_amount),
    available_after_request: mrf.budget_after_request_available_amount ?? null,
    required_amount: strAmount(mrf.requested_budget_amount ?? b?.required_amount),
    reserved_amount: strAmount(mrf.resolved_budget_reserved_amount ?? mrf.budget_reserved_amount),
    committed_amount: strAmount(mrf.resolved_budget_committed_amount ?? mrf.budget_committed_amount),
    ok: !hasPlan || (sufficient && !budgetErrors),
    sufficient: sufficient && !budgetErrors,
  }
}

/** Normalize readiness API payload into stable frontend shape. */
export function normalizeMrfReadiness(raw: RawMrfReadinessPayload, mrf: MRFRow): MRFReadinessResponse {
  if (raw.line_items?.length && raw.budget) {
    return {
      ok: !!raw.ok,
      errors: raw.errors ?? [],
      warnings: raw.warnings ?? [],
      line_items: raw.line_items,
      budget: normalizeReadinessBudget(raw.budget, mrf),
    }
  }

  return {
    ok: !!raw.ok,
    errors: raw.errors ?? [],
    warnings: raw.warnings ?? [],
    line_items: buildLineItems(raw, mrf),
    budget: buildBudget(raw, mrf),
  }
}

/** Format workflow start failure with detail + errors array. */
export function formatMrfWorkflowStartError(error: unknown): string {
  const parsed = parseApiError(error, 'Send for approval failed')
  if (!axios.isAxiosError(error)) {
    return parsed.message
  }

  const data = error.response?.data as { detail?: string; errors?: string[] } | undefined
  const parts: string[] = []
  if (data?.detail) parts.push(String(data.detail))
  if (Array.isArray(data?.errors)) {
    for (const err of data.errors) {
      const s = String(err).trim()
      if (s && !parts.includes(s)) parts.push(s)
    }
  }
  if (parts.length) return parts.join('\n')
  return parsed.message
}
