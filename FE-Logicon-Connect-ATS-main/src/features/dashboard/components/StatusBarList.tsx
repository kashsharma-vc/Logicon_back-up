import { cn } from '@/lib/cn'

export interface StatusBarItem {
  label: string
  count: number
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'
}

const variantClasses: Record<NonNullable<StatusBarItem['variant']>, string> = {
  neutral: 'bg-app-border',
  info: 'bg-brand-500',
  success: 'bg-status-success',
  warning: 'bg-status-warning',
  danger: 'bg-status-danger',
  attention: 'bg-status-attention',
}

interface StatusBarListProps {
  items: StatusBarItem[]
  total?: number
  className?: string
}

export function StatusBarList({ items, total, className }: StatusBarListProps) {
  const resolvedTotal = total ?? items.reduce((s, i) => s + i.count, 0)

  return (
    <div className={cn('space-y-2', className)}>
      {items.map((item) => {
        const pct = resolvedTotal > 0 ? Math.min(100, Math.round((item.count / resolvedTotal) * 100)) : 0
        const variant = item.variant ?? 'neutral'
        return (
          <div key={item.label} className="flex items-center gap-2">
            <span className="w-24 shrink-0 text-xs text-app-secondary truncate">{item.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-app-border overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', variantClasses[variant])}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-app-text">
              {item.count}
            </span>
          </div>
        )
      })}
    </div>
  )
}
