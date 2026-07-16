import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Plus } from 'lucide-react'
import {
  approveSalesRoleRequirement,
  convertProposalToMobilisation,
  createSalesLeadSite,
  createSalesRoleRequirement,
  deleteSalesDocument,
  deleteSalesRoleRequirement,
  generateProposalForLead,
  getSalesLead,
  listEligibleOperationsOwnersForLead,
  listProposalVersions,
  listSalesActivities,
  listSalesDocuments,
  listSalesLeadSites,
  listSalesRoleRequirements,
  listSiteSurveys,
  seedSiteSurveyDefaultLines,
  submitLeadToOperations,
  updateSalesLeadSite,
  updateSalesRoleRequirement,
  uploadSalesDocument,
} from '@/api/sales'
import { listLocationAreas, type LocationAreaRow } from '@/api/wages'
import type { UserRow } from '@/api/users'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import {
  LEAD_TYPE_LABELS,
  formatDateTime,
  formatShortDate,
  leadTypeVariant,
  proposalStatusLabel,
  proposalStatusVariant,
  stageAtLeast,
  stageLabel,
  stageVariant,
  surveyStatusLabel,
  surveyStatusVariant,
} from '@/features/sales/salesUtils'
import { SalesLeadFormDrawer } from '@/features/sales/SalesLeadFormDrawer'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type {
  ProposalVersion,
  SalesActivity,
  SalesDocument,
  SalesDocumentWriteInput,
  SalesLead,
  SalesLeadSite,
  SalesLeadSiteWriteInput,
  SalesRoleRequirement,
  SalesRoleRequirementWriteInput,
  SiteSurvey,
} from '@/types/sales'

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabId = 'overview' | 'sites' | 'surveys' | 'role-requirements' | 'proposals' | 'activity' | 'documents'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'sites', label: 'Sites' },
  { id: 'surveys', label: 'Surveys' },
  { id: 'role-requirements', label: 'Role requirements' },
  { id: 'proposals', label: 'Proposals' },
  { id: 'activity', label: 'Activity' },
  { id: 'documents', label: 'Documents' },
]

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPPER_STEPS: { label: string; stages: string[] }[] = [
  { label: 'Lead', stages: ['draft'] },
  { label: 'Sites', stages: [] },
  { label: 'Ops survey', stages: ['submitted_to_operations', 'site_survey_in_progress'] },
  { label: 'Completed', stages: ['site_survey_completed'] },
  { label: 'Proposal', stages: ['budget_generated', 'sales_review'] },
  { label: 'Approval', stages: ['internal_approval', 'internally_approved'] },
  { label: 'Client', stages: ['sent_to_client', 'client_negotiation', 'client_revision_required', 'client_rejected', 'client_approved'] },
  { label: 'Won / Lost', stages: ['won', 'lost', 'closed'] },
]

function currentStepIdx(stage: string): number {
  for (let i = STEPPER_STEPS.length - 1; i >= 0; i--) {
    if (STEPPER_STEPS[i]?.stages.includes(stage)) return i
  }
  return 0
}

function tabLocked(tabId: TabId, stage: string): string | null {
  if (tabId === 'surveys') {
    return stageAtLeast(stage, 'submitted_to_operations') ? null : 'Available after submitting to operations'
  }
  if (tabId === 'role-requirements') {
    return stageAtLeast(stage, 'site_survey_completed') ? null : 'Available after survey completion'
  }
  if (tabId === 'proposals') {
    return stageAtLeast(stage, 'budget_generated') ? null : 'Available after survey is reviewed'
  }
  return null
}

