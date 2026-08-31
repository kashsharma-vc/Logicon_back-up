import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { listCampaigns } from '@/api/campaigns'
import { getIntakeSubmission, patchIntakeSubmissionStatus } from '@/api/intakeSubmissions'
import { listJobRoles } from '@/api/jobs'
import { api } from '@/api/client'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { SubmissionStatusBadge } from '@/features/intakeSubmissions/SubmissionStatusBadge'
import type { IntakeSubmissionDetail, SubmissionStatus } from '@/features/intakeSubmissions/types'

const STATUS_OPTIONS: { value: SubmissionStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'hired', label: 'Hired' },
  { value: 'duplicate', label: 'Duplicate' },
]

function absoluteFileUrl(file: string): string {
  if (!file) return file
  if (file.startsWith('http://') || file.startsWith('https://')) return file
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '')
  if (!base) return file
  if (file.startsWith('/')) return `${base}${file}`
  return `${base}/${file}`
}

function formatAnswerValue(value: unknown): string {
  if (value == null) return '—'
  if (typeof value === 'string') return value.trim() || '—'
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function IntakeSubmissionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const submissionId = Number(id)
  const navigate = useNavigate()

  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canUpdateStatus = hasAnyCapability(meCaps, [CAP.SUBMISSION_UPDATE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<IntakeSubmissionDetail | null>(null)

  const [campaignLabelById, setCampaignLabelById] = useState<Map<number, string>>(new Map())
  const [roleLabelById, setRoleLabelById] = useState<Map<number, string>>(new Map())

  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [nextStatus, setNextStatus] = useState<string>('')

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await getIntakeSubmission(submissionId)
      setRow(res)
      setNextStatus(res.status)
    } catch (e: unknown) {
      setRow(null)
      setError(parseApiError(e, 'Failed to load submission').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    try {
      const [camps, roles] = await Promise.all([listCampaigns({ search: '', page: 1 }), listJobRoles('')])
      setCampaignLabelById(new Map(camps.items.map((c) => [c.id, c.title || c.name])))
      setRoleLabelById(new Map(roles.map((r) => [r.id, `${r.name} (${r.code})`])))
    } catch {
      // optional lookups; no blocking
    }
  }

  useEffect(() => {
    if (!Number.isFinite(submissionId)) {
      setError('Invalid submission id.')
      setLoading(false)
      return
    }
    void refresh()
    void loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId])

  const displayName = useMemo(() => {
    if (!row) return ''
    return row.full_name || [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ')
  }, [row])

  async function handlePatchStatus() {
    if (!row || !canUpdateStatus) return
    if (!nextStatus || nextStatus === row.status) return
    setStatusSubmitting(true)
    setStatusError(null)
    try {
      const updated = await patchIntakeSubmissionStatus(row.id, { status: nextStatus })
      setRow(updated)
      setNextStatus(updated.status)
    } catch (e: unknown) {
      setStatusError(parseApiError(e, 'Could not update status').message)
    } finally {
      setStatusSubmitting(false)
    }
  }

  if (loading) {
    return <Spinner label="Loading submission..." />
  }

  if (error) {
    return (
      <div className="space-y-3">
        <ErrorState message={error} />
        <div className="flex justify-end">
          <Button
            variant="secondary"
            className="min-h-9 px-2"
            onClick={() => navigate('/intake-submissions')}
            aria-label="Back to submissions"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    )
  }

  if (!row) {
    return <EmptyState title="Submission not found" description="This submission may have been removed." />
  }

  return (
    <div className="w-full space-y-6">
      <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Submission</p>
            <h2 className="mt-1 truncate text-lg font-semibold text-app-text">
              #{row.id} · {displayName || '—'}
            </h2>
            <p className="mt-1 text-sm text-app-secondary">
              <span className="font-mono">{row.mobile_number_normalized}</span>
              <span className="text-app-subtle"> · </span>
              <span>{new Date(row.submitted_at).toLocaleString()}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <SubmissionStatusBadge status={row.status} />
            {row.is_possible_duplicate ? <Badge variant="warning">Possible duplicate</Badge> : null}
            <Button
              variant="secondary"
              className="min-h-9 px-2"
              onClick={() => navigate('/intake-submissions')}
              aria-label="Back to submissions"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel lg:col-span-2">
          <p className="text-sm font-semibold text-app-text">Candidate</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-panel border border-app-border bg-app-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Name</p>
              <p className="mt-1 text-sm font-semibold text-app-text">{displayName || '—'}</p>
              <p className="mt-1 text-xs text-app-secondary">
                {row.first_name || '—'} {row.middle_name ? `· ${row.middle_name}` : ''} {row.last_name ? `· ${row.last_name}` : ''}
              </p>
            </div>
            <div className="rounded-panel border border-app-border bg-app-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Contact</p>
              <p className="mt-1 text-sm font-semibold text-app-text">
                <span className="font-mono">{row.mobile_number_normalized || '—'}</span>
              </p>
              <p className="mt-1 text-xs text-app-secondary">Language: {row.language}</p>
            </div>
          </div>
        </div>

        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-sm font-semibold text-app-text">Campaign & role</p>
          <dl className="mt-3 grid gap-3 text-sm">
            <div className="rounded-panel border border-app-border bg-app-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Campaign</p>
              <p className="mt-1 text-sm font-semibold text-app-text">
                {campaignLabelById.get(row.campaign) ?? `Campaign #${row.campaign}`}
              </p>
            </div>
            <div className="rounded-panel border border-app-border bg-app-muted p-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Role</p>
              <p className="mt-1 text-sm font-semibold text-app-text">
                {row.job_role
                  ? roleLabelById.get(row.job_role) ?? `Role #${row.job_role}`
                  : row.other_role_title
                    ? `Other: ${row.other_role_title}`
                    : '—'}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-panel border border-app-border bg-app-muted p-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Duplicate</p>
                {row.duplicate_reason ? <p className="mt-1 text-xs text-app-secondary">{row.duplicate_reason}</p> : null}
              </div>
              <div>{row.is_possible_duplicate ? <Badge variant="warning">Yes</Badge> : <Badge variant="neutral">No</Badge>}</div>
            </div>
          </dl>
        </div>
      </div>

      {canUpdateStatus ? (
        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-sm font-semibold text-app-text">Update status</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Select
              id="submission_status"
              label="Status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              disabled={statusSubmitting}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Button type="button" onClick={handlePatchStatus} disabled={statusSubmitting || nextStatus === row.status}>
              {statusSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
          {statusError ? <p className="mt-2 text-xs text-status-danger">{statusError}</p> : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-sm font-semibold text-app-text">Answers</p>
          {row.answers?.length ? (
            <div className="mt-3 space-y-3">
              {row.answers.map((a) => (
                <div key={a.id} className="rounded-panel border border-app-border bg-app-muted p-3">
                  <p className="text-sm font-semibold text-app-text">{a.field_label_snapshot || `Field #${a.field ?? '—'}`}</p>
                  <p className="mt-1 text-xs text-app-subtle">{a.field_type_snapshot}</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-app-secondary">{formatAnswerValue(a.value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-app-secondary">No answers recorded.</p>
          )}
        </div>

        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-sm font-semibold text-app-text">Documents</p>
          {row.documents?.length ? (
            <ul className="mt-3 space-y-2">
              {row.documents.map((d) => (
                <li key={d.id} className="flex items-start justify-between gap-3 rounded-panel border border-app-border bg-app-muted p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-app-text">{d.original_filename || `Document #${d.id}`}</p>
                    <p className="text-xs text-app-secondary">
                      {d.document_type} · {d.content_type || '—'} · {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : '—'}
                    </p>
                  </div>
                  <a
                    className="shrink-0 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text hover:bg-app-surface-muted"
                    href={absoluteFileUrl(d.file)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-app-secondary">No documents uploaded.</p>
          )}
        </div>
      </div>

      {(row.ip_address || row.user_agent) ? (
        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-sm font-semibold text-app-text">Metadata</p>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">IP</dt>
              <dd className="font-mono text-xs text-app-secondary">{row.ip_address ?? '—'}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-app-subtle">User agent</dt>
              <dd className="max-w-[900px] truncate text-right text-xs text-app-secondary">{row.user_agent || '—'}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  )
}


