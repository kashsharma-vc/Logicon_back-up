import { api } from '@/api/client'
import type { PublicProposalResponse, PublicProposalResponseSubmit } from '@/types/sales'

/**
 * Public proposal response endpoints — no auth header required.
 * The token is embedded in the URL path, not the Authorization header.
 */

export async function getPublicProposalResponse(token: string): Promise<PublicProposalResponse> {
  const { data } = await api.get<PublicProposalResponse>(
    `/api/sales/public/proposal-response/${token}/`,
  )
  return data
}

export async function submitPublicProposalResponse(
  token: string,
  payload: PublicProposalResponseSubmit,
): Promise<PublicProposalResponse> {
  const { data } = await api.post<PublicProposalResponse>(
    `/api/sales/public/proposal-response/${token}/`,
    payload,
  )
  return data
}
