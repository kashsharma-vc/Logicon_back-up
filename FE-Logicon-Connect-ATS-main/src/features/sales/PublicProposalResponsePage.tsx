import { useEffect, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { getPublicProposalResponse, submitPublicProposalResponse } from '@/api/publicSales'
import { parseApiError } from '@/lib/apiError'
import { Spinner } from '@/components/ui/Spinner'
import {
  buildBreakupRoleGroups,
  getBreakupComponentStyle,
  getBreakupRoleBandStyle,
  getUnmappedBreakupLines,
} from '@/features/sales/salesBreakupGrouping'
import type {
  ProposalBreakupLine,
  ProposalBudgetLine,
  PublicProposalResponse,
  PublicBudgetLine,
  PublicBreakupLine,
} from '@/types/sales'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ResponseValue = 'approved' | 'rejected' | 'negotiation_required'

const RESPONSE_OPTIONS: {
  value: ResponseValue
  label: string
  desc: string
  variant: 'success' | 'danger' | 'warning' | 'brand'
}[] = [
  {
    value: 'approved',
    label: 'Approve',
    desc: 'Accept the proposal as presented',
    variant: 'success',
  },
  {
    value: 'rejected',
    label: 'Reject',
    desc: 'Decline the proposal',
    variant: 'danger',
  },

  {
    value: 'negotiation_required',
    label: 'Negotiate',
    desc: 'Request further discussion',
    variant: 'brand',
  },
]

const RESPONSE_LABELS: Record<string, string> = {
  approved: 'Approved',
  rejected: 'Rejected',

  negotiation_required: 'Negotiation requested',
}

function formatCurrency(value: string | null | undefined): string {
  if (!value) return '—'
  const num = parseFloat(value)
  if (isNaN(num)) return value
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Layout shell ─────────────────────────────────────────────────────────────

function PublicShell({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains('dark')
    root.classList.remove('dark')
    return () => { if (wasDark) root.classList.add('dark') }
  }, [])

  return (
    <div className="min-h-screen bg-app-bg">
      {/* Header - aligned with app design */}
      <header className="bg-app-surface border-b border-app-border shadow-sm">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <img src="/LOGO-2-1.webp" alt="Logicon" className="h-10 w-10 shrink-0 object-contain" />
            <div className="border-l border-app-border pl-4">
              <p className="text-sm font-semibold text-app-text">Logicon Facility Management</p>
              <p className="text-xs text-app-secondary">{subtitle}</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-status-success/10 px-3 py-1 text-xs font-medium text-status-success">
              <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
              Secure Form
            </span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8">{children}</main>
      {/* Footer */}
      <footer className="border-t border-app-border bg-app-surface py-6">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-xs text-app-subtle">
            Logicon Facility Management · This link is confidential and intended for the recipient only.
          </p>
        </div>
      </footer>
    </div>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border shadow-panel mb-6 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-brand-800">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Status message pages ─────────────────────────────────────────────────────

function StatusPage({
  subtitle,
  heading,
  body,
  subBody,
}: {
  subtitle: string
  heading: string
  body: string
  subBody?: string
}) {
  return (
    <PublicShell subtitle={subtitle}>
      <div className="rounded-xl border border-app-border bg-app-surface p-8 text-center shadow-panel">
        <p className="text-base font-semibold text-app-text">{heading}</p>
        <p className="mt-2 text-sm text-app-secondary">{body}</p>
        {subBody ? <p className="mt-1 text-sm text-app-secondary">{subBody}</p> : null}
      </div>
    </PublicShell>
  )
}

// ─── Validate form ────────────────────────────────────────────────────────────

type FormState = {
  response: ResponseValue | ''
  respondent_name: string
  respondent_email: string
  remarks: string
}

function validateForm(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.response) errors.response = 'Please select a decision.'
  if (!form.respondent_name.trim()) errors.respondent_name = 'Name is required.'
  if (!form.respondent_email.trim()) {
    errors.respondent_email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.respondent_email)) {
    errors.respondent_email = 'Please enter a valid email address.'
  }
  const needsRemarks = ['rejected', 'negotiation_required'].includes(form.response ?? '')
  if (needsRemarks && !form.remarks.trim()) {
    errors.remarks = 'Please provide your remarks for this decision.'
  }
  return errors
}

// ─── Main page ────────────────────────────────────────────────────────────────

type PageState = 'loading' | 'loaded' | 'not_found' | 'expired' | 'already_responded' | 'error' | 'submitted'
type TokenErrorCode = 'invalid_token' | 'expired' | 'revoked' | 'used' | 'already_responded' | 'not_approved' | ''

function tokenErrorStatusCopy(code: TokenErrorCode): { heading: string; body: string; subBody: string } {
  switch (code) {
    case 'revoked':
      return {
        heading: 'This proposal link is no longer active',
        body: 'A newer secure proposal link has been sent for this proposal.',
        subBody: 'Please use the latest email link sent by Logicon.',
      }
    case 'used':
    case 'already_responded':
      return {
        heading: 'Response already submitted',
        body: 'This proposal has already been responded to.',
        subBody: 'Please contact the Logicon team if another response is required.',
      }
    case 'expired':
      return {
        heading: 'This proposal link has expired',
        body: 'The review period for this proposal link has ended.',
        subBody: 'Please contact the Logicon team for a new link.',
      }
    case 'not_approved':
      return {
        heading: 'This proposal is not available for client review',
        body: 'This proposal is not ready for external response.',
        subBody: 'Please contact the Logicon team for assistance.',
      }
    default:
      return {
        heading: 'This proposal link is no longer available',
        body: 'The link may be invalid or the proposal may no longer exist.',
        subBody: 'Please contact the Logicon team for a valid proposal link.',
      }
  }
}

export function PublicProposalResponsePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [pageState, setPageState] = useState<PageState>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [tokenErrorCode, setTokenErrorCode] = useState<TokenErrorCode>('')
  const [proposalData, setProposalData] = useState<PublicProposalResponse | null>(null)
  const [breakupExpanded, setBreakupExpanded] = useState(false)

  const [form, setForm] = useState<FormState>({
    response: '',
    respondent_name: '',
    respondent_email: '',
    remarks: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!token) {
      setPageState('not_found')
      return
    }
    void loadProposal()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function loadProposal() {
    try {
      setTokenErrorCode('')
      const result = await getPublicProposalResponse(token)
      setProposalData(result)
      setForm((current) => ({
        ...current,
        respondent_name: current.respondent_name || result.recipient_name || result.client_contact_person || '',
        respondent_email: current.respondent_email || result.recipient_email || result.client_email || '',
      }))
      if (result.already_responded) {
        setPageState('already_responded')
      } else if (!result.can_respond) {
        setPageState('expired')
      } else {
        setPageState('loaded')
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status
        const data = e.response?.data as { detail?: string; code?: TokenErrorCode } | undefined
        const detail = String(data?.detail ?? '')
        const code = data?.code ?? ''
        setTokenErrorCode(code)
        if (code === 'used' || code === 'already_responded') {
          setPageState('expired')
        } else if (status === 404) {
          setPageState('not_found')
        } else if (status === 410 || /expir/i.test(detail)) {
          setPageState('expired')
        } else {
          setPageState('error')
          setErrorMsg(parseApiError(e, 'Unable to load proposal review').message)
        }
      } else {
        setPageState('error')
        setErrorMsg('Unable to load proposal review.')
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errors = validateForm(form)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSubmitting(true)
    setSubmitError('')
    try {
      await submitPublicProposalResponse(token, {
        response: form.response as ResponseValue,
        respondent_name: form.respondent_name.trim(),
        respondent_email: form.respondent_email.trim(),
        remarks: form.remarks.trim() || undefined,
      })
      setPageState('submitted')
    } catch (err: unknown) {
      setSubmitError(parseApiError(err, 'Unable to submit response. Please try again.').message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / terminal states ──────────────────────────────────────────────

  if (!token) {
    return (
      <StatusPage
        subtitle="Proposal Review"
        heading="Invalid proposal link"
        body="The link you followed does not contain a valid proposal token."
        subBody="Please contact the Logicon team for a valid proposal link."
      />
    )
  }

  if (pageState === 'loading') {
    return (
      <PublicShell subtitle="Proposal Review">
        <Spinner label="Loading proposal…" />
      </PublicShell>
    )
  }

  if (pageState === 'not_found') {
    const copy = tokenErrorStatusCopy(tokenErrorCode)
    return (
      <StatusPage
        subtitle="Proposal Review"
        heading={copy.heading}
        body={copy.body}
        subBody={copy.subBody}
      />
    )
  }

  if (pageState === 'expired') {
    const copy = tokenErrorStatusCopy(tokenErrorCode || 'expired')
    return (
      <StatusPage
        subtitle="Proposal Review"
        heading={copy.heading}
        body={copy.body}
        subBody={copy.subBody}
      />
    )
  }

  if (pageState === 'already_responded') {
    const responded = proposalData?.responded_at
    const responseLabel = proposalData?.client_response ? (RESPONSE_LABELS[proposalData.client_response] ?? proposalData.client_response) : '—'
    return (
      <PublicShell subtitle="Proposal Review">
        <div className="rounded-xl border border-app-border bg-app-surface p-8 text-center shadow-panel">
          <p className="text-base font-semibold text-app-text">Response already submitted</p>
          <p className="mt-2 text-sm text-app-secondary">
            This proposal has already been responded to.
          </p>
          <dl className="mt-4 inline-grid grid-cols-2 gap-x-6 gap-y-2 text-left text-sm">
            <dt className="text-app-subtle">Decision</dt>
            <dd className="font-medium text-app-text">{responseLabel}</dd>
            {responded ? (
              <>
                <dt className="text-app-subtle">Submitted</dt>
                <dd className="font-medium text-app-text">{formatDateTime(responded)}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </PublicShell>
    )
  }

  if (pageState === 'error') {
    return (
      <StatusPage
        subtitle="Proposal Review"
        heading="Unable to load proposal review"
        body={errorMsg || 'An unexpected error occurred.'}
        subBody="Please try again or contact the Logicon team."
      />
    )
  }

  if (pageState === 'submitted') {
    const chosenLabel = RESPONSE_LABELS[form.response] ?? form.response
    return (
      <PublicShell subtitle="Proposal Review">
        <div className="rounded-xl border border-app-border bg-app-surface p-8 text-center shadow-panel">
          <p className="text-base font-semibold text-app-text">Thank you for your response</p>
          <p className="mt-2 text-sm text-app-secondary">
            Your decision <span className="font-medium text-app-text">"{chosenLabel}"</span> has been
            recorded. The Logicon team will be in touch shortly.
          </p>
        </div>
      </PublicShell>
    )
  }

  // ── Loaded state ────────────────────────────────────────────────────────────

  const d = proposalData!
  const budgetLines: PublicBudgetLine[] = d.budget_lines ?? []
  const breakupLines: PublicBreakupLine[] = d.breakup_lines ?? []
  const groupedBudgetLines: ProposalBudgetLine[] = budgetLines.map((line) => ({
    id: line.id,
    proposal_version: 0,
    site: line.site ?? line.site_id ?? null,
    site_name: line.site_name ?? null,
    role_requirement: line.role_requirement ?? null,
    service_category: line.service_category ?? '',
    job_role: line.job_role ?? line.job_role_id ?? null,
    job_role_name: line.job_role_name ?? null,
    description: line.description ?? '',
    manpower_count: line.manpower_count ?? null,
    unit_cost: line.unit_cost ?? null,
    total_cost: line.total_cost ?? null,
    sort_order: line.sort_order ?? 0,
  }))
  const groupedBreakupLines: ProposalBreakupLine[] = breakupLines.map((line) => ({
    id: line.id,
    proposal_version: 0,
    site: line.site ?? line.site_id ?? null,
    site_name: line.site_name ?? null,
    role_requirement: line.role_requirement ?? null,
    job_role: line.job_role ?? line.job_role_id ?? null,
    job_role_name: line.job_role_name ?? null,
    component_name: line.component_name ?? '',
    component_type: line.component_type ?? '',
    percentage: line.percentage ?? null,
    amount: line.amount ?? null,
    sort_order: line.sort_order ?? 0,
  }))
  const breakupRoleGroups = buildBreakupRoleGroups(groupedBreakupLines, groupedBudgetLines)
  const unmappedBreakupLines = getUnmappedBreakupLines(groupedBreakupLines)

  return (
    <PublicShell subtitle="Proposal Review">
      {/* Proposal header */}
      <SectionCard title="Proposal details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-app-subtle">Client</p>
            <p className="mt-0.5 text-base font-semibold text-app-text">{d.client_name}</p>
          </div>
          {d.proposal_version_number != null ? (
            <div>
              <p className="text-xs text-app-subtle">Proposal</p>
              <p className="mt-0.5 text-sm font-medium text-app-text">Version {d.proposal_version_number}</p>
            </div>
          ) : null}
          {d.grand_total ? (
            <div>
              <p className="text-xs text-app-subtle">Grand total</p>
              <p className="mt-0.5 text-lg font-bold text-app-text">{formatCurrency(d.grand_total)}</p>
            </div>
          ) : null}
          {d.expires_at ? (
            <div>
              <p className="text-xs text-app-subtle">Valid until</p>
              <p className="mt-0.5 text-sm font-medium text-app-text">{formatDate(d.expires_at)}</p>
            </div>
          ) : d.valid_to ? (
            <div>
              <p className="text-xs text-app-subtle">Valid until</p>
              <p className="mt-0.5 text-sm font-medium text-app-text">{formatDate(d.valid_to)}</p>
            </div>
          ) : null}
          {d.sales_owner_name ? (
            <div>
              <p className="text-xs text-app-subtle">Contact</p>
              <p className="mt-0.5 text-sm font-medium text-app-text">{d.sales_owner_name}</p>
            </div>
          ) : null}
        </div>
        {d.notes ? (
          <div className="mt-4 rounded-lg border border-app-border bg-app-muted p-3">
            <p className="text-xs text-app-subtle">Remarks from Logicon</p>
            <p className="mt-1 whitespace-pre-line text-sm text-app-text">{d.notes}</p>
          </div>
        ) : null}
      </SectionCard>

      {/* Financial summary */}
      <SectionCard title="Financial summary">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Total manpower', value: d.manpower_total != null ? String(d.manpower_total) : null },
            { label: 'Management fee', value: d.management_fee_percent ? `${d.management_fee_percent}%` : null },
            { label: 'GST applicable', value: d.gst_applicable != null ? (d.gst_applicable ? 'Yes' : 'No') : null },
            { label: 'Grand total', value: d.grand_total ? formatCurrency(d.grand_total) : null, bold: true },
          ].filter((row) => row.value != null).map(({ label, value, bold }) => (
            <div key={label} className="rounded-lg border border-app-border bg-app-bg p-3">
              <p className="text-xs text-app-subtle">{label}</p>
              <p className={`mt-0.5 ${bold ? 'text-base font-bold text-app-text' : 'text-sm font-medium text-app-text'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Budget Lines */}
      {budgetLines.length > 0 ? (
        <SectionCard title="Budget lines">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app-border text-left">
                  <th className="pb-2 pr-4 text-xs font-semibold text-app-subtle">Description</th>
                  {budgetLines.some((r) => r.service_category) ? (
                    <th className="pb-2 pr-4 text-xs font-semibold text-app-subtle">Category</th>
                  ) : null}
                  <th className="pb-2 pr-4 text-right text-xs font-semibold text-app-subtle">Manpower</th>
                  {budgetLines.some((r) => r.unit_cost) ? (
                    <th className="pb-2 pr-4 text-right text-xs font-semibold text-app-subtle">Unit cost</th>
                  ) : null}
                  {budgetLines.some((r) => r.total_cost) ? (
                    <th className="pb-2 text-right text-xs font-semibold text-app-subtle">Total cost</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {budgetLines.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-4 font-medium text-app-text">{row.description ?? '—'}</td>
                    {budgetLines.some((r) => r.service_category) ? (
                      <td className="py-2.5 pr-4 text-app-secondary">{row.service_category ?? '—'}</td>
                    ) : null}
                    <td className="py-2.5 pr-4 text-right text-app-secondary">{row.manpower_count ?? '—'}</td>
                    {budgetLines.some((r) => r.unit_cost) ? (
                      <td className="py-2.5 pr-4 text-right text-app-secondary">
                        {row.unit_cost ? formatCurrency(row.unit_cost) : '—'}
                      </td>
                    ) : null}
                    {budgetLines.some((r) => r.total_cost) ? (
                      <td className="py-2.5 text-right text-app-secondary">
                        {row.total_cost ? formatCurrency(row.total_cost) : '—'}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : null}

      {/* Salary Breakup - collapsed by default */}
      {breakupLines.length > 0 ? (
        <SectionCard
          title="Salary breakup"
          action={
            <button
              type="button"
              onClick={() => setBreakupExpanded((x) => !x)}
              className="flex items-center gap-1 text-xs text-white/70 hover:text-white"
            >
              {breakupExpanded ? (
                <>Hide <ChevronDown className="h-3 w-3" /></>
              ) : (
                <>Show <ChevronRight className="h-3 w-3" /></>
              )}
            </button>
          }
        >
          {breakupExpanded ? (
            unmappedBreakupLines.length > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                This proposal needs to be refreshed by the sales team before salary breakup can be reviewed.
              </div>
            ) : (
              <div className="space-y-4">
              <div className="rounded-lg border border-app-border bg-app-bg px-3 py-2">
                <p className="text-xs font-medium text-app-secondary">
                  {breakupRoleGroups.length} role{breakupRoleGroups.length !== 1 ? 's' : ''} - {breakupLines.length} component
                  {breakupLines.length !== 1 ? 's' : ''}
                </p>
              </div>

              {breakupRoleGroups.map((group, groupIndex) => {
                const band = getBreakupRoleBandStyle(groupIndex, group.groupKey)
                return (
                  <section
                    key={group.groupKey}
                    className={`overflow-hidden rounded-lg border border-l-4 shadow-sm ${band.border} ${band.borderAccent}`}
                  >
                    <div className={`border-b px-4 py-3 ${band.headerBg} ${band.headerBorder}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold ${band.titleText}`}>{group.title}</p>
                          <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs ${band.metaText}`}>
                            {group.siteName ? <span>{group.siteName}</span> : null}
                            {group.headcount != null ? <span>Headcount {group.headcount}</span> : null}
                            {group.unitCost ? <span>Unit {formatCurrency(group.unitCost)}</span> : null}
                            {group.totalCost ? <span>Budget {formatCurrency(group.totalCost)}</span> : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                            Role total
                          </p>
                          <p className={`text-sm font-bold tabular-nums ${band.totalText}`}>
                            {formatCurrency(String(group.total))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`space-y-3 p-3 ${band.bodyBg}`}>
                      {group.sections.map((section) => {
                        const sectionStyle = getBreakupComponentStyle(section.componentType)
                        return (
                          <div
                            key={`${group.groupKey}-${section.componentType}`}
                            className="overflow-hidden rounded-lg border border-app-border bg-app-surface"
                          >
                            <div className={`flex items-center justify-between border-b px-3 py-2 ${sectionStyle.border}`}>
                              <p className={`text-xs font-semibold ${sectionStyle.text}`}>{section.label}</p>
                              <p className="text-xs font-semibold tabular-nums text-app-text">
                                {formatCurrency(String(section.total))}
                              </p>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-app-border text-left">
                                    <th className="px-3 py-2 text-xs font-semibold text-app-subtle">Component</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-app-subtle">%</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-app-subtle">Amount</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-app-border">
                                  {section.rows.map((row) => (
                                    <tr key={row.id}>
                                      <td className="px-3 py-2.5 font-medium text-app-text">{row.component_name ?? '-'}</td>
                                      <td className="px-3 py-2.5 text-right text-app-secondary">
                                        {row.percentage != null ? `${row.percentage}%` : '-'}
                                      </td>
                                      <td className="px-3 py-2.5 text-right text-app-secondary">
                                        {row.amount ? formatCurrency(row.amount) : '-'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
              </div>
            )
          ) : (
            <p className="text-sm text-app-subtle">Click "Show" to view salary component details.</p>
          )}
        </SectionCard>
      ) : null}
      {/* Response form */}
      <SectionCard title="Your Response">
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6" noValidate>
          {/* Decision */}
          <div>
            <p className="mb-2 text-sm font-medium text-app-text">
              Decision <span className="text-status-danger">*</span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {RESPONSE_OPTIONS.map((opt) => {
                const isSelected = form.response === opt.value
                const variantClasses = {
                  success: isSelected ? 'border-status-success bg-status-success/10' : 'border-app-border hover:border-status-success/50',
                  danger: isSelected ? 'border-status-danger bg-status-danger/10' : 'border-app-border hover:border-status-danger/50',
                  warning: isSelected ? 'border-status-warning bg-status-warning/10' : 'border-app-border hover:border-status-warning/50',
                  brand: isSelected ? 'border-brand-500 bg-brand-500/10' : 'border-app-border hover:border-brand-500/50',
                }
                const textClasses = {
                  success: isSelected ? 'text-status-success' : 'text-app-text',
                  danger: isSelected ? 'text-status-danger' : 'text-app-text',
                  warning: isSelected ? 'text-status-warning' : 'text-app-text',
                  brand: isSelected ? 'text-brand-600' : 'text-app-text',
                }
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-3 transition-colors ${variantClasses[opt.variant]}`}
                  >
                    <input
                      type="radio"
                      name="decision"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setForm((f) => ({ ...f, response: opt.value }))}
                      className="mt-0.5 shrink-0 accent-brand-600"
                    />
                    <div>
                      <p className={`text-sm font-medium ${textClasses[opt.variant]}`}>{opt.label}</p>
                      <p className="text-xs text-app-secondary">{opt.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
            {fieldErrors.response ? (
              <p className="mt-1.5 text-sm text-status-danger">{fieldErrors.response}</p>
            ) : null}
          </div>

          {/* Contact details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="resp-name" className="mb-1 block text-sm font-medium text-app-text">
                Your name <span className="text-status-danger">*</span>
              </label>
              <input
                id="resp-name"
                type="text"
                value={form.respondent_name}
                onChange={(e) => setForm((f) => ({ ...f, respondent_name: e.target.value }))}
                placeholder="Full name"
                className="min-h-10 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              {fieldErrors.respondent_name ? (
                <p className="mt-1 text-sm text-status-danger">{fieldErrors.respondent_name}</p>
              ) : null}
            </div>
            <div>
              <label htmlFor="resp-email" className="mb-1 block text-sm font-medium text-app-text">
                Your email <span className="text-status-danger">*</span>
              </label>
              <input
                id="resp-email"
                type="email"
                value={form.respondent_email}
                onChange={(e) => setForm((f) => ({ ...f, respondent_email: e.target.value }))}
                placeholder="email@company.com"
                className="min-h-10 w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
              {fieldErrors.respondent_email ? (
                <p className="mt-1 text-sm text-status-danger">{fieldErrors.respondent_email}</p>
              ) : null}
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="resp-remarks" className="mb-1 block text-sm font-medium text-app-text">
              Remarks
              {['rejected', 'negotiation_required'].includes(form.response) ? (
                <span className="text-status-danger"> *</span>
              ) : (
                <span className="ml-1 text-xs font-normal text-app-subtle">(optional for approval)</span>
              )}
            </label>
            <textarea
              id="resp-remarks"
              rows={4}
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
              placeholder="Any comments, questions, or conditions…"
              className="w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            />
            {fieldErrors.remarks ? (
              <p className="mt-1 text-sm text-status-danger">{fieldErrors.remarks}</p>
            ) : null}
          </div>

          {/* Submit */}
          {submitError ? (
            <p className="text-sm text-status-danger">{submitError}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-brand-800 px-6 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-900 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Response'}
          </button>
        </form>
      </SectionCard>
    </PublicShell>
  )
}
