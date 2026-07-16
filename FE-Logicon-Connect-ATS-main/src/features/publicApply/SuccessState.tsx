import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { t } from '@/features/publicApply/i18n'
import type { LangCode } from '@/features/publicApply/types'

export function SuccessState({
  lang,
  campaignTitle,
  isDuplicate,
  onBack,
}: {
  lang: LangCode
  campaignTitle: string
  isDuplicate: boolean
  onBack: () => void
}) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-10">
      <div className="rounded-panel border border-app-border bg-app-surface p-6 shadow-panel">
        <h2 className="text-lg font-semibold text-app-text">{t(lang, 'successTitle')}</h2>
        <p className="mt-1 text-sm text-app-secondary">{t(lang, 'successDesc')}</p>
        <p className="mt-3 text-sm text-app-secondary">
          <span className="font-semibold text-app-text">{campaignTitle}</span>
        </p>
        {isDuplicate ? (
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="warning">Duplicate</Badge>
            <p className="text-sm text-app-secondary">{t(lang, 'duplicateWarning')}</p>
          </div>
        ) : null}
        <div className="mt-6">
          <Button variant="secondary" onClick={onBack}>
            {t(lang, 'backToHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}


