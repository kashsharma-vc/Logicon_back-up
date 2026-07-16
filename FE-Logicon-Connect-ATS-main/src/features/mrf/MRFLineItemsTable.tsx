import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { createMRFLineItem, deleteMRFLineItem, listMRFLineItems, updateMRFLineItem } from '@/api/mrf'
import { listJobRoles, type JobRoleRow } from '@/api/jobs'
import {
  listSiteRoleRequirements,
  type BillingType as SrrBillingType,
  type SiteRoleRequirementRow,
} from '@/api/siteRoleRequirements'
import { listWageCategories, type WageCategoryRow } from '@/api/wages'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Spinner } from '@/components/ui/Spinner'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/Table'
import { MRFLineItemForm, type Option } from '@/features/mrf/MRFLineItemForm'
import { LineItemCommercialDisplay } from '@/features/mrf/LineItemCommercialDisplay'
import { formatLineItemBillableImpact } from '@/features/mrf/mrfBudgetContext'
import { formatLineItemSrrSummary } from '@/features/mrf/mrfSrrDisplay'
import type { SiteOption } from '@/features/mrf/MRFForm'
import { Badge } from '@/components/ui/Badge'
import { formatMoneyAmount } from '@/features/budgets/budgetDisplay'
import type { MRFLineItemRow, MRFLineItemWriteInput, MRFReadinessLineItem, MRFRow } from '@/features/mrf/types'

function lineItemBudgetPlanSummary(r: MRFLineItemRow, parent: MRFRow): string {
  if (r.budget_plan != null && (r.budget_plan_name || r.budget_plan_code)) {
    const name = r.budget_plan_name ?? 'Budget'
    const code = r.budget_plan_code ? ` (${r.budget_plan_code})` : ''
    return `${name}${code}`
  }
  if (parent.budget_plan != null) return 'Uses MRF budget'
  return 'No budget'
}

