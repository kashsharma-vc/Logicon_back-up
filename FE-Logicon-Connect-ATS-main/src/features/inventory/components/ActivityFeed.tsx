import { Activity } from "../dashboardData"
import { cn } from "@/lib/cn"
import { CheckCircle2, Upload, ClipboardList, AlertTriangle, Users } from "lucide-react"

const statusIconMap = {
  completed: { Icon: CheckCircle2, color: 'text-status-success' },
  uploaded: { Icon: Upload, color: 'text-brand-500' },
  submitted: { Icon: ClipboardList, color: 'text-status-info' },
  reported: { Icon: AlertTriangle, color: 'text-status-danger' },
  assigned: { Icon: Users, color: 'text-status-warning' },
}

interface ActivityFeedProps {
  activities: Activity[]
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border">
        <h2 className="text-base font-semibold text-app-heading">Recent Activity</h2>
        <p className="text-xs text-app-secondary mt-0.5">Live updates from your field teams</p>
      </div>
      <div className="p-4">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[1.625rem] top-3 bottom-3 w-px bg-app-border" />
          
          <div className="space-y-1">
            {activities.map((activity, idx) => {
              const { Icon, color } = statusIconMap[activity.status]
              return (
                <div key={activity.id} className="relative flex items-start gap-4 py-3 px-2 rounded-lg hover:bg-app-muted/60 transition-colors group">
                  {/* Avatar */}
                  <div className={cn("relative shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold z-10", activity.userColor)}>
                    {activity.userInitials}
                    <div className={cn("absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-app-surface flex items-center justify-center border-2 border-app-surface")}>
                      <Icon className={cn("w-2.5 h-2.5", color)} />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-app-text leading-snug">
                      <span className="font-semibold text-app-heading">{activity.user}</span>
                      {' '}{activity.action}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-app-secondary">{activity.project}</span>
                      <span className="text-xs text-app-subtle">·</span>
                      <span className="text-xs text-app-subtle">{activity.timestamp}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