function LeadStepper({ stage }: { stage: string }) {
  const activeIdx = currentStepIdx(stage)
  return (
    <div className="flex items-start w-full py-2">
      {STEPPER_STEPS.map((step, idx) => {
        const done = idx < activeIdx
        const active = idx === activeIdx
        const isLast = idx === STEPPER_STEPS.length - 1
        return (
          <div key={step.label} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
            <div className="flex flex-col items-center shrink-0">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                done ? 'border-brand-600 bg-brand-600 text-white' :
                active ? 'border-brand-600 bg-white text-brand-600' :
                'border-app-border bg-app-muted text-app-subtle'
              }`}>
                {done
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <span className="text-xs font-semibold">{idx + 1}</span>}
              </div>
              <span className={`mt-1.5 text-[11px] font-medium whitespace-nowrap ${active ? 'text-brand-600' : done ? 'text-app-text' : 'text-app-subtle'}`}>
                {step.label}
              </span>
            </div>
            {!isLast ? (
              <div className={`flex-1 mx-2 mt-4 h-0.5 min-w-4 ${idx < activeIdx ? 'bg-brand-600' : 'bg-app-border'}`} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// ─── Site form drawer ─────────────────────────────────────────────────────────

function SiteFormDrawer({
  open,
  leadId,
  initialSite,
  onClose,
  onSaved,
}: {
  open: boolean
  leadId: number
  initialSite: SalesLeadSite | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = initialSite != null
  const FORM_ID = `site-form-${leadId}`

  const [siteName, setSiteName] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [locationArea, setLocationArea] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [notes, setNotes] = useState('')

  const [locationAreas, setLocationAreas] = useState<LocationAreaRow[]>([])
  const [locationsLoading, setLocationsLoading] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const initialized = useRef(false)

  useEffect(() => {
    if (!open) { initialized.current = false; return }
    if (initialized.current) return
    initialized.current = true
    if (initialSite) {
      setSiteName(initialSite.site_name)
      setAddress(initialSite.site_address ?? '')
      setCity(initialSite.city ?? '')
      setState(initialSite.state ?? '')
      setLocationArea(initialSite.location_area != null ? String(initialSite.location_area) : '')
      setIsActive(initialSite.is_active !== false)
      setNotes(initialSite.remarks ?? '')
    } else {
      setSiteName('')
      setAddress('')
      setCity('')
      setState('')
      setLocationArea('')
      setIsActive(true)
      setNotes('')
    }
    setError(null)
    setFieldErrors({})
  }, [open, initialSite])

  useEffect(() => {
    if (!open) return
    setLocationsLoading(true)
    listLocationAreas({ is_active: true, page: 1 })
      .then((res) => setLocationAreas(res.items))
      .catch(() => setLocationAreas([]))
      .finally(() => setLocationsLoading(false))
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!siteName.trim()) {
      setFieldErrors({ site_name: 'Site name is required.' })
      return
    }
    const payload: SalesLeadSiteWriteInput = {
      lead: leadId,
      site_name: siteName.trim(),
      site_address: address.trim() || undefined,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      location_area: locationArea ? Number(locationArea) : null,
      is_active: isActive,
      remarks: notes.trim() || undefined,
    }
    setSubmitting(true)
    try {
      if (isEdit && initialSite) {
        await updateSalesLeadSite(initialSite.id, payload)
      } else {
        await createSalesLeadSite(payload)
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      const parsed = parseApiError(e, 'Save failed')
      setError(parsed.message)
      setFieldErrors(parsed.fields)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      title={isEdit ? 'Edit site' : 'Add site'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form={FORM_ID} disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Add site'}
          </Button>
        </div>
      }
    >
      <form id={FORM_ID} onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? (
          <p className="rounded-panel bg-status-danger/8 px-4 py-3 text-sm text-status-danger" role="alert">{error}</p>
        ) : null}
        <Input id="site-name" label="Site name *" value={siteName} onChange={(e) => setSiteName(e.target.value)} error={fieldErrors.site_name} />
        <Input id="site-address" label="Address" value={address} onChange={(e) => setAddress(e.target.value)} error={fieldErrors.site_address} />
        <Input id="site-city" label="City" value={city} onChange={(e) => setCity(e.target.value)} error={fieldErrors.city} />
        <Input id="site-state" label="State" value={state} onChange={(e) => setState(e.target.value)} error={fieldErrors.state} />
        <Select
          id="site-location-area"
          label="Location area"
          value={locationArea}
          onChange={(e) => setLocationArea(e.target.value)}
          disabled={locationsLoading}
          error={fieldErrors.location_area}
        >
          <option value="">{locationsLoading ? 'Loading...' : 'No location selected'}</option>
          {locationAreas.map((area) => (
            <option key={area.id} value={String(area.id)}>
              {area.name} ({area.area_type})
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 rounded-panel border border-app-border bg-app-muted/30 p-3 text-sm text-app-text">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-app-border"
          />
          Active site
        </label>
        <div className="flex flex-col gap-1">
          <label htmlFor="site-notes" className="text-sm font-medium text-app-secondary">Remarks</label>
          <textarea
            id="site-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          {fieldErrors.remarks ? <p className="text-sm text-status-danger">{fieldErrors.remarks}</p> : null}
        </div>
      </form>
    </Drawer>
  )
}

// ─── Overview tab ─────────────────────────────────────────────────────────────

const JOURNEY_STEPS = [
  { key: 'sites', label: 'Add sites', desc: 'Register the locations this lead covers', unlockStage: 'draft' },
  { key: 'submit', label: 'Submit to operations', desc: 'Hand off to operations team for site survey', unlockStage: 'draft' },
  { key: 'survey', label: 'Complete site survey', desc: 'Operations gathers on-site requirements', unlockStage: 'submitted_to_operations' },
  { key: 'roles', label: 'Review role requirements', desc: 'Verify manpower needs from survey data', unlockStage: 'site_survey_completed' },
  { key: 'proposal', label: 'Generate proposal', desc: 'Build a proposal from role requirements', unlockStage: 'site_survey_completed' },
  { key: 'approval', label: 'Internal approval', desc: 'Get proposal approved internally', unlockStage: 'budget_generated' },
  { key: 'client', label: 'Client response', desc: 'Send to client and await response', unlockStage: 'internally_approved' },
  { key: 'mobilise', label: 'Convert to mobilisation', desc: 'Trigger mobilisation after approval', unlockStage: 'client_approved' },
]

function OverviewTab({ lead }: { lead: SalesLead }) {
  const stage = lead.current_stage

  // Determine which steps are done, current, or future
  function stepStatus(step: typeof JOURNEY_STEPS[0]): 'done' | 'current' | 'future' {
    // Simple heuristic based on stage progression
    if (step.key === 'sites') return stageAtLeast(stage, 'submitted_to_operations') ? 'done' : 'current'
    if (step.key === 'submit') return stageAtLeast(stage, 'submitted_to_operations') ? 'done' : stageAtLeast(stage, 'draft') ? 'current' : 'future'
    if (step.key === 'survey') return stageAtLeast(stage, 'site_survey_completed') ? 'done' : stageAtLeast(stage, 'submitted_to_operations') ? 'current' : 'future'
    if (step.key === 'roles') return stageAtLeast(stage, 'budget_generated') ? 'done' : stageAtLeast(stage, 'site_survey_completed') ? 'current' : 'future'
    if (step.key === 'proposal') return stageAtLeast(stage, 'budget_generated') ? 'done' : stageAtLeast(stage, 'site_survey_completed') ? 'current' : 'future'
    if (step.key === 'approval') return stageAtLeast(stage, 'internally_approved') ? 'done' : stageAtLeast(stage, 'budget_generated') ? 'current' : 'future'
    if (step.key === 'client') return stageAtLeast(stage, 'client_approved') ? 'done' : stageAtLeast(stage, 'sent_to_client') ? 'current' : 'future'
    if (step.key === 'mobilise') return stageAtLeast(stage, 'won') ? 'done' : stageAtLeast(stage, 'client_approved') ? 'current' : 'future'
    return 'future'
  }

  return (
    <div className="space-y-6">
      {/* Key fields grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Lead type', value: <Badge variant={leadTypeVariant(lead.lead_type)}>{LEAD_TYPE_LABELS[lead.lead_type]}</Badge> },
          { label: 'Stage', value: <Badge variant={stageVariant(lead.current_stage)}>{stageLabel(lead.current_stage)}</Badge> },
          { label: 'Client', value: lead.client_name },
          { label: 'Existing account', value: lead.existing_client_name ?? (lead.existing_client != null ? `#${lead.existing_client}` : '—') },
          { label: 'Sales owner', value: lead.sales_person_name ?? (lead.sales_person != null ? `#${lead.sales_person}` : '—') },
          { label: 'Created', value: formatDateTime(lead.created_at) },
          { label: 'Last updated', value: formatDateTime(lead.updated_at) },
        ].map((f) => (
          <div key={f.label} className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">{f.label}</p>
            {typeof f.value === 'string' ? (
              <p className="text-sm text-app-text">{f.value || '—'}</p>
            ) : (
              f.value
            )}
          </div>
        ))}
      </div>

      {/* Notes */}
      {lead.sales_remarks ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">Notes</p>
          <p className="whitespace-pre-wrap text-sm text-app-text">{lead.sales_remarks}</p>
        </div>
      ) : null}

      {/* Journey progress */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-app-subtle">Journey progress</p>
        <ol className="space-y-0">
          {JOURNEY_STEPS.map((step, idx) => {
            const status = stepStatus(step)
            return (
              <li key={step.key} className="flex items-start gap-3">
                {/* Vertical line + circle */}
                <div className="flex flex-col items-center">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 shrink-0 ${
                    status === 'done' ? 'border-brand-600 bg-brand-600 text-white' :
                    status === 'current' ? 'border-brand-600 bg-white text-brand-600' :
                    'border-app-border bg-app-muted text-app-subtle'
                  }`}>
                    {status === 'done' ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <span className="text-[10px] font-bold">{idx + 1}</span>
                    )}
                  </div>
                  {idx < JOURNEY_STEPS.length - 1 ? (
                    <div className={`w-0.5 h-6 ${status === 'done' ? 'bg-brand-600' : 'bg-app-border'}`} />
                  ) : null}
                </div>
                {/* Content */}
                <div className={`pb-4 ${status === 'future' ? 'opacity-50' : ''}`}>
                  <p className={`text-sm font-medium ${status === 'current' ? 'text-brand-600' : 'text-app-text'}`}>
                    {step.label}
                    {status === 'done' ? <span className="ml-2 text-xs text-status-success">Done</span> : null}
                    {status === 'current' ? <span className="ml-2 text-xs text-brand-600">Current</span> : null}
                  </p>
                  <p className="text-xs text-app-secondary">{step.desc}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

// ─── Sites tab ────────────────────────────────────────────────────────────────

function SitesTab({
  leadId,
  canEdit,
  onSitesChanged,
}: {
  leadId: number
  canEdit: boolean
  onSitesChanged?: (sites: SalesLeadSite[]) => void
}) {
  const [sites, setSites] = useState<SalesLeadSite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [siteDrawerOpen, setSiteDrawerOpen] = useState(false)
  const [editingSite, setEditingSite] = useState<SalesLeadSite | null>(null)

  async function load(): Promise<SalesLeadSite[]> {
    setLoading(true)
    setError(null)
    try {
      const res = await listSalesLeadSites({ lead: leadId })
      setSites(res.items)
      return res.items
    } catch (e: unknown) {
      setError(parseApiError(e, 'Failed to load sites').message)
      return []
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [leadId])

  if (loading) return <Spinner label="Loading sites..." />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingSite(null); setSiteDrawerOpen(true) }} className="gap-1">
            <Plus className="h-4 w-4" />
            Add site
          </Button>
        </div>
      ) : null}

      {sites.length === 0 ? (
        <EmptyState
          title="No sites added"
          description={canEdit ? 'Add the locations this lead covers.' : undefined}
        />
      ) : (
        <>
          {/* Mobile */}
          <div className="grid gap-3 md:hidden">
            {sites.map((s) => (
              <div key={s.id} className="rounded-panel border border-app-border bg-app-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-app-text">{s.site_name}</p>
                  {canEdit ? (
                    <Button variant="secondary" className="min-h-8 px-3 text-xs" onClick={() => { setEditingSite(s); setSiteDrawerOpen(true) }}>Edit</Button>
                  ) : null}
                </div>
                {s.site_address ? <p className="mt-1 text-xs text-app-secondary">{s.site_address}</p> : null}
                {s.city || s.state ? <p className="text-xs text-app-subtle">{[s.city, s.state].filter(Boolean).join(', ')}</p> : null}
                {s.is_active === false ? <Badge variant="neutral" className="mt-2">Inactive</Badge> : null}
                {s.remarks ? <p className="mt-1 text-xs italic text-app-subtle">{s.remarks}</p> : null}
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Site name</TH>
                  <TH>Address</TH>
                  <TH>City</TH>
                  <TH>State</TH>
                  <TH>Status</TH>
                  <TH>Remarks</TH>
                  {canEdit ? <TH className="text-right">Actions</TH> : null}
                </TR>
              </THead>
              <TBody>
                {sites.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-medium">{s.site_name}</TD>
                    <TD className="text-app-secondary">{s.site_address || '-'}</TD>
                    <TD className="text-app-secondary">{s.city || '-'}</TD>
                    <TD className="text-app-secondary">{s.state || '-'}</TD>
                    <TD>
                      <Badge variant={s.is_active === false ? 'neutral' : 'success'}>
                        {s.is_active === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </TD>
                    <TD className="text-app-secondary">{s.remarks || '-'}</TD>
                    {canEdit ? (
                      <TD className="text-right">
                        <Button variant="secondary" className="min-h-8 px-3 text-xs" onClick={() => { setEditingSite(s); setSiteDrawerOpen(true) }}>Edit</Button>
                      </TD>
                    ) : null}
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </>
      )}

      <SiteFormDrawer
        open={siteDrawerOpen}
        leadId={leadId}
        initialSite={editingSite}
        onClose={() => setSiteDrawerOpen(false)}
        onSaved={() => {
          void (async () => {
            const nextSites = await load()
            onSitesChanged?.(nextSites)
          })()
        }}
      />
    </div>
  )
}

// ─── Surveys tab ──────────────────────────────────────────────────────────────

function SurveysTab({
  leadId,
  canEdit,
}: {
  leadId: number
  canEdit: boolean
}) {
  const navigate = useNavigate()
  const [surveys, setSurveys] = useState<SiteSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [seedingId, setSeedingId] = useState<number | null>(null)
  const [seedError, setSeedError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await listSiteSurveys({ lead: leadId })
      setSurveys(res.items)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Failed to load surveys').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [leadId])

  async function handleSeed(surveyId: number) {
    setSeedingId(surveyId)
    setSeedError(null)
    try {
      await seedSiteSurveyDefaultLines(surveyId)
      navigate(`/sales/surveys/${surveyId}`)
    } catch (e: unknown) {
      setSeedError(parseApiError(e, 'Seed failed').message)
    } finally {
      setSeedingId(null)
    }
  }

  if (loading) return <Spinner label="Loading surveys…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      {seedError ? (
        <p className="rounded-panel bg-status-danger/8 px-4 py-2 text-sm text-status-danger">{seedError}</p>
      ) : null}
      {surveys.length === 0 ? (
        <EmptyState
          title="No surveys"
          description="Site surveys will appear here once created."
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {surveys.map((s) => (
              <div key={s.id} className="rounded-panel border border-app-border bg-app-surface p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Badge variant={surveyStatusVariant(s.status)}>{surveyStatusLabel(s.status)}</Badge>
                    <p className="text-xs text-app-secondary">
                      {s.assigned_to_name ?? (s.assigned_to != null ? `#${s.assigned_to}` : 'Unassigned')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" className="min-h-8 px-2 text-xs" onClick={() => navigate(`/sales/surveys/${s.id}`)}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {s.survey_date ? <p className="text-xs text-app-subtle">Survey date: {formatShortDate(s.survey_date)}</p> : null}
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Status</TH>
                  <TH>Assigned to</TH>
                  <TH>Survey date</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {surveys.map((s) => (
                  <TR key={s.id}>
                    <TD className="font-mono text-xs text-app-secondary">#{s.id}</TD>
                    <TD><Badge variant={surveyStatusVariant(s.status)}>{surveyStatusLabel(s.status)}</Badge></TD>
                    <TD className="text-app-secondary">
                      {s.assigned_to_name ?? (s.assigned_to != null ? `#${s.assigned_to}` : '—')}
                    </TD>
                    <TD className="text-app-secondary">{formatShortDate(s.survey_date)}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" className="min-h-8 px-3 text-xs" onClick={() => navigate(`/sales/surveys/${s.id}`)}>
                          Open
                        </Button>
                        {canEdit ? (
                          <Button
                            variant="secondary"
                            className="min-h-8 px-3 text-xs"
                            disabled={seedingId === s.id}
                            onClick={() => void handleSeed(s.id)}
                          >
                            {seedingId === s.id ? 'Seeding…' : 'Seed defaults'}
                          </Button>
                        ) : null}
                      </div>
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

// ─── Proposals tab ────────────────────────────────────────────────────────────

function ProposalsTab({ leadId }: { leadId: number }) {
  const navigate = useNavigate()
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canManage = hasAnyCapability(meCaps, [CAP.SALES_PROPOSAL_MANAGE])

  const [proposals, setProposals] = useState<ProposalVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [convertBusy, setConvertBusy] = useState<number | null>(null)
  const [convertError, setConvertError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await listProposalVersions({ lead: leadId })
      setProposals(res.items)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Failed to load proposals').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [leadId])

  async function handleConvert(proposalId: number) {
    setConvertBusy(proposalId)
    setConvertError(null)
    try {
      const result = await convertProposalToMobilisation(proposalId)
      navigate(`/mobilisation/${result.id}`)
    } catch (e: unknown) {
      setConvertError(parseApiError(e, 'Conversion failed').message)
      setConvertBusy(null)
    }
  }

  if (loading) return <Spinner label="Loading proposals…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      {convertError ? (
        <p className="rounded-panel bg-status-danger/8 px-4 py-2 text-sm text-status-danger">{convertError}</p>
      ) : null}

      {proposals.length === 0 ? (
        <EmptyState
          title="No proposals"
          description="Proposals for this lead will appear here."
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {proposals.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate(`/sales/proposals/${p.id}`)}
                className="w-full rounded-panel border border-app-border bg-app-surface p-4 text-left hover:bg-app-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-app-text">v{p.version_number}</p>
                  <Badge variant={proposalStatusVariant(p.status)}>{proposalStatusLabel(p.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-app-subtle">{formatShortDate(p.updated_at)}</p>
              </button>
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <THead>
                <TR>
                  <TH>Version</TH>
                  <TH>Status</TH>
                  <TH>Valid from</TH>
                  <TH>Valid to</TH>
                  <TH>Updated</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {proposals.map((p) => (
                  <TR
                    key={p.id}
                    className="cursor-pointer hover:bg-app-muted"
                    onClick={() => navigate(`/sales/proposals/${p.id}`)}
                  >
                    <TD className="font-medium">v{p.version_number}</TD>
                    <TD><Badge variant={proposalStatusVariant(p.status)}>{proposalStatusLabel(p.status)}</Badge></TD>
                    <TD className="text-app-secondary">{formatShortDate(p.valid_from)}</TD>
                    <TD className="text-app-secondary">{formatShortDate(p.valid_to)}</TD>
                    <TD className="text-app-secondary">{formatShortDate(p.updated_at)}</TD>
                    <TD className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {canManage && p.client_approval_status === 'approved' ? (
                          <Button
                            variant="secondary"
                            className="min-h-8 px-3 text-xs"
                            disabled={convertBusy !== null}
                            onClick={() => void handleConvert(p.id)}
                          >
                            {convertBusy === p.id ? 'Converting…' : 'Convert to mobilisation'}
                          </Button>
                        ) : null}
                        <Button variant="ghost" className="min-h-8 px-3 text-xs" onClick={() => navigate(`/sales/proposals/${p.id}`)}>
                          Open
                        </Button>
                      </div>
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

// ─── Role requirements helpers ────────────────────────────────────────────────

const BLANK_RR: SalesRoleRequirementWriteInput = {
  lead: 0,
  survey: null,
  site: null,
  job_role: null,
  wage_category: null,
  service_category: '',
  manpower_count: 1,
  shift_hours: null,
  working_days: null,
  remarks: '',
  is_active: true,
  created_from_survey: false,
}

function rrFromRow(r: SalesRoleRequirement, leadId: number): SalesRoleRequirementWriteInput {
  return {
    lead: leadId,
    survey: r.survey ?? null,
    site: r.site ?? null,
    job_role: r.job_role ?? null,
    wage_category: r.wage_category ?? null,
    service_category: r.service_category ?? '',
    manpower_count: r.manpower_count,
    shift_hours: r.shift_hours ?? null,
    working_days: r.working_days ?? null,
    remarks: r.remarks ?? '',
    is_active: r.is_active ?? true,
    created_from_survey: r.created_from_survey ?? false,
  }
}

function RoleRequirementDrawer({
  open,
  leadId,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  leadId: number
  editing: SalesRoleRequirement | null
  onClose: () => void
  onSaved: (r: SalesRoleRequirement) => void
}) {
  const [form, setForm] = useState<SalesRoleRequirementWriteInput>({ ...BLANK_RR, lead: leadId })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm(editing ? rrFromRow(editing, leadId) : { ...BLANK_RR, lead: leadId })
    setError(null)
  }, [open, editing, leadId])

  function set<K extends keyof SalesRoleRequirementWriteInput>(k: K, v: SalesRoleRequirementWriteInput[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.manpower_count < 1) { setError('Headcount must be at least 1.'); return }
    setSaving(true)
    setError(null)
    try {
      const saved = editing
        ? await updateSalesRoleRequirement(editing.id, form)
        : await createSalesRoleRequirement(form)
      onSaved(saved)
    } catch (err) {
      setError(parseApiError(err, 'Save failed').message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      title={editing ? 'Edit role requirement' : 'Add role requirement'}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="rr-form" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add'}
          </Button>
        </div>
      }
    >
      <form id="rr-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? <p className="rounded-panel bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{error}</p> : null}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-secondary">Job role ID</label>
            <input
              type="number"
              min="1"
              value={form.job_role ?? ''}
              onChange={(e) => set('job_role', e.target.value ? Number(e.target.value) : null)}
              className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="e.g. 12"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-secondary">Wage category ID</label>
            <input
              type="number"
              min="1"
              value={form.wage_category ?? ''}
              onChange={(e) => set('wage_category', e.target.value ? Number(e.target.value) : null)}
              className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="rr-headcount"
            label="Headcount *"
            type="number"
            min="1"
            value={String(form.manpower_count)}
            onChange={(e) => set('manpower_count', Number(e.target.value) || 1)}
          />
          <Input
            id="rr-service-category"
            label="Service category"
            value={form.service_category ?? ''}
            onChange={(e) => set('service_category', e.target.value)}
            placeholder="e.g. Housekeeping"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="rr-shift"
            label="Shift hours"
            type="number"
            step="0.01"
            min="0"
            value={form.shift_hours ?? ''}
            onChange={(e) => set('shift_hours', e.target.value || null)}
            placeholder="e.g. 8"
          />
          <Input
            id="rr-working-days"
            label="Working days"
            type="number"
            min="0"
            value={form.working_days != null ? String(form.working_days) : ''}
            onChange={(e) => set('working_days', e.target.value ? Number(e.target.value) : null)}
            placeholder="e.g. 26"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-secondary">Survey ID</label>
            <input
              type="number"
              min="1"
              value={form.survey ?? ''}
              onChange={(e) => set('survey', e.target.value ? Number(e.target.value) : null)}
              className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-app-secondary">Site ID</label>
            <input
              type="number"
              min="1"
              value={form.site ?? ''}
              onChange={(e) => set('site', e.target.value ? Number(e.target.value) : null)}
              className="min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-app-secondary">Remarks</label>
          <textarea
            value={form.remarks ?? ''}
            onChange={(e) => set('remarks', e.target.value)}
            className="min-h-24 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            placeholder="Optional"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={form.is_active ?? true}
            onChange={(e) => set('is_active', e.target.checked)}
            className="h-4 w-4 rounded border-app-border"
          />
          Active requirement
        </label>
      </form>
    </Drawer>
  )
}

// ─── Role requirements tab ────────────────────────────────────────────────────

function RoleRequirementsTab({ leadId, canEdit }: { leadId: number; canEdit: boolean }) {
  const navigate = useNavigate()
  const [rows, setRows] = useState<SalesRoleRequirement[]>([])
  const [surveys, setSurveys] = useState<SiteSurvey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<SalesRoleRequirement | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [reqRes, survRes] = await Promise.all([
        listSalesRoleRequirements({ lead: leadId }),
        listSiteSurveys({ lead: leadId }),
      ])
      setRows(reqRes.items)
      setSurveys(survRes.items)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Failed to load role requirements').message)
    } finally {
      setLoading(false)
    }
  }

  const [rowError, setRowError] = useState<string | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [pendingDeleteRrId, setPendingDeleteRrId] = useState<number | null>(null)

  useEffect(() => { void load() }, [leadId])

  async function handleDelete(id: number) {
    setPendingDeleteRrId(null)
    setRowError(null)
    try {
      await deleteSalesRoleRequirement(id)
      setRows((prev) => prev.filter((r) => r.id !== id))
    } catch (e: unknown) {
      setRowError(parseApiError(e, 'Delete failed').message)
    }
  }

  async function handleApprove(id: number) {
    setApprovingId(id)
    setRowError(null)
    try {
      const updated = await approveSalesRoleRequirement(id)
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
    } catch (e: unknown) {
      setRowError(parseApiError(e, 'Approve failed').message)
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) return <Spinner label="Loading role requirements…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      {/* CTA: generate from survey */}
      {surveys.length > 0 ? (
        <div className="rounded-panel border border-dashed border-app-border bg-app-muted/30 p-4">
          <p className="text-sm font-medium text-app-text">Generate from site survey</p>
          <p className="mt-1 text-xs text-app-secondary">
            Open a site survey and use the <strong>Generate role requirements</strong> action to auto-populate this list.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {surveys.map((s) => (
              <Button
                key={s.id}
                variant="secondary"
                className="min-h-8 px-3 text-xs"
                onClick={() => navigate(`/sales/surveys/${s.id}`)}
              >
                Survey #{s.id} ({surveyStatusLabel(s.status)})
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {rowError ? (
        <p className="rounded-panel bg-status-danger/8 px-4 py-2 text-sm text-status-danger">{rowError}</p>
      ) : null}

      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={() => { setEditing(null); setDrawerOpen(true) }} className="gap-1">
            <Plus className="h-4 w-4" />
            Add requirement
          </Button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No role requirements"
          description="Requirements will appear here once added or generated from a survey."
        />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-app-border shadow-panel">
          <Table>
            <THead>
              <TR>
                <TH>Job role</TH>
                <TH>Site</TH>
                <TH>Service</TH>
                <TH>HC</TH>
                <TH>Shift hrs</TH>
                <TH>Working days</TH>
                <TH>Status</TH>
                {canEdit ? <TH>Actions</TH> : null}
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="text-sm">
                    {r.job_role_name ?? (r.job_role != null ? `#${r.job_role}` : '—')}
                  </TD>
                  <TD className="text-xs text-app-secondary">{r.site_name ?? (r.site != null ? `#${r.site}` : '—')}</TD>
                  <TD className="text-xs text-app-secondary">{r.service_category || '—'}</TD>
                  <TD className="text-sm">{r.manpower_count}</TD>
                  <TD className="text-xs text-app-secondary">{r.shift_hours ?? '—'}</TD>
                  <TD className="text-xs text-app-secondary">{r.working_days ?? '—'}</TD>
                  <TD>
                    <div className="flex flex-wrap gap-1">
                      {r.approved_by_operations ? <Badge variant="success">Approved</Badge> : <Badge variant="neutral">Draft</Badge>}
                      {r.is_active === false ? <Badge variant="danger">Inactive</Badge> : null}
                      {r.created_from_survey ? <Badge variant="info">Survey</Badge> : null}
                    </div>
                  </TD>
                  {canEdit ? (
                    <TD>
                      <div className="flex items-center gap-2">
                        {!r.approved_by_operations ? (
                          <button
                            type="button"
                            className="text-xs text-status-success hover:underline disabled:opacity-50"
                            disabled={approvingId === r.id}
                            onClick={() => void handleApprove(r.id)}
                          >
                            {approvingId === r.id ? 'Approving…' : 'Approve'}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="text-xs text-brand-600 hover:underline"
                          onClick={() => { setEditing(r); setDrawerOpen(true) }}
                        >
                          Edit
                        </button>
                        {pendingDeleteRrId === r.id ? (
                          <span className="flex items-center gap-1">
                            <span className="text-xs text-app-secondary">Sure?</span>
                            <button type="button" className="text-xs text-status-danger hover:underline" onClick={() => void handleDelete(r.id)}>Yes</button>
                            <button type="button" className="text-xs text-app-secondary hover:underline" onClick={() => setPendingDeleteRrId(null)}>No</button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-status-danger hover:underline"
                            onClick={() => setPendingDeleteRrId(r.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </TD>
                  ) : null}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <RoleRequirementDrawer
        open={drawerOpen}
        leadId={leadId}
        editing={editing}
        onClose={() => setDrawerOpen(false)}
        onSaved={(saved) => {
          setRows((prev) => {
            const idx = prev.findIndex((r) => r.id === saved.id)
            return idx >= 0 ? prev.map((r) => (r.id === saved.id ? saved : r)) : [saved, ...prev]
          })
          setDrawerOpen(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

function ActivityTab({ leadId }: { leadId: number }) {
  const [items, setItems] = useState<SalesActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    listSalesActivities({ lead: leadId })
      .then((res) => setItems(res.items))
      .catch((e: unknown) => setError(parseApiError(e, 'Failed to load activity').message))
      .finally(() => setLoading(false))
  }, [leadId])

  if (loading) return <Spinner label="Loading activity…" />
  if (error) return <ErrorState message={error} />
  if (items.length === 0) {
    return <EmptyState title="No activity yet" description="Actions on this lead will appear here." />
  }

  return (
    <ul className="space-y-0 divide-y divide-app-border rounded-panel border border-app-border">
      {items.map((item) => (
        <li key={item.id} className="flex gap-3 px-4 py-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-app-text">{item.title}</p>
              <Badge variant="neutral">{item.activity_type.replace(/_/g, ' ')}</Badge>
            </div>
            {item.message?.trim() ? (
              <p className="mt-1 whitespace-pre-wrap text-xs text-app-secondary">{item.message}</p>
            ) : null}
            <p className="mt-1 text-[10px] text-app-subtle">
              {item.actor_username ?? 'System'} · {formatDateTime(item.created_at)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Documents helpers ────────────────────────────────────────────────────────

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'survey_report', label: 'Survey report' },
  { value: 'contract', label: 'Contract' },
  { value: 'legal', label: 'Legal' },
  { value: 'technical', label: 'Technical' },
  { value: 'other', label: 'Other' },
]

const MAX_FILE_SIZE = 20 * 1024 * 1024

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentUploadDrawer({
  open,
  leadId,
  onClose,
  onUploaded,
}: {
  open: boolean
  leadId: number
  onClose: () => void
  onUploaded: (doc: SalesDocument) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('other')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) { setTitle(''); setDocType('other'); setNotes(''); setFile(null); setFileError(null); setError(null) }
  }, [open])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFileError(null)
    if (!f) { setFile(null); return }
    if (f.size > MAX_FILE_SIZE) { setFileError('File exceeds 20 MB limit.'); setFile(null); return }
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setFileError('Please choose a file.'); return }
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const payload: SalesDocumentWriteInput = { lead: leadId, document_type: docType, title: title.trim(), notes: notes.trim() || undefined }
      const doc = await uploadSalesDocument(payload, file)
      onUploaded(doc)
    } catch (err) {
      setError(parseApiError(err, 'Upload failed').message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer
      open={open}
      title="Upload document"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="doc-upload-form" disabled={saving || !file}>
            {saving ? 'Uploading…' : 'Upload'}
          </Button>
        </div>
      }
    >
      <form id="doc-upload-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {error ? <p className="rounded-panel bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{error}</p> : null}

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-app-secondary">File *</label>
          <input
            ref={fileRef}
            type="file"
            onChange={handleFileChange}
            className="text-sm text-app-text file:mr-3 file:rounded-panel file:border file:border-app-border file:bg-app-muted file:px-3 file:py-1.5 file:text-xs file:text-app-text"
          />
          {file ? <p className="text-xs text-app-subtle">{file.name} — {formatFileSize(file.size)}</p> : null}
          {fileError ? <p className="text-xs text-status-danger">{fileError}</p> : null}
        </div>

        <Input
          id="doc-title"
          label="Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Document title"
        />

        <Select
          id="doc-type"
          label="Document type *"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
        >
          {DOCUMENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>

        <div className="flex flex-col gap-1">
          <label htmlFor="doc-notes" className="text-sm font-medium text-app-secondary">Notes</label>
          <textarea
            id="doc-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            placeholder="Optional notes"
          />
        </div>
      </form>
    </Drawer>
  )
}

// ─── Documents tab ────────────────────────────────────────────────────────────

function DocumentsTab({ leadId, canEdit }: { leadId: number; canEdit: boolean }) {
  const [docs, setDocs] = useState<SalesDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pendingDeleteDocId, setPendingDeleteDocId] = useState<number | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await listSalesDocuments({ lead: leadId })
      setDocs(res.items)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Failed to load documents').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [leadId])

  async function handleDelete(id: number) {
    setPendingDeleteDocId(null)
    setDeleteError(null)
    try {
      await deleteSalesDocument(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch (e: unknown) {
      setDeleteError(parseApiError(e, 'Delete failed').message)
    }
  }

  if (loading) return <Spinner label="Loading documents…" />
  if (error) return <ErrorState message={error} />

  return (
    <div className="space-y-4">
      {deleteError ? (
        <p className="rounded-panel bg-status-danger/8 px-4 py-2 text-sm text-status-danger">{deleteError}</p>
      ) : null}

      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={() => setUploadOpen(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Upload document
          </Button>
        </div>
      ) : null}

      {docs.length === 0 ? (
        <EmptyState
          title="No documents"
          description={canEdit ? 'Upload files associated with this lead.' : 'No documents have been uploaded.'}
        />
      ) : (
        <div className="overflow-x-auto rounded-panel border border-app-border shadow-panel">
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Type</TH>
                <TH>File name</TH>
                <TH>Size</TH>
                <TH>Uploaded by</TH>
                <TH>Date</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {docs.map((doc) => (
                <TR key={doc.id}>
                  <TD className="font-medium text-sm">{doc.title}</TD>
                  <TD>
                    <Badge variant="neutral">
                      {DOCUMENT_TYPE_OPTIONS.find((o) => o.value === doc.document_type)?.label ?? doc.document_type}
                    </Badge>
                  </TD>
                  <TD className="text-xs text-app-secondary font-mono">{doc.file_name ?? '—'}</TD>
                  <TD className="text-xs tabular-nums text-app-secondary">{formatFileSize(doc.file_size)}</TD>
                  <TD className="text-xs text-app-secondary">{doc.uploaded_by_username ?? '—'}</TD>
                  <TD className="text-xs text-app-secondary whitespace-nowrap">{formatShortDate(doc.created_at)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      {doc.file_url ? (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Download
                        </a>
                      ) : null}
                      {canEdit ? (
                        pendingDeleteDocId === doc.id ? (
                          <span className="flex items-center gap-1">
                            <span className="text-xs text-app-secondary">Sure?</span>
                            <button type="button" className="text-xs text-status-danger hover:underline" onClick={() => void handleDelete(doc.id)}>Yes</button>
                            <button type="button" className="text-xs text-app-secondary hover:underline" onClick={() => setPendingDeleteDocId(null)}>No</button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-status-danger hover:underline"
                            onClick={() => setPendingDeleteDocId(doc.id)}
                          >
                            Delete
                          </button>
                        )
                      ) : null}
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      <DocumentUploadDrawer
        open={uploadOpen}
        leadId={leadId}
        onClose={() => setUploadOpen(false)}
        onUploaded={(doc) => {
          setDocs((prev) => [doc, ...prev])
          setUploadOpen(false)
        }}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SalesLeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const leadId = Number(id)
  const navigate = useNavigate()

  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canEdit = hasAnyCapability(meCaps, [CAP.SALES_LEAD_UPDATE])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lead, setLead] = useState<SalesLead | null>(null)

  const [editDrawerOpen, setEditDrawerOpen] = useState(false)
  const [tab, setTab] = useState<TabId>('overview')

  const [actionBusy, setActionBusy] = useState<'submit' | 'generate' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [missingRuleCodes, setMissingRuleCodes] = useState<string[] | null>(null)
  const [operationsOwner, setOperationsOwner] = useState('')
  const [operationsUsers, setOperationsUsers] = useState<UserRow[]>([])
  const [operationsUsersLoading, setOperationsUsersLoading] = useState(false)
  const [operationsUsersError, setOperationsUsersError] = useState<string | null>(null)
  const [pageSurveys, setPageSurveys] = useState<SiteSurvey[]>([])
  const [activeSitesCount, setActiveSitesCount] = useState<number | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [leadData, sitesData, surveysData] = await Promise.all([
        getSalesLead(leadId),
        listSalesLeadSites({ lead: leadId }),
        listSiteSurveys({ lead: leadId }),
      ])
      setLead(leadData)
      setActiveSitesCount(sitesData.items.filter((s) => s.is_active !== false).length)
      setPageSurveys(surveysData.items)
    } catch (e: unknown) {
      setError(parseApiError(e, 'Failed to load lead').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isNaN(leadId)) void load()
    else setError('Invalid lead ID.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  useEffect(() => {
    if (!canEdit) return
    setOperationsUsersLoading(true)
    setOperationsUsersError(null)
    listEligibleOperationsOwnersForLead(leadId)
      .then((res) => {
        setOperationsUsers(res.items)
      })
      .catch((e: unknown) => {
        setOperationsUsers([])
        setOperationsUsersError(parseApiError(e, 'Could not load operations users').message)
      })
      .finally(() => setOperationsUsersLoading(false))
  }, [canEdit, leadId])

  async function handleSubmitToOperations() {
    setActionBusy('submit')
    setActionError(null)
    try {
      const updated = await submitLeadToOperations(
        leadId,
        operationsOwner ? { operations_owner: Number(operationsOwner) } : undefined,
      )
      setLead(updated)
      setSubmitSuccess(true)
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Submit failed').message)
    } finally {
      setActionBusy(null)
    }
  }

  async function handleGenerateProposal() {
    setActionBusy('generate')
    setActionError(null)
    setMissingRuleCodes(null)
    try {
      const proposal = await generateProposalForLead(leadId)
      navigate(`/sales/proposals/${proposal.id}`)
    } catch (e: unknown) {
      // Check if error contains missing rule codes
      const errorWithCodes = e as Error & { missingRuleCodes?: string[] }
      if (Array.isArray(errorWithCodes.missingRuleCodes)) {
        setMissingRuleCodes(errorWithCodes.missingRuleCodes)
        setActionError(errorWithCodes.message)
      } else {
        setActionError(parseApiError(e, 'Generate failed').message)
      }
      setActionBusy(null)
    }
  }

  // Auto-redirect to overview if the current tab becomes locked (e.g., after reload)
  useEffect(() => {
    if (!lead) return
    if (tabLocked(tab, lead.current_stage) != null) setTab('overview')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.current_stage])

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Spinner label="Loading lead…" />
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-1 px-2" onClick={() => navigate('/sales/leads')}>
          <ArrowLeft className="h-4 w-4" />
          Back to leads
        </Button>
        <ErrorState message={error ?? 'Lead not found.'} />
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Back + header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            className="mt-0.5 shrink-0 px-2"
            onClick={() => navigate('/sales/leads')}
            aria-label="Back to leads"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-app-text">{lead.client_name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={leadTypeVariant(lead.lead_type)}>{LEAD_TYPE_LABELS[lead.lead_type]}</Badge>
              <Badge variant={stageVariant(lead.current_stage)}>{stageLabel(lead.current_stage)}</Badge>
              {lead.existing_client_name ? (
                <span className="text-xs text-app-secondary">{lead.existing_client_name}</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start">
          {canEdit && lead.current_stage === 'site_survey_completed' ? (
            <Button
              variant="primary"
              disabled={actionBusy !== null}
              onClick={() => void handleGenerateProposal()}
            >
              {actionBusy === 'generate' ? 'Generating…' : 'Generate Proposal'}
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              variant="secondary"
              onClick={() => setEditDrawerOpen(true)}
            >
              Edit lead
            </Button>
          ) : null}
        </div>
      </div>

      {/* Stage stepper */}
      <LeadStepper stage={lead.current_stage} />

      {/* Stage action panel */}
      {(() => {
        const stage = lead.current_stage
        if (submitSuccess) {
          return (
            <div className="rounded-panel border border-status-success/30 bg-status-success/8 px-4 py-3 text-sm text-status-success">
              Lead submitted to operations. The operations team will begin the site survey.
            </div>
          )
        }
        if (stage === 'draft' && canEdit) {
          const noSites = activeSitesCount === 0
          const noOwner = !operationsOwner
          const cannotSubmit = noSites || noOwner || actionBusy !== null
          return (
            <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
              <p className="mb-1 text-sm font-medium text-app-text">Hand off to operations</p>
              <p className="mt-1 mb-3 text-xs text-app-secondary">
                Once the lead is ready for site survey, assign an operations owner and submit.
              </p>
              {noSites ? (
                <div className="mb-3 rounded-panel border border-status-warning/30 bg-status-warning/8 px-3 py-2 text-sm text-status-warning">
                  Add at least one active site before submitting to operations.
                  <button
                    type="button"
                    className="ml-2 underline hover:no-underline"
                    onClick={() => setTab('sites')}
                  >
                    Go to Sites tab
                  </button>
                </div>
              ) : null}
              <div className="flex flex-wrap items-end gap-3">
                <Select
                  id="sales-ops-owner"
                  label="Operations owner *"
                  value={operationsOwner}
                  onChange={(e) => setOperationsOwner(e.target.value)}
                  disabled={operationsUsersLoading}
                  className="min-w-64"
                >
                  <option value="">{operationsUsersLoading ? 'Loading...' : 'Select an operations user…'}</option>
                  {operationsUsers.map((u) => (
                    <option key={u.id} value={String(u.id)}>
                      {u.username}{u.department_name ? ` — ${u.department_name}` : ''}
                    </option>
                  ))}
                </Select>
                <Button
                  disabled={cannotSubmit}
                  onClick={() => void handleSubmitToOperations()}
                >
                  {actionBusy === 'submit' ? 'Submitting…' : 'Submit to operations'}
                </Button>
              </div>
              {operationsUsersError ? (
                <p className="mt-2 text-sm text-status-danger">{operationsUsersError}</p>
              ) : null}
              {!operationsUsersLoading && !operationsUsersError && operationsUsers.length === 0 ? (
                <p className="mt-2 text-sm text-status-warning">
                  No active internal users are available to assign as operations owner.
                </p>
              ) : null}
              {actionError ? <p className="mt-2 text-sm text-status-danger">{actionError}</p> : null}
            </div>
          )
        }
        if (stage === 'submitted_to_operations' || stage === 'site_survey_in_progress') {
          const inProgressCount = pageSurveys.filter((s) => s.status === 'in_progress').length
          const pendingCount = pageSurveys.filter((s) => s.status === 'pending').length
          const completedCount = pageSurveys.filter((s) => s.status === 'completed').length
          return (
            <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
              <p className="mb-3 text-sm font-medium text-app-text">Operations work in progress</p>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 text-center">
                <div className="rounded-panel border border-app-border bg-app-muted/40 p-3">
                  <p className="text-xs text-app-subtle">Pending</p>
                  <p className="mt-1 text-xl font-semibold text-app-text">{pendingCount}</p>
                </div>
                <div className="rounded-panel border border-app-border bg-app-muted/40 p-3">
                  <p className="text-xs text-app-subtle">In progress</p>
                  <p className="mt-1 text-xl font-semibold text-app-text">{inProgressCount}</p>
                </div>
                <div className="rounded-panel border border-app-border bg-app-muted/40 p-3">
                  <p className="text-xs text-app-subtle">Completed</p>
                  <p className="mt-1 text-xl font-semibold text-app-text">{completedCount}</p>
                </div>
                <div className="rounded-panel border border-app-border bg-app-muted/40 p-3">
                  <p className="text-xs text-app-subtle">Ops owner</p>
                  <p className="mt-1 text-sm font-medium text-app-text truncate">{lead.operations_owner_name ?? '—'}</p>
                </div>
              </div>
              <div className="mt-3">
                <button type="button" className="text-sm text-brand-600 hover:underline" onClick={() => setTab('surveys')}>
                  View surveys →
                </button>
              </div>
            </div>
          )
        }
        if (stage === 'site_survey_completed') {
          // Keep only warnings if any - actions moved to header
          if (missingRuleCodes && missingRuleCodes.length > 0) {
            return (
              <div className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning/5 p-3">
                <AlertTriangle className="h-4 w-4 text-status-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-app-text">Missing component rules</p>
                  <p className="text-xs text-app-secondary mt-0.5">
                    Configure before generating: {missingRuleCodes.join(', ')}
                  </p>
                  <Link
                    to="/sales/component-rules"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-status-warning hover:underline"
                  >
                    Open Component Rules <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )
          }
          if (actionError) {
            return <p className="text-sm text-status-danger">{actionError}</p>
          }
          return null
        }
        if (['budget_generated', 'sales_review'].includes(stage) && canEdit) {
          return (
            <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-app-subtle">Lead actions</p>
              <Button
                variant="secondary"
                disabled={actionBusy !== null}
                onClick={() => void handleGenerateProposal()}
              >
                {actionBusy === 'generate' ? 'Generating…' : 'Generate proposal'}
              </Button>
              {missingRuleCodes && missingRuleCodes.length > 0 ? (
                <div className="mt-4 rounded-panel border border-status-warning/40 bg-status-warning/8 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-status-warning">
                        Proposal component rules are not fully configured
                      </p>
                      <p className="mt-1 text-xs text-app-secondary">
                        Finance/admin must configure all salary and statutory components before proposals can be generated.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {missingRuleCodes.map((code) => (
                          <Badge key={code} variant="danger">{code}</Badge>
                        ))}
                      </div>
                      <Link
                        to="/sales/component-rules"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-status-warning/20 px-3 py-1.5 text-xs font-medium text-status-warning transition-colors hover:bg-status-warning/30"
                      >
                        Open Component Rules
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ) : actionError ? (
                <p className="mt-2 text-sm text-status-danger">{actionError}</p>
              ) : null}
            </div>
          )
        }
        return null
      })()}

      {/* Tabs */}
      <div className="border-b border-app-border">
        <nav className="-mb-px flex gap-0 overflow-x-auto" aria-label="Lead workspace tabs">
          {TABS.map((t) => {
            const lockReason = tabLocked(t.id, lead.current_stage)
            const locked = lockReason != null
            return (
              <button
                key={t.id}
                type="button"
                disabled={locked}
                title={lockReason ?? undefined}
                onClick={() => { if (!locked) setTab(t.id) }}
                className={[
                  'shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'border-brand-600 text-brand-700'
                    : locked
                      ? 'border-transparent text-app-subtle cursor-not-allowed opacity-50'
                      : 'border-transparent text-app-secondary hover:border-app-border hover:text-app-text',
                ].join(' ')}
              >
                {t.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {tab === 'overview' && <OverviewTab lead={lead} />}
        {tab === 'sites' && (
          <SitesTab
            leadId={leadId}
            canEdit={canEdit}
            onSitesChanged={(nextSites) => {
              setActiveSitesCount(nextSites.filter((s) => s.is_active !== false).length)
            }}
          />
        )}
        {tab === 'surveys' && <SurveysTab leadId={leadId} canEdit={canEdit} />}
        {tab === 'role-requirements' && <RoleRequirementsTab leadId={leadId} canEdit={canEdit} />}
        {tab === 'proposals' && <ProposalsTab leadId={leadId} />}
        {tab === 'activity' && <ActivityTab leadId={leadId} />}
        {tab === 'documents' && <DocumentsTab leadId={leadId} canEdit={canEdit} />}
      </div>

      {/* Edit lead drawer */}
      <SalesLeadFormDrawer
        open={editDrawerOpen}
        initialLead={lead}
        onClose={() => setEditDrawerOpen(false)}
        onSaved={() => void load()}
      />
    </div>
  )
}
