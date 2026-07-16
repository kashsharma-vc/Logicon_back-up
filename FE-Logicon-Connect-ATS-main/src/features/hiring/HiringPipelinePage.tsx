import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { listHiringApplications, listPipelineStages } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { HiringPipelineBoard } from '@/features/hiring/HiringPipelineBoard'
import { MoveCandidateStageDialog } from '@/features/hiring/MoveCandidateStageDialog'
import { HIRING_APPLICATION_STATUS_OPTIONS } from '@/features/talent/talentLabels'
import type { HiringApplicationRow, PipelineStageRow } from '@/features/hiring/types'

export function HiringPipelinePage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canMove = hasAnyCapability(meCaps, [
    CAP.HIRING_APPLICATION_UPDATE,
    CAP.HIRING_APPLICATION_MANAGE,
  ])

  const [stages, setStages] = useState<PipelineStageRow[]>([])
  const [allApps, setAllApps] = useState<HiringApplicationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [siteFilter, setSiteFilter] = useState('')

  const [moveTarget, setMoveTarget] = useState<HiringApplicationRow | null>(null)
  const [dragTargetStageId, setDragTargetStageId] = useState<number | null>(null)

  const [searchParams] = useSearchParams()
  const highlightParam = searchParams.get('application')
  const highlightedAppId = highlightParam && Number.isFinite(Number(highlightParam)) ? Number(highlightParam) : null

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [stRes, appRes] = await Promise.all([
        listPipelineStages(),
        listHiringApplications({ page_size: 200 }),
      ])
      setStages(stRes.items.sort((a, b) => a.order - b.order))
      setAllApps(appRes.items)
    } catch (e) {
      setLoadError(parseApiError(e, 'Could not load pipeline data.').message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const uniqueRoles = useMemo(() => {
    const seen = new Set<string>()
    return allApps
      .flatMap((a) => (a.job_role_name ? [a.job_role_name] : []))
      .filter((r) => (seen.has(r) ? false : seen.add(r) && true))
  }, [allApps])

  const uniqueSites = useMemo(() => {
    const seen = new Set<string>()
    return allApps
      .flatMap((a) => (a.site_name ? [a.site_name] : []))
      .filter((s) => (seen.has(s) ? false : seen.add(s) && true))
  }, [allApps])

  const filteredApps = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return allApps.filter((a) => {
      if (q) {
        const nameMatch = (a.candidate_name ?? '').toLowerCase().includes(q)
        const phoneMatch = (a.candidate_phone ?? '').includes(q)
        if (!nameMatch && !phoneMatch) return false
      }
      if (statusFilter && a.status !== statusFilter) return false
      if (roleFilter && a.job_role_name !== roleFilter) return false
      if (siteFilter && a.site_name !== siteFilter) return false
      return true
    })
  }, [allApps, searchText, statusFilter, roleFilter, siteFilter])

  const hasActiveFilter = searchText || statusFilter || roleFilter || siteFilter

  function clearFilters() {
    setSearchText('')
    setStatusFilter('')
    setRoleFilter('')
    setSiteFilter('')
  }

  function handleDropApplication(appId: number, targetStageId: number) {
    const app = allApps.find((a) => a.id === appId)
    if (!app) return
    if (app.current_stage === targetStageId) return // same stage — do nothing
    setMoveTarget(app)
    setDragTargetStageId(targetStageId)
  }

  function closeMoveDialog() {
    setMoveTarget(null)
    setDragTargetStageId(null)
  }

  function handleMoved(updated: HiringApplicationRow) {
    setAllApps((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    setMoveTarget(null)
    setDragTargetStageId(null)
  }

  if (loading) return <Spinner label="Loading pipeline…" />
  if (loadError) return <ErrorState message={loadError} />

  return (
    <div className="flex h-full min-w-0 flex-col gap-4 overflow-hidden">
      {/* Page header */}
      <div className="flex flex-col gap-1 border-b border-app-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">
            Hiring &amp; deployment
          </p>
          <h1 className="text-xl font-semibold tracking-tight text-app-text">Hiring pipeline</h1>
          <p className="mt-1 text-sm text-app-secondary">
            Track candidates across sourcing, screening, review, interview, offer, and joining.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => void load()}
          className="shrink-0 gap-1.5"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="pipe_search" className="text-sm font-medium text-app-secondary">
            Search
          </label>
          <input
            id="pipe_search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Name or phone…"
            className="min-h-10 w-48 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        <Select
          id="pipe_status"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        >
          <option value="">All statuses</option>
          {HIRING_APPLICATION_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>

        {uniqueRoles.length > 0 ? (
          <Select
            id="pipe_role"
            label="Job role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-44"
          >
            <option value="">All roles</option>
            {uniqueRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        ) : null}

        {uniqueSites.length > 0 ? (
          <Select
            id="pipe_site"
            label="Site"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="w-44"
          >
            <option value="">All sites</option>
            {uniqueSites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        ) : null}

        {hasActiveFilter ? (
          <div className="flex flex-col gap-1">
            {/* Invisible label to align button with selects */}
            <span className="invisible select-none text-sm">x</span>
            <Button variant="ghost" onClick={clearFilters} className="min-h-10">
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {/* Results summary */}
      {hasActiveFilter ? (
        <p className="text-xs text-app-secondary">
          {filteredApps.length === 0
            ? 'No candidates match these filters.'
            : `Showing ${filteredApps.length} of ${allApps.length} applications.`}
        </p>
      ) : allApps.length === 0 ? (
        <p className="text-xs text-app-secondary">No candidates in pipeline yet.</p>
      ) : null}

      {/* Kanban board */}
      <div className="min-h-[420px] min-w-0 flex-1 overflow-hidden">
        <HiringPipelineBoard
          stages={stages}
          applications={filteredApps}
          canMove={canMove}
          onMove={setMoveTarget}
          onDropApplication={handleDropApplication}
          highlightedAppId={highlightedAppId}
        />
      </div>

      {/* Move dialog */}
      {moveTarget ? (
        <MoveCandidateStageDialog
          app={moveTarget}
          stages={stages}
          initialStageId={dragTargetStageId ?? undefined}
          onClose={closeMoveDialog}
          onMoved={handleMoved}
        />
      ) : null}
    </div>
  )
}
