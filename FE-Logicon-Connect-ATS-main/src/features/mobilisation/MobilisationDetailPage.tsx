import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  History,
  IndianRupee,
  MapPin,
  MessageSquare,
  Users,
  XCircle,
} from 'lucide-react'
import {
  assignMobilisationOperationsOwner,
  finalizeMobilisationDirectly,
  getMobilisationSalesContext,
  getMobilisationSetupRequest,
  listMobilisationUsers,
  markMobilisationSetupCompleted,
} from '@/api/mobilisation'
import {
  getMobilisationConfigCheck,
  getWorkflowInstance,
  listAvailableApprovalRoutes,
  startMobilisationWorkflow,
} from '@/api/workflow'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ApprovalRouteSelector } from '@/features/workflow/ApprovalRouteSelector'
import { WorkflowActionBox } from '@/features/workflow/WorkflowActionBox'
import { WorkflowConfigCheckDrawer } from '@/features/workflow/WorkflowConfigCheckDrawer'
import { WorkflowReassignDrawer } from '@/features/workflow/WorkflowReassignDrawer'
import { WorkflowStatusPanel } from '@/features/workflow/WorkflowStatusPanel'
import { WorkflowTimeline } from '@/features/workflow/WorkflowTimeline'
import type { ApprovalRoutePreview, WorkflowConfigCheck, WorkflowInstance, WorkflowStatus } from '@/features/workflow/types'
import {
  mobilisationFinalizationLabel,
  mobilisationStatusLabel,
  type MobilisationSalesContext,
  type MobilisationSetupRequest,
} from '@/features/mobilisation/types'
import { ClientUsersPanel } from '@/features/mobilisation/components/ClientUsersPanel'
import { cn } from '@/lib/cn'
import { listUsers, type UserRow } from '@/api/users'

type MobilisationTab = 'overview' | 'users' | 'approval'

const TABS: { id: MobilisationTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Client Users' },
  { id: 'approval', label: 'Approval / Finalization' },
]

function normalizeTab(raw: string | null): MobilisationTab {
  if (raw === 'overview' || raw === 'users' || raw === 'approval') return raw
  if (raw === 'setup' || raw === 'departments') return 'users'
  return 'overview'
}

function statusBadgeVariant(s: string): 'success' | 'danger' | 'info' | 'attention' | 'neutral' {
  if (s === 'approved') return 'success'
  if (s === 'rejected' || s === 'cancelled') return 'danger'
  if (s === 'setup_completed') return 'success'
  if (s === 'operations_setup') return 'attention'
  if (s === 'submitted') return 'info'
  if (s === 'in_review') return 'attention'
  return 'neutral'
}

function finalizationBadgeVariant(s: string | null | undefined): 'success' | 'danger' | 'neutral' {
  if (s === 'finalized') return 'success'
  if (s === 'failed') return 'danger'
  return 'neutral'
}

function mobilisationWorkflowKey(id: number) {
  return `mobilisation:${id}:workflow-instance`
}

function formatWorkflowStartError(e: unknown, fallback: string): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data
    if (data && typeof data === 'object') {
      const body = data as Record<string, unknown>
      const detail = typeof body.detail === 'string' ? body.detail : ''
      const errors = Array.isArray(body.errors)
        ? body.errors.map((x) => (typeof x === 'string' ? x : String(x))).filter(Boolean)
        : []
      if (errors.length > 0) return [detail, ...errors].filter(Boolean).join('\n')
    }
  }
  return parseApiError(e, fallback).message
}

