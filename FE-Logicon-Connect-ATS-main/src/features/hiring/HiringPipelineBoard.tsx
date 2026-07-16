import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { HiringPipelineColumn } from '@/features/hiring/HiringPipelineColumn'
import { groupApplicationsByStage } from '@/features/hiring/hiringPipelineUtils'
import type { HiringApplicationRow, PipelineStageRow } from '@/features/hiring/types'

/** Width of the left/right "hot zone" near the board edge that triggers auto-scroll while dragging. */
const EDGE_ZONE_PX = 80
/** Max horizontal scroll (px) per animation frame when the cursor is right at the edge. */
const MAX_SCROLL_PER_FRAME = 18
/** Min nonzero scroll per frame — keeps motion smooth when cursor is just inside the zone. */
const MIN_SCROLL_PER_FRAME = 3

export function HiringPipelineBoard({
  stages,
  applications,
  canMove,
  onMove,
  onDropApplication,
  highlightedAppId,
}: {
  stages: PipelineStageRow[]
  applications: HiringApplicationRow[]
  canMove: boolean
  onMove: (app: HiringApplicationRow) => void
  onDropApplication: (appId: number, targetStageId: number) => void
  highlightedAppId?: number | null
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const velocityRef = useRef(0)

  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 1)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  // Recompute scroll-button visibility on mount, resize, and whenever the contents change.
  useLayoutEffect(() => {
    updateScrollState()
  }, [updateScrollState, stages.length, applications.length])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => updateScrollState()
    el.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(() => updateScrollState())
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [updateScrollState])

  const stopAutoScroll = useCallback(() => {
    velocityRef.current = 0
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const ensureLoop = useCallback(() => {
    if (rafRef.current != null) return
    const tick = () => {
      const el = scrollRef.current
      const v = velocityRef.current
      if (!el || v === 0) {
        rafRef.current = null
        return
      }
      const before = el.scrollLeft
      el.scrollLeft = before + v
      // Stop if we hit either end so we don't burn frames pinned at 0 / max.
      if (el.scrollLeft === before) {
        rafRef.current = null
        velocityRef.current = 0
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      const el = scrollRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX
      const distLeft = x - rect.left
      const distRight = rect.right - x

      let velocity = 0
      if (distLeft >= 0 && distLeft < EDGE_ZONE_PX) {
        const intensity = 1 - distLeft / EDGE_ZONE_PX // 0 .. 1 (1 at the edge)
        velocity = -Math.max(MIN_SCROLL_PER_FRAME, Math.round(intensity * MAX_SCROLL_PER_FRAME))
      } else if (distRight >= 0 && distRight < EDGE_ZONE_PX) {
        const intensity = 1 - distRight / EDGE_ZONE_PX
        velocity = Math.max(MIN_SCROLL_PER_FRAME, Math.round(intensity * MAX_SCROLL_PER_FRAME))
      }

      velocityRef.current = velocity
      if (velocity !== 0) ensureLoop()
      else stopAutoScroll()
    },
    [ensureLoop, stopAutoScroll],
  )

  const handleDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      const next = e.relatedTarget as Node | null
      if (!next || !scrollRef.current?.contains(next)) {
        stopAutoScroll()
      }
    },
    [stopAutoScroll],
  )

  // Always halt the loop when any drag ends, regardless of where it ended.
  useEffect(() => {
    const stop = () => stopAutoScroll()
    window.addEventListener('dragend', stop)
    window.addEventListener('drop', stop)
    return () => {
      window.removeEventListener('dragend', stop)
      window.removeEventListener('drop', stop)
      stopAutoScroll()
    }
  }, [stopAutoScroll])

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollRef.current
    if (!el) return
    const step = Math.max(240, Math.floor(el.clientWidth * 0.8)) * dir
    el.scrollBy({ left: step, behavior: 'smooth' })
  }, [])

  if (stages.length === 0) {
    return (
      <EmptyState
        title="No pipeline stages configured"
        description="Set up hiring pipeline stages to use this board."
      />
    )
  }

  const grouped = groupApplicationsByStage(applications, stages)

  return (
    <div className="relative h-full min-w-0">
      <div
        ref={scrollRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={() => stopAutoScroll()}
        className="h-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden pb-4"
      >
        <div className="flex h-full min-w-max gap-3 pr-4">
          {stages.map((stage) => (
            <HiringPipelineColumn
              key={stage.id}
              stage={stage}
              applications={grouped.get(stage.id) ?? []}
              canMove={canMove}
              onMove={onMove}
              onDropApplication={onDropApplication}
              highlightedAppId={highlightedAppId}
            />
          ))}
        </div>
      </div>

      <ScrollEdgeButton
        side="left"
        visible={canScrollLeft}
        onClick={() => scrollByPage(-1)}
      />
      <ScrollEdgeButton
        side="right"
        visible={canScrollRight}
        onClick={() => scrollByPage(1)}
      />
    </div>
  )
}

function ScrollEdgeButton({
  side,
  visible,
  onClick,
}: {
  side: 'left' | 'right'
  visible: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={onClick}
      aria-label={side === 'left' ? 'Scroll left' : 'Scroll right'}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        'absolute top-1/2 z-20 h-9 min-h-0 w-9 -translate-y-1/2 rounded-full p-0 shadow-panel transition-opacity',
        side === 'left' ? 'left-1' : 'right-1',
        visible ? 'opacity-90 hover:opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      {side === 'left' ? (
        <ChevronLeft className="h-4 w-4" aria-hidden />
      ) : (
        <ChevronRight className="h-4 w-4" aria-hidden />
      )}
    </Button>
  )
}
