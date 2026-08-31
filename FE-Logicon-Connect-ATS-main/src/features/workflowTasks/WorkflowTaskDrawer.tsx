import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { actOnWorkflowStep, getMyWorkflowTaskDetail } from '@/api/workflow'
import { parseApiError, parseWorkflowStepActionError } from '@/lib/apiError'
import { WorkflowActionErrorBanner } from '@/features/workflowTasks/WorkflowActionErrorBanner'
import { formatLineItemBillableImpact, formatMoney } from '@/features/mrf/mrfBudgetContext'
import {
  countCommercialOverrides,
  formatCommercialMoney,
  formatMasterCommercialSummary,
  formatRequestedCommercialSummary,
  formatWageRange,
  isCommercialOverrideEnabled,
  resolveMasterCommercials,
} from '@/features/mrf/mrfCommercialOverride'
import { proposalStatusLabel, proposalStatusVariant } from '@/features/sales/salesUtils'
import {
  buildBreakupRoleGroups,
  getBreakupComponentStyle,
  getBreakupRoleBandStyle,
  getUnmappedBreakupLines,
} from '@/features/sales/salesBreakupGrouping'
import type {
  WorkflowAction,
  WorkflowMyTask,
  WorkflowTaskDetailResponse,
  WorkflowTaskMobilisationSetup,
  WorkflowTaskMRF,
  WorkflowTaskMRFLineItem,
  WorkflowTaskSalesProposal,
  WorkflowTaskSalesProposalBudgetLine,
  WorkflowTaskSalesProposalBreakupLine,
  WorkflowTaskTarget,
} from '@/features/workflow/types'
import type { ProposalBreakupLine, ProposalBudgetLine } from '@/types/sales'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import {
  ActionNudge,
  TaskApprovalCard,
  TaskBudgetImpactCard,
  TaskInfoGrid,
  TaskMetricTile,
  TaskSectionCard,
  TaskSummaryBand,
} from '@/features/workflowTasks/TaskOverviewComponents'
import {
  TaskAuditList,
  TaskTimelineStepper,
} from '@/features/workflowTasks/TaskTimelineComponents'
import {
  MobilisationDepartmentsTab,
  MobilisationOverviewTab,
  MobilisationUsersTab,
} from '@/features/workflowTasks/workflowTaskOnboardingTabs'
import { cn } from '@/lib/cn'

function isMrfTarget(t: WorkflowTaskTarget): t is Extract<WorkflowTaskTarget, { type: 'mrf' }> {
  return t.type === 'mrf'
}

function isMobilisationLike(
  t: WorkflowTaskTarget,
): t is
  | Extract<WorkflowTaskTarget, { type: 'mobilisation' }>
  | Extract<WorkflowTaskTarget, { type: 'client_onboarding' }> {
  return t.type === 'mobilisation' || t.type === 'client_onboarding'
}

function isProposalTarget(
  t: WorkflowTaskTarget,
): t is Extract<WorkflowTaskTarget, { type: 'sales_proposal' }> {
  return t.type === 'sales_proposal'
}

function getMobilisationData(t: WorkflowTaskTarget): WorkflowTaskMobilisationSetup | null {
  if (t.type === 'mobilisation') return t.mobilisation
  if (t.type === 'client_onboarding') return t.client_onboarding
  return null
}

function targetDetailUrl(t: WorkflowTaskTarget): string | null {
  if (t.type === 'mrf') return `/mrf/${t.mrf.id}`
  if (t.type === 'mobilisation') return `/mobilisation/${t.mobilisation.id}`
  if (t.type === 'client_onboarding') return `/mobilisation/${t.client_onboarding.id}`
  if (t.type === 'sales_proposal') return `/sales/proposals/${t.sales_proposal.id}`
  return null
}

function salesProposalDrawerView(
  target: Extract<WorkflowTaskTarget, { type: 'sales_proposal' }>,
): WorkflowTaskSalesProposal {
  const proposal = target.sales_proposal
  const clientResponse = proposal.client_response_summary?.client_response ?? proposal.client_approval_status
  const clientRemarks = proposal.client_response_summary?.client_remarks || ''
  return {
    ...proposal,
    client_name: proposal.lead?.client_name ?? null,
    lead_type: proposal.lead?.current_stage ?? null,
    sales_person_name: proposal.sales_person?.username ?? null,
    client_approval_status: clientResponse,
    client_remarks: clientRemarks || proposal.sales_remarks || null,
    valid_from: proposal.submitted_internal_at ?? null,
    valid_to: proposal.internally_approved_at ?? null,
    budget_lines: target.budget_lines.map((line) => ({
      ...line,
      is_manual_override: line.is_manual_override ?? false,
    })),
    breakup_lines: target.breakup_lines,
  }
}

function humanizeMrfType(code: string): string {
  return code.replace(/_/g, ' ')
}

type BadgeVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'

function mrfStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'approved':
      return 'success'
    case 'rejected':
    case 'cancelled':
      return 'danger'
    case 'submitted':
      return 'info'
    case 'hr_review':
    case 'finance_review':
    case 'admin_review':
    case 'client_review':
      return 'attention'
    default:
      return 'neutral'
  }
}

function mrfStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    hr_review: 'HR Review',
    finance_review: 'Finance Review',
    admin_review: 'Admin Review',
    client_review: 'Client Review',
    approved: 'Approved',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

type MrfTabId = 'overview' | 'request' | 'line-items' | 'timeline' | 'action'
type MobilisationTabId = 'overview' | 'departments' | 'users' | 'timeline' | 'action'
type ProposalTabId = 'overview' | 'budget-lines' | 'breakup' | 'timeline' | 'action'
type TabId = MrfTabId | MobilisationTabId | ProposalTabId

const MRF_TABS: { id: MrfTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'request', label: 'Request' },
  { id: 'line-items', label: 'Line items' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'action', label: 'Action' },
]

const MOBILISATION_TABS: { id: MobilisationTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'departments', label: 'Departments' },
  { id: 'users', label: 'Users' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'action', label: 'Action' },
]

const PROPOSAL_TABS: { id: ProposalTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget-lines', label: 'Budget lines' },
  { id: 'breakup', label: 'Salary breakup' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'action', label: 'Action' },
]

// ─── Line item preview row (overview only) ────────────────────────────────────

