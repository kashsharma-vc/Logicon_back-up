import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ChartCardProps {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
  className?: string
}

/** Lightweight chart section — use inside a widget, not nested in DashboardWidgetCard. */
export function ChartCard({ title, description, children, action, className }: ChartCardProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-xs font-medium text-app-text">{title}</h4>
          {description ? <p className="mt-0.5 text-xs text-app-subtle">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </div>
  )
}
