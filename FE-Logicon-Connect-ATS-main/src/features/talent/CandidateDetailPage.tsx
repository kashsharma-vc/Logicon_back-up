import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Route,
  Star,
  User,
  Wrench,
} from 'lucide-react'
import {
  getCandidate,
  listCandidateEducations,
  listCandidateExperiences,
  listCandidateSkills,
  listResumes,
} from '@/api/talent'
import { listHiringApplications } from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { DuplicateCandidatesPanel } from '@/features/talent/DuplicateCandidatesPanel'
import { ProfileQualityChecklist } from '@/features/talent/ProfileQualityIndicators'
import { ResumeFileActions } from '@/features/talent/ResumeFileActions'
import {
  candidateJourneyStatusLabel,
  candidateJourneyStatusVariant,
  documentTypeLabel,
  documentTypeShort,
  hiringApplicationStatusLabel,
  poolResumeStatusLabel,
  poolResumeStatusVariant,
  sourceTypeLabel,
} from '@/features/talent/talentLabels'
import type { HiringApplicationRow } from '@/features/hiring/types'
import type {
  CandidateEducationRow,
  CandidateExperienceRow,
  CandidateRow,
  CandidateSkillRow,
  ResumeRow,
} from '@/features/talent/types'

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

function formatResponsibilities(value: CandidateExperienceRow['responsibilities']): string {
  if (Array.isArray(value)) return value.filter((v) => v.trim()).join(', ')
  return value?.trim() ?? ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined, isCurrent?: boolean): string {
  const startStr = start?.slice(0, 7)?.replace('-', '/') || '—'
  if (isCurrent) return `${startStr} — Present`
  const endStr = end?.slice(0, 7)?.replace('-', '/') || '—'
  return `${startStr} — ${endStr}`
}

function hiringStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const s = status.toLowerCase()
  if (['deployed', 'offer_accepted', 'selected'].includes(s)) return 'success'
  if (['rejected', 'cancelled', 'offer_declined'].includes(s)) return 'danger'
  if (['interview_scheduled', 'interview_in_progress', 'client_review'].includes(s)) return 'info'
  if (['shortlisted', 'offer_released'].includes(s)) return 'warning'
  return 'neutral'
}

