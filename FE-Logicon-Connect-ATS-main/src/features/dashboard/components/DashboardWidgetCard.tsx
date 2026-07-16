import type { ReactNode } from 'react'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { cn } from '@/lib/cn'

export function DashboardWidgetCard({
  id,
  title,
  description,
  children,
  action,
  loading,
  error,
  empty,
  className,
}: {
  id: string
  title: string
  description?: string
  children?: ReactNode
  action?: ReactNode
  loading?: boolean
  error?: string | null
  empty?: string | null
  className?: string
}) {
  const headingId = `dash-widget-${id}-title`
  return (
    <section
      className={cn(
        'flex h-full min-h-[8rem] flex-col rounded-panel border border-app-border bg-app-surface p-4 shadow-panel',
        className,
      )}
      aria-labelledby={headingId}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-app-border pb-2">
        <div className="min-w-0">
          <h3 id={headingId} className="text-sm font-semibold text-app-text">
            {title}
          </h3>
          {description ? <p className="mt-0.5 text-xs text-app-secondary">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner label="Loading" />
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : empty ? (
          <p className="text-sm text-app-secondary">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
