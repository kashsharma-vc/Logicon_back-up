import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { WorkflowStatus } from '@/features/workflow/types'

function statusBadgeVariant(s: WorkflowStatus | undefined): 'success' | 'danger' | 'info' | 'neutral' {
  switch (s) {
    case 'approved':
      return 'success'
    case 'rejected':
    case 'cancelled':
      return 'danger'
    case 'active':
      return 'info'
    default:
      return 'neutral'
  }
}

function statusLabel(s: WorkflowStatus | undefined) {
  if (!s) return 'Unknown'
  return s.replace(/_/g, ' ')
}

export function WorkflowStatusPanel({
  workflowStatus,
  workflowInstanceId,
  workflowCurrentStepCode,
  workflowCurrentStepName,
  workflowCurrentAssignedUserName,
  workflowCurrentDepartmentName,
  canConfigCheck,
  canStart,
  checkingConfig,
  starting,
  onCheckConfig,
  onStartWorkflow,
  startButtonLabel,
  startDisabled,
  configCheckButtonLabel,
}: {
  workflowStatus: WorkflowStatus | undefined
  workflowInstanceId: number | null | undefined
  workflowCurrentStepCode: string | null | undefined
  workflowCurrentStepName: string | null | undefined
  workflowCurrentAssignedUserName: string | null | undefined
  workflowCurrentDepartmentName: string | null | undefined
  canConfigCheck: boolean
  canStart: boolean
  checkingConfig: boolean
  starting: boolean
  onCheckConfig: () => void
  onStartWorkflow: () => void
  /** Primary action when workflow has not started (default: Start workflow). */
  startButtonLabel?: string
  /** When true, disables the start/send button even if `canStart` is true. */
  startDisabled?: boolean
  /** Secondary action label (default: Check setup). */
  configCheckButtonLabel?: string
}) {
  const wf = workflowStatus ?? 'not_started'
  const startLabel = startButtonLabel ?? 'Start workflow'
  const startingLabel = startLabel === 'Send for approval' ? 'Sending…' : 'Starting…'
  const checkLabel = configCheckButtonLabel ?? 'Check setup'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Workflow status</span>
        <Badge variant={statusBadgeVariant(wf)}>{statusLabel(wf)}</Badge>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-app-subtle">Current step</dt>
          <dd className="text-app-text">
            {workflowCurrentStepName || workflowCurrentStepCode
              ? `${workflowCurrentStepName ?? '—'}${workflowCurrentStepCode ? ` (${workflowCurrentStepCode})` : ''}`
              : '—'}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-app-subtle">Assigned user</dt>
          <dd className="text-app-text">{workflowCurrentAssignedUserName ?? '—'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-app-subtle">Department</dt>
          <dd className="text-app-text">{workflowCurrentDepartmentName ?? '—'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-app-subtle">Workflow instance</dt>
          <dd className="font-mono text-xs text-app-secondary">{workflowInstanceId != null ? `#${workflowInstanceId}` : '—'}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-app-border pt-4">
        {canConfigCheck ? (
          <Button variant="secondary" className="min-h-9" disabled={checkingConfig} onClick={onCheckConfig}>
            {checkingConfig ? 'Checking…' : checkLabel}
          </Button>
        ) : null}
        {canStart && wf === 'not_started' ? (
          <Button className="min-h-9" disabled={starting || !!startDisabled} onClick={onStartWorkflow}>
            {starting ? startingLabel : startLabel}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
