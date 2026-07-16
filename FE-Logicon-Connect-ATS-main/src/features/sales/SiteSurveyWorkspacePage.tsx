import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, ArrowLeft, Check, CheckCircle2, ClipboardCheck, FileText, Info, MapPin, Play, Plus, Settings2, Users, Wrench } from 'lucide-react'
import {
  assignSiteSurveyOwner,
  createSiteSurveyEquipmentLine,
  createSiteSurveyIssueLine,
  createSiteSurveyLocationLine,
  createSiteSurveyShiftDeployment,
  generateRoleRequirementsFromSurvey,
  getSiteSurveyStructured,
  listEligibleOperationsOwnersForLead,
  listSalesRoleRequirements,
  listSurveyRoleMappings,
  markSiteSurveyCompleted,
  markSiteSurveyStarted,
  seedSiteSurveyDefaultLines,
  updateSiteSurveyEquipmentLine,
  updateSiteSurveyIssueLine,
  updateSiteSurveyLocationLine,
  updateSiteSurveyScopeAnswer,
  updateSiteSurveyShiftDeployment,
} from '@/api/sales'
import type { UserRow } from '@/api/users'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import { ROUTES } from '@/app/routes'
import { useAuthStore } from '@/features/auth/authStore'
import { surveyStatusLabel, surveyStatusVariant, formatShortDate } from '@/features/sales/salesUtils'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type {
  GenerateRoleRequirementsResult,
  SalesRoleRequirement,
  SiteSurveyEquipmentLine,
  SiteSurveyIssueLine,
  SiteSurveyLocationLine,
  SiteSurveyScopeAnswer,
  SiteSurveyShiftDeployment,
  SiteSurveyStructuredResponse,
  SurveyRoleMapping,
} from '@/types/sales'

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = 'scope' | 'deployment' | 'locations' | 'equipment' | 'issues' | 'review'

const TABS: { id: TabId; label: string; icon: typeof ClipboardCheck }[] = [
  { id: 'scope', label: 'Scope', icon: ClipboardCheck },
  { id: 'deployment', label: 'Deployment', icon: ClipboardCheck },
  { id: 'locations', label: 'Locations', icon: ClipboardCheck },
  { id: 'equipment', label: 'Equipment', icon: ClipboardCheck },
  { id: 'issues', label: 'Issues', icon: ClipboardCheck },
  { id: 'review', label: 'Review', icon: ClipboardCheck },
]

const SCOPE_CATEGORY_LABELS: Record<string, string> = {
  client_scope_site: 'Client Scope / Site Details',
  premises: 'Premises Details',
  hk_info: 'Housekeeping Information',
  technical_scope: 'Technical Scope',
  existing_deployment: 'Existing Deployment Structure',
}

// Template rows that don't need role mappings
const SURVEY_ROLE_MAPPING_IGNORE = new Set([
  'site management team',
  'technical(8 hrs x 6 days)',
  'machinery',
  'hk consumables',
  'housekeeping consumables',
  'sub total',
  'subtotal',
  'total',
  'grand total',
])

function isRoleMappingIgnored(description?: string): boolean {
  if (!description) return false
  return SURVEY_ROLE_MAPPING_IGNORE.has(description.toLowerCase().trim())
}

type RowSaveState = { saving: boolean; error: string | null; success?: boolean }

/**
 * Formats headcount for display: removes unnecessary decimals.
 * 1.00 -> "1", 2.50 -> "2.5", 0.00 -> "0", null/undefined -> "—"
 */
function formatHeadcount(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '—'
  // Remove trailing zeros after decimal
  return num % 1 === 0 ? String(Math.trunc(num)) : String(num)
}

// ─── Utility Components ───────────────────────────────────────────────────────

function SaveIndicator({ state }: { state: RowSaveState | undefined }) {
  if (!state) return null
  if (state.saving) return <span className="text-xs text-brand-600 animate-pulse">Saving...</span>
  if (state.error) return <span className="text-xs text-status-danger" title={state.error}>Error</span>
  if (state.success) return <span className="text-xs text-status-success">Saved</span>
  return null
}

function ApplicableToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 transition-all duration-150 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={value ? 'Click to disable' : 'Click to enable'}
    >
      {/* Switch track */}
      <span className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ${
        value ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
      }`}>
        {/* Switch knob */}
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-150 ${
          value ? 'translate-x-4' : 'translate-x-0.5'
        }`} />
      </span>
      {/* Label */}
      <span className={`text-xs font-medium ${
        value ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
      }`}>
        {value ? 'Yes' : 'N/A'}
      </span>
    </button>
  )
}

function SectionCard({
  title,
  description,
  children,
  className = '',
  accent = 'brand',
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  accent?: 'brand' | 'success' | 'warning' | 'neutral'
}) {
  const accentColors = {
    brand: 'border-l-brand-500 bg-gradient-to-r from-brand-50/80 to-transparent dark:from-brand-900/20',
    success: 'border-l-status-success bg-gradient-to-r from-green-50/80 to-transparent dark:from-green-900/20',
    warning: 'border-l-status-warning bg-gradient-to-r from-amber-50/80 to-transparent dark:from-amber-900/20',
    neutral: 'border-l-app-border bg-gradient-to-r from-gray-50/80 to-transparent dark:from-gray-900/20',
  }

  return (
    <div className={`rounded-xl border border-app-border bg-app-surface shadow-sm overflow-hidden ${className}`}>
      <div className={`border-l-4 ${accentColors[accent]} px-5 py-4`}>
        <h3 className="text-base font-semibold text-app-heading tracking-tight">{title}</h3>
        {description ? <p className="mt-1 text-sm text-app-secondary">{description}</p> : null}
      </div>
      <div className="p-5 pt-4">{children}</div>
    </div>
  )
}

function FormField({
  label,
  value,
  onChange,
  onBlur,
  multiline,
  placeholder,
  disabled,
  className = '',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
  multiline?: boolean
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const hasValue = value?.trim().length > 0
  const baseClass =
    'w-full rounded-xl border-2 border-app-border/60 bg-white dark:bg-app-surface px-4 py-3 text-sm text-app-text placeholder:text-app-subtle/70 transition-all duration-200 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:shadow-sm disabled:bg-app-muted/50 disabled:cursor-not-allowed hover:border-app-border'

  return (
    <div className={`group ${className}`}>
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-app-subtle group-focus-within:text-brand-600 transition-colors">
        {label}
        {hasValue && (
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-status-success" title="Filled" />
        )}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
          disabled={disabled}
          rows={3}
          className={baseClass + ' resize-none min-h-[100px]'}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
          disabled={disabled}
          className={baseClass}
        />
      )}
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  onBlur,
  disabled,
  min,
  className = '',
}: {
  value: number | null | undefined
  onChange: (v: number | null) => void
  onBlur?: (v: number | null) => void
  disabled?: boolean
  min?: number
  className?: string
}) {
  // Clean number display (remove trailing .00)
  function cleanNumber(v: number | null | undefined): string {
    if (v == null) return ''
    const num = Number(v)
    if (Number.isNaN(num)) return ''
    return num % 1 === 0 ? Math.trunc(num).toString() : num.toString()
  }

  const displayValue = cleanNumber(value)

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={(e) => {
        const raw = e.target.value
        // Allow empty, numbers, and decimal point
        if (raw === '' || /^-?\d*\.?\d*$/.test(raw)) {
          if (raw === '') {
            onChange(null)
            return
          }
          const parsed = Number(raw)
          if (!Number.isNaN(parsed)) {
            onChange(min !== undefined && parsed < min ? min : parsed)
          }
        }
      }}
      onBlur={(e) => {
        const parsed = e.target.value === '' ? null : Number(e.target.value)
        onBlur?.(parsed !== null && min !== undefined && parsed < min ? min : parsed)
      }}
      disabled={disabled}
      className={`min-w-[80px] w-full rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm text-center text-app-text placeholder:text-app-subtle transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-app-muted disabled:cursor-not-allowed ${className}`}
    />
  )
}

function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border-2 border-dashed border-app-border px-4 py-3 text-sm font-medium text-app-secondary transition-colors hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50/50"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  )
}

function ProgressRing({ percent, size = 40 }: { percent: number; size?: number }) {
  const stroke = 4
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className="text-app-border"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={percent === 100 ? 'text-status-success' : 'text-brand-600'}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {percent === 100 ? (
          <Check className="h-4 w-4 text-status-success" />
        ) : (
          <span className="text-xs font-semibold text-app-text">{Math.round(percent)}%</span>
        )}
      </div>
    </div>
  )
}

function roleGenerationReasonLabel(reason: string, description: string): string {
  switch (reason) {
    case 'role_mapping_not_found':
      return `Map "${description}" to a job role before generation`
    case 'job_role_not_found':
      return `No job role found for "${description}"`
    case 'wage_category_not_found':
      return `Wage category not configured for "${description}" skill category`
    case 'zero_headcount':
      return `"${description}" has zero headcount`
    case 'not_applicable':
      return `"${description}" was marked not applicable`
    case 'ignored_template_row':
      return `"${description}" is a template row`
    case 'already_exists':
      return `"${description}" already has a role requirement`
    case 'empty_description':
      return 'A row has no description'
    default:
      return `"${description}" could not be processed (${reason})`
  }
}

