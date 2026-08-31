import { useEffect, useState } from 'react'
import {
  Banknote,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  IndianRupee,
  Loader2,
  Send,
  StickyNote,
  User,
  XCircle,
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/authStore'
import { CAP, hasAnyCapability } from '@/lib/capabilities'
import {
  acceptOffer,
  createOffer,
  declineOffer,
  expireOffer,
  releaseOffer,
  updateOffer,
  withdrawOffer,
} from '@/api/hiring'
import { parseApiError } from '@/lib/apiError'
import { cn } from '@/lib/cn'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Input } from '@/components/ui/Input'
import type { OfferRow } from '@/features/hiring/types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return s
  }
}

function offerStatusVariant(s: string): 'neutral' | 'info' | 'success' | 'danger' | 'warning' | 'attention' {
  if (s === 'draft') return 'neutral'
  if (s === 'released') return 'info'
  if (s === 'accepted') return 'success'
  if (s === 'declined') return 'danger'
  if (s === 'withdrawn') return 'attention'
  if (s === 'expired') return 'warning'
  return 'neutral'
}

function getStatusIcon(s: string) {
  if (s === 'draft') return <FileText className="h-5 w-5" />
  if (s === 'released') return <Send className="h-5 w-5" />
  if (s === 'accepted') return <CheckCircle2 className="h-5 w-5" />
  if (s === 'declined') return <XCircle className="h-5 w-5" />
  if (s === 'withdrawn') return <XCircle className="h-5 w-5" />
  if (s === 'expired') return <Clock className="h-5 w-5" />
  return <FileText className="h-5 w-5" />
}

function getStatusColor(s: string) {
  if (s === 'draft') return 'bg-app-muted text-app-secondary'
  if (s === 'released') return 'bg-status-info/10 text-status-info'
  if (s === 'accepted') return 'bg-status-hired/10 text-status-hired'
  if (s === 'declined') return 'bg-status-danger/10 text-status-danger'
  if (s === 'withdrawn') return 'bg-status-attention/10 text-status-attention'
  if (s === 'expired') return 'bg-status-warning/10 text-status-warning'
  return 'bg-app-muted text-app-secondary'
}

// ─── Section Component ───────────────────────────────────────────────────────

function OfferSection({
  icon,
  iconBg,
  title,
  children,
  defaultOpen = true,
  collapsible = false,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  collapsible?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-sm">
      <button
        type="button"
        onClick={() => collapsible && setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between gap-3 border-b border-app-border bg-gradient-to-r from-app-muted/40 to-app-surface px-4 py-3',
          collapsible && 'cursor-pointer hover:bg-app-muted/50',
          !collapsible && 'cursor-default',
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>{icon}</div>
          <h3 className="text-sm font-semibold text-app-heading">{title}</h3>
        </div>
        {collapsible && (
          <div className="text-app-subtle">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        )}
      </button>
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  )
}

// ─── Info Row ────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  value,
  highlight,
}: {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
        highlight ? 'bg-brand-50/50 dark:bg-brand-950/20' : 'hover:bg-app-muted/30',
      )}
    >
      {icon && <div className="mt-0.5 text-app-subtle">{icon}</div>}
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-xs font-medium text-app-subtle">{label}</span>
        <span className="text-sm text-app-text">{value ?? '-'}</span>
      </div>
    </div>
  )
}

// ─── Action Card ─────────────────────────────────────────────────────────────

function ActionCard({
  icon,
  iconBg,
  title,
  description,
  buttonLabel,
  buttonVariant,
  isActive,
  onToggle,
  onConfirm,
  busy,
  error,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
  buttonLabel: string
  buttonVariant?: 'primary' | 'danger' | 'secondary'
  isActive: boolean
  onToggle: () => void
  onConfirm: (note: string) => void
  busy: boolean
  error: string | null
}) {
  const [note, setNote] = useState('')

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        isActive
          ? 'border-brand-300 bg-gradient-to-b from-brand-50/50 to-app-surface shadow-sm dark:border-brand-700 dark:from-brand-950/20'
          : 'border-app-border bg-app-surface hover:border-app-border/80',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 text-left"
        disabled={busy}
      >
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconBg)}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-app-heading">{title}</p>
          <p className="text-xs text-app-subtle">{description}</p>
        </div>
        <div className="text-app-subtle">
          {isActive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isActive && (
        <div className="border-t border-app-border bg-app-muted/20 p-3 space-y-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-app-secondary">Add a note (optional)</label>
            <textarea
              className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
              rows={2}
              placeholder="Enter any notes about this action..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-status-danger/10 px-3 py-2 text-xs text-status-danger">{error}</div>
          )}

          <Button
            type="button"
            variant={buttonVariant ?? 'primary'}
            className="w-full min-h-10 rounded-lg gap-2"
            disabled={busy}
            onClick={() => onConfirm(note.trim())}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── OfferFormDrawer ─────────────────────────────────────────────────────────

