import { useEffect, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { getAssetVaultLoginLink, type AssetVaultLoginLinkResponse } from '@/api/integrations'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState } from '@/components/ui/ErrorState'

export function AssetVaultPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [linkData, setLinkData] = useState<AssetVaultLoginLinkResponse | null>(null)

  async function fetchLoginLink() {
    setLoading(true)
    setError(null)
    try {
      const res = await getAssetVaultLoginLink()
      setLinkData(res)
    } catch (e) {
      const parsed = parseApiError(e, 'Failed to get Asset Vault access')
      setError(parsed.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLoginLink()
  }, [])

  function openInNewTab() {
    if (linkData?.url) {
      window.open(linkData.url, '_blank', 'noopener,noreferrer')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Connecting to Asset Vault..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorState message={error} />
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => void fetchLoginLink()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (!linkData?.url) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <ErrorState message="No access URL returned from server." />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-app-border bg-app-surface px-4 py-3">
        <h1 className="text-lg font-semibold text-app-text">Asset Vault</h1>
        <div className="flex items-center gap-2">
          <Button onClick={openInNewTab}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Open Asset Vault
          </Button>
          <Button variant="secondary" className="min-h-9 px-3 text-sm" onClick={() => void fetchLoginLink()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh Link
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <iframe
          src={linkData.url}
          className="h-full w-full border-0"
          title="Asset Vault"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      <div className="border-t border-app-border bg-app-muted/30 px-4 py-2">
        <p className="text-xs text-app-subtle">
          If the content above does not load, use the "Open Asset Vault" button to access it in a new tab.
        </p>
      </div>
    </div>
  )
}
