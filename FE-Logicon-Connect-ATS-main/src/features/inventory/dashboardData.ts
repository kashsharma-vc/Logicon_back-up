// Shared types for Inventory Dashboard
export interface KPIData {
  id: string
  title: string
  value: string | number
  change: number // percentage
  direction: 'up' | 'down' | 'neutral'
  trend: number[] // sparkline data points
  icon: string
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'cyan' | 'indigo'
}

export interface Project {
  id: number
  name: string
  client: string
  location: string
  status: 'active' | 'on-hold' | 'completed' | 'at-risk'
  progress: number
  manager: string
  dueDate: string
  risk: 'low' | 'medium' | 'high'
}

export interface SiteProgress {
  id: number
  siteName: string
  overall: number
  civil: number
  electrical: number
  mechanical: number
  finishing: number
  safety: number
  quality: number
}

export interface Activity {
  id: number
  user: string
  userInitials: string
  userColor: string
  action: string
  project: string
  timestamp: string
  status: 'completed' | 'uploaded' | 'submitted' | 'reported' | 'assigned'
}

export interface Inspection {
  id: number
  project: string
  site: string
  date: string
  time: string
  inspector: string
  priority: 'high' | 'medium' | 'low'
  type: string
  status: 'scheduled' | 'in-progress' | 'completed' | 'overdue'
}

