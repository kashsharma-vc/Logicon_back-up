import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { ErrorState } from '@/components/ui/ErrorState'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { createTemplateField, updateTemplateField } from '@/api/formBuilder'
import { parseApiError } from '@/lib/apiError'
import { FieldOptionsEditor } from '@/features/formBuilder/FieldOptionsEditor'
import { suggestCode, validateSlug } from '@/features/formBuilder/slug'
import {
  FIELD_TYPE_LABEL,
  NUMERIC_TYPES,
  OPTION_TYPES,
  TEXTUAL_TYPES,
  type FieldType,
  type FormSectionRow,
  type FormTemplateFieldRow,
  type FormTemplateFieldWriteInput,
} from '@/features/formBuilder/types'

type FieldDrawerMode = 'create' | 'edit'

interface JobRoleLookup {
  id: number
  name: string
  code: string
}

interface FieldValues {
  section: string
  role: string
  label: string
  field_key: string
  field_type: FieldType
  placeholder: string
  help_text: string
  is_required: boolean
  is_active: boolean
  sort_order: string
  min_length: string
  max_length: string
  min_value: string
  max_value: string
  options: string[]
}

function initial(
  initialField: FormTemplateFieldRow | null,
  defaultSection: number | null,
): FieldValues {
  return {
    section:
      initialField?.section != null
        ? String(initialField.section)
        : defaultSection != null
          ? String(defaultSection)
          : '',
    role: initialField?.role != null ? String(initialField.role) : '',
    label: initialField?.label ?? '',
    field_key: initialField?.field_key ?? '',
    field_type: (initialField?.field_type ?? 'text') as FieldType,
    placeholder: initialField?.placeholder ?? '',
    help_text: initialField?.help_text ?? '',
    is_required: initialField?.is_required ?? false,
    is_active: initialField?.is_active ?? true,
    sort_order: String(initialField?.sort_order ?? 0),
    min_length: initialField?.min_length != null ? String(initialField.min_length) : '',
    max_length: initialField?.max_length != null ? String(initialField.max_length) : '',
    min_value: initialField?.min_value != null ? String(initialField.min_value) : '',
    max_value: initialField?.max_value != null ? String(initialField.max_value) : '',
    options: Array.isArray(initialField?.options) ? (initialField!.options as string[]) : [],
  }
}

/** Subtle section divider with label for the field drawer. */
function DrawerGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-app-subtle">
          {label}
        </p>
        <div className="flex-1 border-t border-app-border" />
      </div>
      {children}
    </div>
  )
}