// ─── Indian number formatting ──────────────────────────────────────────────────

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

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  row,
  onNavigateTab,
  usersRefreshKey,
}: {
  row: MobilisationSetupRequest
  onNavigateTab: (tab: MobilisationTab) => void
  usersRefreshKey: number
}) {
  const [salesContext, setSalesContext] = useState<MobilisationSalesContext | null>(null)
  const [contextLoading, setContextLoading] = useState(true)
  const [contextError, setContextError] = useState<string | null>(null)
  const [activeProposedUsers, setActiveProposedUsers] = useState(0)

  useEffect(() => {
    async function loadContext() {
      setContextLoading(true)
      setContextError(null)
      try {
        const ctx = await getMobilisationSalesContext(row.id)
        setSalesContext(ctx)
      } catch (e: unknown) {
        setContextError(parseApiError(e, 'Failed to load sales context').message)
      } finally {
        setContextLoading(false)
      }
    }
    void loadContext()
  }, [row.id])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await listMobilisationUsers(row.id)
        if (cancelled) return
        setActiveProposedUsers(res.items.filter((u) => u.is_active).length)
      } catch {
        if (!cancelled) setActiveProposedUsers(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [row.id, usersRefreshKey])

  // Check if this mobilisation has sales source
  const hasSalesSource = row.source_sales_lead != null || row.source_proposal_version != null

  if (contextLoading) {
    return <Spinner label="Loading sales context..." />
  }

  // If no sales source, show a simple message
  if (!hasSalesSource || (!salesContext?.lead && !salesContext?.proposal)) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-app-border bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-800/30 dark:to-slate-800/10 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-500/10">
              <FileText className="h-6 w-6 text-slate-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-app-text">Manual Mobilisation</h3>
              <p className="mt-1 text-sm text-app-secondary">
                This mobilisation request was not created from a sales proposal.
                Add client portal users in the Client Users tab before finalization.
              </p>
            </div>
          </div>
        </div>

        {/* Basic details card */}
        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <ClipboardCheck className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Request Details</h3>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-3">
              <dt className="text-xs text-app-subtle">Status</dt>
              <dd className="mt-1.5">
                <Badge variant={statusBadgeVariant(row.status)}>{mobilisationStatusLabel(row.status)}</Badge>
              </dd>
            </div>
            <div className="rounded-lg border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-3">
              <dt className="text-xs text-app-subtle">Finalization</dt>
              <dd className="mt-1.5">
                <Badge variant={finalizationBadgeVariant(row.finalization_status)}>
                  {mobilisationFinalizationLabel(row.finalization_status)}
                </Badge>
              </dd>
            </div>
            <div className="rounded-lg border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-3">
              <dt className="flex items-center gap-1 text-xs text-app-subtle">
                <Clock className="h-3 w-3" /> Created
              </dt>
              <dd className="mt-1 text-sm font-medium text-app-text">{new Date(row.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {row.summary?.trim() ? (
          <div className="rounded-xl border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-app-subtle">
              <FileText className="h-3 w-3" /> Summary
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-app-text leading-relaxed">{row.summary}</p>
          </div>
        ) : null}
      </div>
    )
  }

  const ctx = salesContext
  const lead = ctx?.lead
  const proposal = ctx?.proposal
  const sites = ctx?.sites ?? []
  const proposalVersions = ctx?.proposal_versions ?? []
  const readyForFinalization = activeProposedUsers >= 1

  // Calculate totals
  const totalHeadcount = sites.reduce((sum, s) => sum + s.headcount, 0)

  return (
    <div className="space-y-6">
      {/* Sales Context Hero Card */}
      <div className="rounded-xl border border-app-border bg-gradient-to-br from-brand-50 via-app-surface to-blue-50/30 dark:from-brand-900/20 dark:via-app-surface dark:to-blue-900/10 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                <FileText className="h-4 w-4 text-brand-600" />
              </div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Sales Context</h3>
            </div>
            {lead ? (
              <div className="space-y-1">
                <p className="text-lg font-bold text-app-text">{lead.client_name}</p>
                <div className="flex flex-wrap items-center gap-2 text-sm text-app-secondary">
                  <Badge variant={lead.lead_type === 'new_client' ? 'info' : 'neutral'} className="text-xs">
                    {lead.lead_type.replace(/_/g, ' ')}
                  </Badge>
                  {lead.sales_person_name ? (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {lead.sales_person_name}
                    </span>
                  ) : null}
                </div>
                {lead.client_contact_person ? (
                  <p className="text-xs text-app-subtle">Contact: {lead.client_contact_person}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2">
            {row.source_sales_lead != null ? (
              <Link
                to={`/sales/leads/${row.source_sales_lead}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text shadow-sm transition-all hover:bg-app-muted hover:shadow-md"
              >
                <FileText className="h-4 w-4 text-brand-500" />
                View Lead
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
            {row.source_proposal_version != null ? (
              <Link
                to={`/sales/proposals/${row.source_proposal_version}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text shadow-sm transition-all hover:bg-app-muted hover:shadow-md"
              >
                <IndianRupee className="h-4 w-4 text-brand-500" />
                View Proposal v{proposal?.version_number ?? '?'}
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {proposal ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <IndianRupee className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Financial Summary</h3>
            {proposal.client_approval_status === 'approved' ? (
              <Badge variant="success" className="text-xs">Client Approved</Badge>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-app-text">{proposal.manpower_total}</p>
                  <p className="mt-0.5 text-xs text-app-subtle">Total Manpower</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                  <Users className="h-4 w-4 text-brand-500" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-app-text">{formatIndianCurrency(proposal.subtotal_amount)}</p>
                  <p className="mt-0.5 text-xs text-app-subtle">Subtotal</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10">
                  <IndianRupee className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-app-text">{formatIndianCurrency(proposal.management_fee_amount)}</p>
                  <p className="mt-0.5 text-xs text-app-subtle">Management Fee</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10">
                  <IndianRupee className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-app-text">{formatIndianCurrency(proposal.gst_amount)}</p>
                  <p className="mt-0.5 text-xs text-app-subtle">GST</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-500/10">
                  <IndianRupee className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-brand-50 to-brand-100/50 dark:border-brand-800 dark:from-brand-900/20 dark:to-brand-900/10 p-4 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-brand-700 dark:text-brand-400">{formatIndianCurrency(proposal.grand_total)}</p>
                  <p className="mt-0.5 text-xs text-brand-600/70 dark:text-brand-500/70">Grand Total</p>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10">
                  <IndianRupee className="h-4 w-4 text-brand-600" />
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Sites to Mobilise */}
      {sites.length > 0 ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <Building2 className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Sites &amp; role requirements</h3>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              Already created from sales conversion
            </span>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {sites.length} {sites.length === 1 ? 'site' : 'sites'} · {totalHeadcount} people
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {sites.map((site) => (
              <div key={site.id} className="rounded-xl border border-app-border bg-app-surface overflow-hidden shadow-sm">
                {/* Site header */}
                <div className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/30 px-4 py-3 border-b border-app-border">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10">
                      <Building2 className="h-4 w-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-app-text">{site.site_name}</p>
                      <p className="flex items-center gap-1 text-xs text-app-subtle">
                        <MapPin className="h-3 w-3" />
                        {site.city}{site.state ? `, ${site.state}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      <Users className="mr-1 h-3 w-3" />
                      {site.headcount}
                    </span>
                  </div>
                </div>

                {/* Roles list */}
                {site.roles.length > 0 ? (
                  <div className="p-3 space-y-2">
                    {site.roles.map((role) => (
                      <div key={role.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50/50 dark:bg-slate-800/20 px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-app-text truncate">{role.job_role_name ?? 'Unknown Role'}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-app-subtle">
                            {role.wage_category_name ? (
                              <span className="rounded bg-brand-50 dark:bg-brand-900/20 px-1.5 py-0.5 text-brand-700 dark:text-brand-400">{role.wage_category_name}</span>
                            ) : null}
                            {role.service_category ? (
                              <span>{role.service_category}</span>
                            ) : null}
                            {role.shift_hours ? (
                              <span>{role.shift_hours}h shift</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                          ×{role.manpower_count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-app-subtle">No roles defined</div>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Setup Readiness */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
            <ClipboardCheck className="h-4 w-4 text-brand-600" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Setup Readiness</h3>
          {readyForFinalization ? (
            <Badge variant="success" className="text-xs">
              Ready
            </Badge>
          ) : (
            <Badge variant="attention" className="text-xs">
              Setup needed
            </Badge>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
                  <Users className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-app-text">Client users configured</p>
                  <p className="text-xs text-app-subtle">
                    {activeProposedUsers} active user{activeProposedUsers !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              {activeProposedUsers >= 1 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateTab('users')}
                  className="rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-brand-600"
                >
                  Add
                </button>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10">
                  <ClipboardCheck className="h-5 w-5 text-brand-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-app-text">Ready for finalization</p>
                  <p className="text-xs text-app-subtle">
                    {readyForFinalization ? 'At least one client user is active' : 'Add a client user first'}
                  </p>
                </div>
              </div>
              {readyForFinalization ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Proposal Revision History */}
      {proposalVersions.length > 1 ? (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500/10">
              <History className="h-4 w-4 text-brand-600" />
            </div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Proposal Revision History</h3>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {proposalVersions.length} versions
            </span>
          </div>
          <div className="space-y-3">
            {proposalVersions.map((v) => {
              const isApproved = v.client_approval_status === 'approved'
              const isRejected = v.client_approval_status === 'rejected'
              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-app-border bg-app-surface overflow-hidden shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${
                        isApproved
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : isRejected
                            ? 'bg-red-500/10 text-red-700 dark:text-red-400'
                            : 'bg-brand-500/10 text-brand-700 dark:text-brand-400'
                      }`}>
                        v{v.version_number}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-app-text">{formatIndianCurrency(v.grand_total)}</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={isApproved ? 'success' : isRejected ? 'danger' : 'neutral'}
                            className="text-xs"
                          >
                            {v.client_approval_status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {isApproved ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    ) : isRejected ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                  {v.client_remarks?.trim() ? (
                    <div className="px-4 py-2 border-t border-app-border bg-slate-50/50 dark:bg-slate-800/20">
                      <p className="flex items-start gap-1.5 text-xs text-app-secondary">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="italic">"{v.client_remarks}"</span>
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      ) : null}

      {/* Request Details */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-500/10">
            <ClipboardCheck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-app-text">Request Details</h3>
        </div>
        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-app-subtle">Status</dt>
              <dd className="mt-1.5">
                <Badge variant={statusBadgeVariant(row.status)}>{mobilisationStatusLabel(row.status)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-app-subtle">Finalization</dt>
              <dd className="mt-1.5">
                <Badge variant={finalizationBadgeVariant(row.finalization_status)}>
                  {mobilisationFinalizationLabel(row.finalization_status)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-app-subtle">Requires Approval</dt>
              <dd className="mt-1.5">
                {row.mobilisation_requires_approval ? (
                  <Badge variant="attention">Yes</Badge>
                ) : (
                  <Badge variant="neutral">No</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-xs text-app-subtle">
                <Clock className="h-3 w-3" /> Created
              </dt>
              <dd className="mt-1 text-sm font-medium text-app-text">{new Date(row.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Notes */}
      {row.summary?.trim() || row.operations_notes?.trim() ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {row.summary?.trim() ? (
            <div className="rounded-xl border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-app-subtle">
                <FileText className="h-3 w-3" /> Summary
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-app-text leading-relaxed">{row.summary}</p>
            </div>
          ) : null}
          {row.operations_notes?.trim() ? (
            <div className="rounded-xl border border-app-border bg-slate-50/50 dark:bg-slate-800/20 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-app-subtle">
                <FileText className="h-3 w-3" /> Operations Notes
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-app-text leading-relaxed">{row.operations_notes}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Finalization error */}
      {row.finalization_status === 'failed' && row.finalization_error?.trim() ? (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Finalization failed</p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-red-600/80 dark:text-red-400/80">{row.finalization_error}</p>
              <p className="mt-2 text-xs text-red-500/70">An administrator can retry finalization from Django admin.</p>
            </div>
          </div>
        </div>
      ) : null}

      {contextError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4">
          <p className="text-sm text-amber-700 dark:text-amber-400">{contextError}</p>
        </div>
      ) : null}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MobilisationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const requestId = Number(id)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = useMemo(() => normalizeTab(params.get('tab')), [params])

  function setTab(next: MobilisationTab) {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p, { replace: true })
  }

  const me = useAuthStore((s) => s.me)
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canUpdateMobilisation = hasAnyCapability(meCaps, [CAP.MOBILISATION_UPDATE])
  const canFinalizeMobilisation = hasAnyCapability(meCaps, [CAP.MOBILISATION_FINALIZE])
  const canWorkflowRead = hasAnyCapability(meCaps, [CAP.WORKFLOW_READ])
  const canWorkflowStart = hasAnyCapability(meCaps, [CAP.WORKFLOW_START])
  const canWorkflowApprove = hasAnyCapability(meCaps, [CAP.WORKFLOW_APPROVE])
  const canWorkflowReject = hasAnyCapability(meCaps, [CAP.WORKFLOW_REJECT])
  const canWorkflowReassign = hasAnyCapability(meCaps, [CAP.WORKFLOW_REASSIGN])
  const canConfigCheck = canWorkflowRead || canWorkflowStart

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<MobilisationSetupRequest | null>(null)

  const [finalizeBusy, setFinalizeBusy] = useState(false)
  const [finalizeError, setFinalizeError] = useState<string | null>(null)
  const [setupBusy, setSetupBusy] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)
  const [setupSuccess, setSetupSuccess] = useState<string | null>(null)

  const [assignOwnerOpen, setAssignOwnerOpen] = useState(false)
  const [opsOwner, setOpsOwner] = useState('')
  const [opsUsers, setOpsUsers] = useState<UserRow[]>([])
  const [opsUsersLoading, setOpsUsersLoading] = useState(false)
  const [opsUsersError, setOpsUsersError] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignBusy, setAssignBusy] = useState(false)
  const [usersRefreshKey, setUsersRefreshKey] = useState(0)

  const [wfInstance, setWfInstance] = useState<WorkflowInstance | null>(null)
  const [wfInstanceLoading, setWfInstanceLoading] = useState(false)
  const [wfInstanceError, setWfInstanceError] = useState<string | null>(null)
  const [rememberedInstanceId, setRememberedInstanceId] = useState<number | null>(null)

  const [startBusy, setStartBusy] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [reassignOpen, setReassignOpen] = useState(false)

  const [availableRoutes, setAvailableRoutes] = useState<ApprovalRoutePreview[]>([])
  const [routesLoading, setRoutesLoading] = useState(false)
  const [routesError, setRoutesError] = useState<string | null>(null)
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null)

  const [configDrawerOpen, setConfigDrawerOpen] = useState(false)
  const [configBusy, setConfigBusy] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configData, setConfigData] = useState<WorkflowConfigCheck | null>(null)

  const selectedRoute = useMemo(
    () => availableRoutes.find((r) => r.id === selectedRouteId) ?? null,
    [availableRoutes, selectedRouteId],
  )

  const startDisabledByRoutes =
    routesLoading || !!routesError || availableRoutes.length === 0 || selectedRouteId == null || selectedRoute?.ok === false

  const loadWorkflowInstance = useCallback(
    async (instanceId: number) => {
      if (!canWorkflowRead) { setWfInstance(null); return }
      setWfInstanceLoading(true)
      setWfInstanceError(null)
      try {
        const inst = await getWorkflowInstance(instanceId)
        setWfInstance(inst)
      } catch (e: unknown) {
        setWfInstance(null)
        setWfInstanceError(parseApiError(e, 'Failed to load workflow instance').message)
      } finally {
        setWfInstanceLoading(false)
      }
    },
    [canWorkflowRead],
  )

  const resolveRememberedId = useCallback(
    async (r: MobilisationSetupRequest): Promise<number | null> => {
      const key = mobilisationWorkflowKey(r.id)
      const raw = sessionStorage.getItem(key)
      if (!raw) return null
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 1) { sessionStorage.removeItem(key); return null }
      if (!canWorkflowRead) return null
      try {
        const inst = await getWorkflowInstance(n)
        if (inst.mobilisation === r.id) return n
      } catch { /* fall through */ }
      sessionStorage.removeItem(key)
      return null
    },
    [canWorkflowRead],
  )

  async function refresh() {
    if (!Number.isFinite(requestId)) return
    setLoading(true)
    setError(null)
    try {
      const res = await getMobilisationSetupRequest(requestId)
      setRow(res)
    } catch (e: unknown) {
      setRow(null)
      setError(parseApiError(e, 'Failed to load mobilisation request').message)
    } finally {
      setLoading(false)
    }
  }

  async function reloadRowAndWorkflow() {
    if (!Number.isFinite(requestId)) return
    try {
      const res = await getMobilisationSetupRequest(requestId)
      setRow(res)
      const backendId = res.workflow_instance_id != null && res.workflow_instance_id > 0 ? res.workflow_instance_id : null
      if (backendId != null && canWorkflowRead) {
        sessionStorage.removeItem(mobilisationWorkflowKey(res.id))
        setRememberedInstanceId(null)
        await loadWorkflowInstance(backendId)
        return
      }
      const remembered = await resolveRememberedId(res)
      setRememberedInstanceId(remembered)
      if (remembered != null && canWorkflowRead) {
        await loadWorkflowInstance(remembered)
      } else {
        setWfInstance(null)
      }
    } catch (e: unknown) {
      setWfInstanceError(parseApiError(e, 'Failed to reload').message)
    }
  }

  async function handleCheckConfig() {
    setConfigDrawerOpen(true)
    setConfigBusy(true)
    setConfigData(null)
    setConfigError(null)
    try {
      const d = await getMobilisationConfigCheck(requestId)
      setConfigData(d)
    } catch (e: unknown) {
      setConfigError(parseApiError(e, 'Config check failed').message)
    } finally {
      setConfigBusy(false)
    }
  }

  async function handleStartWorkflow() {
    setStartError(null)
    if (availableRoutes.length === 0) { setStartError('No approval route configured.'); return }
    if (selectedRouteId == null) { setStartError('Select an approval route first.'); return }
    const r = availableRoutes.find((x) => x.id === selectedRouteId)
    if (!r?.ok) { setStartError('This route is missing approvers.'); return }
    setStartBusy(true)
    try {
      const inst = await startMobilisationWorkflow(requestId, selectedRouteId)
      sessionStorage.setItem(mobilisationWorkflowKey(requestId), String(inst.id))
      setRememberedInstanceId(inst.id)
      if (canWorkflowRead) await loadWorkflowInstance(inst.id)
      await reloadRowAndWorkflow()
    } catch (e: unknown) {
      setStartError(formatWorkflowStartError(e, 'Send for approval failed'))
    } finally {
      setStartBusy(false)
    }
  }

  async function handleFinalizeDirectly() {
    setFinalizeError(null)
    setFinalizeBusy(true)
    try {
      await finalizeMobilisationDirectly(requestId)
      await refresh()
    } catch (e: unknown) {
      setFinalizeError(parseApiError(e, 'Finalization failed').message)
    } finally {
      setFinalizeBusy(false)
    }
  }

  useEffect(() => {
    if (!Number.isFinite(requestId)) {
      setError('Invalid request ID.')
      setLoading(false)
      return
    }
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId])

  useEffect(() => {
    if (!row || !canWorkflowRead) { setWfInstance(null); return }
    const backendId = row.workflow_instance_id != null && row.workflow_instance_id > 0 ? row.workflow_instance_id : null
    if (backendId != null) {
      sessionStorage.removeItem(mobilisationWorkflowKey(row.id))
      setRememberedInstanceId(null)
      void loadWorkflowInstance(backendId)
      return
    }
    void (async () => {
      const remembered = await resolveRememberedId(row)
      setRememberedInstanceId(remembered)
      if (remembered != null) await loadWorkflowInstance(remembered)
      else { setWfInstance(null); setWfInstanceError(null) }
    })()
  }, [row?.id, row?.workflow_instance_id, row?.updated_at, canWorkflowRead, loadWorkflowInstance, resolveRememberedId])

  useEffect(() => {
    if (!assignOwnerOpen) return
    let cancelled = false
    void (async () => {
      setOpsUsersLoading(true)
      setOpsUsersError(null)
      try {
        const res = await listUsers({ user_type: 'internal', is_active: true, page: 1 })
        if (!cancelled) setOpsUsers(res.items)
      } catch (e: unknown) {
        if (!cancelled) setOpsUsersError(parseApiError(e, 'Could not load internal users').message)
      } finally {
        if (!cancelled) setOpsUsersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [assignOwnerOpen])

  useEffect(() => {
    if (!row || !row.mobilisation_requires_approval || row.workflow_status !== 'not_started' || !canWorkflowStart) {
      setAvailableRoutes([])
      setSelectedRouteId(null)
      return
    }
    let cancelled = false
    setRoutesLoading(true)
    setRoutesError(null)
    setAvailableRoutes([])
    setSelectedRouteId(null)
    void (async () => {
      try {
        const res = await listAvailableApprovalRoutes({ trigger_type: 'client_onboarding' })
        if (cancelled) return
        const list = res.results ?? []
        setAvailableRoutes(list)
        if (list.length === 1 && list[0] != null) setSelectedRouteId(list[0].id)
        else {
          const defaults = list.filter((r) => r.is_default)
          if (defaults.length === 1 && defaults[0] != null) setSelectedRouteId(defaults[0].id)
        }
      } catch (e: unknown) {
        if (cancelled) return
        setRoutesError(parseApiError(e, 'Failed to load approval routes').message)
      } finally {
        if (!cancelled) setRoutesLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [row?.id, row?.mobilisation_requires_approval, row?.workflow_status, canWorkflowStart])

  const workflowModel = useMemo(() => {
    if (!row) return null
    const backendId = row.workflow_instance_id != null && row.workflow_instance_id > 0 ? row.workflow_instance_id : null
    const instanceId = backendId ?? rememberedInstanceId
    const cs = wfInstance?.current_step
    const resolvedStatus: WorkflowStatus =
      (row.workflow_status as WorkflowStatus | undefined) ??
      (wfInstance?.status as WorkflowStatus | undefined) ??
      (instanceId && wfInstanceLoading ? 'active' : 'not_started')
    const stepId = row.workflow_current_step_id ?? (cs?.id != null && cs.id > 0 ? cs.id : null)
    const stepCode = row.workflow_current_step_code ?? cs?.step_code ?? undefined
    const stepName = row.workflow_current_step_name ?? cs?.step_name ?? undefined
    const assignedUserId = row.workflow_current_assigned_user ?? cs?.assigned_user ?? undefined
    const assignedUserName = row.workflow_current_assigned_user_name ?? cs?.assigned_user_username ?? undefined
    const deptName = row.workflow_current_department_name ?? cs?.assigned_department_name_snapshot ?? undefined
    return { instanceId, workflowStatus: resolvedStatus, stepId, stepCode, stepName, assignedUserId, assignedUserName, deptName, backendHasInstanceId: backendId != null }
  }, [row, wfInstance, rememberedInstanceId, wfInstanceLoading])

  const handleClientUsersChanged = useCallback(() => {
    setUsersRefreshKey((k) => k + 1)
  }, [])

  if (loading) return <Spinner label="Loading mobilisation setup..." />
  if (error) return <ErrorState message={error} />
  if (!row) return <EmptyState title="Request not found" description="This mobilisation setup may have been removed." />

  const fin = row.finalization_status
  const wm = workflowModel
  const isWorkflowStarted = Boolean(row.workflow_status && row.workflow_status !== 'not_started')
  const isReadyForApproval = row.readiness_ok === true
  const showApprovalWorkflow = isWorkflowStarted || isReadyForApproval

  const canEditSetup = canUpdateMobilisation && (row.status === 'draft' || row.status === 'operations_setup' || row.status === 'rejected')
  const canFinalizeOrStartWorkflow = row.status === 'setup_completed'

  async function handleAssignOpsOwner() {
    if (!row) return
    const ownerId = opsOwner.trim() ? Number(opsOwner.trim()) : NaN
    if (!Number.isFinite(ownerId) || ownerId < 1) {
      setAssignError('Select an operations owner before submitting.')
      return
    }
    setAssignBusy(true)
    setAssignError(null)
    try {
      const updated = await assignMobilisationOperationsOwner(row.id, { operations_owner: ownerId })
      setRow(updated)
      setAssignOwnerOpen(false)
      setSetupSuccess('Mobilisation sent to operations setup.')
      setTimeout(() => setSetupSuccess(null), 4000)
    } catch (e: unknown) {
      setAssignError(parseApiError(e, 'Could not assign operations owner').message)
    } finally {
      setAssignBusy(false)
    }
  }

  async function handleMarkSetupCompleted() {
    if (!row) return
    setSetupBusy(true)
    setSetupError(null)
    try {
      const updated = await markMobilisationSetupCompleted(row.id)
      setRow(updated)
      setSetupSuccess('Setup completed. This mobilisation can now be finalized or sent for approval.')
      setTimeout(() => setSetupSuccess(null), 6000)
    } catch (e: unknown) {
      const msg = parseApiError(e, 'Could not mark setup completed').message
      setSetupError(msg)
    } finally {
      setSetupBusy(false)
    }
  }

  const approvalTab = (
    <div className="space-y-4">
      {!canFinalizeOrStartWorkflow ? (
        <div className="rounded-panel border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Operations must add at least one client user and mark setup completed before finalization.
          </p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200/80">
            Current status: <span className="font-medium">{mobilisationStatusLabel(row.status)}</span>
          </p>
          {canUpdateMobilisation && row.status === 'operations_setup' ? (
            <div className="mt-3">
              <Button variant="secondary" className="min-h-9" onClick={() => setTab('users')}>
                Go to Client Users
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="rounded-panel border border-app-border bg-app-surface p-4">
        <p className="text-sm font-semibold text-app-text">Direct finalization</p>
        <p className="mt-1 text-xs text-app-secondary">
          Create client portal users now without approval. Use this when client user setup is already verified.
        </p>
        {fin === 'finalized' ? (
          <p className="mt-3 text-sm font-medium text-status-success">Finalized successfully.</p>
        ) : fin === 'failed' ? (
          <div className="mt-3 space-y-2">
            <p className="text-sm font-medium text-status-danger">Previous finalization failed.</p>
            {row.finalization_error?.trim() ? (
              <p className="text-xs text-app-secondary">{row.finalization_error}</p>
            ) : null}
          </div>
        ) : null}
        {finalizeError ? (
          <p className="mt-3 text-sm font-medium text-status-danger">{finalizeError}</p>
        ) : null}
        {fin !== 'finalized' ? (
          <div className="mt-4">
            <Button
              onClick={() => void handleFinalizeDirectly()}
              disabled={finalizeBusy || !canFinalizeOrStartWorkflow || !canFinalizeMobilisation}
            >
              {finalizeBusy ? 'Finalizing...' : fin === 'failed' ? 'Retry finalization' : 'Finalize directly'}
            </Button>
            {!canFinalizeMobilisation ? (
              <p className="mt-2 text-xs text-app-secondary">
                You need mobilisation.finalize permission to use direct finalization.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {fin !== 'finalized' ? (
        <section className="rounded-panel border border-app-border bg-app-surface p-4">
          <p className="text-sm font-semibold text-app-text">Approval workflow</p>
          <p className="mt-1 text-xs text-app-secondary">
            {isWorkflowStarted
              ? 'Track approval progress and act on the current step.'
              : 'Choose an approval route and send for approval.'}
          </p>

          {row.workflow_status === 'not_started' && canWorkflowStart && isReadyForApproval && canFinalizeOrStartWorkflow ? (
            <div className="mt-4 space-y-3">
              <ApprovalRouteSelector
                routes={availableRoutes}
                selectedRouteId={selectedRouteId}
                onChange={(rid) => { setSelectedRouteId(rid); setStartError(null) }}
                loading={routesLoading}
                error={routesError}
                disabled={startBusy}
                emptyMessage="No approval route configured for mobilisation."
              />
            </div>
          ) : null}

          {startError ? (
            <div className="mt-4">
              <ErrorState message={startError} />
            </div>
          ) : null}

          <div className="mt-4 border-t border-app-border pt-4">
            {wm ? (
              <WorkflowStatusPanel
                workflowStatus={wm.workflowStatus}
                workflowInstanceId={wm.instanceId}
                workflowCurrentStepCode={wm.stepCode}
                workflowCurrentStepName={wm.stepName}
                workflowCurrentAssignedUserName={wm.assignedUserName}
                workflowCurrentDepartmentName={wm.deptName}
                canConfigCheck={canConfigCheck}
                canStart={canWorkflowStart && canFinalizeOrStartWorkflow}
                checkingConfig={configBusy}
                starting={startBusy}
                onCheckConfig={() => void handleCheckConfig()}
                onStartWorkflow={() => void handleStartWorkflow()}
                startButtonLabel="Send for approval"
                startDisabled={startDisabledByRoutes}
                configCheckButtonLabel="Check approval setup"
              />
            ) : null}
          </div>

          {canWorkflowReassign && wm?.workflowStatus === 'active' && wm.instanceId != null && wm.instanceId > 0 && wm.stepId != null && wm.stepId > 0 ? (
            <div className="mt-4 border-t border-app-border pt-4">
              <Button variant="secondary" className="min-h-9" onClick={() => setReassignOpen(true)}>
                Reassign current step
              </Button>
            </div>
          ) : null}

          {wm?.instanceId != null && wm.instanceId > 0 && canWorkflowRead ? (
            <div className="mt-6 border-t border-app-border pt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">History</p>
              <div className="mt-3">
                <WorkflowTimeline instance={wfInstance} loading={wfInstanceLoading} errorMessage={wfInstanceError} />
              </div>
            </div>
          ) : null}

          {wm?.instanceId != null && wm.instanceId > 0 && wm.stepId != null && wm.stepId > 0 ? (
            <div className="mt-6 border-t border-app-border pt-4">
              <WorkflowActionBox
                instanceId={wm.instanceId}
                stepId={wm.stepId}
                workflowStatus={wm.workflowStatus}
                assignedUserId={wm.assignedUserId}
                meId={me?.id}
                isSuperuser={!!me?.is_superuser}
                canApprove={canWorkflowApprove}
                canReject={canWorkflowReject}
                onSuccess={() => reloadRowAndWorkflow()}
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {!showApprovalWorkflow && row.mobilisation_requires_approval && fin !== 'finalized' ? (
        <div className="rounded-panel border border-app-border bg-app-muted p-4">
          <p className="text-sm text-app-secondary">
            Workflow setup is not complete. Contact your administrator to configure approval routes for mobilisation.
          </p>
        </div>
      ) : null}
    </div>
  )

  return (
    <div className="w-full space-y-6">
      <div className="border-b border-app-border pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Mobilisation</p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-app-text">
              #{row.id}
            </h2>
            {row.source_sales_lead_name ? (
              <p className="mt-1 text-sm text-app-secondary">{row.source_sales_lead_name}</p>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={statusBadgeVariant(row.status)}>{mobilisationStatusLabel(row.status)}</Badge>
              <Badge variant={finalizationBadgeVariant(fin)}>{mobilisationFinalizationLabel(fin)}</Badge>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="secondary"
              className="min-h-9 px-2"
              onClick={() => navigate('/mobilisation')}
              aria-label="Back to list"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>

      <section className="rounded-panel border border-app-border bg-app-surface p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {row.status === 'draft' ? (
              <>
                <p className="text-sm font-semibold text-app-text">Operations handoff</p>
                <p className="mt-1 text-xs text-app-secondary">This mobilisation has not been sent to operations yet.</p>
              </>
            ) : row.status === 'operations_setup' ? (
              <>
                <p className="text-sm font-semibold text-app-text">Operations setup in progress</p>
                <p className="mt-1 text-xs text-app-secondary">
                  Ops owner: <span className="font-medium text-app-text">{row.assigned_operations_owner_username ?? '—'}</span>
                  {row.submitted_to_operations_at ? (
                    <> · submitted {new Date(row.submitted_to_operations_at).toLocaleString()}</>
                  ) : null}
                </p>
              </>
            ) : row.status === 'setup_completed' ? (
              <>
                <p className="text-sm font-semibold text-app-text">Operations setup completed</p>
                <p className="mt-1 text-xs text-app-secondary">
                  Completed by <span className="font-medium text-app-text">{row.setup_completed_by_username ?? '—'}</span>
                  {row.setup_completed_at ? <> · {new Date(row.setup_completed_at).toLocaleString()}</> : null}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-app-text">Operations handoff</p>
                <p className="mt-1 text-xs text-app-secondary">
                  Status: <span className="font-medium text-app-text">{mobilisationStatusLabel(row.status)}</span>
                </p>
              </>
            )}
            {setupSuccess ? <p className="mt-2 text-xs text-status-hired">{setupSuccess}</p> : null}
            {setupError ? (
              <div className="mt-2">
                <ErrorState message={setupError} />
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {row.status === 'draft' && canUpdateMobilisation ? (
              <Button
                variant="secondary"
                className="min-h-9"
                onClick={() => { setAssignOwnerOpen(true); setAssignError(null); setOpsOwner('') }}
              >
                Assign operations owner
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap gap-1 border-b border-app-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 pb-3 pt-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 px-2',
              tab === t.id
                ? 'border-app-text font-semibold text-app-text'
                : 'border-transparent font-normal text-app-secondary hover:text-app-text',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview' ? (
          <OverviewTab row={row} onNavigateTab={setTab} usersRefreshKey={usersRefreshKey} />
        ) : null}
        {tab === 'users' ? (
          <ClientUsersPanel
            requestId={row.id}
            isEditable={canEditSetup}
            isFinalized={fin === 'finalized'}
            onMarkSetupCompleted={handleMarkSetupCompleted}
            markingComplete={setupBusy}
            onUsersChanged={handleClientUsersChanged}
          />
        ) : null}
        {tab === 'approval' ? approvalTab : null}
      </div>

      <Drawer
        open={assignOwnerOpen}
        title="Assign operations owner"
        description="This person will add client portal users and complete mobilisation setup before finalization."
        onClose={() => !assignBusy && setAssignOwnerOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={assignBusy} onClick={() => setAssignOwnerOpen(false)}>
              Cancel
            </Button>
            <Button disabled={assignBusy} onClick={() => void handleAssignOpsOwner()}>
              {assignBusy ? 'Saving…' : 'Assign'}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Select
            id="mob_ops_owner"
            label="Operations owner"
            value={opsOwner}
            onChange={(e) => setOpsOwner(e.target.value)}
            disabled={assignBusy || opsUsersLoading}
          >
            <option value="">{opsUsersLoading ? 'Loading users…' : 'Select a user'}</option>
            {opsUsers.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.username} ({u.first_name} {u.last_name})
              </option>
            ))}
          </Select>
          {opsUsersError ? <ErrorState message={opsUsersError} /> : null}
          {assignError ? <ErrorState message={assignError} /> : null}
        </div>
      </Drawer>

      <WorkflowConfigCheckDrawer
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        loading={configBusy}
        errorMessage={configError}
        data={configData}
        title="Approval setup check"
        description="Shows the route and approvers before sending."
        loadingLabel="Loading approval setup check"
      />

      <WorkflowReassignDrawer
        open={reassignOpen}
        onClose={() => setReassignOpen(false)}
        instanceId={wm?.instanceId ?? null}
        stepId={wm?.stepId ?? null}
        onSuccess={() => reloadRowAndWorkflow()}
      />
    </div>
  )
}
