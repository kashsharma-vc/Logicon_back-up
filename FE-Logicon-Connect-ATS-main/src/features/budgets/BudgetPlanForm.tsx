import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadAllSites } from '@/features/budgets/loadPagedLookups'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { ClientRow } from '@/api/clients'
import type { DepartmentRow } from '@/api/departments'
import type { SiteProfileRow } from '@/api/sites'
import {
  BUDGET_NATURE_OPTIONS,
  BUDGET_STATUS_OPTIONS,
  BUDGET_TYPE_OPTIONS,
  type BudgetNature,
  type BudgetPlanRow,
  type BudgetPlanWritePayload,
} from '@/features/budgets/types'

export interface BudgetPlanFormProps {
  formId: string
  mode: 'create' | 'edit'
  submitting: boolean
  serverError: string | null
  serverFields?: Record<string, string>
  initial: BudgetPlanRow | null
  /** When 'internal_hiring', forces budget_nature=non_billable, budget_type=hiring, hides client/site */
  presetMode?: 'internal_hiring' | null
  clients: ClientRow[]
  clientsLoading: boolean
  clientsError: string | null
  departments: DepartmentRow[]
  departmentsLoading: boolean
  departmentsError: string | null
  onSubmit: (payload: BudgetPlanWritePayload) => void | Promise<void>
}

function emptyDefaults(): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10)
  return {
    name: '',
    code: '',
    budget_nature: 'billable',
    budget_type: 'general',
    client: '',
    site: '',
    department: '',
    period_start: today,
    period_end: '',
    amount: '',
    currency: 'INR',
    status: 'draft',
    notes: '',
    is_active: 'true',
  }
}

function rowToForm(row: BudgetPlanRow): Record<string, string> {
  return {
    name: row.name ?? '',
    code: row.code ?? '',
    budget_nature: row.budget_nature ?? 'billable',
    budget_type: row.budget_type ?? 'general',
    client: row.client != null ? String(row.client) : '',
    site: row.site != null ? String(row.site) : '',
    department: row.department != null ? String(row.department) : '',
    period_start: row.period_start?.slice(0, 10) ?? '',
    period_end: row.period_end?.slice(0, 10) ?? '',
    amount: row.amount != null ? String(row.amount) : '',
    currency: row.currency ?? 'INR',
    status: row.status ?? 'draft',
    notes: row.notes ?? '',
    is_active: row.is_active ? 'true' : 'false',
  }
}

