import { formatBudgetAmount } from '@/features/budgets/types'

/** Format an integer count with locale thousands separator. */
export function formatCount(n: number): string {
  return new Intl.NumberFormat(undefined).format(n)
}

/** Format a decimal string as a currency amount (defaults to INR). */
export function formatMoney(amount: string | number, currency = 'INR'): string {
  return formatBudgetAmount(String(amount), currency)
}

/** Safe percentage: returns 0 when total is zero. */
export function percentOf(part: number, total: number): number {
  if (!total) return 0
  return Math.min(100, Math.round((part / total) * 100))
}

// ─── MRF status labels ──────────────────────────────────────────────────────

const MRF_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  hr_review: 'HR review',
  finance_review: 'Finance review',
  admin_review: 'Admin review',
  client_review: 'Client review',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}

export function mrfStatusLabel(status: string): string {
  return MRF_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

// ─── Onboarding status labels ────────────────────────────────────────────────

const ONBOARDING_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  finalized: 'Finalized',
  failed: 'Failed',
}

export function onboardingStatusLabel(status: string): string {
  return ONBOARDING_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

// ─── Status badge variants ────────────────────────────────────────────────────

export type StatusBadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'

export function mrfStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'draft': return 'neutral'
    case 'submitted':
    case 'hr_review':
    case 'finance_review':
    case 'admin_review':
    case 'client_review': return 'info'
    case 'approved': return 'success'
    case 'rejected':
    case 'cancelled': return 'danger'
    default: return 'neutral'
  }
}

export function onboardingStatusVariant(status: string): StatusBadgeVariant {
  switch (status) {
    case 'draft': return 'neutral'
    case 'in_review': return 'info'
    case 'approved': return 'success'
    case 'rejected': return 'danger'
    case 'finalized': return 'success'
    case 'failed': return 'danger'
    default: return 'neutral'
  }
}

/** Parse amount strings safely; returns 0 for invalid values. */
export function parseAmount(amount: string | number | null | undefined): number {
  if (amount == null || amount === '') return 0
  const n = typeof amount === 'number' ? amount : Number(amount)
  return Number.isFinite(n) ? n : 0
}

/** Compact count for chart labels (e.g. 1.2k). */
export function formatCompactCount(n: number): string {
  if (!Number.isFinite(n)) return '0'
  if (Math.abs(n) < 1000) return formatCount(n)
  if (Math.abs(n) < 1_000_000) {
    const v = n / 1000
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)}k`
  }
  const v = n / 1_000_000
  return `${v >= 10 ? Math.round(v) : v.toFixed(1)}M`
}

/** Format an ISO datetime string to a short human-readable date. */
export function formatShortDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return isoString.slice(0, 10)
  }
}
