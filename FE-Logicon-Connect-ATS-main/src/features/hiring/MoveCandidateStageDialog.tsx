import { useState } from 'react'
import { X } from 'lucide-react'
import { moveHiringApplicationStage } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { HIRING_APPLICATION_STATUS_OPTIONS } from '@/features/talent/talentLabels'
import type { HiringApplicationRow, PipelineStageRow } from '@/features/hiring/types'

export function MoveCandidateStageDialog({
  app,
  stages,
  initialStageId,
  onClose,
  onMoved,
}: {
  app: HiringApplicationRow
  stages: PipelineStageRow[]
  initialStageId?: number
  onClose: () => void
  onMoved: (updated: HiringApplicationRow) => void
}) {
  const [stageId, setStageId] = useState(
    initialStageId != null ? String(initialStageId) : String(app.current_stage ?? ''),
  )
  const [status, setStatus] = useState(app.status ?? '')
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStageName =
    stages.find((s) => s.id === app.current_stage)?.name ?? 'Unassigned'

  async function submit() {
    const sid = stageId.trim() ? Number(stageId) : undefined
    const st = status.trim() || undefined
    if (!sid && !st) {
      setError('Choose a pipeline stage or status to apply.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const updated = await moveHiringApplicationStage(app.id, {
        stage_id: sid,
        status: st ?? null,
        comment: comment.trim(),
      })
      onMoved(updated)
    } catch (e) {
      setError(parseApiError(e, 'Could not move candidate.').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-panel border border-app-border bg-app-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
          <h2 className="text-sm font-semibold text-app-text">Move candidate</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-app-subtle hover:bg-app-muted hover:text-app-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          <div>
            <p className="text-sm font-medium text-app-text">
              {app.candidate_name ?? `Candidate #${app.candidate}`}
            </p>
            <p className="text-xs text-app-secondary">
              Current stage: <span className="font-medium">{currentStageName}</span>
            </p>
          </div>

          {error ? <ErrorState message={error} /> : null}

          <Select
            id="dlg_stage"
            label="Move to stage"
            value={stageId}
            onChange={(e) => setStageId(e.target.value)}
          >
            <option value="">Keep current stage</option>
            {stages.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>

          <Select
            id="dlg_status"
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Keep current status</option>
            {HIRING_APPLICATION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Input
            id="dlg_comment"
            label="Comment (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a note…"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-app-border px-4 py-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? 'Moving…' : 'Confirm move'}
          </Button>
        </div>
      </div>
    </div>
  )
}
