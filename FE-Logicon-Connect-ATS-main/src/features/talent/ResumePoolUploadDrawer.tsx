import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Download, FileSpreadsheet, FileText, Loader2, Upload, X, XCircle } from 'lucide-react'
import {
  bulkUploadResumes,
  downloadResumeExcelTemplate,
  downloadResumeImportErrors,
  excelImportCandidates,
  getResumeImportBatch,
} from '@/api/talent'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import type { ResumeImportBatch } from '@/features/talent/types'

type UploadMode = 'resumes' | 'excel'

const RESUME_ACCEPT = '.pdf,.docx,.txt'
const EXCEL_ACCEPT = '.csv,.xlsx'
const POLL_MS = 2500

const TERMINAL_BATCH_STATUSES = new Set(['completed', 'completed_with_errors', 'failed'])

function batchStatusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: 'Queued',
    processing: 'Processing candidates',
    completed: 'Completed',
    completed_with_errors: 'Completed with issues',
    failed: 'Failed',
  }
  return map[status] ?? status
}

function itemStatusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: 'Queued',
    processing: 'Processing',
    indexed: 'Ready',
    created: 'Created',
    updated: 'Updated',
    imported: 'Imported',
    manual_review: 'Needs review',
    duplicate_file: 'Duplicate file',
    failed: 'Failed',
  }
  return map[status] ?? status
}

function itemStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'indexed' || status === 'created' || status === 'imported' || status === 'updated') return 'success'
  if (status === 'manual_review' || status === 'duplicate_file') return 'warning'
  if (status === 'failed') return 'danger'
  if (status === 'processing') return 'info'
  return 'neutral'
}

function isItemSuccess(status: string): boolean {
  const s = status.toLowerCase()
  return s === 'indexed' || s === 'created' || s === 'imported' || s === 'updated'
}


