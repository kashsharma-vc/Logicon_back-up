import type { ReactNode } from 'react'
import { Input } from '@/components/ui/Input'
import type { BillingType } from '@/features/mrf/types'
import type { MRFClientHeaderFormValues, MRFSupportFormValues } from '@/features/mrf/mrfClientForm'

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-panel border border-app-border bg-app-muted/40 p-4">
      <legend className="px-1 text-sm font-semibold text-app-text">{title}</legend>
      {children}
    </fieldset>
  )
}

function CheckboxRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm text-app-secondary">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-app-border"
      />
      {label}
    </label>
  )
}

const textareaClass =
  'min-h-20 w-full rounded-panel border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text shadow-panel placeholder:text-app-subtle focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export function MRFClientFormFields({
  values,
  onChange,
  onSupportChange,
  submitting,
  clientError,
  billingType,
}: {
  values: MRFClientHeaderFormValues
  onChange: (patch: Partial<MRFClientHeaderFormValues>) => void
  onSupportChange: (patch: Partial<MRFSupportFormValues>) => void
  submitting?: boolean
  clientError?: string | null
  billingType: BillingType
}) {
  const s = values.support
  const isNonBillable = billingType === 'non_billable'

  if (!isNonBillable) {
    return null
  }

  return (
    <div className="space-y-4">
      {clientError ? <p className="text-sm text-status-danger">{clientError}</p> : null}

      <FormSection title="Internal hiring details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="mrf_request_number"
            label="Requisition number"
            value={values.request_number}
            onChange={(e) => onChange({ request_number: e.target.value })}
            disabled={submitting}
            placeholder="e.g. RN-2026-001"
          />
          <Input
            id="mrf_reporting_to"
            label="Reporting to"
            value={values.reporting_to}
            onChange={(e) => onChange({ reporting_to: e.target.value })}
            disabled={submitting}
          />
          <Input
            id="mrf_exp_min"
            label="Min experience (years)"
            type="number"
            min={0}
            step="0.5"
            value={values.experience_min_years}
            onChange={(e) => onChange({ experience_min_years: e.target.value })}
            disabled={submitting}
          />
          <Input
            id="mrf_exp_max"
            label="Max experience (years)"
            type="number"
            min={0}
            step="0.5"
            value={values.experience_max_years}
            onChange={(e) => onChange({ experience_max_years: e.target.value })}
            disabled={submitting}
          />
          <div className="sm:col-span-2">
            <Input
              id="mrf_mis"
              label="MIS requirement"
              value={values.mis_requirement}
              onChange={(e) => onChange({ mis_requirement: e.target.value })}
              disabled={submitting}
            />
          </div>
          <Input
            id="mrf_gender"
            label="Gender preference"
            value={values.gender_preference}
            onChange={(e) => onChange({ gender_preference: e.target.value })}
            disabled={submitting}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="mrf_education" className="text-sm font-medium text-app-secondary">
            Education requirement
          </label>
          <textarea
            id="mrf_education"
            value={values.education_requirement}
            onChange={(e) => onChange({ education_requirement: e.target.value })}
            disabled={submitting}
            className={textareaClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="mrf_special" className="text-sm font-medium text-app-secondary">
            Special requirement
          </label>
          <textarea
            id="mrf_special"
            value={values.special_requirement}
            onChange={(e) => onChange({ special_requirement: e.target.value })}
            disabled={submitting}
            className={textareaClass}
          />
        </div>
      </FormSection>

      <FormSection title="Salary / CTC">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="mrf_salary_range"
            label="Salary range"
            value={values.salary_range_text}
            onChange={(e) => onChange({ salary_range_text: e.target.value })}
            disabled={submitting}
          />
          <Input
            id="mrf_ctc_budget"
            label="CTC budget"
            value={values.ctc_budget_text}
            onChange={(e) => onChange({ ctc_budget_text: e.target.value })}
            disabled={submitting}
          />
        </div>
      </FormSection>

      <FormSection title="IT requirements">
        <div className="grid gap-2 sm:grid-cols-2">
          <CheckboxRow id="mrf_it_laptop" label="Laptop" checked={s.laptop_required} disabled={submitting} onChange={(v) => onSupportChange({ laptop_required: v })} />
          <CheckboxRow id="mrf_it_desktop" label="Desktop" checked={s.desktop_required} disabled={submitting} onChange={(v) => onSupportChange({ desktop_required: v })} />
          <CheckboxRow id="mrf_it_mail" label="Mail ID" checked={s.mail_id_required} disabled={submitting} onChange={(v) => onSupportChange({ mail_id_required: v })} />
          <CheckboxRow id="mrf_it_hrms" label="HRMS login" checked={s.hrms_login_required} disabled={submitting} onChange={(v) => onSupportChange({ hrms_login_required: v })} />
          <CheckboxRow id="mrf_it_outlook" label="Outlook" checked={s.outlook_required} disabled={submitting} onChange={(v) => onSupportChange({ outlook_required: v })} />
          <CheckboxRow id="mrf_it_office" label="MS Office" checked={s.ms_office_required} disabled={submitting} onChange={(v) => onSupportChange({ ms_office_required: v })} />
          <CheckboxRow id="mrf_it_windows" label="Windows" checked={s.windows_required} disabled={submitting} onChange={(v) => onSupportChange({ windows_required: v })} />
        </div>
        <Input id="mrf_own_rental" label="Own / rental" value={s.own_or_rental} onChange={(e) => onSupportChange({ own_or_rental: e.target.value })} disabled={submitting} />
      </FormSection>

      <FormSection title="Admin support">
        <div className="grid gap-2 sm:grid-cols-2">
          <CheckboxRow id="mrf_ad_sim" label="SIM card" checked={s.sim_card_required} disabled={submitting} onChange={(v) => onSupportChange({ sim_card_required: v })} />
          <CheckboxRow id="mrf_ad_data" label="Data card" checked={s.data_card_required} disabled={submitting} onChange={(v) => onSupportChange({ data_card_required: v })} />
          <CheckboxRow id="mrf_ad_uniform" label="Uniform" checked={s.uniform_required} disabled={submitting} onChange={(v) => onSupportChange({ uniform_required: v })} />
          <CheckboxRow id="mrf_ad_cards" label="Visiting cards" checked={s.visiting_cards_required} disabled={submitting} onChange={(v) => onSupportChange({ visiting_cards_required: v })} />
          <CheckboxRow id="mrf_ad_seating" label="Seating arrangement" checked={s.seating_required} disabled={submitting} onChange={(v) => onSupportChange({ seating_required: v })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="mrf_admin_loc" label="Admin location" value={s.admin_location} onChange={(e) => onSupportChange({ admin_location: e.target.value })} disabled={submitting} />
          <Input id="mrf_admin_other" label="Admin other" value={s.admin_other} onChange={(e) => onSupportChange({ admin_other: e.target.value })} disabled={submitting} />
        </div>
      </FormSection>

      <FormSection title="Reference & remarks">
        <div className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="mrf_ref_note" className="text-sm font-medium text-app-secondary">
              Reference note
            </label>
            <textarea
              id="mrf_ref_note"
              value={values.reference_note}
              onChange={(e) => onChange({ reference_note: e.target.value })}
              disabled={submitting}
              className={textareaClass}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="mrf_other_remarks" className="text-sm font-medium text-app-secondary">
              Other remarks
            </label>
            <textarea
              id="mrf_other_remarks"
              value={values.other_remarks}
              onChange={(e) => onChange({ other_remarks: e.target.value })}
              disabled={submitting}
              className={textareaClass}
            />
          </div>
        </div>
      </FormSection>
    </div>
  )
}
