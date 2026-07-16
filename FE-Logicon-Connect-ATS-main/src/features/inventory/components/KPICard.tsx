import { 
  Briefcase, MapPin, ClipboardCheck, Clock, CheckCircle2, AlertTriangle,
  Users, Shield, Star, Wrench, TrendingUp, FileText, 
  TrendingDown, Minus, AtSign
} from "lucide-react"
import { KPIData } from "../dashboardData"
import { cn } from "@/lib/cn"

const iconMap: Record<string, React.FC<any>> = {
  Briefcase, MapPin, ClipboardCheck, Clock, CheckCircle2, AlertTriangle,
  Users, Shield, Star, Wrench, TrendingUp, FileText, AtSign,
}

const colorMap = {
  blue: {
    icon: 'bg-brand-900/10 text-brand-500 dark:bg-brand-500/10',
    badge: 'bg-brand-900/5 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    sparkline: 'text-brand-500',
  },
  green: {
    icon: 'bg-status-success/10 text-status-success',
    badge: 'bg-status-success/10 text-status-success',
    sparkline: 'text-status-success',
  },
  orange: {
    icon: 'bg-status-warning/10 text-status-warning',
    badge: 'bg-status-warning/10 text-status-warning',
    sparkline: 'text-status-warning',
  },
  red: {
    icon: 'bg-status-danger/10 text-status-danger',
    badge: 'bg-status-danger/10 text-status-danger',
    sparkline: 'text-status-danger',
  },
  purple: {
    icon: 'bg-status-attention/10 text-status-attention',
    badge: 'bg-status-attention/10 text-status-attention',
    sparkline: 'text-status-attention',
  },
  cyan: {
    icon: 'bg-status-info/10 text-status-info',
    badge: 'bg-status-info/10 text-status-info',
    sparkline: 'text-status-info',
  },
  indigo: {
    icon: 'bg-brand-700/10 text-brand-700 dark:text-brand-400',
    badge: 'bg-brand-700/10 text-brand-700 dark:text-brand-400',
    sparkline: 'text-brand-700 dark:text-brand-400',
  },
}

function Sparkline({ data, colorClass }: { data: number[]; colorClass: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const h = 28
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("w-20 h-7", colorClass)} preserveAspectRatio="none">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" points={pts.join(' ')} />
    </svg>
  )
}

interface KPICardProps {
  kpi: KPIData
  animate?: boolean
}

export function KPICard({ kpi }: KPICardProps) {
  const Icon = iconMap[kpi.icon] ?? Briefcase
  const colors = colorMap[kpi.color]

  return (
    <div 
      className={cn(
        "bg-app-surface border border-app-border rounded-xl p-5 flex flex-col gap-4",
        "shadow-panel hover:shadow-md transition-all duration-200",
        "group cursor-default"
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-lg", colors.icon)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full", 
          kpi.direction === 'up' ? 'bg-status-success/10 text-status-success' :
          kpi.direction === 'down' ? 'bg-status-danger/10 text-status-danger' :
          'bg-app-muted text-app-secondary'
        )}>
          {kpi.direction === 'up' && <TrendingUp className="w-3 h-3" />}
          {kpi.direction === 'down' && <TrendingDown className="w-3 h-3" />}
          {kpi.direction === 'neutral' && <Minus className="w-3 h-3" />}
          <span>{kpi.direction === 'up' ? '+' : ''}{kpi.change}%</span>
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold text-app-heading tracking-tight leading-none mb-1">{kpi.value}</p>
        <p className="text-sm text-app-secondary">{kpi.title}</p>
      </div>

      <div className="flex items-end justify-between pt-1">
        <p className="text-xs text-app-subtle">vs. last month</p>
        <Sparkline data={kpi.trend} colorClass={colors.sparkline} />
      </div>
    </div>
  )
}
