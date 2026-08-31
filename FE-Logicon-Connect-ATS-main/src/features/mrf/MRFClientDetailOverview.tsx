import { useMemo } from 'react'
import { formatCommercialMoney } from '@/features/mrf/mrfCommercialOverride'
import {
  DetailField,
  MrfSectionPanel,
  SummaryWidgets,
} from '@/features/mrf/mrfClientFormLayout'
import { summarizeMrfLineItems } from '@/features/mrf/mrfClientLineItem'
import { MRFStatusBadge } from '@/features/mrf/MRFStatusBadge'
import type { MRFLineItemRow, MRFReadinessLineItem, MRFRow } from '@/features/mrf/types'

function summarizeFromReadiness(items: MRFReadinessLineItem[]) {
  let totalHeadcount = 0
  let totalAmount = 0
  for (const li of items) {
    totalHeadcount += li.requested_headcount ?? 0
    const amt = Number(li.estimated_amount ?? 0)
    if (Number.isFinite(amt)) totalAmount += amt
  }
  return { totalHeadcount, totalAmount }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString()
}

function workflowLabel(row: MRFRow): string {
  const status = row.workflow_status?.trim()
  if (!status || status === 'not_started') return 'Not started'
  const step = row.workflow_current_step_name?.trim()
  if (step) return `${status.replace(/_/g, ' ')} · ${step}`
  return status.replace(/_/g, ' ')
}

export function MRFClientDetailOverview({
  row,
  siteLabel,
  lineItems,
  readinessLineItems,
}: {
  row: MRFRow
  siteLabel: string
  lineItems: MRFLineItemRow[]
  readinessLineItems?: MRFReadinessLineItem[]
}) {
  const summary = useMemo(() => {
    if (lineItems.length > 0) {
      return summarizeMrfLineItems(lineItems)
    }
    if (readinessLineItems?.length) {
      return summarizeFromReadiness(readinessLineItems)
    }
    return summarizeMrfLineItems(row.line_items ?? [])
  }, [lineItems, readinessLineItems, row.line_items])

  const amountLabel = formatCommercialMoney(String(summary.totalAmount)) ?? '—'

  return (
    <div className="space-y-4">
      <MrfSectionPanel title="Request" tone="site">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailField label="Request ID" value={`#${row.id}`} />
          <DetailField label="Site" value={siteLabel} />
          <DetailField
            label="Status"
            value={<MRFStatusBadge status={row.status} />}
          />
          <DetailField label="Workflow" value={workflowLabel(row)} />
          <DetailField label="Created" value={formatDateTime(row.created_at)} />
          <DetailField label="Submitted" value={formatDateTime(row.submitted_at)} />
          <DetailField label="Approved" value={formatDateTime(row.approved_at)} />
          <DetailField label="Rejected" value={formatDateTime(row.rejected_at)} />
          {row.request_number?.trim() ? (
            <DetailField label="Request number" value={row.request_number.trim()} />
          ) : null}
        </div>
      </MrfSectionPanel>

      <MrfSectionPanel title="When & why" tone="details">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,11rem)_1fr] lg:grid-cols-3 lg:items-start">
          <DetailField label="Required by" value={row.required_by_date?.trim() || '—'} />
          <DetailField
            className="lg:col-span-2"
            label="Remarks"
            value={
              row.reason?.trim() ? (
                <p className="whitespace-pre-wrap">{row.reason}</p>
              ) : (
                '—'
              )
            }
          />
        </div>
      </MrfSectionPanel>

      <SummaryWidgets headcount={summary.totalHeadcount} amount={amountLabel} />
    </div>
  )
}
