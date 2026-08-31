export type LangCode = 'en' | 'hi' | 'mr'

export type PublicFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'email'
  | 'select'
  | 'multi_select'
  | 'boolean'
  | 'file'

export interface PublicSite {
  id: number
  name: string
  city: string
  state: string
}

export interface PublicRole {
  id: number
  name: string
  code: string
}

export interface FormFieldTranslations {
  label?: string
  help_text?: string
  options?: string[]
}

export interface PublicFormField {
  id: number
  label: string
  field_key: string
  field_type: PublicFieldType
  help_text: string
  placeholder: string
  options: string[]
  is_required: boolean
  sort_order: number
  min_length: number | null
  max_length: number | null
  min_value: number | null
  max_value: number | null
  role: number | null
  translations?: Partial<Record<LangCode, FormFieldTranslations>>
  field_source?: 'campaign' | 'template'
  section_id?: number | null
  section_name?: string | null
  section_code?: string | null
  section_sort_order?: number | null
}

export interface PublicLanguageMeta {
  code: LangCode
  label: string
  native_label: string
}

export interface PublicCampaign {
  id: number
  title: string
  token: string
  site: PublicSite | null
  roles: PublicRole[]
  common_fields: PublicFormField[]
  role_fields: Record<string, PublicFormField[]>
  settings: {
    shuffle_fields: boolean
    requires_otp: boolean
    allow_duplicates: boolean
  }
  default_language: LangCode
  enabled_languages: LangCode[]
  languages: PublicLanguageMeta[]
}

export interface PublicSubmissionResponse {
  id: number
  campaign: number
  site: number | null
  candidate: number | null
  job_role: number | null
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  other_role_title: string
  mobile_number: string
  mobile_number_normalized: string
  status: string
  language: string
  is_possible_duplicate: boolean
  submitted_at: string
  answers: {
    id: number
    field: number | null
    template_field?: number | null
    field_source?: 'campaign' | 'template'
    field_label_snapshot: string
    field_type_snapshot: string
    value: unknown
    created_at: string
  }[]
  documents: {
    id: number
    document_type: string
    file: string
    original_filename: string
    content_type: string
    size_bytes: number
    uploaded_at: string
  }[]
}

// Admin form-field API types (Phase 4D: API helper only)
export type FormFieldRow = PublicFormField

export interface FormFieldWriteInput {
  campaign: number
  role?: number | null
  label: string
  field_key: string
  field_type: PublicFieldType
  help_text?: string
  placeholder?: string
  options?: unknown[]
  is_required?: boolean
  sort_order?: number
  min_length?: number | null
  max_length?: number | null
  min_value?: number | null
  max_value?: number | null
  translations?: Record<string, unknown>
  is_active?: boolean
}


