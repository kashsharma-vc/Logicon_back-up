import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type {
  FormSectionRow,
  FormSectionWriteInput,
  FormTemplateFieldRow,
  FormTemplateFieldWriteInput,
  FormTemplateRow,
  FormTemplateWriteInput,
} from '@/features/formBuilder/types'

// ─── Form templates ──────────────────────────────────────────────────────────

export interface ListFormTemplatesParams {
  search?: string
  is_active?: boolean
  page?: number
}

export async function listFormTemplates(
  params: ListFormTemplatesParams = {},
): Promise<{ items: FormTemplateRow[]; count?: number }> {
  const res = await api.get('/api/intake/form-templates/', {
    params: {
      search: params.search || undefined,
      is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
      page: params.page ?? undefined,
    },
  })
  return unwrapDrfResults<FormTemplateRow>(res.data)
}

export async function getFormTemplate(id: number): Promise<FormTemplateRow> {
  const res = await api.get(`/api/intake/form-templates/${id}/`)
  return res.data as FormTemplateRow
}

export async function createFormTemplate(payload: FormTemplateWriteInput): Promise<FormTemplateRow> {
  const res = await api.post('/api/intake/form-templates/', payload)
  return res.data as FormTemplateRow
}

export async function updateFormTemplate(
  id: number,
  payload: Partial<FormTemplateWriteInput>,
): Promise<FormTemplateRow> {
  const res = await api.patch(`/api/intake/form-templates/${id}/`, payload)
  return res.data as FormTemplateRow
}

/** Backend soft-deletes (sets is_active=false). Name mirrors that intent. */
export async function deleteOrDeactivateFormTemplate(id: number): Promise<void> {
  await api.delete(`/api/intake/form-templates/${id}/`)
}

// ─── Form sections ───────────────────────────────────────────────────────────

export interface ListFormSectionsParams {
  template?: number
  is_active?: boolean
  page?: number
}

export async function listFormSections(
  params: ListFormSectionsParams,
): Promise<{ items: FormSectionRow[]; count?: number }> {
  const res = await api.get('/api/intake/form-sections/', {
    params: {
      template: params.template ?? undefined,
      is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
      page: params.page ?? undefined,
    },
  })
  return unwrapDrfResults<FormSectionRow>(res.data)
}

export async function createFormSection(payload: FormSectionWriteInput): Promise<FormSectionRow> {
  const res = await api.post('/api/intake/form-sections/', payload)
  return res.data as FormSectionRow
}

export async function updateFormSection(
  id: number,
  payload: Partial<FormSectionWriteInput>,
): Promise<FormSectionRow> {
  const res = await api.patch(`/api/intake/form-sections/${id}/`, payload)
  return res.data as FormSectionRow
}

export async function deleteFormSection(id: number): Promise<void> {
  await api.delete(`/api/intake/form-sections/${id}/`)
}

// ─── Form template fields ────────────────────────────────────────────────────

export interface ListTemplateFieldsParams {
  template?: number
  section?: number
  role?: number | null
  is_active?: boolean
  page?: number
}

export async function listTemplateFields(
  params: ListTemplateFieldsParams,
): Promise<{ items: FormTemplateFieldRow[]; count?: number }> {
  const res = await api.get('/api/intake/template-fields/', {
    params: {
      template: params.template ?? undefined,
      section: params.section ?? undefined,
      role: params.role === null ? 'null' : params.role ?? undefined,
      is_active: typeof params.is_active === 'boolean' ? String(params.is_active) : undefined,
      page: params.page ?? undefined,
    },
  })
  return unwrapDrfResults<FormTemplateFieldRow>(res.data)
}

export async function createTemplateField(
  payload: FormTemplateFieldWriteInput,
): Promise<FormTemplateFieldRow> {
  const res = await api.post('/api/intake/template-fields/', payload)
  return res.data as FormTemplateFieldRow
}

export async function updateTemplateField(
  id: number,
  payload: Partial<FormTemplateFieldWriteInput>,
): Promise<FormTemplateFieldRow> {
  const res = await api.patch(`/api/intake/template-fields/${id}/`, payload)
  return res.data as FormTemplateFieldRow
}

export async function deleteTemplateField(id: number): Promise<void> {
  await api.delete(`/api/intake/template-fields/${id}/`)
}
