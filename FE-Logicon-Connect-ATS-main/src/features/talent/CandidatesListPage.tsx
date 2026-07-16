import { useEffect, useState, useRef } from 'react'
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  MapPin,
  Phone,
  Search,
  UploadCloud,
  UserPlus,
  Users,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listCandidates, bulkGenerateResumes } from '@/api/talent'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ManualResumeIntakeDrawer } from '@/features/talent/ManualResumeIntakeDrawer'
import { ProfileQualityIndicators } from '@/features/talent/ProfileQualityIndicators'
import { ResumeImportHistoryDrawer } from '@/features/talent/ResumeImportHistoryDrawer'
import { ResumePoolUploadDrawer } from '@/features/talent/ResumePoolUploadDrawer'
import {
  candidateJourneyStatusLabel,
  candidateJourneyStatusVariant,
  DOCUMENT_TYPE_FILTER_OPTIONS,
  documentTypeLabel,
  documentTypeShort,
  JOURNEY_STATUS_FILTER_OPTIONS,
  poolResumeStatusLabel,
  poolResumeStatusVariant,
  SOURCE_TYPE_FILTER_OPTIONS,
  sourceTypeLabel,
  sourceTypeVariant,
} from '@/features/talent/talentLabels'
import type { CandidateRow } from '@/features/talent/types'

function parsePage(v: string | null): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.floor(n)
}

