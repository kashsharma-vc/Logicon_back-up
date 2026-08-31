import type { ComponentType } from 'react'

// ─── Legacy widget config types (keep for dashboardWidgets.ts) ─────────────────

export type DashboardAudience = 'all' | 'internal' | 'client' | 'field'

export type DashboardWidgetSize = 'small' | 'medium' | 'large' | 'full'

export type DashboardSectionId =
  | 'my_work'
  | 'operations'
  | 'approvals'
  | 'intake'
  | 'budget'
  | 'setup_health'

export interface DashboardWidgetConfig {
  id: string
  title: string
  description?: string
  section: DashboardSectionId
  size: DashboardWidgetSize
  /** User must have every capability listed. */
  requiredCapabilities?: string[]
  /** User must have at least one of these capabilities. */
  anyCapabilities?: string[]
  /** If set, `me.user_type` must match one entry (after normalizing). Omit for all audiences. */
  audience?: DashboardAudience[]
  component: ComponentType
}

export const DASHBOARD_SECTION_ORDER: DashboardSectionId[] = [
  'my_work',
  'operations',
  'approvals',
  'intake',
  'budget',
  'setup_health',
]

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionId, string> = {
  my_work: 'My work',
  operations: 'Operations',
  approvals: 'Approvals',
  intake: 'Intake',
  budget: 'Budget',
  setup_health: 'Setup health',
}

// ─── Chart primitives ──────────────────────────────────────────────────────────

export interface DashboardChartCountItem {
  key: string
  label: string
  count: number
  url?: string
}

export interface DashboardChartAmountItem {
  key: string
  label: string
  amount: string
  count?: number
  url?: string
}

export interface DashboardTrendItem {
  period: string
  label: string
  count: number
  amount?: string
}

export interface DashboardDrilldowns {
  all?: string
  [key: string]: string | undefined
}

// ─── API Summary types ─────────────────────────────────────────────────────────

export type DashboardSummaryAudience = 'client' | 'internal' | 'field' | 'unknown'

export interface DashboardMyWorkTask {
  step_id: number
  workflow_id: number
  target_type: 'mrf' | 'client_onboarding'
  target_title: string
  step_name: string
  activated_at: string | null
}

export interface DashboardMyWorkSection {
  active_task_count: number
  latest_tasks: DashboardMyWorkTask[]
}

export interface DashboardClientEntry {
  id: number
  name: string
  code: string
  site_count: number
}

export interface DashboardClientOverviewCharts {
  sites_by_client: DashboardChartCountItem[]
  departments_by_client: DashboardChartCountItem[]
}

export interface DashboardClientOverviewSection {
  client_count: number
  site_count: number
  department_count: number
  clients: DashboardClientEntry[]
  charts?: DashboardClientOverviewCharts
}

export interface DashboardOnboardingRecent {
  id: number
  onboarding_type: string
  client_name: string
  status: string
  finalization_status: string | null
  created_at: string | null
}

export interface DashboardOnboardingCharts {
  by_status: DashboardChartCountItem[]
  by_finalization: DashboardChartCountItem[]
  monthly_trend: DashboardTrendItem[]
}

export interface DashboardOnboardingSection {
  total: number
  draft: number
  in_review: number
  approved: number
  rejected: number
  finalized: number
  finalization_failed: number
  recent: DashboardOnboardingRecent[]
  charts?: DashboardOnboardingCharts
  drilldowns?: DashboardDrilldowns
}

export interface DashboardMRFRecent {
  id: number
  request_number: string
  site_name: string | null
  status: string
  workflow_status: string | null
  created_at: string | null
}

export interface DashboardMRFCharts {
  by_status: DashboardChartCountItem[]
  by_site: DashboardChartCountItem[]
  by_department: DashboardChartCountItem[]
  monthly_trend: DashboardTrendItem[]
}

export interface DashboardMRFSection {
  total: number
  draft: number
  in_review: number
  approved: number
  rejected: number
  request_changes: number
  recent: DashboardMRFRecent[]
  charts?: DashboardMRFCharts
  drilldowns?: DashboardDrilldowns
}

export interface DashboardBudgetByNature {
  billable: string
  non_billable: string
}

export interface DashboardBudgetCharts {
  utilization: DashboardChartAmountItem[]
  by_nature: DashboardChartAmountItem[]
  by_scope: DashboardChartAmountItem[]
  top_plans: DashboardChartAmountItem[]
}

export interface DashboardBudgetSection {
  plan_count: number
  total_amount: string
  reserved_amount: string
  committed_amount: string
  available_amount: string
  by_nature: DashboardBudgetByNature
  charts?: DashboardBudgetCharts
  drilldowns?: DashboardDrilldowns
}

export interface DashboardHiringApplication {
  id: number
  candidate_name: string
  site_name: string | null
  job_role_name: string | null
  status: string
  created_at: string | null
}

export interface DashboardHiringCharts {
  by_status: DashboardChartCountItem[]
  by_stage: DashboardChartCountItem[]
  by_job_role: DashboardChartCountItem[]
}

export interface DashboardHiringSection {
  application_count: number
  open_count: number
  selected_count: number
  joined_count: number
  rejected_count: number
  demand_count: number
  latest_applications: DashboardHiringApplication[]
  charts?: DashboardHiringCharts
  drilldowns?: DashboardDrilldowns
}

export interface DashboardTalentCharts {
  by_resume_status: DashboardChartCountItem[]
  by_availability: DashboardChartCountItem[]
  top_skills: DashboardChartCountItem[]
}

export interface DashboardTalentSection {
  candidate_count: number
  active_candidate_count: number
  resume_count: number
  manual_review_count: number
  uploaded_count: number
  charts?: DashboardTalentCharts
  drilldowns?: DashboardDrilldowns
}

export interface DashboardRecentActivityItem {
  type: 'mrf' | 'onboarding'
  target_type?: string
  target_id?: number
  id: number
  title: string
  subtitle?: string
  status: string
  created_at: string | null
  url?: string
}

export interface DashboardSections {
  my_work: DashboardMyWorkSection
  client_overview: DashboardClientOverviewSection
  onboarding: DashboardOnboardingSection
  mrf: DashboardMRFSection
  budget: DashboardBudgetSection
  hiring: DashboardHiringSection
  talent: DashboardTalentSection
  recent_activity: DashboardRecentActivityItem[]
}

export interface DashboardSummaryResponse {
  audience: DashboardSummaryAudience
  user: {
    id: number
    username: string
    email: string
    user_type: string
  }
  scope: {
    org_id: number | null
    client_count: number
    site_count: number
  }
  sections: DashboardSections
}
