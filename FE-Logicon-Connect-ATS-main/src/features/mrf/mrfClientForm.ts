import type { MRFSupportRequirement, MRFRow, MRFWriteInput } from '@/features/mrf/types'

export interface MRFSupportFormValues {
  laptop_required: boolean
  desktop_required: boolean
  mail_id_required: boolean
  hrms_login_required: boolean
  outlook_required: boolean
  ms_office_required: boolean
  windows_required: boolean
  own_or_rental: string
  sim_card_required: boolean
  data_card_required: boolean
  uniform_required: boolean
  visiting_cards_required: boolean
  seating_required: boolean
  admin_location: string
  admin_other: string
}

export interface MRFClientHeaderFormValues {
  request_number: string
  experience_min_years: string
  experience_max_years: string
  reporting_to: string
  mis_requirement: string
  education_requirement: string
  gender_preference: string
  special_requirement: string
  salary_range_text: string
  ctc_budget_text: string
  reference_note: string
  other_remarks: string
  support: MRFSupportFormValues
}

export const EMPTY_SUPPORT: MRFSupportFormValues = {
  laptop_required: false,
  desktop_required: false,
  mail_id_required: false,
  hrms_login_required: false,
  outlook_required: false,
  ms_office_required: false,
  windows_required: false,
  own_or_rental: '',
  sim_card_required: false,
  data_card_required: false,
  uniform_required: false,
  visiting_cards_required: false,
  seating_required: false,
  admin_location: '',
  admin_other: '',
}

export function experienceToFormValue(v: string | number | null | undefined): string {
  if (v == null || v === '') return ''
  return String(v)
}

export function supportFromRow(sr?: MRFSupportRequirement | null): MRFSupportFormValues {
  if (!sr) return { ...EMPTY_SUPPORT }
  return {
    laptop_required: !!sr.laptop_required,
    desktop_required: !!sr.desktop_required,
    mail_id_required: !!sr.mail_id_required,
    hrms_login_required: !!sr.hrms_login_required,
    outlook_required: !!sr.outlook_required,
    ms_office_required: !!sr.ms_office_required,
    windows_required: !!sr.windows_required,
    own_or_rental: sr.own_or_rental ?? '',
    sim_card_required: !!sr.sim_card_required,
    data_card_required: !!sr.data_card_required,
    uniform_required: !!sr.uniform_required,
    visiting_cards_required: !!sr.visiting_cards_required,
    seating_required: !!sr.seating_required,
    admin_location: sr.admin_location ?? '',
    admin_other: sr.admin_other ?? '',
  }
}

export function clientFieldsFromRow(row?: MRFRow | null): Pick<
  MRFClientHeaderFormValues,
  | 'request_number'
  | 'experience_min_years'
  | 'experience_max_years'
  | 'reporting_to'
  | 'mis_requirement'
  | 'education_requirement'
  | 'gender_preference'
  | 'special_requirement'
  | 'salary_range_text'
  | 'ctc_budget_text'
  | 'reference_note'
  | 'other_remarks'
  | 'support'
> {
  return {
    request_number: row?.request_number ?? '',
    experience_min_years: experienceToFormValue(row?.experience_min_years),
    experience_max_years: experienceToFormValue(row?.experience_max_years),
    reporting_to: row?.reporting_to ?? '',
    mis_requirement: row?.mis_requirement ?? '',
    education_requirement: row?.education_requirement ?? '',
    gender_preference: row?.gender_preference ?? '',
    special_requirement: row?.special_requirement ?? '',
    salary_range_text: row?.salary_range_text ?? '',
    ctc_budget_text: row?.ctc_budget_text ?? '',
    reference_note: row?.reference_note ?? '',
    other_remarks: row?.other_remarks ?? '',
    support: supportFromRow(row?.support_requirement),
  }
}

function parseExperienceInput(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return n
}

export function validateMrfClientFields(values: MRFClientHeaderFormValues): string | null {
  const min = parseExperienceInput(values.experience_min_years)
  const max = parseExperienceInput(values.experience_max_years)
  if (min != null && min < 0) return 'Minimum experience cannot be negative.'
  if (max != null && max < 0) return 'Maximum experience cannot be negative.'
  if (min != null && max != null && min > max) return 'Minimum experience cannot exceed maximum experience.'
  return null
}

export function hasSupportContent(s: MRFSupportFormValues): boolean {
  if (s.own_or_rental.trim() || s.admin_location.trim() || s.admin_other.trim()) return true
  return (
    s.laptop_required ||
    s.desktop_required ||
    s.mail_id_required ||
    s.hrms_login_required ||
    s.outlook_required ||
    s.ms_office_required ||
    s.windows_required ||
    s.sim_card_required ||
    s.data_card_required ||
    s.uniform_required ||
    s.visiting_cards_required ||
    s.seating_required
  )
}

