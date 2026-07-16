import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  FileText,
  History,
  Layers,
  Link2,
  RefreshCw,
  UserCog,
  XCircle,
} from 'lucide-react'
import {
  applyResumeReview,
  getResumeReviewDetail,
  getResumeReviewHistory,
  listResumeReviewQueue,
  markResumeReviewed,
  reprocessResume,
  resolveResumeDuplicate,
} from '@/api/talent'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

import { Spinner } from '@/components/ui/Spinner'
import { DuplicateCandidatesPanel } from '@/features/talent/DuplicateCandidatesPanel'
import { DOCUMENT_TYPE_FILTER_OPTIONS, documentTypeLabel, resumeStatusLabel } from '@/features/talent/talentLabels'
import type {
  ApplyReviewCandidateInput,
  ApplyReviewEducationInput,
  ApplyReviewExperienceInput,
  ApplyReviewSkillInput,
  CandidateExperienceRow,
  ResumeReviewDetail,
  ResumeReviewQueueItem,
  TalentResumeReviewRow,
} from '@/features/talent/types'

// Helpers

function statusVariant(s: string | undefined): 'danger' | 'warning' | 'attention' | 'neutral' | 'success' {
  if (!s) return 'neutral'
  if (s === 'failed') return 'danger'
  if (s === 'manual_review') return 'warning'
  if (s === 'duplicate_file') return 'attention'
  if (s === 'indexed') return 'success'
  return 'neutral'
}

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

function fmtBytes(n: number | null | undefined): string {
  if (!n) return '-'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// Queue filter params

interface QueueFilters {
  status: string
  document_type: string
  source_type: string
  uploaded_by: string
  candidate: string
  confidence_below: string
  uploaded_from: string
  uploaded_to: string
}

const BLANK_FILTERS: QueueFilters = {
  status: '',
  document_type: '',
  source_type: '',
  uploaded_by: '',
  candidate: '',
  confidence_below: '',
  uploaded_from: '',
  uploaded_to: '',
}

const STATUS_OPTS = [
  { value: '', label: 'All statuses' },
  { value: 'manual_review', label: 'Needs review' },
  { value: 'failed', label: 'Failed' },
  { value: 'duplicate_file', label: 'Duplicate file' },
  { value: 'indexed', label: 'Ready (below confidence)' },
]

const SOURCE_OPTS = [
  { value: '', label: 'All sources' },
  { value: 'qr_intake', label: 'QR intake' },
  { value: 'manual_upload', label: 'Manual upload' },
  { value: 'recruiter_upload', label: 'Recruiter upload' },
  { value: 'portal', label: 'Portal' },
  { value: 'referral', label: 'Referral' },
  { value: 'import_', label: 'Import' },
]

// Tab definitions

type TabId = 'parsed' | 'candidate' | 'skills' | 'raw' | 'history' | 'duplicate'

const TABS: { id: TabId; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'parsed', label: 'Parsed data', icon: ClipboardList },
  { id: 'candidate', label: 'Candidate', icon: UserCog },
  { id: 'skills', label: 'Skills / Exp / Edu', icon: Layers },
  { id: 'raw', label: 'Raw text', icon: FileText },
  { id: 'history', label: 'History', icon: History },
  { id: 'duplicate', label: 'Duplicate', icon: Link2 },
]

// Queue item row

function QueueRow({
  item,
  selected,
  onClick,
}: {
  item: ResumeReviewQueueItem
  selected: boolean
  onClick: () => void
}) {
  const cs = item.candidate_summary
  const ps = item.parsed_resume_summary
  const reason = item.manual_review_reason || item.error_message || ''
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 border-b border-app-border hover:bg-app-muted transition-colors',
        selected && 'bg-brand-600/8 border-l-2 border-l-brand-500',
      )}
    >
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="truncate text-xs font-medium text-app-text">
          {item.original_filename || `Resume #${item.id}`}
        </span>
        <Badge variant={statusVariant(item.status)} className="shrink-0 text-[10px]">
          {resumeStatusLabel(item.status)}
        </Badge>
      </div>
      {cs && (
        <p className="mt-0.5 text-[11px] text-app-secondary truncate">
          {cs.full_name || '-'} / {cs.phone || cs.email || ''}
        </p>
      )}
      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-app-secondary">
        {ps?.confidence != null && (
          <span className="shrink-0">conf {fmtConfidence(ps.confidence)}</span>
        )}
        {item.uploaded_at && <span className="shrink-0">{fmtDate(item.uploaded_at)}</span>}
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-app-subtle">
        {item.document_type ? <span>{documentTypeLabel(item.document_type)}</span> : null}
        {item.uploaded_by != null ? <span>User #{item.uploaded_by}</span> : null}
      </div>
      {reason && (
        <p className="mt-0.5 text-[11px] text-status-danger line-clamp-2">{reason}</p>
      )}
    </button>
  )
}

