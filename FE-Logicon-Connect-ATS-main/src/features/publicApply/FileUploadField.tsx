import { useMemo } from 'react'
import { Upload } from 'lucide-react'
import { cn } from '@/lib/cn'
import { t } from '@/features/publicApply/i18n'
import { validateFileBasic } from '@/features/publicApply/validation'
import type { LangCode } from '@/features/publicApply/types'

export function FileUploadField({
  id,
  label,
  lang,
  file,
  required,
  errorKey,
  disabled,
  onChange,
}: {
  id: string
  label: string
  lang: LangCode
  file: File | null
  required?: boolean
  errorKey?: string | null
  disabled?: boolean
  onChange: (file: File | null, errorKey: string | null) => void
}) {
  const fileSizeKb = useMemo(() => {
    if (!file) return null
    return Math.max(1, Math.round(file.size / 1024))
  }, [file])

  return (
    <div className="flex flex-col gap-1">
      <p className="text-sm font-medium text-app-secondary">
        {label} {required ? <span className="text-status-danger">*</span> : null}
      </p>
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-panel border-2 border-dashed p-6 transition hover:bg-app-muted',
          errorKey ? 'border-status-danger' : 'border-app-border',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <Upload className="h-7 w-7 text-app-subtle" aria-hidden />
        {file ? (
          <div className="text-center">
            <p className="text-sm font-medium text-app-text">{file.name}</p>
            <p className="text-xs text-app-secondary">{fileSizeKb} KB</p>
          </div>
        ) : (
          <p className="text-sm text-app-secondary">{t(lang, 'tapToUpload')}</p>
        )}
        <input
          id={id}
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null
            if (!f) {
              onChange(null, null)
              return
            }
            const err = validateFileBasic(f)
            onChange(f, err)
          }}
        />
      </label>
      {errorKey ? (
        <p className="text-sm text-status-danger" role="alert">
          {t(lang, errorKey as Parameters<typeof t>[1])}
        </p>
      ) : null}
    </div>
  )
}
