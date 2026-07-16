import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import type { SiteRoleRequirementRow } from '@/api/siteRoleRequirements'
import type { BudgetPlanRow } from '@/features/budgets/types'
import { budgetNatureLabel, formatBudgetAmount } from '@/features/budgets/types'
import { formatBudgetPlanOptionLabel, loadBillableBudgetOptionsForSite } from '@/features/budgets/budgetLookup'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import {
  formatCommercialMoney,
  formatMasterCommercialSummary,
  formatWageRange,
  resolveMasterCommercials,
} from '@/features/mrf/mrfCommercialOverride'
import { availableHeadcountForEdit, formatSrrOptionLabel } from '@/features/mrf/mrfSrrDisplay'
import type { MRFLineItemRow, MRFLineItemWriteInput, MRFRow } from '@/features/mrf/types'
import type { SiteOption } from '@/features/mrf/MRFForm'

export interface Option {
  id: number
  label: string
}

export interface MRFLineItemFormValues {
  job_role: string
  site_role_requirement: string
  headcount: string
  replacement_for_employee: string
  required_skills: string
  wage_category: string
  wage_min_requested: string
  wage_max_requested: string
  billing_rate_snapshot: string
  budget_min: string
  budget_max: string
  budget_plan: string
  internal_requested_monthly_gross: string
  internal_budget_variance_reason: string
}

function toNumberOrNull(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n
}