export function TemplateFieldDrawer({
  open,
  mode,
  templateId,
  initialField,
  defaultSection,
  sections,
  jobRoles,
  jobRolesError,
  onClose,
  onSaved,
}: {
  open: boolean
  mode: FieldDrawerMode
  templateId: number
  initialField: FormTemplateFieldRow | null
  defaultSection: number | null
  sections: FormSectionRow[]
  jobRoles: JobRoleLookup[]
  jobRolesError: string | null
  onClose: () => void
  onSaved: () => void
}) {
  const [values, setValues] = useState<FieldValues>(() => initial(initialField, defaultSection))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [keyTouched, setKeyTouched] = useState(false)

  useEffect(() => {
    if (open) {
      setValues(initial(initialField, defaultSection))
      setSubmitting(false)
      setError(null)
      setKeyTouched(Boolean(initialField?.field_key))
    }
  }, [open, initialField, defaultSection])

  const sectionError = useMemo(
    () => (values.section ? null : 'Section is required.'),
    [values.section],
  )
  const labelError = useMemo(
    () => (values.label.trim() ? null : 'Label is required.'),
    [values.label],
  )
  const keyError = useMemo(() => validateSlug(values.field_key), [values.field_key])
  const optionsError = useMemo(() => {
    if (!OPTION_TYPES.includes(values.field_type)) return null
    const clean = values.options.map((o) => o.trim()).filter(Boolean)
    if (clean.length === 0) return 'Add at least one option.'
    if (new Set(clean).size !== clean.length) return 'Options must be unique.'
    return null
  }, [values.field_type, values.options])

  const lengthError = useMemo(() => {
    if (!TEXTUAL_TYPES.includes(values.field_type)) return null
    const mn = values.min_length === '' ? null : Number(values.min_length)
    const mx = values.max_length === '' ? null : Number(values.max_length)
    if (mn != null && !Number.isFinite(mn)) return 'Min length must be numeric.'
    if (mx != null && !Number.isFinite(mx)) return 'Max length must be numeric.'
    if (mn != null && mn < 0) return 'Min length must be ≥ 0.'
    if (mx != null && mx < 0) return 'Max length must be ≥ 0.'
    if (mn != null && mx != null && mn > mx) return 'Min length must be ≤ max length.'
    return null
  }, [values.field_type, values.min_length, values.max_length])

  const valueError = useMemo(() => {
    if (!NUMERIC_TYPES.includes(values.field_type)) return null
    const mn = values.min_value === '' ? null : Number(values.min_value)
    const mx = values.max_value === '' ? null : Number(values.max_value)
    if (mn != null && !Number.isFinite(mn)) return 'Min value must be numeric.'
    if (mx != null && !Number.isFinite(mx)) return 'Max value must be numeric.'
    if (mn != null && mx != null && mn > mx) return 'Min value must be ≤ max value.'
    return null
  }, [values.field_type, values.min_value, values.max_value])

  const sortError = useMemo(() => {
    const n = Number(values.sort_order)
    if (!Number.isFinite(n)) return 'Sort order must be numeric.'
    return null
  }, [values.sort_order])

  const canSubmit =
    !submitting &&
    !sectionError &&
    !labelError &&
    !keyError &&
    !optionsError &&
    !lengthError &&
    !valueError &&
    !sortError

  function onLabelChange(next: string) {
    setValues((v) => ({
      ...v,
      label: next,
      field_key: !keyTouched && mode === 'create' ? suggestCode(next) : v.field_key,
    }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const payload: FormTemplateFieldWriteInput = {
        template: templateId,
        section: Number(values.section),
        role: values.role ? Number(values.role) : null,
        label: values.label.trim(),
        field_key: values.field_key.trim(),
        field_type: values.field_type,
        placeholder: values.placeholder || undefined,
        help_text: values.help_text || undefined,
        is_required: values.is_required,
        is_active: values.is_active,
        sort_order: Number(values.sort_order) || 0,
        options: OPTION_TYPES.includes(values.field_type)
          ? values.options.map((o) => o.trim()).filter(Boolean)
          : [],
        min_length: TEXTUAL_TYPES.includes(values.field_type)
          ? values.min_length === ''
            ? null
            : Number(values.min_length)
          : null,
        max_length: TEXTUAL_TYPES.includes(values.field_type)
          ? values.max_length === ''
            ? null
            : Number(values.max_length)
          : null,
        min_value: NUMERIC_TYPES.includes(values.field_type)
          ? values.min_value === ''
            ? null
            : Number(values.min_value)
          : null,
        max_value: NUMERIC_TYPES.includes(values.field_type)
          ? values.max_value === ''
            ? null
            : Number(values.max_value)
          : null,
        translations: initialField?.translations ?? {},
      }

      if (mode === 'create') {
        await createTemplateField(payload)
      } else if (initialField) {
        await updateTemplateField(initialField.id, payload)
      }
      onSaved()
    } catch (e: unknown) {
      setError(parseApiError(e, 'Save failed').message)
    } finally {
      setSubmitting(false)
    }
  }

  const formId = `template-field-${mode}`

  // Per-type visibility
  const isFile = values.field_type === 'file'
  const isBoolean = values.field_type === 'boolean'
  const showPlaceholder = !isFile && !isBoolean
  const showTextualMinMax = TEXTUAL_TYPES.includes(values.field_type)
  const showNumericMinMax = NUMERIC_TYPES.includes(values.field_type)
  const showOptions = OPTION_TYPES.includes(values.field_type)

  return (
    <Drawer
      open={open}
      title={mode === 'create' ? 'Add field' : 'Edit field'}
      description={
        mode === 'create'
          ? 'Configure a new field on this template.'
          : 'Update field configuration.'
      }
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSubmit}>
            {submitting ? 'Saving...' : 'Save field'}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-5">
        {error ? <ErrorState message={error} /> : null}

        {/* ── Placement ─────────────────────────────────────────────── */}
        <DrawerGroup label="Placement">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="field_section"
              label="Section"
              value={values.section}
              onChange={(e) => setValues((v) => ({ ...v, section: e.target.value }))}
              error={sectionError ?? undefined}
              disabled={submitting}
            >
              <option value="">Select section…</option>
              {sections.map((s) => (
                <option key={s.id} value={String(s.id)}>
                  {s.name}
                </option>
              ))}
            </Select>

            <Select
              id="field_role"
              label="Job role"
              value={values.role}
              onChange={(e) => setValues((v) => ({ ...v, role: e.target.value }))}
              disabled={submitting || !!jobRolesError}
            >
              <option value="">Common (all roles)</option>
              {jobRoles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>

          {jobRolesError ? (
            <p className="text-xs text-status-warning">Job role lookup failed: {jobRolesError}</p>
          ) : null}

          <Input
            id="field_sort_order"
            label="Sort order"
            type="number"
            value={values.sort_order}
            onChange={(e) => setValues((v) => ({ ...v, sort_order: e.target.value }))}
            error={sortError ?? undefined}
            disabled={submitting}
          />
        </DrawerGroup>

        {/* ── Field identity ────────────────────────────────────────── */}
        <DrawerGroup label="Field">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="field_label"
              label="Label"
              value={values.label}
              onChange={(e) => onLabelChange(e.target.value)}
              error={labelError ?? undefined}
              disabled={submitting}
              required
            />
            <div>
              <Input
                id="field_key"
                label="Field key"
                value={values.field_key}
                onChange={(e) => {
                  setKeyTouched(true)
                  setValues((v) => ({ ...v, field_key: e.target.value }))
                }}
                error={keyError ?? undefined}
                disabled={submitting || mode === 'edit'}
                required
              />
              <p className="mt-1 text-xs text-app-subtle">
                {mode === 'create'
                  ? 'Auto-suggested from label. Lowercase with underscores. Cannot change after creation.'
                  : 'Field key identifies stored answers. Avoid changing after submissions exist.'}
              </p>
            </div>
          </div>

          <Select
            id="field_type"
            label="Field type"
            value={values.field_type}
            onChange={(e) => setValues((v) => ({ ...v, field_type: e.target.value as FieldType }))}
            disabled={submitting}
          >
            {(Object.entries(FIELD_TYPE_LABEL) as [FieldType, string][]).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </DrawerGroup>

        {/* ── Display text ──────────────────────────────────────────── */}
        <DrawerGroup label="Display">
          <div className={showPlaceholder ? 'grid gap-4 sm:grid-cols-2' : undefined}>
            {showPlaceholder ? (
              <Input
                id="field_placeholder"
                label="Placeholder"
                value={values.placeholder}
                onChange={(e) => setValues((v) => ({ ...v, placeholder: e.target.value }))}
                disabled={submitting}
              />
            ) : null}
            <Input
              id="field_help_text"
              label="Help text"
              value={values.help_text}
              onChange={(e) => setValues((v) => ({ ...v, help_text: e.target.value }))}
              disabled={submitting}
            />
          </div>
        </DrawerGroup>

        {/* ── Validation ────────────────────────────────────────────── */}
        <DrawerGroup label="Validation">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-app-secondary">
              <input
                type="checkbox"
                checked={values.is_required}
                onChange={(e) => setValues((v) => ({ ...v, is_required: e.target.checked }))}
                disabled={submitting}
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm text-app-secondary">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValues((v) => ({ ...v, is_active: e.target.checked }))}
                disabled={submitting}
              />
              Active
            </label>
          </div>

          {showTextualMinMax ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="field_min_length"
                label="Min length"
                type="number"
                value={values.min_length}
                onChange={(e) => setValues((v) => ({ ...v, min_length: e.target.value }))}
                disabled={submitting}
              />
              <Input
                id="field_max_length"
                label="Max length"
                type="number"
                value={values.max_length}
                onChange={(e) => setValues((v) => ({ ...v, max_length: e.target.value }))}
                error={lengthError ?? undefined}
                disabled={submitting}
              />
            </div>
          ) : null}

          {showNumericMinMax ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="field_min_value"
                label="Min value"
                type="number"
                value={values.min_value}
                onChange={(e) => setValues((v) => ({ ...v, min_value: e.target.value }))}
                disabled={submitting}
              />
              <Input
                id="field_max_value"
                label="Max value"
                type="number"
                value={values.max_value}
                onChange={(e) => setValues((v) => ({ ...v, max_value: e.target.value }))}
                error={valueError ?? undefined}
                disabled={submitting}
              />
            </div>
          ) : null}
        </DrawerGroup>

        {/* ── Options (select / multi_select only) ──────────────────── */}
        {showOptions ? (
          <DrawerGroup label="Options">
            <FieldOptionsEditor
              value={values.options}
              onChange={(next) => setValues((v) => ({ ...v, options: next }))}
              disabled={submitting}
              error={optionsError ?? undefined}
            />
          </DrawerGroup>
        ) : null}

        <button type="submit" hidden />
      </form>
    </Drawer>
  )
}
