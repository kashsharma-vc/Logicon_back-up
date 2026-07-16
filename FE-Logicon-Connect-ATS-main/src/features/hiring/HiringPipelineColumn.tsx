import { useState } from 'react'
import { cn } from '@/lib/cn'
import { HiringPipelineCard } from '@/features/hiring/HiringPipelineCard'
import type { HiringApplicationRow, PipelineStageRow } from '@/features/hiring/types'

export function HiringPipelineColumn({
  stage,
  applications,
  canMove,
  onMove,
  onDropApplication,
  highlightedAppId,
}: {
  stage: PipelineStageRow
  applications: HiringApplicationRow[]
  canMove: boolean
  onMove: (app: HiringApplicationRow) => void
  onDropApplication: (appId: number, targetStageId: number) => void
  highlightedAppId?: number | null
}) {
  const [isDragOver, setIsDragOver] = useState(false)

  return (
    <div
      className={cn(
        'flex h-full w-80 shrink-0 flex-col rounded-panel border bg-app-muted transition-colors',
        isDragOver && canMove
          ? 'border-brand-500 ring-2 ring-brand-500/30'
          : 'border-app-border',
      )}
      onDragOver={(e) => {
        if (!canMove) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setIsDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        if (!canMove) return
        const appId = Number(e.dataTransfer.getData('application_id'))
        const fromStageId = e.dataTransfer.getData('from_stage_id')
        if (!appId) return
        if (String(stage.id) === fromStageId) return // same column — do nothing
        onDropApplication(appId, stage.id)
      }}
    >
      {/* Column header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-app-border bg-app-muted px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-app-text">{stage.name}</p>
          {stage.code ? (
            <p className="text-[10px] uppercase tracking-wider text-app-subtle">{stage.code}</p>
          ) : null}
        </div>
        <span className="ml-2 shrink-0 rounded-full border border-app-border bg-app-surface px-2 py-0.5 text-xs font-semibold text-app-secondary">
          {applications.length}
        </span>
      </div>

      {/* Cards */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-2">
          {applications.length === 0 ? (
            <p
              className={cn(
                'py-6 text-center text-xs transition-colors',
                isDragOver && canMove ? 'text-brand-600' : 'text-app-subtle',
              )}
            >
              {isDragOver && canMove ? 'Drop candidate here' : 'No candidates.'}
            </p>
          ) : (
            applications.map((app) => (
              <HiringPipelineCard
                key={app.id}
                app={app}
                canMove={canMove}
                onMove={onMove}
                highlighted={highlightedAppId != null && app.id === highlightedAppId}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
