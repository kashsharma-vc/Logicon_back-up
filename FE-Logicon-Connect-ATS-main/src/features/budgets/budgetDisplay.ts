import { formatBudgetAmount } from '@/features/budgets/types'

export type BudgetReservationStatus = 'reserved' | 'committed' | 'released' | 'cancelled'

/** Matches `Badge` variants in `@/components/ui/Badge`. */
export type ReservationBadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'

/** Formats a decimal string amount for display; reuses shared budget formatting. */
export function formatMoneyAmount(amount: string | null | undefined, currency = 'INR'): string {
  if (amount == null || String(amount).trim() === '') return '—'
  return formatBudgetAmount(String(amount), currency || 'INR')
}

export function budgetReservationStatusLabel(status: BudgetReservationStatus | string | null | undefined): string {
  if (status == null || status === '') return 'Not reserved'
  switch (status) {
    case 'reserved':
      return 'Reserved'
    case 'committed':
      return 'Committed'
    case 'released':
      return 'Released'
    case 'cancelled':
      return 'Cancelled'
    default:
      return status.replace(/_/g, ' ')
  }
}

export function budgetReservationStatusVariant(
  status: BudgetReservationStatus | string | null | undefined,
): ReservationBadgeVariant {
  if (status == null || status === '') return 'neutral'
  switch (status) {
    case 'reserved':
      return 'attention'
    case 'committed':
      return 'success'
    case 'released':
      return 'neutral'
    case 'cancelled':
      return 'danger'
    default:
      return 'neutral'
  }
}

/** Short copy for the MRF approval section based on workflow and reservation state. */
export function mrfBudgetReservationWorkflowNote(
  workflowStatus: string | undefined,
  hasBudgetPlan: boolean,
  reservationStatus: BudgetReservationStatus | string | null | undefined,
): string | null {
  const st = reservationStatus ?? null
  if (st === 'committed') return 'Budget committed after approval.'
  if (st === 'reserved') return 'Budget reserved while approval is in progress.'
  if (st === 'released') return 'Budget reservation released.'
  if (st === 'cancelled') return 'Budget reservation cancelled.'
  if (workflowStatus === 'not_started' && hasBudgetPlan) {
    return 'Budget will be reserved when this MRF is sent for approval.'
  }
  return null
}
