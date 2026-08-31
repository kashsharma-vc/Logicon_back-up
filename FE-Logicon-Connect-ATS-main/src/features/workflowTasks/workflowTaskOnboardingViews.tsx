import { formatBudgetAmount } from '@/features/budgets/types'
import { Badge } from '@/components/ui/Badge'

export function displayText(value: string | number | null | undefined): string {
  if (value == null) return '-'
  if (typeof value === 'string' && !value.trim()) return '-'
  return String(value)
}

export function humanize(value: string | null | undefined): string {
  if (!value?.trim()) return '-'
  return value.replace(/_/g, ' ')
}

export function formatDate(value: string | null | undefined): string {
  if (!value?.trim()) return '-'
  const d = value.slice(0, 10)
  if (d.length === 10) {
    try {
      return new Date(`${d}T00:00:00`).toLocaleDateString()
    } catch {
      return d
    }
  }
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return String(iso)
  }
}

export function formatMoney(amount: string | null | undefined, currency: string | null | undefined): string {
  if (amount == null || amount === '') return '-'
  return formatBudgetAmount(String(amount), currency?.trim() || 'INR')
}

export function activeBadge(isActive: boolean) {
  return isActive ?
      <Badge variant="success">Active</Badge>
    : <Badge variant="neutral">Inactive</Badge>
}


