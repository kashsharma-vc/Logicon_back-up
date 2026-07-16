import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronDown, ChevronRight, Settings } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { updateFormTemplate } from '@/api/formBuilder'
import { parseApiError } from '@/lib/apiError'
import { validateSlug } from '@/features/formBuilder/slug'
import type { FormTemplateRow } from '@/features/formBuilder/types'

export function TemplateBasicsPanel({
  template,
  canEdit,
  onSaved,
}: {
  template: FormTemplateRow
  canEdit: boolean
  onSaved: (next: FormTemplateRow) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [values, setValues] = useState({
    name: template.name,
    code: template.code,
    description: template.description ?? '',
    is_active: template.is_active,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setValues({
      name: template.name,
      code: template.code,
      description: template.description ?? '',
      is_active: template.is_active,
    })
    setError(null)
    setSuccess(null)
  }, [template])

  const nameError = useMemo(() => (values.name.trim() ? null : 'Name is required.'), [values.name])
  const codeError = useMemo(() => validateSlug(values.code), [values.code])
  const dirty =
    values.name !== template.name ||
    values.code !== template.code ||
    (values.description ?? '') !== (template.description ?? '') ||
    values.is_active !== template.is_active
  const canSubmit = canEdit && !submitting && !nameError && !codeError && dirty

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const next = await updateFormTemplate(template.id, {
        name: values.name.trim(),
        code: values.code.trim(),
        description: values.description.trim() || undefined,
        is_active: values.is_active,
      })
      onSaved(next)
      setSuccess('Saved.')
    } catch (e: unknown) {
      setError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-lg border border-app-border bg-app-surface shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-app-muted/50"
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-app-subtle" aria-hidden />
          <span className="text-sm font-medium text-app-text">Edit template settings</span>
          {success ? <span className="text-xs text-status-success">{success}</span> : null}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-app-subtle" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 text-app-subtle" aria-hidden />
        )}
      </button>

      {expanded ? (
        <form onSubmit={handleSubmit} className="border-t border-app-border px-4 py-3">
          {error ? <ErrorState message={error} /> : null}

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-1">
              <Input
                id="tpl_name"
                label="Name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                error={nameError ?? undefined}
                disabled={!canEdit || submitting}
                required
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                id="tpl_code"
                label="Code"
                value={values.code}
                onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
                error={codeError ?? undefined}
                disabled={!canEdit || submitting}
                required
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                id="tpl_description"
                label="Description"
                value={values.description}
                onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
                disabled={!canEdit || submitting}
              />
            </div>
            <div className="flex items-end gap-3 sm:col-span-1">
              <label className="flex items-center gap-2 pb-2 text-sm text-app-secondary">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
                  disabled={!canEdit || submitting}
                />
                Active
              </label>
              <Button type="submit" disabled={!canSubmit} className="ml-auto">
                {submitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </form>
      ) : null}
    </div>
  )
}
