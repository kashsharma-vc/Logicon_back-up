import type { SiteRoleRequirementRow } from '@/api/siteRoleRequirements'
import type { MRFLineItemRow } from '@/features/mrf/types'

function formatMoneyShort(v: string | null | undefined): string | null {
  if (v == null || v === '') return null
  const n = Number(v)
  if (!Number.isFinite(n)) return v
  return `₹${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

/** Commercial summary: wage range, billing, shift. */
export function formatSrrCommercialSummary(srr: SiteRoleRequirementRow): string {
  const parts: string[] = []
  const wageMin = formatMoneyShort(srr.wage_min)
  const wageMax = formatMoneyShort(srr.wage_max)
  if (wageMin || wageMax) {
    parts.push(`Wage ${wageMin ?? '?'}–${wageMax ?? '?'}`)
  }
  const billing = formatMoneyShort(srr.billing_rate)
  if (billing) parts.push(`Billing ${billing}`)
  if (srr.shift_hours) parts.push(`Shift ${srr.shift_hours}h`)
  return parts.join(' | ')
}

/** Dropdown label for an SRR option. */
export function formatSrrOptionLabel(srr: SiteRoleRequirementRow, remainingHint?: number | null): string {
  const role = srr.job_role_name ?? `Role #${srr.job_role}`
  const wagePart = srr.wage_category_name ? ` - ${srr.wage_category_name}` : ''
  const locPart = srr.location_area_name ? ` - ${srr.location_area_name}` : ''
  const remaining =
    remainingHint != null ? remainingHint : srr.remaining_headcount ?? srr.approved_headcount
  const headPart = `approved ${srr.approved_headcount} / remaining ${remaining}`
  const commercial = formatSrrCommercialSummary(srr)
  const base = `${role}${wagePart}${locPart} - ${headPart}`
  return commercial ? `${base} | ${commercial}` : base
}

/** Available headcount for editing an existing line (remaining excludes current MRF). */
export function availableHeadcountForEdit(row: MRFLineItemRow): number | null {
  if (row.srr_remaining_headcount == null) return row.srr_approved_headcount ?? null
  return row.srr_remaining_headcount + row.headcount
}

/** Summary for line item table SRR column. */
export function formatLineItemSrrSummary(
  row: MRFLineItemRow,
  options?: { includeDepartment?: boolean },
): {
  primary: string
  secondary: string | null
} {
  if (!row.site_role_requirement) {
    return { primary: '—', secondary: null }
  }
  const primary = row.site_role_requirement_label?.trim() || `SRR #${row.site_role_requirement}`
  const parts: string[] = []
  if (options?.includeDepartment !== false && row.srr_department_name) {
    parts.push(row.srr_department_name)
  }
  if (row.srr_approved_headcount != null) {
    parts.push(`approved ${row.srr_approved_headcount}`)
  }
  if (row.srr_remaining_headcount != null) {
    parts.push(`remaining ${row.srr_remaining_headcount}`)
  }
  const commercial: string[] = []
  const wageMin = formatMoneyShort(row.srr_wage_min)
  const wageMax = formatMoneyShort(row.srr_wage_max)
  if (wageMin || wageMax) commercial.push(`Wage ${wageMin ?? '?'}–${wageMax ?? '?'}`)
  const billing = formatMoneyShort(row.srr_billing_rate)
  if (billing) commercial.push(`Billing ${billing}`)
  if (row.srr_shift_hours) commercial.push(`Shift ${row.srr_shift_hours}h`)
  const secondary = [parts.join(' · '), commercial.join(' | ')].filter(Boolean).join(' · ') || null
  return { primary, secondary }
}
