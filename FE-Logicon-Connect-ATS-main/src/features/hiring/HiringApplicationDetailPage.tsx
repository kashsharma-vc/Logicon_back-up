import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  IndianRupee,
  MapPin,
  Send,
  Settings,
  Target,
  User,
  Users,
} from 'lucide-react'
import {
  convertApplicationToDeployment,
  getHiringApplication,
  getInterviewPlan,
  listInterviewFeedback,
  listInterviews,
  listOffers,
  listPipelineStages,
  moveHiringApplicationStage,
  getHiringApplicationTimeline,
} from '@/api/hiring'
import { listResumes } from '@/api/talent'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { CandidateMatchScorecard } from '@/features/hiring/CandidateMatchScorecard'
import { OfferFormDrawer } from '@/features/hiring/OfferFormDrawer'
import { HiringApplicationJourney } from '@/features/hiring/HiringJourney'
import { ApplicationTimeline } from '@/features/hiring/ApplicationTimeline'
import { matchSnapshotToScorecard } from '@/features/hiring/matchResultMapper'
import {
  applicationRequiresClientReview,
  hasLaneInfo,
  hiringLaneBadgeLabel,
  hiringLaneBadgeVariant,
} from '@/features/hiring/hiringLaneLabels'
import { InterviewPanel } from '@/features/hiring/InterviewPanel'
import { ResumeFileActions } from '@/features/talent/ResumeFileActions'
import {
  hiringApplicationStatusLabel,
  HIRING_APPLICATION_STATUS_OPTIONS,
  resumeStatusLabel,
  resumeStatusVariant,
} from '@/features/talent/talentLabels'
import type {
  HiringApplicationRow,
  HiringDeploymentConversionResult,
  InterviewFeedbackRow,
  InterviewPlanRow,
  InterviewRow,
  OfferRow,
  PipelineStageRow,
} from '@/features/hiring/types'
import type { EmployeeRow, SiteDeploymentRow } from '@/features/deployment/types'
import type { ResumeRow } from '@/features/talent/types'

function offerStatusVariant(s: string): 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'attention' {
  if (s === 'draft') return 'neutral'
  if (s === 'released') return 'info'
  if (s === 'accepted') return 'success'
  if (s === 'declined') return 'danger'
  if (s === 'withdrawn') return 'attention'
  if (s === 'expired') return 'warning'
  return 'neutral'
}

function statusVariant(s: string): 'neutral' | 'info' | 'success' | 'danger' | 'warning' {
  if (['deployed', 'offer_accepted', 'selected'].includes(s)) return 'success'
  if (['rejected', 'cancelled', 'offer_declined'].includes(s)) return 'danger'
  if (['interview_scheduled', 'interview_in_progress', 'client_review'].includes(s)) return 'info'
  if (['shortlisted', 'offer_released'].includes(s)) return 'warning'
  return 'neutral'
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || '??'
}

