import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listSiteSurveys } from '@/api/sales'
import { ROUTES } from '@/app/routes'
import { useAuthStore } from '@/features/auth/authStore'
import { formatShortDate, surveyStatusLabel, surveyStatusVariant } from '@/features/sales/salesUtils'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { NotificationBanner } from '@/features/notifications/NotificationBanner'
import type { SiteSurvey } from '@/types/sales'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
]

export function OperationsSurveyQueuePage() {
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.me)

  const [surveys, setSurveys] = useState<SiteSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    if (!me?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await listSiteSurveys({ assigned_to: me.id })
      setSurveys(res.items)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Failed to load surveys').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.id])

  const filtered = surveys.filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const clientName = s.lead_client_name?.toLowerCase() ?? ''
      const siteName = s.site_name?.toLowerCase() ?? ''
      if (!clientName.includes(q) && !siteName.includes(q) && !String(s.id).includes(q)) return false
    }
    return true
  })

  return (
    <div className="w-full space-y-4">
      <NotificationBanner area="operationsSurveys" />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">My survey queue</h2>
          <p className="text-sm text-app-secondary">Site surveys assigned to you</p>
        </div>
        <Button variant="ghost" className="min-h-8 px-3 text-xs self-start sm:self-auto" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Search client or site…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-9 rounded-panel border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30 w-56"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-9 rounded-panel border border-app-border bg-app-surface px-3 py-1.5 text-sm text-app-text focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner label="Loading surveys…" />
      ) : error ? (
        <ErrorState message={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No surveys"
          description={surveys.length === 0 ? 'No site surveys are assigned to you.' : 'No surveys match the current filters.'}
        />
      ) : (
        <>
          {/* Mobile */}
          <div className="grid gap-3 md:hidden">
            {filtered.map((s) => (
              <div key={s.id} className="rounded-panel border border-app-border bg-app-surface p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-app-text">{s.site_name ?? `Survey #${s.id}`}</p>
                    {s.lead_client_name ? (
                      <p className="text-xs text-app-secondary">{s.lead_client_name}</p>
                    ) : null}
                  </div>
                  <Badge variant={surveyStatusVariant(s.status)}>{surveyStatusLabel(s.status)}</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-app-subtle">
                  {s.due_date ? <span>Due: {formatShortDate(s.due_date)}</span> : null}
                  {s.survey_date ? <span>Survey: {formatShortDate(s.survey_date)}</span> : null}
                </div>
                <Button
                  variant="secondary"
                  className="min-h-8 px-3 text-xs"
                  onClick={() => navigate(ROUTES.OPERATIONS_SURVEY_DETAIL(s.id))}
                >
                  Open survey
                </Button>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-panel border border-app-border shadow-panel">
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Client</TH>
                  <TH>Site</TH>
                  <TH>Status</TH>
                  <TH>Assigned at</TH>
                  <TH>Due date</TH>
                  <TH>Survey date</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-mono text-xs text-app-secondary">#{s.id}</TD>
                    <TD className="text-sm text-app-text">{s.lead_client_name ?? '—'}</TD>
                    <TD className="text-sm text-app-secondary">{s.site_name ?? '—'}</TD>
                    <TD><Badge variant={surveyStatusVariant(s.status)}>{surveyStatusLabel(s.status)}</Badge></TD>
                    <TD className="text-xs text-app-secondary whitespace-nowrap">{formatShortDate(s.assigned_at)}</TD>
                    <TD className="text-xs text-app-secondary whitespace-nowrap">{formatShortDate(s.due_date)}</TD>
                    <TD className="text-xs text-app-secondary whitespace-nowrap">{formatShortDate(s.survey_date)}</TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        className="min-h-8 px-3 text-xs"
                        onClick={() => navigate(ROUTES.OPERATIONS_SURVEY_DETAIL(s.id))}
                      >
                        Open
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}
