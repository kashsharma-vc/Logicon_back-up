import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  IndianRupee,
  Lock,
  Mail,
  Send,
  Users,
} from 'lucide-react'
import {
  cloneProposalRevision,
  convertProposalToMobilisation,
  getProposalVersion,
  getSalesLead,
  listEligibleOperationsOwnersForLead,
  listProposalBudgetLines,
  listProposalBreakupLines,
  listProposalVersions,
  sendProposalToClient,
  submitProposalInternalApproval,
  updateProposalBudgetLine,
  updateProposalBreakupLine,
} from '@/api/sales'
import type { UserRow } from '@/api/users'
import { listAvailableApprovalRoutes } from '@/api/workflow'
import { listMobilisationSetupRequests } from '@/api/mobilisation'
import { ROUTES } from '@/app/routes'
import { useAuthStore } from '@/features/auth/authStore'
import {
  formatDateTime,
  formatShortDate,
  LEAD_TYPE_LABELS,
  leadTypeVariant,
  proposalStatusLabel,
  proposalStatusVariant,
} from '@/features/sales/salesUtils'
import { CAP, hasAllCapabilities, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import type { ApprovalRoutePreview } from '@/features/workflow/types'
import {
  buildBreakupRoleGroups,
  getBreakupComponentStyle,
  getBreakupRoleBandStyle,
  getUnmappedBreakupLines,
} from '@/features/sales/salesBreakupGrouping'
import { cn } from '@/lib/cn'
import type {
  ProposalBudgetLine,
  ProposalBreakupLine,
  ProposalVersion,
  SalesLead,
} from '@/types/sales'

// ─── Constants ────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'budget-lines' | 'salary-breakup' | 'approval' | 'client-response' | 'revision-history'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget-lines', label: 'Budget Lines' },
  { id: 'salary-breakup', label: 'Salary Breakup' },
  { id: 'approval', label: 'Approval' },
  { id: 'client-response', label: 'Client Response' },
  { id: 'revision-history', label: 'Revision History' },
]

const LOCKED_STATUSES = new Set([
  'submitted_internal',
  'pending_internal_approval',
  'internally_approved',
  'sent_to_client',
  'client_approved',
  'client_rejected',
  'client_revision_required',
  'revision_requested',
  'client_negotiation',
  'locked',
])

const CELL =
  'w-full border-0 bg-transparent px-1 py-0.5 text-sm text-app-text focus:outline-none focus:ring-1 focus:ring-brand-500/40 rounded disabled:opacity-40'

// ─── Indian number formatting ──────────────────────────────────────────────────

/**
 * Formats a number with Indian comma grouping (₹1,00,00,000 pattern)
 * and optional decimal places.
 */
function formatIndianNumber(value: string | number | null | undefined): string {
  if (value == null || value === '') return '—'
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value
  if (isNaN(num)) return '—'
  const parts = num.toFixed(2).split('.')
  const intPart = parts[0] ?? '0'
  const decPart = parts[1] ?? '00'
  const lastThree = intPart.slice(-3)
  const rest = intPart.slice(0, -3)
  const formatted = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + (rest ? ',' : '') + lastThree
  return decPart === '00' ? formatted : `${formatted}.${decPart}`
}

function formatIndianCurrency(value: string | number | null | undefined): string {
  const formatted = formatIndianNumber(value)
  return formatted === '—' ? '—' : `₹${formatted}`
}

type RowSaveState = { saving: boolean; error: string | null }

function rowStatus(saveStates: Record<string, RowSaveState>, key: string) {
  const st = saveStates[key]
  if (!st) return null
  if (st.saving) return <span className="text-xs text-app-subtle italic">Saving...</span>
  if (st.error) return (
    <span className="text-xs text-status-danger" title={st.error}>Error</span>
  )
  return null
}

// --- Send-to-client drawer (Gmail-style compose) --------------------------------

function buildDefaultEmailSubject(proposal: ProposalVersion, lead: SalesLead): string {
  return `Proposal v${proposal.version_number} for ${lead.client_name} - review and response`
}

function buildDefaultEmailBody(
  proposal: ProposalVersion,
  lead: SalesLead,
  recipientName: string,
): string {
  const greeting = recipientName.trim() || lead.client_contact_person?.trim() || 'there'
  const grandTotal = formatIndianCurrency(proposal.grand_total)
  return [
    `Hello ${greeting},`,
    '',
    `Please review the commercial proposal prepared for ${lead.client_name}.`,
    '',
    `Proposal version: v${proposal.version_number}`,
    `Grand total: ${grandTotal}`,
    '',
    'You can review the proposal and submit your response using the secure link below.',
  ].join('\n')
}

type SendToClientMode = 'send' | 'resend'

function clientHasResponded(proposal: ProposalVersion): boolean {
  const status = proposal.client_approval_status?.trim().toLowerCase()
  if (!status || status === 'not_sent' || status === 'pending') return false
  return true
}

function canInitialSendProposal(proposal: ProposalVersion, canSendCap: boolean): boolean {
  return canSendCap && proposal.status === 'internally_approved'
}

function canResendProposal(proposal: ProposalVersion, canSendCap: boolean): boolean {
  return (
    canSendCap &&
    proposal.status === 'sent_to_client' &&
    proposal.client_approval_status === 'pending'
  )
}

function getClientSendBlocker(proposal: ProposalVersion, canSendCap: boolean): string {
  if (!canSendCap) {
    return 'You do not have permission to send proposals to clients.'
  }
  if (clientHasResponded(proposal)) {
    return 'Client has already responded. Resend is not available.'
  }
  if (proposal.status === 'internally_approved') {
    return 'You do not have permission to send proposals to clients.'
  }
  if (proposal.status === 'sent_to_client' && proposal.client_approval_status !== 'pending') {
    return 'Client has already responded. Resend is not available.'
  }
  const preSendStatuses = new Set([
    'draft',
    'generated',
    'submitted_internal',
    'pending_internal_approval',
    'internal_approval',
    'sales_review',
    'budget_generated',
  ])
  if (preSendStatuses.has(proposal.status)) {
    return 'Proposal must complete internal approval before it can be sent to the client.'
  }
  return `Proposal cannot be sent in its current status (${proposalStatusLabel(proposal.status)}).`
}

// Gmail-style input class - clean underline style
const gmailInputClass =
  'w-full border-0 border-b border-[#dadce0] bg-transparent py-2 text-[14px] text-[#202124] placeholder:text-[#5f6368] focus:border-b-2 focus:border-[#1a73e8] focus:outline-none transition-colors dark:text-app-text dark:border-app-border dark:focus:border-brand-500'

function GmailComposeRow({
  label,
  children,
  error,
}: {
  label: string
  children: ReactNode
  error?: string | null
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-1">
      <span className="w-16 shrink-0 text-[13px] text-[#5f6368] dark:text-app-subtle">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
      {error ? <p className="text-[12px] text-[#d93025]">{error}</p> : null}
    </div>
  )
}