// Inline error banner

function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded border border-status-danger/30 bg-status-danger/8 px-3 py-2 text-xs text-status-danger', className)}>
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function SuccessBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn('flex items-start gap-2 rounded border border-status-success/30 bg-status-success/8 px-3 py-2 text-xs text-status-hired', className)}>
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

// Key-value row helper

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 py-1 text-xs border-b border-app-border/50 last:border-0">
      <span className="w-36 shrink-0 text-app-secondary">{label}</span>
      <span className="text-app-text break-all">{value ?? '-'}</span>
    </div>
  )
}

// ParsedDataTab

function ParsedDataTab({
  detail,
  onAction,
}: {
  detail: ResumeReviewDetail
  onAction: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canMarkReviewed = detail.status === 'manual_review' && detail.parsed_resume != null
  const isDuplicate = detail.status === 'duplicate_file'

  async function handleReprocess() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await reprocessResume(detail.id, { override_duplicate: isDuplicate })
      setSuccess(res.detail)
      onAction()
    } catch (e) {
      setError(parseApiError(e, 'Reprocess failed').message)
    } finally {
      setBusy(false)
    }
  }

  async function handleMarkReviewed() {
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await markResumeReviewed(detail.id)
      setSuccess(res.detail)
      onAction()
    } catch (e) {
      setError(parseApiError(e, 'Mark reviewed failed').message)
    } finally {
      setBusy(false)
    }
  }

  const pr = detail.parsed_resume

  return (
    <div className="space-y-4">
      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={handleReprocess} disabled={busy} className="text-xs h-8 px-3">
          <RefreshCw className="h-3 w-3 mr-1.5" />
          {isDuplicate ? 'Force reprocess' : 'Reprocess'}
        </Button>
        {canMarkReviewed && (
          <Button variant="secondary" onClick={handleMarkReviewed} disabled={busy} className="text-xs h-8 px-3">
            <CheckCircle2 className="h-3 w-3 mr-1.5" />
            Mark reviewed
          </Button>
        )}
      </div>

      <section>
        <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wide mb-1">File</h3>
        <div className="bg-app-muted/40 rounded p-2 space-y-0">
          <KV label="Filename" value={detail.original_filename} />
          <KV label="Content type" value={detail.content_type} />
          <KV label="Size" value={fmtBytes(detail.size_bytes)} />
          <KV label="Uploaded" value={fmtDate(detail.uploaded_at)} />
          <KV label="Source" value={detail.source_type?.replace(/_/g, ' ')} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wide mb-1">Status</h3>
        <div className="bg-app-muted/40 rounded p-2 space-y-0">
          <KV label="Status" value={<Badge variant={statusVariant(detail.status)}>{resumeStatusLabel(detail.status)}</Badge>} />
          <KV label="Review reason" value={detail.manual_review_reason || '-'} />
          <KV label="Error" value={detail.error_message || '-'} />
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wide mb-1">Parser</h3>
        <div className="bg-app-muted/40 rounded p-2 space-y-0">
          <KV label="Extraction engine" value={detail.extraction_engine} />
          <KV label="Extraction conf." value={fmtConfidence(detail.extraction_confidence)} />
          <KV label="Parser engine" value={detail.parser_engine} />
          <KV label="Parser conf." value={fmtConfidence(detail.parser_confidence)} />
        </div>
      </section>

      {pr && (
        <section>
          <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wide mb-1">Parsed resume</h3>
          <div className="bg-app-muted/40 rounded p-2 space-y-0">
            <KV label="Confidence" value={fmtConfidence(pr.confidence)} />
            <KV label="Career level" value={pr.career_level} />
            <KV label="Primary domain" value={pr.primary_domain} />
            <KV label="Summary" value={pr.summary} />
            {pr.validation_errors != null && (
              <KV
                label="Validation errors"
                value={<span className="text-status-danger">{JSON.stringify(pr.validation_errors)}</span>}
              />
            )}
            {pr.missing_fields != null && (
              <KV
                label="Missing fields"
                value={<span className="text-status-warning">{JSON.stringify(pr.missing_fields)}</span>}
              />
            )}
          </div>
        </section>
      )}
    </div>
  )
}

// CandidateCorrectionTab

