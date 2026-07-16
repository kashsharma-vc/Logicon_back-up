import { useMemo, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'

export type SiteFormMode = 'create' | 'edit'

export interface SiteFormValues {
  client: string // '' or id string
  name: string
  code: string
  address: string
  /** LocationArea PK or '' for none */
  location_area: string
  city: string
  state: string
  pincode: string
  shift_type: string
  contact_person: string
  contact_phone: string
  contact_email: string
  is_active: boolean
}

export interface ClientOption {
  id: number
  label: string
}

export interface LocationAreaOption {
  id: number
  label: string
}

export function SiteForm({
  formId,
  mode,
  initialValues,
  clientOptions,
  locationOptions,
  lookupError,
  locationLookupError,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  mode: SiteFormMode
  initialValues?: Partial<SiteFormValues>
  clientOptions: ClientOption[]
  locationOptions: LocationAreaOption[]
  /** Client list failed — blocks save. */
  lookupError: string | null
  /** Location master list failed — warning only; location dropdown disabled. */
  locationLookupError: string | null
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (values: SiteFormValues) => void | Promise<void>
}) {
  const [values, setValues] = useState<SiteFormValues>(() => ({
    client: initialValues?.client ?? '',
    name: initialValues?.name ?? '',
    code: initialValues?.code ?? '',
    address: initialValues?.address ?? '',
    location_area: initialValues?.location_area ?? '',
    city: initialValues?.city ?? '',
    state: initialValues?.state ?? '',
    pincode: initialValues?.pincode ?? '',
    shift_type: initialValues?.shift_type ?? '',
    contact_person: initialValues?.contact_person ?? '',
    contact_phone: initialValues?.contact_phone ?? '',
    contact_email: initialValues?.contact_email ?? '',
    is_active: initialValues?.is_active ?? true,
  }))

  const nameError = useMemo(() => (values.name.trim() ? null : 'Site name is required.'), [values.name])
  const codeError = useMemo(() => (values.code.trim() ? null : 'Site code is required.'), [values.code])
  const clientError = useMemo(() => (values.client ? null : 'Client is required.'), [values.client])
  const emailError = useMemo(() => {
    if (!values.contact_email.trim()) return null
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contact_email.trim())
    return ok ? null : 'Enter a valid email address.'
  }, [values.contact_email])

  const canSubmit =
    !submitting && !nameError && !codeError && !clientError && !emailError && !lookupError

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit(values)
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      {lookupError ? (
        <ErrorState message={`Client lookup failed. Create/Edit is disabled. ${lookupError}`} />
      ) : null}

      <Select
        id="site_client"
        label="Client"
        value={values.client}
        onChange={(e) => setValues((v) => ({ ...v, client: e.target.value }))}
        disabled={submitting || !!lookupError || mode === 'edit'}
        error={clientError ?? undefined}
      >
        <option value="">Select client</option>
        {clientOptions.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.label}
          </option>
        ))}
      </Select>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="site_name"
          label="Site name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          error={nameError ?? undefined}
          disabled={submitting}
          required
        />
        <Input
          id="site_code"
          label="Site code"
          value={values.code}
          onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
          error={codeError ?? undefined}
          disabled={submitting || mode === 'edit'}
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="site_address" className="text-sm font-medium text-app-secondary">
          Address
        </label>
        <textarea
          id="site_address"
          value={values.address}
          onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
          className="min-h-20 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          disabled={submitting}
        />
      </div>

      {locationLookupError ? (
        <ErrorState message={`${locationLookupError} You can still save the site using city and state below.`} />
      ) : null}

      <div className="space-y-1">
        <Select
          id="site_location_area"
          label="Location master (optional)"
          value={values.location_area}
          onChange={(e) => setValues((v) => ({ ...v, location_area: e.target.value }))}
          disabled={submitting || !!locationLookupError}
        >
          <option value="">None</option>
          {locationOptions.map((o) => (
            <option key={o.id} value={String(o.id)}>
              {o.label}
            </option>
          ))}
        </Select>
        <p className="text-xs text-app-subtle">
          Select from location master for wage lookup. If not available, enter city/state manually.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          id="site_city"
          label="City"
          value={values.city}
          onChange={(e) => setValues((v) => ({ ...v, city: e.target.value }))}
          disabled={submitting}
        />
        <Input
          id="site_state"
          label="State"
          value={values.state}
          onChange={(e) => setValues((v) => ({ ...v, state: e.target.value }))}
          disabled={submitting}
        />
        <Input
          id="site_pincode"
          label="Pincode"
          value={values.pincode}
          onChange={(e) => setValues((v) => ({ ...v, pincode: e.target.value }))}
          disabled={submitting}
        />
      </div>

      <Select
        id="shift_type"
        label="Shift type"
        value={values.shift_type}
        onChange={(e) => setValues((v) => ({ ...v, shift_type: e.target.value }))}
        disabled={submitting}
      >
        <option value="">(not set)</option>
        <option value="day">Day</option>
        <option value="night">Night</option>
        <option value="rotational">Rotational</option>
        <option value="custom">Custom</option>
      </Select>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="contact_person"
          label="Contact person"
          value={values.contact_person}
          onChange={(e) => setValues((v) => ({ ...v, contact_person: e.target.value }))}
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



