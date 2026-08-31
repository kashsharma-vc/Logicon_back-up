import { cn } from '@/lib/cn'
import { DrilldownLink } from '@/features/dashboard/components/DrilldownLink'
import { formatMoney, parseAmount, percentOf } from '@/features/dashboard/dashboardFormatters'
import type { DashboardChartAmountItem } from '@/features/dashboard/types'

const SEGMENT_STYLES: Record<string, { bar: string; dot: string }> = {
  committed: { bar: 'bg-status-success', dot: 'bg-status-success' },
  reserved: { bar: 'bg-status-attention', dot: 'bg-status-attention' },
  available: { bar: 'bg-app-muted', dot: 'bg-app-border' },
}

const DEFAULT_SEGMENT_STYLE: { bar: string; dot: string } = {
  bar: 'bg-app-muted',
  dot: 'bg-app-border',
}

interface StackedAmountBarProps {
  items: DashboardChartAmountItem[]
  totalAmount?: string | number
  className?: string
  highlightNegativeAvailable?: boolean
}

export function StackedAmountBar({
  items,
  totalAmount,
  className,
  highlightNegativeAvailable = true,
}: StackedAmountBarProps) {
  const segments = items.map((item) => ({
    ...item,
    numeric: parseAmount(item.amount),
  }))

  const positiveSum = segments.reduce((s, seg) => s + Math.max(0, seg.numeric), 0)
  const total = parseAmount(totalAmount) || positiveSum

  if (!segments.length) {
    return <p className="text-xs text-app-secondary">No utilization data.</p>
  }

  const hasNegativeAvailable = segments.some((s) => s.key === 'available' && s.numeric < 0)

  const barSegments = segments
    .map((seg) => {
      const widthPct = total > 0 ? percentOf(Math.max(0, seg.numeric), total) : 0
      if (widthPct <= 0 && !(seg.key === 'available' && seg.numeric < 0)) return null
      const style = SEGMENT_STYLES[seg.key] ?? DEFAULT_SEGMENT_STYLE
      const barClass = cn(
        'h-full',
        style.bar,
        seg.key === 'available' && seg.numeric < 0 && 'bg-status-danger',
      )
      const width = seg.numeric < 0 ? 2 : widthPct

      const inner = (
        <div
          className={barClass}
          style={{ width: '100%' }}
          title={`${seg.label}: ${formatMoney(seg.amount)}`}
        />
      )

      if (seg.url) {
        return (
          <DrilldownLink
            key={seg.key}
            url={seg.url}
            className="h-full hover:opacity-90"
            title={seg.label}
          >
            {inner}
          </DrilldownLink>
        )
      }

      return (
        <div key={seg.key} className="h-full" style={{ width: `${width}%` }}>
          {inner}
        </div>
      )
    })
    .filter(Boolean)

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'flex h-2.5 overflow-hidden rounded-full bg-app-border',
          hasNegativeAvailable && highlightNegativeAvailable && 'ring-1 ring-status-danger/40',
        )}
        role="img"
        aria-label="Budget utilization breakdown"
      >
        {barSegments.length > 0 ? barSegments : (
          <div className="h-full w-full bg-app-muted" title="No utilization" />
        )}
      </div>

      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-app-subtle">
        {segments.map((seg) => {
          const style = SEGMENT_STYLES[seg.key] ?? DEFAULT_SEGMENT_STYLE
          const isNegative = seg.key === 'available' && seg.numeric < 0
          const label = (
            <span className={cn('flex items-center gap-1 min-w-0', isNegative && 'text-status-danger font-medium')}>
              <span className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', style.dot)} />
              <span className="truncate">{seg.label}</span>
              <span className="tabular-nums text-app-text">{formatMoney(seg.amount)}</span>
            </span>
          )

          return (
            <li key={seg.key}>
              {seg.url ? (
                <DrilldownLink url={seg.url} className="hover:text-brand-600">
                  {label}
                </DrilldownLink>
              ) : (
                label
              )}
            </li>
          )
        })}
      </ul>

      {hasNegativeAvailable && highlightNegativeAvailable ? (
        <p className="text-xs font-medium text-status-danger">Available budget is negative — over-utilized.</p>
      ) : null}
    </div>
  )
}
