import type { MRFRow } from '@/features/mrf/types'
import { useAuthStore } from '@/features/auth/authStore'
import { isClientFacingUser } from '@/lib/userRoleMode'

export { isClientFacingUser } from '@/lib/userRoleMode'

export function useClientMrfWorkspace(
  initialMrf: MRFRow | null | undefined,
): boolean {
  const me = useAuthStore((s) => s.me)
  if (initialMrf?.requested_by_type === 'client') return true
  return isClientFacingUser(me)
}

export function parseRateAmount(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number(String(value).replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : null
}

export type BillingRateCompareStatus = 'equal' | 'over' | 'under' | 'unknown'

export function compareBillingRates(
  requested: string | null | undefined,
  approved: string | null | undefined,
): BillingRateCompareStatus {
  const req = parseRateAmount(requested)
  const app = parseRateAmount(approved)
  if (req == null || app == null) return 'unknown'
  if (req > app) return 'over'
  if (req < app) return 'under'
  return 'equal'
}

export function lineTotalAmount(requestedRate: string, headcount: string): number {
  const rate = parseRateAmount(requestedRate)
  const hc = Number(headcount)
  if (rate == null || !Number.isFinite(hc) || hc < 1) return 0
  return rate * hc
}