export function BudgetPlanForm({
  formId,
  mode,
  submitting,
  serverError,
  serverFields,
  initial,
  presetMode,
  clients,
  clientsLoading,
  clientsError,
  departments,
  departmentsLoading,
  departmentsError,
  onSubmit,
}: BudgetPlanFormProps) {
  const isInternalHiringMode = presetMode === 'internal_hiring'
  const [values, setValues] = useState<Record<string, string>>(() =>
    initial ? rowToForm(initial) : emptyDefaults(),
  )
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [sites, setSites] = useState<SiteProfileRow[]>([])
  const [sitesLoading, setSitesLoading] = useState(false)
  const [sitesLookupError, setSitesLookupError] = useState<string | null>(null)

  useEffect(() => {
    setValues(initial ? rowToForm(initial) : emptyDefaults())
    setLocalErrors({})
  }, [initial, mode])

  // Force internal hiring preset values
  useEffect(() => {
    if (!isInternalHiringMode) return
    setValues((prev) => ({
      ...prev,
      budget_nature: 'non_billable',
      budget_type: 'hiring',
      client: '',
      site: '',
    }))
  }, [isInternalHiringMode])

  const budgetNature = values.budget_nature as BudgetNature
  const clientIdNum = values.client ? Number(values.client) : NaN
  const siteIdNum = values.site ? Number(values.site) : NaN

  useEffect(() => {
    if (budgetNature !== 'billable' || !Number.isFinite(clientIdNum)) {
      setSites([])
      setSitesLookupError(null)
      return
    }
    let cancelled = false
    void (async () => {
      setSitesLoading(true)
      setSitesLookupError(null)
      const res = await loadAllSites({ client: clientIdNum })
      if (cancelled) return
      if (res.ok) {
        setSites(res.items)
      } else {
        setSites([])
        setSitesLookupError(res.error)
        setValues((prev) => ({ ...prev, site: '' }))
      }
      setSitesLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [budgetNature, clientIdNum])

  const selectedSite = useMemo(() => sites.find((s) => s.id === siteIdNum), [sites, siteIdNum])

  const clientSiteMismatch = useMemo(() => {
    if (budgetNature !== 'billable' || !selectedSite || !values.client) return false
    return selectedSite.client !== Number(values.client)
  }, [budgetNature, selectedSite, values.client])

  function setField(key: string, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }))
  }

  const onNatureChange = useCallback((v: string) => {
    setValues((prev) => ({
      ...prev,
      budget_nature: v,
      ...(v === 'billable' ? { department: '' } : { client: '', site: '' }),
    }))
    setLocalErrors({})
  }, [])

  const onClientChange = useCallback((v: string) => {
    setValues((prev) => ({ ...prev, client: v, site: '' }))
  }, [])

  const onSiteChange = useCallback(
    (v: string) => {
      setValues((prev) => {
        const next: Record<string, string> = { ...prev, site: v }
        if (v) {
          const s = sites.find((x) => x.id === Number(v))
          if (s && !(prev.client ?? '').trim()) next.client = String(s.client)
        }
        return next
      })
    },
    [sites],
  )

  function validate(): Record<string, string> | null {
    const err: Record<string, string> = {}
    const name = values.name ?? ''
    const code = values.code ?? ''
    if (!name.trim()) err.name = 'Name is required.'
    if (!code.trim()) err.code = 'Code is required.'
    if (!values.budget_nature) err.budget_nature = 'Budget nature is required.'
    if (!values.budget_type) err.budget_type = 'Budget type is required.'
    if (!values.period_start) err.period_start = 'Period start is required.'

    const amt = Number(values.amount ?? '')
    if (!Number.isFinite(amt) || amt <= 0) err.amount = 'Amount must be greater than zero.'

    if (values.period_end && values.period_start && values.period_end < values.period_start) {
      err.period_end = 'Period end must be on or after period start.'
    }

    if (values.budget_nature === 'billable') {
      if (!values.client) err.client = 'Client is required for billable budgets.'
      if (clientSiteMismatch) err.site = 'Site does not belong to the selected client.'
    } else {
      if (!values.department) err.department = 'Department is required for non-billable budgets.'
    }

    return Object.keys(err).length ? err : null
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalErrors({})
    const ve = validate()
    if (ve) {
      setLocalErrors(ve)
      return
    }

    const amountStr = String(Number(values.amount ?? ''))
    const nm = String(values.name ?? '').trim()
    const cd = String(values.code ?? '').trim()
    const base: BudgetPlanWritePayload = {
      name: nm,
      code: cd,
      budget_nature: String(values.budget_nature ?? ''),
      budget_type: String(values.budget_type ?? ''),
      period_start: String(values.period_start ?? ''),
      period_end: values.period_end ? String(values.period_end) : null,
      amount: amountStr,
      currency: String(values.currency ?? '').trim() || 'INR',
      status: String(values.status ?? ''),
      notes: String(values.notes ?? '').trim(),
      is_active: values.is_active === 'true',
    }

    if (values.budget_nature === 'billable') {
      base.client = Number(values.client)
      base.site = values.site ? Number(values.site) : null
      base.department = null
    } else {
      base.client = null
      base.site = null
      base.department = Number(values.department)
    }

    void onSubmit(base)
  }

  const mergeErr = (key: string) => localErrors[key] || serverFields?.[key]

  const billableBlocked = budgetNature === 'billable' && !!clientsError
  const nonBillableBlocked = budgetNature === 'non_billable' && !!departmentsError
  const saveDisabled =
    submitting || billableBlocked || nonBillableBlocked || clientSiteMismatch

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {serverError ? <ErrorState message={serverError} /> : null}
      {clientsError && budgetNature === 'billable' ? (
        <ErrorState message={`Client lookup failed. ${clientsError}`} />
      ) : null}
      {departmentsError && budgetNature === 'non_billable' ? (
        <ErrorState message={`Department lookup failed. ${departmentsError}`} />
      ) : null}
      {sitesLookupError && budgetNature === 'billable' ? (
        <ErrorState
          message={`Site lookup failed. ${sitesLookupError} You can still save a client-level budget without a site.`}
        />
      ) : null}

      <Input
        id={`${formId}-name`}
        label="Name"
        value={values.name}
        onChange={(e) => setField('name', e.target.value)}
        disabled={submitting}
        error={mergeErr('name')}
      />
      <Input
        id={`${formId}-code`}
        label="Code"
        value={values.code}
        onChange={(e) => setField('code', e.target.value)}
        disabled={submitting}
        error={mergeErr('code')}
      />

      {isInternalHiringMode ? (
        <div className="flex flex-wrap items-center gap-2 rounded-panel border border-app-border bg-app-muted/40 p-3">
          <span className="text-sm font-medium text-app-secondary">Budget type:</span>
          <Badge variant="warning">Internal</Badge>
          <Badge variant="info">Hiring</Badge>
          <span className="text-xs text-app-subtle">(preset - cannot change)</span>
        </div>
      ) : (
        <>
          <Select
            id={`${formId}-budget_nature`}
            label="Budget nature"
            value={values.budget_nature}
            onChange={(e) => onNatureChange(e.target.value)}
            disabled={submitting}
          >
            {BUDGET_NATURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>

          <Select
            id={`${formId}-budget_type`}
            label="Budget type"
            value={values.budget_type}
            onChange={(e) => setField('budget_type', e.target.value)}
            disabled={submitting}
          >
            {BUDGET_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </>
      )}

      {/* Client/Site fields - only for billable, hidden in internal hiring preset */}
      {budgetNature === 'billable' && !isInternalHiringMode ? (
        <>
          <Select
            id={`${formId}-client`}
            label="Client"
            value={values.client}
            onChange={(e) => onClientChange(e.target.value)}
            disabled={submitting || clientsLoading || !!clientsError}
          >
            <option value="">{clientsLoading ? 'Loading clients...' : 'Select client'}</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </Select>
          {mergeErr('client') ? <p className="text-sm text-status-danger">{mergeErr('client')}</p> : null}

          <Select
            id={`${formId}-site`}
            label="Site (optional)"
            value={values.site}
            onChange={(e) => onSiteChange(e.target.value)}
            disabled={
              submitting ||
              !Number.isFinite(clientIdNum) ||
              sitesLoading ||
              !!clientsError ||
              !!sitesLookupError
            }
          >
            <option value="">
              {!Number.isFinite(clientIdNum)
                ? 'Select a client first'
                : sitesLookupError
                  ? 'Sites unavailable'
                  : sitesLoading
                    ? 'Loading sites...'
                    : 'All sites / optional'}
            </option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
          {mergeErr('site') ? <p className="text-sm text-status-danger">{mergeErr('site')}</p> : null}
          {clientSiteMismatch ? (
            <p className="text-sm text-status-danger">Site does not belong to the selected client.</p>
          ) : null}
        </>
      ) : null}

      {/* Department field - for non-billable, always shown in internal hiring preset */}
      {budgetNature === 'non_billable' || isInternalHiringMode ? (
        <>
          <Select
            id={`${formId}-department`}
            label={isInternalHiringMode ? 'Department *' : 'Department'}
            value={values.department}
            onChange={(e) => setField('department', e.target.value)}
            disabled={submitting || departmentsLoading || !!departmentsError}
          >
            <option value="">{departmentsLoading ? 'Loading departments...' : 'Select department'}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </Select>
          {isInternalHiringMode ? (
            <p className="text-xs text-app-subtle">
              This budget will fund non-billable MRF requests for this department.
            </p>
          ) : null}
          {mergeErr('department') ? <p className="text-sm text-status-danger">{mergeErr('department')}</p> : null}
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id={`${formId}-period_start`}
          label="Period start"
          type="date"
          value={values.period_start}
          onChange={(e) => setField('period_start', e.target.value)}
          disabled={submitting}
          error={mergeErr('period_start')}
        />
        <Input
          id={`${formId}-period_end`}
          label="Period end (optional)"
          type="date"
          value={values.period_end}
          onChange={(e) => setField('period_end', e.target.value)}
          disabled={submitting}
          error={mergeErr('period_end')}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          id={`${formId}-amount`}
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={values.amount}
          onChange={(e) => setField('amount', e.target.value)}
          disabled={submitting}
          error={mergeErr('amount')}
        />
        <Input
          id={`${formId}-currency`}
          label="Currency"
          value={values.currency}
          onChange={(e) => setField('currency', e.target.value)}
          disabled={submitting}
          error={mergeErr('currency')}
        />
      </div>

      <Select
        id={`${formId}-status`}
        label="Status"
        value={values.status}
        onChange={(e) => setField('status', e.target.value)}
        disabled={submitting}
      >
        {BUDGET_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <div className="flex flex-col gap-1">
        <label htmlFor={`${formId}-notes`} className="text-sm font-medium text-app-secondary">
          Notes
        </label>
        <textarea
          id={`${formId}-notes`}
          rows={3}
          value={values.notes}
          onChange={(e) => setField('notes', e.target.value)}
          disabled={submitting}
          className="min-h-[80px] rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      <Select
        id={`${formId}-is_active`}
        label="Active"
        value={values.is_active}
        onChange={(e) => setField('is_active', e.target.value)}
        disabled={submitting}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </Select>

      <div className="flex justify-end">
        <Button type="submit" variant="primary" disabled={saveDisabled}>
          {submitting ? 'Saving…' : mode === 'create' ? 'Create budget' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
