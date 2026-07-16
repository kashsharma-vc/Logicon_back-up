import type { SiteRoleRequirementRow } from '@/api/siteRoleRequirements'
import type { MRFLineItemRow } from '@/features/mrf/types'

/** Shared commercial fields on line items (MRF + workflow drawer). */
export type CommercialLineItemFields = {
  master_wage_min_snapshot?: string | null
  master_wage_max_snapshot?: string | null
  master_billing_rate_snapshot?: string | null
  master_shift_hours_snapshot?: string | null
  srr_wage_min?: string | null
  srr_wage_max?: string | null
  srr_billing_rate?: string | null
  srr_shift_hours?: string | null
  wage_min_requested?: string | null
  wage_max_requested?: string | null
  billing_rate_snapshot?: string | null
  effective_wage_min?: string | null
  effective_wage_max?: string | null
  commercial_override_enabled?: boolean
  commercial_override_reason?: string | null
  commercial_overridden_at?: string | null
}

export interface MasterCommercialValues {
  wageMin: string
  wageMax: string
  billingRate: string
  shiftHours: string
}

function str(v: string | null | undefined): string {
  return v != null && v !== '' ? String(v) : ''
}

export function formatCommercialMoney(v: string | null | undefined): string | null {
  if (v == null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return v
  return `₹${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

export function formatWageRange(min: string | null | undefined, max: string | null | undefined): string | null {
  const a = formatCommercialMoney(min)
  const b = formatCommercialMoney(max)
  if (a && b) return `${a}–${b}`
  if (a) return a
  if (b) return b
  return null
}

/** Resolve master/SRR defaults for display and reset-on-disable. */
export function resolveMasterCommercials(
  row: CommercialLineItemFields | MRFLineItemRow | null | undefined,
  srr: SiteRoleRequirementRow | null | undefined,
): MasterCommercialValues {
  return {
    wageMin: str(row?.master_wage_min_snapshot ?? row?.srr_wage_min ?? srr?.wage_min),
    wageMax: str(row?.master_wage_max_snapshot ?? row?.srr_wage_max ?? srr?.wage_max),
    billingRate: str(row?.master_billing_rate_snapshot ?? row?.srr_billing_rate ?? srr?.billing_rate),
    shiftHours: str(row?.master_shift_hours_snapshot ?? row?.srr_shift_hours ?? srr?.shift_hours),
  }
}

export function isCommercialOverrideEnabled(row: CommercialLineItemFields | null | undefined): boolean {
  return Boolean(row?.commercial_override_enabled)
}

/** Effective wage range for display (requested or backend effective fields). */
export function effectiveWageRange(row: CommercialLineItemFields): {
  min: string | null
  max: string | null
} {
  const min = row.effective_wage_min ?? row.wage_min_requested
  const max = row.effective_wage_max ?? row.wage_max_requested
  return { min: min ?? null, max: max ?? null }
}

export function formatMasterCommercialSummary(master: MasterCommercialValues): string {
  const parts: string[] = []
  const wage = formatWageRange(master.wageMin, master.wageMax)
  if (wage) parts.push(`Wage ${wage}`)
  const billing = formatCommercialMoney(master.billingRate)
  if (billing) parts.push(`Billing ${billing}`)
  if (master.shiftHours) parts.push(`Shift ${master.shiftHours}h`)
  return parts.join(' · ') || '—'
}

export function formatRequestedCommercialSummary(row: CommercialLineItemFields): string {
  const { min, max } = effectiveWageRange(row)
  const parts: string[] = []
  const wage = formatWageRange(min, max)
  if (wage) parts.push(`Wage ${wage}`)
  const billing = formatCommercialMoney(row.billing_rate_snapshot)
  if (billing) parts.push(`Billing ${billing}`)
  return parts.join(' · ') || '—'
}

export function countCommercialOverrides(items: CommercialLineItemFields[]): number {
  return items.filter((li) => isCommercialOverrideEnabled(li)).length
}

/** Friendly label for readiness / warning strings from backend. */
export function friendlyCommercialReadinessWarning(msg: string): string | null {
  const lower = msg.toLowerCase()
  if (!lower.includes('commercial') && !lower.includes('override')) return null
  if (lower.includes('override')) {
    return 'Commercial override present — approver will review changed wage/billing values.'
  }
  return msg
}
