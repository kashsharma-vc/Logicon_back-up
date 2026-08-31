import { useEffect, useState, type FormEvent } from 'react'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import type {
  ClientOnboardingRow,
  ClientOnboardingType,
  ClientOnboardingWriteInput,
} from '@/features/clientOnboarding/types'
import type { BudgetPlanRow } from '@/features/budgets/types'
import { formatBudgetAmount } from '@/features/budgets/types'
import { loadBillableBudgetOptionsForClient } from '@/features/budgets/budgetLookup'

export interface ClientOption {
  id: number
  label: string
}

export interface ClientOnboardingFormValues {
  client: string
  onboarding_type: ClientOnboardingType
  expected_site_count: string
  summary: string
  operations_notes: string
  hr_notes: string
  finance_notes: string
  budget_plan: string
  proposed_client_name: string
  proposed_client_code: string
  proposed_contact_name: string
  proposed_contact_email: string
  proposed_contact_phone: string
  proposed_industry: string
  proposed_billing_address: string
  proposed_gst_number: string
}

const ONBOARDING_TYPES: { value: ClientOnboardingType; label: string }[] = [
  { value: 'new_client', label: 'New client' },
  { value: 'new_site_expansion', label: 'New site expansion' },
]

function TextAreaField({
  id,
  label,
  value,
  onChange,
  disabled,
  rows,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  rows: number
  placeholder?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-app-secondary">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'min-h-[4.5rem] w-full resize-y rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      />
    </div>
  )
}

function initialValues(mode: 'create' | 'edit', initial: ClientOnboardingRow | null): ClientOnboardingFormValues {
  if (mode === 'edit' && initial) {
    return {
      client: initial.client != null ? String(initial.client) : '',
      onboarding_type: initial.onboarding_type,
      expected_site_count: initial.expected_site_count != null ? String(initial.expected_site_count) : '',
      summary: initial.summary ?? '',
      operations_notes: initial.operations_notes ?? '',
      hr_notes: initial.hr_notes ?? '',
      finance_notes: initial.finance_notes ?? '',
      budget_plan: initial.budget_plan != null ? String(initial.budget_plan) : '',
      proposed_client_name: initial.proposed_client_name ?? '',
      proposed_client_code: initial.proposed_client_code ?? '',
      proposed_contact_name: initial.proposed_contact_name ?? '',
      proposed_contact_email: initial.proposed_contact_email ?? '',
      proposed_contact_phone: initial.proposed_contact_phone ?? '',
      proposed_industry: initial.proposed_industry ?? '',
      proposed_billing_address: initial.proposed_billing_address ?? '',
      proposed_gst_number: initial.proposed_gst_number ?? '',
    }
  }
  return {
    client: '',
    onboarding_type: 'new_client',
    expected_site_count: '',
    summary: '',
    operations_notes: '',
    hr_notes: '',
    finance_notes: '',
    budget_plan: '',
    proposed_client_name: '',
    proposed_client_code: '',
    proposed_contact_name: '',
    proposed_contact_email: '',
    proposed_contact_phone: '',
    proposed_industry: '',
    proposed_billing_address: '',
    proposed_gst_number: '',
  }
}