function displayName(c: CandidateRow): string {
  if (c.full_name?.trim()) return c.full_name.trim()
  return [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(' ')
}

function getInitials(c: CandidateRow): string {
  const name = displayName(c)
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    const first = parts[0]?.[0] ?? ''
    const last = parts[parts.length - 1]?.[0] ?? ''
    return (first + last).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '??'
}

function formatExp(y: string | number | null | undefined): string | null {
  if (y == null || y === '') return null
  return String(y)
}

function hasDocumentSignal(c: CandidateRow): boolean {
  return (c.resume_count ?? 0) > 0 || Boolean(c.latest_resume_status) || Boolean(c.latest_document_type)
}

const LIFECYCLE_OPTS = [
  { value: '', label: 'Any lifecycle' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'blacklisted', label: 'Blacklisted' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'employee_converted', label: 'Employee converted' },
  { value: 'do_not_contact', label: 'Do not contact' },
]

const AVAILABILITY_OPTS = [
  { value: '', label: 'Any availability' },
  { value: 'available_now', label: 'Available now' },
  { value: 'available_from_date', label: 'Available from date' },
  { value: 'currently_deployed', label: 'Currently deployed' },
  { value: 'notice_period', label: 'Notice period' },
  { value: 'not_available', label: 'Not available' },
  { value: 'unknown', label: 'Unknown' },
]

function PoolDocumentCard({ c, onOpen }: { c: CandidateRow; onOpen: () => void }) {
  const name = displayName(c)
  const initials = getInitials(c)
  const exp = formatExp(c.total_experience_years)
  const stored = hasDocumentSignal(c)
  const docShort = documentTypeShort(c.latest_document_type)
  const statusLabel = c.latest_resume_status
    ? poolResumeStatusLabel(c.latest_resume_status)
    : stored
      ? 'On file'
      : 'No file'
  const statusVariant = c.latest_resume_status ? poolResumeStatusVariant(c.latest_resume_status) : 'neutral'

  // Journey status
  const journeyLabel = candidateJourneyStatusLabel(c.journey_status, c.journey_status_label)
  const journeyVariant = candidateJourneyStatusVariant(c.journey_status)
  const showJourney = c.journey_status && c.journey_status !== 'unknown'

  // Source type
  const srcLabel = c.latest_source_type ? sourceTypeLabel(c.latest_source_type) : null
  const srcVariant = sourceTypeVariant(c.latest_source_type)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 bg-app-surface text-left transition-all',
        stored
          ? 'border-app-border/80 shadow-sm hover:border-brand-400 hover:shadow-lg'
          : 'border-dashed border-app-border/60 hover:border-brand-300 hover:bg-app-muted/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg',
      )}
    >
      {/* Header with avatar */}
      <div className="relative flex items-start gap-4 p-5 pb-4">
        {/* Avatar */}
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold shadow-md transition-transform group-hover:scale-105',
            stored
              ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white'
              : 'bg-gradient-to-br from-gray-300 to-gray-400 text-white dark:from-gray-600 dark:to-gray-700',
          )}
        >
          {initials}
        </div>

        {/* Name & Status */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold text-app-heading">{name}</h3>
          <p className="mt-0.5 truncate text-sm text-app-secondary">
            {c.current_role?.trim() || 'Role not specified'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* Document status */}
            <Badge variant={statusVariant} className="text-[10px]">
              {statusLabel}
            </Badge>
            {stored && docShort !== '—' && (
              <Badge variant="neutral" className="text-[10px]">
                {docShort}
              </Badge>
            )}
            {/* Source type */}
            {srcLabel && (
              <Badge variant={srcVariant} className="text-[10px]">
                {srcLabel}
              </Badge>
            )}
            {/* Journey status */}
            {showJourney && (
              <Badge variant={journeyVariant} className="text-[10px]">
                {journeyLabel}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="flex-1 space-y-3 border-t border-app-border/50 bg-gradient-to-b from-app-muted/20 to-app-surface px-5 py-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {(() => {
            const bType = c.billing_type || 'non_billable'
            return (
              <Badge variant={bType === 'billable' ? 'success' : 'neutral'} className="text-[10px]">
                {bType === 'billable' ? 'Billable' : 'Non-billable'}
              </Badge>
            )
          })()}
          {c.target_job_role_name?.trim() && (
            <Badge variant="info" className="gap-1 text-[10px]">
              <Briefcase className="h-3 w-3" />
              {c.target_job_role_name.trim()}
            </Badge>
          )}
          {c.latest_document_type && (
            <Badge variant="neutral" className="text-[10px]">
              {documentTypeLabel(c.latest_document_type)}
            </Badge>
          )}
          {(c.skills_count ?? 0) > 0 && (
            <Badge variant="neutral" className="text-[10px]">
              {c.skills_count} skills
            </Badge>
          )}
        </div>

        {/* Details */}
        <div className="space-y-2">
          {c.current_location?.trim() && (
            <div className="flex items-center gap-2 text-xs text-app-secondary">
              <MapPin className="h-3.5 w-3.5 text-app-subtle" />
              <span className="truncate">{c.current_location}</span>
            </div>
          )}
          {exp && (
            <div className="flex items-center gap-2 text-xs text-app-secondary">
              <Briefcase className="h-3.5 w-3.5 text-app-subtle" />
              <span>{exp} years experience</span>
            </div>
          )}
          {c.phone && (
            <div className="flex items-center gap-2 text-xs text-app-secondary">
              <Phone className="h-3.5 w-3.5 text-app-subtle" />
              <span className="truncate font-mono">{c.phone}</span>
            </div>
          )}
        </div>

        {/* Quality indicators */}
        <ProfileQualityIndicators candidate={c} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-app-border/50 bg-app-muted/30 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-app-subtle">
          <FileText className="h-3.5 w-3.5" />
          {(c.resume_count ?? 0) > 1 ? `${c.resume_count} files` : stored ? '1 file' : 'No files'}
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-0 transition-all group-hover:opacity-100 dark:text-brand-400">
          View profile
          <ChevronDown className="h-3 w-3 -rotate-90" />
        </span>
      </div>
    </button>
  )
}

