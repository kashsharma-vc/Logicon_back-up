import { useMemo, useState, type ReactNode } from 'react'
import { Battery, ChevronRight, Eye, Signal, Smartphone, Users, Wifi } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import type { FormSectionRow, FormTemplateFieldRow } from '@/features/formBuilder/types'

interface JobRoleLookup {
  id: number
  name: string
  code: string
}

// Disabled input class — visual only, no focus ring
const DIS =
  'min-h-10 w-full rounded-panel border border-app-border bg-app-muted px-3 py-2 text-sm text-app-secondary shadow-panel placeholder:text-app-subtle cursor-not-allowed'

// Interactive select class (used for role picker)
const SEL =
  'min-h-10 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

function SectionCard({
  title,
  children,
  index,
}: {
  title: string
  children: ReactNode
  index: number
}) {
  const colors = [
    'from-brand-500 to-brand-600',
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
  ]
  const colorClass = colors[index % colors.length]

  return (
    <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-md transition-all hover:shadow-lg">
      <div className={`flex items-center gap-3 bg-gradient-to-r ${colorClass} px-4 py-3`}>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
          <span className="text-sm font-bold text-white">{index + 1}</span>
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  )
}

/** Renders a single template field as a realistic disabled form control. */
function FieldPreview({ field }: { field: FormTemplateFieldRow }) {
  const req = field.is_required ? (
    <span className="ml-0.5 text-status-danger">*</span>
  ) : null
  const help = field.help_text || undefined

  if (field.field_type === 'file') {
    return (
      <div>
        <p className="text-sm font-medium text-app-secondary">
          {field.label}
          {req}
        </p>
        <div className="mt-1 flex items-center gap-2 rounded-panel border-2 border-dashed border-app-border bg-app-muted px-4 py-4 text-center">
          <span className="flex-1 text-xs text-app-subtle">
            Tap to upload · PDF, DOC, JPG, PNG · max 10 MB
          </span>
        </div>
        {help ? <p className="mt-1 text-xs text-app-subtle">{help}</p> : null}
      </div>
    )
  }

  if (field.field_type === 'textarea') {
    return (
      <div>
        <p className="text-sm font-medium text-app-secondary">
          {field.label}
          {req}
        </p>
        <textarea
          disabled
          placeholder={field.placeholder || undefined}
          className={cn(DIS, 'mt-1 min-h-20')}
        />
        {help ? <p className="mt-1 text-xs text-app-subtle">{help}</p> : null}
      </div>
    )
  }

  if (field.field_type === 'boolean') {
    return (
      <label className="flex cursor-not-allowed items-center gap-2 text-sm text-app-secondary">
        <input type="checkbox" disabled className="rounded" />
        {field.label}
        {req}
      </label>
    )
  }

  if (field.field_type === 'multi_select') {
    return (
      <div>
        <p className="text-sm font-medium text-app-secondary">
          {field.label}
          {req}
        </p>
        <div className="mt-1 flex flex-wrap gap-3 rounded-panel border border-app-border bg-app-muted p-3">
          {field.options.length === 0 ? (
            <span className="text-xs text-status-warning">No options configured.</span>
          ) : (
            field.options.map((opt) => (
              <label
                key={opt}
                className="flex cursor-not-allowed items-center gap-2 text-sm text-app-secondary"
              >
                <input type="checkbox" disabled />
                {opt}
              </label>
            ))
          )}
        </div>
        {help ? <p className="mt-1 text-xs text-app-subtle">{help}</p> : null}
      </div>
    )
  }

  if (field.field_type === 'select') {
    return (
      <div>
        <p className="text-sm font-medium text-app-secondary">
          {field.label}
          {req}
        </p>
        {field.options.length === 0 ? (
          <p className="mt-1 rounded-panel border border-app-border bg-app-muted px-3 py-2 text-xs text-status-warning">
            No options configured.
          </p>
        ) : (
          <select disabled className={cn(DIS, 'mt-1')}>
            <option value="">Select {field.label.toLowerCase()}…</option>
            {field.options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        )}
        {help ? <p className="mt-1 text-xs text-app-subtle">{help}</p> : null}
      </div>
    )
  }

  const inputType =
    field.field_type === 'number'
      ? 'number'
      : field.field_type === 'date'
        ? 'date'
        : field.field_type === 'email'
          ? 'email'
          : 'text'

  return (
    <div>
      <p className="text-sm font-medium text-app-secondary">
        {field.label}
        {req}
      </p>
      <input
        type={inputType}
        disabled
        placeholder={field.placeholder || undefined}
        className={cn(DIS, 'mt-1')}
      />
      {help ? <p className="mt-1 text-xs text-app-subtle">{help}</p> : null}
    </div>
  )
}

export function FormTemplatePreview({
  fields,
  sections,
  jobRoles,
}: {
  fields: FormTemplateFieldRow[]
  sections: FormSectionRow[]
  jobRoles: JobRoleLookup[]
}) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)

  const activeFields = useMemo(() => fields.filter((f) => f.is_active), [fields])

  const activeSections = useMemo(
    () =>
      sections
        .filter((s) => s.is_active)
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [sections],
  )

  // Fields visible for selected role (common + role-specific)
  const visibleFields = useMemo(
    () => activeFields.filter((f) => f.role == null || f.role === selectedRoleId),
    [activeFields, selectedRoleId],
  )

  // Fields grouped by section id, sorted within section
  const fieldsBySection = useMemo(() => {
    const map = new Map<number, FormTemplateFieldRow[]>()
    for (const f of visibleFields) {
      if (f.section == null) continue
      if (!map.has(f.section)) map.set(f.section, [])
      map.get(f.section)!.push(f)
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => {
        const aRoleWeight = a.role == null ? 0 : 1
        const bRoleWeight = b.role == null ? 0 : 1
        return aRoleWeight - bRoleWeight || a.sort_order - b.sort_order || a.id - b.id
      })
    }
    return map
  }, [visibleFields])

  const rolesWithFields = useMemo(() => {
    const roleIds = new Set(activeFields.filter((f) => f.role != null).map((f) => f.role!))
    return jobRoles.filter((r) => roleIds.has(r.id))
  }, [activeFields, jobRoles])

  const roleSpecificCount = selectedRoleId
    ? activeFields.filter((f) => f.role === selectedRoleId).length
    : 0

  if (activeSections.length === 0) {
    return (
      <div className="py-8">
        <EmptyState
          title="Nothing to preview yet"
          description="Add at least one active section and some fields to see how the public form will render."
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Preview Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-app-border bg-app-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
            <Eye className="h-5 w-5 text-brand-600" aria-hidden />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-text">Live Preview</h3>
            <p className="text-sm text-app-secondary">See how your form looks to applicants</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-2">
          <Smartphone className="h-4 w-4 text-brand-600" aria-hidden />
          <span className="text-xs font-medium text-brand-700">Mobile-friendly</span>
        </div>
      </div>

      {/* Role Selector */}
      {rolesWithFields.length > 0 ? (
        <div className="rounded-xl border border-app-border bg-app-surface p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-app-subtle" aria-hidden />
            <span className="text-sm font-medium text-app-secondary">Preview by Role</span>
          </div>
          <select
            id="preview_role_sel"
            value={String(selectedRoleId ?? '')}
            onChange={(e) =>
              setSelectedRoleId(e.target.value ? Number(e.target.value) : null)
            }
            className={cn(SEL, 'rounded-lg')}
          >
            <option value="">Common fields only</option>
            {rolesWithFields.map((r) => (
              <option key={r.id} value={String(r.id)}>
                {r.name}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs text-app-subtle">
            The preview below shows active sections and fields linked to this template.
          </p>
        </div>
      ) : null}

      {/* Phone Frame Preview */}
      <div className="mx-auto max-w-md">
        {/* Phone Frame with realistic styling */}
        <div className="rounded-[2.5rem] border-2 border-gray-700 bg-gradient-to-b from-gray-800 via-gray-900 to-gray-800 p-1.5 shadow-2xl ring-1 ring-gray-600/50">
          {/* Inner frame edge */}
          <div className="rounded-[2rem] bg-black p-0.5">
            {/* Phone Screen */}
            <div className="relative overflow-hidden rounded-[1.75rem] bg-white shadow-inner">
              {/* Status Bar */}
              <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-700 px-5 pt-2 pb-0">
                {/* Time */}
                <span className="text-xs font-semibold text-white">9:41</span>

                {/* Dynamic Island */}
                <div className="absolute left-1/2 top-2 z-10 h-6 w-20 -translate-x-1/2 rounded-full bg-black" />

                {/* Status Icons */}
                <div className="flex items-center gap-1">
                  <Signal className="h-3.5 w-3.5 text-white" aria-hidden />
                  <Wifi className="h-3.5 w-3.5 text-white" aria-hidden />
                  <Battery className="h-4 w-4 text-white" aria-hidden />
                </div>
              </div>

              {/* App Header */}
              <div className="bg-gradient-to-r from-brand-600 to-brand-700 px-4 pb-4 pt-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-200">
                  Logicon Facility Management
                </p>
                <p className="mt-1 text-base font-bold text-white">New Job Application</p>
              </div>

              {/* Form Content */}
              <div className="max-h-[460px] space-y-4 overflow-y-auto p-4">
                {activeSections.map((sec, idx) => {
                  const sectionFields = fieldsBySection.get(sec.id) ?? []

                  return (
                    <SectionCard key={sec.id} title={sec.name} index={idx}>
                      {sec.description ? (
                        <p className="text-xs text-app-subtle">{sec.description}</p>
                      ) : null}
                      {sectionFields.length === 0 ? (
                        <p className="text-xs italic text-app-subtle">
                          {selectedRoleId
                            ? 'No fields in this section for the selected role.'
                            : 'No active fields in this section.'}
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {sectionFields.map((f) => (
                            <FieldPreview key={f.id} field={f} />
                          ))}
                        </div>
                      )}
                    </SectionCard>
                  )
                })}

                {/* Submit Button Preview */}
                <button
                  type="button"
                  disabled
                  className="mt-4 w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 py-3.5 text-sm font-semibold text-white shadow-lg"
                >
                  Submit Application
                </button>

                {/* Bottom spacing for home indicator */}
                <div className="h-2" />
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-1.5 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Role Hint */}
      {selectedRoleId == null && rolesWithFields.length > 0 ? (
        <div className="mx-auto max-w-md rounded-xl border border-brand-200 bg-gradient-to-r from-brand-50 to-violet-50 p-4">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-brand-600" aria-hidden />
            <span className="text-sm font-medium text-brand-700">Role-specific fields available</span>
          </div>
          <p className="mt-1 text-xs text-brand-600">
            Select a role above to preview additional fields for: {rolesWithFields.map((r) => r.name).join(', ')}.
          </p>
        </div>
      ) : selectedRoleId != null && roleSpecificCount === 0 ? (
        <div className="mx-auto max-w-md rounded-xl border border-app-border bg-app-muted p-4 text-center">
          <p className="text-sm text-app-secondary">
            No role-specific fields configured for this role.
          </p>
        </div>
      ) : null}
    </div>
  )
}
