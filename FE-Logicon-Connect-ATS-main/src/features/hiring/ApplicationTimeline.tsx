import { useEffect, useState } from 'react'
import { CheckCircle2, Circle, Clock, Loader2, User } from 'lucide-react'
import { getHiringApplicationTimeline } from '@/api/hiring'
import type { ApplicationStageHistoryBriefRow } from '@/features/hiring/types'
import { cn } from '@/lib/cn'

function formatDuration(start: string, end?: string) {
  const startDate = new Date(start)
  const endDate = end ? new Date(end) : new Date()
  
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 24) {
    if (diffHours === 0) return 'Just now'
    return `${diffHours} hr${diffHours === 1 ? '' : 's'}`
  }
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays === 1 ? '' : 's'}`
}

export function ApplicationTimeline({ applicationId }: { applicationId: number }) {
  const [timeline, setTimeline] = useState<ApplicationStageHistoryBriefRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getHiringApplicationTimeline(applicationId)
      .then((data) => {
        if (!cancelled) {
          setTimeline(data)
          setError(null)
        }
      })
      .catch((e: any) => {
        if (!cancelled) setError(e.message || 'Could not load timeline')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [applicationId])

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-app-subtle" />
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-sm text-status-danger">{error}</div>
  }

  if (!timeline.length) {
    return <div className="p-4 text-sm text-app-subtle">No timeline history available.</div>
  }

  const totalDuration = timeline.length > 0 ? formatDuration(timeline[0]?.created_at || new Date().toISOString()) : '0'

  return (
    <div className="space-y-6 rounded-xl border border-app-border bg-app-surface p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-app-border/50 pb-4">
        <h3 className="text-lg font-bold text-app-heading">Application Timeline</h3>
        <div className="flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
          <Clock className="h-4 w-4" />
          Total TAT: {totalDuration}
        </div>
      </div>

      <div className="relative space-y-6 before:absolute before:inset-y-0 before:left-3.5 before:w-px before:bg-app-border">
        {timeline.map((event, idx) => {
          const nextEvent = timeline[idx + 1]
          const duration = formatDuration(
            event.created_at || new Date().toISOString(),
            nextEvent?.created_at
          )
          const isLast = idx === timeline.length - 1

          return (
            <div key={event.id} className="relative flex gap-6">
              <div
                className={cn(
                  'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-surface ring-4 ring-app-surface',
                  isLast ? 'text-brand-500' : 'text-status-success'
                )}
              >
                {isLast ? <Circle className="h-5 w-5 fill-current" /> : <CheckCircle2 className="h-5 w-5" />}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-app-text capitalize">
                    {event.to_status === 'new' ? 'Created Application' : `${event.to_status?.replace(/_/g, ' ') || 'Unknown'}`}
                  </span>
                  <span className="text-xs font-medium text-app-subtle">
                    {new Date(event.created_at || '').toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-sm text-app-secondary">
                  {event.to_stage_name && (
                    <span className="font-medium text-app-text">{event.to_stage_name}</span>
                  )}
                  {event.to_stage_name && event.from_stage_name && ' · '}
                  {event.from_stage_name && `From ${event.from_stage_name}`}
                </div>

                {event.comment && (
                  <div className="mt-1 rounded-lg bg-app-muted/30 p-3 text-sm italic text-app-secondary">
                    "{event.comment}"
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between">
                  {event.moved_by_username ? (
                    <div className="flex items-center gap-1.5 text-xs text-app-subtle">
                      <User className="h-3.5 w-3.5" />
                      {event.moved_by_username}
                    </div>
                  ) : (
                    <div />
                  )}
                  {!isLast && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-app-subtle">
                      <Clock className="h-3.5 w-3.5" />
                      {duration}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
