import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { WorkflowStepTimeline } from '@/features/workflow/WorkflowStepTimeline'
import type { WorkflowConfigCheck } from '@/features/workflow/types'

function mappingScopeLabel(level: WorkflowConfigCheck['mapping_level']): string {
  if (level === 'site') return 'Site'
  if (level === 'client') return 'Client'
  if (level === 'org') return 'Organization'
  return '—'
}

export function DefaultWorkflowConfigPreview({
  loading,
  errorMessage,
  data,
  compact = false,
}: {
  loading: boolean
  errorMessage: string | null
  data: WorkflowConfigCheck | null
  compact?: boolean
}) {
  if (loading) {
    return (
      <div className={compact ? 'flex justify-center py-4' : 'flex justify-center rounded-xl border border-app-border bg-app-muted/30 py-8'}>
        <Spinner label="Checking default approval flow…" />
      </div>
    )
  }

  if (errorMessage) {
    return <ErrorState message="Could not verify default approval flow." />
  }

  if (!data) {
    return (
      <p className="text-sm text-app-secondary">No workflow configuration data available.</p>
    )
  }

  const metaParts: string[] = []
  if (data.steps.length > 0) {
    metaParts.push(`${data.steps.length} step${data.steps.length === 1 ? '' : 's'}`)
  }
  if (data.template?.name) metaParts.push(data.template.name)
  if (data.mapping_level) metaParts.push(mappingScopeLabel(data.mapping_level))

  return (
    <div className="space-y-2.5">
      <p className="text-sm text-app-secondary">
        No route configured — default workflow will be used.
      </p>

      {metaParts.length > 0 ? (
        <p className="text-[11px] text-app-subtle">{metaParts.join(' · ')}</p>
      ) : null}

      {data.steps.length > 0 ? (
        <div className="rounded-lg border border-app-border/80 bg-app-muted/25 px-3 py-2.5">
          <WorkflowStepTimeline
            steps={data.steps.map((step, index) => ({
              order: index + 1,
              name: step.step_name,
              approver: step.assigned_user,
              department: step.department,
              assignmentOk: step.assignment_ok,
            }))}
          />
        </div>
      ) : null}

      {!data.ok ? (
        <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 px-3 py-2">
          <p className="text-xs font-medium text-status-danger">
            Default workflow is not ready. Ask an admin to configure approvers.
          </p>
          {data.errors.length > 0 ? (
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs text-status-danger">
              {data.errors.map((msg, i) => (
                <li key={`${msg}-${i}`}>{msg}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {data.warnings.length > 0 ? (
        <ul className="list-inside list-disc space-y-0.5 text-xs text-app-secondary">
          {data.warnings.map((msg, i) => (
            <li key={`${msg}-${i}`}>{msg}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
