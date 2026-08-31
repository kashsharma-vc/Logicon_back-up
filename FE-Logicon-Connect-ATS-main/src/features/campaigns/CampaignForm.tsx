import { useMemo, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import type { CampaignRow, LangCode } from '@/features/campaigns/types'

export type CampaignFormMode = 'create' | 'edit'

export interface CampaignFormValues {
  name: string
  title: string
  code: string
  site: string // '' or id string
  form_template: string // '' or template id string
  starts_at: string // datetime-local value or ''
  ends_at: string // datetime-local value or ''
  is_active: boolean
  allow_duplicates: boolean
  requires_otp: boolean
  shuffle_fields: boolean
  default_language: LangCode
  enabled_languages: LangCode[]
}

export interface SiteOption {
  id: number
  label: string
}

export interface FormTemplateOption {
  id: number
  label: string
}

const LANGS: { code: LangCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
]

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return ''
  // Convert ISO -> local yyyy-MM-ddTHH:mm, safest via Date.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function compareDatetimeLocal(a: string, b: string): number | null {
  if (!a || !b) return null
  const da = new Date(a)
  const db = new Date(b)
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return null
  return da.getTime() - db.getTime()
}

export function CampaignForm({
  formId,
  mode,
  initialCampaign,
  siteOptions,
  formTemplateOptions = [],
  formTemplateLookupError = null,
  lookupError,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  mode: CampaignFormMode
  initialCampaign?: CampaignRow | null
  siteOptions: SiteOption[]
  formTemplateOptions?: FormTemplateOption[]
  formTemplateLookupError?: string | null
  lookupError: string | null
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (values: CampaignFormValues) => void | Promise<void>
}) {
  const [values, setValues] = useState<CampaignFormValues>(() => ({
    name: initialCampaign?.name ?? '',
    title: initialCampaign?.title ?? '',
    code: initialCampaign?.code ?? '',
    site: initialCampaign?.site != null ? String(initialCampaign.site) : '',
    form_template: initialCampaign?.form_template != null ? String(initialCampaign.form_template) : '',
    starts_at: toDatetimeLocalValue(initialCampaign?.starts_at ?? null),
    ends_at: toDatetimeLocalValue(initialCampaign?.ends_at ?? null),
    is_active: initialCampaign?.is_active ?? true,
    allow_duplicates: initialCampaign?.allow_duplicates ?? true,
    requires_otp: initialCampaign?.requires_otp ?? false,
    shuffle_fields: initialCampaign?.shuffle_fields ?? true,
    default_language: (initialCampaign?.default_language ?? 'en') as LangCode,
    enabled_languages: (initialCampaign?.enabled_languages?.length
      ? (initialCampaign.enabled_languages as LangCode[])
      : ['en']) as LangCode[],
  }))

  const nameError = useMemo(() => (values.name.trim() ? null : 'Name is required.'), [values.name])
  const codeError = useMemo(() => (values.code.trim() ? null : 'Code is required.'), [values.code])
  const enabledLangError = useMemo(
    () => (values.enabled_languages.length ? null : 'Enabled languages cannot be empty.'),
    [values.enabled_languages.length],
  )
  const defaultLangError = useMemo(() => {
    return values.enabled_languages.includes(values.default_language)
      ? null
      : 'Default language must be included in enabled languages.'
  }, [values.default_language, values.enabled_languages])
  const endsBeforeStartsError = useMemo(() => {
    const diff = compareDatetimeLocal(values.ends_at, values.starts_at)
    if (diff == null) return null
    return diff < 0 ? 'End date/time cannot be before start date/time.' : null
  }, [values.ends_at, values.starts_at])

  const canSubmit =
    !submitting &&
    !nameError &&
    !codeError &&
    !enabledLangError &&
    !defaultLangError &&
    !endsBeforeStartsError &&
    (!lookupError || !values.site)

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
          id="campaign_name"
          label="Name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          error={nameError ?? undefined}
          disabled={submitting}
          required
        />
        <Input
          id="campaign_code"
          label="Code"
          value={values.code}
          onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
          error={codeError ?? undefined}
          disabled={submitting || mode === 'edit'}
          required
        />
      </div>

      <Input
        id="campaign_title"
        label="Title (optional)"
        value={values.title}
        onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        disabled={submitting}
      />

      <Select
        id="campaign_site"
        label="Site"
        value={values.site}
        onChange={(e) => setValues((v) => ({ ...v, site: e.target.value }))}
        disabled={submitting || !!lookupError}
      >
        <option value="">None</option>
        {siteOptions.map((s) => (
          <option key={s.id} value={String(s.id)}>
            {s.label}
          </option>
        ))}
      </Select>
      {lookupError ? <p className="text-xs text-status-warning">Site lookup failed: {lookupError}</p> : null}

      <Select
        id="campaign_form_template"
        label="Form template (optional)"
        value={values.form_template}
        onChange={(e) => setValues((v) => ({ ...v, form_template: e.target.value }))}
        disabled={submitting || !!formTemplateLookupError}
      >
        <option value="">None (use legacy per-campaign fields)</option>
        {formTemplateOptions.map((t) => (
          <option key={t.id} value={String(t.id)}>
            {t.label}
          </option>
        ))}
      </Select>
      {formTemplateLookupError ? (
        <p className="text-xs text-status-warning">Form template lookup failed: {formTemplateLookupError}</p>
      ) : (
        <p className="text-xs text-app-subtle">
          Assigning a template drives the public apply form for this campaign.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="campaign_starts_at"
          label="Starts at"
          type="datetime-local"
          value={values.starts_at}
          onChange={(e) => setValues((v) => ({ ...v, starts_at: e.target.value }))}
          disabled={submitting}
        />
        <Input
          id="campaign_ends_at"
          label="Ends at"
          type="datetime-local"
          value={values.ends_at}
          onChange={(e) => setValues((v) => ({ ...v, ends_at: e.target.value }))}
          error={endsBeforeStartsError ?? undefined}
          disabled={submitting}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="campaign_default_language"
          label="Default language"
          value={values.default_language}
          onChange={(e) => setValues((v) => ({ ...v, default_language: e.target.value as LangCode }))}
          error={defaultLangError ?? undefined}
          disabled={submitting}
        >
          {LANGS.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-app-secondary">Enabled languages</p>
          <div className="flex flex-wrap gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel">
            {LANGS.map((l) => {
              const checked = values.enabled_languages.includes(l.code)
              return (
                <label key={l.code} className="flex items-center gap-2 text-sm text-app-secondary">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? [...values.enabled_languages, l.code]
                        : values.enabled_languages.filter((x) => x !== l.code)
                      setValues((v) => ({ ...v, enabled_languages: next }))
                    }}
                    disabled={submitting}
                  />
                  {l.label}
                </label>
              )
            })}
          </div>
          {enabledLangError ? <p className="text-sm text-status-danger">{enabledLangError}</p> : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
            disabled={submitting}
          />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={values.allow_duplicates}
            onChange={(e) => setValues((v) => ({ ...v, allow_duplicates: e.target.checked }))}
            disabled={submitting}
          />
          Allow duplicates
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={values.requires_otp}
            onChange={(e) => setValues((v) => ({ ...v, requires_otp: e.target.checked }))}
            disabled={submitting}
          />
          Requires OTP
        </label>
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={values.shuffle_fields}
            onChange={(e) => setValues((v) => ({ ...v, shuffle_fields: e.target.checked }))}
            disabled={submitting}
          />
          Shuffle fields
        </label>
      </div>

      <button type="submit" hidden />
    </form>
  )
}


