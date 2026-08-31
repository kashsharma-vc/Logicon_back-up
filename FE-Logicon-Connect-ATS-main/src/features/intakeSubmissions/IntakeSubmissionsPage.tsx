import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listCampaigns } from '@/api/campaigns'
import { listIntakeSubmissions } from '@/api/intakeSubmissions'
import { listJobRoles } from '@/api/jobs'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { SubmissionStatusBadge } from '@/features/intakeSubmissions/SubmissionStatusBadge'
import type { IntakeSubmissionRow, SubmissionStatus } from '@/features/intakeSubmissions/types'

function parseNumParam(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  return n
}

function parseBoolParam(v: string | null): boolean | undefined {
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

function parsePage(v: string | null): number | undefined {
  if (!v) return undefined
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return undefined
  return Math.floor(n)
}

const STATUS_OPTIONS: { value: SubmissionStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'hired', label: 'Hired' },
  { value: 'duplicate', label: 'Duplicate' },
]

export function IntakeSubmissionsPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canRead = hasAnyCapability(meCaps, [CAP.SUBMISSION_READ])
  void canRead

  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const status = params.get('status') ?? ''
  const campaign = parseNumParam(params.get('campaign'))
  const job_role = parseNumParam(params.get('job_role'))
  const language = params.get('language') ?? ''
  const duplicate = parseBoolParam(params.get('duplicate'))
  const page = parsePage(params.get('page')) ?? 1

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<IntakeSubmissionRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)

  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [campaignsError, setCampaignsError] = useState<string | null>(null)
  const [campaignOptions, setCampaignOptions] = useState<{ id: number; label: string }[]>([])
  const campaignLabelById = useMemo(
    () => new Map(campaignOptions.map((c) => [c.id, c.label])),
    [campaignOptions],
  )

  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [roleOptions, setRoleOptions] = useState<{ id: number; label: string }[]>([])
  const roleLabelById = useMemo(() => new Map(roleOptions.map((r) => [r.id, r.label])), [roleOptions])

  function updateParam(next: Record<string, string | null>) {
    const p = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => {
      if (v == null || v === '') p.delete(k)
      else p.set(k, v)
    })
    if (
      next.search !== undefined ||
      next.status !== undefined ||
      next.campaign !== undefined ||
      next.job_role !== undefined ||
      next.language !== undefined ||
      next.duplicate !== undefined
    ) {
      p.delete('page')
    }
    setParams(p)
  }

  function clearFilters() {
    setParams(new URLSearchParams())
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listIntakeSubmissions({
        search: search || undefined,
        status: status || undefined,
        campaign,
        job_role,
        language: language || undefined,
        is_possible_duplicate: duplicate,
        page,
      })
      setRows(res.items)
      setCount(res.count)
    } catch (e: unknown) {
      setRows([])
      setCount(undefined)
      setError(parseApiError(e, 'Failed to load submissions').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadCampaignsLookup() {
    setCampaignsLoading(true)
    setCampaignsError(null)
    try {
      const res = await listCampaigns({ search: '', page: 1 })
      setCampaignOptions(
        res.items.map((c) => ({ id: c.id, label: c.title || c.name })),
      )
    } catch (e: unknown) {
      setCampaignOptions([])
      setCampaignsError(parseApiError(e, 'Campaign lookup failed').message)
    } finally {
      setCampaignsLoading(false)
    }
  }

  async function loadRolesLookup() {
    setRolesLoading(true)
    setRolesError(null)
    try {
      const res = await listJobRoles('')
      setRoleOptions(res.map((r) => ({ id: r.id, label: `${r.name} (${r.code})` })))
    } catch (e: unknown) {
      setRoleOptions([])
      setRolesError(parseApiError(e, 'Job role lookup failed').message)
    } finally {
      setRolesLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, campaign, job_role, language, duplicate, page])

  useEffect(() => {
    void loadCampaignsLookup()
    void loadRolesLookup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPages = useMemo(() => {
    if (typeof count !== 'number') return undefined
    return Math.max(1, Math.ceil(count / 50))
  }, [count])

  const mobileCards = (
    <div className="grid gap-3 md:hidden">
      {rows.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => navigate(`/intake-submissions/${r.id}`)}
          className="w-full rounded-panel border border-app-border bg-app-surface p-4 text-left shadow-panel hover:bg-app-muted"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-app-text">
                #{r.id} - {r.full_name || [r.first_name, r.middle_name, r.last_name].filter(Boolean).join(' ')}
              </p>
              <p className="truncate text-xs text-app-secondary">{r.mobile_number_normalized}</p>
              <p className="truncate text-xs text-app-subtle">
                {campaignLabelById.get(r.campaign) ?? `Campaign #${r.campaign}`}
              </p>
              <p className="truncate text-xs text-app-subtle">
                {r.job_role
                  ? roleLabelById.get(r.job_role) ?? `Role #${r.job_role}`
                  : r.other_role_title
                    ? `Other: ${r.other_role_title}`
                    : '-'}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <SubmissionStatusBadge status={r.status} />
              {r.is_possible_duplicate ? <Badge variant="warning">Duplicate</Badge> : null}
            </div>
          </div>
          <p className="mt-3 text-xs text-app-secondary">{new Date(r.submitted_at).toLocaleString()}</p>
        </button>
      ))}
    </div>
  )

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Intake submissions</h2>
          <p className="text-sm text-app-secondary">Review applications received via QR campaigns.</p>
        </div>
      </div>

      {(campaignsError || rolesError) ? (
        <ErrorState
          message={[
            campaignsError ? `Campaign lookup failed: ${campaignsError}` : null,
            rolesError ? `Job role lookup failed: ${rolesError}` : null,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ) : null}

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Filters</p>
            <div className="relative">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
                <Search className="h-4 w-4" aria-hidden />
              </div>
              <input
                value={search}
                onChange={(e) => updateParam({ search: e.target.value })}
                placeholder="Search candidate name or mobile"
                className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                aria-label="Search submissions"
              />
            </div>
          </div>
          <div className="flex shrink-0 justify-end">
            <Button
              type="button"
              variant="ghost"
              className="min-h-9 px-2 text-sm text-app-secondary"
              onClick={clearFilters}
              disabled={!search && !status && !campaign && !job_role && !language && typeof duplicate !== 'boolean'}
            >
              Clear
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            id="submission_status_filter"
            label="Status"
            value={status}
            onChange={(e) => updateParam({ status: e.target.value || null })}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Select
            id="submission_duplicate_filter"
            label="Duplicate"
            value={typeof duplicate === 'boolean' ? String(duplicate) : ''}
            onChange={(e) => updateParam({ duplicate: e.target.value || null })}
          >
            <option value="">All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </Select>

          <Select
            id="submission_campaign_filter"
            label="Campaign"
            value={campaign ? String(campaign) : ''}
            onChange={(e) => updateParam({ campaign: e.target.value || null })}
            disabled={campaignsLoading || !!campaignsError}
          >
            <option value="">All</option>
            {campaignOptions.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.label}
              </option>
            ))}
          </Select>

          <Select
            id="submission_role_filter"
            label="Job role"
            value={job_role ? String(job_role) : ''}
            onChange={(e) => updateParam({ job_role: e.target.value || null })}
            disabled={rolesLoading || !!rolesError}
          >
            <option value="">All</option>
            {roleOptions.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.label}
              </option>
            ))}
          </Select>

          <Select
            id="submission_language_filter"
            label="Language"
            value={language}
            onChange={(e) => updateParam({ language: e.target.value || null })}
          >
            <option value="">All</option>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="mr">Marathi</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <Spinner label="Loading submissions..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No submissions found" description="Try adjusting your filters." />
      ) : (
        <>
          {mobileCards}

          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">ID</TH>
                  <TH className="py-2">Candidate</TH>
                  <TH className="py-2">Mobile</TH>
                  <TH className="py-2">Campaign</TH>
                  <TH className="py-2">Role</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Lang</TH>
                  <TH className="py-2">Dup</TH>
                  <TH className="py-2">Submitted</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => (
                  <TR
                    key={r.id}
                    className="cursor-pointer hover:bg-app-muted"
                    onClick={() => navigate(`/intake-submissions/${r.id}`)}
                  >
                    <TD className="py-2 font-mono text-xs text-app-secondary">#{r.id}</TD>
                    <TD className="py-2 text-sm text-app-text">{r.full_name || '—'}</TD>
                    <TD className="py-2 text-sm text-app-secondary">{r.mobile_number_normalized}</TD>
                    <TD className="py-2 text-sm text-app-secondary">
                      {campaignLabelById.get(r.campaign) ?? `Campaign #${r.campaign}`}
                    </TD>
                    <TD className="py-2 text-sm text-app-secondary">
                      {r.job_role
                        ? roleLabelById.get(r.job_role) ?? `Role #${r.job_role}`
                        : r.other_role_title
                          ? `Other: ${r.other_role_title}`
                          : '—'}
                    </TD>
                    <TD className="py-2">
                      <SubmissionStatusBadge status={r.status} />
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{r.language}</TD>
                    <TD className="py-2">
                      {r.is_possible_duplicate ? <Badge variant="warning">Yes</Badge> : <Badge variant="neutral">No</Badge>}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">{new Date(r.submitted_at).toLocaleString()}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          {typeof totalPages === 'number' ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-sm text-app-secondary">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" disabled={page <= 1} onClick={() => updateParam({ page: String(page - 1) })}>
                  Prev
                </Button>
                <Button
                  variant="secondary"
                  disabled={totalPages ? page >= totalPages : rows.length < 50}
                  onClick={() => updateParam({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}


