import { ReactNode } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/cn"

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: {
    value: number
    label: string
    direction: "up" | "down" | "neutral"
  }
  chartData?: number[]
}

export function StatCard({ title, value, icon, trend, chartData }: StatCardProps) {
  return (
    <div className="bg-app-surface rounded-xl border border-app-border shadow-panel p-5 flex flex-col relative overflow-hidden transition-all hover:shadow-md group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2.5 bg-app-accent text-brand-500 rounded-full">
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            trend.direction === "up" ? "bg-status-success/10 text-status-success" : 
            trend.direction === "down" ? "bg-status-danger/10 text-status-danger" : 
            "bg-app-muted text-app-secondary"
          )}>
            {trend.direction === "up" && <TrendingUp className="w-3 h-3" />}
            {trend.direction === "down" && <TrendingDown className="w-3 h-3" />}
            {trend.direction === "neutral" && <Minus className="w-3 h-3" />}
            <span>{trend.direction !== "neutral" && trend.direction === "up" ? "+" : ""}{trend.value}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1 z-10">
        <h3 className="text-sm font-medium text-app-secondary">{title}</h3>
        <p className="text-3xl font-bold text-app-heading tracking-tight">{value}</p>
      </div>

      {trend?.label && (
        <p className="text-xs text-app-subtle mt-4 z-10">{trend.label}</p>
      )}

      {chartData && (
        <div className="absolute bottom-0 left-0 right-0 h-12 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full text-brand-500 fill-current">
            <polygon points="0,30 0,15 20,12 40,16 60,10 80,14 100,5 100,30" />
          </svg>
        </div>
      )}
    </div>
  )
}
