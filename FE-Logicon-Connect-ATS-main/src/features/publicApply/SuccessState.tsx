import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { t } from '@/features/publicApply/i18n'
import type { LangCode } from '@/features/publicApply/types'

export function SuccessState({
  lang,
  campaignTitle,
  isDuplicate,
}: {
  lang: LangCode
  campaignTitle: string
  isDuplicate?: boolean
  onBack?: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10">
      <div className="rounded-panel border border-app-border bg-app-surface p-6 text-center shadow-panel">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-app-text">{t(lang, 'successTitle')}</h2>
        <p className="mt-2 text-sm text-app-secondary">{t(lang, 'successDesc')}</p>
        <div className="mt-4 inline-block rounded-panel border border-app-border bg-app-muted px-4 py-2">
          <span className="text-sm font-semibold text-app-text">{campaignTitle}</span>
        </div>
        {isDuplicate ? (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Badge variant="warning">Duplicate</Badge>
            <p className="text-xs text-app-secondary">{t(lang, 'duplicateWarning')}</p>
          </div>
        ) : null}
        <div className="mt-6 rounded-panel border border-app-border/60 bg-app-muted/50 p-4 text-xs text-app-secondary">
          <p>Your application and resume have been securely received. Re-submissions with the same mobile number or email ID are disabled.</p>
        </div>
      </div>
    </div>
  )
}


