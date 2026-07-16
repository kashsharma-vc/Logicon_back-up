import type { DashboardChartCountItem } from '@/features/dashboard/types'
import type { StatusBadgeVariant } from '@/features/dashboard/dashboardFormatters'

export function maxCount(items: { count: number }[]): number {
  if (!items.length) return 0
  return Math.max(...items.map((i) => i.count))
}

export function hasAnyCount(items: { count: number }[] | undefined): boolean {
  return Boolean(items?.some((i) => i.count > 0))
}

export function mrfStatusVariant(key: string): StatusBadgeVariant {
  switch (key) {
    case 'draft':
      return 'neutral'
    case 'in_review':
      return 'info'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'request_changes':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function onboardingStatusVariant(key: string): StatusBadgeVariant {
  switch (key) {
    case 'draft':
      return 'neutral'
    case 'in_review':
      return 'info'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
  }
  return 'neutral'
}

export function finalizationVariant(key: string): StatusBadgeVariant {
  switch (key) {
    case 'finalized':
      return 'success'
    case 'failed':
      return 'danger'
    case 'not_finalized':
      return 'attention'
    default:
      return 'neutral'
  }
}

export function hiringStatusVariant(key: string): StatusBadgeVariant {
  switch (key) {
    case 'open':
      return 'info'
    case 'selected':
      return 'attention'
    case 'joined':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function filterNonZeroCount(items: DashboardChartCountItem[]): DashboardChartCountItem[] {
  return items.filter((i) => i.count > 0)
}

export function activityTypeBadge(type: string, targetType?: string): string {
  const t = targetType ?? type
  if (t === 'mrf') return 'MRF'
  if (t === 'client_onboarding' || t === 'onboarding') return 'OB'
  return t.replace(/_/g, ' ').slice(0, 8).toUpperCase()
}
