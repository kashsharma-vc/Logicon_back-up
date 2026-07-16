import { 
  ClipboardCheck, FolderPlus, FileBarChart2, Upload, 
  ListChecks, UserPlus2, MapPin, Download, UserCheck
} from "lucide-react"
import { cn } from "@/lib/cn"

const actions = [
  { icon: ClipboardCheck, label: 'New Inspection', color: 'text-brand-500', bg: 'bg-brand-500/10 hover:bg-brand-500/20' },
  { icon: FolderPlus, label: 'Create Project', color: 'text-status-success', bg: 'bg-status-success/10 hover:bg-status-success/20' },
  { icon: FileBarChart2, label: 'Generate Report', color: 'text-status-attention', bg: 'bg-status-attention/10 hover:bg-status-attention/20' },
  { icon: Upload, label: 'Upload Documents', color: 'text-status-info', bg: 'bg-status-info/10 hover:bg-status-info/20' },
  { icon: ListChecks, label: 'Create Checklist', color: 'text-status-warning', bg: 'bg-status-warning/10 hover:bg-status-warning/20' },
  { icon: UserCheck, label: 'Assign Task', color: 'text-brand-600', bg: 'bg-brand-600/10 hover:bg-brand-600/20' },
  { icon: MapPin, label: 'Add Site', color: 'text-status-danger', bg: 'bg-status-danger/10 hover:bg-status-danger/20' },
  { icon: UserPlus2, label: 'Invite User', color: 'text-status-hired', bg: 'bg-status-hired/10 hover:bg-status-hired/20' },
  { icon: Download, label: 'Export Data', color: 'text-app-secondary', bg: 'bg-app-muted hover:bg-app-border' },
]

export function QuickActions() {
  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border">
        <h2 className="text-base font-semibold text-app-heading">Quick Actions</h2>
        <p className="text-xs text-app-secondary mt-0.5">Shortcuts to common tasks</p>
      </div>
      <div className="p-4 grid grid-cols-3 gap-2">
        {actions.map(({ icon: Icon, label, color, bg }) => (
          <button
            key={label}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150",
              "hover:scale-105 active:scale-95 cursor-pointer",
              bg
            )}
          >
            <div className={cn("p-2.5 rounded-lg bg-app-surface shadow-sm", color)}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-medium text-app-text text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
