import type { MeResponse } from '@/types/api'
import { CAP, hasAllCapabilities, hasAnyCapability } from '@/lib/capabilities'
import type { DashboardAudience, DashboardWidgetConfig, DashboardWidgetSize } from '@/features/dashboard/types'
import { BudgetPlaceholder } from '@/features/dashboard/widgets/BudgetPlaceholder'
import { ClientOnboardingPlaceholder } from '@/features/dashboard/widgets/ClientOnboardingPlaceholder'
import { IntakePlaceholder } from '@/features/dashboard/widgets/IntakePlaceholder'
import { MRFSummaryPlaceholder } from '@/features/dashboard/widgets/MRFSummaryPlaceholder'
import { MyTasksPreviewWidget } from '@/features/dashboard/widgets/MyTasksPreviewWidget'
import { SetupHealthPlaceholder } from '@/features/dashboard/widgets/SetupHealthPlaceholder'

/** Ordered registry; visibility resolved at runtime from `/me`. */
export const DASHBOARD_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: 'my-tasks-preview',
    title: 'My tasks',
    description: 'Approval steps assigned to you.',
    section: 'my_work',
    size: 'small',
    component: MyTasksPreviewWidget,
  },
  {
    id: 'mrf-summary',
    title: 'MRF',
    description: 'Manpower requests.',
    section: 'operations',
    size: 'medium',
    requiredCapabilities: [CAP.MRF_READ],
    component: MRFSummaryPlaceholder,
  },
  {
    id: 'client-onboarding-pipeline',
    title: 'Mobilisation',
    description: 'Sales-led expansion requests.',
    section: 'operations',
    size: 'medium',
    requiredCapabilities: [CAP.CLIENT_ONBOARDING_READ],
    component: ClientOnboardingPlaceholder,
  },
  {
    id: 'intake-signals',
    title: 'Intake',
    description: 'Applications from campaigns.',
    section: 'intake',
    size: 'medium',
    requiredCapabilities: [CAP.SUBMISSION_READ],
    component: IntakePlaceholder,
  },
  {
    id: 'budget-status',
    title: 'Budget',
    description: 'Plans and utilization.',
    section: 'budget',
    size: 'small',
    requiredCapabilities: [CAP.BUDGET_READ],
    component: BudgetPlaceholder,
  },
  {
    id: 'setup-health',
    title: 'Setup health',
    description: 'Reference data and approval configuration.',
    section: 'setup_health',
    size: 'medium',
    anyCapabilities: [
      CAP.SITE_READ,
      CAP.SITE_ROLE_REQUIREMENT_READ,
      CAP.WAGE_READ,
      CAP.WORKFLOW_CONFIG_READ,
    ],
    component: SetupHealthPlaceholder,
  },
]

function normalizeUserType(me: MeResponse): string {
  return String(me.user_type ?? '')
    .trim()
    .toLowerCase()
}

function matchesAudience(me: MeResponse, audience?: DashboardAudience[]): boolean {
  if (!audience?.length) return true
  if (audience.includes('all')) return true
  const ut = normalizeUserType(me)
  if (ut === 'internal' || ut === 'client' || ut === 'field') {
    return audience.includes(ut)
  }
  return false
}

function matchesCapabilities(me: MeResponse, w: DashboardWidgetConfig): boolean {
  const caps = me.capabilities ?? []
  if (w.requiredCapabilities?.length) {
    if (!hasAllCapabilities(caps, w.requiredCapabilities)) return false
  }
  if (w.anyCapabilities?.length) {
    if (!hasAnyCapability(caps, w.anyCapabilities)) return false
  }
  return true
}

export function selectVisibleDashboardWidgets(me: MeResponse | null): DashboardWidgetConfig[] {
  if (!me) return []
  return DASHBOARD_WIDGETS.filter((w) => matchesAudience(me, w.audience) && matchesCapabilities(me, w))
}

/** Responsive column span for the dashboard grid (`md:grid-cols-2`, `lg:grid-cols-4`). */
export function dashboardWidgetGridClass(size: DashboardWidgetSize): string {
  switch (size) {
    case 'small':
      return 'col-span-1'
    case 'medium':
      return 'col-span-1 md:col-span-2 lg:col-span-2'
    case 'large':
      return 'col-span-1 md:col-span-2 lg:col-span-3'
    case 'full':
      return 'col-span-1 md:col-span-2 lg:col-span-4'
    default:
      return 'col-span-1'
  }
}
