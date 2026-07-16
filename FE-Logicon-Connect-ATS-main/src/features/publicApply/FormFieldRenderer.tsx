import { cn } from '@/lib/cn'
import { t } from '@/features/publicApply/i18n'
import { FileUploadField } from '@/features/publicApply/FileUploadField'
import type { LangCode, PublicFormField } from '@/features/publicApply/types'

function fieldLabel(field: PublicFormField, lang: LangCode): string {
  const tr = field.translations?.[lang]
  return (lang !== 'en' && tr?.label) ? tr.label : field.label
}

function fieldHelp(field: PublicFormField, lang: LangCode): string | undefined {
  const tr = field.translations?.[lang]
  return (lang !== 'en' && tr?.help_text) ? tr.help_text : (field.help_text || undefined)
}

function fieldOptionPairs(field: PublicFormField, lang: LangCode): { value: string; label: string }[] {
  const baseOptions = field.options ?? []
  const tr = field.translations?.[lang]
  const translatedOptions = lang !== 'en' ? tr?.options ?? [] : []
  return baseOptions.map((option, index) => ({
    value: option,
    label: translatedOptions[index] || option,
  }))
}

export function FormFieldRenderer({
  field,
  lang,
  value,
  file,
  errorKey,
  disabled,
  onChangeValue,
  onChangeFile,
}: {
  field: PublicFormField
  lang: LangCode
  value: unknown
  file: File | null
  errorKey?: string | null
  disabled?: boolean
  onChangeValue: (next: unknown) => void
  onChangeFile: (file: File | null, errorKey: string | null) => void
}) {
  const label = fieldLabel(field, lang)
  const help = fieldHelp(field, lang)
  const requiredMark = field.is_required ? <span className="text-status-danger">*</span> : null

  if (field.field_type === 'file') {
    return (
      <div>
        <FileUploadField
          id={`field_${field.id}`}
          label={label}
          lang={lang}
          file={file}
          required={field.is_required}
          errorKey={errorKey ?? null}
          disabled={disabled}
          onChange={onChangeFile}
        />
        {help ? <p className="mt-1 text-xs text-app-subtle">{help}</p> : null}
      </div>
    )
  }

  if (field.field_type === 'textarea') {
    return (
      <div className="space-y-1">
        <label htmlFor={`field_${field.id}`} className="text-sm font-medium text-app-secondary">
          {label} {requiredMark}
        </label>
        <textarea
          id={`field_${field.id}`}
          value={typeof value === 'string' ? value : String(value ?? '')}
          onChange={(e) => onChangeValue(e.target.value)}
          disabled={disabled}
          className={cn(
            'min-h-24 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
            errorKey && 'border-status-danger',
          )}
        />
        {help ? <p className="text-xs text-app-subtle">{help}</p> : null}
        {errorKey ? (
          <p className="text-sm text-status-danger" role="alert">
            {t(lang, errorKey as Parameters<typeof t>[1])}
          </p>
        ) : null}
      </div>
    )
  }

  if (field.field_type === 'boolean') {
    return (
      <div className="space-y-1">
        <label className="flex items-center gap-2 text-sm text-app-secondary">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChangeValue(e.target.checked)}
            disabled={disabled}
          />
          {label} {requiredMark}
        </label>
        {help ? <p className="text-xs text-app-subtle">{help}</p> : null}
        {errorKey ? (
          <p className="text-sm text-status-danger" role="alert">
            {t(lang, errorKey as Parameters<typeof t>[1])}
          </p>
        ) : null}
      </div>
    )
  }

  if (field.field_type === 'multi_select') {
    const opts = fieldOptionPairs(field, lang)
    const current = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-app-secondary">
          {label} {requiredMark}
        </p>
        <div className={cn('flex flex-wrap gap-3 rounded-panel border border-app-border bg-app-surface p-3 shadow-panel', errorKey && 'border-status-danger')}>
          {opts.map((opt) => {
            const checked = current.includes(opt.value)
            return (
              <label key={opt.value} className="flex items-center gap-2 text-sm text-app-secondary">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked ? [...current, opt.value] : current.filter((x) => x !== opt.value)
                    onChangeValue(next)
                  }}
                  disabled={disabled}
                />
                {opt.label}
              </label>
            )
          })}
        </div>
        {help ? <p className="text-xs text-app-subtle">{help}</p> : null}
        {errorKey ? (
          <p className="text-sm text-status-danger" role="alert">
            {t(lang, errorKey as Parameters<typeof t>[1])}
          </p>
        ) : null}
      </div>
    )
  }

  if (field.field_type === 'select') {
    const opts = fieldOptionPairs(field, lang)
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`field_${field.id}`} className="text-sm font-medium text-app-secondary">
          {label} {requiredMark}
        </label>
        <select
          id={`field_${field.id}`}
          value={typeof value === 'string' ? value : String(value ?? '')}
          onChange={(e) => onChangeValue(e.target.value)}
          disabled={disabled}
          className={cn(
            'min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
            errorKey && 'border-status-danger',
          )}
        >
          <option value="">{t(lang, 'selectOption')} {label}...</option>
          {opts.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {help ? <p className="text-xs text-app-subtle">{help}</p> : null}
        {errorKey ? (
          <p className="text-sm text-status-danger" role="alert">
            {t(lang, errorKey as Parameters<typeof t>[1])}
          </p>
        ) : null}
      </div>
    )
  }

  const inputType =
    field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : field.field_type === 'email' ? 'email' : 'text'

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`field_${field.id}`} className="text-sm font-medium text-app-secondary">
        {label} {requiredMark}
      </label>
      <input
        id={`field_${field.id}`}
        type={inputType}
        value={typeof value === 'string' || typeof value === 'number' ? String(value ?? '') : ''}
        onChange={(e) => onChangeValue(e.target.value)}
        placeholder={field.placeholder || undefined}
        disabled={disabled}
        className={cn(
          'min-h-10 rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
          errorKey && 'border-status-danger',
        )}
      />
      {help ? <p className="text-xs text-app-subtle">{help}</p> : null}
      {errorKey ? (
        <p className="text-sm text-status-danger" role="alert">
          {t(lang, errorKey as Parameters<typeof t>[1])}
        </p>
      ) : null}
    </div>
  )
}


