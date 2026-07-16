import type { SiteRoleRequirementRow } from '@/api/siteRoleRequirements'
import type { MRFLineItemRow, MRFLineItemWriteInput, MRFWriteInput } from '@/features/mrf/types'
import { lineTotalAmount, parseRateAmount, type BillingRateCompareStatus } from '@/features/mrf/mrfClientMode'

export type ClientRoleRequestRow = {
  localKey: string
  lineItemId?: number
  siteRoleRequirementId: string
  jobRoleId: string
  roleLabel: string
  approvedRate: string
  requestedRate: string
  headcount: string
}

export function newClientRoleRow(): ClientRoleRequestRow {
  return {
    localKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    siteRoleRequirementId: '',
    jobRoleId: '',
    roleLabel: '',
    approvedRate: '',
    requestedRate: '',
    headcount: '1',
  }
}

export function resolveApprovedRateFromSrr(srr: SiteRoleRequirementRow): string {
  return srr.billing_rate != null && srr.billing_rate !== '' ? String(srr.billing_rate) : ''
}

export function resolveApprovedRateFromLineItem(line: MRFLineItemRow): string {
  if (line.approved_billing_rate != null && line.approved_billing_rate !== '') {
    return String(line.approved_billing_rate)
  }
  if (line.srr_billing_rate != null && line.srr_billing_rate !== '') {
    return String(line.srr_billing_rate)
  }
  if (line.master_billing_rate_snapshot != null && line.master_billing_rate_snapshot !== '') {
    return String(line.master_billing_rate_snapshot)
  }
  return ''
}

export function resolveRequestedRateFromLineItem(line: MRFLineItemRow): string {
  if (line.requested_billing_rate != null && line.requested_billing_rate !== '') {
    return String(line.requested_billing_rate)
  }
  if (line.billing_rate_snapshot != null && line.billing_rate_snapshot !== '') {
    return String(line.billing_rate_snapshot)
  }
  return ''
}

export function clientRoleRowFromLineItem(line: MRFLineItemRow): ClientRoleRequestRow {
  const approved = resolveApprovedRateFromLineItem(line)
  const requested = resolveRequestedRateFromLineItem(line) || approved
  return {
    localKey: `line-${line.id}`,
    lineItemId: line.id,
    siteRoleRequirementId:
      line.site_role_requirement != null ? String(line.site_role_requirement) : '',
    jobRoleId: String(line.job_role),
    roleLabel:
      line.site_role_requirement_label?.trim() ||
      (line.site_role_requirement != null ? `SRR #${line.site_role_requirement}` : 'Role'),
    approvedRate: approved,
    requestedRate: requested,
    headcount: String(line.headcount ?? 1),
  }
}

export function applySrrToRoleRow(
  row: ClientRoleRequestRow,
  srr: SiteRoleRequirementRow,
): ClientRoleRequestRow {
  const approved = resolveApprovedRateFromSrr(srr)
  return {
    ...row,
    siteRoleRequirementId: String(srr.id),
    jobRoleId: String(srr.job_role),
    roleLabel: srr.job_role_name ?? `Role #${srr.job_role}`,
    approvedRate: approved,
    requestedRate: approved || row.requestedRate,
  }
}

export function clientLineItemWritePayload(
  mrfId: number,
  row: ClientRoleRequestRow,
): MRFLineItemWriteInput {
  const rate = parseRateAmount(row.requestedRate)
  return {
    mrf: mrfId,
    site_role_requirement: Number(row.siteRoleRequirementId),
    job_role: Number(row.jobRoleId),
    headcount: Number(row.headcount),
    billing_rate_snapshot: rate,
  }
}

export function clientMrfHeaderToWritePayload(input: {
  site: string
  required_by_date: string
  reason: string
}): MRFWriteInput {
  return {
    site: Number(input.site),
    requested_by_type: 'client',
    mrf_type: 'new_hiring',
    billing_type: 'billable',
    client_visible: true,
    required_by_date: input.required_by_date || null,
    reason: input.reason,
  }
}

export function getRateStatusMessage(status: BillingRateCompareStatus): string | null {
  if (status === 'over') {
    return 'This is above the approved budget rate and may need approval.'
  }
  if (status === 'under') {
    return 'Below approved budget rate.'
  }
  return null
}

export function getRateStatusVariant(
  status: BillingRateCompareStatus,
): 'warning' | 'neutral' | null {
  if (status === 'over') return 'warning'
  if (status === 'under') return 'neutral'
  return null
}

export function validateClientRoleRows(
  rows: ClientRoleRequestRow[],
): string | null {
  const filled = rows.filter((r) => r.siteRoleRequirementId.trim())
  if (filled.length === 0) return 'Add at least one role with headcount and requested rate.'

  const srrIds = new Set<string>()
  for (const row of filled) {
    if (srrIds.has(row.siteRoleRequirementId)) {
      return 'Each role can only be added once.'
    }
    srrIds.add(row.siteRoleRequirementId)

    const hc = Number(row.headcount)
    if (!Number.isFinite(hc) || hc < 1) return 'Headcount must be at least 1 for each role.'

    const rate = parseRateAmount(row.requestedRate)
    if (rate == null || rate <= 0) return 'Requested rate must be greater than zero for each role.'
  }
  return null
}

export function summarizeClientRequest(rows: ClientRoleRequestRow[]): {
  totalHeadcount: number
  totalAmount: number
} {
  let totalHeadcount = 0
  let totalAmount = 0
  for (const row of rows) {
    if (!row.siteRoleRequirementId.trim()) continue
    const hc = Number(row.headcount)
    if (Number.isFinite(hc) && hc >= 1) totalHeadcount += hc
    totalAmount += lineTotalAmount(row.requestedRate, row.headcount)
  }
  return { totalHeadcount, totalAmount }
}

export function summarizeMrfLineItems(items: MRFLineItemRow[]): {
  totalHeadcount: number
  totalAmount: number
} {
  let totalHeadcount = 0
  let totalAmount = 0
  for (const row of items) {
    const hc = row.headcount ?? 0
    if (hc >= 1) totalHeadcount += hc
    const lineAmount = Number(row.line_requested_amount ?? '')
    if (Number.isFinite(lineAmount) && lineAmount > 0) {
      totalAmount += lineAmount
      continue
    }
    const rate =
      row.requested_billing_rate ??
      row.billing_rate_snapshot ??
      row.srr_billing_rate ??
      row.master_billing_rate_snapshot ??
      ''
    totalAmount += lineTotalAmount(String(rate), String(hc))
  }
  return { totalHeadcount, totalAmount }
}

