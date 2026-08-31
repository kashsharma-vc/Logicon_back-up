import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, MoveRight, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { hiringApplicationStatusLabel } from '@/features/talent/talentLabels'
import { statusBadgeVariant } from '@/features/hiring/hiringPipelineUtils'
import { applicationStageAction } from '@/features/hiring/hiringStageActions'
import type { HiringApplicationRow } from '@/features/hiring/types'

export function HiringPipelineCard({
  app,
  canMove,
  onMove,
  highlighted = false,
}: {
  app: HiringApplicationRow
  canMove: boolean
  onMove: (app: HiringApplicationRow) => void
  highlighted?: boolean
}) {
  const navigate = useNavigate()
  const [isDragging, setIsDragging] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (highlighted && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
    }
  }, [highlighted])

  const meta = [app.job_role_name, app.site_name, app.client_name].filter(Boolean).join(' · ')
  const action = applicationStageAction(app.status)

  function handleAction() {
    if (action.kind === 'convert') {
      navigate(`/hiring/applications/${app.id}?openConvert=1`)
    } else {
      navigate(`/hiring/applications/${app.id}`)
    }
  }

  return (
    <div
      ref={ref}
      draggable={canMove}
      onDragStart={(e) => {
        setIsDragging(true)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('application_id', String(app.id))
        e.dataTransfer.setData('from_stage_id', String(app.current_stage ?? ''))
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        'space-y-2 rounded-panel border bg-app-surface p-3 shadow-panel transition-all',
        canMove && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40',
        highlighted ? 'border-brand-500 ring-2 ring-brand-500/40' : 'border-app-border',
      )}
    >
      <div className="flex items-start gap-2">
        <Link
          to={`/hiring/applications/${app.id}`}
          className="min-w-0 flex-1 text-sm font-medium leading-tight text-app-text hover:text-brand-600"
          onClick={(e) => isDragging && e.preventDefault()}
        >
          {app.candidate_name ?? `Candidate #${app.candidate}`}
        </Link>
        <Badge variant={statusBadgeVariant(app.status)} className="shrink-0 text-[10px]">
          {hiringApplicationStatusLabel(app.status)}
        </Badge>
      </div>

      {app.candidate_phone ? (
        <div className="flex items-center gap-1 text-xs text-app-secondary">
          <Phone className="h-3 w-3 shrink-0" aria-hidden />
          {app.candidate_phone}
        </div>
      ) : null}

      {meta ? <p className="truncate text-xs text-app-secondary">{meta}</p> : null}

      <div className="flex flex-wrap items-center gap-1.5">
        {app.client_decision ? (
          <Badge
            variant={app.client_decision === 'approved' ? 'success' : app.client_decision === 'rejected' ? 'danger' : 'warning'}
            className="text-[10px] capitalize"
          >
            Client {app.client_decision}
          </Badge>
        ) : null}
        {app.offer_status ? (
          <Badge variant="neutral" className="text-[10px] capitalize">Offer {app.offer_status}</Badge>
        ) : null}
      </div>

      {/* Latest action — compact. Actionable states navigate to detail; passive states show a label. */}
      {action.kind !== 'none' ? (
        action.navigates ? (
          <Button
            type="button"
            variant={action.kind === 'convert' ? 'primary' : 'secondary'}
            onClick={handleAction}
            className="min-h-0 h-7 w-full gap-1 py-0 px-2 text-xs"
          >
            {action.label}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Button>
        ) : (
          <Badge variant={action.tone} className="text-[10px]">{action.label}</Badge>
        )
      ) : null}

      {canMove ? (
        <Button
          type="button"
          variant="ghost"
          onClick={() => onMove(app)}
          className="min-h-0 h-7 w-full gap-1 py-0 px-2 text-xs"
        >
          <MoveRight className="h-3 w-3" aria-hidden />
          Move
        </Button>
      ) : null}
    </div>
  )
}