export function MRFLineItemsTable({
  mrfId,
  siteId,
  parentMrf,
  siteOptions,
  readinessLineItems,
  onChanged,
  openCreateSignal,
  onOpenCreateHandled,
  embedded = false,
}: {
  mrfId: number
  siteId: number
  parentMrf: MRFRow
  siteOptions: SiteOption[]
  readinessLineItems?: MRFReadinessLineItem[]
  onChanged?: () => void
  openCreateSignal?: boolean
  onOpenCreateHandled?: () => void
  /** Drop outer card chrome when wrapped in a parent section panel. */
  embedded?: boolean
}) {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canWrite = hasAnyCapability(meCaps, [CAP.MRF_UPDATE])
  const canReadBudget = hasAnyCapability(meCaps, [CAP.BUDGET_READ])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MRFLineItemRow[]>([])

  const [lookupError, setLookupError] = useState<string | null>(null)
  const [jobRoles, setJobRoles] = useState<JobRoleRow[]>([])
  const [srrs, setSrrs] = useState<SiteRoleRequirementRow[]>([])
  const [wageCategories, setWageCategories] = useState<WageCategoryRow[]>([])

  const jobRoleOptions: Option[] = useMemo(
    () => jobRoles.map((r) => ({ id: r.id, label: `${r.name} (${r.code})` })),
    [jobRoles],
  )
  const isBillable = parentMrf.billing_type === 'billable'
  const isClientMrf = parentMrf.requested_by_type === 'client'
  const billableMissingDepartment = isBillable && !isClientMrf && !parentMrf.required_department
  const wageOptions: Option[] = useMemo(
    () => wageCategories.map((w) => ({ id: w.id, label: `${w.name} (${w.code})` })),
    [wageCategories],
  )

  const roleNameById = useMemo(() => new Map(jobRoles.map((r) => [r.id, r.name])), [jobRoles])
  const wageNameById = useMemo(() => new Map(wageCategories.map((w) => [w.id, w.name])), [wageCategories])
  const readinessByLineId = useMemo(
    () => new Map((readinessLineItems ?? []).map((li) => [li.line_item_id, li])),
    [readinessLineItems],
  )
  const showReadinessCols = (readinessLineItems?.length ?? 0) > 0
  const currency = parentMrf.budget_plan_currency ?? 'INR'

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<MRFLineItemRow | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const formId = useMemo(() => (editing ? `mrf-line-item-edit-${editing.id}` : `mrf-line-item-create-${mrfId}`), [editing, mrfId])

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const res = await listMRFLineItems({ mrf: mrfId })
      setRows(res.items)
    } catch (e: unknown) {
      setRows([])
      setError(parseApiError(e, 'Failed to load line items').message)
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    setLookupError(null)
    try {
      const billingType =
        parentMrf.billing_type === 'billable' || parentMrf.billing_type === 'non_billable'
          ? (parentMrf.billing_type as SrrBillingType)
          : undefined

      const srrParams = {
        site: siteId,
        is_active: true,
        billing_type: billingType,
        page: 1,
      }
      if (isBillable && !isClientMrf && parentMrf.required_department) {
        Object.assign(srrParams, { department: parentMrf.required_department })
      }

      const [roles, srr, wages] = await Promise.all([
        listJobRoles(''),
        listSiteRoleRequirements(srrParams),
        listWageCategories(''),
      ])
      setJobRoles(roles)
      setSrrs(srr.items)
      setWageCategories(wages)
    } catch (e: unknown) {
      setJobRoles([])
      setSrrs([])
      setWageCategories([])
      setLookupError(parseApiError(e, 'Lookup failed').message)
    }
  }

  useEffect(() => {
    void refresh()
    void loadLookups()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mrfId, siteId, parentMrf.required_department, parentMrf.billing_type, isClientMrf])

  useEffect(() => {
    if (openCreateSignal) {
      openCreate()
      onOpenCreateHandled?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCreateSignal])

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setDrawerOpen(true)
  }

  function openEdit(row: MRFLineItemRow) {
    setEditing(row)
    setFormError(null)
    setDrawerOpen(true)
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setEditing(null)
    setFormSubmitting(false)
    setFormError(null)
  }

  async function submit(payload: MRFLineItemWriteInput) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const withParent: MRFLineItemWriteInput = { ...payload, mrf: mrfId }
      if (editing) {
        await updateMRFLineItem(editing.id, withParent)
      } else {
        await createMRFLineItem(withParent)
      }
      closeDrawer()
      await refresh()
      onChanged?.()
    } catch (e: unknown) {
      setFormError(parseApiError(e, 'Save failed').message)
    } finally {
      setFormSubmitting(false)
    }
  }

  const [deleteTarget, setDeleteTarget] = useState<MRFLineItemRow | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function requestDelete(row: MRFLineItemRow) {
    if (!canWrite) return
    setDeleteError(null)
    setDeleteTarget(row)
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await deleteMRFLineItem(deleteTarget.id)
      setDeleteTarget(null)
      await refresh()
      onChanged?.()
    } catch (e: unknown) {
      setDeleteError(parseApiError(e, 'Delete failed').message)
    } finally {
      setDeleteBusy(false)
    }
  }

  const headerBlock = (
    <div className="flex items-start justify-between gap-3">
        <div>
          {!embedded ? <p className="text-sm font-semibold text-app-text">Line items</p> : null}
          <p className={embedded ? 'text-xs text-app-secondary' : 'text-xs text-app-secondary'}>
            {isBillable
              ? isClientMrf
                ? 'Select approved site role requirements for this site.'
                : 'Select approved site role requirements for this site and required department.'
              : 'Job role headcount and wage/budget details.'}
          </p>
        </div>
        {canWrite ? (
          <Button
            type="button"
            className="min-h-9 px-3"
            onClick={openCreate}
            disabled={!!lookupError || billableMissingDepartment}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Add line item
          </Button>
        ) : null}
      </div>
  )

  const mainContent = (
    <>
      {headerBlock}

      {billableMissingDepartment ? (
        <p className="mt-3 text-xs text-status-warning">
          Set the MRF required department before adding billable line items from site role requirements.
        </p>
      ) : null}

      {lookupError ? <ErrorState message={`Lookup API failed. Add/Edit is disabled. ${lookupError}`} /> : null}

      {loading ? (
        <div className="mt-4">
          <Spinner label="Loading line items..." />
        </div>
      ) : error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="No line items" description="Add a line item to capture role headcount and constraints." />
        </div>
      ) : (
        <div className="mt-4">
          <Table>
            <THead>
              <TR>
                <TH>Role</TH>
                <TH>{isBillable ? 'Headcount / billing' : 'Headcount'}</TH>
                <TH>Site role requirement</TH>
                <TH>Wage</TH>
                <TH>{isBillable ? 'Budget plan' : 'Internal baseline'}</TH>
                {showReadinessCols ? (
                  <>
                    <TH>Remaining</TH>
                    <TH>Est. amount</TH>
                    <TH>Readiness</TH>
                  </>
                ) : null}
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const ri = readinessByLineId.get(r.id)
                const srrInfo = formatLineItemSrrSummary(r, {
                  includeDepartment: !isClientMrf,
                })
                const billableImpact = isBillable ? formatLineItemBillableImpact(r, ri) : null
                return (
                <TR key={r.id}>
                  <TD className="text-sm text-app-text">
                    {roleNameById.get(r.job_role) ?? `Role #${r.job_role}`}
                  </TD>
                  <TD className="text-sm text-app-secondary">
                    {billableImpact ? (
                      <div className="space-y-0.5">
                        <div className="text-xs">{billableImpact.headcountLine}</div>
                        {billableImpact.amountLine ? (
                          <div className="text-[10px] text-app-subtle tabular-nums">{billableImpact.amountLine}</div>
                        ) : null}
                      </div>
                    ) : (
                      r.headcount
                    )}
                  </TD>
                  <TD className="max-w-[14rem] text-xs text-app-secondary">
                    <div className="font-medium text-app-text truncate" title={srrInfo.primary}>
                      {srrInfo.primary}
                    </div>
                    {srrInfo.secondary ? (
                      <div className="mt-0.5 truncate text-app-subtle" title={srrInfo.secondary}>
                        {srrInfo.secondary}
                      </div>
                    ) : null}
                  </TD>
                  <TD className="text-xs text-app-secondary">
                    <LineItemCommercialDisplay
                      row={r}
                      isBillable={isBillable}
                      wageCategoryLabel={
                        r.wage_category ? wageNameById.get(r.wage_category) ?? `#${r.wage_category}` : null
                      }
                    />
                  </TD>
                  <TD className="text-xs text-app-secondary">
                    {isBillable ? (
                      <>
                        <div className="font-medium text-app-text">{lineItemBudgetPlanSummary(r, parentMrf)}</div>
                        {r.budget_min || r.budget_max ? (
                          <div className="mt-0.5 text-app-subtle">
                            Range: {r.budget_min ?? '?'} - {r.budget_max ?? '?'}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="font-medium text-app-text">
                          Gross: {r.internal_requested_monthly_gross ? formatMoneyAmount(r.internal_requested_monthly_gross, 'INR') : '—'}
                        </div>
                        {r.internal_budget_variance && Number(r.internal_budget_variance) > 0 ? (
                          <div className="mt-1 space-y-0.5">
                            <div className="text-[10px] font-medium text-status-warning">
                              Variance: +{formatMoneyAmount(r.internal_budget_variance, 'INR')}
                            </div>
                            <div className="text-[10px] text-app-subtle truncate" title={r.internal_budget_variance_reason ?? 'None'}>
                              Reason: {r.internal_budget_variance_reason ?? 'None'}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </TD>
                  {showReadinessCols ? (
                    <>
                      <TD className="text-xs tabular-nums text-app-secondary">
                        {ri?.remaining_headcount ?? '?'}
                      </TD>
                      <TD className="text-xs tabular-nums text-app-secondary">
                        {ri ? formatMoneyAmount(ri.estimated_amount, currency) : '?'}
                      </TD>
                      <TD className="text-xs">
                        {ri ? (
                          <Badge variant={ri.ok ? 'success' : 'danger'}>{ri.ok ? 'OK' : 'Issue'}</Badge>
                        ) : (
                          '?'
                        )}
                      </TD>
                    </>
                  ) : null}
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
                      {canWrite ? (
                        <Button variant="secondary" className="min-h-9 px-3" onClick={() => openEdit(r)} disabled={!!lookupError}>
                          Edit
                        </Button>
                      ) : null}
                      {canWrite ? (
                        <Button variant="danger" className="min-h-9 px-3" onClick={() => requestDelete(r)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </TD>
                </TR>
              )})}
            </TBody>
          </Table>
        </div>
      )}
    </>
  )

  return (
    <>
      {embedded ? (
        mainContent
      ) : (
        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          {mainContent}
        </div>
      )}

      <Drawer
        open={drawerOpen}
        title={editing ? 'Edit line item' : 'Add line item'}
        description={editing ? 'Update line item details.' : 'Add role headcount and constraints.'}
        onClose={closeDrawer}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeDrawer} disabled={formSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={formSubmitting || !!lookupError}>
              {formSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        }
      >
        <MRFLineItemForm
          formId={formId}
          initial={editing}
          parentMrf={parentMrf}
          siteOptions={siteOptions}
          canReadBudget={canReadBudget}
          submitting={formSubmitting}
          errorMessage={formError}
          onSubmit={submit}
          jobRoleOptions={jobRoleOptions}
          srrRows={srrs}
          wageCategoryOptions={wageOptions}
          lookupError={lookupError}
        />
      </Drawer>

      <Drawer
        open={deleteTarget != null}
        title="Delete line item"
        description={
          deleteTarget
            ? `Remove this line item for ${deleteTarget.site_role_requirement_label ?? 'the role'}? This cannot be undone.`
            : undefined
        }
        onClose={() => !deleteBusy && setDeleteTarget(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={deleteBusy} onClick={() => void handleConfirmDelete()}>
              {deleteBusy ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        }
      >
        {deleteError ? <ErrorState message={deleteError} /> : null}
      </Drawer>
    </>
  )
}
