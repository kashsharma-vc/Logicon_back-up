import { useEffect, useMemo, useState } from 'react'
import { Briefcase, Search, SendHorizontal } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listHiringApplications, sendApplicationToClientReview } from '@/api/hiring'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { parseApiError } from '@/lib/apiError'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { hiringApplicationStatusLabel, HIRING_APPLICATION_STATUS_OPTIONS } from '@/features/talent/talentLabels'
import { applicationRequiresClientReview } from '@/features/hiring/hiringLaneLabels'
import type { HiringApplicationRow } from '@/features/hiring/types'

function parseNum(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

function parsePage(v: string | null): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function decisionVariant(s: string | null | undefined): 'success' | 'danger' | 'warning' | 'neutral' {
  if (!s) return 'neutral'
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'pending') return 'warning'
  return 'neutral'
}

function nextStepHint(
  status: string,
): { label: string; variant: 'info' | 'success' | 'warning' | 'neutral' } | null {
  if (status === 'client_review') return { label: 'Awaiting client', variant: 'warning' }
  if (status === 'offer_released') return { label: 'Awaiting offer acceptance', variant: 'info' }
  if (status === 'deployed') return { label: 'Deployed', variant: 'success' }
  return null
}

export function HiringApplicationsListPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const site = parseNum(params.get('site'))
  const job_role = parseNum(params.get('job_role'))
  const search = params.get('search') ?? ''
  const page = parsePage(params.get('page'))

  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canSendToClient = hasAnyCapability(meCaps, [CAP.HIRING_APPLICATION_UPDATE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<HiringApplicationRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)
  const [sendingId, setSendingId] = useState<number | null>(null)
  const [sendErrors, setSendErrors] = useState<Record<number, string>>({})
  const [sendSuccess, setSendSuccess] = useState<Record<number, boolean>>({})

  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [roles, setRoles] = useState<JobRoleRow[]>([])
  const [lookupsLoading, setLookupsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLookupsLoading(true)
      try {
        const [sRes, rRes] = await Promise.all([
          listSites({ page: 1 }),
          listJobRoles({ is_active: true, page: 1 }),
        ])
        if (!cancelled) {
          setSites(sRes.items)
          setRoles(rRes.items)
        }
      } catch {
        if (!cancelled) {
          setSites([])
          setRoles([])
        }
      } finally {
        if (!cancelled) setLookupsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await listHiringApplications({
          status: status || undefined,
          site,
          job_role,
          search: search.trim() || undefined,
          page,
        })
        if (!cancelled) {
          setRows(res.items)
          setCount(res.count)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load applications').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [status, site, job_role, search, page])

  function setField(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    p.set('page', '1')
    setParams(p, { replace: true })
  }

  async function handleSendToClient(appId: number) {
    setSendingId(appId)
    setSendErrors((prev) => ({ ...prev, [appId]: '' }))
    setSendSuccess((prev) => ({ ...prev, [appId]: false }))
    try {
      await sendApplicationToClientReview(appId, {})
      setSendSuccess((prev) => ({ ...prev, [appId]: true }))
    } catch (e: unknown) {
      setSendErrors((prev) => ({
        ...prev,
        [appId]: parseApiError(e, 'Could not send to client review').message,
      }))
    } finally {
      setSendingId(null)
    }
  }

  const statusOptions = useMemo(() => [{ value: '', label: 'Any status' }, ...HIRING_APPLICATION_STATUS_OPTIONS], [])

  return (
    <div className="w-full space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-app-text">Applications</h2>
        <p className="text-sm text-app-secondary">Track candidates against hiring demands and pipeline stages.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-subtle" aria-hidden />
          <input
            type="search"
            placeholder="Search candidate name or phone..."
            value={search}
            onChange={(e) => setField('search', e.target.value)}
            className="w-full rounded-panel border border-app-border bg-app-surface py-2 pl-9 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select id="ha_status" label="Status" value={status} onChange={(e) => setField('status', e.target.value)} disabled={lookupsLoading}>
            {statusOptions.map((o) => (
              <option key={o.value || 'any'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select id="ha_site" label="Site" value={site != null ? String(site) : ''} onChange={(e) => setField('site', e.target.value)}>
            <option value="">Any site</option>
            {sites.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select id="ha_role" label="Job role" value={job_role != null ? String(job_role) : ''} onChange={(e) => setField('job_role', e.target.value)}>
            <option value="">Any role</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading applications..." /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No applications" description="Try changing filters or add a candidate from hiring demands." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">Candidate</TH>
                  <TH className="py-2">Site / client</TH>
                  <TH className="py-2">Job role</TH>
                  <TH className="py-2">MRF</TH>
                  <TH className="py-2">Stage</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Client</TH>
                  <TH className="py-2">Decision</TH>
                  <TH className="py-2">Offer</TH>
                  <TH className="py-2 text-right"> </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((a) => {
                  const busy = sendingId === a.id
                  const sent = sendSuccess[a.id] ?? false
                  const rowErr = sendErrors[a.id] ?? ''
                  const canSend =
                    canSendToClient &&
                    applicationRequiresClientReview(a) &&
                    !a.client_visible &&
                    a.status !== 'rejected' &&
                    a.status !== 'cancelled'
                  const hint = nextStepHint(a.status)
                  return (
                    <TR key={a.id}>
                      <TD className="py-2">
                        <p className="text-sm font-medium">{a.candidate_name ?? `Candidate #${a.candidate}`}</p>
                        {a.candidate_phone ? <p className="font-mono text-xs text-app-secondary">{a.candidate_phone}</p> : null}
                      </TD>
                      <TD className="py-2 text-xs text-app-secondary">
                        {a.site_name ?? `Site #${a.site}`}
                        {a.client_name ? ` - ${a.client_name}` : null}
                      </TD>
                      <TD className="py-2 text-xs">{a.job_role_name ?? `Role #${a.job_role}`}</TD>
                      <TD className="py-2 font-mono text-xs">#{a.mrf}</TD>
                      <TD className="py-2 text-xs">{a.current_stage_name ?? '-'}</TD>
                      <TD className="py-2">
                        <Badge variant="neutral" className="text-[11px]">{hiringApplicationStatusLabel(a.status)}</Badge>
                      </TD>
                      <TD className="py-2 text-xs">
                        {a.client_visible ? <Badge variant="info" className="text-[11px]">Visible</Badge> : <span className="text-app-subtle">-</span>}
                      </TD>
                      <TD className="py-2">
                        {a.client_decision ? (
                          <Badge variant={decisionVariant(a.client_decision)} className="text-[11px]">{a.client_decision}</Badge>
                        ) : <span className="text-xs text-app-subtle">-</span>}
                      </TD>
                      <TD className="py-2">
                        {a.offer_status ? <Badge variant="neutral" className="text-[11px]">{a.offer_status}</Badge> : <span className="text-xs text-app-subtle">-</span>}
                      </TD>
                      <TD className="py-2 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-1">
                            {canSend && !sent ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-7 gap-1 px-2 text-xs"
                                disabled={busy || sendingId != null}
                                onClick={() => void handleSendToClient(a.id)}
                              >
                                <SendHorizontal className="h-3 w-3" aria-hidden />
                                {busy ? '...' : 'Client'}
                              </Button>
                            ) : null}
                            {sent ? <Badge variant="success" className="text-[11px]">Sent</Badge> : null}
                            {a.status === 'selected' ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-7 gap-1 px-2 text-xs"
                                onClick={() => navigate(`/hiring/applications/${a.id}`)}
                              >
                                <Briefcase className="h-3 w-3" aria-hidden />
                                Create offer
                              </Button>
                            ) : null}
                            {a.status === 'offer_accepted' ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="min-h-7 gap-1 px-2 text-xs"
                                onClick={() => navigate(`/hiring/applications/${a.id}?openConvert=1`)}
                              >
                                <Briefcase className="h-3 w-3" aria-hidden />
                                Convert
                              </Button>
                            ) : null}
                            {hint ? <Badge variant={hint.variant} className="text-[11px]">{hint.label}</Badge> : null}
                            <Button
                              type="button"
                              variant="secondary"
                              className="min-h-7 px-2 text-xs"
                              onClick={() => navigate(`/hiring/applications/${a.id}`)}
                            >
                              Open
                            </Button>
                          </div>
                          {rowErr ? <p className="text-[11px] text-status-danger">{rowErr}</p> : null}
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {rows.map((a) => {
              const convertEligible = a.status === 'offer_accepted'
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      convertEligible
                        ? `/hiring/applications/${a.id}?openConvert=1`
                        : `/hiring/applications/${a.id}`,
                    )
                  }
                  className="w-full rounded-panel border border-app-border bg-app-surface p-3 text-left shadow-panel transition-colors hover:border-brand-500/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-app-text">{a.candidate_name ?? `Candidate #${a.candidate}`}</p>
                    {convertEligible ? (
                      <Badge variant="info" className="text-[11px]">Convert</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-app-secondary">
                    {a.job_role_name} - {a.site_name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="text-app-subtle">Stage:</span> {a.current_stage_name ?? '-'}
                    <span className="text-app-subtle">-</span>
                    {hiringApplicationStatusLabel(a.status)}
                  </div>
                </button>
              )
            })}
          </div>

          {count != null ? <p className="text-xs text-app-subtle">Total: {count}</p> : null}
        </>
      ) : null}
    </div>
  )
}
