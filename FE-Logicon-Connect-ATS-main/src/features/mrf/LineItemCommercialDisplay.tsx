import { Badge } from '@/components/ui/Badge'
import {
  formatCommercialMoney,
  formatMasterCommercialSummary,
  formatRequestedCommercialSummary,
  formatWageRange,
  isCommercialOverrideEnabled,
  resolveMasterCommercials,
  type CommercialLineItemFields,
} from '@/features/mrf/mrfCommercialOverride'

/** Compact wage/commercial column for line item tables. */
export function LineItemCommercialDisplay({
  row,
  isBillable,
  wageCategoryLabel,
}: {
  row: CommercialLineItemFields
  isBillable: boolean
  wageCategoryLabel?: string | null
}) {
  if (!isBillable) {
    return (
      <span>
        {wageCategoryLabel ? (
          <>
            {wageCategoryLabel}
            {row.wage_min_requested || row.wage_max_requested ? (
              <span className="text-app-subtle">
                {' '}
                - {row.wage_min_requested ?? '?'}-{row.wage_max_requested ?? '?'}
              </span>
            ) : null}
          </>
        ) : (
          <span>
            {row.wage_min_requested || row.wage_max_requested ? (
              <span>
                {row.wage_min_requested ?? '?'}-{row.wage_max_requested ?? '?'}
              </span>
            ) : (
              '-'
            )}
          </span>
        )}
      </span>
    )
  }

  const master = resolveMasterCommercials(row, null)
  const overridden = isCommercialOverrideEnabled(row)

  if (!overridden) {
    return (
      <div className="space-y-1">
        <Badge variant="neutral">From SRR/master</Badge>
        <p className="tabular-nums text-app-secondary">
          {formatWageRange(
            row.effective_wage_min ?? row.wage_min_requested ?? master.wageMin,
            row.effective_wage_max ?? row.wage_max_requested ?? master.wageMax,
          ) ?? '—'}
        </p>
        {(row.billing_rate_snapshot ?? master.billingRate) ? (
          <p className="text-[10px] text-app-subtle">
            Billing {formatCommercialMoney(row.billing_rate_snapshot ?? master.billingRate)}
          </p>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <Badge variant="warning">Commercial override</Badge>
      <p className="text-[10px] text-app-subtle">
        Master: {formatMasterCommercialSummary(master)}
      </p>
      <p className="tabular-nums text-app-text">Requested: {formatRequestedCommercialSummary(row)}</p>
      {row.commercial_override_reason ? (
        <p className="line-clamp-2 text-[10px] text-app-secondary" title={row.commercial_override_reason}>
          {row.commercial_override_reason}
        </p>
      ) : null}
    </div>
  )
}
