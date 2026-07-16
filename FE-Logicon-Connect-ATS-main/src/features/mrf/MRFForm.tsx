import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import type { DepartmentOption } from '@/api/departments'
import { MRFClientFormFields } from '@/features/mrf/MRFClientFormFields'
import {
  clientFieldsFromRow,
  clientFieldsToWritePayload,
  validateMrfClientFields,
  type MRFClientHeaderFormValues,
} from '@/features/mrf/mrfClientForm'
import type { MRFRow, MRFType, BillingType, RequestedByType, MRFWriteInput } from '@/features/mrf/types'
import type { BudgetPlanRow } from '@/features/budgets/types'
import { budgetNatureLabel, formatBudgetAmount } from '@/features/budgets/types'

import {
  formatBudgetPlanOptionLabel,
  loadBillableBudgetOptionsForSite,
} from '@/features/budgets/budgetLookup'

import { isClientFacingUser } from '@/features/mrf/mrfClientMode'
import { useAuthStore } from '@/features/auth/authStore'

export { isClientFacingUser }

export type { DepartmentOption } from '@/api/departments'

export interface SiteOption {
  id: number
  label: string
  /** Site's client id (for billable budget lookup). */
  client?: number
}

export interface MRFFormValues extends MRFClientHeaderFormValues {
  site: string
  requested_by_type: RequestedByType
  mrf_type: MRFType
  billing_type: BillingType
  requesting_department: string
  required_department: string
  department: string
  required_by_date: string // yyyy-mm-dd or ''
  reason: string
  client_visible: boolean
  budget_plan: string
  is_budget_deviation: boolean
  has_special_client_req: boolean
  preferred_flow_type: 'standard' | 'fast_track' | ''
}

const MRF_TYPES: { value: MRFType; label: string }[] = [
  { value: 'new_hiring', label: 'New hiring' },
  { value: 'replacement', label: 'Replacement' },
  { value: 'headcount_increase', label: 'Headcount increase' },
  { value: 'rate_revision', label: 'Rate revision' },
]

const CLIENT_MRF_TYPES = MRF_TYPES.filter((t) => t.value !== 'rate_revision')

const BILLING_TYPES: { value: BillingType; label: string }[] = [
  { value: 'billable', label: 'Billable' },
  { value: 'non_billable', label: 'Non-billable' },
]

const REQUESTER_TYPES: { value: RequestedByType; label: string }[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'client', label: 'Client' },
]