export interface Notification {
  id: number
  icon: string
  title: string
  description: string
  time: string
  priority: 'high' | 'medium' | 'low'
  read: boolean
  type: 'mention' | 'approval' | 'alert' | 'info'
  link?: string
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

export const kpiData: KPIData[] = [
  { id: 'total-projects', title: 'Total Projects', value: 48, change: 12, direction: 'up', trend: [30,35,32,40,38,45,48], icon: 'Briefcase', color: 'blue' },
  { id: 'active-sites', title: 'Active Sites', value: 23, change: 4.5, direction: 'up', trend: [18,19,21,20,22,21,23], icon: 'MapPin', color: 'green' },
  { id: 'todays-inspections', title: "Today's Inspections", value: 7, change: -12, direction: 'down', trend: [9,8,10,8,7,8,7], icon: 'ClipboardCheck', color: 'indigo' },
  { id: 'pending-inspections', title: 'Pending Inspections', value: 14, change: 8, direction: 'up', trend: [10,11,12,11,13,12,14], icon: 'Clock', color: 'orange' },
  { id: 'completed-tasks', title: 'Completed Tasks', value: 312, change: 22, direction: 'up', trend: [220,240,255,270,290,302,312], icon: 'CheckCircle2', color: 'green' },
  { id: 'open-issues', title: 'Open Issues', value: 29, change: -6, direction: 'down', trend: [35,34,33,32,31,30,29], icon: 'AlertTriangle', color: 'red' },
  { id: 'workers-present', title: 'Workers Present', value: 184, change: 3.2, direction: 'up', trend: [160,168,172,175,180,181,184], icon: 'Users', color: 'purple' },
  { id: 'safety-score', title: 'Safety Score', value: '94.2%', change: 1.4, direction: 'up', trend: [88,89,91,92,93,93,94.2], icon: 'Shield', color: 'green' },
  { id: 'quality-score', title: 'Quality Score', value: '87.6%', change: 2.1, direction: 'up', trend: [82,83,84,85,86,87,87.6], icon: 'Star', color: 'cyan' },
  { id: 'equipment-active', title: 'Equipment Active', value: 67, change: -2.5, direction: 'down', trend: [72,71,70,69,68,68,67], icon: 'Wrench', color: 'indigo' },
  { id: 'avg-completion', title: 'Avg Completion', value: '72.4%', change: 5.8, direction: 'up', trend: [60,63,65,68,70,71,72.4], icon: 'TrendingUp', color: 'blue' },
  { id: 'total-reports', title: 'Total Reports', value: 1284, change: 14, direction: 'up', trend: [900,980,1050,1100,1160,1220,1284], icon: 'FileText', color: 'purple' },
]

export const projectsData: Project[] = [
  { id: 1, name: 'City Center Tower', client: 'Emerald Corp', location: 'Mumbai', status: 'active', progress: 78, manager: 'Raj Sharma', dueDate: '2026-09-15', risk: 'low' },
  { id: 2, name: 'Airport Terminal B', client: 'AirTech Ltd', location: 'Delhi', status: 'at-risk', progress: 42, manager: 'Priya Patel', dueDate: '2026-08-01', risk: 'high' },
  { id: 3, name: 'Metro Bridge Ext.', client: 'GovInfra', location: 'Pune', status: 'active', progress: 91, manager: 'Amit Verma', dueDate: '2026-07-20', risk: 'low' },
  { id: 4, name: 'Tech Park Phase 2', client: 'Silicon Hub', location: 'Bengaluru', status: 'on-hold', progress: 55, manager: 'Sara Gupta', dueDate: '2026-11-30', risk: 'medium' },
  { id: 5, name: 'Harbor Road Tunnel', client: 'Port Authority', location: 'Chennai', status: 'active', progress: 63, manager: 'Vikram Singh', dueDate: '2026-10-12', risk: 'medium' },
  { id: 6, name: 'Solar Farm Grid', client: 'GreenEnergy', location: 'Jaipur', status: 'completed', progress: 100, manager: 'Neha Rao', dueDate: '2026-06-30', risk: 'low' },
]

export const siteProgressData: SiteProgress[] = [
  { id: 1, siteName: 'City Center Tower – Site A', overall: 78, civil: 92, electrical: 68, mechanical: 74, finishing: 45, safety: 96, quality: 88 },
  { id: 2, siteName: 'Airport Terminal B – Site B', overall: 42, civil: 61, electrical: 38, mechanical: 25, finishing: 12, safety: 78, quality: 72 },
  { id: 3, siteName: 'Metro Bridge – Site C', overall: 91, civil: 98, electrical: 90, mechanical: 88, finishing: 82, safety: 99, quality: 95 },
]

export const activityData: Activity[] = [
  { id: 1, user: 'Raj Sharma', userInitials: 'RS', userColor: 'bg-brand-500', action: 'completed safety inspection', project: 'City Center Tower', timestamp: '10 min ago', status: 'completed' },
  { id: 2, user: 'Amit Verma', userInitials: 'AV', userColor: 'bg-status-success', action: 'uploaded site photos (12 files)', project: 'Metro Bridge Ext.', timestamp: '28 min ago', status: 'uploaded' },
  { id: 3, user: 'Sara Gupta', userInitials: 'SG', userColor: 'bg-status-warning', action: 'submitted daily checklist', project: 'Tech Park Phase 2', timestamp: '1 hr ago', status: 'submitted' },
  { id: 4, user: 'Priya Patel', userInitials: 'PP', userColor: 'bg-status-danger', action: 'reported a safety issue', project: 'Airport Terminal B', timestamp: '2 hrs ago', status: 'reported' },
  { id: 5, user: 'Vikram Singh', userInitials: 'VS', userColor: 'bg-status-attention', action: 'assigned task to field team', project: 'Harbor Road Tunnel', timestamp: '3 hrs ago', status: 'assigned' },
  { id: 6, user: 'Neha Rao', userInitials: 'NR', userColor: 'bg-status-info', action: 'generated final project report', project: 'Solar Farm Grid', timestamp: '5 hrs ago', status: 'completed' },
]

export const inspectionsData: Inspection[] = [
  { id: 1, project: 'City Center Tower', site: 'Site A – Level 12', date: '2026-07-08', time: '09:00 AM', inspector: 'Raj Sharma', priority: 'high', type: 'Safety Audit', status: 'in-progress' },
  { id: 2, project: 'Airport Terminal B', site: 'Terminal Wing C', date: '2026-07-08', time: '11:30 AM', inspector: 'Priya Patel', priority: 'high', type: 'Structural Check', status: 'scheduled' },
  { id: 3, project: 'Metro Bridge Ext.', site: 'Pier Section 7', date: '2026-07-09', time: '08:00 AM', inspector: 'Amit Verma', priority: 'medium', type: 'Quality Audit', status: 'scheduled' },
  { id: 4, project: 'Harbor Road Tunnel', site: 'Tunnel Entry Point', date: '2026-07-09', time: '02:00 PM', inspector: 'Vikram Singh', priority: 'low', type: 'Progress Check', status: 'scheduled' },
]

export const notificationsData: Notification[] = [
  { id: 1, icon: 'AlertTriangle', title: 'Safety Issue Reported', description: 'Priya Patel reported a fall hazard at Airport Terminal B', time: '2 hrs ago', priority: 'high', read: false, type: 'alert', link: '/inventory' },
  { id: 2, icon: 'CheckCircle2', title: 'Inspection Approved', description: 'Safety audit for City Center Tower has been approved', time: '3 hrs ago', priority: 'medium', read: false, type: 'approval', link: '/inventory' },
  { id: 3, icon: 'AtSign', title: 'You were mentioned', description: 'Raj Sharma mentioned you in Metro Bridge Ext. update', time: '5 hrs ago', priority: 'low', read: true, type: 'mention', link: '/inventory' },
  { id: 4, icon: 'FileText', title: 'Report Generated', description: 'Monthly report for Solar Farm Grid is ready to download', time: '1 day ago', priority: 'low', read: true, type: 'info', link: '/inventory' },
]

export const inspectionStatusData = [
  { name: 'Completed', value: 148, color: '#16a34a' },
  { name: 'Pending', value: 42, color: '#f59e0b' },
  { name: 'In Progress', value: 23, color: '#185fa5' },
  { name: 'Scheduled', value: 67, color: '#8b5cf6' },
  { name: 'Failed', value: 8, color: '#dc2626' },
]

export const weeklyInspectionTrend = [
  { day: 'Mon', completed: 22, pending: 8, failed: 1 },
  { day: 'Tue', completed: 18, pending: 12, failed: 2 },
  { day: 'Wed', completed: 25, pending: 6, failed: 0 },
  { day: 'Thu', completed: 30, pending: 9, failed: 1 },
  { day: 'Fri', completed: 27, pending: 7, failed: 2 },
  { day: 'Sat', completed: 15, pending: 4, failed: 0 },
  { day: 'Sun', completed: 11, pending: 2, failed: 0 },
]
