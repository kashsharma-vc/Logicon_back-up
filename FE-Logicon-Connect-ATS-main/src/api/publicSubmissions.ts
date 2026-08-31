import { publicApi } from '@/api/publicClient'
import type { PublicSubmissionResponse } from '@/features/publicApply/types'

export async function createPublicSubmission(formData: FormData): Promise<PublicSubmissionResponse> {
  const res = await publicApi.post('/api/public/submissions/', formData)
  return res.data as PublicSubmissionResponse
}


