import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Download, ExternalLink, RefreshCw } from 'lucide-react'
import { getResumeImportBatch, listResumeImportBatches } from '@/api/talent'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { parseApiError } from '@/lib/apiError'
import { downloadAuthenticatedFile } from '@/lib/fileDownload'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import {
  DOCUMENT_TYPE_FILTER_OPTIONS,
  documentTypeLabel,
  importBatchStatusLabel,
  poolResumeStatusLabel,
  poolResumeStatusVariant,
  sourceTypeLabel,
} from '@/features/talent/talentLabels'
import type { ResumeImportBatch, ResumeImportItem } from '@/features/talent/types'

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return d
  }
}

function batchStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'completed') return 'success'
  if (status === 'completed_with_errors') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'info'
  return 'neutral'
}

function itemLabel(item: ResumeImportItem): string {
  if (item.row_number != null) return `Row ${item.row_number}`
  return item.original_filename?.trim() || `Item #${item.id}`
}

function BatchDetailPanel({ batch }: { batch: ResumeImportBatch }) {
  const [downloadBusy, setDownloadBusy] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function downloadImportFile() {
    const path = batch.import_file?.trim()
    if (!path) return
    setDownloadBusy(true)
    setDownloadError(null)
    try {
      await downloadAuthenticatedFile(path, batch.original_filename?.trim() || `import_batch_${batch.id}`)
    } catch (e: unknown) {
      setDownloadError(parseApiError(e, 'Download failed').message)
    } finally {
      setDownloadBusy(false)
    }
  }

  return (
    <div className="border-t border-app-border bg-app-muted/20 p-4">
      {batch.import_file ? (
        <div className="mb-4">
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 gap-2 text-xs"
            disabled={downloadBusy}
            onClick={() => void downloadImportFile()}
          >
            <Download className="h-4 w-4" aria-hidden />
            {downloadBusy ? 'Downloading…' : 'Download source file'}
          </Button>
          {downloadError ? <p className="mt-1 text-xs text-status-danger">{downloadError}</p> : null}
        </div>
      ) : null}

      {batch.items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-app-subtle">
            {batch.items.length} file{batch.items.length === 1 ? '' : 's'}
          </p>
          <ul className="space-y-2">
            {batch.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-lg border border-app-border bg-app-surface p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-app-text">{itemLabel(item)}</p>
                  {item.candidate_name ? <p className="text-xs text-app-secondary">{item.candidate_name}</p> : null}
                  {item.candidate_phone ? (
                    <p className="font-mono text-xs text-app-subtle">{item.candidate_phone}</p>
                  ) : null}
                  {item.error_message ? (
                    <p className="mt-0.5 text-xs text-status-danger">{item.error_message}</p>
                  ) : null}
                  {item.candidate != null ? (
                    <Link
                      to={`/candidates/${item.candidate}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      View candidate
                    </Link>
                  ) : null}
                  {item.resume != null &&
                  (item.status === 'failed' ||
                    item.status === 'manual_review' ||
                    item.status === 'duplicate_file') ? (
                    <Link
                      to={`/candidates/review-queue?resume=${item.resume}`}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      Open in review queue
                    </Link>
                  ) : null}
                </div>
                <Badge variant={poolResumeStatusVariant(item.status)} className="shrink-0 text-[10px]">
                  {poolResumeStatusLabel(item.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-app-subtle">No file details available.</p>
      )}
    </div>
  )
}

export function ResumeImportHistoryDrawer({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batches, setBatches] = useState<ResumeImportBatch[]>([])
  const [roles, setRoles] = useState<JobRoleRow[]>([])
  const [roleFilter, setRoleFilter] = useState('')
  const [docFilter, setDocFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [detailById, setDetailById] = useState<Record<number, ResumeImportBatch>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)

  const loadBatches = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const roleId = Number(roleFilter)
      const res = await listResumeImportBatches({
        target_job_role: roleFilter && Number.isFinite(roleId) ? roleId : undefined,
        document_type: docFilter || undefined,
        status: statusFilter || undefined,
        source_type: sourceFilter || undefined,
        created_by: createdByFilter.trim() || undefined,
        created_from: createdFrom || undefined,
        created_to: createdTo || undefined,
        page: 1,
      })
      setBatches(res.items)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not load import history').message)
      setBatches([])
    } finally {
      setLoading(false)
    }
  }, [roleFilter, docFilter, statusFilter, sourceFilter, createdByFilter, createdFrom, createdTo])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      try {
        const res = await listJobRoles({ is_active: true, page: 1 })
        if (!cancelled) setRoles(res.items)
      } catch {
        if (!cancelled) setRoles([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    void loadBatches()
  }, [open, loadBatches])

  useEffect(() => {
    if (!open) {
      setExpandedId(null)
      setDetailById({})
      setRoleFilter('')
      setDocFilter('')
      setStatusFilter('')
      setSourceFilter('')
      setCreatedByFilter('')
      setCreatedFrom('')
      setCreatedTo('')
      setDetailError(null)
    }
  }, [open])

  async function toggleDetail(batchId: number) {
    if (expandedId === batchId) {
      setExpandedId(null)
      return
    }
    setExpandedId(batchId)
    if (detailById[batchId]) return
    setDetailLoadingId(batchId)
    setDetailError(null)
    try {
      const detail = await getResumeImportBatch(batchId)
      setDetailById((prev) => ({ ...prev, [batchId]: detail }))
    } catch (e: unknown) {
      setDetailError(parseApiError(e, 'Could not load batch detail').message)
    } finally {
      setDetailLoadingId(null)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Import history"
      description="Past resume uploads and Excel/CSV candidate imports."
      panelClassName="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select id="hist_role" label="Mapped role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">Any role</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select id="hist_doc" label="Document type" value={docFilter} onChange={(e) => setDocFilter(e.target.value)}>
            {DOCUMENT_TYPE_FILTER_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select id="hist_status" label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Any status</option>
            <option value="queued">Queued</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="completed_with_errors">Completed with issues</option>
            <option value="failed">Failed</option>
          </Select>
          <Input
            id="hist_source"
            label="Source type"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            placeholder="e.g. bulk_upload"
          />
          <Input
            id="hist_created_by"
            label="Uploaded by (user ID)"
            value={createdByFilter}
            onChange={(e) => setCreatedByFilter(e.target.value)}
            placeholder="User #id"
          />
          <Input id="hist_from" label="Created from" type="date" value={createdFrom} onChange={(e) => setCreatedFrom(e.target.value)} />
          <Input id="hist_to" label="Created to" type="date" value={createdTo} onChange={(e) => setCreatedTo(e.target.value)} />
        </div>

        <Button type="button" variant="secondary" className="min-h-8 gap-1.5 text-xs" disabled={loading} onClick={() => void loadBatches()}>
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} aria-hidden />
          Refresh
        </Button>

        {error ? <ErrorState message={error} /> : null}
        {loading && batches.length === 0 ? <Spinner label="Loading import history…" /> : null}
        {!loading && !error && batches.length === 0 ? (
          <EmptyState title="No import batches yet." description="Upload resumes or import Excel to see history here." />
        ) : null}

        {batches.length > 0 ? (
          <ul className="space-y-3">
            {batches.map((batch) => {
              const expanded = expandedId === batch.id
              const detail = detailById[batch.id]
              return (
                <li key={batch.id} className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-app-heading">
                          {batch.original_filename?.trim() || `Batch #${batch.id}`}
                        </p>
                        <p className="mt-1 text-xs text-app-secondary">
                          {batch.target_job_role_name?.trim() || 'No mapped role'}
                        </p>
                        <p className="mt-0.5 text-xs text-app-subtle">
                          {batch.created_at ? fmtDate(batch.created_at) : '—'}
                          {batch.created_by != null ? ` · User #${batch.created_by}` : ''}
                        </p>
                      </div>
                      <Badge variant={batchStatusVariant(batch.status)} className="shrink-0 text-[10px]">
                        {importBatchStatusLabel(batch.status)}
                      </Badge>
                    </div>

                    {/* Stats row */}
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                      <div className="rounded-lg bg-app-muted/60 px-2 py-1.5 text-center">
                        <p className="text-sm font-bold text-app-text">{batch.total_count}</p>
                        <p className="text-[9px] uppercase tracking-wide text-app-subtle">Total</p>
                      </div>
                      <div className="rounded-lg bg-app-muted/60 px-2 py-1.5 text-center">
                        <p className="text-sm font-bold text-status-hired">{batch.success_count}</p>
                        <p className="text-[9px] uppercase tracking-wide text-app-subtle">Ready</p>
                      </div>
                      <div className="rounded-lg bg-app-muted/60 px-2 py-1.5 text-center">
                        <p className="text-sm font-bold text-status-warning">{batch.duplicate_count}</p>
                        <p className="text-[9px] uppercase tracking-wide text-app-subtle">Dups</p>
                      </div>
                      <div className="rounded-lg bg-app-muted/60 px-2 py-1.5 text-center">
                        <p className={cn('text-sm font-bold', batch.failed_count > 0 ? 'text-status-danger' : 'text-app-subtle')}>
                          {batch.failed_count}
                        </p>
                        <p className="text-[9px] uppercase tracking-wide text-app-subtle">Failed</p>
                      </div>
                      <div className="rounded-lg bg-app-muted/60 px-2 py-1.5 text-center">
                        <p className={cn('text-sm font-bold', batch.manual_review_count > 0 ? 'text-status-attention' : 'text-app-subtle')}>
                          {batch.manual_review_count}
                        </p>
                        <p className="text-[9px] uppercase tracking-wide text-app-subtle">Review</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {batch.document_type ? (
                        <Badge variant="neutral" className="text-[10px]">
                          {documentTypeLabel(batch.document_type)}
                        </Badge>
                      ) : null}
                      {batch.source_type ? (
                        <Badge variant="neutral" className="text-[10px]">
                          {sourceTypeLabel(batch.source_type)}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-1.5 border-t border-app-border bg-app-muted/30 px-4 py-2 text-xs font-medium text-app-secondary transition-colors hover:bg-app-muted/60 disabled:opacity-50"
                    disabled={detailLoadingId === batch.id}
                    onClick={() => void toggleDetail(batch.id)}
                  >
                    {expanded ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
                    {detailLoadingId === batch.id ? 'Loading…' : expanded ? 'Hide details' : 'View details'}
                  </button>

                  {expanded && detailError && !detail ? (
                    <div className="border-t border-app-border p-4">
                      <p className="text-xs text-status-danger">{detailError}</p>
                    </div>
                  ) : null}
                  {expanded && detail ? <BatchDetailPanel batch={detail} /> : null}
                </li>
              )
            })}
          </ul>
        ) : null}
      </div>
    </Drawer>
  )
}