// ─── Workflow Stepper ─────────────────────────────────────────────────────────

type StepStatus = 'done' | 'active' | 'warning' | 'pending' | 'locked'

interface WorkflowStepperProps {
  fillProgress: number
  hasGenerated: boolean
  isStale: boolean
  isCompleted: boolean
  canGenerate: boolean
  canComplete: boolean
  onGenerateClick: () => void
  onCompleteClick: () => void
  generating: boolean
  completing: boolean
}

function WorkflowStepper({
  fillProgress,
  hasGenerated,
  isStale,
  isCompleted,
  canGenerate,
  canComplete,
  onGenerateClick,
  onCompleteClick,
  generating,
  completing,
}: WorkflowStepperProps) {
  // Determine step statuses
  const startStatus: StepStatus = 'done' // Always done if viewing in_progress
  const fillStatus: StepStatus = fillProgress >= 100 ? 'done' : 'active'
  const generateStatus: StepStatus = isCompleted
    ? 'done'
    : hasGenerated && !isStale
    ? 'done'
    : isStale
    ? 'warning'
    : 'pending'
  const completeStatus: StepStatus = isCompleted
    ? 'done'
    : canComplete
    ? 'active'
    : 'locked'

  const steps: {
    label: string
    hint: string
    status: StepStatus
    actionLabel?: string
    onAction?: () => void
    loading?: boolean
  }[] = [
    { label: 'Start', hint: 'Survey started', status: startStatus },
    { label: 'Fill Sections', hint: `${Math.round(fillProgress)}% complete`, status: fillStatus },
    {
      label: 'Generate RR',
      hint: isStale ? 'Needs regeneration' : hasGenerated ? 'Requirements ready' : 'Not generated',
      status: generateStatus,
      actionLabel: generating ? 'Generating...' : isStale ? 'Regenerate' : hasGenerated ? 'Regenerate' : 'Generate',
      onAction: canGenerate ? onGenerateClick : undefined,
      loading: generating,
    },
    {
      label: 'Complete',
      hint: isCompleted ? 'Survey completed' : canComplete ? 'Ready to complete' : 'Pending requirements',
      status: completeStatus,
      actionLabel: completing ? 'Completing...' : 'Complete',
      onAction: canComplete ? onCompleteClick : undefined,
      loading: completing,
    },
  ]

  const statusStyles: Record<StepStatus, { circle: string; text: string; line: string }> = {
    done: {
      circle: 'bg-status-success text-white border-status-success',
      text: 'text-status-success',
      line: 'bg-status-success',
    },
    active: {
      circle: 'bg-brand-600 text-white border-brand-600 ring-4 ring-brand-100',
      text: 'text-brand-600',
      line: 'bg-app-border',
    },
    warning: {
      circle: 'bg-status-warning text-white border-status-warning ring-4 ring-amber-100',
      text: 'text-status-warning',
      line: 'bg-app-border',
    },
    pending: {
      circle: 'bg-app-surface text-app-subtle border-app-border border-2',
      text: 'text-app-subtle',
      line: 'bg-app-border',
    },
    locked: {
      circle: 'bg-app-muted text-app-subtle border-app-border border-2 opacity-50',
      text: 'text-app-subtle opacity-50',
      line: 'bg-app-border',
    },
  }

  return (
    <div className="w-full py-4">
      {/* Desktop: Horizontal stepper - full width */}
      <div className="hidden md:flex items-start w-full">
        {steps.map((step, idx) => {
          const style = statusStyles[step.status]
          const isLast = idx === steps.length - 1

          return (
            <div key={step.label} className={`flex items-start ${isLast ? '' : 'flex-1'}`}>
              {/* Step content */}
              <div className="flex flex-col items-center text-center shrink-0 w-24">
                {/* Circle */}
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${style.circle}`}
                >
                  {step.status === 'done' ? (
                    <Check className="h-5 w-5" />
                  ) : step.status === 'warning' ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : step.loading ? (
                    <Spinner className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-bold">{idx + 1}</span>
                  )}
                </div>
                {/* Label */}
                <p className={`mt-2 text-xs font-semibold whitespace-nowrap ${style.text}`}>{step.label}</p>
                {/* Hint */}
                <p className="mt-0.5 text-[10px] text-app-subtle leading-tight whitespace-nowrap">{step.hint}</p>
                {/* Action button */}
                {step.onAction && !step.loading && (
                  <button
                    type="button"
                    onClick={step.onAction}
                    className={`mt-2 text-[10px] font-semibold px-3 py-1 rounded-full transition-colors ${
                      step.status === 'warning'
                        ? 'bg-status-warning/10 text-status-warning hover:bg-status-warning/20'
                        : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
                    }`}
                  >
                    {step.actionLabel}
                  </button>
                )}
              </div>
              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 flex items-center px-3 mt-5">
                  <div
                    className={`h-0.5 w-full rounded-full transition-colors ${
                      step.status === 'done' ? style.line : 'bg-app-border'
                    }`}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tablet/Mobile: Compact horizontal */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-3">
          {steps.map((step, idx) => {
            const style = statusStyles[step.status]
            const isLast = idx === steps.length - 1

            return (
              <div key={step.label} className="flex items-center flex-1">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all shrink-0 ${style.circle}`}
                >
                  {step.status === 'done' ? (
                    <Check className="h-4 w-4" />
                  ) : step.status === 'warning' ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : step.loading ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-bold">{idx + 1}</span>
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-1 rounded-full ${
                      step.status === 'done' ? style.line : 'bg-app-border'
                    }`}
                  />
                )}
              </div>
            )
          })}
        </div>
        {/* Current step info */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-app-heading truncate">
              {steps.find((s) => s.status === 'active' || s.status === 'warning')?.label ?? 'Complete'}
            </p>
            <p className="text-xs text-app-subtle">
              {steps.find((s) => s.status === 'active' || s.status === 'warning')?.hint ?? 'All steps done'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {canGenerate && (
              <button
                type="button"
                onClick={onGenerateClick}
                disabled={generating}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isStale
                    ? 'bg-status-warning/10 text-status-warning'
                    : 'bg-app-muted text-app-secondary hover:bg-app-border'
                }`}
              >
                {generating ? 'Generating...' : isStale ? 'Regenerate' : 'Generate'}
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                onClick={onCompleteClick}
                disabled={completing}
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700"
              >
                {completing ? 'Completing...' : 'Complete'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SiteSurveyWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const surveyId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canUpdate = hasAnyCapability(meCaps, [CAP.SALES_SURVEY_UPDATE])
  const canAssignSurveyOwner = hasAnyCapability(meCaps, [CAP.SALES_SURVEY_ASSIGN])

  // ─── State ────────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [data, setData] = useState<SiteSurveyStructuredResponse | null>(null)
  const [tab, setTab] = useState<TabId>('scope')

  const [scopeAnswers, setScopeAnswers] = useState<SiteSurveyScopeAnswer[]>([])
  const [shiftDeployments, setShiftDeployments] = useState<SiteSurveyShiftDeployment[]>([])
  const [locationLines, setLocationLines] = useState<SiteSurveyLocationLine[]>([])
  const [equipmentLines, setEquipmentLines] = useState<SiteSurveyEquipmentLine[]>([])
  const [issueLines, setIssueLines] = useState<SiteSurveyIssueLine[]>([])

  const [saveStates, setSaveStates] = useState<Record<string, RowSaveState>>({})
  const [actionBusy, setActionBusy] = useState<'started' | 'completed' | 'generate' | 'assign' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignUsers, setAssignUsers] = useState<UserRow[]>([])
  const [assignUsersLoading, setAssignUsersLoading] = useState(false)
  const [generateResult, setGenerateResult] = useState<GenerateRoleRequirementsResult | null>(null)
  const [roleMappings, setRoleMappings] = useState<SurveyRoleMapping[]>([])
  const [generatedRoleRequirements, setGeneratedRoleRequirements] = useState<SalesRoleRequirement[]>([])
  const [roleRequirementsLoading, setRoleRequirementsLoading] = useState(false)
  const [roleRequirementsError, setRoleRequirementsError] = useState<string | null>(null)
  const [roleRequirementsStale, setRoleRequirementsStale] = useState(false)

  const [addDeploymentOpen, setAddDeploymentOpen] = useState(false)
  const [addLocationOpen, setAddLocationOpen] = useState(false)
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false)
  const [addIssueOpen, setAddIssueOpen] = useState(false)
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [jobRolesLoading, setJobRolesLoading] = useState(false)
  const [selectedJobRoleId, setSelectedJobRoleId] = useState<string>('')

  const seededRef = useRef(false)

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function applyData(res: SiteSurveyStructuredResponse) {
    setData(res)
    setScopeAnswers([...res.scope_answers].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    setShiftDeployments([...res.shift_deployments].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    setLocationLines([...res.location_lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    setEquipmentLines([...res.equipment_lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    setIssueLines([...res.issue_lines].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)))
    setSaveStates({})
  }

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await getSiteSurveyStructured(surveyId)

      // Auto-seed if rows are empty (only once)
      const hasRows = res.scope_answers.length > 0 || res.shift_deployments.length > 0
      if (!hasRows && !seededRef.current) {
        seededRef.current = true
        setPreparing(true)
        try {
          const seeded = await seedSiteSurveyDefaultLines(surveyId)
          applyData(seeded)
        } catch {
          // If seeding fails, just use what we have
          applyData(res)
        } finally {
          setPreparing(false)
        }
      } else {
        applyData(res)
      }
    } catch (e: unknown) {
      setLoadError(parseApiError(e, 'Failed to load site survey').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId])

  // Load eligible users for survey assignment (only if user can assign)
  useEffect(() => {
    if (!canAssignSurveyOwner) return
    const leadId = data?.survey.lead
    if (!leadId) return
    setAssignUsersLoading(true)
    listEligibleOperationsOwnersForLead(leadId)
      .then((res) => setAssignUsers(res.items))
      .catch(() => setAssignUsers([]))
      .finally(() => setAssignUsersLoading(false))
  }, [canAssignSurveyOwner, data?.survey.lead])

  // Load active role mappings once survey loads
  useEffect(() => {
    listSurveyRoleMappings({ is_active: true })
      .then((res) => setRoleMappings(res.items))
      .catch(() => setRoleMappings([]))
  }, [])

  // Load job roles when add deployment modal opens
  useEffect(() => {
    if (!addDeploymentOpen) return
    setJobRolesLoading(true)
    listJobRoles({ is_active: true })
      .then((res) => setJobRoles(res.items))
      .catch(() => setJobRoles([]))
      .finally(() => setJobRolesLoading(false))
  }, [addDeploymentOpen])

  // Load generated role requirements for this survey
  const loadRoleRequirements = useCallback(async () => {
    setRoleRequirementsLoading(true)
    setRoleRequirementsError(null)
    try {
      const res = await listSalesRoleRequirements({ survey: surveyId })
      setGeneratedRoleRequirements(res.items)
    } catch {
      setGeneratedRoleRequirements([])
      setRoleRequirementsError('Could not verify generated role requirements. Backend will still validate completion.')
    } finally {
      setRoleRequirementsLoading(false)
    }
  }, [surveyId])

  useEffect(() => {
    void loadRoleRequirements()
  }, [loadRoleRequirements])

  // Helper to find mapping for a deployment row
  function findMappingForRow(description?: string): SurveyRoleMapping | null {
    if (!description) return null
    const normalized = description.toLowerCase().trim()
    return roleMappings.find((m) => m.description_text.toLowerCase().trim() === normalized) ?? null
  }

  // Build mapping tooltip for display
  function getMappingTooltip(mapping: SurveyRoleMapping): string {
    const parts: string[] = []
    if (mapping.job_role_name) parts.push(mapping.job_role_name)
    if (mapping.wage_category_name) parts.push(mapping.wage_category_name)
    if (mapping.service_category) parts.push(mapping.service_category)
    if (mapping.shift_hours) parts.push(`${mapping.shift_hours}h`)
    if (mapping.working_days) parts.push(`${mapping.working_days}d`)
    return parts.join(' · ')
  }

  function setSaving(key: string, saving: boolean, error: string | null = null, success = false) {
    setSaveStates((prev) => ({ ...prev, [key]: { saving, error, success } }))
    if (success) {
      setTimeout(() => {
        setSaveStates((prev) => {
          const current = prev[key]
          if (current?.success) return { ...prev, [key]: { saving: false, error: null, success: false } }
          return prev
        })
      }, 2000)
    }
  }

  // Smart back navigation
  function handleBack() {
    const path = location.pathname
    if (path.startsWith('/sales/operations-surveys')) {
      navigate('/sales/operations-surveys')
    } else if (data?.survey.lead) {
      navigate(ROUTES.SALES_LEAD_DETAIL(data.survey.lead))
    } else {
      navigate('/sales/leads')
    }
  }

  // ─── Save Handlers ────────────────────────────────────────────────────────────

  async function saveScopeAnswer(answerId: number, answer: string | null) {
    const key = `scope-${answerId}`
    setSaving(key, true)
    try {
      const updated = await updateSiteSurveyScopeAnswer(answerId, { value_text: answer })
      setScopeAnswers((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSaving(key, false, null, true)
    } catch (e: unknown) {
      setSaving(key, false, parseApiError(e, 'Save failed').message)
    }
  }

  async function saveDeploymentField(rowId: number, payload: Partial<SiteSurveyShiftDeployment>) {
    const key = `dep-${rowId}`
    setSaving(key, true)
    try {
      const updated = await updateSiteSurveyShiftDeployment(rowId, payload)
      setShiftDeployments((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSaving(key, false, null, true)
      const affectsGeneratedRequirements = [
        'description',
        'job_role',
        'general_count',
        'first_shift_count',
        'second_shift_count',
        'night_shift_count',
        'is_applicable',
        'line_type',
      ].some((field) => field in payload)
      if (affectsGeneratedRequirements) {
        setGeneratedRoleRequirements((prev) => {
          if (prev.some((r) => r.survey === surveyId && r.is_active !== false && r.created_from_survey === true)) {
            setRoleRequirementsStale(true)
          }
          return prev
        })
      }
    } catch (e: unknown) {
      setSaving(key, false, parseApiError(e, 'Save failed').message)
    }
  }

  async function saveLocationField(rowId: number, payload: Partial<SiteSurveyLocationLine>) {
    const key = `loc-${rowId}`
    setSaving(key, true)
    try {
      const updated = await updateSiteSurveyLocationLine(rowId, payload)
      setLocationLines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSaving(key, false, null, true)
    } catch (e: unknown) {
      setSaving(key, false, parseApiError(e, 'Save failed').message)
    }
  }

  async function saveEquipmentField(rowId: number, payload: Partial<SiteSurveyEquipmentLine>) {
    const key = `eq-${rowId}`
    setSaving(key, true)
    try {
      const updated = await updateSiteSurveyEquipmentLine(rowId, payload)
      setEquipmentLines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSaving(key, false, null, true)
    } catch (e: unknown) {
      setSaving(key, false, parseApiError(e, 'Save failed').message)
    }
  }

  async function saveIssueField(rowId: number, payload: Partial<SiteSurveyIssueLine>) {
    const key = `iss-${rowId}`
    setSaving(key, true)
    try {
      const updated = await updateSiteSurveyIssueLine(rowId, payload)
      setIssueLines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSaving(key, false, null, true)
    } catch (e: unknown) {
      setSaving(key, false, parseApiError(e, 'Save failed').message)
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────────

  async function handleMarkStarted() {
    setActionBusy('started')
    setActionError(null)
    try {
      const updated = await markSiteSurveyStarted(surveyId)
      setData((prev) => (prev ? { ...prev, survey: updated } : prev))
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Action failed').message)
    } finally {
      setActionBusy(null)
    }
  }

  async function handleMarkCompleted() {
    setActionBusy('completed')
    setActionError(null)
    try {
      const updated = await markSiteSurveyCompleted(surveyId)
      setData((prev) => (prev ? { ...prev, survey: updated } : prev))
    } catch (e: unknown) {
      const errorMsg = parseApiError(e, 'Action failed').message
      setActionError(errorMsg)
      // If backend says to regenerate role requirements, mark as stale
      if (errorMsg.toLowerCase().includes('regenerate role requirements')) {
        setRoleRequirementsStale(true)
      }
    } finally {
      setActionBusy(null)
    }
  }

  async function handleAssignOwner() {
    const userId = Number(assignUserId)
    if (!userId) { setActionError('Select a user.'); return }
    setActionBusy('assign')
    setActionError(null)
    try {
      const updated = await assignSiteSurveyOwner(surveyId, { assigned_to: userId })
      setData((prev) => (prev ? { ...prev, survey: updated } : prev))
      setAssignUserId('')
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Assign failed').message)
    } finally {
      setActionBusy(null)
    }
  }

  async function handleGenerateRoles() {
    setActionBusy('generate')
    setActionError(null)
    setGenerateResult(null)
    try {
      const result = await generateRoleRequirementsFromSurvey(surveyId)
      setGenerateResult(result)
      // Reload role requirements to get current state
      await loadRoleRequirements()
      // Clear stale flag after successful regeneration
      setRoleRequirementsStale(false)
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Generation failed').message)
    } finally {
      setActionBusy(null)
    }
  }

  // ─── Add Row Handlers ─────────────────────────────────────────────────────────

  async function handleAddDeploymentRole(jobRoleId: number) {
    try {
      const created = await createSiteSurveyShiftDeployment({
        survey: surveyId,
        job_role: jobRoleId,
        general_count: 0,
        first_shift_count: 0,
        second_shift_count: 0,
        night_shift_count: 0,
        line_type: 'item',
        is_applicable: true,
        sort_order: shiftDeployments.length + 1,
      })
      setShiftDeployments((prev) => [...prev, created])
      setAddDeploymentOpen(false)
      setSelectedJobRoleId('')
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Failed to add role').message)
    }
  }

  async function handleAddLocation(locationName: string) {
    try {
      const created = await createSiteSurveyLocationLine({
        survey: surveyId,
        location_name: locationName,
        row_type: 'item',
        is_applicable: true,
        sort_order: locationLines.length + 1,
      })
      setLocationLines((prev) => [...prev, created])
      setAddLocationOpen(false)
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Failed to add row').message)
    }
  }

  async function handleAddEquipment(description: string, category: 'major' | 'minor') {
    try {
      const created = await createSiteSurveyEquipmentLine({
        survey: surveyId,
        description,
        equipment_category: category,
        line_type: 'item',
        is_applicable: true,
        sort_order: equipmentLines.length + 1,
      })
      setEquipmentLines((prev) => [...prev, created])
      setAddEquipmentOpen(false)
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Failed to add row').message)
    }
  }

  async function handleAddIssue(issue: string) {
    try {
      const created = await createSiteSurveyIssueLine({
        survey: surveyId,
        issue,
        row_type: 'item',
        is_applicable: true,
        sort_order: issueLines.length + 1,
      })
      setIssueLines((prev) => [...prev, created])
      setAddIssueOpen(false)
    } catch (e: unknown) {
      setActionError(parseApiError(e, 'Failed to add row').message)
    }
  }

  // ─── Completeness Calculations ────────────────────────────────────────────────

  const scopeFilledCount = scopeAnswers.filter((a) => a.value_text?.trim()).length
  const scopeTotal = scopeAnswers.length
  const scopePercent = scopeTotal > 0 ? (scopeFilledCount / scopeTotal) * 100 : 0

  const applicableDeployments = shiftDeployments.filter((r) => r.is_applicable !== false && r.line_type !== 'header' && r.line_type !== 'total' && r.line_type !== 'subtotal')
  const deploymentFilledCount = applicableDeployments.filter((r) => r.total_count != null && r.total_count > 0).length
  const deploymentPercent = applicableDeployments.length > 0 ? (deploymentFilledCount / applicableDeployments.length) * 100 : 100

  const applicableLocations = locationLines.filter((r) => r.is_applicable !== false && r.row_type !== 'total' && r.row_type !== 'subtotal')
  const locationFilledCount = applicableLocations.filter((r) => r.proposed_count != null).length
  const locationPercent = applicableLocations.length > 0 ? (locationFilledCount / applicableLocations.length) * 100 : 100

  const applicableEquipment = equipmentLines.filter((r) => r.is_applicable !== false && r.line_type !== 'header' && r.line_type !== 'aggregate')
  const equipmentFilledCount = applicableEquipment.filter((r) => r.unit_count != null).length
  const equipmentPercent = applicableEquipment.length > 0 ? (equipmentFilledCount / applicableEquipment.length) * 100 : 100

  const applicableIssues = issueLines.filter((r) => r.is_applicable !== false)
  const issueFilledCount = applicableIssues.filter((r) => r.improvement_details?.trim()).length
  const issuePercent = applicableIssues.length > 0 ? (issueFilledCount / applicableIssues.length) * 100 : 100

  // ─── Role Mapping Calculations ───────────────────────────────────────────────

  const mappableDeployments = applicableDeployments.filter((r) => !isRoleMappingIgnored(r.description))
  const mappedDeployments = mappableDeployments.filter((r) => findMappingForRow(r.description) !== null)
  const missingMappings = mappableDeployments.filter((r) => findMappingForRow(r.description) === null)
  const ignoredDeployments = applicableDeployments.filter((r) => isRoleMappingIgnored(r.description))

  // ─── Completion Readiness ────────────────────────────────────────────────────

  // Active role requirements generated from this survey
  const activeGeneratedRequirements = generatedRoleRequirements.filter(
    (r) => r.survey === surveyId && r.is_active !== false && r.created_from_survey === true
  )
  const hasGeneratedRoleRequirements = activeGeneratedRequirements.length > 0

  // Blocking errors from last generation attempt (only blocks in current session)
  const hasBlockingGenerationErrors = Boolean(generateResult?.errors.length)

  // Role requirements need regeneration (deployment changed after generation)
  const roleRequirementsNeedRegeneration = roleRequirementsStale

  // Overall completion readiness
  const canCompleteSurvey =
    data?.survey.status === 'in_progress' &&
    hasGeneratedRoleRequirements &&
    !hasBlockingGenerationErrors &&
    !roleRequirementsNeedRegeneration

  // Overall fill progress (average of 5 sections, weighted equally)
  const overallFillProgress = (scopePercent + deploymentPercent + locationPercent + equipmentPercent + issuePercent) / 5

  // ─── Tab Content ──────────────────────────────────────────────────────────────

  function groupByCategory(answers: SiteSurveyScopeAnswer[]): [string, SiteSurveyScopeAnswer[]][] {
    const map = new Map<string, SiteSurveyScopeAnswer[]>()
    for (const a of answers) {
      const cat = a.category ?? 'general'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(a)
    }
    return [...map.entries()]
  }

  const scopeTab = (
    <div className="space-y-6">
      {scopeAnswers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 p-5 mb-4 shadow-sm">
            <ClipboardCheck className="h-8 w-8 text-brand-600" />
          </div>
          <p className="text-base font-medium text-app-secondary">Loading survey questions...</p>
          <p className="mt-1 text-sm text-app-subtle">Please wait while we prepare the form</p>
        </div>
      ) : (
        <>
          {/* Progress indicator */}
          <div className="flex items-center gap-4 rounded-xl bg-gradient-to-r from-brand-50 to-transparent dark:from-brand-900/20 border border-brand-100 dark:border-brand-800/30 px-5 py-4">
            <div className="flex items-center justify-center">
              <ProgressRing percent={scopePercent} size={48} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-app-heading">Scope Details Progress</p>
              <p className="text-xs text-app-secondary mt-0.5">
                {scopeFilledCount} of {scopeTotal} fields completed
              </p>
            </div>
            {scopePercent === 100 && (
              <div className="flex items-center gap-1.5 text-status-success">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">Complete</span>
              </div>
            )}
          </div>

          {/* Form sections */}
          {groupByCategory(scopeAnswers).map(([cat, answers], idx) => (
            <SectionCard
              key={cat}
              title={SCOPE_CATEGORY_LABELS[cat] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              accent={idx === 0 ? 'brand' : 'neutral'}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                {answers.map((a) => {
                  const isLong = (a.field_label?.length ?? 0) > 30 || a.field_key.includes('address') || a.field_key.includes('details') || a.field_key.includes('scope') || a.field_key.includes('others')
                  const saveState = saveStates[`scope-${a.id}`]
                  return (
                    <div key={a.id} className={isLong ? 'sm:col-span-2' : ''}>
                      <div className="relative">
                        <FormField
                          label={a.field_label ?? a.field_key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                          value={a.value_text ?? ''}
                          onChange={(val) => {
                            setScopeAnswers((prev) =>
                              prev.map((x) => (x.id === a.id ? { ...x, value_text: val } : x)),
                            )
                          }}
                          onBlur={() => void saveScopeAnswer(a.id, scopeAnswers.find((x) => x.id === a.id)?.value_text ?? null)}
                          multiline={isLong}
                          disabled={!canUpdate || cat === 'client_scope_site'}
                          className="flex-1"
                        />
                        {saveState && (
                          <div className="absolute top-0 right-0">
                            <SaveIndicator state={saveState} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          ))}
        </>
      )}
    </div>
  )

  const deploymentTab = (
    <div className="space-y-3">
      <SectionCard title="Manpower Deployment" description="Enter headcount for each role by shift">
        {shiftDeployments.length === 0 ? (
          <p className="text-sm text-app-secondary py-6 text-center">No deployment rows configured.</p>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-app-border bg-app-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider w-16"></th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider">Role / Description</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-20">General</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-20">Shift 1</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-20">Shift 2</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-20">Night</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-20">Total</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider w-32">Remarks</th>
                  <th className="px-3 py-2 w-14"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {shiftDeployments.map((row) => {
                  const key = `dep-${row.id}`
                  const isHeader = row.line_type === 'header'
                  const isAgg = row.line_type === 'total' || row.line_type === 'subtotal'
                  const applicable = row.is_applicable !== false
                  const editable = canUpdate && !isHeader && !isAgg

                  if (isHeader) {
                    return (
                      <tr key={row.id} className="bg-brand-50/50">
                        <td colSpan={9} className="px-3 py-2">
                          <span className="text-sm font-semibold text-brand-700">{row.description}</span>
                        </td>
                      </tr>
                    )
                  }

                  if (isAgg) {
                    return (
                      <tr key={row.id} className="bg-app-muted/50 font-medium">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-sm text-app-text">{row.description}</td>
                        <td className="px-3 py-2 text-center text-sm">{formatHeadcount(row.general_count)}</td>
                        <td className="px-3 py-2 text-center text-sm">{formatHeadcount(row.first_shift_count)}</td>
                        <td className="px-3 py-2 text-center text-sm">{formatHeadcount(row.second_shift_count)}</td>
                        <td className="px-3 py-2 text-center text-sm">{formatHeadcount(row.night_shift_count)}</td>
                        <td className="px-3 py-2 text-center text-sm font-semibold">{formatHeadcount(row.total_count)}</td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    )
                  }

                  // Determine mapping/role status for this row
                  const hasLinkedRole = Boolean(row.job_role)
                  const isIgnored = isRoleMappingIgnored(row.description)
                  const mapping = !hasLinkedRole && !isIgnored ? findMappingForRow(row.description) : null

                  return (
                    <tr key={row.id} className={`${!applicable ? 'bg-app-muted/30 opacity-60' : 'hover:bg-app-muted/20'} transition-colors`}>
                      <td className="px-3 py-2">
                        {editable ? (
                          <ApplicableToggle
                            value={applicable}
                            onChange={(v) => void saveDeploymentField(row.id, {
                              is_applicable: v,
                              not_applicable_reason: v ? '' : row.not_applicable_reason ?? '',
                            })}
                          />
                        ) : null}
                      </td>
                      <td className="px-3 py-2">
                        <div>
                          <p className="text-sm text-app-text">{row.job_role_name ?? row.description ?? '—'}</p>
                          {row.job_role_code && <p className="text-xs text-app-subtle">{row.job_role_code}</p>}
                          {row.shift_label ? <p className="text-xs text-app-subtle">{row.shift_label}</p> : null}
                          {!applicable && row.not_applicable_reason ? (
                            <p className="text-xs text-app-subtle italic mt-0.5">{row.not_applicable_reason}</p>
                          ) : null}
                          {/* Role/Mapping status badge */}
                          {applicable && (
                            <div className="mt-1">
                              {hasLinkedRole ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-status-success">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Role linked
                                </span>
                              ) : isIgnored ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-app-subtle">
                                  <Info className="h-3 w-3" />
                                  Template row
                                </span>
                              ) : mapping ? (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-status-success"
                                  title={getMappingTooltip(mapping)}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                  Mapped
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-status-warning">
                                  <AlertCircle className="h-3 w-3" />
                                  Mapping needed
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <NumberInput
                            value={row.general_count}
                            onChange={(v) => setShiftDeployments((prev) => prev.map((r) => r.id === row.id ? { ...r, general_count: v } : r))}
                            onBlur={(v) => void saveDeploymentField(row.id, { general_count: v })}

                          />
                        ) : (
                          <span className="block text-center text-sm text-app-secondary">{formatHeadcount(row.general_count)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <NumberInput
                            value={row.first_shift_count}
                            onChange={(v) => setShiftDeployments((prev) => prev.map((r) => r.id === row.id ? { ...r, first_shift_count: v } : r))}
                            onBlur={(v) => void saveDeploymentField(row.id, { first_shift_count: v })}

                          />
                        ) : (
                          <span className="block text-center text-sm text-app-secondary">{formatHeadcount(row.first_shift_count)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <NumberInput
                            value={row.second_shift_count}
                            onChange={(v) => setShiftDeployments((prev) => prev.map((r) => r.id === row.id ? { ...r, second_shift_count: v } : r))}
                            onBlur={(v) => void saveDeploymentField(row.id, { second_shift_count: v })}

                          />
                        ) : (
                          <span className="block text-center text-sm text-app-secondary">{formatHeadcount(row.second_shift_count)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <NumberInput
                            value={row.night_shift_count}
                            onChange={(v) => setShiftDeployments((prev) => prev.map((r) => r.id === row.id ? { ...r, night_shift_count: v } : r))}
                            onBlur={(v) => void saveDeploymentField(row.id, { night_shift_count: v })}

                          />
                        ) : (
                          <span className="block text-center text-sm text-app-secondary">{formatHeadcount(row.night_shift_count)}</span>
                        )}
                      </td>
                      {/* Total - display only, calculated by backend */}
                      <td className="px-3 py-2">
                        <span className="block text-center text-sm font-medium text-app-text">{formatHeadcount(row.total_count)}</span>
                      </td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <input
                            type="text"
                            value={row.remarks ?? ''}
                            onChange={(e) => setShiftDeployments((prev) => prev.map((r) => r.id === row.id ? { ...r, remarks: e.target.value } : r))}
                            onBlur={(e) => void saveDeploymentField(row.id, { remarks: e.target.value || undefined })}
                            placeholder="Notes..."
                            className="w-full rounded-lg border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text placeholder:text-app-subtle focus:border-brand-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-app-secondary">{row.remarks ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <SaveIndicator state={saveStates[key]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {canUpdate ? (
          <div className="mt-4">
            {addDeploymentOpen ? (
              <div className="rounded-lg border border-app-border bg-app-muted/30 p-4">
                <p className="text-sm font-medium text-app-heading mb-3">Add Role to Deployment</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={selectedJobRoleId}
                    onChange={(e) => setSelectedJobRoleId(e.target.value)}
                    disabled={jobRolesLoading}
                    className="flex-1 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">{jobRolesLoading ? 'Loading roles...' : 'Select a job role...'}</option>
                    {jobRoles.map((role) => (
                      <option key={role.id} value={String(role.id)}>
                        {role.name} ({role.code}) — {role.skill_category_display ?? role.skill_category}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setAddDeploymentOpen(false)
                        setSelectedJobRoleId('')
                      }}
                      className="min-h-9 px-3 text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const roleId = Number(selectedJobRoleId)
                        if (roleId) void handleAddDeploymentRole(roleId)
                      }}
                      disabled={!selectedJobRoleId}
                      className="min-h-9 px-3 text-sm"
                    >
                      Add Role
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <AddRowButton onClick={() => setAddDeploymentOpen(true)} label="Add role" />
            )}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )

  const locationsTab = (
    <div className="space-y-3">
      <SectionCard title="Location Breakdown" description="Enter present and proposed headcount by location">
        {locationLines.length === 0 ? (
          <p className="text-sm text-app-secondary py-6 text-center">No location rows configured.</p>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-app-border bg-app-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider w-16"></th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider">Location</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-24">Present</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-24">Proposed</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider">Remarks</th>
                  <th className="px-3 py-2 w-14"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {locationLines.map((row) => {
                  const key = `loc-${row.id}`
                  const isAgg = row.row_type === 'total' || row.row_type === 'subtotal'
                  const applicable = row.is_applicable !== false
                  const editable = canUpdate && !isAgg

                  if (isAgg) {
                    return (
                      <tr key={row.id} className="bg-app-muted/50 font-medium">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 text-sm text-app-text font-semibold">{row.location_name}</td>
                        <td className="px-3 py-2 text-center text-sm">{row.present_count ?? '—'}</td>
                        <td className="px-3 py-2 text-center text-sm font-semibold">{row.proposed_count ?? '—'}</td>
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2"></td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={row.id} className={`${!applicable ? 'bg-app-muted/30 opacity-60' : 'hover:bg-app-muted/20'} transition-colors`}>
                      <td className="px-3 py-2">
                        {editable ? (
                          <ApplicableToggle
                            value={applicable}
                            onChange={(v) => void saveLocationField(row.id, {
                              is_applicable: v,
                              not_applicable_reason: v ? '' : row.not_applicable_reason ?? '',
                            })}
                          />
                        ) : null}
                      </td>
                      <td className="px-3 py-2 text-sm text-app-text">{row.location_name ?? '—'}</td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <NumberInput
                            value={row.present_count}
                            onChange={(v) => setLocationLines((prev) => prev.map((r) => r.id === row.id ? { ...r, present_count: v } : r))}
                            onBlur={(v) => void saveLocationField(row.id, { present_count: v })}

                          />
                        ) : (
                          <span className="block text-center text-sm text-app-secondary">{row.present_count ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <NumberInput
                            value={row.proposed_count}
                            onChange={(v) => setLocationLines((prev) => prev.map((r) => r.id === row.id ? { ...r, proposed_count: v } : r))}
                            onBlur={(v) => void saveLocationField(row.id, { proposed_count: v })}

                          />
                        ) : (
                          <span className="block text-center text-sm text-app-secondary">{row.proposed_count ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editable && applicable ? (
                          <input
                            type="text"
                            value={row.remarks ?? ''}
                            onChange={(e) => setLocationLines((prev) => prev.map((r) => r.id === row.id ? { ...r, remarks: e.target.value } : r))}
                            onBlur={(e) => void saveLocationField(row.id, { remarks: e.target.value || undefined })}
                            placeholder="Notes..."
                            className="w-full rounded-panel border border-app-border bg-app-surface px-2 py-1 text-xs text-app-text placeholder:text-app-subtle focus:border-brand-500 focus:outline-none"
                          />
                        ) : (
                          <span className="text-xs text-app-secondary">{row.remarks ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <SaveIndicator state={saveStates[key]} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {canUpdate ? (
          <div className="mt-4">
            {addLocationOpen ? (
              <AddRowForm
                placeholder="Location name"
                onCancel={() => setAddLocationOpen(false)}
                onAdd={(val) => void handleAddLocation(val)}
              />
            ) : (
              <AddRowButton onClick={() => setAddLocationOpen(true)} label="Add location" />
            )}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )

  function groupEquipment(lines: SiteSurveyEquipmentLine[]): [string, SiteSurveyEquipmentLine[]][] {
    const map = new Map<string, SiteSurveyEquipmentLine[]>()
    for (const l of lines) {
      const cat = l.equipment_category === 'major' ? 'Major Equipment' : l.equipment_category === 'minor' ? 'Minor Equipment' : 'Other'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(l)
    }
    return [...map.entries()]
  }

  const equipmentTab = (
    <div className="space-y-4">
      {equipmentLines.length === 0 ? (
        <SectionCard title="Equipment">
          <p className="text-sm text-app-secondary py-6 text-center">No equipment rows configured.</p>
        </SectionCard>
      ) : (
        groupEquipment(equipmentLines).map(([cat, lines]) => (
          <SectionCard key={cat} title={cat}>
            <div className="overflow-x-auto -mx-4">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-app-border bg-app-muted/30">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider w-16"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-app-subtle uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-24">Qty</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-app-subtle uppercase tracking-wider w-28">Unit Cost</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-app-subtle uppercase tracking-wider w-28">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-app-subtle uppercase tracking-wider w-24">Amort.</th>
                    <th className="px-3 py-2 w-14"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border">
                  {lines.map((row) => {
                    const key = `eq-${row.id}`
                    const isHeader = row.line_type === 'header'
                    const isAgg = row.line_type === 'aggregate'
                    const applicable = row.is_applicable !== false
                    const editable = canUpdate && !isHeader && !isAgg

                    if (isHeader) {
                      return (
                        <tr key={row.id} className="bg-brand-50/50">
                          <td colSpan={7} className="px-3 py-2">
                            <span className="text-sm font-semibold text-brand-700">{row.description}</span>
                          </td>
                        </tr>
                      )
                    }

                    if (isAgg) {
                      return (
                        <tr key={row.id} className="bg-app-muted/50 font-medium">
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-sm text-app-text font-semibold">{row.description}</td>
                          <td className="px-3 py-2 text-center text-sm">{row.unit_count ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-sm">{row.amount ?? '—'}</td>
                          <td className="px-3 py-2 text-right text-sm font-semibold">{row.total ?? '—'}</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2"></td>
                        </tr>
                      )
                    }

                    return (
                      <tr key={row.id} className={`${!applicable ? 'bg-app-muted/30 opacity-60' : 'hover:bg-app-muted/20'} transition-colors`}>
                        <td className="px-3 py-2">
                          {editable ? (
                            <ApplicableToggle
                              value={applicable}
                              onChange={(v) => void saveEquipmentField(row.id, {
                                is_applicable: v,
                                not_applicable_reason: v ? '' : row.not_applicable_reason ?? '',
                              })}
                            />
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-sm text-app-text">{row.description ?? '—'}</td>
                        <td className="px-3 py-2">
                          {editable && applicable ? (
                            <NumberInput
                              value={row.unit_count}
                              onChange={(v) => setEquipmentLines((prev) => prev.map((r) => r.id === row.id ? { ...r, unit_count: v } : r))}
                              onBlur={(v) => void saveEquipmentField(row.id, { unit_count: v })}
  
                            />
                          ) : (
                            <span className="block text-center text-sm text-app-secondary">{row.unit_count ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {editable && applicable ? (
                            <input
                              type="text"
                              value={row.amount ?? ''}
                              onChange={(e) => setEquipmentLines((prev) => prev.map((r) => r.id === row.id ? { ...r, amount: e.target.value } : r))}
                              onBlur={(e) => void saveEquipmentField(row.id, { amount: e.target.value || null })}
                              className="w-full rounded-panel border border-app-border bg-app-surface px-2 py-1 text-sm text-right text-app-text placeholder:text-app-subtle focus:border-brand-500 focus:outline-none"
                            />
                          ) : (
                            <span className="block text-right text-sm text-app-secondary">{row.amount ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-sm text-app-secondary">{row.total ?? '—'}</td>
                        <td className="px-3 py-2">
                          {editable && applicable ? (
                            <NumberInput
                              value={row.amortisation_months}
                              onChange={(v) => setEquipmentLines((prev) => prev.map((r) => r.id === row.id ? { ...r, amortisation_months: v } : r))}
                              onBlur={(v) => void saveEquipmentField(row.id, { amortisation_months: v })}
                            />
                          ) : (
                            <span className="block text-center text-sm text-app-secondary">{row.amortisation_months ?? '—'}</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <SaveIndicator state={saveStates[key]} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        ))
      )}
      {canUpdate ? (
        <div>
          {addEquipmentOpen ? (
            <AddEquipmentForm
              onCancel={() => setAddEquipmentOpen(false)}
              onAdd={(desc, cat) => void handleAddEquipment(desc, cat)}
            />
          ) : (
            <AddRowButton onClick={() => setAddEquipmentOpen(true)} label="Add equipment" />
          )}
        </div>
      ) : null}
    </div>
  )

  const issuesTab = (
    <div className="space-y-4">
      <SectionCard title="Site Issues & Improvements" description="Document any issues observed and proposed improvements">
        {issueLines.length === 0 ? (
          <p className="text-sm text-app-secondary py-8 text-center">No issues recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {issueLines.map((row) => {
              const key = `iss-${row.id}`
              const applicable = row.is_applicable !== false

              return (
                <div
                  key={row.id}
                  className={`rounded-xl border ${applicable ? 'border-app-border bg-white' : 'border-app-border/50 bg-app-muted/30 opacity-60'} p-4 transition-all`}
                >
                  <div className="flex items-start gap-4">
                    {canUpdate ? (
                      <ApplicableToggle
                        value={applicable}
                        onChange={(v) => void saveIssueField(row.id, {
                          is_applicable: v,
                          not_applicable_reason: v ? '' : row.not_applicable_reason ?? '',
                        })}
                      />
                    ) : null}
                    <div className="flex-1 space-y-3">
                      <div>
                        <p className="text-sm font-medium text-app-text">{row.issue ?? 'Untitled issue'}</p>
                      </div>
                      {applicable ? (
                        <div>
                          <label className="block text-xs font-medium text-app-secondary mb-1.5">Improvement Details</label>
                          {canUpdate ? (
                            <textarea
                              value={row.improvement_details ?? ''}
                              onChange={(e) => setIssueLines((prev) => prev.map((r) => r.id === row.id ? { ...r, improvement_details: e.target.value } : r))}
                              onBlur={(e) => void saveIssueField(row.id, { improvement_details: e.target.value || null })}
                              placeholder="Describe the proposed improvement..."
                              rows={2}
                              className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-subtle resize-none focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                          ) : (
                            <p className="text-sm text-app-secondary">{row.improvement_details ?? '—'}</p>
                          )}
                        </div>
                      ) : row.not_applicable_reason ? (
                        <p className="text-xs text-app-subtle italic">Reason: {row.not_applicable_reason}</p>
                      ) : null}
                    </div>
                    <SaveIndicator state={saveStates[key]} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {canUpdate ? (
          <div className="mt-4">
            {addIssueOpen ? (
              <AddRowForm
                placeholder="Describe the issue..."
                onCancel={() => setAddIssueOpen(false)}
                onAdd={(val) => void handleAddIssue(val)}
                multiline
              />
            ) : (
              <AddRowButton onClick={() => setAddIssueOpen(true)} label="Add issue" />
            )}
          </div>
        ) : null}
      </SectionCard>
    </div>
  )

  const reviewTab = (
    <div className="space-y-6">
      {/* Completeness Overview */}
      <SectionCard title="Survey Completeness">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Scope', percent: scopePercent, filled: scopeFilledCount, total: scopeTotal },
            { label: 'Deployment', percent: deploymentPercent, filled: deploymentFilledCount, total: applicableDeployments.length },
            { label: 'Locations', percent: locationPercent, filled: locationFilledCount, total: applicableLocations.length },
            { label: 'Equipment', percent: equipmentPercent, filled: equipmentFilledCount, total: applicableEquipment.length },
            { label: 'Issues', percent: issuePercent, filled: issueFilledCount, total: applicableIssues.length },
          ].map((item) => (
            <div key={item.label} className="flex flex-col items-center p-4 rounded-xl bg-app-muted/30">
              <ProgressRing percent={item.percent} size={56} />
              <p className="mt-2 text-sm font-medium text-app-text">{item.label}</p>
              <p className="text-xs text-app-secondary">{item.filled} / {item.total}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Survey Owner - only visible to users with assign capability */}
      {canAssignSurveyOwner ? (
        <SectionCard
          title="Survey Owner"
          description="Assign or reassign the operations owner for this site survey."
        >
          <div className="space-y-3">
            {assignUsersLoading ? (
              <div className="flex items-center gap-2 text-sm text-app-secondary">
                <Spinner className="h-4 w-4" />
                <span>Loading eligible users...</span>
              </div>
            ) : assignUsers.length === 0 ? (
              <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-status-warning mt-0.5 shrink-0" />
                  <p className="text-sm text-app-text">
                    No eligible users available. Create an active org-level Operations department and assign internal users to it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-app-secondary mb-1.5">Assign to</label>
                  <select
                    value={assignUserId}
                    onChange={(e) => setAssignUserId(e.target.value)}
                    className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="">Select user...</option>
                    {assignUsers.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.username}{u.department_name ? ` — ${u.department_name}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="secondary"
                    disabled={actionBusy !== null || !assignUserId}
                    onClick={() => void handleAssignOwner()}
                  >
                    {actionBusy === 'assign' ? 'Assigning...' : 'Assign'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}

      {/* Role Mapping Readiness */}
      <SectionCard title="Role Mapping Readiness" description="Status of role defaults for deployment rows">
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-lg border border-app-border bg-app-muted/20 px-3 py-2">
              <CheckCircle2 className="h-5 w-5 text-status-success" />
              <div>
                <p className="text-lg font-semibold text-app-text">{mappedDeployments.length}</p>
                <p className="text-xs text-app-secondary">Mapped</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-app-border bg-app-muted/20 px-3 py-2">
              <AlertCircle className={`h-5 w-5 ${missingMappings.length > 0 ? 'text-status-warning' : 'text-app-subtle'}`} />
              <div>
                <p className="text-lg font-semibold text-app-text">{missingMappings.length}</p>
                <p className="text-xs text-app-secondary">Missing mappings</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-app-border bg-app-muted/20 px-3 py-2">
              <Info className="h-5 w-5 text-app-subtle" />
              <div>
                <p className="text-lg font-semibold text-app-text">{ignoredDeployments.length}</p>
                <p className="text-xs text-app-secondary">Template rows</p>
              </div>
            </div>
          </div>

          {/* Missing mappings list */}
          {missingMappings.length > 0 ? (
            <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-status-warning mt-0.5 shrink-0" />
                <div className="space-y-1.5">
                  <p className="text-sm font-medium text-app-text">Missing role mappings</p>
                  <ul className="space-y-0.5">
                    {missingMappings.map((row) => (
                      <li key={row.id} className="text-xs text-app-secondary">
                        No mapping configured for "{row.description}"
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-app-subtle mt-2">
                    Some rows will fail until mappings are configured. Ask admin to configure survey role mappings.
                  </p>
                </div>
              </div>
            </div>
          ) : mappableDeployments.length > 0 ? (
            <div className="rounded-lg border border-status-success/30 bg-status-success/5 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-status-success" />
                <p className="text-sm text-app-text">All deployment rows have role mappings configured.</p>
              </div>
            </div>
          ) : null}
        </div>
      </SectionCard>

      {/* Generate Role Requirements */}
      <SectionCard
        title="Generate Role Requirements"
        description="Converts deployment headcount into proposal-ready role requirements. Required before completing the survey."
      >
        <div className="space-y-4">
          {/* Helper text */}
          <p className="text-sm text-app-secondary">
            This step maps your deployment rows to job roles and creates requirements for the proposal.
            Survey completion is locked until this step is done.
          </p>

          {/* Role requirements error warning */}
          {roleRequirementsError && (
            <div className="rounded-lg border border-status-warning/20 bg-status-warning/5 p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-status-warning" />
                <p className="text-sm text-app-text">{roleRequirementsError}</p>
              </div>
            </div>
          )}

          {/* Already generated indicator */}
          {hasGeneratedRoleRequirements && !generateResult && !roleRequirementsStale && (
            <div className="rounded-lg border border-status-success/30 bg-status-success/5 p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-status-success" />
                <p className="text-sm text-app-text">
                  {activeGeneratedRequirements.length} role requirement{activeGeneratedRequirements.length !== 1 ? 's' : ''} already generated.
                  You can regenerate to update.
                </p>
              </div>
            </div>
          )}

          {/* Stale warning - deployment changed after generation */}
          {roleRequirementsStale && hasGeneratedRoleRequirements && (
            <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-status-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-app-text">
                    Deployment changed since last generation
                  </p>
                  <p className="text-xs text-app-secondary mt-0.5">
                    Regenerate role requirements to reflect the latest deployment data before completing the survey.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Missing mappings warning */}
          {missingMappings.length > 0 && (
            <div className="rounded-lg border border-status-warning/20 bg-status-warning/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-status-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-app-text">
                    {missingMappings.length} deployment row{missingMappings.length !== 1 ? 's' : ''} need role mapping
                  </p>
                  <p className="text-xs text-app-secondary mt-0.5">
                    These rows will fail during generation until mappings are configured.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Generate button */}
          <Button
            variant="secondary"
            onClick={() => void handleGenerateRoles()}
            disabled={actionBusy !== null || data?.survey.status !== 'in_progress'}
          >
            {actionBusy === 'generate' ? 'Generating...' :
             hasGeneratedRoleRequirements ? 'Regenerate Role Requirements' : 'Generate Role Requirements'}
          </Button>
          {/* Generation Result */}
          {generateResult ? (() => {
            const hasCreated = generateResult.created.length > 0
            const hasUpdated = (generateResult.updated?.length ?? 0) > 0
            const hasSkipped = generateResult.skipped.length > 0
            const hasErrors = generateResult.errors.length > 0
            const totalProcessed = generateResult.created.length + (generateResult.updated?.length ?? 0)
            const isSuccess = totalProcessed > 0 && !hasErrors

            return (
              <div className="space-y-4">
                {/* Status Banner */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  hasErrors
                    ? 'bg-status-danger/10 text-status-danger'
                    : isSuccess
                    ? 'bg-status-success/10 text-status-success'
                    : 'bg-app-muted text-app-secondary'
                }`}>
                  {hasErrors ? (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <Info className="h-4 w-4 shrink-0" />
                  )}
                  <span className="font-medium">
                    {hasErrors
                      ? `${generateResult.errors.length} failed — fix mappings and regenerate`
                      : isSuccess
                      ? `${totalProcessed} role requirement${totalProcessed !== 1 ? 's' : ''} processed`
                      : 'No changes made'}
                  </span>
                </div>

                {/* Created Table */}
                {hasCreated && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-status-success mb-2">
                      Created ({generateResult.created.length})
                    </h4>
                    <div className="rounded-lg border border-app-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-app-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-app-secondary">Role</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-app-secondary">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                          {generateResult.created.map((row) => (
                            <tr key={row.sales_role_requirement_id}>
                              <td className="px-3 py-2 text-app-text">{row.description}</td>
                              <td className="px-3 py-2 text-right text-app-text font-medium">{row.manpower_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Updated Table */}
                {hasUpdated && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-2">
                      Updated ({generateResult.updated?.length ?? 0})
                    </h4>
                    <div className="rounded-lg border border-app-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-app-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-app-secondary">Role</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-app-secondary">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                          {generateResult.updated?.map((row) => (
                            <tr key={row.sales_role_requirement_id}>
                              <td className="px-3 py-2 text-app-text">{row.description}</td>
                              <td className="px-3 py-2 text-right text-app-text font-medium">{row.manpower_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Errors Table */}
                {hasErrors && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-status-danger mb-2">
                      Failed ({generateResult.errors.length})
                    </h4>
                    <div className="rounded-lg border border-status-danger/30 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-status-danger/5">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-status-danger">Role</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-status-danger">Issue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-status-danger/20">
                          {generateResult.errors.map((row, i) => (
                            <tr key={`${row.description}-${row.reason}-${i}`} className="bg-status-danger/5">
                              <td className="px-3 py-2 text-app-text">{row.description}</td>
                              <td className="px-3 py-2 text-status-danger">{roleGenerationReasonLabel(row.reason, row.description)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Skipped Table */}
                {hasSkipped && (
                  <details>
                    <summary className="text-xs font-semibold uppercase tracking-wider text-app-subtle cursor-pointer hover:text-app-secondary mb-2">
                      Skipped ({generateResult.skipped.length}) — click to view
                    </summary>
                    <div className="rounded-lg border border-app-border overflow-hidden mt-2">
                      <table className="w-full text-sm">
                        <thead className="bg-app-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-app-secondary">Role</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-app-secondary">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-app-border">
                          {generateResult.skipped.map((row, i) => (
                            <tr key={`${row.description}-${row.reason}-${i}`}>
                              <td className="px-3 py-2 text-app-secondary">{row.description}</td>
                              <td className="px-3 py-2 text-app-subtle">{roleGenerationReasonLabel(row.reason, row.description)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}

                {/* Success message */}
                {isSuccess && (
                  <p className="text-sm text-status-success">
                    Role requirements generated. You can now complete the survey.
                  </p>
                )}
              </div>
            )
          })() : null}
        </div>
      </SectionCard>

      {/* Complete Survey */}
      {canUpdate && data?.survey.status === 'in_progress' ? (
        <SectionCard title="Complete Survey">
          <div className="space-y-4">
            {/* Readiness checklist */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle">
                Completion Checklist
              </p>
              <ul className="space-y-2">
                {/* Role requirements generated */}
                <li className="flex items-center gap-2 text-sm">
                  {hasGeneratedRoleRequirements ? (
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                  ) : roleRequirementsLoading ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-app-border" />
                  )}
                  <span className={hasGeneratedRoleRequirements ? 'text-app-text' : 'text-app-subtle'}>
                    Role requirements generated ({activeGeneratedRequirements.length})
                  </span>
                </li>

                {/* Role requirements up to date */}
                <li className="flex items-center gap-2 text-sm">
                  {!roleRequirementsNeedRegeneration ? (
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-status-warning" />
                  )}
                  <span className={!roleRequirementsNeedRegeneration ? 'text-app-text' : 'text-status-warning'}>
                    Role requirements are up to date
                  </span>
                </li>

                {/* No blocking errors */}
                <li className="flex items-center gap-2 text-sm">
                  {!hasBlockingGenerationErrors ? (
                    <CheckCircle2 className="h-4 w-4 text-status-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-status-danger" />
                  )}
                  <span className={!hasBlockingGenerationErrors ? 'text-app-text' : 'text-status-danger'}>
                    No blocking role mapping issues
                  </span>
                </li>
              </ul>
            </div>

            {/* Disabled helper messages */}
            {!canCompleteSurvey && (
              <div className="rounded-lg border border-status-warning/30 bg-status-warning/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-status-warning mt-0.5" />
                  <p className="text-sm text-app-text">
                    {!hasGeneratedRoleRequirements
                      ? 'Generate role requirements before marking this survey as completed.'
                      : roleRequirementsNeedRegeneration
                      ? 'Deployment data changed. Regenerate role requirements before completion.'
                      : hasBlockingGenerationErrors
                      ? 'Resolve role mapping issues and regenerate before completion.'
                      : 'Survey must be in progress to complete.'}
                  </p>
                </div>
              </div>
            )}

            {/* Complete button */}
            <Button
              onClick={() => void handleMarkCompleted()}
              disabled={actionBusy !== null || !canCompleteSurvey}
            >
              {actionBusy === 'completed' ? 'Completing...' : 'Mark Survey as Completed'}
            </Button>

            {/* Success hint when ready */}
            {canCompleteSurvey && (
              <p className="text-xs text-app-subtle">
                Completing will notify Sales to proceed with proposal generation.
              </p>
            )}
          </div>
        </SectionCard>
      ) : null}

      {actionError ? (
        <div className="rounded-xl border border-status-danger/30 bg-status-danger/5 p-4">
          <p className="text-sm text-status-danger">{actionError}</p>
        </div>
      ) : null}
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────────

  if (loading || preparing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Spinner />
        <p className="text-sm text-app-secondary animate-pulse">
          {preparing ? 'Preparing survey form...' : 'Loading survey...'}
        </p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="rounded-xl border border-status-danger/30 bg-status-danger/5 p-6 text-center max-w-md">
          <p className="text-sm text-status-danger">{loadError}</p>
          <Button variant="secondary" className="mt-4" onClick={() => void load()}>
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const survey = data.survey
  const status = survey.status

  // ─── Hero Gate for Pending Surveys ─────────────────────────────────────────────
  if (status === 'pending') {
    return (
      <div className="w-full">
        {/* Minimal Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={handleBack}
            className="mb-2 flex items-center gap-1 text-xs text-app-subtle hover:text-app-text transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            {location.pathname.startsWith('/sales/operations-surveys') ? 'Back to queue' : 'Back to lead'}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold text-app-heading">
              {survey.site_name ?? `Site Survey #${survey.id}`}
            </h1>
            <Badge variant={surveyStatusVariant(status)}>{surveyStatusLabel(status)}</Badge>
          </div>
          {survey.lead_client_name && (
            <p className="mt-1 text-sm text-app-secondary">{survey.lead_client_name}</p>
          )}
        </div>

        {/* Hero Gate Card */}
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 dark:from-brand-900/30 dark:via-app-surface dark:to-brand-900/20 p-8 shadow-lg">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 p-5 shadow-lg shadow-brand-500/25">
                  <ClipboardCheck className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 rounded-full bg-white dark:bg-app-surface p-1 shadow-md">
                  <Play className="h-4 w-4 text-brand-600" />
                </div>
              </div>
            </div>

            {/* Title & Description */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-app-heading mb-2">Start Site Survey</h2>
              <p className="text-app-secondary max-w-md mx-auto">
                You're about to begin capturing site details for{' '}
                <span className="font-medium text-app-text">{survey.site_name ?? 'this location'}</span>.
                All changes will be saved automatically as you progress.
              </p>
            </div>

            {/* What you'll capture */}
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-app-subtle text-center mb-4">
                6 Sections to Complete
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: FileText, label: 'Scope', desc: 'Site details' },
                  { icon: Users, label: 'Deployment', desc: 'Manpower' },
                  { icon: MapPin, label: 'Locations', desc: 'Areas' },
                  { icon: Wrench, label: 'Equipment', desc: 'Assets' },
                  { icon: AlertCircle, label: 'Issues', desc: 'Problems' },
                  { icon: CheckCircle2, label: 'Review', desc: 'Summary' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl bg-white dark:bg-app-surface border border-app-border/50 px-3 py-2.5"
                  >
                    <div className="rounded-lg bg-brand-50 dark:bg-brand-900/30 p-2">
                      <item.icon className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-app-text truncate">{item.label}</p>
                      <p className="text-xs text-app-subtle">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Info */}
            <div className="flex flex-wrap justify-center gap-4 text-xs text-app-subtle mb-8">
              {survey.assigned_to_name && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Assigned to {survey.assigned_to_name}
                </span>
              )}
              {survey.due_date && (
                <span className="flex items-center gap-1">
                  <Settings2 className="h-3.5 w-3.5" />
                  Due {formatShortDate(survey.due_date)}
                </span>
              )}
            </div>

            {/* CTA Button */}
            {canUpdate ? (
              <div className="flex flex-col items-center gap-3">
                <Button
                  onClick={() => void handleMarkStarted()}
                  disabled={actionBusy !== null}
                  className="min-h-12 px-8 text-base font-semibold gap-2 shadow-lg shadow-brand-500/20"
                >
                  {actionBusy === 'started' ? (
                    <>
                      <Spinner className="h-5 w-5" />
                      Starting Survey...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      Start Survey Now
                    </>
                  )}
                </Button>
                {actionError && (
                  <p className="text-sm text-status-danger">{actionError}</p>
                )}
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-app-secondary">
                  Waiting for survey to be started by assigned user.
                </p>
              </div>
            )}
          </div>

          {/* Helper text */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-app-subtle">
            <Info className="h-3.5 w-3.5" />
            <span>Auto-saves as you go · Progress tracked per section</span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main Survey View (In Progress / Completed) ────────────────────────────────
  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="mb-1 flex items-center gap-1 text-xs text-app-subtle hover:text-app-text transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            {location.pathname.startsWith('/sales/operations-surveys') ? 'Back to queue' : 'Back to lead'}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-app-text">
              {survey.site_name ?? `Site Survey #${survey.id}`}
            </h1>
            <Badge variant={surveyStatusVariant(status)}>{surveyStatusLabel(status)}</Badge>
          </div>
          {survey.lead_client_name ? (
            <p className="text-sm text-app-secondary">{survey.lead_client_name}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-app-subtle">
            {survey.assigned_to_name ? <span>Assigned to {survey.assigned_to_name}</span> : null}
            {survey.assigned_at ? <span>Assigned {formatShortDate(survey.assigned_at)}</span> : null}
            {survey.due_date ? <span>Due {formatShortDate(survey.due_date)}</span> : null}
            {survey.survey_date ? <span>Survey date {formatShortDate(survey.survey_date)}</span> : null}
          </div>
        </div>
      </div>

      {/* Workflow Stepper */}
      {status === 'in_progress' || status === 'completed' ? (
        <>
          <WorkflowStepper
            fillProgress={overallFillProgress}
            hasGenerated={hasGeneratedRoleRequirements}
            isStale={roleRequirementsNeedRegeneration}
            isCompleted={status === 'completed'}
            canGenerate={canUpdate && status === 'in_progress' && actionBusy === null}
            canComplete={canUpdate && canCompleteSurvey && actionBusy === null}
            onGenerateClick={() => void handleGenerateRoles()}
            onCompleteClick={() => void handleMarkCompleted()}
            generating={actionBusy === 'generate'}
            completing={actionBusy === 'completed'}
          />
          {actionError && (
            <div className="rounded-lg border border-status-danger/30 bg-status-danger/5 px-4 py-2">
              <p className="text-sm text-status-danger">{actionError}</p>
            </div>
          )}
        </>
      ) : null}

      {/* Tabs */}
      <div className="border-b border-app-border">
        <nav className="flex gap-0 overflow-x-auto -mb-px" aria-label="Survey sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-app-secondary hover:text-app-text hover:border-app-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {tab === 'scope' && scopeTab}
        {tab === 'deployment' && deploymentTab}
        {tab === 'locations' && locationsTab}
        {tab === 'equipment' && equipmentTab}
        {tab === 'issues' && issuesTab}
        {tab === 'review' && reviewTab}
      </div>
    </div>
  )
}

// ─── Add Row Forms ────────────────────────────────────────────────────────────

function AddRowForm({
  placeholder,
  onCancel,
  onAdd,
  multiline,
}: {
  placeholder: string
  onCancel: () => void
  onAdd: (value: string) => void
  multiline?: boolean
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim()) {
      onAdd(value.trim())
    }
  }

  const inputClass = 'w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20'

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border-2 border-brand-200 bg-brand-50/50 p-4">
      <div className="space-y-3">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className={inputClass + ' resize-none'}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className={inputClass}
          />
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={!value.trim()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}

function AddEquipmentForm({
  onCancel,
  onAdd,
}: {
  onCancel: () => void
  onAdd: (description: string, category: 'major' | 'minor') => void
}) {
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<'major' | 'minor'>('minor')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (description.trim()) {
      onAdd(description.trim(), category)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border-2 border-brand-200 bg-brand-50/50 p-4">
      <div className="space-y-3">
        <input
          ref={inputRef}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Equipment description"
          className="w-full rounded-lg border border-brand-300 bg-white px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="category"
              checked={category === 'major'}
              onChange={() => setCategory('major')}
              className="h-4 w-4 border-app-border text-brand-600 focus:ring-brand-500"
            />
            Major Equipment
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="category"
              checked={category === 'minor'}
              onChange={() => setCategory('minor')}
              className="h-4 w-4 border-app-border text-brand-600 focus:ring-brand-500"
            />
            Minor Equipment
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={!description.trim()} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  )
}