export function supportToPayload(s: MRFSupportFormValues): Partial<MRFSupportRequirement> {
  return {
    laptop_required: s.laptop_required,
    desktop_required: s.desktop_required,
    mail_id_required: s.mail_id_required,
    hrms_login_required: s.hrms_login_required,
    outlook_required: s.outlook_required,
    ms_office_required: s.ms_office_required,
    windows_required: s.windows_required,
    own_or_rental: s.own_or_rental.trim(),
    sim_card_required: s.sim_card_required,
    data_card_required: s.data_card_required,
    uniform_required: s.uniform_required,
    visiting_cards_required: s.visiting_cards_required,
    seating_required: s.seating_required,
    admin_location: s.admin_location.trim(),
    admin_other: s.admin_other.trim(),
  }
}

export function clientFieldsToWritePayload(
  values: MRFClientHeaderFormValues,
  mode: 'create' | 'edit',
): Pick<
  MRFWriteInput,
  | 'request_number'
  | 'experience_min_years'
  | 'experience_max_years'
  | 'reporting_to'
  | 'mis_requirement'
  | 'education_requirement'
  | 'gender_preference'
  | 'special_requirement'
  | 'salary_range_text'
  | 'ctc_budget_text'
  | 'reference_note'
  | 'other_remarks'
  | 'support_requirement'
> {
  const payload: Pick<
    MRFWriteInput,
    | 'request_number'
    | 'experience_min_years'
    | 'experience_max_years'
    | 'reporting_to'
    | 'mis_requirement'
    | 'education_requirement'
    | 'gender_preference'
    | 'special_requirement'
    | 'salary_range_text'
    | 'ctc_budget_text'
    | 'reference_note'
    | 'other_remarks'
    | 'support_requirement'
  > = {
    request_number: values.request_number.trim(),
    experience_min_years: parseExperienceInput(values.experience_min_years),
    experience_max_years: parseExperienceInput(values.experience_max_years),
    reporting_to: values.reporting_to.trim(),
    mis_requirement: values.mis_requirement.trim(),
    education_requirement: values.education_requirement.trim(),
    gender_preference: values.gender_preference.trim(),
    special_requirement: values.special_requirement.trim(),
    salary_range_text: values.salary_range_text.trim(),
    ctc_budget_text: values.ctc_budget_text.trim(),
    reference_note: values.reference_note.trim(),
    other_remarks: values.other_remarks.trim(),
  }

  if (mode === 'edit' || hasSupportContent(values.support)) {
    payload.support_requirement = supportToPayload(values.support)
  }

  return payload
}

export function formatExperienceRange(
  min?: string | number | null,
  max?: string | number | null,
): string | null {
  const a = min != null && min !== '' ? String(min) : ''
  const b = max != null && max !== '' ? String(max) : ''
  if (a && b) return `${a} - ${b} years`
  if (a) return `${a}+ years`
  if (b) return `Up to ${b} years`
  return null
}

export function displayOrDash(v: string | null | undefined): string {
  const t = v?.trim()
  return t ? t : '-'
}

const IT_LABELS: { key: keyof MRFSupportRequirement; label: string }[] = [
  { key: 'laptop_required', label: 'Laptop' },
  { key: 'desktop_required', label: 'Desktop' },
  { key: 'mail_id_required', label: 'Mail ID' },
  { key: 'hrms_login_required', label: 'HRMS login' },
  { key: 'outlook_required', label: 'Outlook' },
  { key: 'ms_office_required', label: 'MS Office' },
  { key: 'windows_required', label: 'Windows' },
]

const ADMIN_LABELS: { key: keyof MRFSupportRequirement; label: string }[] = [
  { key: 'sim_card_required', label: 'SIM card' },
  { key: 'data_card_required', label: 'Data card' },
  { key: 'uniform_required', label: 'Uniform' },
  { key: 'visiting_cards_required', label: 'Visiting cards' },
  { key: 'seating_required', label: 'Seating arrangement' },
]

export function selectedSupportLabels(
  sr: MRFSupportRequirement | null | undefined,
  keys: { key: keyof MRFSupportRequirement; label: string }[],
): string[] {
  if (!sr) return []
  return keys.filter((x) => sr[x.key] === true).map((x) => x.label)
}

export { IT_LABELS, ADMIN_LABELS }