export function CandidatesListPage() {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.CANDIDATE_CREATE])
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const skill = params.get('skill') ?? ''
  const documentType = params.get('document_type') ?? ''
  const minExperience = params.get('min_experience') ?? ''
  const maxExperience = params.get('max_experience') ?? ''
  const location = params.get('location') ?? ''
  const lifecycle = params.get('lifecycle_status') ?? ''
  const availability = params.get('availability_status') ?? ''
  const sourceType = params.get('source_type') ?? ''
  const journeyStatus = params.get('journey_status') ?? ''
  const mappedRole = params.get('target_job_role') ?? ''
  const page = parsePage(params.get('page'))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<CandidateRow[]>([])
  const [count, setCount] = useState<number | undefined>(undefined)
  const [intakeOpen, setIntakeOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [bulkGenOpen, setBulkGenOpen] = useState(false)
  const [bulkGenCollar, setBulkGenCollar] = useState('')
  const [bulkGenBilling, setBulkGenBilling] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingExcel, setUploadingExcel] = useState(false)
  
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingExcel(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const data = await bulkGenerateResumes(file, {
        collarType: bulkGenCollar,
        billingType: bulkGenBilling,
      })
      
      alert(data.message || 'Successfully generated resumes from Excel!')
      setBulkGenOpen(false)
      setRefreshKey((k) => k + 1)
    } catch (err: any) {
      alert(err.message || 'Failed to upload Excel file')
    } finally {
      setUploadingExcel(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [roles, setRoles] = useState<JobRoleRow[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
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
  }, [])

  useEffect(() => {
    if (lifecycle || availability || sourceType || journeyStatus) setMoreFiltersOpen(true)
  }, [lifecycle, availability, sourceType, journeyStatus])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const roleId = Number(mappedRole)
        const res = await listCandidates({
          search: search.trim() || undefined,
          skill: skill.trim() || undefined,
          document_type: documentType || undefined,
          min_experience: minExperience.trim() || undefined,
          max_experience: maxExperience.trim() || undefined,
          location: location.trim() || undefined,
          lifecycle_status: lifecycle || undefined,
          availability_status: availability || undefined,
          journey_status: journeyStatus || undefined,
          source_type: sourceType || undefined,
          target_job_role: mappedRole && Number.isFinite(roleId) ? roleId : undefined,
          page,
        })
        if (cancelled) return
        setRows(res.items)
        setCount(res.count)
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load resume pool').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [search, skill, documentType, minExperience, maxExperience, location, lifecycle, availability, sourceType, journeyStatus, mappedRole, page, refreshKey])

  function setField(key: string, value: string) {
    const p = new URLSearchParams(params)
    if (value) p.set(key, value)
    else p.delete(key)
    p.set('page', '1')
    setParams(p, { replace: true })
  }

  // Stats
  const withResume = rows.filter((r) => hasDocumentSignal(r)).length
  const withoutResume = rows.length - withResume

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-app-text">Resume Pool</h2>
          <p className="text-sm text-app-secondary">Browse and manage candidate resumes in your talent database.</p>
        </div>
        {canCreate && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:self-start">
            <Button 
              type="button" 
              variant="secondary"
              onClick={() => setBulkGenOpen(true)}
            >
              <UploadCloud className="mr-2 h-4 w-4" aria-hidden />
              Auto-Generate via Excel
            </Button>
            <Button type="button" onClick={() => setUploadOpen(true)}>
              <UploadCloud className="mr-2 h-4 w-4" aria-hidden />
              Upload resumes
            </Button>
            <Button type="button" variant="secondary" onClick={() => setHistoryOpen(true)}>
              <History className="mr-2 h-4 w-4" aria-hidden />
              History
            </Button>
            <Button type="button" variant="secondary" onClick={() => setIntakeOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" aria-hidden />
              Add candidate
            </Button>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-app-text">{count ?? rows.length}</p>
            <p className="text-[11px] text-app-subtle">Total Candidates</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-hired/10 text-status-hired">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-app-text">{withResume}</p>
            <p className="text-[11px] text-app-subtle">With Resume</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-app-text">{withoutResume}</p>
            <p className="text-[11px] text-app-subtle">No Resume</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-info/10 text-status-info">
            <Briefcase className="h-4 w-4" />
          </div>
          <div>
            <p className="text-lg font-bold text-app-text">{roles.length}</p>
            <p className="text-[11px] text-app-subtle">Active Roles</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-app-subtle">Filters</p>
          <div className="relative">
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-subtle">
              <Search className="h-4 w-4" aria-hidden />
            </div>
            <input
              type="search"
              value={search}
              onChange={(e) => setField('search', e.target.value)}
              placeholder="Search by name, phone, role, or location..."
              className="min-h-10 w-full rounded-panel border border-app-border bg-app-surface pl-10 pr-3 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              aria-label="Search candidates"
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:w-[400px]">
          <Select id="cand_role_map" label="Mapped role" value={mappedRole} onChange={(e) => setField('target_job_role', e.target.value)}>
            <option value="">Any role</option>
            {roles.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </Select>
          <Select id="cand_doc" label="Document type" value={documentType} onChange={(e) => setField('document_type', e.target.value)}>
            {DOCUMENT_TYPE_FILTER_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* More filters row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input id="cand_skill" label="Skill keyword" value={skill} onChange={(e) => setField('skill', e.target.value)} placeholder="e.g. electrician" />
        <Input
          id="cand_min_exp"
          label="Min experience"
          type="number"
          value={minExperience}
          onChange={(e) => setField('min_experience', e.target.value)}
          placeholder="0"
        />
        <Input
          id="cand_max_exp"
          label="Max experience"
          type="number"
          value={maxExperience}
          onChange={(e) => setField('max_experience', e.target.value)}
          placeholder="20"
        />
        <Input
          id="cand_location"
          label="Location"
          value={location}
          onChange={(e) => setField('location', e.target.value)}
          placeholder="e.g. Pune"
        />
      </div>

      {/* Advanced filters toggle */}
      <div className="border-t border-app-border pt-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-app-secondary transition-colors hover:text-brand-600"
          onClick={() => setMoreFiltersOpen((v) => !v)}
        >
          {moreFiltersOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
          {moreFiltersOpen ? 'Hide advanced filters' : 'Show advanced filters'}
        </button>
        {moreFiltersOpen && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select id="cand_source" label="Source" value={sourceType} onChange={(e) => setField('source_type', e.target.value)}>
              {SOURCE_TYPE_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'any-src'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select id="cand_life" label="Lifecycle status" value={lifecycle} onChange={(e) => setField('lifecycle_status', e.target.value)}>
              {LIFECYCLE_OPTS.map((o) => (
                <option key={o.value || 'any'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select id="cand_avail" label="Availability" value={availability} onChange={(e) => setField('availability_status', e.target.value)}>
              {AVAILABILITY_OPTS.map((o) => (
                <option key={o.value || 'any-a'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select id="cand_journey" label="Journey status" value={journeyStatus} onChange={(e) => setField('journey_status', e.target.value)}>
              {JOURNEY_STATUS_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'any-j'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {/* Loading / Error / Empty states */}
      {error && <ErrorState message={error} />}

      {loading && (
        <div className="flex items-center justify-center py-16">
          <Spinner label="Loading candidates..." />
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-panel border border-dashed border-app-border bg-app-muted/30 py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-app-muted">
            <FileText className="h-8 w-8 text-app-subtle" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-app-text">No candidates found</h3>
          <p className="mt-1 max-w-sm text-center text-sm text-app-secondary">
            Upload resumes or add candidates manually to build your talent pool.
          </p>
          {canCreate && (
            <div className="mt-6 flex gap-3">
              <Button type="button" onClick={() => setUploadOpen(true)}>
                <UploadCloud className="mr-2 h-4 w-4" aria-hidden />
                Upload resumes
              </Button>
              <Button type="button" variant="secondary" onClick={() => setIntakeOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" aria-hidden />
                Add candidate
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {!loading && !error && rows.length > 0 && (
        <>
          {/* Results header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-app-secondary">
              Showing <span className="font-semibold text-app-text">{rows.length}</span> candidate{rows.length === 1 ? '' : 's'}
              {count != null && count > rows.length && (
                <span className="text-app-subtle"> of {count} total</span>
              )}
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((c) => (
              <PoolDocumentCard key={c.id} c={c} onOpen={() => navigate(`/candidates/${c.id}`)} />
            ))}
          </div>
        </>
      )}

      <ResumePoolUploadDrawer
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => {
          setRefreshKey((k) => k + 1)
        }}
      />

      <ResumeImportHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <ManualResumeIntakeDrawer
        open={intakeOpen}
        onClose={() => setIntakeOpen(false)}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />

      <Drawer
        open={bulkGenOpen}
        onClose={() => !uploadingExcel && setBulkGenOpen(false)}
        title="Auto-Generate Resumes (Excel)"
        description="Select category and upload the spreadsheet."
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setBulkGenOpen(false)} disabled={uploadingExcel}>
              Cancel
            </Button>
            <Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingExcel}>
              {uploadingExcel ? 'Processing…' : 'Select Excel & Upload'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Select
            id="bg_collar"
            label="Hiring category"
            value={bulkGenCollar}
            onChange={(e) => setBulkGenCollar(e.target.value)}
            disabled={uploadingExcel}
          >
            <option value="">Select category</option>
            <option value="white_collar">White Collar</option>
            <option value="blue_collar">Blue Collar</option>
          </Select>

          <Select
            id="bg_billing"
            label="Billing type (Optional)"
            value={bulkGenBilling}
            onChange={(e) => setBulkGenBilling(e.target.value)}
            disabled={uploadingExcel}
          >
            <option value="">None (Non-billable by default)</option>
            <option value="billable">Billable</option>
            <option value="non_billable">Non-billable</option>
          </Select>
          
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleExcelUpload} 
          />
        </div>
      </Drawer>
    </div>
  )
}