export function ClientOnboardingForm({
  formId,
  mode,
  initialRow,
  clientOptions,
  clientsLookupError,
  clientsLoading,
  canReadBudget = false,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  mode: 'create' | 'edit'
  initialRow: ClientOnboardingRow | null
  clientOptions: ClientOption[]
  clientsLookupError?: string | null
  clientsLoading?: boolean
  canReadBudget?: boolean
  submitting: boolean
  errorMessage: string | null
  onSubmit: (values: ClientOnboardingFormValues) => void
}) {
  const [values, setValues] = useState(() => initialValues(mode, initialRow))

  useEffect(() => {
    setValues(initialValues(mode, initialRow))
  }, [mode, initialRow?.id, initialRow?.updated_at])

  const [budgetRows, setBudgetRows] = useState<BudgetPlanRow[]>([])
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [budgetLookupError, setBudgetLookupError] = useState<string | null>(null)

  const isNewClient = values.onboarding_type === 'new_client'
  const isExpansion = values.onboarding_type === 'new_site_expansion'

  useEffect(() => {
    if (!canReadBudget || !isExpansion) {
      setBudgetRows([])
      setBudgetLookupError(null)
      return
    }
    const cid = Number(values.client)
    if (!Number.isFinite(cid) || cid < 1) {
      setBudgetRows([])
      setBudgetLookupError(null)
      return
    }
    let cancelled = false
    void (async () => {
      setBudgetLoading(true)
      setBudgetLookupError(null)
      const res = await loadBillableBudgetOptionsForClient(cid)
      if (cancelled) return
      if (res.ok) {
        setBudgetRows(res.items)
      } else {
        setBudgetRows([])
        setBudgetLookupError(res.error)
      }
      setBudgetLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [values.client, canReadBudget, isExpansion])

  const lookupBlocksSubmit = !!clientsLookupError && isExpansion
  const [localError, setLocalError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLocalError(null)
    if (isExpansion) {
      if (!values.client.trim()) {
        setLocalError('Select an existing client for a new site expansion request.')
        return
      }
    }
    if (isNewClient) {
      if (!values.proposed_client_name.trim()) {
        setLocalError('Client name is required for a new client request.')
        return
      }
      if (!values.proposed_client_code.trim()) {
        setLocalError('Client code is required for a new client request.')
        return
      }
    }
    if (!values.onboarding_type.trim()) {
      setLocalError('Mobilisation type is required.')
      return
    }
    const esc = values.expected_site_count.trim()
    if (esc) {
      const n = Number(esc)
      if (!Number.isFinite(n) || n < 1) {
        setLocalError('Expected site count must be a positive number when provided.')
        return
      }
    }
    onSubmit(values)
  }

  const disabled = submitting || lookupBlocksSubmit || (!!clientsLoading && isExpansion)

  return (
    <form id={formId} className="space-y-4" onSubmit={handleSubmit}>
      {clientsLookupError && isExpansion ? <ErrorState message={clientsLookupError} /> : null}
      {errorMessage ? <ErrorState message={errorMessage} /> : null}
      {localError ? <ErrorState message={localError} /> : null}

      <Select
        id="co_onboarding_type"
        label="Mobilisation type"
        value={values.onboarding_type}
        onChange={(e) => {
          const next = e.target.value as ClientOnboardingType
          setValues((v) => ({
            ...v,
            onboarding_type: next,
            client: next === 'new_client' ? '' : v.client,
            budget_plan: next === 'new_client' ? '' : v.budget_plan,
          }))
        }}
        disabled={disabled}
        required
      >
        {ONBOARDING_TYPES.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>

      {isExpansion ? (
        <Select
          id="co_client"
          label="Client"
          value={values.client}
          onChange={(e) =>
            setValues((v) => ({
              ...v,
              client: e.target.value,
              budget_plan: '',
            }))
          }
          disabled={disabled || !!clientsLookupError}
          required
        >
          <option value="">{clientsLoading ? 'Loading clients...' : 'Select client'}</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </Select>
      ) : (
        <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm text-app-secondary">
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Existing client</p>
          <p className="mt-1">Not applicable for new client mobilisation. Proposed client details are captured below.</p>
        </div>
      )}

      {isNewClient ? (
        <div className="space-y-3 rounded-panel border border-app-border bg-app-muted p-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Proposed client</p>
          <Input
            id="co_pc_name"
            label="Client name"
            value={values.proposed_client_name}
            onChange={(e) => setValues((v) => ({ ...v, proposed_client_name: e.target.value }))}
            disabled={disabled}
            required
          />
          <Input
            id="co_pc_code"
            label="Client code"
            value={values.proposed_client_code}
            onChange={(e) => setValues((v) => ({ ...v, proposed_client_code: e.target.value }))}
            disabled={disabled}
            required
          />
          <Input
            id="co_pc_contact"
            label="Contact name"
            value={values.proposed_contact_name}
            onChange={(e) => setValues((v) => ({ ...v, proposed_contact_name: e.target.value }))}
            disabled={disabled}
          />
          <Input
            id="co_pc_email"
            label="Contact email"
            type="email"
            value={values.proposed_contact_email}
            onChange={(e) => setValues((v) => ({ ...v, proposed_contact_email: e.target.value }))}
            disabled={disabled}
          />
          <Input
            id="co_pc_phone"
            label="Contact phone"
            value={values.proposed_contact_phone}
            onChange={(e) => setValues((v) => ({ ...v, proposed_contact_phone: e.target.value }))}
            disabled={disabled}
          />
          <Input
            id="co_pc_industry"
            label="Industry"
            value={values.proposed_industry}
            onChange={(e) => setValues((v) => ({ ...v, proposed_industry: e.target.value }))}
            disabled={disabled}
          />
          <TextAreaField
            id="co_pc_addr"
            label="Billing address"
            rows={3}
            value={values.proposed_billing_address}
            onChange={(proposed_billing_address) => setValues((v) => ({ ...v, proposed_billing_address }))}
            disabled={disabled}
          />
          <Input
            id="co_pc_gst"
            label="GST number"
            value={values.proposed_gst_number}
            onChange={(e) => setValues((v) => ({ ...v, proposed_gst_number: e.target.value }))}
            disabled={disabled}
          />
        </div>
      ) : null}

      {!canReadBudget && initialRow?.budget_plan != null && (initialRow.budget_plan_name || initialRow.budget_plan_code) ? (
        <div className="rounded-panel border border-app-border bg-app-muted p-3 text-sm text-app-secondary">
          <p className="text-xs font-semibold uppercase tracking-widest text-app-subtle">Linked budget</p>
          <p className="mt-1 font-medium text-app-text">
            {initialRow.budget_plan_name ?? 'Budget'}{' '}
            {initialRow.budget_plan_code ? <span className="font-mono text-xs">({initialRow.budget_plan_code})</span> : null}
          </p>
          {initialRow.budget_plan_amount != null ? (
            <p className="mt-1 text-xs">
              {formatBudgetAmount(String(initialRow.budget_plan_amount), initialRow.budget_plan_currency ?? 'INR')} —{' '}
              {initialRow.budget_plan_status ?? '—'}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-app-subtle">Budget selection requires budget.read.</p>
        </div>
      ) : null}

      {canReadBudget && isExpansion ? (
        <>
          {budgetLookupError ? (
            <ErrorState
              message={`Budget lookup failed. ${budgetLookupError} You can still save without a budget plan.`}
            />
          ) : null}
          <Select
            id="co_budget_plan"
            label="Budget plan (optional)"
            value={values.budget_plan}
            onChange={(e) => setValues((v) => ({ ...v, budget_plan: e.target.value }))}
            disabled={disabled || budgetLoading || !!budgetLookupError || !values.client.trim()}
          >
            <option value="">{budgetLoading ? 'Loading budgets…' : 'No budget selected'}</option>
            {budgetRows.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name} ({b.code}) — {b.amount} {b.currency} — {b.status}
              </option>
            ))}
          </Select>
        </>
      ) : null}

      {canReadBudget && isNewClient ? (
        <p className="text-xs text-app-subtle">
          Budget plans are linked after a real client exists. Skip budget for new client drafts, or add one after
          finalization if your process allows it.
        </p>
      ) : null}

      <Input
        id="co_expected_sites"
        label="Expected site count (optional)"
        type="number"
        min={1}
        step={1}
        value={values.expected_site_count}
        onChange={(e) => setValues((v) => ({ ...v, expected_site_count: e.target.value }))}
        disabled={disabled}
        placeholder="e.g. 3"
      />

      <TextAreaField
        id="co_summary"
        label="Summary"
        rows={4}
        value={values.summary}
        onChange={(summary) => setValues((v) => ({ ...v, summary }))}
        disabled={disabled}
      />

      <TextAreaField
        id="co_ops_notes"
        label="Operations notes"
        rows={3}
        value={values.operations_notes}
        onChange={(operations_notes) => setValues((v) => ({ ...v, operations_notes }))}
        disabled={disabled}
      />

      <TextAreaField
        id="co_hr_notes"
        label="HR notes"
        rows={3}
        value={values.hr_notes}
        onChange={(hr_notes) => setValues((v) => ({ ...v, hr_notes }))}
        disabled={disabled}
      />

      <TextAreaField
        id="co_finance_notes"
        label="Finance notes"
        rows={3}
        value={values.finance_notes}
        onChange={(finance_notes) => setValues((v) => ({ ...v, finance_notes }))}
        disabled={disabled}
      />
    </form>
  )
}

export function clientOnboardingValuesToWritePayload(values: ClientOnboardingFormValues): ClientOnboardingWriteInput {
  const esc = values.expected_site_count.trim()
  const bp = values.budget_plan.trim()
  const base: ClientOnboardingWriteInput = {
    onboarding_type: values.onboarding_type,
    expected_site_count: esc ? Number(esc) : null,
    summary: values.summary.trim() || undefined,
    operations_notes: values.operations_notes.trim() || undefined,
    hr_notes: values.hr_notes.trim() || undefined,
    finance_notes: values.finance_notes.trim() || undefined,
  }

  if (values.onboarding_type === 'new_client') {
    return {
      ...base,
      client: null,
      budget_plan: null,
      proposed_client_name: values.proposed_client_name.trim(),
      proposed_client_code: values.proposed_client_code.trim(),
      proposed_contact_name: values.proposed_contact_name.trim() || undefined,
      proposed_contact_email: values.proposed_contact_email.trim() || undefined,
      proposed_contact_phone: values.proposed_contact_phone.trim() || undefined,
      proposed_industry: values.proposed_industry.trim() || undefined,
      proposed_billing_address: values.proposed_billing_address.trim() || undefined,
      proposed_gst_number: values.proposed_gst_number.trim() || undefined,
    }
  }

  return {
    ...base,
    client: Number(values.client),
    budget_plan: bp ? Number(bp) : null,
  }
}