function isPastDate(yyyyMmDd: string): boolean {
  if (!yyyyMmDd) return false
  const d = new Date(`${yyyyMmDd}T00:00:00`)
  if (Number.isNaN(d.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return d < today
}

function optionLabel(o: DepartmentOption) {
  return o.scopeLabel ? `${o.label} — ${o.scopeLabel}` : o.label
}

function normalizeClientRequestedValues(values: MRFFormValues): MRFFormValues {
  if (values.requested_by_type !== 'client') return values
  const mrfType = values.mrf_type === 'rate_revision' ? 'new_hiring' : values.mrf_type
  if (values.billing_type === 'billable' && values.client_visible === true && values.mrf_type === mrfType) {
    return values
  }
  return {
    ...values,
    billing_type: 'billable',
    client_visible: true,
    mrf_type: mrfType,
  }
}

export function MRFForm({
  formId,
  mode,
  initialMRF,
  siteOptions,
  departmentOptions,
  departmentsLoading,
  departmentLookupError,
  lookupError,
  canReadBudget = false,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  mode: 'create' | 'edit'
  initialMRF?: MRFRow | null
  siteOptions: SiteOption[]
  departmentOptions: DepartmentOption[]
  departmentsLoading?: boolean
  departmentLookupError?: string | null
  lookupError: string | null
  canReadBudget?: boolean
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (values: MRFFormValues) => void | Promise<void>
}) {
  const me = useAuthStore((s) => s.me)
  const clientFacingRequester = isClientFacingUser(me)
  const [values, setValues] = useState<MRFFormValues>(() =>
    normalizeClientRequestedValues({
      site: initialMRF?.site != null ? String(initialMRF.site) : '',
      requested_by_type: clientFacingRequester ? 'client' : ((initialMRF?.requested_by_type ?? 'internal') as RequestedByType),
      mrf_type: (initialMRF?.mrf_type ?? 'new_hiring') as MRFType,
      billing_type: (initialMRF?.billing_type ?? 'billable') as BillingType,
      requesting_department:
        initialMRF?.requesting_department != null && initialMRF.requesting_department !== undefined
          ? String(initialMRF.requesting_department)
          : '',
      required_department:
        initialMRF?.required_department != null && initialMRF.required_department !== undefined
          ? String(initialMRF.required_department)
          : '',
      department: initialMRF?.department ?? '',
      required_by_date: initialMRF?.required_by_date ?? '',
      reason: initialMRF?.reason ?? '',
      client_visible: initialMRF?.client_visible ?? false,
      budget_plan: initialMRF?.budget_plan != null ? String(initialMRF.budget_plan) : '',
      is_budget_deviation: initialMRF?.is_budget_deviation ?? false,
      has_special_client_req: initialMRF?.has_special_client_req ?? false,
      preferred_flow_type: (initialMRF?.preferred_flow_type as any) ?? '',
      ...clientFieldsFromRow(initialMRF),
    }),
  )

  useEffect(() => {
    if (!clientFacingRequester) return
    setValues((v) => normalizeClientRequestedValues({ ...v, requested_by_type: 'client' }))
  }, [clientFacingRequester])

  useEffect(() => {
    if (values.requested_by_type !== 'client') return
    setValues((v) => {
      const normalized = normalizeClientRequestedValues(v)
      return normalized === v ? v : normalized
    })
  }, [values.requested_by_type])

  useEffect(() => {
    if (values.is_budget_deviation || values.has_special_client_req) {
      setValues((v) => (v.preferred_flow_type === 'standard' ? v : { ...v, preferred_flow_type: 'standard' }))
    }
  }, [values.is_budget_deviation, values.has_special_client_req])

  const siteError = useMemo(() => (values.site ? null : 'Site is required.'), [values.site])
  const requiredByError = useMemo(() => {
    if (!values.required_by_date) return null
    return isPastDate(values.required_by_date) ? 'Required by date cannot be in the past.' : null
  }, [values.required_by_date])

  const isBillable = values.billing_type === 'billable'
  const isNonBillable = values.billing_type === 'non_billable'
  const isClientRequested = values.requested_by_type === 'client'
  const isClientMrfUi = clientFacingRequester || isClientRequested
  const mrfTypeOptions = isClientRequested ? CLIENT_MRF_TYPES : MRF_TYPES
  const clientFieldsError = useMemo(
    () => (isNonBillable ? validateMrfClientFields(values) : null),
    [values, isNonBillable],
  )
  // Required department is mandatory for all MRFs created internally
  const requiredDepartmentError = useMemo(() => {
    if (!isClientMrfUi && !values.required_department) {
      return 'Required department is mandatory.'
    }
    return null
  }, [isClientMrfUi, values.required_department])

  const budgetHelperCopy = isBillable
    ? isClientMrfUi
      ? 'Billable budgets are tied to approved client site manpower.'
      : 'Billable budgets are tied to client/site/department manpower.'
    : 'Non-billable budgets are tied to internal department hiring.'

  const contextSig = `${values.site}|${values.billing_type}|${values.requesting_department}|${values.required_department}`
  const prevSigRef = useRef('')
  useEffect(() => {
    if (prevSigRef.current && prevSigRef.current !== contextSig) {
      setValues((v) => ({ ...v, budget_plan: '' }))
    }
    prevSigRef.current = contextSig
  }, [contextSig])

  const selectedSite = useMemo(
    () => siteOptions.find((s) => s.id === Number(values.site)),
    [siteOptions, values.site],
  )
  const departmentOptionsForSelectedSite = useMemo(() => {
    const siteId = Number(values.site)
    if (!Number.isFinite(siteId) || siteId <= 0) return []
    const clientId = selectedSite?.client
    return departmentOptions.filter((dept) => {
      if (dept.site != null) return Number(dept.site) === siteId
      if (dept.client != null && clientId != null) return Number(dept.client) === Number(clientId)
      return dept.client == null && dept.site == null
    })
  }, [departmentOptions, selectedSite?.client, values.site])

  useEffect(() => {
    const allowed = new Set(departmentOptionsForSelectedSite.map((d) => String(d.id)))
    setValues((v) => {
      const requestingInvalid = v.requesting_department && !allowed.has(v.requesting_department)
      const requiredInvalid = v.required_department && !allowed.has(v.required_department)
      if (!requestingInvalid && !requiredInvalid) return v
      return {
        ...v,
        requesting_department: requestingInvalid ? '' : v.requesting_department,
        required_department: requiredInvalid ? '' : v.required_department,
      }
    })
  }, [departmentOptionsForSelectedSite])

  const [budgetRows, setBudgetRows] = useState<BudgetPlanRow[]>([])
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetLookupError, setBudgetLookupError] = useState<string | null>(null)

  // Budget lookup for billable MRFs only - non-billable uses strict internal hiring budget
  useEffect(() => {
    // Non-billable MRFs use internal hiring budget resolution, not this dropdown
    if (!canReadBudget || values.billing_type === 'non_billable') {
      setBudgetRows([])
      setBudgetLookupError(null)
      setBudgetLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      setBudgetLoading(true)
      setBudgetLookupError(null)
      setBudgetRows([])
      const sid = Number(values.site)
      const cid = selectedSite?.client
      if (!Number.isFinite(sid) || cid == null || !Number.isFinite(cid)) {
        if (!cancelled) setBudgetLoading(false)
        return
      }
      const res = await loadBillableBudgetOptionsForSite(sid, cid)
      if (cancelled) return
      if (res.ok) setBudgetRows(res.items)
      else {
        setBudgetRows([])
        setBudgetLookupError(res.error)
      }
      setBudgetLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [canReadBudget, values.billing_type, values.site, selectedSite?.client])

  const deptSelectDisabled = !!(submitting || departmentLookupError)
  const canSubmit =
    !submitting &&
    !siteError &&
    !requiredByError &&
    !clientFieldsError &&
    !lookupError &&
    !requiredDepartmentError

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit(normalizeClientRequestedValues(values))
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <ErrorState message={errorMessage} /> : null}
      {lookupError ? <ErrorState message={`Site lookup failed. Create/Edit is disabled. ${lookupError}`} /> : null}
      {!isClientMrfUi && departmentLookupError ? (
        <ErrorState message={`Department lookup failed. Department selects are disabled. ${departmentLookupError}`} />
      ) : null}

      {/* Client request auto-fields summary row */}
      {isClientRequested ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-brand-100/50 px-4 py-3 dark:border-brand-800 dark:from-brand-950 dark:to-brand-900/50">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Billing</span>
            <span className="text-sm font-bold text-brand-800 dark:text-brand-200">Billable</span>
          </div>
          <div className="h-4 w-px bg-brand-300 dark:bg-brand-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Requester</span>
            <span className="text-sm font-bold text-brand-800 dark:text-brand-200">Client</span>
          </div>
          <div className="h-4 w-px bg-brand-300 dark:bg-brand-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-brand-600 dark:text-brand-400">Visibility</span>
            <span className="text-sm font-bold text-brand-800 dark:text-brand-200">Client</span>
          </div>
          <span className="ml-auto rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm dark:bg-brand-500">
            Auto
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {!isClientMrfUi ? (
          <Select
            id="mrf_billing_type"
            label="Billing type"
            value={values.billing_type}
            onChange={(e) => setValues((v) => ({ ...v, billing_type: e.target.value as BillingType }))}
            disabled={submitting}
          >
            {BILLING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        ) : null}
        {!isClientMrfUi ? (
          <Select
            id="mrf_type"
            label="MRF type"
            value={values.mrf_type}
            onChange={(e) => setValues((v) => ({ ...v, mrf_type: e.target.value as MRFType }))}
            disabled={submitting}
          >
            {mrfTypeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <p className="text-sm font-semibold text-app-text">
        {isBillable ? 'Client manpower request' : 'Internal hiring request'}
      </p>

      <div className="space-y-1">
        <Select
          id="mrf_site"
          label="Site"
          value={values.site}
          onChange={(e) => setValues((v) => ({ ...v, site: e.target.value }))}
          disabled={submitting || !!lookupError}
          error={siteError ?? undefined}
        >
          <option value="">Select a site...</option>
          {siteOptions.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {s.label}
            </option>
          ))}
        </Select>
        {isNonBillable ? (
          <p className="text-xs text-app-subtle">Site/cost center associated with the internal request.</p>
        ) : null}
      </div>

      {!isClientMrfUi ? (
        <div className="space-y-1">
          <Select
            id="mrf_requesting_department"
            label="Requesting department"
            value={values.requesting_department}
            onChange={(e) => setValues((v) => ({ ...v, requesting_department: e.target.value }))}
            disabled={deptSelectDisabled}
          >
            <option value="">None (backend uses your user department on create)</option>
            {departmentOptionsForSelectedSite.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {optionLabel(o)}
              </option>
            ))}
          </Select>
          <p className="text-xs text-app-subtle">
            Optional. If blank, backend uses your user department when creating.
          </p>
          {departmentsLoading ? <p className="text-xs text-app-subtle">Loading departments…</p> : null}
        </div>
      ) : null}

      {!isClientMrfUi ? (
        <div className="space-y-1">
          <Select
            id="mrf_required_department"
            label="Required department *"
            value={values.required_department}
            onChange={(e) => setValues((v) => ({ ...v, required_department: e.target.value }))}
            disabled={deptSelectDisabled}
            error={requiredDepartmentError ?? undefined}
          >
            <option value="">{isNonBillable ? 'Select department...' : 'None'}</option>
            {departmentOptionsForSelectedSite.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {optionLabel(o)}
              </option>
            ))}
          </Select>
          <p className="text-xs text-app-subtle">
            {isNonBillable
              ? 'Department that will use the internal hiring budget. Required.'
              : 'Department or service where manpower is needed (e.g. Housekeeping). Required for fetching site roles.'}
          </p>
        </div>
      ) : null}



      {!clientFacingRequester ? (
        <Select
          id="mrf_requested_by_type"
          label="Requested by type"
          value={values.requested_by_type}
          onChange={(e) =>
            setValues((v) => normalizeClientRequestedValues({ ...v, requested_by_type: e.target.value as RequestedByType }))
          }
          disabled={submitting}
        >
          {REQUESTER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      ) : null}

      {!canReadBudget && initialMRF?.budget_plan != null && (initialMRF.budget_plan_name || initialMRF.budget_plan_code) ? (
        <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm text-app-secondary">
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Linked budget</p>
          <p className="mt-1 font-medium text-app-text">
            {initialMRF.budget_plan_name ?? 'Budget'}{' '}
            {initialMRF.budget_plan_code ? (
              <span className="font-mono text-xs">({initialMRF.budget_plan_code})</span>
            ) : null}
          </p>
          {initialMRF.budget_plan_nature ? (
            <p className="mt-1 text-xs">Nature: {budgetNatureLabel(String(initialMRF.budget_plan_nature))}</p>
          ) : null}
          {initialMRF.budget_plan_amount != null ? (
            <p className="mt-1 text-xs">
              {formatBudgetAmount(String(initialMRF.budget_plan_amount), initialMRF.budget_plan_currency ?? 'INR')} —{' '}
              {initialMRF.budget_plan_status ?? '—'}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-app-subtle">Budget selection requires budget.read.</p>
        </div>
      ) : null}

      {/* Budget dropdown - only for billable MRFs. Non-billable uses auto-resolved internal hiring budget */}
      {canReadBudget && isBillable ? (
        <>
          {budgetLookupError ? (
            <ErrorState
              message={`Budget lookup failed. ${budgetLookupError} You can still save without a budget plan.`}
            />
          ) : null}
          <Select
            id="mrf_budget_plan"
            label="Budget plan"
            value={values.budget_plan}
            onChange={(e) => setValues((v) => ({ ...v, budget_plan: e.target.value }))}
            disabled={
              submitting ||
              budgetLoading ||
              !!budgetLookupError ||
              !values.site.trim() ||
              selectedSite?.client == null ||
              !Number.isFinite(Number(selectedSite.client))
            }
          >
            <option value="">
              {!values.site.trim() || selectedSite?.client == null
                ? 'Select a site first'
                : budgetLoading
                  ? 'Loading budgets...'
                  : 'No budget selected'}
            </option>
            {budgetRows.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {formatBudgetPlanOptionLabel(b)}
              </option>
            ))}
          </Select>
          <p className="text-xs text-app-subtle">{budgetHelperCopy}</p>
        </>
      ) : null}

      {isBillable && !isClientMrfUi ? (
        <div className="rounded-panel border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-800 dark:bg-brand-950/30">
          <h3 className="mb-3 text-sm font-semibold text-brand-900 dark:text-brand-100">Approval Flow Settings</h3>
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={values.is_budget_deviation}
                  onChange={(e) => setValues((v) => ({ ...v, is_budget_deviation: e.target.checked }))}
                  disabled={submitting}
                />
                Budget Deviation
              </label>
              <label className="flex items-center gap-2 text-sm text-app-text">
                <input
                  type="checkbox"
                  checked={values.has_special_client_req}
                  onChange={(e) => setValues((v) => ({ ...v, has_special_client_req: e.target.checked }))}
                  disabled={submitting}
                />
                Special Client Requirement
              </label>
            </div>
            <div className="max-w-md">
              <Select
                id="mrf_preferred_flow_type"
                label="Workflow Route"
                value={values.preferred_flow_type}
                onChange={(e) => setValues((v) => ({ ...v, preferred_flow_type: e.target.value as any }))}
                disabled={submitting || values.is_budget_deviation || values.has_special_client_req}
              >
                <option value="">Select a flow...</option>
                <option value="standard">Standard (Includes Finance & Admin)</option>
                <option value="fast_track">Fast-Track (Bypasses Finance & Admin)</option>
              </Select>
              {(values.is_budget_deviation || values.has_special_client_req) && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Standard flow is required when budget deviation or special client requirement is selected.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Input
        id="mrf_required_by_date"
        label="Required by date"
        type="date"
        value={values.required_by_date}
        onChange={(e) => setValues((v) => ({ ...v, required_by_date: e.target.value }))}
        disabled={submitting}
        error={requiredByError ?? undefined}
      />

      <MRFClientFormFields
        values={values}
        onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
        onSupportChange={(patch) => setValues((v) => ({ ...v, support: { ...v.support, ...patch } }))}
        submitting={submitting}
        clientError={clientFieldsError}
        billingType={values.billing_type}
      />

      <div className="space-y-1">
        <label htmlFor="mrf_reason" className="text-sm font-medium text-app-secondary">
          Reason / remarks
        </label>
        <textarea
          id="mrf_reason"
          value={values.reason}
          onChange={(e) => setValues((v) => ({ ...v, reason: e.target.value }))}
          className="min-h-24 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          disabled={submitting}
        />
      </div>

      {!isClientRequested ? (
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={values.client_visible}
            onChange={(e) => setValues((v) => ({ ...v, client_visible: e.target.checked }))}
            disabled={submitting}
          />
          Client visible
        </label>
      ) : null}

      <button type="submit" hidden />
      {mode === 'edit' ? (
        <p className="text-xs text-app-subtle">
          Note: Approval statuses (Approved/Rejected) are handled by workflow endpoints and are not part of this phase.
        </p>
      ) : null}
    </form>
  )
}

export function mrfFormValuesToWritePayload(values: MRFFormValues, mode: 'create' | 'edit' = 'edit'): MRFWriteInput {
  const normalized = normalizeClientRequestedValues(values)

  if (normalized.requested_by_type === 'client') {
    return {
      site: Number(normalized.site),
      requested_by_type: 'client',
      required_by_date: normalized.required_by_date || null,
      reason: normalized.reason,
      mrf_type: normalized.mrf_type,
      billing_type: 'billable',
      client_visible: true,
    }
  }

  const bp = normalized.budget_plan.trim()
  return {
    site: Number(normalized.site),
    requested_by_type: normalized.requested_by_type,
    required_by_date: normalized.required_by_date || null,
    reason: normalized.reason,
    budget_plan: bp ? Number(bp) : null,
    mrf_type: normalized.mrf_type,
    billing_type: normalized.billing_type,
    requesting_department: normalized.requesting_department.trim()
      ? Number(normalized.requesting_department)
      : null,
    required_department: normalized.required_department.trim()
      ? Number(normalized.required_department)
      : null,
    department: normalized.department.trim() || undefined,
    client_visible: normalized.client_visible,
    is_budget_deviation: normalized.is_budget_deviation,
    has_special_client_req: normalized.has_special_client_req,
    preferred_flow_type: normalized.preferred_flow_type || null,
    ...clientFieldsToWritePayload(normalized, mode),
  }
}
