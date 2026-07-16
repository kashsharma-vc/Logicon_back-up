import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { listOffers } from '@/api/hiring'
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
import { OfferFormDrawer } from '@/features/hiring/OfferFormDrawer'
import type { OfferRow } from '@/features/hiring/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }
  catch { return s }
}

function offerStatusVariant(s: string): 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'attention' {
  if (s === 'draft') return 'neutral'
  if (s === 'released') return 'info'
  if (s === 'accepted') return 'success'
  if (s === 'declined') return 'danger'
  if (s === 'withdrawn') return 'attention'
  if (s === 'expired') return 'warning'
  return 'neutral'
}

const STATUS_OPTIONS = [
  { value: '', label: 'Any status' },
  { value: 'draft', label: 'Draft' },
  { value: 'released', label: 'Released' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'expired', label: 'Expired' },
]

// ─── OffersPage ───────────────────────────────────────────────────────────────

export function OffersPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.OFFER_CREATE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<OfferRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<OfferRow | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await listOffers({
          status: statusFilter || undefined,
          page,
        })
        if (!cancelled) {
          setRows(res.items)
          setCount(res.count)
        }
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load offers').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [statusFilter, page])

  function openCreate() {
    setSelectedOffer(null)
    setDrawerOpen(true)
  }

  function openManage(offer: OfferRow) {
    setSelectedOffer(offer)
    setDrawerOpen(true)
  }

  function handleSuccess(updated: OfferRow) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [updated, ...prev]
    })
  }

  const statusOptions = useMemo(() => STATUS_OPTIONS, [])

  const totalPages = count != null ? Math.ceil(count / 20) : undefined

  return (
    <div className="w-full space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Offers</h2>
          <p className="text-sm text-app-secondary">Manage offer letters across the full lifecycle.</p>
        </div>
        {canCreate ? (
          <Button type="button" onClick={openCreate} className="shrink-0">
            Create offer
          </Button>
        ) : null}
      </div>

      <div className="w-48">
        <Select id="of_status" label="Status" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
          {statusOptions.map((o) => (
            <option key={o.value || 'any'} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <Spinner label="Loading offers…" /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title="No offers" description="Create an offer from a hiring application or use the button above." />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-panel border border-app-border bg-app-surface shadow-panel">
            <Table>
              <THead>
                <TR>
                  <TH className="py-2">ID</TH>
                  <TH className="py-2">Application</TH>
                  <TH className="py-2">Status</TH>
                  <TH className="py-2">Offered CTC</TH>
                  <TH className="py-2">Joining date</TH>
                  <TH className="py-2">Released by</TH>
                  <TH className="py-2">Released at</TH>
                  <TH className="py-2 text-right"> </TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((o) => (
                  <TR key={o.id}>
                    <TD className="py-2 font-mono text-xs">#{o.id}</TD>
                    <TD className="py-2 font-mono text-xs">#{o.hiring_application}</TD>
                    <TD className="py-2">
                      <Badge variant={offerStatusVariant(o.status)} className="text-[11px]">
                        {o.status}
                      </Badge>
                    </TD>
                    <TD className="py-2 text-xs">
                      {o.offered_ctc != null ? `₹ ${Number(o.offered_ctc).toLocaleString('en-IN')}` : '—'}
                    </TD>
                    <TD className="py-2 text-xs">{fmtDate(o.joining_date)}</TD>
                    <TD className="py-2 text-xs text-app-secondary">{o.released_by_username ?? '—'}</TD>
                    <TD className="py-2 text-xs text-app-secondary">{fmtDate(o.released_at)}</TD>
                    <TD className="py-2 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        {o.status === 'accepted' ? (
                          <Link
                            to={`/hiring/applications/${o.hiring_application}?openConvert=1`}
                            className="inline-flex min-h-7 items-center gap-1 rounded-panel bg-brand-600 px-3 text-xs font-medium text-white transition-colors hover:bg-brand-700"
                          >
                            <Briefcase className="h-3 w-3" aria-hidden />
                            Convert to deployment
                          </Link>
                        ) : null}
                        {o.status === 'released' ? (
                          <Badge variant="info" className="text-[11px]">Awaiting acceptance</Badge>
                        ) : null}
                        {o.status === 'draft' ? (
                          <Badge variant="neutral" className="text-[11px]">Release offer</Badge>
                        ) : null}
                        {['declined', 'withdrawn', 'expired'].includes(o.status) ? (
                          <Badge variant="neutral" className="text-[11px]">Closed</Badge>
                        ) : null}
                        <Button
                          type="button"
                          variant="secondary"
                          className="min-h-7 px-2 text-xs"
                          onClick={() => openManage(o)}
                        >
                          Manage
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            {count != null ? <p className="text-xs text-app-subtle">Total: {count}</p> : <span />}
            {totalPages != null && totalPages > 1 ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-7 px-3 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center px-2 text-xs text-app-secondary">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-7 px-3 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <OfferFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        offer={selectedOffer}
        onSuccess={(updated) => {
          handleSuccess(updated)
          setDrawerOpen(false)
        }}
      />
    </div>
  )
}
