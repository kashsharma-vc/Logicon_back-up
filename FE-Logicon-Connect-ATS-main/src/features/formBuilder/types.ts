/** Aligned with backend Phase Form-Builder-A: FormTemplate / FormSection / FormTemplateField. */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'email'
  | 'select'
  | 'multi_select'
  | 'boolean'
  | 'file'

export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  date: 'Date',
  email: 'Email',
  select: 'Single select',
  multi_select: 'Multi select',
  boolean: 'Yes / No',
  file: 'File upload',
}

export interface FormTemplateRow {
  id: number
  org: number
  name: string
  code: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FormTemplateWriteInput {
  name: string
  code: string
  description?: string
  is_active?: boolean
}

export interface FormSectionRow {
  id: number
  template: number
  name: string
  code: string
  description: string
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FormSectionWriteInput {
  template: number
  name: string
  code: string
  description?: string
  sort_order?: number
  is_active?: boolean
}

export interface FormTemplateFieldRow {
  id: number
  template: number
  section: number | null
  section_name: string | null
  section_code: string | null
  section_sort_order: number | null
  role: number | null
  role_name?: string | null
  role_code?: string | null
  label: string
  field_key: string
  field_type: FieldType
  placeholder: string
  help_text: string
  options: string[]
  is_required: boolean
  sort_order: number
  min_length: number | null
  max_length: number | null
  min_value: number | null
  max_value: number | null
  is_active: boolean
  translations?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface FormTemplateFieldWriteInput {
  template: number
  section: number
  role?: number | null
  label: string
  field_key: string
  field_type: FieldType
  placeholder?: string
  help_text?: string
  options?: string[]
  is_required?: boolean
  sort_order?: number
  min_length?: number | null
  max_length?: number | null
  min_value?: number | null
  max_value?: number | null
  is_active?: boolean
  translations?: Record<string, unknown>
}

export const TEXTUAL_TYPES: FieldType[] = ['text', 'textarea', 'email']
export const NUMERIC_TYPES: FieldType[] = ['number']
export const OPTION_TYPES: FieldType[] = ['select', 'multi_select']
