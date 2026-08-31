import { useMemo, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'

export type ClientFormMode = 'create' | 'edit'

export interface ClientFormValues {
  name: string
  code: string
  contact_name: string
  contact_email: string
  contact_phone: string
  industry: string
  billing_address: string
  gst_number: string
  owner_sales_user: string // '' or id string
  is_active: boolean
}

export interface InternalUserOption {
  id: number
  label: string
}

export function ClientForm({
  formId,
  mode,
  initialValues,
  ownerOptions,
  lookupError,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  mode: ClientFormMode
  initialValues?: Partial<ClientFormValues>
  ownerOptions: InternalUserOption[]
  lookupError: string | null
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (values: ClientFormValues) => void | Promise<void>
}) {
  const [values, setValues] = useState<ClientFormValues>(() => ({
    name: initialValues?.name ?? '',
    code: initialValues?.code ?? '',
    contact_name: initialValues?.contact_name ?? '',
    contact_email: initialValues?.contact_email ?? '',
    contact_phone: initialValues?.contact_phone ?? '',
    industry: initialValues?.industry ?? '',
    billing_address: initialValues?.billing_address ?? '',
    gst_number: initialValues?.gst_number ?? '',
    owner_sales_user: initialValues?.owner_sales_user ?? '',
    is_active: initialValues?.is_active ?? true,
  }))

  const nameError = useMemo(() => (values.name.trim() ? null : 'Client name is required.'), [values.name])
  const codeError = useMemo(() => (values.code.trim() ? null : 'Client code is required.'), [values.code])
  const emailError = useMemo(() => {
    if (!values.contact_email.trim()) return null
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email.trim())
    return ok ? null : 'Enter a valid email address.'
  }, [values.contact_email])

  const canSubmit = !submitting && !nameError && !codeError && !emailError && (!lookupError || !values.owner_sales_user)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit(values)
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="client_name"
          label="Client name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          error={nameError ?? undefined}
          disabled={submitting}
          required
        />
        <Input
          id="client_code"
          label="Client code"
          value={values.code}
          onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
          error={codeError ?? undefined}
          disabled={submitting || mode === 'edit'}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="contact_name"
          label="Contact person"
          value={values.contact_name}
          onChange={(e) => setValues((v) => ({ ...v, contact_name: e.target.value }))}
          disabled={submitting}
        />
        <Input
          id="contact_phone"
          label="Contact phone"
          value={values.contact_phone}
          onChange={(e) => setValues((v) => ({ ...v, contact_phone: e.target.value }))}
          disabled={submitting}
        />
      </div>

      <Input
        id="contact_email"
        label="Contact email"
        value={values.contact_email}
        onChange={(e) => setValues((v) => ({ ...v, contact_email: e.target.value }))}
        error={emailError ?? undefined}
        disabled={submitting}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="industry"
          label="Industry"
          value={values.industry}
          onChange={(e) => setValues((v) => ({ ...v, industry: e.target.value }))}
          disabled={submitting}
        />
        <Input
          id="gst_number"
          label="GST number"
          value={values.gst_number}
          onChange={(e) => setValues((v) => ({ ...v, gst_number: e.target.value }))}
          disabled={submitting}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="billing_address" className="text-sm font-medium text-app-secondary">
          Billing address
        </label>
        <textarea
          id="billing_address"
          value={values.billing_address}
          onChange={(e) => setValues((v) => ({ ...v, billing_address: e.target.value }))}
          className="min-h-24 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          disabled={submitting}
        />
      </div>

      <Select
        id="owner_sales_user"
        label="Owner (sales user)"
        value={values.owner_sales_user}
        onChange={(e) => setValues((v) => ({ ...v, owner_sales_user: e.target.value }))}
        disabled={submitting || !!lookupError}
      >
        <option value="">None</option>
        {ownerOptions.map((o) => (
          <option key={o.id} value={String(o.id)}>
            {o.label}
          </option>
        ))}
      </Select>

      {lookupError ? (
        <p className="text-xs text-status-warning">
          Owner lookup failed. Owner selection is disabled. ({lookupError})
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-app-secondary">
        <input
          type="checkbox"
          checked={values.is_active}
          onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
          disabled={submitting}
        />
        Active
      </label>

      <button type="submit" hidden />
    </form>
  )
}



