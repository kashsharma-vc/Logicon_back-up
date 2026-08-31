import { api } from '@/api/client'
import type { DashboardSummaryResponse } from '@/features/dashboard/types'

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await api.get<DashboardSummaryResponse>('/api/dashboard/summary/')
  return res.data
}
