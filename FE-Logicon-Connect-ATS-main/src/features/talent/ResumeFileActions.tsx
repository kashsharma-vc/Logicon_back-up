import { useState } from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { downloadAuthenticatedFile, openAuthenticatedFile } from '@/lib/fileDownload'
import { parseApiError } from '@/lib/apiError'
import { Button } from '@/components/ui/Button'
import type { ResumeRow } from '@/features/talent/types'

function resumeFilename(r: ResumeRow): string {
  if (r.original_filename?.trim()) return r.original_filename.trim()
  const ext = r.content_type?.includes('pdf') ? 'pdf' : 'bin'
  return `resume_${r.id}.${ext}`
}

export function ResumeFileActions({ resume }: { resume: ResumeRow }) {
  const [busy, setBusy] = useState<'download' | 'open' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const filePath = resume.file?.trim()
  const filename = resumeFilename(resume)

  if (!filePath) {
    return <span className="text-xs text-app-subtle">File not available</span>
  }

  async function run(action: 'download' | 'open') {
    setBusy(action)
    setError(null)
    try {
      if (action === 'download') await downloadAuthenticatedFile(filePath!, filename)
      else await openAuthenticatedFile(filePath!)
    } catch (e: unknown) {
      setError(parseApiError(e, action === 'download' ? 'Download failed' : 'Could not open file').message)
    } finally {
      setBusy(null)
    }
  }

  const disabled = busy !== null

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          className="min-h-8 gap-1.5 px-2.5 text-xs"
          disabled={disabled}
          onClick={() => void run('open')}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          {busy === 'open' ? 'Opening…' : 'Open'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="min-h-8 gap-1.5 px-2.5 text-xs"
          disabled={disabled}
          onClick={() => void run('download')}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {busy === 'download' ? 'Downloading…' : 'Download'}
        </Button>
      </div>
      {error ? <p className="max-w-[200px] text-right text-[11px] text-status-danger">{error}</p> : null}
    </div>
  )
}
