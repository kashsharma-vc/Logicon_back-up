import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { listMyWorkflowTasks } from '@/api/workflow'
import { parseApiError } from '@/lib/apiError'
import type { WorkflowMyTask } from '@/features/workflow/types'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { TaskStatusBadge } from '@/features/workflowTasks/TaskStatusBadge'
import { WorkflowTaskDrawer } from '@/features/workflowTasks/WorkflowTaskDrawer'
import { NotificationBanner } from '@/features/notifications/NotificationBanner'

function targetKindLabel(targetType: WorkflowMyTask['target_type']): string {
  if (targetType === 'mrf') return 'MRF'
  if (targetType === 'client_onboarding' || targetType === 'mobilisation') return 'Mobilisation'
  if (targetType === 'sales_proposal') return 'Sales proposal'
  return targetType
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function formatRemainingTime(dueAtStr: string): string {
  const due = new Date(dueAtStr)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const isOverdue = diffMs < 0
  const absDiff = Math.abs(diffMs)
  
  const totalHours = Math.floor(absDiff / (1000 * 60 * 60))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24

  if (isOverdue) {
    if (days > 0) return `${days}d ${hours}h overdue`
    return `${hours}h overdue`
  } else {
    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }
}

function clientSiteCell(task: WorkflowMyTask): string {
  const parts: string[] = []
  if (task.client_name?.trim()) parts.push(task.client_name.trim())
  if (task.site_name?.trim()) parts.push(task.site_name.trim())
  return parts.length ? parts.join(' · ') : '—'
}

function departmentsCell(task: WorkflowMyTask): { line1: string; line2: string } | null {
  const req = task.requesting_department_name?.trim()
  const need = task.required_department_name?.trim()
  if (!req && !need) return null
  return {
    line1: req ? `Requesting: ${req}` : 'Requesting: —',
    line2: need ? `Required: ${need}` : 'Required: —',
  }
}

function lineItemsCell(task: WorkflowMyTask): string {
  if (task.line_item_count == null) return '—'
  return String(task.line_item_count)
}

export function MyTasksPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<WorkflowMyTask[]>([])
  const [count, setCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const data = await listMyWorkflowTasks()
      setTasks(data.results ?? [])
      setCount(typeof data.count === 'number' ? data.count : data.results?.length ?? 0)
    } catch (e: unknown) {
      setTasks([])
      setCount(0)
      setError(parseApiError(e, 'Failed to load tasks').message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function handleRefresh() {
    setRefreshing(true)
    void load()
  }

  return (
    <div className="w-full space-y-4">
      <WorkflowTaskDrawer
        open={selectedStepId != null}
        stepId={selectedStepId}
        onClose={() => setSelectedStepId(null)}
        onActionComplete={() => void load()}
      />

      <NotificationBanner area="workflow" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">My tasks</h2>
          <p className="mt-1 text-sm text-app-secondary">Approval work assigned to you.</p>
          {!loading && !error ? (
            <p className="mt-1 text-xs text-app-subtle">
              {count === 0 ? 'No open items.' : `${count} open ${count === 1 ? 'item' : 'items'}.`}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-9 shrink-0 self-start sm:self-center"
          onClick={handleRefresh}
          disabled={loading || refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Spinner label="Loading your tasks…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : tasks.length === 0 ? (
        <EmptyState title="No approval tasks assigned to you." description="When a step is assigned to you, it will appear here." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {tasks.map((task) => {
              const depts = departmentsCell(task)
              return (
                <button
                  key={`${task.workflow_id}-${task.step_id}`}
                  type="button"
                  onClick={() => setSelectedStepId(task.step_id)}
                  className="w-full rounded-panel border border-app-border bg-app-surface p-4 text-left shadow-panel transition-colors hover:bg-app-muted"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-app-text">{task.target_title}</p>
                      <p className="mt-0.5 text-xs text-app-subtle">{targetKindLabel(task.target_type)}</p>
                    </div>
                    <TaskStatusBadge status={task.step_status} />
                  </div>
                  <dl className="mt-3 space-y-2 text-xs text-app-secondary">
                    <div>
                      <dt className="font-semibold uppercase tracking-wider text-app-subtle">Current approval</dt>
                      <dd className="mt-0.5 text-app-text">{task.step_name}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wider text-app-subtle">Client / site</dt>
                      <dd className="mt-0.5">{clientSiteCell(task)}</dd>
                    </div>
                    {depts ? (
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-app-subtle">Departments</dt>
                        <dd className="mt-0.5">
                          <span className="block">{depts.line1}</span>
                          <span className="block">{depts.line2}</span>
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="font-semibold uppercase tracking-wider text-app-subtle">Line items</dt>
                      <dd className="mt-0.5">{lineItemsCell(task)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold uppercase tracking-wider text-app-subtle">Activated</dt>
                      <dd className="mt-0.5">{formatWhen(task.activated_at)}</dd>
                    </div>
                    {task.due_at ? (
                      <div>
                        <dt className="font-semibold uppercase tracking-wider text-app-subtle">Due Date</dt>
                        <dd className={`mt-0.5 ${new Date(task.due_at) < new Date() ? 'text-status-danger font-semibold' : 'text-app-text'}`}>
                          {formatWhen(task.due_at)}
                        </dd>
                        <span className={`text-[10px] block mt-0.5 ${new Date(task.due_at) < new Date() ? 'text-status-danger' : 'text-status-success font-medium'}`}>
                          ({formatRemainingTime(task.due_at)})
                        </span>
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-4">
                    <span className="inline-flex min-h-10 w-full items-center justify-center rounded-panel bg-[var(--color-btn-primary)] px-4 py-2 text-sm font-medium text-white">
                      Open task
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="hidden overflow-x-auto rounded-panel border border-app-border bg-app-surface shadow-panel md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Request</TH>
                  <TH className="py-2">Current approval</TH>
                  <TH className="py-2">Client / site</TH>
                  <TH className="py-2">Departments</TH>
                  <TH className="py-2">Line items</TH>
                  <TH className="py-2">Activated</TH>
                  <TH className="py-2">Due Date</TH>
                  <TH className="py-2 text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {tasks.map((task) => {
                  const depts = departmentsCell(task)
                  return (
                    <TR
                      key={`${task.workflow_id}-${task.step_id}`}
                      className="cursor-pointer hover:bg-app-muted"
                      onClick={() => setSelectedStepId(task.step_id)}
                    >
                      <TD className="max-w-[220px] py-2 align-top">
                        <p className="text-sm font-medium text-app-text">{task.target_title}</p>
                        <p className="mt-0.5 text-xs text-app-subtle">{targetKindLabel(task.target_type)}</p>
                      </TD>
                      <TD className="max-w-[180px] py-2 align-top">
                        <p className="text-sm text-app-text">{task.step_name}</p>
                        <div className="mt-1">
                          <TaskStatusBadge status={task.step_status} />
                        </div>
                      </TD>
                      <TD className="max-w-[200px] py-2 align-top text-sm text-app-secondary">{clientSiteCell(task)}</TD>
                      <TD className="max-w-[200px] py-2 align-top text-xs text-app-secondary">
                        {depts ? (
                          <>
                            <span className="block truncate" title={depts.line1}>
                              {depts.line1}
                            </span>
                            <span className="block truncate" title={depts.line2}>
                              {depts.line2}
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </TD>
                      <TD className="py-2 align-top text-sm text-app-secondary">{lineItemsCell(task)}</TD>
                      <TD className="py-2 align-top text-xs text-app-secondary whitespace-nowrap">
                        {formatWhen(task.activated_at)}
                      </TD>
                      <TD className="py-2 align-top text-xs text-app-secondary whitespace-nowrap">
                        {task.due_at ? (
                          <div>
                            <span className={new Date(task.due_at) < new Date() ? 'text-status-danger font-semibold block' : 'text-app-secondary block'}>
                              {formatWhen(task.due_at)}
                            </span>
                            <span className={`text-[10px] block mt-0.5 ${new Date(task.due_at) < new Date() ? 'text-status-danger' : 'text-status-success font-medium'}`}>
                              ({formatRemainingTime(task.due_at)})
                            </span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TD>
                      <TD className="py-2 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <Button type="button" variant="secondary" className="min-h-9 px-3" onClick={() => setSelectedStepId(task.step_id)}>
                          Open task
                        </Button>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
