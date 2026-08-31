import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw, Search, XCircle } from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { listClientReviewApplications, recordClientDecision } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { applicationIsInternalNonBillable } from '@/features/hiring/hiringLaneLabels'
import { formatMatchScore } from '@/features/hiring/matchScoreLabels'
import type { ClientReviewApplicationRow } from '@/features/hiring/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtConfidence(v: string | number | null | undefined): string {
  if (v == null || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  return `${(n * 100).toFixed(0)}%`
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return s
  }
}

function decisionVariant(s: string | null | undefined): 'success' | 'danger' | 'warning' | 'neutral' {
  if (!s) return 'neutral'
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'pending') return 'warning'
  return 'neutral'
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function CandidateDrawer({
  app,
  open,
  onClose,
  canDecide,
  onDecision,
}: {
  app: ClientReviewApplicationRow | null
  open: boolean
  onClose: () => void
  canDecide: boolean
  onDecision: (updated: ClientReviewApplicationRow) => void
}) {
  const [deciding, setDeciding] = useState(false)
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) {
      setDecisionError(null)
      setNote('')
    }
  }, [open])

  if (!app) return null

  const cs = app.candidate_summary
  const rs = app.resume_summary
  const alreadyDecided = app.client_decision === 'approved' || app.client_decision === 'rejected'

  async function decide(decision: 'approved' | 'rejected') {
    if (!app) return
    setDeciding(true)
    setDecisionError(null)
    try {
      const updated = await recordClientDecision(app.id, { 
        decision, 
        note: note.trim() || undefined,
        override: alreadyDecided ? true : undefined
      })
      onDecision(updated as ClientReviewApplicationRow)
      onClose()
    } catch (e: unknown) {
      setDecisionError(parseApiError(e, 'Could not record decision').message)
    } finally {
      setDeciding(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => !deciding && onClose()}
      title={cs?.full_name ?? `Application #${app.id}`}
      description={`${app.job_role_name ?? ''} · ${app.site_name ?? ''}`}
      footer={
        canDecide ? (
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-app-secondary">Note (optional)</label>
              <textarea
                className="w-full rounded border border-app-border bg-app-surface px-2 py-1.5 text-xs text-app-text placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                rows={2}
                placeholder="Add a note for this decision…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={deciding}
              />
            </div>
            {decisionError ? (
              <p className="text-xs text-status-danger">{decisionError}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1 gap-1 min-h-9 text-sm bg-status-hired text-white hover:opacity-90"
                disabled={deciding}
                onClick={() => void decide('approved')}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                {deciding ? 'Saving…' : 'Approve'}
              </Button>
              <Button
                type="button"
                variant="danger"
                className="flex-1 gap-1 min-h-9 text-sm"
                disabled={deciding}
                onClick={() => void decide('rejected')}
              >
                <XCircle className="h-4 w-4" aria-hidden />
                {deciding ? 'Saving…' : 'Reject'}
              </Button>
            </div>
            {alreadyDecided ? (
              <p className="text-[11px] text-app-subtle">Decision already recorded. These actions will override it.</p>
            ) : null}
          </div>
        ) : null
      }
    >
      <div className="space-y-5">
        {cs ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-secondary">Candidate</h3>
            <div className="space-y-1 text-sm">
              <KV label="Name" value={cs.full_name || '-'} />
              <KV label="Phone" value={<span className="font-mono">{cs.phone}</span>} />
              {cs.email ? <KV label="Email" value={cs.email} /> : null}
              {cs.current_role ? <KV label="Role" value={cs.current_role} /> : null}
              {cs.current_location ? <KV label="Location" value={cs.current_location} /> : null}
              {cs.total_experience_years ? <KV label="Experience" value={`${cs.total_experience_years} yrs`} /> : null}
              {cs.availability_status ? (
                <KV label="Availability" value={<Badge variant="neutral" className="text-[11px]">{cs.availability_status.replace(/_/g, ' ')}</Badge>} />
              ) : null}
            </div>
          </section>
        ) : null}

        {rs ? (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-secondary">Resume summary</h3>
            <div className="space-y-1 text-sm">
              {rs.confidence ? <KV label="Confidence" value={fmtConfidence(rs.confidence)} /> : null}
              {rs.career_level ? <KV label="Career level" value={rs.career_level} /> : null}
              {rs.primary_domain ? <KV label="Domain" value={rs.primary_domain} /> : null}
              {rs.summary ? (
                <div className="rounded bg-app-muted/50 p-2 text-xs text-app-text">{rs.summary}</div>
              ) : null}
            </div>
          </section>
        ) : null}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-app-secondary">Requested role</h3>
          <div className="space-y-1 text-sm">
            {app.job_role_name ? <KV label="Role" value={app.job_role_name} /> : null}
            {app.site_name ? <KV label="Site" value={app.site_name} /> : null}
            {app.client_name ? <KV label="Client" value={app.client_name} /> : null}
            {app.match_score != null ? <KV label="Match score" value={formatMatchScore(app.match_score)} /> : null}
            {app.client_decision ? (
              <KV label="Decision" value={
                <Badge variant={decisionVariant(app.client_decision)} className="text-[11px]">
                  {app.client_decision}
                </Badge>
              } />
            ) : null}
            {app.client_decision_note ? <KV label="Decision note" value={app.client_decision_note} /> : null}
            {app.client_decision_by_username ? <KV label="Decided by" value={app.client_decision_by_username} /> : null}
            {app.client_decision_at ? <KV label="Decided at" value={fmtDate(app.client_decision_at)} /> : null}
          </div>
        </section>
      </div>
    </Drawer>
  )
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="w-28 shrink-0 text-xs text-app-secondary">{label}</span>
      <span className="text-xs text-app-text break-all">{value ?? '-'}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClientReviewPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canDecide = hasAnyCapability(meCaps, [CAP.HIRING_APPLICATION_UPDATE])

  const [rows, setRows] = useState<ClientReviewApplicationRow[]>([])
  const [count, setCount] = useState<number | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [onlyPending, setOnlyPending] = useState(false)
  const [decisionFilter, setDecisionFilter] = useState('')

  const [selectedApp, setSelectedApp] = useState<ClientReviewApplicationRow | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listClientReviewApplications({
        search: search.trim() || undefined,
        only_pending: onlyPending || undefined,
        client_decision: decisionFilter || undefined,
      })
      // Defensive filter: backend is source of truth, but exclude internal non-billable as fallback
      const filteredItems = res.items.filter((app) => !applicationIsInternalNonBillable(app))
      setRows(filteredItems)
      setCount(filteredItems.length)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not load candidate review queue').message)
    } finally {
      setLoading(false)
    }
  }, [search, onlyPending, decisionFilter])

  useEffect(() => {
    void load()
  }, [load])

  function openDrawer(app: ClientReviewApplicationRow) {
    setSelectedApp(app)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelectedApp(null)
  }

  function handleDecision(updated: ClientReviewApplicationRow) {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  const DECISION_OPTS = [
    { value: '', label: 'Any decision' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Candidate review</h2>
        <p className="text-sm text-app-secondary">
          Review candidates shared for your approval. Approve or reject each candidate for the requested role.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-app-subtle" aria-hidden />
          <input
            type="search"
            placeholder="Search candidate name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-full rounded border border-app-border bg-app-surface pl-7 pr-2 text-xs text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <select
          value={decisionFilter}
          onChange={(e) => setDecisionFilter(e.target.value)}
          className="h-8 rounded border border-app-border bg-app-surface px-2 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {DECISION_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyPending}
            onChange={(e) => setOnlyPending(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-app-border accent-brand-600"
          />
          <span className="text-xs text-app-text">Pending only</span>
        </label>
        <Button
          type="button"
          variant="secondary"
          className="min-h-8 gap-1 px-2 text-xs"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
        </Button>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading client review queue…" /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title="No applications"
          description="No client-visible applications match these filters."
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-panel border border-app-border bg-app-surface shadow-panel">
          <Table>
            <THead>
              <TR>
                <TH className="py-2">Candidate</TH>
                <TH className="py-2">Role / site</TH>
                <TH className="py-2">Experience</TH>
                <TH className="py-2">Match</TH>
                <TH className="py-2">Summary</TH>
                <TH className="py-2">Decision</TH>
                <TH className="py-2 text-right"> </TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((app) => {
                const cs = app.candidate_summary
                const rs = app.resume_summary
                return (
                  <TR key={app.id}>
                    <TD className="py-2">
                      <p className="text-sm font-medium text-app-text">
                        {cs?.full_name || `Candidate #${app.candidate}`}
                      </p>
                      {cs?.current_role ? (
                        <p className="text-xs text-app-secondary">{cs.current_role}</p>
                      ) : null}
                      {cs?.phone ? (
                        <p className="font-mono text-[11px] text-app-subtle">{cs.phone}</p>
                      ) : null}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      <p className="text-app-text">{app.job_role_name ?? `Role #${app.job_role}`}</p>
                      <p>{app.site_name ?? `Site #${app.site}`}</p>
                      {app.client_name ? <p className="text-app-subtle">{app.client_name}</p> : null}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      <p>{cs?.total_experience_years ? `${cs.total_experience_years} yrs` : '—'}</p>
                      {cs?.current_location ? <p className="text-app-subtle">{cs.current_location}</p> : null}
                    </TD>
                    <TD className="py-2 text-xs font-medium">{formatMatchScore(app.match_score)}</TD>
                    <TD className="py-2 max-w-[260px] text-xs text-app-secondary">
                      {rs?.summary ? (
                        <span className="line-clamp-2">{rs.summary}</span>
                      ) : (
                        <span className="text-app-subtle">—</span>
                      )}
                    </TD>
                    <TD className="py-2">
                      {app.client_decision ? (
                        <Badge variant={decisionVariant(app.client_decision)} className="text-[11px]">
                          {app.client_decision}
                        </Badge>
                      ) : <Badge variant="warning" className="text-[11px]">Pending</Badge>}
                      {app.client_decision_at ? (
                        <p className="mt-0.5 text-[11px] text-app-subtle">{fmtDate(app.client_decision_at)}</p>
                      ) : null}
                    </TD>
                    <TD className="py-2 text-right">
                      <Button
                        type="button"
                        variant="secondary"
                        className="min-h-7 px-2 text-xs"
                        onClick={() => openDrawer(app)}
                      >
                        Review
                      </Button>
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
          {count != null ? <p className="px-3 py-2 text-xs text-app-subtle">Total: {count}</p> : null}
        </div>
      ) : null}

      <CandidateDrawer
        app={selectedApp}
        open={drawerOpen}
        onClose={closeDrawer}
        canDecide={canDecide}
        onDecision={handleDecision}
      />
    </div>
  )
}
