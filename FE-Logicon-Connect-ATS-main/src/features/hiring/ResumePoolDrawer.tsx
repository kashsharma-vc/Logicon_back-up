import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, UserPlus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bulkShortlistCandidatesForDemand, getRankedCandidatePool, shortlistCandidateForDemand } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Spinner } from '@/components/ui/Spinner'
import { CandidateMatchScorecard } from '@/features/hiring/CandidateMatchScorecard'
import { matchStatusBadgeVariant } from '@/features/hiring/matchScoreLabels'
import { poolRowToScorecard } from '@/features/hiring/matchResultMapper'
import {
  candidateJourneyStatusLabel,
  candidateJourneyStatusVariant,
  isJourneyStatusBlocked,
  sourceTypeLabel,
  sourceTypeVariant,
} from '@/features/talent/talentLabels'
import {
  hasLaneInfo,
  hiringLaneBadgeLabel,
  requiresClientReview,
} from '@/features/hiring/hiringLaneLabels'
import type { CandidatePoolResultRow, HiringDemandRow, PoolCandidateSummary } from '@/features/hiring/types'

function displayName(c: PoolCandidateSummary): string {
  if (c.full_name?.trim()) return c.full_name.trim()
  return [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ')
}

function formatExp(y: string | number | null | undefined): string {
  if (y == null || y === '') return '-'
  return String(y)
}

function lifecycleLabel(s: string | null | undefined): string {
  if (!s) return '-'
  return s.replace(/_/g, ' ')
}

function defaultLocation(demand: HiringDemandRow): string {
  return demand.site_name?.trim() || demand.client_name?.trim() || ''
}

function defaultRole(demand: HiringDemandRow): string {
  return demand.job_role_name?.trim() || ''
}

export function ResumePoolDrawer({
  open,
  demand,
  onClose,
  onLinked,
}: {
  open: boolean
  demand: HiringDemandRow | null
  onClose: () => void
  onLinked: () => void
}) {
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [skill, setSkill] = useState('')
  const [minExperience, setMinExperience] = useState('')
  const [maxExperience, setMaxExperience] = useState('')

  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CandidatePoolResultRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const [linkingId, setLinkingId] = useState<number | null>(null)
  const [bulkLinking, setBulkLinking] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkedAppId, setLinkedAppId] = useState<number | null>(null)
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null)

  const resetFilters = useCallback((d: HiringDemandRow) => {
    setRole(defaultRole(d))
    setLocation(defaultLocation(d))
    setSkill('')
    setMinExperience('')
    setMaxExperience('')
  }, [])

  useEffect(() => {
    if (!open || !demand) return
    resetFilters(demand)
    setSearched(false)
    setError(null)
    setRows([])
    setCount(undefined)
    setExpandedId(null)
    setSelectedIds([])
    setLinkError(null)
    setLinkedAppId(null)
    setLinkingId(null)
    setBulkSuccessMsg(null)
  }, [open, demand, resetFilters])

  async function runSearch(page = 1) {
    if (!demand) return
    setLoading(true)
    setError(null)
    setLinkError(null)
    setLinkedAppId(null)
    setSelectedIds([])
    setBulkSuccessMsg(null)
    try {
      const res = await getRankedCandidatePool(demand.id, {
        location: location.trim() || undefined,
        skills: skill.trim() || undefined,
        min_experience: minExperience.trim() || undefined,
        max_experience: maxExperience.trim() || undefined,
        page,
      })
      setRows(res.items)
      setCount(res.count)
      setSearched(true)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not search resume pool').message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  function clearFilters() {
    if (demand) resetFilters(demand)
    setSearched(false)
    setError(null)
    setRows([])
    setCount(undefined)
    setExpandedId(null)
    setSelectedIds([])
    setLinkError(null)
    setLinkedAppId(null)
    setBulkSuccessMsg(null)
  }

  function toggleSelect(candidateId: number) {
    setSelectedIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId],
    )
  }

  function toggleSelectAll() {
    const allIds = rows.map((r) => r.candidate.id)
    if (selectedIds.length === allIds.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(allIds)
    }
  }

  async function linkCandidate(row: CandidatePoolResultRow) {
    if (!demand) return
    const candidate = row.candidate
    if (!Number.isFinite(candidate.id)) {
      setLinkError('Candidate id is missing from the pool result. Refresh the search and try again.')
      return
    }
    setLinkingId(candidate.id)
    setLinkError(null)
    setLinkedAppId(null)
    setBulkSuccessMsg(null)
    try {
      const app = await shortlistCandidateForDemand(demand.id, {
        candidate: candidate.id,
        match_result: row.match_result ?? undefined,
      })
      setLinkedAppId(app.id)
      onLinked()
    } catch (e: unknown) {
      setLinkError(parseApiError(e, 'Could not link candidate').message)
    } finally {
      setLinkingId(null)
    }
  }

  async function linkSelectedCandidates() {
    if (!demand || selectedIds.length === 0) return
    setBulkLinking(true)
    setLinkError(null)
    setLinkedAppId(null)
    setBulkSuccessMsg(null)
    try {
      const res = await bulkShortlistCandidatesForDemand(demand.id, {
        candidate_ids: selectedIds,
        comment: 'Bulk shortlisted via resume pool drawer.',
      })
      setBulkSuccessMsg(`Successfully linked ${res.created_count} candidate(s) to this demand.`)
      setSelectedIds([])
      onLinked()
    } catch (e: unknown) {
      setLinkError(parseApiError(e, 'Could not link selected candidates').message)
    } finally {
      setBulkLinking(false)
    }
  }

  const busy = loading || linkingId != null || bulkLinking
  const laneLabel = demand && hasLaneInfo(demand) ? hiringLaneBadgeLabel(demand) : null
  const demandSummary = demand
    ? `${demand.job_role_name ?? 'Role'} | ${demand.site_name ?? 'Site'}${demand.client_name ? ` | ${demand.client_name}` : ''}${laneLabel ? ` | ${laneLabel}` : ''}`
    : ''
  const needsClientReview = demand ? requiresClientReview(demand) : false
  const allSelected = rows.length > 0 && selectedIds.length === rows.length

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title="Find from resume pool"
      description="Search uploaded candidates and link the best match to this hiring demand."
      footer={
        <PoolDrawerFooter onClose={onClose} busy={busy} />
      }
    >
      {demand ? <p className="mb-4 text-xs text-app-secondary">{demandSummary}</p> : null}

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input id="pool_role" label="Role" value={role} onChange={(e) => setRole(e.target.value)} />
          <Input id="pool_loc" label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Input id="pool_skill" label="Skill" value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. housekeeping" />
          <Input
            id="pool_min_exp"
            label="Min experience (years)"
            value={minExperience}
            onChange={(e) => setMinExperience(e.target.value)}
          />
          <Input
            id="pool_max_exp"
            label="Max experience (years)"
            value={maxExperience}
            onChange={(e) => setMaxExperience(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void runSearch()} disabled={!demand || busy}>
            Search
          </Button>
          <Button type="button" variant="secondary" onClick={clearFilters} disabled={busy}>
            Clear filters
          </Button>
        </div>

        {error ? <ErrorState message={error} /> : null}
        {linkError ? <ErrorState message={linkError} /> : null}

        {bulkSuccessMsg ? (
          <div className="rounded-panel border border-status-success/30 bg-status-success/5 p-3 text-sm">
            <p className="font-medium text-status-success">{bulkSuccessMsg}</p>
            <p className="mt-1 text-xs text-app-secondary">
              {needsClientReview
                ? 'Next: Send shortlisted candidates to client review.'
                : 'Next: Proceed with interview/offer process.'}
            </p>
          </div>
        ) : null}

        {linkedAppId != null ? (
          <div className="rounded-panel border border-status-success/30 bg-status-success/5 p-3 text-sm">
            <p className="font-medium text-status-success">Candidate linked to this hiring demand.</p>
            <p className="mt-1 text-xs text-app-secondary">
              {needsClientReview
                ? 'Next: Send to client for review from the demand page.'
                : 'Next: Proceed with interview/offer process.'}
            </p>
            <p className="mt-2">
              <Link className="font-medium text-brand-700 underline" to={`/hiring/applications/${linkedAppId}`}>
                Open application
              </Link>
            </p>
          </div>
        ) : null}

        {loading ? <Spinner label="Searching resume pool..." /> : null}

        {!loading && searched && rows.length === 0 && !error ? (
          <EmptyState title="No matching candidates found in the resume pool." />
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="space-y-3">
            {/* Header with select all and bulk link button */}
            <div className="flex items-center justify-between rounded-lg border border-app-border bg-app-surface px-3 py-2 text-xs">
              <label className="flex items-center gap-2 font-medium text-app-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={busy}
                  className="h-4 w-4 rounded border-app-border text-brand-600 focus:ring-brand-500"
                />
                <span>Select All on Page ({rows.length})</span>
              </label>
              {selectedIds.length > 0 ? (
                <Button
                  type="button"
                  className="min-h-7 gap-1 text-xs px-3"
                  disabled={busy}
                  onClick={() => void linkSelectedCandidates()}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {bulkLinking
                    ? 'Linking selected...'
                    : `Link Selected (${selectedIds.length})`}
                </Button>
              ) : null}
            </div>

            <ul className="space-y-3">
              {rows.map((c) => {
                const cid = c.candidate.id
                const isSelected = selectedIds.includes(cid)
                const journeyBlocked = isJourneyStatusBlocked(c.candidate.journey_status)
                const showJourneyBadge = c.candidate.journey_status && c.candidate.journey_status !== 'unknown'

                return (
                  <li
                    key={cid}
                    className={`rounded-panel border p-3 transition-colors ${
                      isSelected ? 'border-brand-500/50 bg-brand-500/5' : 'border-app-border bg-app-muted/50'
                    }`}
                  >
                    {/* Warning for blocked journey status */}
                    {journeyBlocked && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-status-warning/10 px-3 py-2 text-xs text-status-warning">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          This candidate is{' '}
                          <strong>{candidateJourneyStatusLabel(c.candidate.journey_status, c.candidate.journey_status_label).toLowerCase()}</strong>.
                          Shortlisting may not be appropriate.
                        </span>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(cid)}
                          disabled={busy}
                          className="mt-1 h-4 w-4 rounded border-app-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-app-text">{displayName(c.candidate)}</p>
                          <p className="mt-0.5 font-mono text-xs text-app-secondary">{c.candidate.phone}</p>
                          <p className="mt-1 text-xs text-app-secondary">
                            {c.candidate.current_role?.trim() || '-'} | {c.candidate.current_location?.trim() || '-'} | {formatExp(c.candidate.total_experience_years)} yrs
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {/* Source type badge */}
                            {c.candidate.latest_source_type && (
                              <Badge variant={sourceTypeVariant(c.candidate.latest_source_type)}>
                                {sourceTypeLabel(c.candidate.latest_source_type)}
                              </Badge>
                            )}
                            {/* Journey status badge */}
                            {showJourneyBadge && (
                              <Badge variant={candidateJourneyStatusVariant(c.candidate.journey_status)}>
                                {candidateJourneyStatusLabel(c.candidate.journey_status, c.candidate.journey_status_label)}
                              </Badge>
                            )}
                            {c.candidate.lifecycle_status ? <Badge variant="neutral">{lifecycleLabel(c.candidate.lifecycle_status)}</Badge> : null}
                            {c.candidate.availability_status ? <Badge variant="neutral">{lifecycleLabel(c.candidate.availability_status)}</Badge> : null}
                            {(c.candidate.skills_count ?? 0) > 0 ? <Badge variant="neutral">{c.candidate.skills_count} skills</Badge> : null}
                            {c.match_status ? <Badge variant={matchStatusBadgeVariant(c.match_status)}>{c.match_status}</Badge> : null}
                            {c.score != null ? <Badge variant="neutral">Score {Math.round(c.score)}</Badge> : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-8 text-xs"
                          onClick={() => setExpandedId(expandedId === cid ? null : cid)}
                        >
                          {expandedId === cid ? 'Hide scorecard' : 'View scorecard'}
                        </Button>
                        <Button
                          type="button"
                          className="min-h-8 text-xs"
                          disabled={busy}
                          onClick={() => void linkCandidate(c)}
                        >
                          {linkingId === cid ? 'Linking...' : 'Link to demand'}
                        </Button>
                      </div>
                    </div>
                    {expandedId === cid ? (
                      <div className="mt-3">
                        <CandidateMatchScorecard data={poolRowToScorecard(c)} compact />
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        {count != null && rows.length > 0 ? (
          <p className="text-xs text-app-subtle">Showing {rows.length} of {count} matches.</p>
        ) : null}
      </div>
    </Drawer>
  )
}

function PoolDrawerFooter({ onClose, busy }: { onClose: () => void; busy: boolean }) {
  return (
    <div className="flex justify-end">
      <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
        Close
      </Button>
    </div>
  )
}