function CandidateCorrectionTab({
  detail,
  onSaved,
}: {
  detail: ResumeReviewDetail
  onSaved: () => void
}) {
  const c = detail.candidate
  const [form, setForm] = useState<ApplyReviewCandidateInput>({
    first_name: c?.first_name ?? '',
    middle_name: c?.middle_name ?? '',
    last_name: c?.last_name ?? '',
    email: c?.email ?? '',
    phone: c?.phone ?? '',
    current_role: c?.current_role ?? '',
    current_company: c?.current_company ?? '',
    current_location: c?.current_location ?? '',
    total_experience_years: c?.total_experience_years != null ? String(c.total_experience_years) : '',
    expected_ctc: c?.expected_ctc != null ? String(c.expected_ctc) : '',
    current_ctc: c?.current_ctc != null ? String(c.current_ctc) : '',
    notice_period_days: c?.notice_period_days ?? null,
  })
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function set(field: keyof ApplyReviewCandidateInput, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: ApplyReviewCandidateInput = { ...form }
      if (payload.total_experience_years === '') payload.total_experience_years = null
      if (payload.expected_ctc === '') payload.expected_ctc = null
      if (payload.current_ctc === '') payload.current_ctc = null
      await applyResumeReview(detail.id, { candidate: payload, review_note: note })
      setSuccess('Candidate updated.')
      onSaved()
    } catch (e) {
      setError(parseApiError(e, 'Save failed').message)
    } finally {
      setBusy(false)
    }
  }

  const inp = 'w-full rounded border border-app-border bg-app-surface px-2.5 py-1.5 text-xs text-app-text placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50'

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">First name</span>
          <input className={inp} value={form.first_name ?? ''} onChange={(e) => set('first_name', e.target.value)} />
        </label>
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Middle name</span>
          <input className={inp} value={form.middle_name ?? ''} onChange={(e) => set('middle_name', e.target.value)} />
        </label>
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Last name</span>
          <input className={inp} value={form.last_name ?? ''} onChange={(e) => set('last_name', e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Email</span>
          <input className={inp} type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </label>
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Phone</span>
          <input className={inp} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Current role</span>
          <input className={inp} value={form.current_role ?? ''} onChange={(e) => set('current_role', e.target.value)} />
        </label>
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Current company</span>
          <input className={inp} value={form.current_company ?? ''} onChange={(e) => set('current_company', e.target.value)} />
        </label>
      </div>

      <label className="block space-y-0.5">
        <span className="text-[11px] text-app-secondary">Current location</span>
        <input className={inp} value={form.current_location ?? ''} onChange={(e) => set('current_location', e.target.value)} />
      </label>

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Experience (yrs)</span>
          <input className={inp} type="number" step="0.5" value={form.total_experience_years ?? ''} onChange={(e) => set('total_experience_years', e.target.value)} />
        </label>
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Current CTC</span>
          <input className={inp} type="number" step="0.01" value={form.current_ctc ?? ''} onChange={(e) => set('current_ctc', e.target.value)} />
        </label>
        <label className="space-y-0.5">
          <span className="text-[11px] text-app-secondary">Expected CTC</span>
          <input className={inp} type="number" step="0.01" value={form.expected_ctc ?? ''} onChange={(e) => set('expected_ctc', e.target.value)} />
        </label>
      </div>

      <label className="block space-y-0.5">
        <span className="text-[11px] text-app-secondary">Notice period (days)</span>
        <input
          className={cn(inp, 'w-32')}
          type="number"
          min={0}
          value={form.notice_period_days ?? ''}
          onChange={(e) => setForm((prev) => ({ ...prev, notice_period_days: e.target.value === '' ? null : Number(e.target.value) }))}
        />
      </label>

      <label className="block space-y-0.5">
        <span className="text-[11px] text-app-secondary">Review note</span>
        <textarea className={cn(inp, 'h-16 resize-none')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" />
      </label>

      <Button type="submit" disabled={busy} className="h-8 px-4 text-xs">
        {busy ? 'Saving…' : 'Save corrections'}
      </Button>
    </form>
  )
}

// SkillsExpEduTab

type SkillDraft = ApplyReviewSkillInput & { _key: number }
type ExpDraft = ApplyReviewExperienceInput & { _key: number }
type EduDraft = ApplyReviewEducationInput & { _key: number }

let _keyCounter = 0
function nextKey() {
  return ++_keyCounter
}

function skillFromRow(r: { skill_name: string; years_experience?: string | number | null; proficiency?: string | null }): SkillDraft {
  return {
    _key: nextKey(),
    skill_name: r.skill_name,
    years_experience: r.years_experience != null ? String(r.years_experience) : undefined,
    proficiency: (r.proficiency as ApplyReviewSkillInput['proficiency']) || '',
  }
}

function expFromRow(r: CandidateExperienceRow): ExpDraft {
  return {
    _key: nextKey(),
    job_title: r.job_title ?? '',
    company_name: r.company_name ?? '',
    industry: r.industry ?? '',
    start_date: r.start_date ?? null,
    end_date: r.end_date ?? null,
    is_current: r.is_current ?? false,
    description: r.description ?? '',
  }
}

function SkillsExpEduTab({ detail, onSaved }: { detail: ResumeReviewDetail; onSaved: () => void }) {
  const [skills, setSkills] = useState<SkillDraft[]>(() =>
    (detail.parsed_skills ?? []).map(skillFromRow),
  )
  const [experience, setExperience] = useState<ExpDraft[]>(() =>
    (detail.parsed_experience ?? []).map(expFromRow),
  )
  const [education, setEducation] = useState<EduDraft[]>(() =>
    (detail.parsed_education ?? []).map((r) => ({
      _key: nextKey(),
      degree: r.degree ?? '',
      specialization: r.specialization ?? '',
      institute: r.institute ?? '',
      start_year: r.start_year ?? null,
      end_year: r.end_year ?? null,
    })),
  )
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const inp = 'rounded border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50'

  function addSkill() {
    setSkills((prev) => [...prev, { _key: nextKey(), skill_name: '', proficiency: '' }])
  }
  function removeSkill(key: number) {
    setSkills((prev) => prev.filter((s) => s._key !== key))
  }
  function setSkillField<K extends keyof ApplyReviewSkillInput>(key: number, field: K, val: ApplyReviewSkillInput[K]) {
    setSkills((prev) => prev.map((s) => (s._key === key ? { ...s, [field]: val } : s)))
  }

  function addExp() {
    setExperience((prev) => [...prev, { _key: nextKey(), job_title: '', company_name: '', industry: '', is_current: false, description: '' }])
  }
  function removeExp(key: number) {
    setExperience((prev) => prev.filter((e) => e._key !== key))
  }
  function setExpField<K extends keyof ApplyReviewExperienceInput>(key: number, field: K, val: ApplyReviewExperienceInput[K]) {
    setExperience((prev) => prev.map((e) => (e._key === key ? { ...e, [field]: val } : e)))
  }

  function addEdu() {
    setEducation((prev) => [...prev, { _key: nextKey(), degree: '', specialization: '', institute: '' }])
  }
  function removeEdu(key: number) {
    setEducation((prev) => prev.filter((ed) => ed._key !== key))
  }
  function setEduField<K extends keyof ApplyReviewEducationInput>(key: number, field: K, val: ApplyReviewEducationInput[K]) {
    setEducation((prev) => prev.map((ed) => (ed._key === key ? { ...ed, [field]: val } : ed)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const skillsPayload: ApplyReviewSkillInput[] = skills
        .filter((s) => s.skill_name.trim())
        .map(({ _key: _k, ...rest }) => rest)

      const expPayload: ApplyReviewExperienceInput[] = experience.map(({ _key: _k, ...rest }) => rest)
      const eduPayload: ApplyReviewEducationInput[] = education.map(({ _key: _k, ...rest }) => rest)

      await applyResumeReview(detail.id, {
        skills: skillsPayload,
        experience: expPayload,
        education: eduPayload,
        review_note: note,
      })
      setSuccess('Saved.')
      onSaved()
    } catch (e) {
      setError(parseApiError(e, 'Save failed').message)
    } finally {
      setBusy(false)
    }
  }

  const PROFICIENCY_OPTS = [
    { value: '', label: 'Proficiency' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {/* Skills */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wide">Skills</h3>
          <button type="button" onClick={addSkill} className="text-xs text-brand-600 hover:underline">+ Add skill</button>
        </div>
        <div className="space-y-1.5">
          {skills.length === 0 && <p className="text-xs text-app-secondary">No skills.</p>}
          {skills.map((s) => (
            <div key={s._key} className="flex items-center gap-1.5">
              <input
                className={cn(inp, 'flex-1')}
                placeholder="Skill name"
                value={s.skill_name}
                onChange={(e) => setSkillField(s._key, 'skill_name', e.target.value)}
              />
              <input
                className={cn(inp, 'w-20')}
                type="number"
                min={0}
                step={0.5}
                placeholder="Yrs"
                value={s.years_experience ?? ''}
                onChange={(e) => setSkillField(s._key, 'years_experience', e.target.value === '' ? undefined : e.target.value)}
              />
              <select
                className={cn(inp, 'w-28')}
                value={s.proficiency ?? ''}
                onChange={(e) => setSkillField(s._key, 'proficiency', e.target.value as ApplyReviewSkillInput['proficiency'])}
              >
                {PROFICIENCY_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="button" onClick={() => removeSkill(s._key)} className="text-status-danger hover:opacity-70">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wide">Experience</h3>
          <button type="button" onClick={addExp} className="text-xs text-brand-600 hover:underline">+ Add row</button>
        </div>
        <div className="space-y-3">
          {experience.length === 0 && <p className="text-xs text-app-secondary">No experience rows.</p>}
          {experience.map((ex, idx) => (
            <div key={ex._key} className="rounded border border-app-border p-2 space-y-1.5 relative">
              <button
                type="button"
                onClick={() => removeExp(ex._key)}
                className="absolute top-1.5 right-1.5 text-status-danger hover:opacity-70"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
              <p className="text-[11px] text-app-secondary font-medium">#{idx + 1}</p>
              <div className="grid grid-cols-2 gap-1.5">
                <input className={inp} placeholder="Job title" value={ex.job_title ?? ''} onChange={(e) => setExpField(ex._key, 'job_title', e.target.value)} />
                <input className={inp} placeholder="Company" value={ex.company_name ?? ''} onChange={(e) => setExpField(ex._key, 'company_name', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input className={inp} placeholder="Industry" value={ex.industry ?? ''} onChange={(e) => setExpField(ex._key, 'industry', e.target.value)} />
                <input className={inp} type="date" placeholder="Start" value={ex.start_date ?? ''} onChange={(e) => setExpField(ex._key, 'start_date', e.target.value || null)} />
                <input className={inp} type="date" placeholder="End" value={ex.end_date ?? ''} onChange={(e) => setExpField(ex._key, 'end_date', e.target.value || null)} disabled={ex.is_current} />
              </div>
              <label className="flex items-center gap-1.5 text-xs text-app-secondary">
                <input
                  type="checkbox"
                  checked={ex.is_current ?? false}
                  onChange={(e) => setExpField(ex._key, 'is_current', e.target.checked)}
                />
                Current role
              </label>
              <textarea
                className={cn(inp, 'w-full h-14 resize-none')}
                placeholder="Description"
                value={ex.description ?? ''}
                onChange={(e) => setExpField(ex._key, 'description', e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Education */}
      <section>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-app-secondary uppercase tracking-wide">Education</h3>
          <button type="button" onClick={addEdu} className="text-xs text-brand-600 hover:underline">+ Add row</button>
        </div>
        <div className="space-y-3">
          {education.length === 0 && <p className="text-xs text-app-secondary">No education rows.</p>}
          {education.map((ed, idx) => (
            <div key={ed._key} className="rounded border border-app-border p-2 space-y-1.5 relative">
              <button type="button" onClick={() => removeEdu(ed._key)} className="absolute top-1.5 right-1.5 text-status-danger hover:opacity-70">
                <XCircle className="h-3.5 w-3.5" />
              </button>
              <p className="text-[11px] text-app-secondary font-medium">#{idx + 1}</p>
              <div className="grid grid-cols-2 gap-1.5">
                <input className={inp} placeholder="Degree" value={ed.degree ?? ''} onChange={(e) => setEduField(ed._key, 'degree', e.target.value)} />
                <input className={inp} placeholder="Specialization" value={ed.specialization ?? ''} onChange={(e) => setEduField(ed._key, 'specialization', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input className={inp + ' col-span-1'} placeholder="Institute" value={ed.institute ?? ''} onChange={(e) => setEduField(ed._key, 'institute', e.target.value)} />
                <input className={inp} type="number" placeholder="Start yr" value={ed.start_year ?? ''} onChange={(e) => setEduField(ed._key, 'start_year', e.target.value === '' ? null : Number(e.target.value))} />
                <input className={inp} type="number" placeholder="End yr" value={ed.end_year ?? ''} onChange={(e) => setEduField(ed._key, 'end_year', e.target.value === '' ? null : Number(e.target.value))} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <label className="block space-y-0.5">
        <span className="text-[11px] text-app-secondary">Review note</span>
        <textarea className={cn(inp, 'w-full h-14 resize-none')} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note…" />
      </label>

      <Button type="submit" disabled={busy} className="h-8 px-4 text-xs">
        {busy ? 'Saving…' : 'Save skills / exp / edu'}
      </Button>
    </form>
  )
}

// RawTextTab

function RawTextTab({ detail }: { detail: ResumeReviewDetail }) {
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState<'cleaned' | 'raw' | null>(null)

  function copy(text: string, which: 'cleaned' | 'raw') {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const TextBlock = ({ label, text, which }: { label: string; text: string | null | undefined; which: 'cleaned' | 'raw' }) => {
    if (!text) return <p className="text-xs text-app-secondary">Not available.</p>
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-app-secondary">{label}</span>
          <button
            type="button"
            onClick={() => copy(text, which)}
            className="flex items-center gap-1 text-[11px] text-app-secondary hover:text-app-text"
          >
            <Copy className="h-3 w-3" />
            {copied === which ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded border border-app-border bg-app-muted/40 p-2 text-[11px] text-app-text font-mono">
          {text}
        </pre>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <TextBlock label="Cleaned text" text={detail.cleaned_text} which="cleaned" />

      <div>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="flex items-center gap-1 text-xs text-app-secondary hover:text-app-text mb-1"
        >
          {showRaw ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Raw text (OCR/original)
        </button>
        {showRaw && <TextBlock label="Raw text" text={detail.raw_text} which="raw" />}
      </div>
    </div>
  )
}

// HistoryTab

function HistoryTab({ resumeId }: { resumeId: number }) {
  const [rows, setRows] = useState<TalentResumeReviewRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getResumeReviewHistory(resumeId)
        if (!cancelled) setRows(data)
      } catch (e) {
        if (!cancelled) setError(parseApiError(e, 'Could not load history').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [resumeId])

  if (loading) return <Spinner label="Loading history…" />
  if (error) return <ErrorBanner message={error} />
  if (rows.length === 0) return <p className="text-xs text-app-secondary">No history yet.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-app-border text-app-secondary text-left">
            <th className="pb-1 pr-3 font-medium">Type</th>
            <th className="pb-1 pr-3 font-medium">From</th>
            <th className="pb-1 pr-3 font-medium">To</th>
            <th className="pb-1 pr-3 font-medium">By</th>
            <th className="pb-1 pr-3 font-medium">Note</th>
            <th className="pb-1 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-app-border/40 hover:bg-app-muted/30">
              <td className="py-1.5 pr-3 font-medium">{r.review_type.replace(/_/g, ' ')}</td>
              <td className="py-1.5 pr-3 text-app-secondary">{resumeStatusLabel(r.previous_status)}</td>
              <td className="py-1.5 pr-3"><Badge variant={statusVariant(r.new_status)} className="text-[10px]">{resumeStatusLabel(r.new_status)}</Badge></td>
              <td className="py-1.5 pr-3 text-app-secondary">{r.reviewed_by_name || '-'}</td>
              <td className="py-1.5 pr-3 text-app-secondary max-w-xs truncate">{r.review_note || '-'}</td>
              <td className="py-1.5 text-app-secondary whitespace-nowrap">{fmtDate(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// DuplicateTab

function DuplicateTab({ detail, onResolved }: { detail: ResumeReviewDetail; onResolved: () => void }) {
  const isDuplicate = detail.status === 'duplicate_file'
  const [resolution, setResolution] = useState<'link_existing' | 'keep_separate' | 'mark_duplicate'>('keep_separate')
  const [candidateId, setCandidateId] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const inp = 'w-full rounded border border-app-border bg-app-surface px-2.5 py-1.5 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50'

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      await resolveResumeDuplicate(detail.id, {
        resolution,
        candidate: resolution === 'link_existing' && candidateId ? Number(candidateId) : null,
        note,
      })
      setSuccess('Duplicate resolved.')
      onResolved()
    } catch (e) {
      setError(parseApiError(e, 'Resolution failed').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {!isDuplicate && (
        <div className="flex items-start gap-2 rounded border border-app-border bg-app-muted/40 px-3 py-2 text-xs text-app-secondary">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          This resume is not flagged as a duplicate. Resolution is still available below.
        </div>
      )}
      {isDuplicate && (
        <div className="flex items-start gap-2 rounded border border-status-attention/30 bg-status-attention/8 px-3 py-2 text-xs text-status-attention">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          This resume is flagged as a duplicate file. Choose a resolution action below.
        </div>
      )}

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      <form onSubmit={handleResolve} className="space-y-3">
        <div className="space-y-1.5">
          {(
            [
              { val: 'link_existing', label: 'Link to existing candidate', desc: 'Attach this file to a candidate record that already exists.' },
              { val: 'keep_separate', label: 'Keep separate', desc: 'Treat as a different resume, ignore duplicate flag.' },
              { val: 'mark_duplicate', label: 'Mark as duplicate', desc: 'Record as duplicate, no further processing.' },
            ] as const
          ).map((opt) => (
            <label
              key={opt.val}
              className={cn(
                'flex items-start gap-2 rounded border px-3 py-2 cursor-pointer text-xs',
                resolution === opt.val ? 'border-brand-500 bg-brand-600/8' : 'border-app-border hover:bg-app-muted/40',
              )}
            >
              <input
                type="radio"
                name="resolution"
                value={opt.val}
                checked={resolution === opt.val}
                onChange={() => setResolution(opt.val)}
                className="mt-0.5"
              />
              <div>
                <p className="font-medium text-app-text">{opt.label}</p>
                <p className="text-app-secondary">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {resolution === 'link_existing' && (
          <label className="block space-y-0.5">
            <span className="text-[11px] text-app-secondary">Candidate ID to link</span>
            <input
              className={cn(inp, 'w-40')}
              type="number"
              min={1}
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="Candidate ID"
            />
          </label>
        )}

        <label className="block space-y-0.5">
          <span className="text-[11px] text-app-secondary">Note</span>
          <textarea
            className={cn(inp, 'h-14 resize-none')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for resolution…"
          />
        </label>

        <Button type="submit" disabled={busy} className="h-8 px-4 text-xs">
          {busy ? 'Resolving…' : 'Resolve duplicate'}
        </Button>
      </form>

      {detail.candidate ? (
        <div className="border-t border-app-border pt-4">
          <DuplicateCandidatesPanel candidate={detail.candidate} onMerged={onResolved} />
        </div>
      ) : null}
    </div>
  )
}

// Detail pane

function DetailPane({
  resumeId,
  onQueueRefresh,
}: {
  resumeId: number
  onQueueRefresh: () => void
}) {
  const [detail, setDetail] = useState<ResumeReviewDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('parsed')

  const loadDetail = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const d = await getResumeReviewDetail(resumeId)
        if (!cancelled) {
          setDetail(d)
          if (d.status === 'duplicate_file') setActiveTab('duplicate')
        }
      } catch (e) {
        if (!cancelled) setError(parseApiError(e, 'Could not load detail').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [resumeId])

  useEffect(() => {
    return loadDetail()
  }, [loadDetail])

  function afterAction() {
    loadDetail()
    onQueueRefresh()
  }

  if (loading) return <div className="flex flex-1 items-center justify-center"><Spinner label="Loading…" /></div>
  if (error) return <div className="p-4"><ErrorBanner message={error} /></div>
  if (!detail) return null

  const c = detail.candidate

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-app-border bg-app-surface shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-text truncate">
              {detail.original_filename || `Resume #${detail.id}`}
            </p>
            {c && (
              <p className="text-xs text-app-secondary mt-0.5">
                {[c.first_name, c.last_name].filter(Boolean).join(' ') || '-'}
                {c.phone ? ` / ${c.phone}` : ''}
                {c.email ? ` / ${c.email}` : ''}
              </p>
            )}
          </div>
          <Badge variant={statusVariant(detail.status)} className="shrink-0">
            {resumeStatusLabel(detail.status)}
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-app-border shrink-0 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isDupAlert = tab.id === 'duplicate' && detail.status === 'duplicate_file'
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors',
                isActive
                  ? 'border-brand-500 text-brand-600 bg-brand-600/5'
                  : 'border-transparent text-app-secondary hover:text-app-text hover:bg-app-muted/40',
                isDupAlert && !isActive && 'text-status-attention',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {isDupAlert && <span className="h-1.5 w-1.5 rounded-full bg-status-attention" />}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'parsed' && <ParsedDataTab detail={detail} onAction={afterAction} />}
        {activeTab === 'candidate' && <CandidateCorrectionTab detail={detail} onSaved={afterAction} />}
        {activeTab === 'skills' && <SkillsExpEduTab detail={detail} onSaved={afterAction} />}
        {activeTab === 'raw' && <RawTextTab detail={detail} />}
        {activeTab === 'history' && <HistoryTab resumeId={detail.id} />}
        {activeTab === 'duplicate' && <DuplicateTab detail={detail} onResolved={afterAction} />}
      </div>
    </div>
  )
}

// Main page

export function ResumeReviewQueuePage() {
  const [searchParams] = useSearchParams()
  const resumeFromUrl = Number(searchParams.get('resume'))
  const [items, setItems] = useState<ResumeReviewQueueItem[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [queueError, setQueueError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(
    Number.isFinite(resumeFromUrl) && resumeFromUrl > 0 ? resumeFromUrl : null,
  )

  const [filters, setFilters] = useState<QueueFilters>(BLANK_FILTERS)
  const [candidateInput, setCandidateInput] = useState('')
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadQueue = useCallback((f: QueueFilters) => {
    let cancelled = false
    setQueueLoading(true)
    setQueueError(null)
    void (async () => {
      try {
        const params = {
          status: f.status || undefined,
          document_type: f.document_type || undefined,
          source_type: f.source_type || undefined,
          uploaded_by: f.uploaded_by.trim() || undefined,
          candidate: f.candidate || undefined,
          confidence_below: f.confidence_below || undefined,
          uploaded_from: f.uploaded_from || undefined,
          uploaded_to: f.uploaded_to || undefined,
        }
        const res = await listResumeReviewQueue(params)
        if (!cancelled) setItems(res.items)
      } catch (e) {
        if (!cancelled) setQueueError(parseApiError(e, 'Could not load queue').message)
      } finally {
        if (!cancelled) setQueueLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    return loadQueue(filters)
  }, [loadQueue, filters])

  function handleCandidateInput(val: string) {
    setCandidateInput(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, candidate: val }))
    }, 400)
  }

  function setFilter<K extends keyof QueueFilters>(k: K, v: QueueFilters[K]) {
    setFilters((prev) => ({ ...prev, [k]: v }))
  }

  function refreshQueue() {
    loadQueue(filters)
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-app-heading">Resume review queue</h1>
        <p className="mt-1 text-sm text-app-secondary">
          Review failed or low-confidence resumes, correct parsed data, and mark as ready.
        </p>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
      {/* Left pane - queue */}
      <div className="flex h-full w-80 shrink-0 flex-col overflow-hidden border-r border-app-border">
        <div className="shrink-0 border-b border-app-border px-3 py-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-app-heading">Queue</h2>
            <button
              type="button"
              onClick={refreshQueue}
              disabled={queueLoading}
              className="text-app-secondary hover:text-app-text disabled:opacity-40"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', queueLoading && 'animate-spin')} />
            </button>
          </div>

          <div className="space-y-1.5">
            <input
              placeholder="Search candidate name / phone…"
              value={candidateInput}
              onChange={(e) => handleCandidateInput(e.target.value)}
              className="h-7 w-full rounded border border-app-border bg-app-surface px-2 text-xs text-app-text placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="h-7 w-full rounded border border-app-border bg-app-surface px-2 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={filters.document_type}
              onChange={(e) => setFilter('document_type', e.target.value)}
              className="h-7 w-full rounded-lg border border-app-border bg-app-muted/50 px-2 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {DOCUMENT_TYPE_FILTER_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              value={filters.source_type}
              onChange={(e) => setFilter('source_type', e.target.value)}
              className="h-7 w-full rounded-lg border border-app-border bg-app-muted/50 px-2 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {SOURCE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="number"
              min={1}
              placeholder="Uploaded by user ID"
              value={filters.uploaded_by}
              onChange={(e) => setFilter('uploaded_by', e.target.value)}
              className="h-7 w-full rounded-lg border border-app-border bg-app-muted/50 px-2 text-xs text-app-text placeholder:text-app-subtle focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="flex gap-1.5 items-center">
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                className="h-7 w-full rounded border border-app-border bg-app-surface px-2 text-xs text-app-text placeholder-app-muted focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Conf below (0–1)"
                value={filters.confidence_below}
                onChange={(e) => setFilter('confidence_below', e.target.value)}
              />
            </div>
            <div className="flex gap-1.5">
              <input
                type="date"
                className="h-7 w-full rounded border border-app-border bg-app-surface px-2 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={filters.uploaded_from}
                onChange={(e) => setFilter('uploaded_from', e.target.value)}
              />
              <input
                type="date"
                className="h-7 w-full rounded border border-app-border bg-app-surface px-2 text-xs text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500"
                value={filters.uploaded_to}
                onChange={(e) => setFilter('uploaded_to', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {queueError && <div className="p-2"><ErrorBanner message={queueError} /></div>}
          {!queueError && queueLoading && items.length === 0 && (
            <div className="flex items-center justify-center pt-8">
              <Spinner label="Loading queue…" />
            </div>
          )}
          {!queueError && !queueLoading && items.length === 0 && (
            <EmptyState
              title="Queue clear"
              description="No resumes need review with these filters."
            />
          )}
          {items.map((item) => (
            <QueueRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onClick={() => setSelectedId(item.id)}
            />
          ))}
        </div>
      </div>

      {/* Right pane - detail */}
      <div className="flex-1 overflow-hidden h-full">
        {selectedId == null ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              title="Select a resume"
              description="Click a queue item on the left to review it."
            />
          </div>
        ) : (
          <DetailPane
            key={selectedId}
            resumeId={selectedId}
            onQueueRefresh={refreshQueue}
          />
        )}
      </div>
      </div>
    </div>
  )
}

/** @deprecated Use ResumeReviewQueuePage — kept for legacy imports */
export const ResumeReviewPage = ResumeReviewQueuePage
