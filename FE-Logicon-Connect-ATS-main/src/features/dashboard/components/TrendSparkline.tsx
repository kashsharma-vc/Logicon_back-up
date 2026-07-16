import { cn } from '@/lib/cn'
import type { DashboardTrendItem } from '@/features/dashboard/types'
import { formatCompactCount } from '@/features/dashboard/dashboardFormatters'

interface TrendSparklineProps {
  items: DashboardTrendItem[]
  className?: string
  emptyLabel?: string
}

export function TrendSparkline({ items, className, emptyLabel = 'No trend data' }: TrendSparklineProps) {
  const points = items.slice(-6)

  if (!points.length) {
    return <p className="text-xs text-app-secondary">{emptyLabel}</p>
  }

  const max = Math.max(...points.map((p) => p.count), 1)
  const chartHeight = 48

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className="flex items-end gap-1 h-12"
        role="img"
        aria-label="Monthly trend"
      >
        {points.map((point) => {
          const h = point.count > 0 ? Math.max(4, Math.round((point.count / max) * chartHeight)) : 2
          return (
            <div
              key={point.period}
              className="flex flex-1 flex-col items-center justify-end min-w-0"
              title={`${point.label}: ${formatCompactCount(point.count)}`}
            >
              <div
                className="w-full max-w-[2rem] rounded-t-sm bg-brand-500/80"
                style={{ height: `${h}px` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-1">
        {points.map((point) => (
          <span
            key={`${point.period}-label`}
            className="flex-1 truncate text-center text-[10px] text-app-subtle"
            title={point.label}
          >
            {point.label.split(' ')[0]}
          </span>
        ))}
      </div>
    </div>
  )
}
