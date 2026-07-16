import { api } from '@/api/client'
import type { MeResponse } from '@/types/api'

export async function fetchMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/api/core/me/')
  return data
}




