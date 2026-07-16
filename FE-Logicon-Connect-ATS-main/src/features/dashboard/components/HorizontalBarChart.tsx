import { cn } from '@/lib/cn'
import { DrilldownLink } from '@/features/dashboard/components/DrilldownLink'
import { formatCompactCount, formatCount, formatMoney, parseAmount } from '@/features/dashboard/dashboardFormatters'
import type { StatusBadgeVariant } from '@/features/dashboard/dashboardFormatters'

export interface HorizontalBarItem {
  label: string
  value: number
  url?: string
  variant?: StatusBadgeVariant
  displayAs?: 'count' | 'amount'
  amount?: string
}

const variantClasses: Record<StatusBadgeVariant, string> = {
  neutral: 'bg-app-border',
  info: 'bg-brand-500',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  attention: 'bg-status-attention',
}

interface HorizontalBarChartProps {
  items: HorizontalBarItem[]
  maxValue?: number
  emptyLabel?: string
  className?: string
}

function formatValue(item: HorizontalBarItem): string {
  if (item.displayAs === 'amount') {
    return formatMoney(item.amount ?? item.value)
  }
  return item.value >= 1000 ? formatCompactCount(item.value) : formatCount(item.value)
}

export function HorizontalBarChart({
  items,
  maxValue,
  emptyLabel = 'No data',
  className,
}: HorizontalBarChartProps) {
  const visible = items.filter((i) => {
    if (i.displayAs === 'amount') return parseAmount(i.amount ?? i.value) > 0
    return i.value > 0
  })

  if (!visible.length) {
    return <p className="text-xs text-app-secondary">{emptyLabel}</p>
  }

  const resolvedMax =
    maxValue ??
    Math.max(
      ...visible.map((i) => (i.displayAs === 'amount' ? parseAmount(i.amount ?? i.value) : i.value)),
      1,
    )

  return (
    <ul className={cn('space-y-2', className)} role="list">
      {visible.map((item) => {
        const raw = item.displayAs === 'amount' ? parseAmount(item.amount ?? item.value) : item.value
        const pct = Math.min(100, Math.round((raw / resolvedMax) * 100))
        const variant = item.variant ?? 'info'

        const labelEl = (
          <span className="w-24 shrink-0 truncate text-xs text-app-secondary" title={item.label}>
            {item.label}
          </span>
        )
        const barEl = (
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-app-border">
            <div
              className={cn('h-full rounded-full transition-all', variantClasses[variant])}
              style={{ width: `${pct}%` }}
            />
          </div>
        )
        const valueEl = (
          <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums text-app-text">
            {formatValue(item)}
          </span>
        )

        return (
          <li key={item.label} className="flex min-w-0 items-center gap-2">
            {item.url ? (
              <DrilldownLink url={item.url} className="flex min-w-0 flex-1 items-center gap-2 group">
                <span className="w-24 shrink-0 truncate text-xs text-app-secondary group-hover:text-brand-600">
                  {item.label}
                </span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-app-border">
                  <div
                    className={cn('h-full rounded-full', variantClasses[variant])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-medium tabular-nums group-hover:text-brand-600">
                  {formatValue(item)}
                </span>
              </DrilldownLink>
            ) : (
              <>
                {labelEl}
                {barEl}
                {valueEl}
              </>
            )}
          </li>
        )
      })}
    </ul>
  )
}
