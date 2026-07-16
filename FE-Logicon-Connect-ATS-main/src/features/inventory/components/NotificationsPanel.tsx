import { useState } from "react"
import { notificationsData, Notification } from "../dashboardData"
import { 
  AlertTriangle, CheckCircle2, AtSign, FileText, Bell, X
} from "lucide-react"
import { cn } from "@/lib/cn"

const iconMap: Record<string, React.FC<any>> = {
  AlertTriangle, CheckCircle2, AtSign, FileText, Bell
}

const priorityDot = {
  high: 'bg-status-danger',
  medium: 'bg-status-warning',
  low: 'bg-brand-500',
}

const TABS = ['Unread', 'All', 'Mentions', 'Approvals']

interface NotificationsPanelProps {
  notifications: Notification[]
}

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  const [tab, setTab] = useState('All')
  const [items, setItems] = useState(notifications)

  const filtered = tab === 'Unread' ? items.filter(n => !n.read) 
    : tab === 'Mentions' ? items.filter(n => n.type === 'mention')
    : tab === 'Approvals' ? items.filter(n => n.type === 'approval')
    : items

  const unreadCount = items.filter(n => !n.read).length

  function markRead(id: number) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  return (
    <div className="bg-app-surface border border-app-border rounded-xl shadow-panel overflow-hidden">
      <div className="px-6 py-4 border-b border-app-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-app-heading">Notifications</h2>
          {unreadCount > 0 && (
            <span className="bg-status-danger text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <button className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors" onClick={() => setItems(prev => prev.map(n => ({ ...n, read: true })))}>
          Mark all read
        </button>
      </div>

      <div className="flex border-b border-app-border">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 text-xs font-medium transition-all relative",
              tab === t ? "text-brand-500 border-b-2 border-brand-500" : "text-app-secondary hover:text-app-text"
            )}
          >
            {t}
            {t === 'Unread' && unreadCount > 0 && (
              <span className="ml-1 text-[10px] bg-status-danger/10 text-status-danger px-1 rounded-full">{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="divide-y divide-app-border max-h-72 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="py-10 text-center text-app-secondary text-sm">No notifications here</div>
        )}
        {filtered.map(n => {
          const Icon = iconMap[n.icon] ?? Bell
          return (
            <div
              key={n.id}
              className={cn(
                "px-5 py-3.5 flex items-start gap-3 hover:bg-app-muted/60 transition-colors cursor-pointer group",
                !n.read ? "bg-brand-500/3" : ""
              )}
              onClick={() => markRead(n.id)}
            >
              <div className={cn("shrink-0 p-2 rounded-lg mt-0.5",
                n.type === 'alert' ? "bg-status-danger/10 text-status-danger" :
                n.type === 'approval' ? "bg-status-success/10 text-status-success" :
                n.type === 'mention' ? "bg-status-attention/10 text-status-attention" :
                "bg-brand-500/10 text-brand-500"
              )}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm leading-snug", !n.read ? "font-semibold text-app-heading" : "text-app-text")}>
                    {n.title}
                  </p>
                  {!n.read && <div className={cn("w-2 h-2 rounded-full shrink-0 mt-1", priorityDot[n.priority])} />}
                </div>
                <p className="text-xs text-app-secondary mt-0.5 leading-relaxed">{n.description}</p>
                <p className="text-xs text-app-subtle mt-1">{n.time}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setItems(prev => prev.filter(x => x.id !== n.id)) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-app-subtle hover:text-app-text transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
