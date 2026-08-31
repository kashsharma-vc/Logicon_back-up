import { SiteProgress } from "../dashboardData"
import { cn } from "@/lib/cn"

interface ProgressBarAnimatedProps {
  value: number
  color: string
  label: string
}

function AnimatedProgressBar({ value, color, label }: ProgressBarAnimatedProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-app-secondary">{label}</span>
        <span className={cn("text-xs font-semibold", 
          value >= 80 ? 'text-status-success' : value >= 50 ? 'text-status-warning' : 'text-status-danger'
        )}>{value}%</span>
      </div>
      <div className="h-2 bg-app-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

interface SiteProgressCardProps {
  site: SiteProgress
}

export function SiteProgressCard({ site }: SiteProgressCardProps) {
  const overallColor = 
    site.overall >= 80 ? 'text-status-success' : 
    site.overall >= 50 ? 'text-status-warning' : 
    'text-status-danger'

  return (
    <div className="bg-app-surface border border-app-border rounded-xl p-5 shadow-panel hover:shadow-md transition-all duration-200 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-app-heading leading-tight">{site.siteName}</h3>
          <p className="text-xs text-app-secondary mt-0.5">Site Progress Overview</p>
        </div>
        <div className={cn("text-2xl font-bold tracking-tight", overallColor)}>
          {site.overall}%
        </div>
      </div>
      
      {/* Overall radial-style indicator */}
      <div className="h-2 bg-app-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all duration-700",
            site.overall >= 80 ? 'bg-status-success' : site.overall >= 50 ? 'bg-status-warning' : 'bg-status-danger'
          )}
          style={{ width: `${site.overall}%` }}
        />
      </div>

      <div className="space-y-2.5">
        <AnimatedProgressBar value={site.civil} label="Civil Work" color="bg-brand-500" />
        <AnimatedProgressBar value={site.electrical} label="Electrical" color="bg-status-warning" />
        <AnimatedProgressBar value={site.mechanical} label="Mechanical" color="bg-status-attention" />
        <AnimatedProgressBar value={site.finishing} label="Finishing" color="bg-status-info" />
        <AnimatedProgressBar value={site.safety} label="Safety" color="bg-status-success" />
        <AnimatedProgressBar value={site.quality} label="Quality" color="bg-status-hired" />
      </div>
    </div>
  )
}