export function MRFLineItemForm({
  formId,
  initial,
  parentMrf,
  siteOptions,
  canReadBudget = false,
  submitting,
  errorMessage,
  onSubmit,
  jobRoleOptions,
  srrRows,
  wageCategoryOptions,
  lookupError,
}: {
  formId: string
  initial?: MRFLineItemRow | null
  parentMrf: MRFRow
  siteOptions: SiteOption[]
  canReadBudget?: boolean
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (payload: MRFLineItemWriteInput) => void | Promise<void>
  jobRoleOptions: Option[]
  srrRows: SiteRoleRequirementRow[]
  wageCategoryOptions: Option[]
  lookupError: string | null
}) {
  const isBillable = String(parentMrf.billing_type) === 'billable'
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canOverrideCommercials = hasAnyCapability(meCaps, [CAP.MRF_OVERRIDE_COMMERCIALS])

  const [commercialOverrideEnabled, setCommercialOverrideEnabled] = useState(
    () => Boolean(initial?.commercial_override_enabled),
  )
  const [commercialOverrideReason, setCommercialOverrideReason] = useState(
    () => initial?.commercial_override_reason?.trim() ?? '',
  )

  const [values, setValues] = useState<MRFLineItemFormValues>(() => ({
    job_role: initial?.job_role != null ? String(initial.job_role) : '',
    site_role_requirement: initial?.site_role_requirement != null ? String(initial.site_role_requirement) : '',
    headcount: initial?.headcount != null ? String(initial.headcount) : '1',
    replacement_for_employee: initial?.replacement_for_employee ?? '',
    required_skills: initial?.required_skills?.join(', ') ?? '',
    wage_category: initial?.wage_category != null ? String(initial.wage_category) : '',
    wage_min_requested: initial?.wage_min_requested ?? '',
    wage_max_requested: initial?.wage_max_requested ?? '',
    billing_rate_snapshot: initial?.billing_rate_snapshot ?? '',
    budget_min: initial?.budget_min ?? '',
    budget_max: initial?.budget_max ?? '',
    budget_plan: initial?.budget_plan != null ? String(initial.budget_plan) : '',
    internal_requested_monthly_gross: initial?.internal_requested_monthly_gross ?? '',
    internal_budget_variance_reason: initial?.internal_budget_variance_reason ?? '',
  }))

  const parentCtx = `${parentMrf.site}|${parentMrf.billing_type}|${parentMrf.requesting_department ?? ''}|${parentMrf.required_department ?? ''}`
  const prevParentRef = useRef('')
  useEffect(() => {
    if (prevParentRef.current && prevParentRef.current !== parentCtx) {
      setValues((v) => ({ ...v, budget_plan: '', site_role_requirement: '' }))
    }
    prevParentRef.current = parentCtx
  }, [parentCtx])

  const selectedSite = useMemo(
    () => siteOptions.find((s) => s.id === Number(parentMrf.site)),
    [siteOptions, parentMrf.site],
  )

  const selectedSrr = useMemo(
    () => srrRows.find((s) => s.id === Number(values.site_role_requirement)),
    [srrRows, values.site_role_requirement],
  )

  const srrLocked = isBillable && Boolean(values.site_role_requirement)

  const masterCommercials = useMemo(
    () => resolveMasterCommercials(initial, selectedSrr),
    [initial, selectedSrr],
  )

  const showCommercialPanel = isBillable && Boolean(values.site_role_requirement)
  const existingOverrideReadOnly =
    Boolean(initial?.commercial_override_enabled) && !canOverrideCommercials
  const commercialInputsLocked =
    submitting ||
    !!lookupError ||
    (isBillable && srrLocked && !commercialOverrideEnabled) ||
    existingOverrideReadOnly

  function applyMasterCommercialsToValues() {
    setValues((v) => ({
      ...v,
      wage_min_requested: masterCommercials.wageMin,
      wage_max_requested: masterCommercials.wageMax,
      billing_rate_snapshot: masterCommercials.billingRate,
    }))
  }

  function setOverrideEnabled(next: boolean) {
    setCommercialOverrideEnabled(next)
    if (!next) {
      setCommercialOverrideReason('')
      applyMasterCommercialsToValues()
    }
  }

  function applySrrSelection(srrId: string) {
    if (!srrId) {
      setValues((v) => ({ ...v, site_role_requirement: '' }))
      return
    }
    const srr = srrRows.find((s) => s.id === Number(srrId))
    if (!srr) {
      setValues((v) => ({ ...v, site_role_requirement: srrId }))
      return
    }
    const master = resolveMasterCommercials(null, srr)
    setValues((v) => ({
      ...v,
      site_role_requirement: srrId,
      job_role: String(srr.job_role),
      wage_category: srr.wage_category != null ? String(srr.wage_category) : '',
      wage_min_requested: commercialOverrideEnabled ? v.wage_min_requested : master.wageMin,
      wage_max_requested: commercialOverrideEnabled ? v.wage_max_requested : master.wageMax,
      billing_rate_snapshot: commercialOverrideEnabled ? v.billing_rate_snapshot : master.billingRate,
    }))
  }

  const [budgetRows, setBudgetRows] = useState<BudgetPlanRow[]>([])
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetLookupError, setBudgetLookupError] = useState<string | null>(null)

  // Budget override lookup - only for billable MRFs
  // Non-billable MRFs use the MRF-level internal hiring budget (no line-level override)
  useEffect(() => {
    if (!canReadBudget || !isBillable) {
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
      const sid = Number(parentMrf.site)
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
  }, [canReadBudget, isBillable, parentMrf.site, selectedSite?.client])

  const headcountNum = Number(values.headcount)
  const approvedHeadcount = selectedSrr?.approved_headcount ?? initial?.srr_approved_headcount ?? null
  const remainingHeadcount = useMemo(() => {
    if (initial && values.site_role_requirement === String(initial.site_role_requirement ?? '')) {
      return availableHeadcountForEdit(initial)
    }
    return selectedSrr?.remaining_headcount ?? selectedSrr?.approved_headcount ?? null
  }, [initial, selectedSrr, values.site_role_requirement])

  const headcountError = useMemo(() => {
    if (!Number.isFinite(headcountNum) || headcountNum < 1) return 'Headcount must be at least 1.'
    if (
      isBillable &&
      remainingHeadcount != null &&
      Number.isFinite(remainingHeadcount) &&
      headcountNum > remainingHeadcount
    ) {
      return `Requested headcount (${headcountNum}) exceeds remaining (${remainingHeadcount}).`
    }
    return null
  }, [headcountNum, isBillable, remainingHeadcount])

  const srrRequiredError = useMemo(() => {
    if (isBillable && !values.site_role_requirement) {
      return 'Select an approved site role requirement for this billable MRF.'
    }
    return null
  }, [isBillable, values.site_role_requirement])

  const srrWageWarning = useMemo(() => {
    if (!isBillable || !selectedSrr) return null
    if (!selectedSrr.wage_category && !selectedSrr.wage_min && !selectedSrr.wage_max) {
      return 'This site role has no wage category or wage range configured. Enter values manually or update the SRR.'
    }
    return null
  }, [isBillable, selectedSrr])

  const wageRangeError = useMemo(() => {
    const min = toNumberOrNull(values.wage_min_requested)
    const max = toNumberOrNull(values.wage_max_requested)
    if (min != null && max != null && min > max) return 'Wage min cannot exceed wage max.'
    return null
  }, [values.wage_min_requested, values.wage_max_requested])

  const budgetRangeError = useMemo(() => {
    if (isBillable) return null
    if (!values.internal_requested_monthly_gross) return 'Requested monthly gross is required for internal hiring.'
    return null
  }, [isBillable, values.internal_requested_monthly_gross])

  const jobRoleError = useMemo(() => {
    if (isBillable && !values.site_role_requirement) return null
    return values.job_role ? null : 'Job role is required.'
  }, [isBillable, values.site_role_requirement, values.job_role])

  const overrideReasonError = useMemo(() => {
    if (!isBillable || !commercialOverrideEnabled) return null
    return commercialOverrideReason.trim() ? null : 'Override reason is required.'
  }, [isBillable, commercialOverrideEnabled, commercialOverrideReason])

  const canSubmit =
    !submitting &&
    !lookupError &&
    !headcountError &&
    !srrRequiredError &&
    !wageRangeError &&
    !budgetRangeError &&
    !jobRoleError &&
    !overrideReasonError

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    const payload: MRFLineItemWriteInput = {
      mrf: 0,
      job_role: Number(values.job_role),
      site_role_requirement: values.site_role_requirement ? Number(values.site_role_requirement) : null,
      headcount: Number(values.headcount),
      replacement_for_employee: values.replacement_for_employee.trim() || undefined,
      required_skills: values.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      wage_category: values.wage_category ? Number(values.wage_category) : null,
      wage_min_requested: isBillable
        ? commercialOverrideEnabled
          ? toNumberOrNull(values.wage_min_requested)
          : toNumberOrNull(masterCommercials.wageMin)
        : toNumberOrNull(values.wage_min_requested),
      wage_max_requested: isBillable
        ? commercialOverrideEnabled
          ? toNumberOrNull(values.wage_max_requested)
          : toNumberOrNull(masterCommercials.wageMax)
        : toNumberOrNull(values.wage_max_requested),
      billing_rate_snapshot: isBillable
        ? commercialOverrideEnabled
          ? toNumberOrNull(values.billing_rate_snapshot)
          : toNumberOrNull(masterCommercials.billingRate)
        : toNumberOrNull(values.billing_rate_snapshot),
      budget_min: isBillable ? null : toNumberOrNull(values.budget_min),
      budget_max: isBillable ? null : toNumberOrNull(values.budget_max),
      internal_requested_monthly_gross: isBillable ? null : values.internal_requested_monthly_gross.trim() || null,
      internal_budget_variance_reason: isBillable ? null : values.internal_budget_variance_reason.trim() || null,
    }
    const bpTrim = values.budget_plan.trim()
    if (initial) {
      if (bpTrim) payload.budget_plan = Number(bpTrim)
      else if (initial.budget_plan != null) payload.budget_plan = null
    } else if (bpTrim) {
      payload.budget_plan = Number(bpTrim)
    }
    if (isBillable && commercialOverrideEnabled) {
      payload.commercial_override_reason = commercialOverrideReason.trim()
    }
    await onSubmit(payload)
  }

  const mrfHasBudget = parentMrf.budget_plan != null && parentMrf.budget_plan > 0
  const billable = isBillable
  const budgetSelectDisabled =
    submitting ||
    budgetLoading ||
    !!budgetLookupError ||
    (billable && (!Number.isFinite(Number(parentMrf.site)) || selectedSite?.client == null))

  const roleFieldsDisabled = submitting || !!lookupError || isBillable
  const wageFieldLabels = isBillable && commercialOverrideEnabled
    ? { min: 'Requested wage min', max: 'Requested wage max', billing: 'Requested billing rate' }
    : { min: 'Wage min requested', max: 'Wage max requested', billing: 'Billing rate snapshot' }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <ErrorState message={errorMessage} /> : null}
      {lookupError ? <ErrorState message={`Lookup failed. Add/Edit is disabled. ${lookupError}`} /> : null}

      {isBillable ? (
        <>
          <div className="rounded-panel border border-brand-500/30 bg-brand-500/5 p-3 text-xs text-app-secondary">
            <p className="font-medium text-app-text">Billable line item</p>
            <p className="mt-1">
              Select an approved site role requirement for this site
              {parentMrf.required_department_name
                ? ` and department (${parentMrf.required_department_name})`
                : parentMrf.required_department
                  ? ` and department #${parentMrf.required_department}`
                  : ''}
              . Role, wage, and billing defaults come from the SRR.
            </p>
            {!parentMrf.required_department ? (
              <p className="mt-2 text-status-warning">
                No required department on this MRF — only site-level SRRs are shown.
              </p>
            ) : null}
            {srrRows.length === 0 ? (
              <p className="mt-2 text-status-danger font-medium">
                There are no approved SRRs configured for this site/department combination. You cannot create a billable line item without an approved SRR.
              </p>
            ) : null}
          </div>

          <Select
            id="mrf_li_srr"
            label="Site role requirement"
            value={values.site_role_requirement}
            onChange={(e) => applySrrSelection(e.target.value)}
            disabled={submitting || !!lookupError}
            error={srrRequiredError ?? undefined}
          >
            <option value="">
              {srrRows.length === 0 ? 'No matching SRRs for this site/department' : 'Select approved role…'}
            </option>
            {srrRows.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {formatSrrOptionLabel(s)}
              </option>
            ))}
          </Select>
          {selectedSrr?.location_area_name ? (
            <p className="text-xs text-app-subtle">Location: {selectedSrr.location_area_name}</p>
          ) : null}
          {srrWageWarning ? <p className="text-xs text-status-warning">{srrWageWarning}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Input
                id="mrf_li_headcount"
                label="Headcount"
                value={values.headcount}
                onChange={(e) => setValues((v) => ({ ...v, headcount: e.target.value }))}
                disabled={submitting}
                inputMode="numeric"
                error={headcountError ?? undefined}
              />
              {approvedHeadcount != null ? (
                <p className="text-xs text-app-subtle">
                  SRR approved: {approvedHeadcount}
                  {remainingHeadcount != null ? ` · Available for this line: ${remainingHeadcount}` : null}
                  {!initial && selectedSrr ? (
                    <span className="block text-app-subtle">
                      Remaining across other active MRFs is validated on save.
                    </span>
                  ) : null}
                </p>
              ) : null}
            </div>

            <Select
              id="mrf_li_job_role"
              label="Job role"
              value={values.job_role}
              onChange={(e) => setValues((v) => ({ ...v, job_role: e.target.value }))}
              disabled={roleFieldsDisabled}
              error={jobRoleError ?? undefined}
            >
              <option value="">Select...</option>
              {jobRoleOptions.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="mrf_li_job_role"
            label="Job role"
            value={values.job_role}
            onChange={(e) => setValues((v) => ({ ...v, job_role: e.target.value }))}
            disabled={submitting || !!lookupError}
            error={jobRoleError ?? undefined}
          >
            <option value="">Select...</option>
            {jobRoleOptions.map((o) => (
              <option key={o.id} value={String(o.id)}>
                {o.label}
              </option>
            ))}
          </Select>

          <Input
            id="mrf_li_headcount"
            label="Headcount"
            value={values.headcount}
            onChange={(e) => setValues((v) => ({ ...v, headcount: e.target.value }))}
            disabled={submitting}
            inputMode="numeric"
            error={headcountError ?? undefined}
          />
        </div>
      )}

      {!isBillable ? (
        <Select
          id="mrf_li_srr"
          label="Site role requirement (optional)"
          value={values.site_role_requirement}
          onChange={(e) => setValues((v) => ({ ...v, site_role_requirement: e.target.value }))}
          disabled={submitting || !!lookupError}
        >
          <option value="">None</option>
          {srrRows.map((s) => (
            <option key={s.id} value={String(s.id)}>
              {formatSrrOptionLabel(s)}
            </option>
          ))}
        </Select>
      ) : null}

      <Input
        id="mrf_li_replacement_for"
        label="Replacement for employee"
        value={values.replacement_for_employee}
        onChange={(e) => setValues((v) => ({ ...v, replacement_for_employee: e.target.value }))}
        disabled={submitting}
        placeholder="Optional"
      />

      <Input
        id="mrf_li_required_skills"
        label="Required skills"
        value={values.required_skills}
        onChange={(e) => setValues((v) => ({ ...v, required_skills: e.target.value }))}
        disabled={submitting}
        placeholder="Comma-separated, e.g. PPE, supervisor, forklift"
      />

      <Select
        id="mrf_li_wage_category"
        label="Wage category"
        value={values.wage_category}
        onChange={(e) => setValues((v) => ({ ...v, wage_category: e.target.value }))}
        disabled={roleFieldsDisabled}
      >
        <option value="">None</option>
        {wageCategoryOptions.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.label}
          </option>
        ))}
      </Select>

      {showCommercialPanel ? (
        <div className="space-y-3 rounded-panel border border-app-border bg-app-muted/40 p-3">
          <div>
            <p className="text-sm font-semibold text-app-text">Configured commercial values</p>
            <p className="mt-0.5 text-xs text-app-secondary">
              These values come from the approved site role requirement and wage master.
            </p>
          </div>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-app-subtle">Wage range</dt>
              <dd className="font-medium tabular-nums text-app-text">
                {formatWageRange(masterCommercials.wageMin, masterCommercials.wageMax) ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-app-subtle">Billing rate</dt>
              <dd className="font-medium tabular-nums text-app-text">
                {formatCommercialMoney(masterCommercials.billingRate) ?? '—'}
              </dd>
            </div>
            {masterCommercials.shiftHours ? (
              <div>
                <dt className="text-xs text-app-subtle">Shift hours</dt>
                <dd className="font-medium text-app-text">{masterCommercials.shiftHours}h</dd>
              </div>
            ) : null}
          </dl>
          <p className="text-xs text-app-subtle">{formatMasterCommercialSummary(masterCommercials)}</p>

          {initial?.commercial_override_enabled && initial.commercial_overridden_at ? (
            <p className="text-xs text-app-secondary">
              Override recorded at {new Date(initial.commercial_overridden_at).toLocaleString()}
            </p>
          ) : null}

          {canOverrideCommercials ? (
            <label className="flex items-center gap-2 text-sm text-app-secondary">
              <input
                type="checkbox"
                checked={commercialOverrideEnabled}
                onChange={(e) => setOverrideEnabled(e.target.checked)}
                disabled={submitting}
              />
              Override commercial values
            </label>
          ) : (
            <p className="text-xs text-app-secondary">
              {existingOverrideReadOnly
                ? 'Commercial values were overridden on this line. You do not have permission to change them.'
                : 'Commercial values come from approved SRR/wage master. You do not have permission to override commercial values.'}
            </p>
          )}

          {commercialOverrideEnabled && canOverrideCommercials ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="mrf_li_override_reason" className="text-sm font-medium text-app-secondary">
                Override reason
              </label>
              <textarea
                id="mrf_li_override_reason"
                value={commercialOverrideReason}
                onChange={(e) => setCommercialOverrideReason(e.target.value)}
                disabled={submitting}
                rows={3}
                className="w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="Explain why wage or billing differs from the configured master values."
              />
              {overrideReasonError ? (
                <p className="text-sm text-status-danger">{overrideReasonError}</p>
              ) : null}
            </div>
          ) : null}

          {existingOverrideReadOnly && initial?.commercial_override_reason ? (
            <div className="rounded border border-status-warning/40 bg-status-warning/5 px-3 py-2 text-xs text-app-secondary">
              <p className="font-medium text-app-text">Override reason</p>
              <p className="mt-1 whitespace-pre-wrap">{initial.commercial_override_reason}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="mrf_li_wage_min"
          label={wageFieldLabels.min}
          value={values.wage_min_requested}
          onChange={(e) => setValues((v) => ({ ...v, wage_min_requested: e.target.value }))}
          disabled={commercialInputsLocked}
          inputMode="decimal"
          error={wageRangeError ?? undefined}
        />
        <Input
          id="mrf_li_wage_max"
          label={wageFieldLabels.max}
          value={values.wage_max_requested}
          onChange={(e) => setValues((v) => ({ ...v, wage_max_requested: e.target.value }))}
          disabled={commercialInputsLocked}
          inputMode="decimal"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="mrf_li_billing_rate_snapshot"
          label={wageFieldLabels.billing}
          value={values.billing_rate_snapshot}
          onChange={(e) => setValues((v) => ({ ...v, billing_rate_snapshot: e.target.value }))}
          disabled={commercialInputsLocked}
          inputMode="decimal"
        />
        <div />
      </div>

      {!isBillable ? (
        <div className="space-y-3">
          <div className="rounded-panel border border-app-border bg-app-muted/20 p-3">
            <p className="text-xs font-semibold text-app-text">Internal hiring line item</p>
            <p className="mt-1 text-xs text-app-secondary">
              No site role requirement needed. Enter the monthly cost directly.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="mrf_li_internal_gross"
              label="Requested Monthly Gross / CTC *"
              value={values.internal_requested_monthly_gross}
              onChange={(e) => setValues((v) => ({ ...v, internal_requested_monthly_gross: e.target.value }))}
              disabled={submitting}
              inputMode="decimal"
              error={!values.internal_requested_monthly_gross && !isBillable ? 'Required' : undefined}
            />
          </div>
          {parentMrf.mrf_type === 'replacement' ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="mrf_li_variance_reason" className="text-sm font-medium text-app-secondary">
                Variance Reason
              </label>
              <textarea
                id="mrf_li_variance_reason"
                value={values.internal_budget_variance_reason}
                onChange={(e) => setValues((v) => ({ ...v, internal_budget_variance_reason: e.target.value }))}
                disabled={submitting}
                rows={2}
                className="w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="Required if new salary exceeds previous employee's salary."
              />
              {initial?.internal_previous_employee_budget ? (
                <p className="text-xs font-medium text-app-subtle">
                  Previous employee baseline: {formatBudgetAmount(initial.internal_previous_employee_budget, 'INR')}
                  {initial.internal_budget_variance ? ` (Variance: ${formatBudgetAmount(initial.internal_budget_variance, 'INR')})` : ''}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {!canReadBudget && initial?.budget_plan != null && (initial.budget_plan_name || initial.budget_plan_code) ? (
        <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm text-app-secondary">
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Line budget override</p>
          <p className="mt-1 font-medium text-app-text">
            {initial.budget_plan_name ?? 'Budget'}{' '}
            {initial.budget_plan_code ? (
              <span className="font-mono text-xs">({initial.budget_plan_code})</span>
            ) : null}
          </p>
          {initial.budget_plan_nature ? (
            <p className="mt-1 text-xs">Nature: {budgetNatureLabel(String(initial.budget_plan_nature))}</p>
          ) : null}
          {initial.budget_plan_amount != null ? (
            <p className="mt-1 text-xs">
              {formatBudgetAmount(String(initial.budget_plan_amount), initial.budget_plan_currency ?? 'INR')} —{' '}
              {initial.budget_plan_status ?? '—'}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-app-subtle">Budget selection requires budget.read.</p>
        </div>
      ) : null}

      {/* Budget override - only for billable MRFs */}
      {canReadBudget && isBillable ? (
        <>
          {budgetLookupError ? (
            <ErrorState
              message={`Budget lookup failed. ${budgetLookupError} You can still save without a budget override.`}
            />
          ) : null}
          <Select
            id="mrf_li_budget_plan"
            label="Budget plan override (optional)"
            value={values.budget_plan}
            onChange={(e) => setValues((v) => ({ ...v, budget_plan: e.target.value }))}
            disabled={budgetSelectDisabled}
          >
            <option value="">
              {!Number.isFinite(Number(parentMrf.site)) || selectedSite?.client == null
                ? 'Site/client unavailable for budget lookup'
                : budgetLoading
                  ? 'Loading budgets...'
                  : 'No override (inherit from MRF if set)'}
            </option>
            {budgetRows.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {formatBudgetPlanOptionLabel(b)}
              </option>
            ))}
          </Select>
          {!values.budget_plan.trim() && mrfHasBudget ? (
            <p className="text-xs text-app-subtle">If left blank, this line item will use the MRF budget.</p>
          ) : null}
        </>
      ) : null}

      {/* Non-billable MRFs use MRF-level internal hiring budget - no line override */}
      {!isBillable && mrfHasBudget ? (
        <div className="rounded-panel border border-app-border bg-app-muted/20 p-3 text-sm">
          <p className="text-xs font-semibold text-app-text">Budget</p>
          <p className="mt-1 text-xs text-app-secondary">
            This line item uses the MRF's internal hiring budget. Line-level budget overrides are not available for
            non-billable MRFs.
          </p>
        </div>
      ) : null}

      <button type="submit" hidden />
    </form>
  )
}
