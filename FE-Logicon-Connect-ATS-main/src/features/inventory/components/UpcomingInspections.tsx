import { Inspection } from "../dashboardData"
import { cn } from "@/lib/cn"
import { Calendar, Clock, User, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"

const statusConfig = {
  scheduled: { label: 'Scheduled', icon: Calendar, className: 'bg-brand-500/10 text-brand-500' },
  'in-progress': { label: 'In Progress', icon: Loader2, className: 'bg-status-info/10 text-status-info' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-status-success/10 text-status-success' },
  overdue: { label: 'Overdue', icon: AlertCircle, className: 'bg-status-danger/10 text-status-danger' },
}

const priorityConfig = {
  high: 'bg-status-danger/10 text-status-danger border-status-danger/20',
  medium: 'bg-status-warning/10 text-status-warning border-status-warning/20',
  low: 'bg-status-success/10 text-status-success border-status-success/20',
}

export function UpcomingInspections({ inspections }: { inspections: Inspection[] }) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-app-heading">Upcoming Inspections</h2>
          <p className="text-xs text-app-secondary mt-0.5">{inspections.length} inspections scheduled</p>
        </div>
        <button className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors">View All</button>
      </div>
      <div className="divide-y divide-app-border">
        {inspections.map(ins => {
          const { label, icon: StatusIcon, className } = statusConfig[ins.status]
          return (
            <div key={ins.id} className="p-4 hover:bg-app-muted/60 transition-colors group">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-app-heading">{ins.project}</h3>
                  <p className="text-xs text-app-secondary mt-0.5">{ins.site}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full border capitalize", priorityConfig[ins.priority])}>
                    {ins.priority}
                  </span>
                  <span className={cn("flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full", className)}>
                    <StatusIcon className="w-3 h-3" />
                    {label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-app-secondary mb-3">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{new Date(ins.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{ins.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>{ins.inspector}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{ins.type}</span>
                </div>
              </div>
              <button className="w-full py-1.5 text-xs font-medium text-brand-500 bg-app-accent hover:bg-brand-500/15 rounded-lg transition-colors border border-brand-500/20">
                View Details
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
