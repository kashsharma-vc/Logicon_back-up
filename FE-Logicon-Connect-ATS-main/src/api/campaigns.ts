import { api } from '@/api/client'
import { unwrapDrfResults } from '@/types/api'
import type { CampaignRow, CampaignWriteInput } from '@/features/campaigns/types'

export interface ListCampaignsParams {
  search?: string
  is_active?: boolean
  site?: number
  page?: number
}

export async function listCampaigns(params: ListCampaignsParams): Promise<{ items: CampaignRow[]; count?: number }> {
  const res = await api.get('/api/intake/campaigns/', { params })
  return unwrapDrfResults<CampaignRow>(res.data)
}

export async function getCampaign(id: number): Promise<CampaignRow> {
  const res = await api.get(`/api/intake/campaigns/${id}/`)
  return res.data as CampaignRow
}

export async function createCampaign(payload: CampaignWriteInput): Promise<CampaignRow> {
  const res = await api.post('/api/intake/campaigns/', payload)
  return res.data as CampaignRow
}

export async function updateCampaign(id: number, payload: Partial<CampaignWriteInput>): Promise<CampaignRow> {
  const res = await api.patch(`/api/intake/campaigns/${id}/`, payload)
  return res.data as CampaignRow
}

export async function deleteCampaign(id: number): Promise<void> {
  await api.delete(`/api/intake/campaigns/${id}/`)
}

function parseContentDispositionFilename(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  // Examples:
  // attachment; filename="qr_xxx.png"
  const m = /filename="([^"]+)"/i.exec(value)
  if (m?.[1]) return m[1]
  const m2 = /filename=([^;]+)/i.exec(value)
  if (m2?.[1]) return m2[1].trim()
  return undefined
}

export async function downloadCampaignQrPng(id: number): Promise<{
  blob: Blob
  filename?: string
  applyUrl?: string
  campaignTitle?: string
}> {
  const res = await api.get(`/api/intake/campaigns/${id}/qrcode/`, {
    responseType: 'blob',
  })

  const contentDisposition =
    (res.headers['content-disposition'] as string | undefined) ??
    (res.headers['Content-Disposition'] as string | undefined)
  const filename = parseContentDispositionFilename(contentDisposition)

  const applyUrl = (res.headers['x-apply-url'] as string | undefined) ?? (res.headers['X-Apply-URL'] as string | undefined)
  const campaignTitle =
    (res.headers['x-campaign-title'] as string | undefined) ?? (res.headers['X-Campaign-Title'] as string | undefined)

  return { blob: res.data as Blob, filename, applyUrl, campaignTitle }
}


