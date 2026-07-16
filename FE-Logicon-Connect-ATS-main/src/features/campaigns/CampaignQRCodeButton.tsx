import { useState } from 'react'
import { Download, Link as LinkIcon } from 'lucide-react'
import { downloadCampaignQrPng } from '@/api/campaigns'
import { Button } from '@/components/ui/Button'
import type { CampaignRow } from '@/features/campaigns/types'

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function CampaignQRCodeButton({
  campaign,
  variant = 'full',
}: {
  campaign: CampaignRow
  variant?: 'full' | 'compact'
}) {
  const [downloading, setDownloading] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    setError(null)
    try {
      const res = await downloadCampaignQrPng(campaign.id)
      const filename = res.filename ?? `qr_${campaign.token.slice(0, 12)}.png`
      saveBlob(res.blob, filename)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'QR download failed')
    } finally {
      setDownloading(false)
    }
  }

  async function handleCopyApplyUrl() {
    setError(null)
    setCopied(false)
    setCopying(true)
    try {
      // Prefer server-provided header if readable; otherwise fallback.
      const res = await downloadCampaignQrPng(campaign.id)
      const applyUrl = res.applyUrl ?? `${window.location.origin}/apply/${campaign.token}`
      await navigator.clipboard.writeText(applyUrl)
      setCopied(true)
    } catch (e: unknown) {
      // Header may not be exposed; or clipboard may fail. Fallback to deterministic URL.
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/apply/${campaign.token}`)
        setCopied(true)
      } catch {
        setError(e instanceof Error ? e.message : 'Copy failed')
      }
    } finally {
      setCopying(false)
      window.setTimeout(() => setCopied(false), 900)
    }
  }

  const busy = downloading || copying

  if (variant === 'compact') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 w-9 px-0"
            onClick={handleCopyApplyUrl}
            disabled={busy}
            aria-label="Copy apply URL"
            title={copied ? 'Copied' : 'Copy apply URL'}
          >
            <LinkIcon className="h-4 w-4" aria-hidden />
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-9 w-9 px-0"
            onClick={handleDownload}
            disabled={busy}
            aria-label="Download QR PNG"
            title="Download QR PNG"
          >
            <Download className="h-4 w-4" aria-hidden />
          </Button>
        </div>
        {error ? <p className="text-xs text-status-warning">{error}</p> : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-9 px-3"
          onClick={handleCopyApplyUrl}
          disabled={busy}
          title="Copy public apply link"
        >
          <LinkIcon className="mr-2 h-4 w-4" aria-hidden />
          {copied ? 'Copied' : copying ? 'Copying…' : 'Copy URL'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-9 px-3"
          onClick={handleDownload}
          disabled={busy}
          title="Download QR PNG"
        >
          <Download className="mr-2 h-4 w-4" aria-hidden />
          {downloading ? 'Downloading…' : 'QR PNG'}
        </Button>
      </div>
      {error ? <p className="text-xs text-status-warning">{error}</p> : null}
    </div>
  )
}


