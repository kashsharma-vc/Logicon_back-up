import type { WorkflowInstance } from '@/features/workflow/types'
import {
  WorkflowApprovalStepper,
  WorkflowAuditTrailList,
} from '@/features/workflow/WorkflowHistoryViews'

export function WorkflowTimeline({
  instance,
  loading,
  errorMessage,
  currentStepId = null,
  layout = 'stacked',
}: {
  instance: WorkflowInstance | null
  loading?: boolean
  errorMessage?: string | null
  currentStepId?: number | null
  /** stacked = approval history then audit; split = side by side on large screens */
  layout?: 'stacked' | 'split'
}) {
  const steps = Array.isArray(instance?.steps) ? instance.steps : []
  const audit = Array.isArray(instance?.audit_trail) ? instance.audit_trail : []

  const historyBlock = (
    <section>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-subtle">
        Approval history
      </h4>
      <WorkflowApprovalStepper
        steps={steps}
        currentStepId={currentStepId}
        loading={loading}
        errorMessage={errorMessage}
      />
    </section>
  )

  const auditBlock = (
    <section>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-app-subtle">
        Audit trail
      </h4>
      <WorkflowAuditTrailList
        entries={audit}
        loading={loading}
        errorMessage={errorMessage}
      />
    </section>
  )

  if (layout === 'split') {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {historyBlock}
        {auditBlock}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {historyBlock}
      {auditBlock}
    </div>
  )
}
