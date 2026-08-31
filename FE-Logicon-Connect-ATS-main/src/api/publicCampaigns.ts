import { publicApi } from '@/api/publicClient'
import type { PublicCampaign } from '@/features/publicApply/types'

export async function getPublicCampaignByToken(token: string): Promise<PublicCampaign> {
  const res = await publicApi.get(`/api/public/campaigns/${encodeURIComponent(token)}/`)
  return res.data as PublicCampaign
}


