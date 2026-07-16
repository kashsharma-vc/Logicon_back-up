import { useEffect, useState } from "react"
import { getDashboardSummary } from "@/api/dashboard"
import type { DashboardSummaryResponse } from "@/features/dashboard/types"
import type { KPIData, Project, SiteProgress, Activity, Inspection } from "./dashboardData"

import { KPICard } from "./components/KPICard"
import { ProjectTable } from "./components/ProjectTable"
import { SiteProgressCard } from "./components/SiteProgressCard"
import { InspectionCharts } from "./components/InspectionCharts"
import { ActivityFeed } from "./components/ActivityFeed"
import { UpcomingInspections } from "./components/UpcomingInspections"
import { CalendarWidget } from "./components/CalendarWidget"
import { AnalyticsSection } from "./components/AnalyticsSection"
import { GlobalFilters } from "./components/GlobalFilters"
import { Download, TrendingUp, Loader2 } from "lucide-react"

export function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null)

  useEffect(() => {
    getDashboardSummary()
      .then(res => {
        setSummary(res)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load dashboard summary:", err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="w-full h-96 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        <p className="text-app-secondary">Loading dashboard data...</p>
      </div>
    )
  }

  const data = summary?.sections

  const dynamicKpiData: KPIData[] = [
    { id: 'total-projects', title: 'Total Projects', value: data?.budget?.plan_count || 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'Briefcase', color: 'blue' },
    { id: 'active-sites', title: 'Active Sites', value: data?.client_overview?.site_count || 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'MapPin', color: 'green' },
    { id: 'todays-inspections', title: "Today's Inspections", value: 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'ClipboardCheck', color: 'indigo' },
    { id: 'pending-inspections', title: 'Pending Inspections', value: 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'Clock', color: 'orange' },
    { id: 'completed-tasks', title: 'Completed Tasks', value: data?.my_work?.active_task_count || 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'CheckCircle2', color: 'green' },
    { id: 'open-issues', title: 'Open Issues', value: 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'AlertTriangle', color: 'red' },
    { id: 'workers-present', title: 'Workers Present', value: 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'Users', color: 'purple' },
    { id: 'safety-score', title: 'Safety Score', value: '0%', change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'Shield', color: 'green' },
    { id: 'quality-score', title: 'Quality Score', value: '0%', change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'Star', color: 'cyan' },
    { id: 'equipment-active', title: 'Equipment Active', value: 0, change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'Wrench', color: 'indigo' },
    { id: 'avg-completion', title: 'Avg Completion', value: '0%', change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'TrendingUp', color: 'blue' },
    { id: 'total-reports', title: 'Total Reports', value: (data?.onboarding?.total || 0) + (data?.mrf?.total || 0), change: 0, direction: 'neutral', trend: [0,0,0,0,0,0,0], icon: 'FileText', color: 'purple' },
  ]

  const dynamicProjectsData: Project[] = (data?.mrf?.recent || []).map((mrf, i) => ({
    id: mrf.id || i,
    name: mrf.request_number || `MRF #${mrf.id}`,
    client: mrf.site_name || 'Unknown Site',
    location: 'Unknown',
    status: (mrf.status === 'approved' ? 'active' : mrf.status === 'rejected' ? 'at-risk' : mrf.status === 'draft' ? 'on-hold' : 'active') as any,
    progress: 0,
    manager: 'Unknown',
    dueDate: mrf.created_at ? new Date(mrf.created_at).toISOString().split('T')[0] : 'Unknown',
    risk: 'low'
  }))

  const dynamicSiteProgressData: SiteProgress[] = (data?.client_overview?.clients || []).map((client, i) => ({
    id: client.id || i,
    siteName: client.name || 'Unknown',
    overall: 0,
    civil: 0,
    electrical: 0,
    mechanical: 0,
    finishing: 0,
    safety: 0,
    quality: 0
  }))

  const dynamicActivityData: Activity[] = (data?.recent_activity || []).map((act, i) => ({
    id: act.id || i,
    user: act.title || 'System',
    userInitials: act.title ? act.title.substring(0, 2).toUpperCase() : 'SY',
    userColor: 'bg-brand-500',
    action: act.subtitle || act.type,
    project: act.target_type || 'Unknown',
    timestamp: act.created_at ? new Date(act.created_at).toLocaleString() : 'Just now',
    status: (act.status === 'approved' || act.status === 'completed' ? 'completed' : 'submitted') as any
  }))

  const dynamicInspectionsData: Inspection[] = []

  return (
    <div className="w-full space-y-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-app-heading tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-app-secondary mt-0.5">
            Live overview of operations, inspections, and performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-app-border rounded-lg bg-app-surface text-app-text hover:bg-app-muted shadow-panel transition-all">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-panel transition-all bg-[var(--color-btn-primary)] hover:bg-[var(--color-btn-primary-hover)]">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Global Filters & Search ───────────────────────────────── */}
      <GlobalFilters />

      {/* ── KPI Cards Grid ───────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {dynamicKpiData.map(kpi => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </section>

      {/* ── Project Overview Table ───────────────────────────────── */}
      <section>
        <ProjectTable projects={dynamicProjectsData} />
      </section>

      {/* ── Site Progress & Inspection Charts ────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InspectionCharts />
        </div>
        <div>
          <AnalyticsSection />
        </div>
      </section>

      {/* ── Site Progress Cards ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-app-heading">Site Progress</h2>
          <button className="text-xs text-brand-500 hover:text-brand-600 font-medium transition-colors">View All Sites</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dynamicSiteProgressData.map(site => (
            <SiteProgressCard key={site.id} site={site} />
          ))}
        </div>
      </section>

      {/* ── Activity + Inspections + Calendar + Notifications ───── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Activity Feed */}
        <div>
          <ActivityFeed activities={dynamicActivityData} />
        </div>

        {/* Middle: Upcoming Inspections */}
        <div>
          <UpcomingInspections inspections={dynamicInspectionsData} />
        </div>

        {/* Right: Calendar */}
        <div>
          <CalendarWidget />
        </div>
      </section>
  </div>
  )
}
