import { cn } from '@/lib/cn'
import { DrilldownLink } from '@/features/dashboard/components/DrilldownLink'
import { formatCompactCount, formatCount } from '@/features/dashboard/dashboardFormatters'
import type { StatusBadgeVariant } from '@/features/dashboard/dashboardFormatters'

export interface DonutSegment {
  key: string
  label: string
  value: number
  url?: string
  variant?: StatusBadgeVariant
}

const variantColors: Record<StatusBadgeVariant, string> = {
  neutral: '#94a3b8',
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  attention: '#f97316',
}

interface DonutSummaryProps {
  segments: DonutSegment[]
  centerLabel?: string
  centerValue?: string | number
  emptyLabel?: string
  className?: string
}

export function DonutSummary({
  segments,
  centerLabel = 'Total',
  centerValue,
  emptyLabel = 'No data',
  className,
}: DonutSummaryProps) {
  const visible = segments.filter((s) => s.value > 0)
  const total = visible.reduce((s, seg) => s + seg.value, 0)

  if (!visible.length || total === 0) {
    return <p className="text-xs text-app-secondary">{emptyLabel}</p>
  }

  let cursor = 0
  const gradientStops = visible.map((seg) => {
    const pct = (seg.value / total) * 100
    const start = cursor
    cursor += pct
    const color = variantColors[seg.variant ?? 'info']
    return `${color} ${start}% ${cursor}%`
  })

  const resolvedCenter =
    centerValue != null
      ? typeof centerValue === 'number'
        ? formatCompactCount(centerValue)
        : centerValue
      : formatCompactCount(total)

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      <div className="relative mx-auto h-24 w-24 shrink-0 sm:mx-0" role="img" aria-label={`${centerLabel}: ${resolvedCenter}`}>
        <div
          className="h-full w-full rounded-full"
          style={{ background: `conic-gradient(${gradientStops.join(', ')})` }}
        />
        <div className="absolute inset-[18%] flex flex-col items-center justify-center rounded-full bg-app-surface text-center">
          <span className="text-[10px] uppercase tracking-wide text-app-subtle">{centerLabel}</span>
          <span className="text-sm font-semibold tabular-nums text-app-text">{resolvedCenter}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5" aria-label="Chart legend">
        {visible.map((seg) => {
          const pct = Math.round((seg.value / total) * 100)
          const dotColor = variantColors[seg.variant ?? 'info']
          const legendItem = (
            <span className="flex min-w-0 items-center gap-2 text-xs">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: dotColor }}
                aria-hidden
              />
              <span className="truncate text-app-secondary">{seg.label}</span>
              <span className="ml-auto shrink-0 tabular-nums text-app-text">
                {formatCount(seg.value)}
                <span className="text-app-subtle ml-1">({pct}%)</span>
              </span>
            </span>
          )

          return (
            <li key={seg.key}>
              {seg.url ? (
                <DrilldownLink url={seg.url} className="block hover:text-brand-600">
                  {legendItem}
                </DrilldownLink>
              ) : (
                legendItem
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
