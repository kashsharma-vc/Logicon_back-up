import { useEffect, useState } from 'react'
import { CheckCircle2, MinusCircle, Star, XCircle } from 'lucide-react'
import { createInterviewFeedback } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { interviewRoundLabel } from '@/features/hiring/hiringStageActions'
import type { InterviewFeedbackRow, InterviewRow } from '@/features/hiring/types'

type Recommendation = InterviewFeedbackRow['recommendation']

const RECOMMENDATIONS: {
  value: Recommendation
  label: string
  hint: string
  icon: typeof CheckCircle2
  active: string
}[] = [
  { value: 'proceed', label: 'Proceed', hint: 'Move candidate forward', icon: CheckCircle2, active: 'border-status-success bg-status-success/10 text-status-hired' },
  { value: 'hold', label: 'Hold', hint: 'Keep under review', icon: MinusCircle, active: 'border-status-warning bg-status-warning/10 text-status-warning' },
  { value: 'reject', label: 'Reject', hint: 'Close the candidate', icon: XCircle, active: 'border-status-danger bg-status-danger/10 text-status-danger' },
]

export function InterviewFeedbackDrawer({
  open,
  interviews,
  defaultInterviewId,
  onClose,
  onSuccess,
}: {
  open: boolean
  interviews: InterviewRow[]
  defaultInterviewId?: number
  onClose: () => void
  onSuccess: (created: InterviewFeedbackRow) => void
}) {
  const [interviewId, setInterviewId] = useState('')
  const [rating, setRating] = useState(0)
  const [recommendation, setRecommendation] = useState<Recommendation>('proceed')
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const fallback = defaultInterviewId ?? interviews[0]?.id
    setInterviewId(fallback != null ? String(fallback) : '')
    setRating(0)
    setRecommendation('proceed')
    setFeedback('')
    setError(null)
  }, [open, defaultInterviewId, interviews])

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    const id = Number(interviewId)
    if (!Number.isFinite(id) || id < 1) {
      setError('Select the interview round this feedback is for.')
      setBusy(false)
      return
    }
    try {
      const created = await createInterviewFeedback({
        interview: id,
        rating: rating > 0 ? rating : null,
        recommendation,
        feedback: feedback.trim() || undefined,
      })
      onSuccess(created)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not submit feedback').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title="Submit interview feedback"
      description="Record the outcome of this screening round."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" className="min-h-9 px-3 text-sm" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="min-h-9 px-3 text-sm" disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {interviews.length > 1 ? (
          <Select id="fb_interview" label="Interview round" value={interviewId} onChange={(e) => setInterviewId(e.target.value)}>
            {interviews.map((iv) => (
              <option key={iv.id} value={String(iv.id)}>
                {interviewRoundLabel(iv.round_type)} · Round {iv.round_number}
              </option>
            ))}
          </Select>
        ) : null}

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-app-secondary">Rating</p>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n === rating ? 0 : n)}
                className="rounded p-0.5 text-app-subtle transition-colors hover:text-status-warning focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <Star className={cn('h-6 w-6', n <= rating ? 'fill-status-warning text-status-warning' : 'fill-transparent')} aria-hidden />
              </button>
            ))}
            {rating > 0 ? <span className="ml-1 text-xs text-app-secondary">{rating} / 5</span> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-app-secondary">Recommendation</p>
          <div className="grid grid-cols-3 gap-2">
            {RECOMMENDATIONS.map((r) => {
              const Icon = r.icon
              const isActive = recommendation === r.value
              return (
                <button
                  key={r.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setRecommendation(r.value)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-panel border px-2 py-3 text-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30',
                    isActive ? r.active : 'border-app-border bg-app-surface text-app-secondary hover:border-brand-500/40',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  <span className="text-sm font-medium">{r.label}</span>
                  <span className="text-[11px] text-app-subtle">{r.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="fb_notes" className="text-sm font-medium text-app-secondary">
            Feedback
          </label>
          <textarea
            id="fb_notes"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Notes on the candidate's performance…"
            className="rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {error ? <ErrorState message={error} /> : null}
      </div>
    </Drawer>
  )
}
