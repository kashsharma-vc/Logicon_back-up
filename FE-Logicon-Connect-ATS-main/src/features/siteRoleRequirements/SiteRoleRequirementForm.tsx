import { useEffect, useMemo, useState, type FormEvent } from 'react'
import axios from 'axios'
import { lookupWageRate, type MinimumWageRateRow } from '@/api/wages'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import type { BillingType } from '@/api/siteRoleRequirements'

export type SiteRoleRequirementFormMode = 'create' | 'edit'

export interface SiteRoleRequirementFormValues {
  site: string
  job_role: string
  approved_headcount: string
  billing_type: BillingType
  billing_rate: string
  wage_min: string
  wage_max: string
  shift_hours: string
  wage_category: string
  effective_from: string
  effective_to: string
  is_active: boolean
}

export interface Option {
  id: number
  label: string
}

function toNumberOrNull(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n
}

function todayInputDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function SiteRoleRequirementForm({
  formId,
  initialValues,
  siteOptions,
  jobRoleOptions,
  wageCategoryOptions,
  lookupError,
  canLookupWage = false,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  initialValues?: Partial<SiteRoleRequirementFormValues>
  siteOptions: Option[]
  jobRoleOptions: Option[]
  wageCategoryOptions: Option[]
  lookupError: string | null
  /** When true, calls minimum wage lookup when site, job role, wage category, and effective from are set. */
  canLookupWage?: boolean
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (values: SiteRoleRequirementFormValues) => void | Promise<void>
}) {
  const [values, setValues] = useState<SiteRoleRequirementFormValues>(() => ({
    site: initialValues?.site ?? '',
    job_role: initialValues?.job_role ?? '',
    approved_headcount: initialValues?.approved_headcount ?? '1',
    billing_type: initialValues?.billing_type ?? 'billable',
    billing_rate: initialValues?.billing_rate ?? '',
    wage_min: initialValues?.wage_min ?? '',
    wage_max: initialValues?.wage_max ?? '',
    shift_hours: initialValues?.shift_hours ?? '',
    wage_category: initialValues?.wage_category ?? '',
    effective_from: initialValues?.effective_from ?? todayInputDate(),
    effective_to: initialValues?.effective_to ?? '',
    is_active: initialValues?.is_active ?? true,
  }))

  const [wageSuggest, setWageSuggest] = useState<MinimumWageRateRow | null>(null)
  const [wageLookupLoading, setWageLookupLoading] = useState(false)
  const [wageLookupNote, setWageLookupNote] = useState<string | null>(null)
  const [autoAppliedWageMin, setAutoAppliedWageMin] = useState(false)

  useEffect(() => {
    if (!canLookupWage) {
      setWageSuggest(null)
      setWageLookupNote(null)
      return
    }
    const site = values.site.trim()
    const job_role = values.job_role.trim()
    const wage_category = values.wage_category.trim()
    const effective_from = values.effective_from.trim()
    if (!site || !job_role || !wage_category || !effective_from) {
      setWageSuggest(null)
      setWageLookupNote(null)
      return
    }

    setWageLookupLoading(true)
    setWageLookupNote(null)
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const rate = await lookupWageRate({
            site: Number(site),
            job_role: Number(job_role),
            wage_category: Number(wage_category),
            date: effective_from,
          })
          setWageSuggest(rate)
          setWageLookupNote(null)
          setValues((current) => {
            if (current.wage_min.trim() && !autoAppliedWageMin) {
              return current
            }
            setAutoAppliedWageMin(true)
            return { ...current, wage_min: String(rate.monthly_wage) }
          })
        } catch (e: unknown) {
          setWageSuggest(null)
          if (axios.isAxiosError(e) && e.response?.status === 404) {
            setWageLookupNote('No matching minimum wage rate for this combination.')
          } else {
            setWageLookupNote(parseApiError(e, 'Wage lookup failed').message)
          }
        } finally {
          setWageLookupLoading(false)
        }
      })()
    }, 400)

    return () => {
      window.clearTimeout(handle)
    }
  }, [canLookupWage, values.site, values.job_role, values.wage_category, values.effective_from])

  const approvedError = useMemo(() => {
    const n = Number(values.approved_headcount)
    if (!Number.isFinite(n) || !Number.isInteger(n)) return 'Enter an integer headcount.'
    if (n < 1) return 'Approved headcount must be at least 1.'
    return null
  }, [values.approved_headcount])

  const siteError = useMemo(() => (values.site ? null : 'Site is required.'), [values.site])
  const roleError = useMemo(() => (values.job_role ? null : 'Job role is required.'), [values.job_role])
  const effectiveFromError = useMemo(() => (values.effective_from ? null : 'Effective from is required.'), [values.effective_from])

  const wageMin = useMemo(() => toNumberOrNull(values.wage_min), [values.wage_min])
  const wageMax = useMemo(() => toNumberOrNull(values.wage_max), [values.wage_max])
  const wageRangeError = useMemo(() => {
    if (wageMin != null && wageMax != null && wageMin > wageMax) return 'Wage min must be <= wage max.'
    return null
  }, [wageMin, wageMax])

  const effectiveToError = useMemo(() => {
    if (!values.effective_to || !values.effective_from) return null
    return values.effective_to < values.effective_from ? 'Effective to must be on/after effective from.' : null
  }, [values.effective_from, values.effective_to])

  const canSubmit =
    !submitting &&
    !lookupError &&
    !approvedError &&
    !siteError &&
    !roleError &&
    !effectiveFromError &&
    !wageRangeError &&
    !effectiveToError

  const lookupReady =
    canLookupWage &&
    !!values.site &&
    !!values.job_role &&
    !!values.wage_category &&
    !!values.effective_from

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit(values)
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <ErrorState message={errorMessage} /> : null}
      {lookupError ? <ErrorState message={`Lookup API failed. Create/Edit is disabled. ${lookupError}`} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="srr_site"
          label="Site"
          value={values.site}
          onChange={(e) => setValues((v) => ({ ...v, site: e.target.value }))}
          disabled={submitting || !!lookupError}
          error={siteError ?? undefined}
        >
          <option value="">Select site</option>
          {siteOptions.map((o) => (
            <option key={o.id} value={String(o.id)}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          id="srr_job_role"
          label="Job role"
          value={values.job_role}
          onChange={(e) => setValues((v) => ({ ...v, job_role: e.target.value }))}
          disabled={submitting || !!lookupError}
          error={roleError ?? undefined}
        >
          <option value="">Select job role</option>
          {jobRoleOptions.map((o) => (
            <option key={o.id} value={String(o.id)}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="approved_headcount"
          label="Approved headcount"
          value={values.approved_headcount}
          onChange={(e) => setValues((v) => ({ ...v, approved_headcount: e.target.value }))}
          error={approvedError ?? undefined}
          disabled={submitting || !!lookupError}
          required
        />
        <Select
          id="billing_type"
          label="Billing type"
          value={values.billing_type}
          onChange={(e) => setValues((v) => ({ ...v, billing_type: e.target.value as BillingType }))}
          disabled={submitting || !!lookupError}
        >
          <option value="billable">Billable</option>
          <option value="non_billable">Non-billable</option>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="billing_rate"
          label="Billing rate (optional)"
          value={values.billing_rate}
          onChange={(e) => setValues((v) => ({ ...v, billing_rate: e.target.value }))}
          disabled={submitting || !!lookupError}
        />
        <Input
          id="shift_hours"
          label="Shift hours (optional)"
          value={values.shift_hours}
          onChange={(e) => setValues((v) => ({ ...v, shift_hours: e.target.value }))}
          disabled={submitting || !!lookupError}
        />
      </div>

      <Select
        id="wage_category"
        label="Wage category (optional)"
        value={values.wage_category}
        onChange={(e) => setValues((v) => ({ ...v, wage_category: e.target.value }))}
        disabled={submitting || !!lookupError}
      >
        <option value="">None</option>
        {wageCategoryOptions.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.label}
          </option>
        ))}
      </Select>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="effective_from"
          label="Effective from"
          type="date"
          value={values.effective_from}
          onChange={(e) => setValues((v) => ({ ...v, effective_from: e.target.value }))}
          error={effectiveFromError ?? undefined}
          disabled={submitting || !!lookupError}
          required
        />
        <Input
          id="effective_to"
          label="Effective to (optional)"
          type="date"
          value={values.effective_to}
          onChange={(e) => setValues((v) => ({ ...v, effective_to: e.target.value }))}
          error={effectiveToError ?? undefined}
          disabled={submitting || !!lookupError}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="wage_min"
          label="Wage min (optional)"
          value={values.wage_min}
          onChange={(e) => {
            setAutoAppliedWageMin(false)
            setValues((v) => ({ ...v, wage_min: e.target.value }))
          }}
          error={wageRangeError ?? undefined}
          disabled={submitting || !!lookupError}
        />
        <Input
          id="wage_max"
          label="Wage max (optional)"
          value={values.wage_max}
          onChange={(e) => setValues((v) => ({ ...v, wage_max: e.target.value }))}
          error={wageRangeError ?? undefined}
          disabled={submitting || !!lookupError}
        />
      </div>

      {lookupReady ? (
        <div className="rounded-panel border border-app-border bg-app-surface p-4 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Suggested wage (lookup)</p>
          {wageLookupLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-app-secondary">
              <span
                className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-app-border border-t-brand-600"
                aria-hidden
              />
              <span>Checking minimum wage…</span>
            </div>
          ) : wageSuggest ? (
            <div className="mt-3 space-y-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-app-subtle">Monthly</dt>
                  <dd className="font-mono font-medium text-app-text">{wageSuggest.monthly_wage}</dd>
                </div>
                <div>
                  <dt className="text-app-subtle">Daily</dt>
                  <dd className="font-mono font-medium text-app-text">{wageSuggest.daily_wage ?? '—'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-app-subtle">Source</dt>
                  <dd className="text-app-secondary">{wageSuggest.source_note || '—'}</dd>
                </div>
                <div>
                  <dt className="text-app-subtle">Effective from (rate)</dt>
                  <dd className="font-mono text-app-secondary">{wageSuggest.effective_from}</dd>
                </div>
              </dl>
              {autoAppliedWageMin ? (
                <p className="text-xs text-app-subtle">
                  Wage min was auto-filled from the suggested monthly wage. You can edit it if needed.
                </p>
              ) : !values.wage_min.trim() ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-9"
                  disabled={submitting || !!lookupError}
                  onClick={() =>
                    {
                      setAutoAppliedWageMin(true)
                      setValues((v) => ({
                        ...v,
                        wage_min: String(wageSuggest.monthly_wage),
                      }))
                    }
                  }
                >
                  Apply monthly wage to wage min
                </Button>
              ) : (
                <p className="text-xs text-app-subtle">
                  Wage min is set manually — it will not be overwritten by lookup. Clear the field if you want to apply the suggestion.
                </p>
              )}
            </div>
          ) : wageLookupNote ? (
            <p className="mt-3 text-sm text-app-secondary">{wageLookupNote}</p>
          ) : null}
        </div>
      ) : canLookupWage ? (
        <p className="text-xs text-app-subtle">
          Select site, job role, wage category, and effective from to see a suggested minimum wage.
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-app-secondary">
        <input
          type="checkbox"
          checked={values.is_active}
          onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
          disabled={submitting || !!lookupError}
        />
        Active
      </label>

      <button type="submit" hidden />
    </form>
  )
}