export function OfferFormDrawer({
  open,
  onClose,
  applicationId,
  offer,
  defaultCtc,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  applicationId?: number
  offer?: OfferRow | null
  defaultCtc?: string | null
  onSuccess: (updated: OfferRow) => void
}) {
  const meCaps = useAuthStore((s) => s.me?.capabilities ?? [])
  const canCreate = hasAnyCapability(meCaps, [CAP.OFFER_CREATE])
  const canUpdate = hasAnyCapability(meCaps, [CAP.OFFER_UPDATE])
  const canRelease = hasAnyCapability(meCaps, [CAP.OFFER_APPROVE, CAP.OFFER_MANAGE])
  const canWithdrawExpire = hasAnyCapability(meCaps, [CAP.OFFER_MANAGE])

  const isCreate = !offer
  const isDraft = offer?.status === 'draft'
  const isReleased = offer?.status === 'released'

  const [ctc, setCtc] = useState('')
  const [joiningDate, setJoiningDate] = useState('')
  const [notes, setNotes] = useState('')
  const [appId, setAppId] = useState('')

  const [saveBusy, setSaveBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionErrors, setActionErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) {
      if (offer?.offered_ctc != null) {
        setCtc(String(offer.offered_ctc))
      } else if (defaultCtc != null && defaultCtc !== '') {
        setCtc(defaultCtc)
      } else {
        setCtc('')
      }
      setJoiningDate(offer?.joining_date ?? '')
      setNotes(offer?.notes ?? '')
      setAppId(applicationId ? String(applicationId) : '')
      setSaveError(null)
      setActiveAction(null)
      setActionErrors({})
    }
  }, [open, offer, applicationId, defaultCtc])

  async function handleSave() {
    const ctcNum = parseFloat(ctc)
    if (!Number.isFinite(ctcNum) || ctcNum < 0.01) {
      setSaveError('Enter a valid CTC (minimum 0.01).')
      return
    }
    setSaveBusy(true)
    setSaveError(null)
    try {
      let result: OfferRow
      if (isCreate) {
        const aid = applicationId ?? parseInt(appId, 10)
        if (!Number.isFinite(aid)) {
          setSaveError('Enter a valid application ID.')
          setSaveBusy(false)
          return
        }
        result = await createOffer({
          hiring_application: aid,
          offered_ctc: ctcNum,
          joining_date: joiningDate || undefined,
          notes: notes.trim() || undefined,
        })
      } else {
        result = await updateOffer(offer!.id, {
          offered_ctc: ctcNum,
          joining_date: joiningDate || undefined,
          notes: notes.trim() || undefined,
        })
      }
      onSuccess(result)
      onClose()
    } catch (e: unknown) {
      setSaveError(parseApiError(e, 'Could not save offer').message)
    } finally {
      setSaveBusy(false)
    }
  }

  async function doAction(action: string, note: string) {
    if (!offer) return
    setActionBusy(true)
    setActionErrors((prev) => ({ ...prev, [action]: '' }))
    try {
      const payload = { note }
      let result: OfferRow
      if (action === 'release') result = await releaseOffer(offer.id, payload)
      else if (action === 'accept') result = await acceptOffer(offer.id, payload)
      else if (action === 'decline') result = await declineOffer(offer.id, payload)
      else if (action === 'withdraw') result = await withdrawOffer(offer.id, payload)
      else if (action === 'expire') result = await expireOffer(offer.id, payload)
      else return
      onSuccess(result)
      onClose()
    } catch (e: unknown) {
      setActionErrors((prev) => ({
        ...prev,
        [action]: parseApiError(e, `Could not ${action} offer`).message,
      }))
    } finally {
      setActionBusy(false)
    }
  }

  const title = isCreate ? 'Create Offer' : 'Manage Offer'
  const description = isCreate
    ? 'Create a new offer for this application'
    : `Offer #${offer!.id} • View details and take actions`

  const showEditForm = (isCreate && canCreate) || (isDraft && canUpdate)
  const hasActions =
    (isDraft && canRelease) ||
    (isReleased && canUpdate) ||
    ((isDraft || isReleased || offer?.status === 'accepted' || offer?.status === 'declined') && canWithdrawExpire) ||
    ((isReleased || offer?.status === 'accepted') && canWithdrawExpire)

  return (
    <Drawer
      open={open}
      onClose={() => !saveBusy && !actionBusy && onClose()}
      title={title}
      description={description}
    >
      <div className="space-y-4">
        {/* Status Header (when viewing existing offer) */}
        {offer && (
          <div
            className={cn(
              'flex items-center gap-4 rounded-xl border p-4',
              offer.status === 'accepted'
                ? 'border-status-hired/30 bg-gradient-to-r from-status-hired/10 to-status-hired/5'
                : offer.status === 'declined'
                  ? 'border-status-danger/30 bg-gradient-to-r from-status-danger/10 to-status-danger/5'
                  : offer.status === 'released'
                    ? 'border-status-info/30 bg-gradient-to-r from-status-info/10 to-status-info/5'
                    : 'border-app-border bg-gradient-to-r from-app-muted/30 to-app-surface',
            )}
          >
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl', getStatusColor(offer.status))}>
              {getStatusIcon(offer.status)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge variant={offerStatusVariant(offer.status)} className="text-xs font-medium uppercase">
                  {offer.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-app-secondary">
                {offer.status === 'draft' && 'Offer is in draft. Release it to notify the candidate.'}
                {offer.status === 'released' && 'Offer has been released and awaiting response.'}
                {offer.status === 'accepted' && 'Candidate has accepted this offer!'}
                {offer.status === 'declined' && 'Candidate declined this offer.'}
                {offer.status === 'withdrawn' && 'This offer has been withdrawn.'}
                {offer.status === 'expired' && 'This offer has expired.'}
              </p>
            </div>
          </div>
        )}

        {/* Offer Details Section */}
        {offer && (
          <OfferSection
            icon={<Banknote className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
            iconBg="bg-brand-100 dark:bg-brand-900/40"
            title="Offer Details"
          >
            <div className="space-y-1 -mx-1">
              <InfoRow
                icon={<IndianRupee className="h-4 w-4" />}
                label="Offered CTC"
                value={
                  offer.offered_ctc != null ? (
                    <span className="font-semibold text-app-heading">
                      ₹ {Number(offer.offered_ctc).toLocaleString('en-IN')}
                    </span>
                  ) : (
                    '-'
                  )
                }
                highlight
              />
              <InfoRow
                icon={<Calendar className="h-4 w-4" />}
                label="Joining Date"
                value={fmtDate(offer.joining_date)}
              />
              <InfoRow
                icon={<User className="h-4 w-4" />}
                label="Released By"
                value={offer.released_by_username ?? '-'}
              />
              <InfoRow
                icon={<Clock className="h-4 w-4" />}
                label="Released At"
                value={fmtDate(offer.released_at)}
              />
              {offer.accepted_at && (
                <InfoRow
                  icon={<CheckCircle2 className="h-4 w-4 text-status-hired" />}
                  label="Accepted At"
                  value={fmtDate(offer.accepted_at)}
                />
              )}
              {offer.declined_at && (
                <InfoRow
                  icon={<XCircle className="h-4 w-4 text-status-danger" />}
                  label="Declined At"
                  value={fmtDate(offer.declined_at)}
                />
              )}
              {offer.notes && (
                <InfoRow icon={<StickyNote className="h-4 w-4" />} label="Notes" value={offer.notes} />
              )}
            </div>
          </OfferSection>
        )}

        {/* Create / Edit Form */}
        {showEditForm && (
          <OfferSection
            icon={<FileText className="h-4 w-4 text-status-info" />}
            iconBg="bg-status-info/10"
            title={isCreate ? 'New Offer' : 'Edit Offer'}
          >
            <div className="space-y-4">
              {isCreate && !applicationId && (
                <Input
                  id="of_appid"
                  label="Application ID"
                  type="number"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="Enter hiring application ID"
                />
              )}

              {isCreate && applicationId && (
                <div className="flex items-center gap-3 rounded-lg bg-app-muted/50 px-3 py-2.5">
                  <span className="text-xs font-medium text-app-subtle">Application</span>
                  <Badge variant="neutral" className="text-xs">
                    #{applicationId}
                  </Badge>
                </div>
              )}

              <Input
                id="of_ctc"
                label="Offered CTC (₹)"
                type="number"
                step="0.01"
                min="0.01"
                value={ctc}
                onChange={(e) => setCtc(e.target.value)}
                placeholder="e.g. 350000"
              />

              <div className="flex flex-col gap-1.5">
                <label htmlFor="of_join" className="text-sm font-medium text-app-secondary">
                  Joining Date
                </label>
                <input
                  id="of_join"
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="min-h-10 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="of_notes" className="text-sm font-medium text-app-secondary">
                  Notes
                </label>
                <textarea
                  id="of_notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Internal notes about this offer..."
                  className="min-h-[80px] rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-sm text-app-text placeholder:text-app-subtle focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 resize-none"
                />
              </div>

              {saveError && (
                <div className="rounded-lg bg-status-danger/10 px-3 py-2 text-sm text-status-danger">{saveError}</div>
              )}

              <Button
                type="button"
                className="w-full min-h-11 rounded-xl gap-2"
                disabled={saveBusy}
                onClick={() => void handleSave()}
              >
                {saveBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isCreate ? (
                  'Create Offer'
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </OfferSection>
        )}

        {/* Lifecycle Actions */}
        {offer && hasActions && (
          <OfferSection
            icon={<Send className="h-4 w-4 text-status-attention" />}
            iconBg="bg-status-attention/10"
            title="Actions"
            defaultOpen={true}
          >
            <div className="space-y-3">
              {/* Release */}
              {isDraft && canRelease && (
                <ActionCard
                  icon={<Send className="h-5 w-5 text-brand-600 dark:text-brand-400" />}
                  iconBg="bg-brand-100 dark:bg-brand-900/40"
                  title="Release Offer"
                  description="Send this offer to the candidate"
                  buttonLabel="Release Offer"
                  isActive={activeAction === 'release'}
                  onToggle={() => setActiveAction(activeAction === 'release' ? null : 'release')}
                  onConfirm={(note) => void doAction('release', note)}
                  busy={actionBusy}
                  error={actionErrors['release'] ?? null}
                />
              )}

              {/* Accept */}
              {isReleased && canUpdate && (
                <ActionCard
                  icon={<CheckCircle2 className="h-5 w-5 text-status-hired" />}
                  iconBg="bg-status-hired/10"
                  title="Accept Offer"
                  description="Record that the candidate accepted"
                  buttonLabel="Mark as Accepted"
                  isActive={activeAction === 'accept'}
                  onToggle={() => setActiveAction(activeAction === 'accept' ? null : 'accept')}
                  onConfirm={(note) => void doAction('accept', note)}
                  busy={actionBusy}
                  error={actionErrors['accept'] ?? null}
                />
              )}

              {/* Decline */}
              {isReleased && canUpdate && (
                <ActionCard
                  icon={<XCircle className="h-5 w-5 text-status-danger" />}
                  iconBg="bg-status-danger/10"
                  title="Decline Offer"
                  description="Record that the candidate declined"
                  buttonLabel="Mark as Declined"
                  buttonVariant="danger"
                  isActive={activeAction === 'decline'}
                  onToggle={() => setActiveAction(activeAction === 'decline' ? null : 'decline')}
                  onConfirm={(note) => void doAction('decline', note)}
                  busy={actionBusy}
                  error={actionErrors['decline'] ?? null}
                />
              )}

              {/* Withdraw */}
              {(isDraft || isReleased || offer.status === 'accepted' || offer.status === 'declined') &&
                canWithdrawExpire && (
                  <ActionCard
                    icon={<XCircle className="h-5 w-5 text-status-attention" />}
                    iconBg="bg-status-attention/10"
                    title="Withdraw Offer"
                    description="Withdraw this offer from the candidate"
                    buttonLabel="Withdraw Offer"
                    buttonVariant="secondary"
                    isActive={activeAction === 'withdraw'}
                    onToggle={() => setActiveAction(activeAction === 'withdraw' ? null : 'withdraw')}
                    onConfirm={(note) => void doAction('withdraw', note)}
                    busy={actionBusy}
                    error={actionErrors['withdraw'] ?? null}
                  />
                )}

              {/* Expire */}
              {(isReleased || offer.status === 'accepted') && canWithdrawExpire && (
                <ActionCard
                  icon={<Clock className="h-5 w-5 text-status-warning" />}
                  iconBg="bg-status-warning/10"
                  title="Mark as Expired"
                  description="Mark this offer as expired"
                  buttonLabel="Mark Expired"
                  buttonVariant="secondary"
                  isActive={activeAction === 'expire'}
                  onToggle={() => setActiveAction(activeAction === 'expire' ? null : 'expire')}
                  onConfirm={(note) => void doAction('expire', note)}
                  busy={actionBusy}
                  error={actionErrors['expire'] ?? null}
                />
              )}
            </div>
          </OfferSection>
        )}

        {/* Final state message */}
        {offer && (offer.status === 'withdrawn' || offer.status === 'expired') && (
          <div className="rounded-xl border border-app-border bg-app-muted/30 p-4 text-center">
            <p className="text-sm text-app-subtle">No further actions available for this offer.</p>
          </div>
        )}
      </div>
    </Drawer>
  )
}