function LineItemPreviewRow({
  li,
  billingType,
}: {
  li: WorkflowTaskMRFLineItem
  billingType: string
}) {
  const isBillable = billingType === 'billable'
  const approved = li.srr_approved_headcount
  const headStr =
    approved != null
      ? `Headcount ${li.headcount} of ${approved}`
      : `Headcount ${li.headcount}`

  const overridden = isCommercialOverrideEnabled(li)
  const master = resolveMasterCommercials(li, null)

  return (
    <div className="flex items-start gap-3 rounded-panel bg-app-muted/50 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-app-text">
            {li.job_role_name ?? (li.job_role != null ? `Role #${li.job_role}` : '—')}
          </p>
          {overridden ? <Badge variant="warning">Commercial override</Badge> : null}
        </div>
        <p className="mt-0.5 text-xs text-app-secondary">{headStr}</p>
        {isBillable && overridden ? (
          <>
            <p className="mt-0.5 text-[10px] text-app-subtle">
              Master: {formatMasterCommercialSummary(master)}
            </p>
            <p className="mt-0.5 text-[10px] text-app-secondary">
              Requested: {formatRequestedCommercialSummary(li)}
            </p>
            {li.commercial_override_reason ? (
              <p className="mt-0.5 line-clamp-2 text-[10px] text-app-subtle">
                {li.commercial_override_reason}
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-0.5 text-[10px] text-app-subtle">
            {formatWageRange(li.wage_min_requested, li.wage_max_requested) ?? '—'}
            {isBillable && (li.billing_rate_snapshot ?? li.srr_billing_rate)
              ? ` · Billing ${formatCommercialMoney(li.billing_rate_snapshot ?? li.srr_billing_rate)}`
              : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── MRF Overview tab ─────────────────────────────────────────────────────────

function MrfOverviewTab({
  task,
  mrf,
  lineItems,
  detailUrl,
  onGoToLineItems,
  onGoToAction,
}: {
  task: WorkflowMyTask
  mrf: WorkflowTaskMRF
  lineItems: WorkflowTaskMRFLineItem[]
  detailUrl: string | null
  onGoToLineItems: () => void
  onGoToAction: () => void
}) {
  const totalRequested = lineItems.reduce((s, li) => s + li.headcount, 0)
  const hasApproved =
    lineItems.length > 0 && lineItems.some((li) => li.srr_approved_headcount != null)
  const totalApproved = hasApproved
    ? lineItems.reduce((s, li) => s + (li.srr_approved_headcount ?? 0), 0)
    : null
  const hasRemaining =
    lineItems.length > 0 && lineItems.some((li) => li.srr_remaining_headcount != null)
  const totalRemaining = hasRemaining
    ? lineItems.reduce((s, li) => s + (li.srr_remaining_headcount ?? 0), 0)
    : null

  const subtitle = [mrf.client_name?.trim(), mrf.site_name?.trim()]
    .filter(Boolean)
    .join(' · ')
  const overrideCount = countCommercialOverrides(lineItems)

  return (
    <div className="space-y-3">
      <TaskSummaryBand
        title={`MRF #${mrf.id}`}
        subtitle={subtitle || null}
        badges={
          <>
            <Badge variant="info">{task.step_name}</Badge>
            {mrf.billing_type === 'billable' ? (
              <Badge variant="info">Billable</Badge>
            ) : (
              <Badge variant="neutral">Non-billable</Badge>
            )}
            <Badge variant={mrfStatusVariant(mrf.status)}>
              {mrfStatusLabel(mrf.status)}
            </Badge>
          </>
        }
      />

      {detailUrl ? <TargetDetailLink url={detailUrl} /> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TaskMetricTile
          label="Requested headcount"
          value={lineItems.length > 0 ? totalRequested : '—'}
        />
        <TaskMetricTile
          label="Approved headcount"
          value={totalApproved != null ? totalApproved : '—'}
        />
        <TaskMetricTile
          label="Remaining"
          value={totalRemaining != null ? totalRemaining : '—'}
          highlight={
            totalRemaining != null
              ? totalRemaining < 5
                ? 'warning'
                : 'positive'
              : 'neutral'
          }
        />
        <TaskMetricTile
          label="Budget impact"
          value={mrf.requested_budget_amount ? formatMoney(mrf.requested_budget_amount) : '—'}
          compact={!!mrf.requested_budget_amount}
        />
      </div>

      <TaskBudgetImpactCard source={mrf} />

      {overrideCount > 0 ? (
        <div className="rounded-panel border border-status-warning/40 bg-status-warning/5 px-4 py-3 text-sm text-app-secondary">
          <p className="font-medium text-app-text">Commercial override review</p>
          <p className="mt-1 text-xs">
            {overrideCount} line item{overrideCount !== 1 ? 's' : ''} override configured commercial
            wage/billing values. Review master vs requested amounts in the Line items tab.
          </p>
        </div>
      ) : null}

      <TaskApprovalCard
        stepName={task.step_name}
        departmentName={task.assigned_department_name}
        activatedAt={task.activated_at}
        dueAt={task.due_at}
      />

      <TaskInfoGrid
        title="Request details"
        rows={[
          { label: 'Client', value: mrf.client_name?.trim() || '—' },
          { label: 'Site', value: mrf.site_name?.trim() || '—' },
          { label: 'Requesting dept', value: mrf.requesting_department_name?.trim() || '—' },
          { label: 'Required dept', value: mrf.required_department_name?.trim() || '—' },
          { label: 'MRF type', value: humanizeMrfType(mrf.mrf_type) },
          { label: 'Requested by', value: mrf.requested_by_type?.replace(/_/g, ' ') ?? '—' },
          {
            label: 'Billing type',
            value:
              mrf.billing_type === 'billable' ? (
                <Badge variant="info">Billable</Badge>
              ) : (
                <Badge variant="neutral">Non-billable</Badge>
              ),
          },
          {
            label: 'Status',
            value: (
              <Badge variant={mrfStatusVariant(mrf.status)}>
                {mrfStatusLabel(mrf.status)}
              </Badge>
            ),
          },
        ]}
      />

      <div className="rounded-panel border border-app-border bg-app-surface px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
            Line items
          </p>
          {lineItems.length > 0 && (
            <button
              type="button"
              onClick={onGoToLineItems}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {lineItems.length > 3 ? `View all ${lineItems.length} →` : 'View line items →'}
            </button>
          )}
        </div>
        {lineItems.length === 0 ? (
          <p className="text-xs text-app-secondary">No line items available.</p>
        ) : (
          <div className="space-y-1.5">
            {lineItems.slice(0, 3).map((li) => (
              <LineItemPreviewRow key={li.id} li={li} billingType={mrf.billing_type} />
            ))}
          </div>
        )}
      </div>

      <ActionNudge onGoToAction={onGoToAction} />
    </div>
  )
}

// ─── Request tab ─────────────────────────────────────────────────────────────

function RequestTabMrf({ mrf }: { mrf: WorkflowTaskMRF }) {
  return (
    <div className="space-y-3">
      {/* Structured request context */}
      <TaskInfoGrid
        title="Request context"
        rows={[
          { label: 'Client', value: mrf.client_name?.trim() || '—' },
          { label: 'Site', value: mrf.site_name?.trim() || '—' },
          { label: 'MRF type', value: humanizeMrfType(mrf.mrf_type) },
          {
            label: 'Billing type',
            value:
              mrf.billing_type === 'billable' ? (
                <Badge variant="info">Billable</Badge>
              ) : (
                <Badge variant="neutral">Non-billable</Badge>
              ),
          },
          {
            label: 'Requesting dept',
            value: mrf.requesting_department_name?.trim() || '—',
          },
          {
            label: 'Required dept',
            value: mrf.required_department_name?.trim() ? (
              <span className="font-medium text-app-text">
                {mrf.required_department_name.trim()}
              </span>
            ) : (
              '—'
            ),
          },
          { label: 'Requested by', value: mrf.requested_by_username?.trim() || '—' },
          {
            label: 'Requester type',
            value: mrf.requested_by_type?.replace(/_/g, ' ') || '—',
          },
          { label: 'Required by date', value: mrf.required_by_date || '—' },
          {
            label: 'Client visible',
            value: mrf.client_visible ? (
              <Badge variant="info">Yes</Badge>
            ) : (
              <span className="text-app-subtle">No</span>
            ),
          },
        ]}
      />

      {/* Reason */}
      {mrf.reason?.trim() ? (
        <TaskSectionCard title="Reason">
          <p className="whitespace-pre-wrap text-sm text-app-secondary">{mrf.reason}</p>
        </TaskSectionCard>
      ) : null}

      {/* Budget impact */}
      <TaskBudgetImpactCard source={mrf} />
    </div>
  )
}

// ─── Line items tab ───────────────────────────────────────────────────────────

function LineItemsTab({
  items,
  billingType,
}: {
  items: WorkflowTaskMRFLineItem[]
  billingType?: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-app-secondary">No line items found.</p>
  }
  const isBillable = billingType === 'billable'
  return (
    <div className="overflow-x-auto rounded-panel border border-app-border">
      <Table>
        <THead>
          <TR>
            <TH className="py-2">Job role</TH>
            {isBillable ? (
              <>
                <TH className="py-2">Headcount impact</TH>
                <TH className="py-2">Commercials</TH>
                <TH className="py-2">Billing / estimate</TH>
              </>
            ) : (
              <>
                <TH className="py-2">Headcount</TH>
                <TH className="py-2">Wage category</TH>
                <TH className="py-2">Wage range</TH>
                <TH className="py-2">Billing rate</TH>
              </>
            )}
          </TR>
        </THead>
        <TBody>
          {items.map((li) => {
            const impact = formatLineItemBillableImpact(li, null)
            const overridden = isCommercialOverrideEnabled(li)
            const master = resolveMasterCommercials(li, null)
            return (
              <TR key={li.id}>
                <TD className="py-2 text-sm">
                  {li.job_role_name ?? (li.job_role != null ? `#${li.job_role}` : '-')}
                </TD>
                {isBillable ? (
                  <>
                    <TD className="py-2 text-xs text-app-secondary">
                      <div>{impact.headcountLine}</div>
                      {li.site_role_requirement_label ? (
                        <p className="mt-0.5 text-app-subtle">
                          {li.site_role_requirement_label}
                        </p>
                      ) : null}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {overridden ? (
                        <div className="space-y-1">
                          <Badge variant="warning">Commercial override</Badge>
                          <p className="text-[10px] text-app-subtle">
                            Master: {formatWageRange(master.wageMin, master.wageMax) ?? '—'}
                            {master.billingRate
                              ? ` · Billing ${formatCommercialMoney(master.billingRate)}`
                              : ''}
                          </p>
                          <p className="text-app-text">
                            Requested: {formatRequestedCommercialSummary(li)}
                          </p>
                          {li.commercial_override_reason ? (
                            <p className="line-clamp-3 text-[10px]" title={li.commercial_override_reason}>
                              {li.commercial_override_reason}
                            </p>
                          ) : null}
                          {li.commercial_overridden_at ? (
                            <p className="text-[10px] text-app-subtle">
                              {new Date(li.commercial_overridden_at).toLocaleString()}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <Badge variant="neutral">From SRR/master</Badge>
                      )}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {impact.amountLine ??
                        formatMoney(li.billing_rate_snapshot ?? li.srr_billing_rate)}
                    </TD>
                  </>
                ) : (
                  <>
                    <TD className="py-2 text-sm">{li.headcount}</TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {li.wage_category_name ?? '-'}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {li.wage_min_requested ?? '-'} - {li.wage_max_requested ?? '-'}
                    </TD>
                    <TD className="py-2 text-xs text-app-secondary">
                      {li.billing_rate_snapshot ?? '-'}
                    </TD>
                  </>
                )}
              </TR>
            )
          })}
        </TBody>
      </Table>
    </div>
  )
}

// ─── Target detail link ───────────────────────────────────────────────────────

function TargetDetailLink({ url }: { url: string }) {
  return (
    <Link
      to={url}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 hover:underline"
    >
      <ExternalLink className="h-3.5 w-3.5" />
      View full details
    </Link>
  )
}

// ─── Sales proposal helpers ───────────────────────────────────────────────────

function clientApprovalStatusLabel(s: string | null | undefined): string {
  if (!s) return '—'
  const map: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return map[s] ?? s.replace(/_/g, ' ')
}

type BadgeVariant2 = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'attention'

function clientApprovalStatusVariant(s: string | null | undefined): BadgeVariant2 {
  if (s === 'approved') return 'success'
  if (s === 'rejected') return 'danger'
  if (s === 'pending') return 'attention'
  return 'neutral'
}

// ─── Sales proposal overview tab ─────────────────────────────────────────────

function ProposalOverviewTab({
  task,
  proposal,
  budgetLines,
  breakupLines,
  detailUrl,
  onGoToBudgetLines,
  onGoToAction,
}: {
  task: WorkflowMyTask
  proposal: WorkflowTaskSalesProposal
  budgetLines: WorkflowTaskSalesProposalBudgetLine[]
  breakupLines: WorkflowTaskSalesProposalBreakupLine[]
  detailUrl: string | null
  onGoToBudgetLines: () => void
  onGoToAction: () => void
}) {
  const statusLabel = proposal.status ? proposalStatusLabel(proposal.status) : '—'
  const statusVariant = proposalStatusVariant(proposal.status ?? '')
  const budgetCount = budgetLines.length
  const breakupCount = breakupLines.length
  const clientName = proposal.lead?.client_name?.trim() || null
  const leadStage = proposal.lead?.current_stage?.replace(/_/g, ' ') || null
  const leadTypeFull = proposal.lead_type?.replace(/_/g, ' ') || leadStage

  return (
    <div className="space-y-3">
      <TaskSummaryBand
        title={`Proposal #${proposal.id}${proposal.version_number != null ? ` v${proposal.version_number}` : ''}`}
        subtitle={clientName}
        badges={
          <>
            <Badge variant="info">{task.step_name}</Badge>
            {leadStage ? <Badge variant="neutral" className="capitalize">{leadStage}</Badge> : null}
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </>
        }
      />

      {detailUrl ? <TargetDetailLink url={detailUrl} /> : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TaskMetricTile
          label="Grand total"
          value={proposal.grand_total ? formatMoney(proposal.grand_total) : '—'}
          compact
        />
        <TaskMetricTile
          label="Manpower count"
          value={proposal.manpower_total != null ? proposal.manpower_total : '—'}
        />
        <TaskMetricTile label="Budget lines" value={budgetCount} />
        <TaskMetricTile label="Breakup lines" value={breakupCount} />
      </div>

      <TaskApprovalCard
        stepName={task.step_name}
        departmentName={task.assigned_department_name}
        activatedAt={task.activated_at}
        dueAt={task.due_at}
      />

      <TaskInfoGrid
        title="Proposal details"
        rows={[
          { label: 'Client', value: proposal.client_name?.trim() || '—' },
          { label: 'Lead type', value: leadTypeFull ?? '—' },
          { label: 'Sales person', value: proposal.sales_person_name?.trim() || '—' },
          { label: 'Version', value: proposal.version_number != null ? `v${proposal.version_number}` : '—' },
          { label: 'Valid from', value: proposal.valid_from ?? '—' },
          { label: 'Valid to', value: proposal.valid_to ?? '—' },
          {
            label: 'Status',
            value: <Badge variant={statusVariant}>{statusLabel}</Badge>,
          },
          {
            label: 'Client response',
            value: (
              <Badge variant={clientApprovalStatusVariant(proposal.client_approval_status)}>
                {clientApprovalStatusLabel(proposal.client_approval_status)}
              </Badge>
            ),
          },
        ]}
      />

      {/* Client remarks */}
      {proposal.client_remarks?.trim() ? (
        <TaskSectionCard title="Client remarks">
          <p className="whitespace-pre-wrap text-sm text-app-secondary">{proposal.client_remarks}</p>
        </TaskSectionCard>
      ) : null}

      {/* Budget lines preview */}
      <div className="rounded-panel border border-app-border bg-app-surface px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
            Budget lines
          </p>
          {budgetCount > 0 ? (
            <button
              type="button"
              onClick={onGoToBudgetLines}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {budgetCount > 3 ? `View all ${budgetCount} →` : 'View budget lines →'}
            </button>
          ) : null}
        </div>
        {budgetCount === 0 ? (
          <p className="text-xs text-app-secondary">No budget lines.</p>
        ) : (
          <div className="space-y-1">
            {(proposal.budget_lines ?? []).slice(0, 3).map((bl) => (
              <div
                key={bl.id}
                className="flex items-center justify-between gap-3 rounded-panel bg-app-muted/50 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-app-text">
                    {bl.job_role_name ?? '—'}
                  </p>
                  <p className="text-xs text-app-secondary">
                    {bl.site_name ?? '—'}
                    {bl.manpower_count != null ? ` · HC ${bl.manpower_count}` : ''}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-app-text">
                  {bl.total_cost ? formatMoney(bl.total_cost) : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ActionNudge onGoToAction={onGoToAction} />
    </div>
  )
}

// ─── Sales proposal budget lines tab ─────────────────────────────────────────

function BudgetLinesTabProposal({ proposal }: { proposal: WorkflowTaskSalesProposal }) {
  const lines: WorkflowTaskSalesProposalBudgetLine[] = proposal.budget_lines ?? []
  if (lines.length === 0) {
    return <p className="text-sm text-app-secondary">No budget lines.</p>
  }
  return (
    <div className="overflow-x-auto rounded-panel border border-app-border">
      <Table>
        <THead>
          <TR>
            <TH className="py-2">Job role</TH>
            <TH className="py-2">Site</TH>
            <TH className="py-2">Headcount</TH>
            <TH className="py-2">Unit cost</TH>
            <TH className="py-2">Total</TH>
            <TH className="py-2">Override</TH>
          </TR>
        </THead>
        <TBody>
          {lines.map((bl) => (
            <TR key={bl.id}>
              <TD className="py-2 text-sm">{bl.job_role_name ?? '—'}</TD>
              <TD className="py-2 text-xs text-app-secondary">{bl.site_name ?? '—'}</TD>
              <TD className="py-2 text-sm">{bl.manpower_count ?? '—'}</TD>
              <TD className="py-2 text-xs tabular-nums text-app-secondary">
                {bl.unit_cost ? formatMoney(bl.unit_cost) : '—'}
              </TD>
              <TD className="py-2 text-sm font-semibold tabular-nums">
                {bl.total_cost ? formatMoney(bl.total_cost) : '—'}
              </TD>
              <TD className="py-2">
                {bl.is_manual_override ? (
                  <Badge variant="warning">Override</Badge>
                ) : (
                  <span className="text-xs text-app-subtle">—</span>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}

// ─── Sales proposal breakup tab ───────────────────────────────────────────────

function BreakupTabProposal({ proposal }: { proposal: WorkflowTaskSalesProposal }) {
  const budgetLines: ProposalBudgetLine[] = (proposal.budget_lines ?? []).map((line) => ({
    id: line.id,
    proposal_version: proposal.id,
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
    is_manual_override: line.is_manual_override ?? false,
  }))
  const breakupLines: ProposalBreakupLine[] = (proposal.breakup_lines ?? []).map((line) => ({
    id: line.id,
    proposal_version: proposal.id,
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
  const groups = buildBreakupRoleGroups(breakupLines, budgetLines)
  const unmappedBreakupLines = getUnmappedBreakupLines(breakupLines)

  if (breakupLines.length === 0) {
    return <p className="text-sm text-app-secondary">No breakup lines.</p>
  }
  if (unmappedBreakupLines.length > 0) {
    return (
      <div className="rounded-panel border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
        <p className="font-semibold">Salary breakup is missing role mapping.</p>
        <p className="mt-1">
          {unmappedBreakupLines.length} component
          {unmappedBreakupLines.length !== 1 ? 's are' : ' is'} not linked to a role requirement.
          Send this proposal back for regeneration before approving.
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-4">
      <div className="rounded-panel border border-app-border bg-app-muted/20 px-3 py-2">
        <p className="text-xs font-medium text-app-secondary">
          {groups.length} role{groups.length !== 1 ? 's' : ''} - {breakupLines.length} component
          {breakupLines.length !== 1 ? 's' : ''}
        </p>
      </div>

      {groups.map((group, groupIndex) => {
        const band = getBreakupRoleBandStyle(groupIndex, group.groupKey)
        return (
          <section
            key={group.groupKey}
            className={cn(
              'overflow-hidden rounded-panel border border-l-4 shadow-sm',
              band.border,
              band.borderAccent,
            )}
          >
            <div className={cn('border-b px-4 py-3', band.headerBg, band.headerBorder)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold', band.titleText)}>{group.title}</p>
                  <div className={cn('mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs', band.metaText)}>
                    {group.siteName ? <span>{group.siteName}</span> : null}
                    {group.headcount != null ? <span>Headcount {group.headcount}</span> : null}
                    {group.unitCost ? <span>Unit {formatMoney(group.unitCost)}</span> : null}
                    {group.totalCost ? <span>Budget {formatMoney(group.totalCost)}</span> : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
                    Role total
                  </p>
                  <p className={cn('text-sm font-bold tabular-nums', band.totalText)}>
                    {formatMoney(group.total)}
                  </p>
                </div>
              </div>
            </div>

            <div className={cn('space-y-3 p-3', band.bodyBg)}>
              {group.sections.map((section) => {
                const sectionStyle = getBreakupComponentStyle(section.componentType)
                return (
                  <div key={`${group.groupKey}-${section.componentType}`} className="overflow-hidden rounded-panel border border-app-border bg-app-surface">
                    <div className={cn('flex items-center justify-between border-b px-3 py-2', sectionStyle.border)}>
                      <p className={cn('text-xs font-semibold', sectionStyle.text)}>{section.label}</p>
                      <p className="text-xs font-semibold tabular-nums text-app-text">
                        {formatMoney(section.total)}
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <THead>
                          <TR>
                            <TH className="py-2">Component</TH>
                            <TH className="py-2">Percentage</TH>
                            <TH className="py-2">Amount</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {section.rows.map((line) => (
                            <TR key={line.id}>
                              <TD className="py-2 text-sm">{line.component_name ?? '-'}</TD>
                              <TD className="py-2 text-xs tabular-nums text-app-secondary">
                                {line.percentage ? `${line.percentage}%` : '-'}
                              </TD>
                              <TD className="py-2 text-sm font-semibold tabular-nums">
                                {line.amount ? formatMoney(line.amount) : '-'}
                              </TD>
                            </TR>
                          ))}
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
  )
}

function TimelineTab({
  steps,
  audit,
  currentStepId,
}: {
  steps: import('@/features/workflow/types').WorkflowTaskStep[]
  audit: import('@/features/workflow/types').WorkflowTaskAuditEntry[]
  currentStepId: number | null
}) {
  return (
    <div className="space-y-5">
      {/* Vertical stepper */}
      <TaskSectionCard title="Approval steps">
        <TaskTimelineStepper steps={steps} currentStepId={currentStepId} />
      </TaskSectionCard>

      {/* Audit trail */}
      <TaskSectionCard title="Activity">
        <TaskAuditList entries={audit} />
      </TaskSectionCard>
    </div>
  )
}

// ─── Action tab ───────────────────────────────────────────────────────────────

function commentHint(canReject: boolean): string {
  if (canReject) return 'Required to reject. Optional to approve.'
  return 'Optional.'
}

// No app-wide toast helper in this repo; blocked approvals show inline alert only (see Phase Client-Onboarding-Finalization-Preflight-B).

function TaskActionForm({
  detail,
  onSuccess,
}: {
  detail: WorkflowTaskDetailResponse
  onSuccess: () => void
}) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)
  const [apiActionError, setApiActionError] = useState<ReturnType<typeof parseWorkflowStepActionError> | null>(null)

  const { actions, task, workflow } = detail
  const instanceId = workflow.id
  const stepId = task.step_id

  async function submit(action: WorkflowAction) {
    setClientError(null)
    setApiActionError(null)
    if (action !== 'approve') {
      if (!comment.trim()) {
        setClientError('A comment is required to reject.')
        return
      }
    }
    setSubmitting(true)
    try {
      await actOnWorkflowStep(instanceId, stepId, {
        action,
        comment: comment.trim() || undefined,
      })
      setComment('')
      onSuccess()
    } catch (e: unknown) {
      setApiActionError(parseWorkflowStepActionError(e, 'Action failed'))
    } finally {
      setSubmitting(false)
    }
  }

  const anyAction =
    actions.can_approve || actions.can_reject

  return (
    <div className="space-y-3">
      {/* Decision context header */}
      <TaskSectionCard>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-app-subtle">
          Decision required
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-app-text">
          {task.target_title}
        </p>
        <p className="mt-0.5 text-xs text-app-secondary">{task.step_name}</p>
      </TaskSectionCard>

      {!anyAction ? (
        <TaskSectionCard>
          <p className="text-sm text-app-secondary">
            No actions are available for this step.
          </p>
        </TaskSectionCard>
      ) : (
        <>
          {/* Comment box */}
          <TaskSectionCard title="Comment">
            <p className="mb-2 text-xs text-app-subtle">
              {commentHint(actions.can_reject)}
            </p>
            <textarea
              id="wf-task-drawer-comment"
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={submitting}
              className="w-full min-h-[6rem] rounded-panel border border-app-border bg-app-muted/50 px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-600 focus:bg-app-surface focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50"
              placeholder="Enter your comment here…"
            />
          </TaskSectionCard>

          {/* Inline errors: structured API (dismissible) or client-side validation */}
          {apiActionError ? (
            <WorkflowActionErrorBanner
              message={apiActionError.detail ?? apiActionError.summary}
              bullets={[...apiActionError.errors, ...apiActionError.fieldMessages]}
              onDismiss={() => setApiActionError(null)}
            />
          ) : null}
          {clientError && !apiActionError ? (
            <WorkflowActionErrorBanner
              message={clientError}
              onDismiss={() => setClientError(null)}
            />
          ) : null}

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {actions.can_approve ? (
              <Button
                className="min-h-9"
                disabled={submitting}
                onClick={() => void submit('approve')}
              >
                {submitting ? 'Submitting…' : 'Approve'}
              </Button>
            ) : null}
            {actions.can_reject ? (
              <Button
                variant="danger"
                className="min-h-9"
                disabled={submitting}
                onClick={() => void submit('reject')}
              >
                Reject
              </Button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

export function WorkflowTaskDrawer({
  open,
  stepId,
  onClose,
  onActionComplete,
}: {
  open: boolean
  stepId: number | null
  onClose: () => void
  onActionComplete: () => void
}) {
  const [tab, setTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<WorkflowTaskDetailResponse | null>(null)

  const resetLocal = useCallback(() => {
    setLoadError(null)
    setDetail(null)
    setTab('overview')
  }, [])

  useEffect(() => {
    if (!open || stepId == null) {
      resetLocal()
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setDetail(null)

    void (async () => {
      try {
        const data = await getMyWorkflowTaskDetail(stepId)
        if (cancelled) return
        const supportedTypes = ['mrf', 'client_onboarding', 'mobilisation', 'sales_proposal']
        if (!supportedTypes.includes(data.target.type)) {
          setLoadError('This task uses an unsupported request type.')
          return
        }
        setDetail(data)
      } catch (e: unknown) {
        if (cancelled) return
        if (axios.isAxiosError(e) && e.response?.status === 404) {
          setLoadError('This task is no longer active or assigned to you.')
        } else {
          setLoadError(parseApiError(e, 'Failed to load task').message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, stepId, resetLocal])

  const visibleTabs = useMemo(() => {
    if (!detail) return MRF_TABS
    if (isMrfTarget(detail.target)) return MRF_TABS
    if (isProposalTarget(detail.target)) return PROPOSAL_TABS
    return MOBILISATION_TABS
  }, [detail])

  useEffect(() => {
    if (!detail) return
    const validIds = visibleTabs.map((t) => t.id)
    if (!validIds.includes(tab)) setTab('overview')
  }, [detail, tab, visibleTabs])

  function handleClose() {
    resetLocal()
    onClose()
  }

  function handleActionSuccess() {
    onActionComplete()
    handleClose()
  }

  const title = detail?.task.target_title ?? 'Approval task'
  const description = detail
    ? `${detail.task.step_name} / Review and act here.`
    : undefined

  return (
    <Drawer
      open={open && stepId != null}
      title={title}
      description={description}
      onClose={handleClose}
      panelClassName="max-w-[min(100vw,48rem)]"
    >
      {loading ? (
        <Spinner label="Loading task..." />
      ) : loadError ? (
        <ErrorState message={loadError} />
      ) : detail ? (
        <div className="flex min-h-0 flex-col gap-4">
          {/* Tab bar */}
          <div className="flex gap-1 overflow-x-auto border-b border-app-border pb-px">
            {visibleTabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'shrink-0 rounded-t-panel px-3 py-2 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'border-b-2 border-brand-600 text-brand-700'
                    : 'border-b-2 border-transparent text-app-secondary hover:text-app-text',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="min-h-0 flex-1">
            {(() => {
              const url = targetDetailUrl(detail.target)
              const mobData = getMobilisationData(detail.target)

              if (tab === 'overview') {
                if (isMrfTarget(detail.target)) {
                  return (
                    <MrfOverviewTab
                      task={detail.task}
                      mrf={detail.target.mrf}
                      lineItems={detail.target.line_items}
                      detailUrl={url}
                      onGoToLineItems={() => setTab('line-items')}
                      onGoToAction={() => setTab('action')}
                    />
                  )
                }
                if (isMobilisationLike(detail.target) && mobData) {
                  return (
                    <MobilisationOverviewTab
                      task={detail.task}
                      setup={mobData}
                      detailUrl={url}
                      onGoToAction={() => setTab('action')}
                    />
                  )
                }
                if (isProposalTarget(detail.target)) {
                  const proposal = salesProposalDrawerView(detail.target)
                  return (
                    <ProposalOverviewTab
                      task={detail.task}
                      proposal={proposal}
                      budgetLines={proposal.budget_lines ?? []}
                      breakupLines={proposal.breakup_lines ?? []}
                      detailUrl={url}
                      onGoToBudgetLines={() => setTab('budget-lines')}
                      onGoToAction={() => setTab('action')}
                    />
                  )
                }
                return null
              }

              if (tab === 'request' && isMrfTarget(detail.target)) {
                return <RequestTabMrf mrf={detail.target.mrf} />
              }

              if (isMobilisationLike(detail.target) && mobData) {
                if (tab === 'departments') return <MobilisationDepartmentsTab setup={mobData} />
                if (tab === 'users') return <MobilisationUsersTab setup={mobData} />
              }

              if (tab === 'line-items' && isMrfTarget(detail.target)) {
                return (
                  <LineItemsTab
                    items={detail.target.line_items}
                    billingType={detail.target.mrf.billing_type}
                  />
                )
              }

              if (isProposalTarget(detail.target)) {
                const proposal = salesProposalDrawerView(detail.target)
                if (tab === 'budget-lines') return <BudgetLinesTabProposal proposal={proposal} />
                if (tab === 'breakup') return <BreakupTabProposal proposal={proposal} />
              }

              if (tab === 'timeline') {
                return (
                  <TimelineTab
                    steps={detail.workflow.steps}
                    audit={detail.workflow.audit_trail}
                    currentStepId={detail.workflow.current_step_id}
                  />
                )
              }

              if (tab === 'action') {
                return (
                  <TaskActionForm
                    key={`${detail.task.step_id}-${detail.workflow.id}`}
                    detail={detail}
                    onSuccess={handleActionSuccess}
                  />
                )
              }

              return null
            })()}
          </div>
        </div>
      ) : null}
    </Drawer>
  )
}