function SectionCard({
  icon,
  iconBg,
  title,
  subtitle,
  action,
  children,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-app-border px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>
            {icon}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-app-heading">{title}</h2>
            {subtitle && <p className="text-xs text-app-subtle">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm text-app-subtle">{label}</span>
      <span className={cn('text-sm font-medium text-app-text', mono && 'font-mono text-xs')}>{value ?? '—'}</span>
    </div>
  )
}

export function HiringApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const appId = Number(id)
  const [searchParams, setSearchParams] = useSearchParams()
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canMove = hasAnyCapability(meCaps, [CAP.HIRING_APPLICATION_UPDATE])
  const canOfferRead = hasAnyCapability(meCaps, [CAP.OFFER_READ, CAP.OFFER_CREATE, CAP.OFFER_UPDATE, CAP.OFFER_APPROVE, CAP.OFFER_MANAGE])
  const canOfferCreate = hasAnyCapability(meCaps, [CAP.OFFER_CREATE])
  const canConvert = hasAnyCapability(meCaps, [
    CAP.DEPLOYMENT_CREATE,
    CAP.DEPLOYMENT_MANAGE,
    CAP.SITE_DEPLOYMENT_CREATE,
  ])
  const canInterviewRead = hasAnyCapability(meCaps, [CAP.INTERVIEW_READ, CAP.INTERVIEW_CREATE, CAP.INTERVIEW_MANAGE])
  const canInterviewCreate = hasAnyCapability(meCaps, [CAP.INTERVIEW_CREATE])
  const canInterviewManage = hasAnyCapability(meCaps, [CAP.INTERVIEW_MANAGE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<HiringApplicationRow | null>(null)
  const [stages, setStages] = useState<PipelineStageRow[]>([])
  const [timeline, setTimeline] = useState<ApplicationStageHistoryBriefRow[]>([])
  const [resumes, setResumes] = useState<ResumeRow[]>([])
  const [offer, setOffer] = useState<OfferRow | null>(null)
  const [interviews, setInterviews] = useState<InterviewRow[]>([])
  const [feedbacks, setFeedbacks] = useState<InterviewFeedbackRow[]>([])
  const [interviewPlan, setInterviewPlan] = useState<InterviewPlanRow | null>(null)
  const [interviewsLoading, setInterviewsLoading] = useState(false)
  const [offerDrawerOpen, setOfferDrawerOpen] = useState(false)
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false)
  const [convertResult, setConvertResult] = useState<{
    employee: EmployeeRow
    deployment: SiteDeploymentRow
    created_employee: boolean
    created_deployment: boolean
  } | null>(null)
  const autoOpenedConvertRef = useRef(false)

  const [moveStageId, setMoveStageId] = useState('')
  const [moveStatus, setMoveStatus] = useState('')
  const [moveComment, setMoveComment] = useState('')
  const [moveBusy, setMoveBusy] = useState(false)
  const [moveError, setMoveError] = useState<string | null>(null)

  const loadApplication = useCallback(async () => {
    if (!Number.isFinite(appId) || appId < 1) return
    const app = await getHiringApplication(appId)
    setRow(app)
    const [st, rs, tl] = await Promise.all([
      listPipelineStages({}), 
      listResumes({ candidate: app.candidate }),
      getHiringApplicationTimeline(appId),
    ])
    setStages(st.items.sort((a, b) => a.order - b.order))
    setResumes(rs.items)
    setTimeline(tl)
    try {
      const offerRes = await listOffers({ hiring_application: appId })
      const matched = offerRes.items[0] ?? null
      setOffer(matched)
    } catch {
      setOffer(null)
    }
    if (app.interview_plan != null) {
      try {
        const plan = await getInterviewPlan(app.interview_plan)
        setInterviewPlan(plan)
      } catch {
        setInterviewPlan(null)
      }
    } else {
      setInterviewPlan(null)
    }
  }, [appId])

  const loadInterviews = useCallback(async () => {
    if (!Number.isFinite(appId) || appId < 1) return
    if (!canInterviewRead) {
      setInterviews([])
      setFeedbacks([])
      return
    }
    setInterviewsLoading(true)
    try {
      const ivRes = await listInterviews({ hiring_application: appId })
      setInterviews(ivRes.items)
      if (ivRes.items.length > 0) {
        const fbResults = await Promise.all(
          ivRes.items.map((iv) => listInterviewFeedback({ interview: iv.id }).catch(() => ({ items: [] }))),
        )
        setFeedbacks(fbResults.flatMap((r) => r.items))
      } else {
        setFeedbacks([])
      }
    } catch {
      setInterviews([])
      setFeedbacks([])
    } finally {
      setInterviewsLoading(false)
    }
  }, [appId, canInterviewRead])

  useEffect(() => {
    if (!Number.isFinite(appId) || appId < 1) {
      setError('Invalid application.')
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        await loadApplication()
        await loadInterviews()
      } catch (e: unknown) {
        if (!cancelled) setError(parseApiError(e, 'Could not load application').message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [appId, loadApplication, loadInterviews])

  useEffect(() => {
    if (autoOpenedConvertRef.current) return
    if (loading || !row) return
    if (searchParams.get('openConvert') !== '1') return
    const accepted =
      offer?.status === 'accepted' ||
      row.offer_status === 'accepted' ||
      row.status === 'offer_accepted'
    if (row.status === 'deployed' || !accepted || !canConvert) return
    autoOpenedConvertRef.current = true
    setConvertDrawerOpen(true)
  }, [loading, row, offer, searchParams, canConvert])

  async function submitMove() {
    if (!row) return
    setMoveBusy(true)
    setMoveError(null)
    const sid = moveStageId.trim() ? Number(moveStageId) : undefined
    const st = moveStatus.trim() || undefined
    if (!sid && !st) {
      setMoveError('Choose a pipeline stage and/or a status.')
      setMoveBusy(false)
      return
    }
    try {
      const updated = await moveHiringApplicationStage(row.id, {
        stage_id: sid,
        status: st ?? null,
        comment: moveComment.trim(),
      })
      setRow(updated)
      setMoveStageId('')
      setMoveStatus('')
      setMoveComment('')
      await loadApplication()
    } catch (e: unknown) {
      setMoveError(parseApiError(e, 'Could not move candidate').message)
    } finally {
      setMoveBusy(false)
    }
  }

  if (!Number.isFinite(appId) || appId < 1) return <ErrorState message="Invalid application id." />
  if (loading) return <Spinner label="Loading application…" />
  if (error) return <ErrorState message={error} />
  if (!row) return <EmptyState title="Application not found" description="It may have been removed." />

  const snapshotScorecard = row
    ? matchSnapshotToScorecard(row.match_snapshot, row.candidate_name, row.candidate_phone)
    : null

  // Lane-aware offer gate logic
  const needsClientReview = applicationRequiresClientReview(row)
  const clientApproved = row.client_decision === 'approved'
  const internalCleared = row.status === 'selected'
  // For billable: requires client approval; For non-billable: requires internal selection
  const readyForOffer = needsClientReview
    ? clientApproved || ['selected', 'offer_released', 'offer_accepted', 'offer_declined', 'deployed'].includes(row.status)
    : internalCleared || ['offer_released', 'offer_accepted', 'offer_declined', 'deployed'].includes(row.status)

  const candidateName = row.candidate_name ?? `Candidate #${row.candidate}`
  const initials = getInitials(candidateName)

  return (
    <div className="w-full space-y-6">
      {/* Back navigation */}
      <Link
        to="/hiring/applications"
        className="inline-flex items-center gap-2 text-sm font-medium text-app-secondary transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </Link>

      {/* Hero Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-semibold text-white">
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-app-heading">{candidateName}</h1>
              <Badge variant={statusVariant(row.status)}>
                {hiringApplicationStatusLabel(row.status)}
              </Badge>
              {hasLaneInfo(row) ? (
                <Badge variant={hiringLaneBadgeVariant(row)} className="text-[10px]">
                  {hiringLaneBadgeLabel(row)}
                </Badge>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-app-secondary">{row.job_role_name}</p>

            {/* Location info */}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-app-secondary">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {row.client_name || 'Client'}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {row.site_name || 'Site'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {row.current_stage_name || 'Pipeline Stage'}
              </span>
            </div>

            {/* Tags */}
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="neutral">MRF #{row.mrf}</Badge>
              {row.candidate_phone && <Badge variant="neutral">{row.candidate_phone}</Badge>}
            </div>
          </div>
        </div>

        {/* Quick link */}
        <Link
          to={`/candidates/${row.candidate}`}
          className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 text-sm font-medium text-app-text transition-colors hover:bg-app-muted"
        >
          <User className="h-4 w-4" />
          View Profile
        </Link>
      </div>

      {/* Journey */}
      <HiringApplicationJourney app={row} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - 2/3 width */}
        <div className="space-y-6 lg:col-span-2">
          {/* Demand */}
          <SectionCard
            icon={<Briefcase className="h-5 w-5 text-brand-600" />}
            iconBg="bg-brand-100 dark:bg-brand-900/40"
            title="Demand Details"
            subtitle="Hiring request information"
          >
            <div className="divide-y divide-app-border/50">
              <InfoRow label="Client" value={row.client_name?.trim()} />
              <InfoRow label="Site" value={row.site_name?.trim()} />
              <InfoRow label="Job Role" value={row.job_role_name?.trim()} />
              <InfoRow label="MRF Request" value={`#${row.mrf}`} mono />
            </div>
          </SectionCard>

          {/* Match Score */}
          <SectionCard
            icon={<Target className="h-5 w-5 text-status-info" />}
            iconBg="bg-status-info/10"
            title="Match Score"
            subtitle="Candidate-role compatibility"
          >
            {snapshotScorecard ? (
              <CandidateMatchScorecard data={snapshotScorecard} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-app-muted text-app-subtle">
                  <Target className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm text-app-secondary">No match scorecard captured</p>
              </div>
            )}
          </SectionCard>

          {/* Resumes */}
          <SectionCard
            icon={<FileText className="h-5 w-5 text-status-warning" />}
            iconBg="bg-status-warning/10"
            title="Resume Files"
            subtitle={`${resumes.length} document${resumes.length === 1 ? '' : 's'} on file`}
          >
            {resumes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-app-muted text-app-subtle">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm text-app-secondary">No resumes on file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 rounded-xl border border-app-border bg-app-muted/30 p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-muted text-app-secondary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-app-text">
                        {r.original_filename || `Resume #${r.id}`}
                      </p>
                      <Badge variant={resumeStatusVariant(r.status)} className="mt-1 text-[10px]">
                        {resumeStatusLabel(r.status)}
                      </Badge>
                    </div>
                    <ResumeFileActions resume={r} />
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Stage History */}
          <ApplicationTimeline applicationId={row.id} />

          {/* Interviews */}
          {canInterviewRead && (
            <InterviewPanel
              app={row}
              plan={interviewPlan}
              interviews={interviews}
              feedbacks={feedbacks}
              loading={interviewsLoading}
              canCreate={canInterviewCreate}
              canManage={canInterviewManage}
              onChanged={async () => {
                await loadApplication()
                await loadInterviews()
              }}
            />
          )}
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Offer Section */}
          {canOfferRead && (
            <SectionCard
              icon={<IndianRupee className="h-5 w-5 text-status-hired" />}
              iconBg="bg-status-hired/10"
              title="Offer"
              subtitle={offer ? `Status: ${offer.status}` : 'No offer yet'}
              action={
                (offer || readyForOffer) && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-h-9 gap-2 text-xs"
                    onClick={() => setOfferDrawerOpen(true)}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {offer ? 'Manage' : 'Create'}
                  </Button>
                )
              }
            >
              {!offer && !readyForOffer ? (
                <p className="text-sm text-app-secondary">
                  {needsClientReview
                    ? 'Client approval required before creating an offer.'
                    : 'Complete internal interview/selection clearance before creating an offer.'}
                </p>
              ) : offer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-app-subtle">Status</span>
                    <Badge variant={offerStatusVariant(offer.status)}>{offer.status}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-app-subtle">CTC</span>
                    <span className="text-lg font-bold text-app-heading">
                      {offer.offered_ctc != null ? `₹${Number(offer.offered_ctc).toLocaleString('en-IN')}` : '—'}
                    </span>
                  </div>
                  {offer.joining_date && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-subtle">Joining</span>
                      <span className="text-sm font-medium text-app-text">
                        {new Date(offer.joining_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {offer.released_by_username && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-app-subtle">Released by</span>
                      <span className="text-sm text-app-text">{offer.released_by_username}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-app-secondary">
                  {canOfferCreate ? 'No offer created yet.' : 'No offer on record.'}
                </p>
              )}
            </SectionCard>
          )}

          {/* Deployment */}
          <DeploymentPanel
            application={row}
            offer={offer}
            canConvert={canConvert}
            convertResult={convertResult}
            onOpenConvert={() => setConvertDrawerOpen(true)}
          />

          {/* Admin Correction */}
          {canMove && (
            <SectionCard
              icon={<Settings className="h-5 w-5 text-app-secondary" />}
              iconBg="bg-app-muted"
              title="Admin Correction"
              subtitle="Manual stage override"
            >
              {moveError && <ErrorState message={moveError} />}
              <div className="space-y-3">
                <Select
                  id="mv_stage"
                  label="Pipeline stage"
                  value={moveStageId}
                  onChange={(e) => setMoveStageId(e.target.value)}
                >
                  <option value="">Keep current</option>
                  {stages.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <Select
                  id="mv_status"
                  label="Status"
                  value={moveStatus}
                  onChange={(e) => setMoveStatus(e.target.value)}
                >
                  <option value="">Keep current</option>
                  {HIRING_APPLICATION_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <Input
                  id="mv_comment"
                  label="Comment"
                  value={moveComment}
                  onChange={(e) => setMoveComment(e.target.value)}
                  placeholder="Reason for override..."
                />
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => void submitMove()}
                  disabled={moveBusy}
                >
                  {moveBusy ? 'Saving…' : 'Apply Move'}
                </Button>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <OfferFormDrawer
        open={offerDrawerOpen}
        onClose={() => setOfferDrawerOpen(false)}
        applicationId={appId}
        offer={offer}
        defaultCtc={row?.mrf_budget_max}
        onSuccess={(updated) => {
          setOffer(updated)
          setRow((prev) =>
            prev
              ? {
                  ...prev,
                  offer_status: updated.status,
                  offered_ctc: updated.offered_ctc != null ? String(updated.offered_ctc) : null,
                  offer_joining_date: updated.joining_date ?? null,
                }
              : prev,
          )
          setOfferDrawerOpen(false)
          void loadApplication()
        }}
      />

      <ConvertToDeploymentDrawer
        open={convertDrawerOpen}
        application={row!}
        offer={offer}
        onClose={() => setConvertDrawerOpen(false)}
        onSuccess={(result) => {
          setConvertResult(result)
          setRow((prev) => (prev ? { ...prev, status: 'deployed' } : prev))
          setConvertDrawerOpen(false)
          const next = new URLSearchParams(searchParams)
          if (next.has('openConvert')) {
            next.delete('openConvert')
            setSearchParams(next, { replace: true })
          }
        }}
      />
    </div>
  )
}

// ─── Deployment panel ─────────────────────────────────────────────────────────

function isOfferAccepted(application: HiringApplicationRow, offer: OfferRow | null): boolean {
  if (offer?.status === 'accepted') return true
  return application.offer_status === 'accepted' || application.status === 'offer_accepted'
}

function DeploymentPanel({
  application,
  offer,
  canConvert,
  convertResult,
  onOpenConvert,
}: {
  application: HiringApplicationRow
  offer: OfferRow | null
  canConvert: boolean
  convertResult: {
    employee: EmployeeRow
    deployment: SiteDeploymentRow
    created_employee: boolean
    created_deployment: boolean
  } | null
  onOpenConvert: () => void
}) {
  const alreadyDeployed = application.status === 'deployed'
  const accepted = isOfferAccepted(application, offer)

  return (
    <SectionCard
      icon={<Users className="h-5 w-5 text-status-info" />}
      iconBg="bg-status-info/10"
      title="Deployment"
      subtitle={alreadyDeployed ? 'Employee deployed' : 'Convert to employee'}
      action={alreadyDeployed && <Badge variant="success">Deployed</Badge>}
    >
      {convertResult ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-status-hired/10 p-3">
            <CheckCircle2 className="h-5 w-5 text-status-hired" />
            <div>
              <p className="text-sm font-medium text-status-hired">
                {convertResult.created_employee ? 'Employee created' : 'Employee linked'}
              </p>
              <p className="text-xs text-app-secondary">
                {convertResult.created_deployment ? 'Deployment created' : 'Existing deployment'}
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-app-subtle">Employee</span>
              <span className="font-medium text-app-text">
                {convertResult.employee.full_name ??
                  `${convertResult.employee.first_name} ${convertResult.employee.last_name}`.trim()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-app-subtle">Code</span>
              <span className="font-mono text-xs text-app-text">{convertResult.employee.employee_code}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              to={`/deployment/site-deployments?employee=${convertResult.employee.id}`}
              className="flex-1 inline-flex min-h-9 items-center justify-center rounded-lg border border-app-border bg-app-surface text-xs font-medium text-app-text hover:bg-app-muted"
            >
              Deployments
            </Link>
            <Link
              to="/deployment/employees"
              className="flex-1 inline-flex min-h-9 items-center justify-center rounded-lg border border-app-border bg-app-surface text-xs font-medium text-app-text hover:bg-app-muted"
            >
              Employees
            </Link>
          </div>
        </div>
      ) : alreadyDeployed ? (
        <div className="text-center">
          <p className="text-sm text-app-secondary">Already converted to deployment</p>
          <Link to="/deployment/employees" className="mt-2 inline-block text-sm text-brand-600 underline">
            View employees
          </Link>
        </div>
      ) : !offer ? (
        <p className="text-sm text-app-secondary">Create and release an offer first.</p>
      ) : !accepted ? (
        <p className="text-sm text-app-secondary">
          Offer must be accepted. Current: <span className="font-medium">{offer.status}</span>
        </p>
      ) : !canConvert ? (
        <p className="text-sm text-app-secondary">No permission to convert.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-app-secondary">Offer accepted. Ready to deploy.</p>
          <Button type="button" className="w-full gap-2" onClick={onOpenConvert}>
            <Users className="h-4 w-4" />
            Convert to Deployment
          </Button>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Convert drawer ───────────────────────────────────────────────────────────

function ConvertToDeploymentDrawer({
  open,
  application,
  offer,
  onClose,
  onSuccess,
}: {
  open: boolean
  application: HiringApplicationRow
  offer: OfferRow | null
  onClose: () => void
  onSuccess: (result: {
    employee: EmployeeRow
    deployment: SiteDeploymentRow
    created_employee: boolean
    created_deployment: boolean
  }) => void
}) {
  const [employeeCode, setEmployeeCode] = useState('')
  const [joinedOn, setJoinedOn] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deploymentStatus, setDeploymentStatus] = useState<'planned' | 'active'>('planned')
  const [shiftHours, setShiftHours] = useState('')
  const [billingType, setBillingType] = useState<'' | 'billable' | 'non_billable'>('')
  const [allowExisting, setAllowExisting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setEmployeeCode('')
      setJoinedOn(offer?.joining_date ?? '')
      setStartDate(offer?.joining_date ?? '')
      setDeploymentStatus('planned')
      setShiftHours('')
      setBillingType('')
      setAllowExisting(false)
      setError(null)
    }
  }, [open, offer])

  async function handleSubmit() {
    setBusy(true)
    setError(null)
    try {
      const effectiveBillingType = billingType || application.billing_type
      const res: HiringDeploymentConversionResult = await convertApplicationToDeployment(application.id, {
        employee_code: effectiveBillingType === 'non_billable' ? null : (employeeCode.trim() || null),
        joined_on: joinedOn || null,
        deployment_start_date: startDate || null,
        deployment_status: deploymentStatus,
        shift_hours: shiftHours.trim() || null,
        billing_type: billingType || null,
        allow_existing_employee: allowExisting,
      })
      const emp = res.employee as EmployeeRow
      const dep = res.deployment as SiteDeploymentRow
      onSuccess({
        employee: emp,
        deployment: dep,
        created_employee: res.created_employee,
        created_deployment: res.created_deployment,
      })
    } catch (e: unknown) {
      setError(parseApiError(e, 'Could not convert application').message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={() => !busy && onClose()}
      title="Convert to Deployment"
      description="Create employee record and site deployment"
      footer={
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" className="min-h-10" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" className="min-h-10 gap-2" disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? 'Converting…' : 'Convert'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          id="cd_emp_code"
          label="Employee code"
          placeholder={
            (billingType || application.billing_type) === 'non_billable'
              ? 'Auto-generated for internal employees'
              : 'Auto-generated if blank'
          }
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value)}
          disabled={(billingType || application.billing_type) === 'non_billable'}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cd_joined_on" className="text-sm font-medium text-app-secondary">
              Joined on
            </label>
            <input
              id="cd_joined_on"
              type="date"
              value={joinedOn}
              onChange={(e) => setJoinedOn(e.target.value)}
              className="min-h-10 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cd_start_date" className="text-sm font-medium text-app-secondary">
              Deployment start
            </label>
            <input
              id="cd_start_date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="min-h-10 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="cd_status"
            label="Initial status"
            value={deploymentStatus}
            onChange={(e) => setDeploymentStatus(e.target.value === 'active' ? 'active' : 'planned')}
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
          </Select>
          <Select
            id="cd_billing"
            label="Billing type"
            value={billingType}
            onChange={(e) => setBillingType((e.target.value as 'billable' | 'non_billable' | '') || '')}
          >
            <option value="">Use MRF default</option>
            <option value="billable">Billable</option>
            <option value="non_billable">Non-billable</option>
          </Select>
        </div>
        <Input
          id="cd_shift"
          label="Shift hours"
          type="number"
          step="0.1"
          min="0"
          value={shiftHours}
          onChange={(e) => setShiftHours(e.target.value)}
          placeholder="e.g. 8"
        />
        <label className="flex items-start gap-3 rounded-xl border border-app-border bg-app-muted/30 p-4">
          <input
            type="checkbox"
            checked={allowExisting}
            onChange={(e) => setAllowExisting(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-app-border"
          />
          <div>
            <span className="text-sm font-medium text-app-text">Reuse existing employee</span>
            <p className="text-xs text-app-subtle">Match by code or phone if exists</p>
          </div>
        </label>
        {error && <ErrorState message={error} />}
      </div>
    </Drawer>
  )
}