export function ResumePoolUploadDrawer({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}) {
  const [mode, setMode] = useState<UploadMode>('resumes')
  const [roleId, setRoleId] = useState('')
  const [billingType, setBillingType] = useState('')
  const [resumeFiles, setResumeFiles] = useState<File[]>([])
  const [excelFile, setExcelFile] = useState<File | null>(null)

  const [roles, setRoles] = useState<JobRoleRow[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeBatch, setActiveBatch] = useState<ResumeImportBatch | null>(null)

  const terminalNotifiedRef = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  const reset = useCallback(() => {
    setMode('resumes')
    setRoleId('')
    setBillingType('')
    setResumeFiles([])
    setExcelFile(null)
    setError(null)
    setActiveBatch(null)
    setPolling(false)
    setSubmitting(false)
    terminalNotifiedRef.current = false
  }, [])

  useEffect(() => {
    if (!open) return
    reset()
    let cancelled = false
    setRolesLoading(true)
    void (async () => {
      try {
        const res = await listJobRoles({ is_active: true, page: 1 })
        if (!cancelled) setRoles(res.items)
      } catch {
        if (!cancelled) setRoles([])
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, reset])

  useEffect(() => {
    if (roleId && roles.length > 0) {
      const selectedRole = roles.find((r) => String(r.id) === roleId)
      if (selectedRole?.is_internal) {
        setBillingType('billable')
      } else {
        setBillingType('non_billable')
      }
    }
  }, [roleId, roles])

  useEffect(() => {
    if (!open || !activeBatch?.id || !polling) return

    let cancelled = false
    const id = activeBatch.id

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const fresh = await getResumeImportBatch(id)
          if (cancelled) return
          setActiveBatch(fresh)
          if (TERMINAL_BATCH_STATUSES.has(fresh.status)) {
            setPolling(false)
            if (!terminalNotifiedRef.current) {
              terminalNotifiedRef.current = true
              onSuccessRef.current?.()
            }
          }
        } catch {
          // silently ignore poll errors
        }
      })()
    }, POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [open, activeBatch?.id, polling])

  function switchMode(next: UploadMode) {
    setMode(next)
    setError(null)
    setActiveBatch(null)
    setPolling(false)
    terminalNotifiedRef.current = false
  }

  async function submit() {
    setError(null)
    const role = Number.parseInt(roleId, 10)
    if (!Number.isFinite(role)) {
      setError('Select a mapped role.')
      return
    }
    if (mode === 'resumes' && resumeFiles.length === 0) {
      setError('Add at least one resume file (.pdf, .docx, .txt).')
      return
    }
    if (mode === 'excel' && !excelFile) {
      setError('Choose a .csv or .xlsx file to import.')
      return
    }

    setSubmitting(true)
    setActiveBatch(null)
    terminalNotifiedRef.current = false

    try {
      if (mode === 'resumes') {
        const batch = await bulkUploadResumes({ 
          target_job_role: role, 
          files: resumeFiles,
          billing_type: billingType || undefined
        })
        setActiveBatch(batch)
        setPolling(!TERMINAL_BATCH_STATUSES.has(batch.status))
        if (TERMINAL_BATCH_STATUSES.has(batch.status)) {
          terminalNotifiedRef.current = true
          onSuccess?.()
        }
      } else if (excelFile) {
        const batch = await excelImportCandidates({ 
          target_job_role: role, 
          file: excelFile,
          billing_type: billingType || undefined
        })
        setActiveBatch(batch)
        setPolling(!TERMINAL_BATCH_STATUSES.has(batch.status))
        if (TERMINAL_BATCH_STATUSES.has(batch.status)) {
          terminalNotifiedRef.current = true
          onSuccess?.()
        }
      }
    } catch (e: unknown) {
      setError(parseApiError(e, 'Upload could not be completed').message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedRole = roles.find((r) => String(r.id) === roleId)
  const showingResult = activeBatch != null

  return (
    <Drawer
      open={open}
      onClose={() => !submitting && onClose()}
      title="Upload resumes / Import Excel"
      description="Pick a mapped role, then upload resume files in bulk or import candidates from a spreadsheet."
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            {showingResult ? 'Close' : 'Cancel'}
          </Button>
          {!showingResult ? (
            <Button type="button" onClick={() => void submit()} disabled={submitting || rolesLoading}>
              {submitting ? 'Uploading…' : mode === 'resumes' ? 'Upload resumes' : 'Import file'}
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        {activeBatch ? (
          <BatchResultPanel
            batch={activeBatch}
            polling={polling}
            roleName={selectedRole?.name ?? activeBatch.target_job_role_name ?? undefined}
            onUploadMore={() => {
              setActiveBatch(null)
              setPolling(false)
              setResumeFiles([])
              setExcelFile(null)
              setError(null)
              terminalNotifiedRef.current = false
            }}
            onRefreshPool={() => {
              onSuccess?.()
              onClose()
            }}
          />
        ) : (
          <>
            <Select
              id="rpu_role"
              label="Mapped role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              disabled={submitting || rolesLoading}
            >
              <option value="">{rolesLoading ? 'Loading roles…' : 'Select a role'}</option>
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </Select>

            <Select
              id="rpu_billing_type"
              label="Billing type (Optional)"
              value={billingType}
              onChange={(e) => setBillingType(e.target.value)}
              disabled={submitting}
            >
              <option value="">None (Non-billable by default)</option>
              <option value="billable">Billable</option>
              <option value="non_billable">Non-billable</option>
            </Select>

            <div>
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-app-subtle">Upload type</span>
              <div className="grid grid-cols-2 gap-3">
                <ModeButton
                  active={mode === 'resumes'}
                  disabled={submitting}
                  icon={<FileText className="h-6 w-6" aria-hidden />}
                  label="Resume files"
                  hint="PDF, DOCX, TXT"
                  onClick={() => switchMode('resumes')}
                />
                <ModeButton
                  active={mode === 'excel'}
                  disabled={submitting}
                  icon={<FileSpreadsheet className="h-6 w-6" aria-hidden />}
                  label="Excel / CSV"
                  hint="Spreadsheet import"
                  onClick={() => switchMode('excel')}
                />
              </div>
            </div>

            {mode === 'resumes' ? (
              <ResumeFileSelector
                files={resumeFiles}
                onChange={setResumeFiles}
                disabled={submitting}
                uploading={submitting}
              />
            ) : (
              <ExcelFileSelector
                file={excelFile}
                onChange={setExcelFile}
                disabled={submitting}
                uploading={submitting}
              />
            )}

            {error ? <ErrorState message={error} /> : null}
            {submitting ? <Spinner label={mode === 'resumes' ? 'Queuing batch…' : 'Importing file…'} /> : null}
          </>
        )}
      </div>
    </Drawer>
  )
}

function ModeButton({
  active,
  disabled,
  icon,
  label,
  hint,
  onClick,
}: {
  active: boolean
  disabled?: boolean
  icon: React.ReactNode
  label: string
  hint: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        'group flex flex-col items-center gap-3 rounded-2xl border-2 px-5 py-5 text-center transition-all disabled:opacity-60',
        active
          ? 'border-brand-500 bg-gradient-to-b from-brand-50 to-brand-100/50 shadow-md dark:from-brand-950/40 dark:to-brand-900/20'
          : 'border-app-border/80 bg-gradient-to-b from-app-surface to-app-muted/30 hover:border-brand-300 hover:from-brand-50/50 hover:to-brand-100/30 hover:shadow-sm dark:hover:from-brand-950/20 dark:hover:to-brand-900/10',
      )}
    >
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-xl transition-all',
          active
            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
            : 'bg-app-muted text-app-secondary group-hover:bg-brand-100 group-hover:text-brand-600 dark:group-hover:bg-brand-900/50 dark:group-hover:text-brand-400',
        )}
      >
        {icon}
      </div>
      <div>
        <p className={cn('text-sm font-bold', active ? 'text-brand-700 dark:text-brand-300' : 'text-app-heading')}>
          {label}
        </p>
        <p className={cn('mt-0.5 text-xs', active ? 'text-brand-600/80 dark:text-brand-400/80' : 'text-app-subtle')}>
          {hint}
        </p>
      </div>
    </button>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function ResumeFileSelector({
  files,
  onChange,
  disabled,
  uploading,
}: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  uploading?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const dropped = Array.from(e.dataTransfer.files).filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ext === 'pdf' || ext === 'docx' || ext === 'txt'
    })
    if (dropped.length > 0) {
      onChange([...files, ...dropped])
    }
  }

  function removeFile(index: number) {
    onChange(files.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-app-secondary">Resume files</p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all',
          dragOver
            ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
            : 'border-app-border bg-app-muted/30 hover:border-brand-400 hover:bg-app-muted/50',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={RESUME_ACCEPT}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => onChange([...files, ...Array.from(e.target.files ?? [])])}
        />
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
            dragOver ? 'bg-brand-100 text-brand-600' : 'bg-app-muted text-app-subtle',
          )}
        >
          <Upload className="h-6 w-6" />
        </div>
        <p className="mt-3 text-sm font-medium text-app-text">
          {dragOver ? 'Drop files here' : 'Click to browse or drag files'}
        </p>
        <p className="mt-1 text-xs text-app-subtle">PDF, DOCX, TXT • Multiple files supported</p>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-app-subtle">
              {files.length} file{files.length === 1 ? '' : 's'} selected
            </p>
            {!uploading && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-app-secondary hover:text-status-danger"
              >
                Clear all
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {files.map((file, idx) => (
              <li
                key={`${file.name}-${idx}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg border bg-app-surface p-3 transition-all',
                  uploading ? 'border-brand-200 dark:border-brand-800' : 'border-app-border',
                )}
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    uploading
                      ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40'
                      : 'bg-app-muted text-app-secondary',
                  )}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-app-text">{file.name}</p>
                  <p className="text-xs text-app-subtle">{formatFileSize(file.size)}</p>
                </div>
                {!uploading && (
                  <button
                    type="button"
                    onClick={() => removeFile(idx)}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-app-subtle transition-colors hover:bg-status-danger/10 hover:text-status-danger"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                {uploading && (
                  <span className="shrink-0 text-xs font-medium text-brand-600">Queuing...</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ExcelFileSelector({
  file,
  onChange,
  disabled,
  uploading,
}: {
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  uploading?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const dropped = Array.from(e.dataTransfer.files).find((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase()
      return ext === 'csv' || ext === 'xlsx'
    })
    if (dropped) {
      onChange(dropped)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-app-secondary">Spreadsheet file</p>

      {/* Drop zone */}
      {!file ? (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            if (!disabled) setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 transition-all',
            dragOver
              ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/20'
              : 'border-app-border bg-app-muted/30 hover:border-brand-400 hover:bg-app-muted/50',
            disabled && 'cursor-not-allowed opacity-60',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={EXCEL_ACCEPT}
            disabled={disabled}
            className="sr-only"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
              dragOver ? 'bg-brand-100 text-brand-600' : 'bg-app-muted text-app-subtle',
            )}
          >
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-medium text-app-text">
            {dragOver ? 'Drop spreadsheet here' : 'Click to browse or drag file'}
          </p>
          <p className="mt-1 text-xs text-app-subtle">CSV or XLSX • One file with candidate rows</p>
        </div>
      ) : (
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl border bg-app-surface p-4 transition-all',
            uploading ? 'border-brand-200 dark:border-brand-800' : 'border-app-border',
          )}
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              uploading
                ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40'
                : 'bg-app-muted text-app-secondary',
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-app-text">{file.name}</p>
            <p className="text-xs text-app-subtle">{formatFileSize(file.size)}</p>
          </div>
          {!uploading && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-app-subtle transition-colors hover:bg-status-danger/10 hover:text-status-danger"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {uploading && (
            <span className="shrink-0 text-xs font-medium text-brand-600">Importing...</span>
          )}
        </div>
      )}

      {/* Template download */}
      <Button
        type="button"
        variant="secondary"
        className="min-h-9 w-full gap-2 text-xs"
        disabled={disabled}
        onClick={() => void downloadResumeExcelTemplate()}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Download Excel template
      </Button>
    </div>
  )
}

function BatchResultPanel({
  batch,
  polling,
  roleName,
  onUploadMore,
  onRefreshPool,
}: {
  batch: ResumeImportBatch
  polling: boolean
  roleName?: string
  onUploadMore: () => void
  onRefreshPool: () => void
}) {
  const [downloadingErrors, setDownloadingErrors] = useState(false)
  const terminal = TERMINAL_BATCH_STATUSES.has(batch.status)
  const statusText = batchStatusLabel(batch.status)
  const progress = batch.total_count > 0 ? (batch.processed_count / batch.total_count) * 100 : 0

  async function handleDownloadErrors() {
    setDownloadingErrors(true)
    try {
      await downloadResumeImportErrors(batch.id, `import_batch_${batch.id}_failed_rows.csv`)
    } catch {
      // ignore or alert
    } finally {
      setDownloadingErrors(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="rounded-xl border border-app-border bg-gradient-to-br from-app-muted/60 to-app-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {polling ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
                <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden />
              </div>
            ) : terminal && batch.failed_count === 0 ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-hired/10">
                <CheckCircle2 className="h-5 w-5 text-status-hired" aria-hidden />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-muted">
                <FileText className="h-5 w-5 text-app-secondary" aria-hidden />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-app-heading">{statusText}</p>
              {roleName ? <p className="text-xs text-app-secondary">{roleName}</p> : null}
            </div>
          </div>
          {!terminal ? (
            <span className="text-sm font-medium text-brand-600">
              {batch.processed_count}/{batch.total_count}
            </span>
          ) : null}
        </div>

        {/* Progress bar for non-terminal states */}
        {!terminal ? (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-app-muted">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-app-subtle">
              Processing in chunks... This updates automatically.
            </p>
          </div>
        ) : null}

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          <div className="rounded-lg bg-app-surface p-2 text-center shadow-sm">
            <p className="text-lg font-bold text-app-text">{batch.total_count}</p>
            <p className="text-[10px] uppercase tracking-wide text-app-subtle">Total</p>
          </div>
          <div className="rounded-lg bg-app-surface p-2 text-center shadow-sm">
            <p className="text-lg font-bold text-status-hired">{batch.success_count}</p>
            <p className="text-[10px] uppercase tracking-wide text-app-subtle">Ready</p>
          </div>
          <div className="rounded-lg bg-app-surface p-2 text-center shadow-sm">
            <p className="text-lg font-bold text-brand-600">{batch.processed_count}</p>
            <p className="text-[10px] uppercase tracking-wide text-app-subtle">Done</p>
          </div>
          {batch.duplicate_count > 0 ? (
            <div className="rounded-lg bg-app-surface p-2 text-center shadow-sm">
              <p className="text-lg font-bold text-status-warning">{batch.duplicate_count}</p>
              <p className="text-[10px] uppercase tracking-wide text-app-subtle">Dups</p>
            </div>
          ) : null}
          {batch.failed_count > 0 ? (
            <div className="rounded-lg bg-app-surface p-2 text-center shadow-sm">
              <p className="text-lg font-bold text-status-danger">{batch.failed_count}</p>
              <p className="text-[10px] uppercase tracking-wide text-app-subtle">Failed</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Download failed rows button if any failures */}
      {batch.failed_count > 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="min-h-9 w-full gap-2 text-xs text-status-danger border-status-danger/30 hover:bg-status-danger/5"
          disabled={downloadingErrors}
          onClick={() => void handleDownloadErrors()}
        >
          <Download className="h-4 w-4" aria-hidden />
          {downloadingErrors ? 'Downloading failed rows…' : `Download ${batch.failed_count} Failed Row${batch.failed_count === 1 ? '' : 's'} (.csv)`}
        </Button>
      ) : null}

      {/* File list */}
      {batch.items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-app-subtle">Files / Rows</p>
          <ul className="space-y-2">
            {batch.items.map((item) => {
              const label = item.candidate_name?.trim() || item.original_filename?.trim() || `Item #${item.id}`
              const variant = itemStatusVariant(item.status)
              const ok = isItemSuccess(item.status)
              return (
                <li key={item.id} className="flex items-center gap-3 rounded-lg border border-app-border bg-app-surface p-3">
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      ok
                        ? 'bg-status-hired/10 text-status-hired'
                        : item.status === 'processing' || item.status === 'queued'
                          ? 'bg-brand-100 text-brand-600 dark:bg-brand-900/40'
                          : 'bg-status-danger/10 text-status-danger',
                    )}
                  >
                    {ok ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                    ) : item.status === 'processing' || item.status === 'queued' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <XCircle className="h-4 w-4" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-app-text">{label}</p>
                    {item.original_filename && item.candidate_name ? (
                      <p className="truncate text-xs text-app-subtle">{item.original_filename}</p>
                    ) : null}
                    {item.error_message ? (
                      <p className="mt-0.5 text-xs text-status-danger">{item.error_message}</p>
                    ) : null}
                  </div>
                  <Badge variant={variant} className="shrink-0 text-[10px]">
                    {itemStatusLabel(item.status)}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </div>
      ) : !terminal ? (
        <p className="text-center text-sm text-app-secondary">Waiting for processing to begin...</p>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Button type="button" className="flex-1 gap-2" onClick={onRefreshPool}>
          View pool
        </Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onUploadMore}>
          Upload more
        </Button>
      </div>
    </div>
  )
}

