import { useMemo, useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ErrorState } from '@/components/ui/ErrorState'
import type { SkillCategory } from '@/api/jobs'
import { SKILL_CATEGORY_OPTIONS } from '@/features/masters/jobRoles/types'

export interface JobRoleFormValues {
  name: string
  code: string
  skill_category: SkillCategory | ''
  description: string
  is_active: boolean
}

export function JobRoleForm({
  formId,
  initialValues,
  submitting,
  errorMessage,
  onSubmit,
}: {
  formId: string
  initialValues?: Partial<JobRoleFormValues>
  submitting?: boolean
  errorMessage?: string | null
  onSubmit: (values: JobRoleFormValues) => void | Promise<void>
}) {
  const [values, setValues] = useState<JobRoleFormValues>(() => ({
    name: initialValues?.name ?? '',
    code: initialValues?.code ?? '',
    skill_category: (initialValues?.skill_category as SkillCategory | '') ?? '',
    description: initialValues?.description ?? '',
    is_active: initialValues?.is_active ?? true,
  }))

  const nameError = useMemo(() => (values.name.trim() ? null : 'Name is required.'), [values.name])
  const codeError = useMemo(() => (values.code.trim() ? null : 'Code is required.'), [values.code])
  const skillError = useMemo(() => (values.skill_category ? null : 'Skill category is required.'), [values.skill_category])

  const canSubmit = !submitting && !nameError && !codeError && !skillError

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    await onSubmit(values)
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? <ErrorState message={errorMessage} /> : null}

      <Input
        id="jr_name"
        label="Name"
        value={values.name}
        onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        disabled={submitting}
        error={nameError ?? undefined}
        required
      />
      <Input
        id="jr_code"
        label="Code"
        value={values.code}
        onChange={(e) => setValues((v) => ({ ...v, code: e.target.value }))}
        disabled={submitting}
        error={codeError ?? undefined}
        required
      />
      <Select
        id="jr_skill"
        label="Skill category"
        value={values.skill_category}
        onChange={(e) => setValues((v) => ({ ...v, skill_category: e.target.value as SkillCategory }))}
        disabled={submitting}
        error={skillError ?? undefined}
        required
      >
        <option value="">Select skill category</option>
        {SKILL_CATEGORY_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>

      <div className="space-y-1">
        <label htmlFor="jr_desc" className="text-sm font-medium text-app-secondary">
          Description
        </label>
        <textarea
          id="jr_desc"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className="min-h-20 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          disabled={submitting}
        />
      </div>

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
