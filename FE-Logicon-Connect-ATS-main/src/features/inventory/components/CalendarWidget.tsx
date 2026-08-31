import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/cn"

// Highlights: Inspection dates, deadlines, meetings
const calendarEvents: Record<string, { type: 'inspection' | 'deadline' | 'meeting' | 'visit'; label: string }[]> = {
  '2026-07-08': [{ type: 'inspection', label: 'Safety Audit' }],
  '2026-07-09': [{ type: 'inspection', label: 'Structural Check' }, { type: 'meeting', label: 'Team Sync' }],
  '2026-07-12': [{ type: 'deadline', label: 'Phase 2 Due' }],
  '2026-07-15': [{ type: 'meeting', label: 'Client Review' }],
  '2026-07-18': [{ type: 'visit', label: 'Site Visit' }],
  '2026-07-20': [{ type: 'deadline', label: 'Metro Bridge' }],
  '2026-07-22': [{ type: 'inspection', label: 'Quality Audit' }],
  '2026-07-25': [{ type: 'meeting', label: 'Monthly Review' }],
}

const eventColors = {
  inspection: 'bg-brand-500 text-white',
  deadline: 'bg-status-danger text-white',
  meeting: 'bg-status-success text-white',
  visit: 'bg-status-warning text-white',
}

export function CalendarWidget() {
  const today = new Date(2026, 6, 8) // July 8, 2026 (months are 0-indexed)
  const [viewDate, setViewDate] = useState(today)
  const [selectedDate, setSelectedDate] = useState<Date | null>(today)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthName = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const blanks = Array.from({ length: firstDay }, (_, i) => i)

  const getKey = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const selectedKey = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : null

  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-app-heading">Calendar</h2>
          <p className="text-xs text-app-secondary mt-0.5">{monthName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-app-muted rounded-md text-app-secondary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-app-muted rounded-md text-app-secondary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
            <div key={d} className="text-center text-xs font-medium text-app-subtle py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {blanks.map(b => <div key={`blank-${b}`} />)}
          {days.map(day => {
            const key = getKey(day)
            const events = calendarEvents[key] || []
            const isToday = key === todayKey
            const isSelected = key === selectedKey

            return (
              <button
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={cn(
                  "aspect-square flex flex-col items-center justify-start p-1 rounded-lg text-xs transition-all relative group",
                  isToday && !isSelected ? "bg-brand-500/10 font-bold text-brand-600" : "",
                  isSelected ? "bg-brand-500 text-white font-bold" : "hover:bg-app-muted text-app-text",
                  events.length > 0 && !isSelected ? "font-medium" : ""
                )}
              >
                <span>{day}</span>
                {events.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {events.slice(0, 2).map((ev, i) => (
                      <span key={i} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white/70" : eventColors[ev.type].split(' ')[0])} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-3 border-t border-app-border grid grid-cols-2 gap-2">
          {[
            { type: 'inspection' as const, label: 'Inspection' },
            { type: 'deadline' as const, label: 'Deadline' },
            { type: 'meeting' as const, label: 'Meeting' },
            { type: 'visit' as const, label: 'Site Visit' },
          ].map(item => (
            <div key={item.type} className="flex items-center gap-1.5">
              <span className={cn("w-2 h-2 rounded-full", eventColors[item.type].split(' ')[0])} />
              <span className="text-xs text-app-secondary">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Selected date events */}
        {selectedKey && calendarEvents[selectedKey] && (
          <div className="mt-3 pt-3 border-t border-app-border space-y-1">
            <p className="text-xs font-semibold text-app-heading mb-2">
              {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            {calendarEvents[selectedKey].map((ev, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", eventColors[ev.type].split(' ')[0])} />
                <span className="text-xs text-app-text">{ev.label}</span>
                <span className="text-xs text-app-subtle ml-auto capitalize">{ev.type}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
