import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import type { WorkflowConfigCheck } from '@/features/workflow/types'

export function WorkflowConfigCheckDrawer({
  open,
  onClose,
  loading,
  errorMessage,
  data,
  title,
  description,
  loadingLabel,
}: {
  open: boolean
  onClose: () => void
  loading: boolean
  errorMessage: string | null
  data: WorkflowConfigCheck | null
  title?: string
  description?: string
  loadingLabel?: string
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title ?? 'Workflow setup check'}
      description={
        description ??
        'Dry-run of template mapping and step assignments. Fix any errors before sending for approval.'
      }
      footer={
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner label={loadingLabel ?? 'Loading config check'} />
        </div>
      ) : errorMessage ? (
        <ErrorState message={errorMessage} />
      ) : data ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Result</span>
            {data.ok ? (
              <Badge variant="success">OK</Badge>
            ) : (
              <Badge variant="danger">Not OK</Badge>
            )}
          </div>

          {!data.ok ? (
            <div className="rounded-panel border border-status-danger/30 bg-status-danger/5 px-3 py-2 text-sm text-status-danger">
              Configuration has errors. Resolve them before starting the workflow (close this drawer and fix mappings
              or assignments in the backend).
            </div>
          ) : null}

          {data.template ? (
            <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Template</p>
              <p className="mt-1 font-medium text-app-text">
                {data.template.name}{' '}
                <span className="font-mono text-xs text-app-secondary">({data.template.code})</span>
              </p>
              <p className="mt-2 text-xs text-app-secondary">
                Mapping level: <span className="font-medium text-app-text">{data.mapping_level ?? '—'}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-app-secondary">No template resolved.</p>
          )}

          {data.steps?.length ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-app-subtle">Steps</p>
              <ul className="space-y-2">
                {data.steps.map((s, i) => (
                  <li
                    key={`${s.step_code}-${i}`}
                    className="rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm shadow-panel"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-app-text">
                        {s.step_name} <span className="font-mono text-xs text-app-secondary">({s.step_code})</span>
                      </span>
                      {s.assignment_ok ? <Badge variant="success">Assigned</Badge> : <Badge variant="danger">Missing</Badge>}
                    </div>
                    <dl className="mt-2 grid gap-1 text-xs text-app-secondary sm:grid-cols-2">
                      <div>
                        <dt className="text-app-subtle">Level</dt>
                        <dd>{s.assignment_level ?? '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-app-subtle">Department</dt>
                        <dd>{s.department ?? '—'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-app-subtle">User</dt>
                        <dd>{s.assigned_user ?? '—'}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.errors?.length ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-status-danger">Errors</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-status-danger">
                {data.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.warnings?.length ? (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Warnings</p>
              <ul className="list-inside list-disc space-y-1 text-sm text-app-secondary">
                {data.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-app-secondary">No data.</p>
      )}
    </Drawer>
  )
}
