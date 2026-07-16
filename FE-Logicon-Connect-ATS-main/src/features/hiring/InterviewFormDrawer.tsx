import { useEffect, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { createInterview, updateInterview } from '@/api/hiring'
import { listUsers, type UserRow } from '@/api/users'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { InterviewRow } from '@/features/hiring/types'

const ROUND_TYPES: { value: InterviewRow['round_type']; label: string }[] = [
  { value: 'hr', label: 'HR' },
  { value: 'technical', label: 'Technical' },
  { value: 'manager', label: 'Manager' },
  { value: 'client', label: 'Client' },
  { value: 'final', label: 'Final' },
]

const MODES: { value: InterviewRow['mode']; label: string }[] = [
  { value: 'phone', label: 'Phone' },
  { value: 'video', label: 'Video' },
  { value: 'in_person', label: 'In person' },
]

function userLabel(u: UserRow): string {
  const name = `${u.first_name} ${u.last_name}`.trim()
  return name || u.username
}

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function InterviewFormDrawer({
  open,
  applicationId,
  defaultRoundNumber,
  interview,
  plannedRound,
  onClose,
  onSuccess,
}: {
  open: boolean
  applicationId: number
  defaultRoundNumber?: number
  /** When provided, the drawer updates this pending/planned interview instead of creating a new one. */
  interview?: InterviewRow
  plannedRound?: number | null
  onClose: () => void
  onSuccess: (saved: InterviewRow) => void
}) {
  const isUpdate = interview?.id != null

  const [roundType, setRoundType] = useState<InterviewRow['round_type']>('hr')
  const [roundNumber, setRoundNumber] = useState('1')
  const [scheduledAt, setScheduledAt] = useState('')
  const [interviewer, setInterviewer] = useState('')
  const [mode, setMode] = useState<InterviewRow['mode']>('video')
  const [location, setLocation] = useState('')
  const [meetingLink, setMeetingLink] = useState('')

  const [users, setUsers] = useState<UserRow[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setRoundType(interview?.round_type ?? 'hr')
    setRoundNumber(String(interview?.round_number ?? defaultRoundNumber ?? 1))
    setScheduledAt(toLocalInput(interview?.scheduled_at))
    setInterviewer(interview?.interviewer != null ? String(interview.interviewer) : '')
    setMode(interview?.mode ?? 'video')
    setLocation(interview?.location ?? '')
    setMeetingLink(interview?.meeting_link ?? '')
    setError(null)
  }, [open, defaultRoundNumber, interview])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      try {
        const res = await listUsers({ user_type: 'internal', is_active: true })
        if (!cancelled) setUsers(res.items)
      } catch {
        if (!cancelled) setUsers([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    const roundNum = Number(roundNumber)
    if (!Number.isFinite(roundNum) || roundNum < 1) {
      setError('Enter a valid round number (1 or higher).')
      setBusy(false)
      return
    }
    try {
      const scheduledIso = scheduledAt ? new Date(scheduledAt).toISOString() : null
      const saved = isUpdate
        ? await updateInterview(interview!.id, {
            scheduled_at: scheduledIso,
            interviewer: interviewer ? Number(interviewer) : null,
            status: 'scheduled',
            mode,
            location: location.trim() || undefined,
            meeting_link: meetingLink.trim() || undefined,
          })
        : await createInterview({
            hiring_application: applicationId,
            planned_round: plannedRound ?? null,
            round_type: roundType,
            round_number: roundNum,
            scheduled_at: scheduledIso,
            interviewer: interviewer ? Number(interviewer) : null,
            status: 'scheduled',
            mode,
            location: location.trim() || undefined,
            meeting_link: meetingLink.trim() || undefined,
          })
      onSuccess(saved)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not schedule interview').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title={isUpdate ? 'Schedule round' : 'Schedule interview'}
      description={isUpdate ? 'Set the date, interviewer, and mode for this planned round.' : 'Set up a screening round for this candidate.'}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" className="min-h-9 px-3 text-sm" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="min-h-9 gap-1 px-3 text-sm" disabled={busy} onClick={() => void handleSubmit()}>
            <CalendarClock className="h-4 w-4" aria-hidden />
            {busy ? 'Scheduling…' : 'Schedule'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select id="iv_round_type" label="Round type" value={roundType} disabled={isUpdate} onChange={(e) => setRoundType(e.target.value as InterviewRow['round_type'])}>
            {ROUND_TYPES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </Select>
          <Input
            id="iv_round_number"
            label="Round number"
            type="number"
            min="1"
            disabled={isUpdate}
            value={roundNumber}
            onChange={(e) => setRoundNumber(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="iv_scheduled_at" className="text-sm font-medium text-app-secondary">
            Scheduled date &amp; time
          </label>
          <input
            id="iv_scheduled_at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <Select id="iv_interviewer" label="Interviewer" value={interviewer} onChange={(e) => setInterviewer(e.target.value)}>
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={String(u.id)}>{userLabel(u)}</option>
          ))}
        </Select>

        <Select id="iv_mode" label="Mode" value={mode} onChange={(e) => setMode(e.target.value as InterviewRow['mode'])}>
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>

        {mode === 'in_person' ? (
          <Input id="iv_location" label="Location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Office / site address" />
        ) : (
          <Input id="iv_meeting_link" label="Meeting link" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://…" />
        )}

        {error ? <ErrorState message={error} /> : null}
      </div>
    </Drawer>
  )
}
