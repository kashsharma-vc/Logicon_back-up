import { cn } from '@/lib/cn'

export interface WorkflowStepTimelineItem {
  order: number
  name: string
  approver?: string | null
  department?: string | null
  assignmentOk?: boolean
}

export function WorkflowStepTimeline({
  steps,
  className,
}: {
  steps: WorkflowStepTimelineItem[]
  className?: string
}) {
  if (!steps.length) return null

  const sorted = [...steps].sort((a, b) => a.order - b.order)

  return (
    <ol className={cn('relative space-y-0', className)}>
      {sorted.map((step, index) => {
        const isLast = index === sorted.length - 1
        const approver = step.approver?.trim() || '—'
        const department = step.department?.trim() || '—'

        return (
          <li key={`${step.order}-${step.name}`} className="relative flex gap-3 pb-3 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[11px] top-6 bottom-0 w-px bg-app-border"
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                step.assignmentOk === false
                  ? 'bg-status-danger/10 text-status-danger ring-1 ring-status-danger/30'
                  : 'bg-brand-500/10 text-brand-700 dark:text-brand-300 ring-1 ring-brand-500/20',
              )}
            >
              {step.order}
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm font-medium leading-tight text-app-text">{step.name}</p>
              <p className="mt-0.5 truncate text-xs text-app-secondary">
                {approver}
                <span className="mx-1 text-app-subtle">·</span>
                {department}
              </p>
              {step.assignmentOk === false ? (
                <p className="mt-0.5 text-[11px] text-status-danger">Needs assignee</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