export function CandidateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const cid = Number(id)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<CandidateRow | null>(null)
  const [resumes, setResumes] = useState<ResumeRow[]>([])
  const [experiences, setExperiences] = useState<CandidateExperienceRow[]>([])
  const [educations, setEducations] = useState<CandidateEducationRow[]>([])
  const [skills, setSkills] = useState<CandidateSkillRow[]>([])
  const [applications, setApplications] = useState<HiringApplicationRow[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  const validId = useMemo(() => Number.isFinite(cid) && cid > 0, [cid])

  useEffect(() => {
    if (!validId) {
      setError('Invalid candidate.')
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const [c, res, exp, edu, sk] = await Promise.all([
          getCandidate(cid),
          listResumes({ candidate: cid }),
          listCandidateExperiences({ candidate: cid }),
          listCandidateEducations({ candidate: cid }),
          listCandidateSkills({ candidate: cid }),
        ])
        if (cancelled) return
        setRow(c)
        setResumes(res.items)
        setExperiences(exp.items)
        setEducations(edu.items)
        setSkills(sk.items)
        const phone = (c.phone ?? '').trim()
        const appSearch = phone.length >= 6 ? phone : displayName(c)
        const apps = await listHiringApplications({ search: appSearch })
        if (cancelled) return
        setApplications(apps.items.filter((a) => a.candidate === cid))
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load candidate').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cid, validId, reloadKey])

  if (!validId) return <ErrorState message="Invalid candidate id." />
  if (loading) return <Spinner label="Loading candidate…" />
  if (error) return <ErrorState message={error} />
  if (!row) return <EmptyState title="Candidate not found" description="This profile may have been removed." />

  // Compute profile completeness
  const hasPhone = Boolean(row.phone?.trim())
  const hasEmail = Boolean(row.email?.trim())
  const hasRole = Boolean(row.current_role?.trim())
  const hasLocation = Boolean(row.current_location?.trim())
  const hasExp = row.total_experience_years != null
  const hasSkills = skills.length > 0
  const hasResume = resumes.some((r) => r.status === 'indexed')
  const profileItems = [hasPhone, hasEmail, hasRole, hasLocation, hasExp, hasSkills, hasResume]
  const profileComplete = profileItems.filter(Boolean).length
  const profileTotal = profileItems.length

  return (
    <div className="w-full space-y-6">
      {/* Back navigation */}
      <Link
        to="/candidates"
        className="inline-flex items-center gap-2 text-sm font-medium text-app-secondary transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resume Pool
      </Link>

      {/* Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">
            {getInitials(row)}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-app-heading">{displayName(row)}</h1>
              {row.latest_resume_status && (
                <Badge variant={poolResumeStatusVariant(row.latest_resume_status)}>
                  {poolResumeStatusLabel(row.latest_resume_status)}
                </Badge>
              )}
            </div>

            <p className="mt-1 text-sm text-app-secondary">
              {row.current_role?.trim() || 'Role not specified'}
            </p>

            {/* Contact info */}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-app-secondary">
              {row.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {row.phone}
                </span>
              )}
              {row.email?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {row.email}
                </span>
              )}
              {row.current_location?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {row.current_location}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="mt-2 flex flex-wrap gap-2">
              {row.target_job_role_name?.trim() && (
                <Badge variant="info" className="gap-1.5">
                  <Briefcase className="h-3 w-3" />
                  {row.target_job_role_name.trim()}
                </Badge>
              )}
              {row.latest_document_type && (
                <Badge variant="neutral">{documentTypeLabel(row.latest_document_type)}</Badge>
              )}
              {row.latest_source_type && (
                <Badge variant="neutral">{sourceTypeLabel(row.latest_source_type)}</Badge>
              )}
              {row.lifecycle_status && (
                <Badge variant="neutral">{row.lifecycle_status.replace(/_/g, ' ')}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Profile completeness - compact */}
        <div className="flex shrink-0 items-center gap-2 text-sm">
          <span className="text-app-subtle">Profile:</span>
          <span className={cn(
            'font-semibold',
            profileComplete === profileTotal
              ? 'text-status-hired'
              : profileComplete >= 4
                ? 'text-brand-600'
                : 'text-status-warning',
          )}>
            {Math.round((profileComplete / profileTotal) * 100)}%
          </span>
          <span className="text-app-subtle">({profileComplete}/{profileTotal})</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-app-heading">
                {row.total_experience_years != null ? String(row.total_experience_years) : '—'}
              </p>
              <p className="text-xs text-app-subtle">Years Exp</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-hired/10 text-status-hired">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-app-heading">{skills.length}</p>
              <p className="text-xs text-app-subtle">Skills</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-info/10 text-status-info">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-app-heading">{resumes.length}</p>
              <p className="text-xs text-app-subtle">Resumes</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold text-app-heading">{applications.length}</p>
              <p className="text-xs text-app-subtle">Applications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Resume Files */}
          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-app-heading">Resume Files</h2>
                  <p className="text-xs text-app-subtle">{resumes.length} document{resumes.length === 1 ? '' : 's'} attached</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {resumes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-app-muted text-app-subtle">
                    <FileText className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-app-text">No resumes uploaded</p>
                  <p className="mt-1 text-xs text-app-subtle">Upload a resume to enable parsing</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map((r) => (
                    <div
                      key={r.id}
                      className="group flex items-center gap-4 rounded-xl border border-app-border bg-gradient-to-r from-app-muted/50 to-app-surface p-4 transition-all hover:border-brand-300 hover:shadow-sm"
                    >
                      <div
                        className={cn(
                          'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white',
                          r.document_type === 'pdf'
                            ? 'bg-red-500'
                            : r.document_type === 'docx' || r.document_type === 'doc'
                              ? 'bg-blue-500'
                              : 'bg-gray-500',
                        )}
                      >
                        <span className="text-xs font-bold">{documentTypeShort(r.document_type)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-app-text">
                          {r.original_filename || `Resume #${r.id}`}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant={poolResumeStatusVariant(r.status)} className="text-[10px]">
                            {poolResumeStatusLabel(r.status)}
                          </Badge>
                          {r.source_type && (
                            <Badge variant="neutral" className="text-[10px]">
                              {sourceTypeLabel(r.source_type)}
                            </Badge>
                          )}
                          {r.size_bytes != null && (
                            <span className="text-xs text-app-subtle">{formatFileSize(r.size_bytes)}</span>
                          )}
                          {r.uploaded_at && (
                            <span className="text-xs text-app-subtle">
                              {new Date(r.uploaded_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>
                      <ResumeFileActions resume={r} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Experience */}
          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-info/10 text-status-info">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-app-heading">Work Experience</h2>
                  <p className="text-xs text-app-subtle">{experiences.length} position{experiences.length === 1 ? '' : 's'}</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {experiences.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-app-muted text-app-subtle">
                    <Briefcase className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-app-text">No experience data</p>
                  <p className="mt-1 text-xs text-app-subtle">Experience will be parsed from resume</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[17px] top-2 h-[calc(100%-16px)] w-0.5 bg-app-border" />

                  {experiences.map((exp) => (
                    <div key={exp.id} className="relative flex gap-4 pb-6 last:pb-0">
                      {/* Timeline dot */}
                      <div
                        className={cn(
                          'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
                          exp.is_current
                            ? 'border-brand-500 bg-brand-500 text-white'
                            : 'border-app-border bg-app-surface text-app-subtle',
                        )}
                      >
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-xl border border-app-border bg-app-muted/30 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-app-heading">{exp.job_title}</p>
                            <p className="text-sm text-app-secondary">{exp.company_name || '—'}</p>
                          </div>
                          {exp.is_current && <Badge variant="success">Current</Badge>}
                        </div>
                        <p className="mt-2 text-xs text-app-subtle">
                          {formatDateRange(exp.start_date, exp.end_date, exp.is_current)}
                        </p>
                        {(formatResponsibilities(exp.responsibilities) || exp.description?.trim()) && (
                          <p className="mt-3 text-sm text-app-secondary">
                            {formatResponsibilities(exp.responsibilities) || exp.description?.trim()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Education */}
          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-app-heading">Education</h2>
                  <p className="text-xs text-app-subtle">{educations.length} qualification{educations.length === 1 ? '' : 's'}</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {educations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-app-muted text-app-subtle">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-app-text">No education data</p>
                  <p className="mt-1 text-xs text-app-subtle">Education will be parsed from resume</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {educations.map((edu) => (
                    <div
                      key={edu.id}
                      className="rounded-xl border border-app-border bg-app-muted/30 p-4"
                    >
                      <p className="font-semibold text-app-heading">{edu.degree}</p>
                      {edu.specialization && (
                        <p className="text-sm text-app-secondary">{edu.specialization}</p>
                      )}
                      {edu.institute && (
                        <p className="mt-2 text-sm text-app-text">{edu.institute}</p>
                      )}
                      <p className="mt-2 text-xs text-app-subtle">
                        {edu.start_year ?? '—'} — {edu.end_year ?? '—'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Candidate Journey */}
          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-info/10 text-status-info">
                  <Route className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-app-heading">Candidate Journey</h2>
              </div>
            </div>
            <div className="divide-y divide-app-border">
              {/* Current Journey Status */}
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-app-subtle">Journey</span>
                <Badge variant={candidateJourneyStatusVariant(row.journey_status)}>
                  {candidateJourneyStatusLabel(row.journey_status, row.journey_status_label)}
                </Badge>
              </div>

              {/* Latest Application */}
              {row.latest_application_id && (
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-app-subtle">Application</span>
                  <Link
                    to={`/hiring/applications/${row.latest_application_id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    #{row.latest_application_id}
                    {row.latest_application_status && (
                      <span className="text-app-subtle">({row.latest_application_status.replace(/_/g, ' ')})</span>
                    )}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Latest Offer Status */}
              {row.latest_offer_status && (
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-app-subtle">Offer</span>
                  <span className="text-sm font-medium text-app-text">{row.latest_offer_status.replace(/_/g, ' ')}</span>
                </div>
              )}

              {/* Employee */}
              {row.employee_id && (
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-app-subtle">Employee</span>
                  <Link
                    to={`/deployment/employees?search=${encodeURIComponent(row.phone || displayName(row))}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    #{row.employee_id}
                    {row.employee_status && (
                      <span className="text-app-subtle">({row.employee_status.replace(/_/g, ' ')})</span>
                    )}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Deployment */}
              {row.deployment_id && (
                <div className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-app-subtle">Deployment</span>
                  <Link
                    to={`/deployment/site-deployments?employee=${row.employee_id ?? ''}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    #{row.deployment_id}
                    {row.deployment_status && (
                      <span className="text-app-subtle">({row.deployment_status.replace(/_/g, ' ')})</span>
                    )}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}

              {/* Show message if no journey data */}
              {!row.journey_status && !row.latest_application_id && !row.employee_id && (
                <div className="px-5 py-4 text-center">
                  <p className="text-sm text-app-subtle">No journey data available</p>
                </div>
              )}
            </div>
          </section>

          {/* Profile Summary */}
          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-400">
                  <User className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-app-heading">Profile Summary</h2>
              </div>
            </div>
            <div className="divide-y divide-app-border">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-app-subtle">Current Role</span>
                <span className="text-sm font-medium text-app-text">{row.current_role?.trim() || '—'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-app-subtle">Company</span>
                <span className="text-sm font-medium text-app-text">{row.current_company?.trim() || '—'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-app-subtle">Location</span>
                <span className="text-sm font-medium text-app-text">{row.current_location?.trim() || '—'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-app-subtle">Experience</span>
                <span className="text-sm font-medium text-app-text">
                  {row.total_experience_years != null ? `${row.total_experience_years} years` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-app-subtle">Availability</span>
                <span className="text-sm font-medium text-app-text">
                  {row.availability_status?.replace(/_/g, ' ') || '—'}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <h2 className="text-base font-semibold text-app-heading">Profile quality</h2>
              <p className="text-xs text-app-subtle">Completeness from server</p>
            </div>
            <div className="p-5">
              <ProfileQualityChecklist candidate={row} />
            </div>
          </section>

          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <h2 className="text-base font-semibold text-app-heading">Duplicates</h2>
              <p className="text-xs text-app-subtle">Resolve or merge duplicate records</p>
            </div>
            <div className="p-5">
              <DuplicateCandidatesPanel candidate={row} onMerged={() => setReloadKey((k) => k + 1)} />
            </div>
          </section>

          {/* Skills */}
          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-hired/10 text-status-hired">
                  <Wrench className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-app-heading">Skills</h2>
                  <p className="text-xs text-app-subtle">{skills.length} indexed</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {skills.length === 0 ? (
                <p className="text-center text-sm text-app-subtle">No skills parsed yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-muted/50 px-3 py-1.5 text-xs font-medium text-app-text"
                    >
                      {s.skill_name}
                      {s.years_experience != null && (
                        <span className="text-app-subtle">· {s.years_experience}y</span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Applications */}
          <section className="rounded-xl border border-app-border bg-app-surface shadow-sm">
            <div className="border-b border-app-border px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-status-warning/10 text-status-warning">
                  <Star className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-app-heading">Applications</h2>
                  <p className="text-xs text-app-subtle">{applications.length} linked</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {applications.length === 0 ? (
                <p className="text-center text-sm text-app-subtle">No applications linked</p>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => (
                    <Link
                      key={app.id}
                      to={`/hiring/applications/${app.id}`}
                      className="block rounded-xl border border-app-border bg-app-muted/30 p-3 transition-all hover:border-brand-300 hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-app-text">
                            {app.job_role_name ?? `Role #${app.job_role}`}
                          </p>
                          <p className="truncate text-xs text-app-subtle">
                            {app.site_name ?? `Site #${app.site}`}
                            {app.client_name ? ` · ${app.client_name}` : ''}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 shrink-0 text-app-subtle" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={hiringStatusVariant(app.status)} className="text-[10px]">
                          {hiringApplicationStatusLabel(app.status)}
                        </Badge>
                        {app.current_stage_name && (
                          <span className="text-xs text-app-subtle">{app.current_stage_name}</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
