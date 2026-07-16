import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type { IntakeSubmissionDetail, IntakeSubmissionRow } from '@/features/intakeSubmissions/types'

export interface ListIntakeSubmissionsParams {
  search?: string
  status?: string
  campaign?: number
  job_role?: number
  language?: string
  is_possible_duplicate?: boolean
  page?: number
}

export async function listIntakeSubmissions(
  params: ListIntakeSubmissionsParams,
): Promise<{ items: IntakeSubmissionRow[]; count?: number }> {
  const res = await api.get('/api/intake/submissions/', { params })
  return unwrapDrfResults<IntakeSubmissionRow>(res.data)
}

export async function getIntakeSubmission(id: number): Promise<IntakeSubmissionDetail> {
  const res = await api.get(`/api/intake/submissions/${id}/`)
  return res.data as IntakeSubmissionDetail
}

export async function patchIntakeSubmissionStatus(id: number, payload: { status: string }): Promise<IntakeSubmissionDetail> {
  const res = await api.patch(`/api/intake/submissions/${id}/`, payload)
  return res.data as IntakeSubmissionDetail
}


