import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type { FormFieldRow, FormFieldWriteInput } from '@/features/publicApply/types'

export interface ListFormFieldsParams {
  campaign?: number
  role?: number | null
  is_active?: boolean
  page?: number
  search?: string
}

/**
 * Phase 4D: API helper only. Do not build admin form-field UI in this phase.
 */
export async function listFormFields(
  params: ListFormFieldsParams,
): Promise<{ items: FormFieldRow[]; count?: number }> {
  const res = await api.get('/api/intake/form-fields/', { params })
  return unwrapDrfResults<FormFieldRow>(res.data)
}

export async function createFormField(payload: FormFieldWriteInput): Promise<FormFieldRow> {
  const res = await api.post('/api/intake/form-fields/', payload)
  return res.data as FormFieldRow
}

export async function updateFormField(id: number, payload: Partial<FormFieldWriteInput>): Promise<FormFieldRow> {
  const res = await api.patch(`/api/intake/form-fields/${id}/`, payload)
  return res.data as FormFieldRow
}

export async function deleteFormField(id: number): Promise<void> {
  await api.delete(`/api/intake/form-fields/${id}/`)
}


