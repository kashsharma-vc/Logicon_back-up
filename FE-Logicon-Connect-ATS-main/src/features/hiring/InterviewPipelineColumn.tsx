import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/Badge'

export function InterviewPipelineColumn({
  label,
  count,
  emptyHint,
  children,
}: {
  label: string
  count: number
  emptyHint: string
  children: ReactNode
}) {
  const isEmpty = count === 0
  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-panel border border-app-border bg-app-muted/30">
      <div className="flex items-center justify-between gap-2 border-b border-app-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-app-secondary">{label}</span>
        <Badge variant="neutral" className="text-[10px]">{count}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {isEmpty ? <p className="px-1 py-6 text-center text-xs text-app-subtle">{emptyHint}</p> : children}
      </div>
    </div>
  )
}
