import { api } from '@/api/client'

export interface AssetVaultLoginLinkResponse {
  url: string
  expires_in: number
  expires_at: string
}

/**
 * Request a signed login link for Asset Vault SSO.
 * Logicon signs user context; Asset Vault owns role mapping and permissions.
 */
export async function getAssetVaultLoginLink(): Promise<AssetVaultLoginLinkResponse> {
  const res = await api.post('/api/integrations/asset-vault/login-link/')
  return res.data as AssetVaultLoginLinkResponse
}
