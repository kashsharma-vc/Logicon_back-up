import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ListChecks } from 'lucide-react'
import { applyInterviewPlan, listInterviewPlans } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { interviewRoundLabel } from '@/features/hiring/hiringStageActions'
import type { ApplyInterviewPlanResult, HiringApplicationRow, InterviewPlanRow } from '@/features/hiring/types'

function rankPlans(plans: InterviewPlanRow[], jobRole: number | null | undefined): InterviewPlanRow[] {
  return [...plans].sort((a, b) => {
    const aRole = jobRole != null && a.job_role === jobRole ? 0 : a.job_role == null ? 1 : 2
    const bRole = jobRole != null && b.job_role === jobRole ? 0 : b.job_role == null ? 1 : 2
    if (aRole !== bRole) return aRole - bRole
    if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export function ApplyInterviewPlanDrawer({
  open,
  application,
  onClose,
  onApplied,
}: {
  open: boolean
  application: HiringApplicationRow
  onClose: () => void
  onApplied: (result: ApplyInterviewPlanResult) => void
}) {
  const [plans, setPlans] = useState<InterviewPlanRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSelectedId(null)
    setError(null)
    setLoading(true)
    let cancelled = false
    void (async () => {
      try {
        const res = await listInterviewPlans({ is_active: true })
        if (!cancelled) setPlans(res.items)
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load interview plans').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const ranked = useMemo(() => rankPlans(plans, application.job_role), [plans, application.job_role])

  async function handleApply() {
    if (selectedId == null) {
      setError('Select an interview plan to apply.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await applyInterviewPlan(application.id, selectedId)
      onApplied(result)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not apply interview plan').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title="Apply interview plan"
      description="Choose a screening plan to generate the candidate's interview rounds."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" className="min-h-9 px-3 text-sm" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-9 gap-1 px-3 text-sm"
            disabled={busy || selectedId == null}
            onClick={() => void handleApply()}
          >
            <ListChecks className="h-4 w-4" aria-hidden />
            {busy ? 'Applying…' : 'Apply plan'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {loading ? (
          <Spinner label="Loading plans…" />
        ) : ranked.length === 0 ? (
          <p className="text-sm text-app-secondary">No active interview plans are configured.</p>
        ) : (
          ranked.map((plan) => {
            const isSelected = selectedId === plan.id
            const rounds = [...plan.rounds]
              .filter((r) => r.is_active)
              .sort((a, b) => a.round_number - b.round_number)
            const matchesRole = application.job_role != null && plan.job_role === application.job_role
            return (
              <button
                key={plan.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedId(plan.id)}
                className={cn(
                  'w-full rounded-panel border p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                  isSelected ? 'border-brand-500 bg-brand-600/5' : 'border-app-border bg-app-surface hover:border-brand-500/40',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-app-text">
                      {plan.name}
                      {isSelected ? <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden /> : null}
                    </p>
                    {plan.description?.trim() ? (
                      <p className="mt-0.5 text-xs text-app-secondary">{plan.description.trim()}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {matchesRole ? (
                      <span className="rounded-full bg-status-success/10 px-2 py-0.5 text-[10px] font-medium text-status-hired">
                        Matches role
                      </span>
                    ) : plan.job_role == null ? (
                      <span className="rounded-full bg-app-muted px-2 py-0.5 text-[10px] text-app-secondary">Generic</span>
                    ) : null}
                    {plan.is_default ? (
                      <span className="rounded-full bg-app-muted px-2 py-0.5 text-[10px] text-app-secondary">Default</span>
                    ) : null}
                  </div>
                </div>
                {rounds.length > 0 ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {rounds.map((r, idx) => (
                      <span key={r.id} className="flex items-center gap-1">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px]',
                            r.is_required
                              ? 'border-brand-600/30 bg-brand-600/5 text-brand-700'
                              : 'border-app-border bg-app-muted text-app-secondary',
                          )}
                        >
                          {interviewRoundLabel(r.round_type)}
                          {r.is_required ? '' : ' (optional)'}
                        </span>
                        {idx < rounds.length - 1 ? <span className="text-app-subtle">→</span> : null}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-app-subtle">No rounds defined.</p>
                )}
              </button>
            )
          })
        )}

        {error ? <ErrorState message={error} /> : null}
      </div>
    </Drawer>
  )
}