function SendToClientDrawer({
  open,
  onClose,
  onSent,
  proposalId,
  proposal,
  lead,
  mode,
}: {
  open: boolean
  onClose: () => void
  onSent: (updated: ProposalVersion) => void
  proposalId: number
  proposal: ProposalVersion | null
  lead: SalesLead | null
  mode: SendToClientMode
}) {
  const isResend = mode === 'resend'
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [days, setDays] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    subject?: string
    message?: string
    days?: string
  }>({})

  useEffect(() => {
    if (!open || !lead || !proposal) return
    const contact = lead.client_contact_person ?? ''
    setEmail(lead.client_email ?? '')
    setName(contact)
    setDays('')
    setSubject(buildDefaultEmailSubject(proposal, lead))
    setMessage(buildDefaultEmailBody(proposal, lead, contact))
    setApiError(null)
    setFieldErrors({})
  }, [open, lead, proposal])

  function validate(): boolean {
    const next: typeof fieldErrors = {}
    const trimmedEmail = email.trim()
    const trimmedSubject = subject.trim()
    const trimmedMessage = message.trim()

    if (!trimmedEmail) next.email = 'Recipient email is required.'
    if (!trimmedSubject) next.subject = 'Email subject is required.'
    else if (/[\r\n]/.test(trimmedSubject)) next.subject = 'Subject must be a single line.'
    else if (trimmedSubject.length > 255) next.subject = 'Subject must be 255 characters or fewer.'

    if (!trimmedMessage) next.message = 'Email message is required.'
    else if (trimmedMessage.length > 5000) next.message = 'Message must be 5000 characters or fewer.'

    if (days.trim()) {
      const n = Number(days)
      if (!Number.isFinite(n) || n <= 0) next.days = 'Link expiry must be a positive number.'
    }

    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setApiError(null)
    try {
      const result = await sendProposalToClient(proposalId, {
        recipient_email: email.trim(),
        recipient_name: name.trim() || undefined,
        expires_days: days.trim() ? Number(days) : undefined,
        email_subject: subject.trim(),
        email_body: message.trim(),
      })
      onSent(result.proposal)
    } catch (err: unknown) {
      setApiError(parseApiError(err, 'Failed to send proposal').message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      title={
        <span className="inline-flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-[#ea4335]">
            <Mail className="h-4 w-4 text-white" />
          </span>
          <span className="text-[#202124] dark:text-app-text">{isResend ? 'Resend proposal' : 'New Message'}</span>
        </span>
      }
      description="Review the email draft before sending."
      panelClassName="max-w-[600px]"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between border-t border-[#dadce0] bg-[#f8f9fa] px-4 py-3 dark:bg-app-muted dark:border-app-border">
          <div className="flex items-center gap-3">
            <button
              form="send-to-client-form"
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded bg-[#1a73e8] px-6 py-2 text-[14px] font-medium text-white shadow-sm transition-all hover:bg-[#1557b0] hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" aria-hidden />
              {submitting ? 'Sending...' : 'Send'}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-[14px] font-medium text-[#d93025] hover:text-[#a50e0e] disabled:opacity-50 transition-colors"
          >
            Discard
          </button>
        </div>
      }
    >
      <form
        id="send-to-client-form"
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col h-full"
      >
        {/* API Error */}
        {apiError ? (
          <div className="mx-4 mb-3 rounded border-l-4 border-[#d93025] bg-[#fce8e6] px-3 py-2 text-[13px] text-[#d93025]">
            {apiError}
          </div>
        ) : null}

        {/* Form Fields - Gmail style */}
        <div className="border-b border-[#dadce0] dark:border-app-border">
          {/* To Field with chip */}
          <GmailComposeRow label="To" error={fieldErrors.email}>
            {email ? (
              <div className="flex items-center gap-2 py-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0fe] px-3 py-1 text-[13px] text-[#1a73e8] dark:bg-brand-500/20 dark:text-brand-400">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1a73e8] text-[10px] font-medium text-white dark:bg-brand-500">
                    {(name || email).charAt(0).toUpperCase()}
                  </span>
                  {email}
                </span>
                <input
                  id="stc-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sr-only"
                />
              </div>
            ) : (
              <input
                id="stc-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Recipients"
                className={gmailInputClass}
              />
            )}
          </GmailComposeRow>

          {/* Name Field */}
          <GmailComposeRow label="Name">
            <input
              id="stc-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name"
              className={gmailInputClass}
            />
          </GmailComposeRow>

          {/* Subject Field */}
          <GmailComposeRow label="Subject" error={fieldErrors.subject}>
            <input
              id="stc-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              maxLength={255}
              className={gmailInputClass}
            />
          </GmailComposeRow>

          {/* Expires Field */}
          <GmailComposeRow label="Expires" error={fieldErrors.days}>
            <input
              id="stc-days"
              type="number"
              min={1}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              placeholder="Days (optional)"
              className={gmailInputClass}
            />
          </GmailComposeRow>
        </div>

        {/* Message Body - Gmail style */}
        <div className="flex-1 flex flex-col min-h-0">
          <textarea
            id="stc-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Compose email"
            maxLength={5000}
            className="flex-1 min-h-[280px] resize-none border-0 bg-white px-4 py-4 text-[14px] leading-relaxed text-[#202124] placeholder:text-[#5f6368] focus:outline-none dark:bg-app-surface dark:text-app-text"
          />
          <div className="flex items-center justify-between border-t border-[#dadce0] bg-[#f8f9fa] px-4 py-2 dark:bg-app-muted dark:border-app-border">
            {fieldErrors.message ? (
              <p className="text-[12px] text-[#d93025]">{fieldErrors.message}</p>
            ) : (
              <p className="text-[11px] text-[#5f6368] dark:text-app-subtle">
                {message.length}/5000
              </p>
            )}
            <p className="text-[11px] text-[#5f6368] dark:text-app-subtle">
              Secure link appended automatically
            </p>
          </div>
        </div>
      </form>
    </Drawer>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SalesProposalWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const proposalId = Number(id)
  const navigate = useNavigate()
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canUpdate = hasAnyCapability(meCaps, [CAP.SALES_PROPOSAL_UPDATE])
  const canSendToClient = hasAnyCapability(meCaps, [CAP.SALES_PROPOSAL_SEND_TO_CLIENT])
  const canConvertToMobilisation = hasAllCapabilities(meCaps, [
    CAP.SALES_PROPOSAL_UPDATE,
    CAP.MOBILISATION_CREATE,
  ])

  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [proposal, setProposal] = useState<ProposalVersion | null>(null)
  const [budgetLines, setBudgetLines] = useState<ProposalBudgetLine[]>([])
  const [breakupLines, setBreakupLines] = useState<ProposalBreakupLine[]>([])
  const [lead, setLead] = useState<SalesLead | null>(null)
  const [approvalRoutes, setApprovalRoutes] = useState<ApprovalRoutePreview[]>([])
  const [allVersions, setAllVersions] = useState<ProposalVersion[]>([])

  const [tab, setTab] = useState<TabId>('overview')
  const [saveStates, setSaveStates] = useState<Record<string, RowSaveState>>({})

  // Approval tab state
  const [selectedRoute, setSelectedRoute] = useState('')
  const [approvalBusy, setApprovalBusy] = useState(false)
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const [approvalSuccess, setApprovalSuccess] = useState(false)

  // Send to client
  const [sendDrawerOpen, setSendDrawerOpen] = useState(false)
  const [sendDrawerMode, setSendDrawerMode] = useState<SendToClientMode>('send')
  const [clientSendSuccess, setClientSendSuccess] = useState<string | null>(null)

  function openSendDrawer(mode: SendToClientMode) {
    setSendDrawerMode(mode)
    setClientSendSuccess(null)
    setSendDrawerOpen(true)
  }

  // Clone state
  const [cloneBusy, setCloneBusy] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)

  // Convert to mobilisation state
  const [convertBusy, setConvertBusy] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)
  const [convertDrawerOpen, setConvertDrawerOpen] = useState(false)
  const [operationsOwner, setOperationsOwner] = useState('')
  const [opsUsers, setOpsUsers] = useState<UserRow[]>([])
  const [opsUsersLoading, setOpsUsersLoading] = useState(false)
  const [opsUsersError, setOpsUsersError] = useState<string | null>(null)
  const [convertValidationError, setConvertValidationError] = useState<string | null>(null)
  const [mobilisationHandoff, setMobilisationHandoff] = useState<{
    id: number
    ownerName: string
  } | null>(null)

  const isLocked = proposal ? LOCKED_STATUSES.has(proposal.status) : true
  const canEdit = canUpdate && !isLocked

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const [propResult, budgetResult, breakupResult, mobResult] = await Promise.all([
        getProposalVersion(proposalId),
        listProposalBudgetLines({ proposal_version: proposalId }),
        listProposalBreakupLines({ proposal_version: proposalId }),
        listMobilisationSetupRequests({ source_proposal_version: Number(proposalId) }).catch(() => ({ items: [] as any[] })),
      ])
      setProposal(propResult)
      setBudgetLines(budgetResult.items)
      setBreakupLines(breakupResult.items)
      setSaveStates({})

      if (mobResult.items && mobResult.items.length > 0) {
        const mob = mobResult.items[0]
        setMobilisationHandoff({
          id: mob.id,
          ownerName: mob.assigned_operations_owner_username ?? 'operations team',
        })
      } else {
        setMobilisationHandoff(null)
      }

      const leadId = propResult.lead
      const [leadResult, versionsResult] = await Promise.all([
        getSalesLead(leadId),
        listProposalVersions({ lead: leadId }),
      ])
      setLead(leadResult)
      setAllVersions(versionsResult.items.sort((a, b) => b.version_number - a.version_number))

      try {
        const routesResult = await listAvailableApprovalRoutes({ trigger_type: 'sales_proposal' })
        setApprovalRoutes(routesResult.results)
      } catch {
        // approval routes are optional — silently skip
      }
    } catch (e: unknown) {
      setLoadError(parseApiError(e, 'Failed to load proposal').message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId])

  // ── Row save helpers ───────────────────────────────────────────────────────

  function setSaving(key: string, saving: boolean, error: string | null = null) {
    setSaveStates((prev) => ({ ...prev, [key]: { saving, error } }))
  }

  async function saveBudgetField(rowId: number, payload: Partial<ProposalBudgetLine>) {
    const key = `bl-${rowId}`
    setSaving(key, true)
    try {
      const updated = await updateProposalBudgetLine(rowId, payload)
      setBudgetLines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSaving(key, false)
    } catch (e: unknown) {
      const msg = parseApiError(e, 'Save failed').message
      const isLockMsg = /lock/i.test(msg) ? 'Proposal is locked. Create a revision to edit.' : msg
      setSaving(key, false, isLockMsg)
    }
  }

  async function saveBreakupField(rowId: number, payload: Partial<ProposalBreakupLine>) {
    const key = `brk-${rowId}`
    setSaving(key, true)
    try {
      const updated = await updateProposalBreakupLine(rowId, payload)
      setBreakupLines((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      setSaving(key, false)
    } catch (e: unknown) {
      const msg = parseApiError(e, 'Save failed').message
      const isLockMsg = /lock/i.test(msg) ? 'Proposal is locked. Create a revision to edit.' : msg
      setSaving(key, false, isLockMsg)
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  async function handleSubmitApproval() {
    if (!proposal) return
    const unmappedBreakupLines = getUnmappedBreakupLines(breakupLines)
    if (unmappedBreakupLines.length > 0) {
      setApprovalError(
        'Salary breakup is missing role mapping. Regenerate this proposal before submitting for approval.',
      )
      return
    }
    setApprovalBusy(true)
    setApprovalError(null)
    setApprovalSuccess(false)
    try {
      const updated = await submitProposalInternalApproval(proposal.id, {
        approval_route: selectedRoute ? Number(selectedRoute) : null,
      })
      setProposal(updated)
      setApprovalSuccess(true)
    } catch (e: unknown) {
      setApprovalError(parseApiError(e, 'Submission failed').message)
    } finally {
      setApprovalBusy(false)
    }
  }

  async function handleClone() {
    if (!proposal) return
    setCloneBusy(true)
    setCloneError(null)
    try {
      const cloned = await cloneProposalRevision(proposal.id)
      navigate(ROUTES.SALES_PROPOSAL_DETAIL(cloned.id))
    } catch (e: unknown) {
      setCloneError(parseApiError(e, 'Clone failed').message)
      setCloneBusy(false)
    }
  }

  async function handleConvert(operationsOwnerId: number) {
    if (!proposal) return
    setConvertBusy(true)
    setConvertError(null)
    try {
      const result = await convertProposalToMobilisation(proposal.id, { operations_owner: operationsOwnerId })
      const owner = opsUsers.find((u) => u.id === operationsOwnerId)
      setMobilisationHandoff({
        id: result.id,
        ownerName: owner?.username ?? 'operations team',
      })
      setConvertDrawerOpen(false)
    } catch (e: unknown) {
      setConvertError(parseApiError(e, 'Conversion failed').message)
    } finally {
      setConvertBusy(false)
    }
  }

  useEffect(() => {
    if (!convertDrawerOpen || !proposal?.lead) return
    let cancelled = false
    void (async () => {
      setOpsUsersLoading(true)
      setOpsUsersError(null)
      try {
        const res = await listEligibleOperationsOwnersForLead(Number(proposal.lead))
        if (!cancelled) setOpsUsers(res.items)
      } catch (e: unknown) {
        if (!cancelled) setOpsUsersError(parseApiError(e, 'Could not load operations owners').message)
      } finally {
        if (!cancelled) setOpsUsersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [convertDrawerOpen, proposal?.lead])

  // ── Tab: Overview ──────────────────────────────────────────────────────────

  function overviewTab() {
    if (!proposal) return null
    const financials = [
      { label: 'Total manpower', value: proposal.manpower_total != null ? String(proposal.manpower_total) : '—', icon: Users, highlight: false },
      { label: 'Subtotal', value: formatIndianCurrency(proposal.subtotal_amount), icon: IndianRupee, highlight: false },
      { label: 'Management fee', value: formatIndianCurrency(proposal.management_fee_amount), icon: IndianRupee, highlight: false },
      { label: 'GST', value: formatIndianCurrency(proposal.gst_amount), icon: IndianRupee, highlight: false },
      { label: 'Grand total', value: formatIndianCurrency(proposal.grand_total), icon: IndianRupee, highlight: true },
    ]
    return (
      <div className="space-y-6">
        {/* Financials */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <IndianRupee className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Financial Summary</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {financials.map(({ label, value, icon: Icon, highlight }) => (
              <div
                key={label}
                className={`rounded-xl border p-4 shadow-sm transition-all hover:shadow-md ${
                  highlight
                    ? 'border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:border-brand-800 dark:from-brand-900/20 dark:to-brand-900/10'
                    : 'border-app-border bg-app-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-lg font-bold ${highlight ? 'text-brand-700 dark:text-brand-400' : 'text-app-text'}`}>
                      {value}
                    </p>
                    <p className={`mt-1 text-xs ${highlight ? 'text-brand-600/70 dark:text-brand-500/70' : 'text-app-subtle'}`}>{label}</p>
                  </div>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    highlight ? 'bg-brand-500/10 text-brand-600' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Status */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <CheckCircle2 className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Status Overview</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
              <p className="text-xs text-app-subtle mb-2">Proposal status</p>
              <Badge variant={proposalStatusVariant(proposal.status)} className="text-xs">
                {proposalStatusLabel(proposal.status)}
              </Badge>
            </div>
            {proposal.client_approval_status ? (
              <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                <p className="text-xs text-app-subtle mb-2">Client response</p>
                <Badge variant={proposalStatusVariant(proposal.client_approval_status)} className="text-xs">
                  {proposalStatusLabel(proposal.client_approval_status)}
                </Badge>
              </div>
            ) : null}
            <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-app-subtle" />
                <div>
                  <p className="text-xs text-app-subtle">Last updated</p>
                  <p className="text-sm font-medium text-app-text">{formatDateTime(proposal.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Source */}
        {lead ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                <FileText className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Source Lead</h3>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-app-text">{lead.client_name}</p>
                  {lead.existing_client_name ? (
                    <p className="text-xs text-app-subtle mt-0.5">{lead.existing_client_name}</p>
                  ) : null}
                  {lead.sales_person_name ? (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-app-secondary">
                      <Users className="h-3 w-3" />
                      Owner: <span className="font-medium">{lead.sales_person_name}</span>
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Badge variant={leadTypeVariant(lead.lead_type)} className="text-xs">{LEAD_TYPE_LABELS[lead.lead_type]}</Badge>
                  <Button
                    variant="secondary"
                    className="min-h-8 px-3 text-xs rounded-lg"
                    onClick={() => navigate(ROUTES.SALES_LEAD_DETAIL(lead.id))}
                  >
                    <ArrowLeft className="mr-1 h-3 w-3 rotate-180" />
                    View lead
                  </Button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* Notes */}
        {proposal.notes ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10">
                <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Notes</h3>
            </div>
            <div className="rounded-xl border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-4 shadow-sm">
              <p className="whitespace-pre-line text-sm text-app-text leading-relaxed">{proposal.notes}</p>
            </div>
          </section>
        ) : null}

        {/* CTAs */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <Send className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Quick Actions</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit ? (
              <Button variant="secondary" className="rounded-lg" onClick={() => setTab('budget-lines')}>
                <FileText className="mr-1.5 h-4 w-4" />
                Edit budget lines
              </Button>
            ) : null}
            {canUpdate && !isLocked ? (
              <Button variant="secondary" className="rounded-lg" onClick={() => setTab('approval')}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Submit for approval
              </Button>
            ) : null}
            {canSendToClient && proposal.status === 'internally_approved' ? (
              <Button className="rounded-lg bg-emerald-600 hover:bg-emerald-700" onClick={() => setTab('client-response')}>
                <Send className="mr-1.5 h-4 w-4" />
                Send to client
              </Button>
            ) : null}
            {canUpdate && isLocked ? (
              <Button variant="secondary" className="rounded-lg" onClick={() => void handleClone()} disabled={cloneBusy}>
                <FileText className="mr-1.5 h-4 w-4" />
                {cloneBusy ? 'Creating...' : 'Create revision'}
              </Button>
            ) : null}
          </div>
          {cloneError ? <p className="mt-2 text-sm text-status-danger">{cloneError}</p> : null}
        </section>

        <p className="flex items-center gap-1.5 text-xs text-app-subtle">
          <FileText className="h-3 w-3" />
          Calculation rules are managed separately.
        </p>
      </div>
    )
  }

  // ── Tab: Budget Lines ──────────────────────────────────────────────────────

  function budgetLinesTab() {
    // Calculate totals for display
    const totalManpower = budgetLines.reduce((sum, r) => sum + (r.manpower_count ?? 0), 0)
    const totalCost = budgetLines.reduce((sum, r) => {
      const cost = typeof r.total_cost === 'string' ? parseFloat(r.total_cost.replace(/,/g, '')) : (r.total_cost ?? 0)
      return sum + (isNaN(cost) ? 0 : cost)
    }, 0)

    return (
      <div className="space-y-4">
        {isLocked ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Proposal is locked — create a revision to edit.</span>
          </div>
        ) : null}

        {budgetLines.length === 0 ? (
          <EmptyState title="No budget lines" description="Budget lines will appear here once added by the backend." />
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                    <Users className="h-4 w-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-app-text">{totalManpower}</p>
                    <p className="text-xs text-app-subtle">Total Manpower</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                    <IndianRupee className="h-4 w-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-app-text">{formatIndianCurrency(totalCost)}</p>
                    <p className="text-xs text-app-subtle">Total Cost</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10">
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-app-text">{budgetLines.length}</p>
                    <p className="text-xs text-app-subtle">Budget Lines</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-xl border border-app-border shadow-sm">
              <Table>
                <THead>
                  <TR className="bg-slate-50 dark:bg-slate-800/50">
                    <TH className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">Role / Service</TH>
                    <TH className="py-3 px-4 text-center text-xs font-semibold uppercase tracking-wider text-app-subtle">Manpower</TH>
                    <TH className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-app-subtle">Unit Cost</TH>
                    <TH className="py-3 px-4 text-right text-xs font-semibold uppercase tracking-wider text-app-subtle">Total Cost</TH>
                    <TH className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">Remarks</TH>
                    <TH className="py-3 px-4 w-16">{''}</TH>
                  </TR>
                </THead>
                <TBody>
                  {budgetLines.map((row, idx) => {
                    const key = `bl-${row.id}`
                    return (
                      <TR key={row.id} className={`transition-colors hover:bg-app-muted/50 ${idx % 2 === 0 ? 'bg-app-surface' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                        <TD className="py-3 px-4">
                          <p className="text-sm font-medium text-app-text">{row.job_role_name ?? '—'}</p>
                          {row.site_name ? (
                            <p className="text-xs text-app-subtle">{row.site_name}</p>
                          ) : null}
                        </TD>
                        <TD className="py-2 px-4 text-center">
                          {canEdit ? (
                            <input
                              type="number"
                              className={CELL + ' text-center w-16 mx-auto rounded-lg border border-transparent hover:border-app-border focus:border-brand-500'}
                              value={row.manpower_count ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : Number(e.target.value)
                                setBudgetLines((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, manpower_count: val } : r)),
                                )
                              }}
                              onBlur={(e) =>
                                void saveBudgetField(row.id, {
                                  manpower_count: e.currentTarget.value === '' ? null : Number(e.currentTarget.value),
                                })
                              }
                            />
                          ) : (
                            <span className="inline-flex h-7 w-12 items-center justify-center rounded-lg bg-brand-50 text-sm font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">{row.manpower_count ?? '—'}</span>
                          )}
                        </TD>
                        <TD className="py-2 px-4 text-right">
                          {canEdit ? (
                            <input
                              className={CELL + ' text-right w-28 ml-auto rounded-lg border border-transparent hover:border-app-border focus:border-brand-500'}
                              value={row.unit_cost ?? ''}
                              onChange={(e) => {
                                const val = e.target.value
                                setBudgetLines((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, unit_cost: val } : r)),
                                )
                              }}
                              onBlur={(e) =>
                                void saveBudgetField(row.id, { unit_cost: e.currentTarget.value || null })
                              }
                            />
                          ) : (
                            <span className="text-sm font-medium text-app-secondary">{formatIndianCurrency(row.unit_cost)}</span>
                          )}
                        </TD>
                        <TD className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">{formatIndianCurrency(row.total_cost)}</span>
                        </TD>
                        <TD className="py-2 px-4">
                          {canEdit ? (
                            <input
                              className={CELL + ' w-full rounded-lg border border-transparent hover:border-app-border focus:border-brand-500'}
                              value={row.remarks ?? ''}
                              placeholder="Add remarks..."
                              onChange={(e) => {
                                const val = e.target.value
                                setBudgetLines((prev) =>
                                  prev.map((r) => (r.id === row.id ? { ...r, remarks: val } : r)),
                                )
                              }}
                              onBlur={(e) =>
                                void saveBudgetField(row.id, { remarks: e.currentTarget.value || undefined })
                              }
                            />
                          ) : (
                            <span className="text-sm text-app-secondary">{row.remarks ?? '—'}</span>
                          )}
                        </TD>
                        <TD className="py-3 px-4 text-right">{rowStatus(saveStates, key)}</TD>
                      </TR>
                    )
                  })}
                </TBody>
              </Table>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Tab: Salary Breakup ────────────────────────────────────────────────────

  function salaryBreakupTab() {
    const roleGroups = buildBreakupRoleGroups(breakupLines, budgetLines)
    const unmappedBreakupLines = getUnmappedBreakupLines(breakupLines)

    return (
      <div className="space-y-5">
        {isLocked ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <Lock className="h-4 w-4 shrink-0" />
            <span>Proposal is locked — create a revision to edit.</span>
          </div>
        ) : null}

        {unmappedBreakupLines.length > 0 ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            <p className="font-semibold">Salary breakup is missing role mapping.</p>
            <p className="mt-1">
              {unmappedBreakupLines.length} component
              {unmappedBreakupLines.length !== 1 ? 's are' : ' is'} not linked to a role requirement.
              Regenerate this proposal so every salary component is tied to a role before review.
            </p>
          </div>
        ) : breakupLines.length === 0 ? (
          <EmptyState title="No salary breakup lines" description="Breakup lines will appear here once computed by the backend." />
        ) : (
          <>
            <p className="text-xs text-app-subtle">
              {roleGroups.length} role{roleGroups.length !== 1 ? 's' : ''} · {breakupLines.length} component
              {breakupLines.length !== 1 ? 's' : ''}
            </p>

            <div className="space-y-6">
              {roleGroups.map((roleGroup, roleIndex) => {
                const band = getBreakupRoleBandStyle(roleIndex, roleGroup.groupKey)
                const metaParts: string[] = []
                if (roleGroup.siteName) metaParts.push(`Site: ${roleGroup.siteName}`)
                if (roleGroup.headcount != null) {
                  metaParts.push(`Headcount: ${roleGroup.headcount}`)
                }
                if (roleGroup.totalCost != null) {
                  metaParts.push(`Budget total: ${formatIndianCurrency(roleGroup.totalCost)}`)
                } else if (roleGroup.unitCost != null) {
                  metaParts.push(`Unit: ${formatIndianCurrency(roleGroup.unitCost)}`)
                }

                return (
                  <section
                    key={roleGroup.groupKey}
                    className={cn(
                      'overflow-hidden rounded-xl border border-l-4 shadow-sm',
                      band.border,
                      band.borderAccent,
                    )}
                  >
                    <div className={cn('border-b px-4 py-3.5', band.headerBorder, band.headerBg)}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={cn(
                              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                              band.iconBg,
                            )}
                          >
                            <Users className={cn('h-5 w-5', band.iconText)} aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <h3 className={cn('text-base font-semibold', band.titleText)}>{roleGroup.title}</h3>
                            {metaParts.length > 0 ? (
                              <p className={cn('mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs', band.metaText)}>
                                {metaParts.map((part) => (
                                  <span key={part}>{part}</span>
                                ))}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="shrink-0 rounded-lg border border-app-border/60 bg-app-surface/80 px-3 py-2 text-left sm:text-right dark:bg-app-surface/40">
                          <p className={cn('text-base font-bold tabular-nums', band.totalText)}>
                            {formatIndianCurrency(roleGroup.total)}
                          </p>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-app-subtle">
                            Role total
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={cn('divide-y divide-app-border/80', band.bodyBg)}>
                      {roleGroup.sections.map((section) => {
                        const style = getBreakupComponentStyle(section.componentType)
                        return (
                          <div key={`${roleGroup.groupKey}-${section.componentType}`}>
                            <div
                              className={`flex items-center justify-between border-b px-4 py-2.5 ${style.border} bg-app-muted/30`}
                            >
                              <h4 className={`text-xs font-semibold uppercase tracking-wider ${style.text}`}>
                                {section.label}
                              </h4>
                              <p className={`text-sm font-semibold ${style.text}`}>
                                {formatIndianCurrency(section.total)}
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <Table>
                                <THead>
                                  <TR className="bg-slate-50/50 dark:bg-slate-800/30">
                                    <TH className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">
                                      Component
                                    </TH>
                                    <TH className="w-28 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-app-subtle">
                                      Percentage
                                    </TH>
                                    <TH className="w-32 px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-app-subtle">
                                      Amount
                                    </TH>
                                    <TH className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">
                                      Notes
                                    </TH>
                                    <TH className="w-14 px-4 py-2">{''}</TH>
                                  </TR>
                                </THead>
                                <TBody>
                                  {section.rows.map((row, idx) => {
                                    const key = `brk-${row.id}`
                                    return (
                                      <TR
                                        key={row.id}
                                        className={`transition-colors hover:bg-app-muted/50 ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-slate-800/10'}`}
                                      >
                                        <TD className="px-4 py-2.5">
                                          <p className="text-sm font-medium text-app-text">
                                            {row.component_name ?? '—'}
                                          </p>
                                        </TD>
                                        <TD className="px-4 py-2.5 text-right">
                                          {row.percentage != null && row.percentage !== '' ? (
                                            <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                                              {row.percentage}%
                                            </span>
                                          ) : (
                                            <span className="text-sm text-app-subtle">—</span>
                                          )}
                                        </TD>
                                        <TD className="px-4 py-2 text-right">
                                          {canEdit ? (
                                            <input
                                              className={
                                                CELL +
                                                ' ml-auto w-28 rounded-lg border border-transparent text-right hover:border-app-border focus:border-brand-500'
                                              }
                                              value={row.amount ?? ''}
                                              onChange={(e) => {
                                                const val = e.target.value
                                                setBreakupLines((prev) =>
                                                  prev.map((r) => (r.id === row.id ? { ...r, amount: val } : r)),
                                                )
                                              }}
                                              onBlur={(e) =>
                                                void saveBreakupField(row.id, {
                                                  amount: e.currentTarget.value || null,
                                                })
                                              }
                                            />
                                          ) : (
                                            <span className={`text-sm font-semibold ${style.text}`}>
                                              {formatIndianCurrency(row.amount)}
                                            </span>
                                          )}
                                        </TD>
                                        <TD className="px-4 py-2">
                                          {canEdit ? (
                                            <input
                                              className={
                                                CELL +
                                                ' w-full rounded-lg border border-transparent hover:border-app-border focus:border-brand-500'
                                              }
                                              value={row.remarks ?? ''}
                                              placeholder="Add notes..."
                                              onChange={(e) => {
                                                const val = e.target.value
                                                setBreakupLines((prev) =>
                                                  prev.map((r) => (r.id === row.id ? { ...r, remarks: val } : r)),
                                                )
                                              }}
                                              onBlur={(e) =>
                                                void saveBreakupField(row.id, {
                                                  remarks: e.currentTarget.value || undefined,
                                                })
                                              }
                                            />
                                          ) : (
                                            <span className="text-sm text-app-secondary">{row.remarks ?? '—'}</span>
                                          )}
                                        </TD>
                                        <TD className="px-4 py-2.5 text-right">{rowStatus(saveStates, key)}</TD>
                                      </TR>
                                    )
                                  })}
                                </TBody>
                              </Table>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-app-subtle">
              <FileText className="h-3 w-3" aria-hidden />
              Calculation rules are managed separately in proposal settings.
            </p>
          </>
        )}
      </div>
    )
  }

  // ── Tab: Approval ──────────────────────────────────────────────────────────

  function approvalTab() {
    if (!proposal) return null
    const canSubmit = canUpdate && !isLocked
    const unmappedBreakupLines = getUnmappedBreakupLines(breakupLines)
    const hasUnmappedBreakupLines = unmappedBreakupLines.length > 0

    const selectedRouteObj = approvalRoutes.find((r) => String(r.id) === selectedRoute)

    return (
      <div className="space-y-6">
        {/* Submit form */}
        {canSubmit ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                <CheckCircle2 className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Submit for Internal Approval</h3>
            </div>
            <div className="space-y-4">
              {approvalRoutes.length > 0 ? (
                <Select
                  id="approval-route"
                  label="Approval route"
                  value={selectedRoute}
                  onChange={(e) => setSelectedRoute(e.target.value)}
                >
                  <option value="">— Default route —</option>
                  {approvalRoutes.map((r) => (
                    <option key={r.id} value={String(r.id)}>
                      {r.name}{r.is_default ? ' (default)' : ''}
                    </option>
                  ))}
                </Select>
              ) : null}

              {/* Route preview */}
              {selectedRouteObj && selectedRouteObj.steps.length > 0 ? (
                <div className="rounded-xl border border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-900/10 p-4 shadow-sm">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
                    Approval Steps
                  </p>
                  <ol className="space-y-2.5">
                    {selectedRouteObj.steps.map((step) => (
                      <li key={step.step_code} className="flex items-center gap-2.5 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white shadow-sm">
                          {step.order}
                        </span>
                        <span className="font-medium text-app-text">{step.step_name}</span>
                        {step.assigned_user_username ? (
                          <span className="flex items-center gap-1 text-app-subtle">
                            <Users className="h-3 w-3" />
                            {step.assigned_user_username}
                          </span>
                        ) : step.department_name ? (
                          <span className="text-app-subtle">→ {step.department_name}</span>
                        ) : null}
                        {!step.assignment_ok ? (
                          <Badge variant="danger" className="text-xs">Unassigned</Badge>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {approvalSuccess ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Submitted for internal approval. The proposal is now pending review.
                </div>
              ) : null}

              {approvalError ? <p className="text-sm text-status-danger">{approvalError}</p> : null}
              {hasUnmappedBreakupLines ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                  Salary breakup is missing role mapping. Regenerate this proposal before submitting for approval.
                </div>
              ) : null}

              <Button
                className="rounded-lg"
                onClick={() => void handleSubmitApproval()}
                disabled={approvalBusy || approvalSuccess || hasUnmappedBreakupLines}
              >
                <Send className="mr-1.5 h-4 w-4" />
                {approvalBusy ? 'Submitting...' : 'Submit for internal approval'}
              </Button>
            </div>
          </section>
        ) : (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                <CheckCircle2 className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Internal Approval</h3>
            </div>
            <div className="rounded-xl border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Badge variant={proposalStatusVariant(proposal.status)} className="text-xs">
                  {proposalStatusLabel(proposal.status)}
                </Badge>
                <p className="text-sm text-app-secondary">
                  {isLocked
                    ? 'Proposal has been submitted and is no longer editable.'
                    : 'Proposal is in draft — submit above to start the approval process.'}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-app-secondary">
              <FileText className="h-3 w-3" />
              Approval tasks can be found in{' '}
              <button
                type="button"
                className="text-brand-600 underline hover:no-underline"
                onClick={() => navigate('/my-tasks')}
              >
                My Tasks
              </button>
              .
            </p>
          </section>
        )}
      </div>
    )
  }

  // ── Tab: Client Response ───────────────────────────────────────────────────

  function clientResponseTab() {
    if (!proposal) return null
    const showInitialSend = canInitialSendProposal(proposal, canSendToClient)
    const showResend = canResendProposal(proposal, canSendToClient)
    const showResponded = clientHasResponded(proposal)

    return (
      <div className="space-y-6">
        {clientSendSuccess ? (
          <div className="flex items-start gap-2 rounded-xl border border-status-hired/30 bg-status-hired/10 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-hired" aria-hidden />
            <p className="text-sm text-app-text">{clientSendSuccess}</p>
          </div>
        ) : null}

        {!showResponded ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                <Send className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Send to Client</h3>
            </div>

            {showInitialSend ? (
              <Button className="rounded-lg bg-brand-600 hover:bg-brand-700" onClick={() => openSendDrawer('send')}>
                <Send className="mr-1.5 h-4 w-4" />
                Send proposal to client
              </Button>
            ) : showResend ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 shadow-sm dark:border-brand-800/50 dark:bg-brand-950/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                    <Send className="h-5 w-5 text-brand-600" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-app-heading">Proposal sent to client</p>
                      <p className="mt-1 text-sm text-app-secondary">Waiting for client response.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-app-subtle">Response:</span>
                      <Badge variant={proposalStatusVariant('pending')} className="text-[10px]">
                        {proposalStatusLabel('pending')}
                      </Badge>
                    </div>
                    {proposal.sent_to_client_at ? (
                      <p className="flex items-center gap-1.5 text-xs text-app-secondary">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-app-subtle" aria-hidden />
                        Sent {formatDateTime(proposal.sent_to_client_at)}
                      </p>
                    ) : null}
                    <p className="text-xs text-app-subtle">
                      Resending creates a new secure link. Older unused links will stop working.
                    </p>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-lg"
                      onClick={() => openSendDrawer('resend')}
                    >
                      <Send className="mr-1.5 h-4 w-4" aria-hidden />
                      Resend proposal link
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-app-border bg-slate-50/50 p-4 shadow-sm dark:bg-slate-800/20">
                <p className="text-sm text-app-secondary">{getClientSendBlocker(proposal, canSendToClient)}</p>
              </div>
            )}
          </section>
        ) : null}

        {showResponded ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                <Users className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Client Response</h3>
            </div>
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                  <dt className="mb-2 text-xs text-app-subtle">Response</dt>
                  <Badge variant={proposalStatusVariant(proposal.client_approval_status)} className="text-xs">
                    {proposalStatusLabel(proposal.client_approval_status)}
                  </Badge>
                </div>
                {(proposal.client_response_at ?? proposal.client_approved_at) ? (
                  <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                    <dt className="mb-2 flex items-center gap-1.5 text-xs text-app-subtle">
                      <Clock className="h-3 w-3" aria-hidden />
                      Responded at
                    </dt>
                    <dd className="text-sm font-medium text-app-text">
                      {formatDateTime(proposal.client_response_at ?? proposal.client_approved_at)}
                    </dd>
                  </div>
                ) : null}
                {proposal.sent_to_client_at ? (
                  <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
                    <dt className="mb-2 flex items-center gap-1.5 text-xs text-app-subtle">
                      <Send className="h-3 w-3" aria-hidden />
                      Sent to client
                    </dt>
                    <dd className="text-sm font-medium text-app-text">{formatDateTime(proposal.sent_to_client_at)}</dd>
                  </div>
                ) : null}
              </div>
              {proposal.client_remarks ? (
                <div className="rounded-xl border border-app-border bg-slate-50/50 p-4 shadow-sm dark:bg-slate-800/20">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-app-subtle">
                    <FileText className="h-3 w-3" aria-hidden />
                    Client remarks
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-app-text">{proposal.client_remarks}</p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* Convert to mobilisation */}
        {canConvertToMobilisation ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                <CheckCircle2 className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Convert to Mobilisation</h3>
            </div>
            {mobilisationHandoff ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5 shadow-sm dark:border-brand-800/50 dark:bg-brand-950/20">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                    <CheckCircle2 className="h-5 w-5 text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-app-heading">Mobilisation handoff created</p>
                    <p className="mt-1 text-sm text-app-secondary">
                      Operations owner: <span className="font-medium text-app-text">{mobilisationHandoff.ownerName}</span>
                    </p>
                    <p className="mt-1 text-sm text-app-secondary">
                      The operations team will complete client users and setup readiness for {lead?.client_name ?? 'this client'}.
                    </p>
                  </div>
                </div>
              </div>
            ) : proposal.client_approval_status === 'approved' ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Client has approved this proposal!</p>
                    <p className="mt-1 text-sm text-emerald-600/70 dark:text-emerald-500/70">
                      Convert now to kick off the mobilisation process.
                    </p>
                    <Button
                      className="mt-3 rounded-lg bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        setConvertValidationError(null)
                        setConvertError(null)
                        setOperationsOwner('')
                        setConvertDrawerOpen(true)
                      }}
                      disabled={convertBusy}
                    >
                      <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      Convert to mobilisation
                    </Button>
                    {convertError ? <p className="mt-2 text-sm text-status-danger">{convertError}</p> : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-4 shadow-sm">
                <p className="text-sm text-app-secondary">
                  Available once the client approves the proposal.
                </p>
              </div>
            )}
          </section>
        ) : null}
      </div>
    )
  }

  function convertDrawer() {
    if (!proposal) return null
    const ownerId = operationsOwner.trim() ? Number(operationsOwner.trim()) : NaN
    const canSubmit = Number.isFinite(ownerId) && ownerId > 0
    return (
      <Drawer
        open={convertDrawerOpen}
        title="Convert to mobilisation"
        description="Select an operations owner. This person will complete client users and setup readiness before finalization."
        onClose={() => !convertBusy && setConvertDrawerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={convertBusy}
              onClick={() => setConvertDrawerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={convertBusy}
              onClick={() => {
                if (!canSubmit) {
                  setConvertValidationError('Select an operations owner before converting.')
                  return
                }
                setConvertValidationError(null)
                void handleConvert(ownerId)
              }}
            >
              {convertBusy ? 'Converting...' : 'Convert'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            id="ops_owner"
            label="Operations owner"
            value={operationsOwner}
            onChange={(e) => setOperationsOwner(e.target.value)}
            disabled={opsUsersLoading || convertBusy}
            error={convertValidationError ?? undefined}
          >
            <option value="">{opsUsersLoading ? 'Loading users...' : 'Select a user'}</option>
            {opsUsers.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.username} ({u.first_name} {u.last_name})
              </option>
            ))}
          </Select>
          <p className="text-xs text-app-subtle">
            This person will complete client users and setup readiness before finalization.
          </p>
          {opsUsersError ? <ErrorState message={opsUsersError} /> : null}
          {convertError ? <ErrorState message={convertError} /> : null}
        </div>
      </Drawer>
    )
  }

  // ── Tab: Revision History ──────────────────────────────────────────────────

  function revisionHistoryTab() {
    if (!proposal) return null
    return (
      <div className="space-y-6">
        {/* Current version */}
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <FileText className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Current Version</h3>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Version', value: `v${proposal.version_number}`, highlight: true },
              { label: 'Status', value: proposalStatusLabel(proposal.status), badge: true },
              { label: 'Valid from', value: formatShortDate(proposal.valid_from) },
              { label: 'Valid to', value: formatShortDate(proposal.valid_to) },
            ].map(({ label, value, highlight, badge }) => (
              <div key={label} className={`rounded-xl border p-4 shadow-sm ${highlight ? 'border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-900/20' : 'border-app-border bg-app-surface'}`}>
                <dt className="text-xs text-app-subtle">{label}</dt>
                {badge ? (
                  <dd className="mt-2">
                    <Badge variant={proposalStatusVariant(proposal.status)} className="text-xs">
                      {value}
                    </Badge>
                  </dd>
                ) : (
                  <dd className={`mt-1 text-base font-semibold ${highlight ? 'text-brand-600 dark:text-brand-400' : 'text-app-text'}`}>{value}</dd>
                )}
              </div>
            ))}
          </dl>
        </section>

        {/* Clone CTA */}
        {isLocked && canUpdate ? (
          <section className="rounded-xl border border-dashed border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                <FileText className="h-5 w-5 text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-app-text">Create a new revision</p>
                <p className="mt-1 text-sm text-app-secondary">
                  Clone this proposal to create a new editable version with the same budget lines and breakup components.
                </p>
                <Button className="mt-3 rounded-lg" onClick={() => void handleClone()} disabled={cloneBusy}>
                  <FileText className="mr-1.5 h-4 w-4" />
                  {cloneBusy ? 'Creating...' : 'Create revision'}
                </Button>
                {cloneError ? <p className="mt-2 text-sm text-status-danger">{cloneError}</p> : null}
              </div>
            </div>
          </section>
        ) : null}

        {/* All versions */}
        {allVersions.length > 1 ? (
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
                <Clock className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Version History</h3>
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                {allVersions.length} versions
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-app-border shadow-sm">
              <Table>
                <THead>
                  <TR className="bg-slate-50 dark:bg-slate-800/50">
                    <TH className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">Version</TH>
                    <TH className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">Status</TH>
                    <TH className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-app-subtle">Created</TH>
                    <TH className="py-3 px-4 w-24">{''}</TH>
                  </TR>
                </THead>
                <TBody>
                  {allVersions.map((v, idx) => (
                    <TR key={v.id} className={`transition-colors ${v.id === proposalId ? 'bg-brand-50/50 dark:bg-brand-900/10' : idx % 2 === 0 ? 'bg-app-surface' : 'bg-slate-50/50 dark:bg-slate-800/20'}`}>
                      <TD className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            v{v.version_number}
                          </span>
                          {v.id === proposalId ? (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">current</span>
                          ) : null}
                        </div>
                      </TD>
                      <TD className="py-3 px-4">
                        <Badge variant={proposalStatusVariant(v.status)} className="text-xs">
                          {proposalStatusLabel(v.status)}
                        </Badge>
                      </TD>
                      <TD className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-sm text-app-secondary">
                          <Clock className="h-3 w-3" />
                          {formatShortDate(v.created_at)}
                        </span>
                      </TD>
                      <TD className="py-3 px-4 text-right">
                        {v.id !== proposalId ? (
                          <Button
                            variant="secondary"
                            className="min-h-8 px-3 text-xs rounded-lg"
                            onClick={() => navigate(ROUTES.SALES_PROPOSAL_DETAIL(v.id))}
                          >
                            View
                          </Button>
                        ) : null}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </section>
        ) : null}
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <Spinner label="Loading proposal..." />
  if (loadError) return <ErrorState message={loadError} />
  if (!proposal) return null

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(ROUTES.SALES_LEAD_DETAIL(proposal.lead))}
            className="mb-1 flex items-center gap-1 text-xs text-app-subtle hover:text-app-text transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to lead
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600">
                <FileText className="h-4 w-4" />
              </div>
              <h2 className="text-lg font-semibold text-app-text">Proposal v{proposal.version_number}</h2>
            </div>
            <Badge variant={proposalStatusVariant(proposal.status)}>
              {proposalStatusLabel(proposal.status)}
            </Badge>
            {isLocked ? (
              <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            ) : null}
          </div>
          {lead ? (
            <p className="mt-0.5 text-sm text-app-secondary">{lead.client_name}</p>
          ) : null}
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-app-subtle">
            {proposal.grand_total ? (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Grand total: <span className="font-semibold text-app-text">{formatIndianCurrency(proposal.grand_total)}</span>
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Updated {formatDateTime(proposal.updated_at)}
            </span>
          </div>
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-3">
          {proposal.manpower_total != null ? (
            <div className="flex items-center gap-2 rounded-lg border border-app-border bg-app-surface px-3 py-2">
              <Users className="h-4 w-4 text-brand-500" />
              <div className="text-right">
                <p className="text-lg font-bold text-app-text">{proposal.manpower_total}</p>
                <p className="text-[10px] uppercase tracking-wider text-app-subtle">Manpower</p>
              </div>
            </div>
          ) : null}
          {proposal.status === 'internally_approved' ? (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <div className="text-right">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Approved</p>
                <p className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-500/70">Ready to send</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto border-b border-app-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-app-secondary hover:text-app-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-40 rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
        {tab === 'overview' && overviewTab()}
        {tab === 'budget-lines' && budgetLinesTab()}
        {tab === 'salary-breakup' && salaryBreakupTab()}
        {tab === 'approval' && approvalTab()}
        {tab === 'client-response' && clientResponseTab()}
        {tab === 'revision-history' && revisionHistoryTab()}
      </div>

      <SendToClientDrawer
        open={sendDrawerOpen}
        mode={sendDrawerMode}
        proposalId={proposal.id}
        proposal={proposal}
        lead={lead}
        onClose={() => setSendDrawerOpen(false)}
        onSent={(updated) => {
          setProposal(updated)
          setSendDrawerOpen(false)
          setClientSendSuccess(
            sendDrawerMode === 'resend' ? 'Proposal link resent to client.' : 'Proposal sent to client.',
          )
        }}
      />
      {convertDrawer()}
    </div>
  )
}
