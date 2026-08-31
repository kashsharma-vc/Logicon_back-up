import type { LucideIcon } from 'lucide-react'
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  FormInput,
  Handshake,
  Inbox,
  KanbanSquare,
  UserSearch,
  LayoutDashboard,
  MapPin,
  QrCode,
  Settings2,
  Shield,
  SlidersHorizontal,
  TrendingUp,
  Truck,
  UserCircle,
  Users,
  Wallet,
  Clock,
  Package,
} from 'lucide-react'
import { CAP, MASTERS_ANY, hasAnyCapability } from '@/lib/capabilities'
import { isClientFacingUser, getNavPersona } from '@/lib/userRoleMode'
import type { MeResponse } from '@/types/api'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  /** If omitted, item is visible to all authenticated users. */
  requiredCapabilities?: string[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical nav item definitions — single source of truth
// ─────────────────────────────────────────────────────────────────────────────

const ITEMS = {
  // Overview
  dashboard: { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  myAccess: { path: '/me', label: 'My access', icon: UserCircle },
  myTasks: { path: '/my-tasks', label: 'My tasks', icon: Inbox },

  // Access control
  users: { path: '/users', label: 'Users', icon: Users, requiredCapabilities: [CAP.USER_READ] },
  userLogs: { path: '/admin/logs', label: 'Logs', icon: ClipboardList, requiredCapabilities: [CAP.USER_READ] },
  attendanceDashboard: { path: '/attendance-dashboard', label: 'Attendance Dashboard', icon: Clock, requiredCapabilities: [CAP.USER_READ] },
  roles: { path: '/roles', label: 'Roles', icon: Shield, requiredCapabilities: [CAP.ROLE_READ] },

  // Sales
  salesDashboard: { path: '/sales/dashboard', label: 'Sales dashboard', icon: TrendingUp, requiredCapabilities: [CAP.SALES_LEAD_READ] },
  salesLeads: { path: '/sales/leads', label: 'Sales leads', icon: Briefcase, requiredCapabilities: [CAP.SALES_LEAD_READ] },
  operationsSurveys: { path: '/sales/operations-surveys', label: 'Operations surveys', icon: ClipboardList, requiredCapabilities: [CAP.SALES_SURVEY_READ] },
  componentRules: { path: '/sales/component-rules', label: 'Component rules', icon: SlidersHorizontal, requiredCapabilities: [CAP.SALES_PROPOSAL_READ] },

  // Sales & setup
  mobilisation: { path: '/mobilisation', label: 'Mobilisation', icon: Handshake, requiredCapabilities: [CAP.MOBILISATION_READ] },
  clients: { path: '/clients', label: 'Clients', icon: Building2, requiredCapabilities: [CAP.CLIENT_READ] },
  sites: { path: '/sites', label: 'Sites', icon: MapPin, requiredCapabilities: [CAP.SITE_READ] },
  departments: { path: '/departments', label: 'Departments', icon: Building2, requiredCapabilities: [CAP.DEPARTMENT_READ] },
  siteRoleRequirements: { path: '/site-role-requirements', label: 'Site role requirements', icon: ClipboardList, requiredCapabilities: [CAP.SITE_ROLE_REQUIREMENT_READ] },

  // Masters
  masters: { path: '/masters', label: 'Masters', icon: Database, requiredCapabilities: [...MASTERS_ANY] },
  budgets: { path: '/budgets', label: 'Budgets', icon: Wallet, requiredCapabilities: [CAP.BUDGET_READ] },

  // Candidate intake
  qrCampaigns: { path: '/qr-campaigns', label: 'QR campaigns', icon: QrCode, requiredCapabilities: [CAP.CAMPAIGN_READ] },
  formBuilder: { path: '/form-builder', label: 'Form builder', icon: FormInput, requiredCapabilities: [CAP.CAMPAIGN_READ] },
  intakeSubmissions: { path: '/intake-submissions', label: 'Intake submissions', icon: FileText, requiredCapabilities: [CAP.SUBMISSION_READ] },

  // Requests & approvals
  mrf: { path: '/mrf', label: 'MRF', icon: ClipboardList, requiredCapabilities: [CAP.MRF_READ] },
  approvalSetup: { path: '/approval-setup', label: 'Approval setup', icon: Settings2, requiredCapabilities: [CAP.WORKFLOW_CONFIG_READ] },
  tatManagement: { path: '/tat-management', label: 'TAT Management', icon: SlidersHorizontal, requiredCapabilities: [CAP.WORKFLOW_CONFIG_READ] },

  // Hiring & deployment
  interviewPipeline: { path: '/hiring/pipeline', label: 'Interview pipeline', icon: KanbanSquare, requiredCapabilities: [CAP.HIRING_APPLICATION_READ] },
  interviewAssignments: { path: '/hiring/interview-assignments', label: 'Interview assignments', icon: ClipboardCheck, requiredCapabilities: [CAP.INTERVIEW_READ, CAP.INTERVIEW_ASSIGNMENT_READ] },
  hiringDemands: { path: '/hiring/demands', label: 'Hiring demands', icon: ClipboardList, requiredCapabilities: [CAP.HIRING_APPLICATION_READ] },
  hiringApplications: { path: '/hiring/applications', label: 'Hiring applications', icon: Briefcase, requiredCapabilities: [CAP.HIRING_APPLICATION_READ] },
  resumePool: { path: '/candidates', label: 'Resume pool', icon: UserSearch, requiredCapabilities: [CAP.CANDIDATE_READ] },
  resumeReviewQueue: { path: '/candidates/review-queue', label: 'Resume review queue', icon: FileText, requiredCapabilities: [CAP.RESUME_READ, CAP.RESUME_VIEW] },
  candidateReview: { path: '/hiring/client-review', label: 'Candidate review', icon: ClipboardList, requiredCapabilities: [CAP.HIRING_APPLICATION_READ] },
  offers: { path: '/hiring/offers', label: 'Offers', icon: FileText, requiredCapabilities: [CAP.OFFER_READ] },
  employees: { path: '/deployment/employees', label: 'Employees', icon: Users, requiredCapabilities: [CAP.EMPLOYEE_READ] },
  siteDeployments: { path: '/deployment/site-deployments', label: 'Site deployments', icon: Truck, requiredCapabilities: [CAP.SITE_DEPLOYMENT_READ] },
  deploymentHistory: { path: '/deployment/history', label: 'Deployment history', icon: ClipboardList, requiredCapabilities: [CAP.DEPLOYMENT_READ] },

  // Client portal specific
  companyProfile: { path: '/clients', label: 'Company profile', icon: Building2, requiredCapabilities: [CAP.CLIENT_READ] },
  clientSites: { path: '/sites', label: 'Sites', icon: MapPin, requiredCapabilities: [CAP.SITE_READ] },
  clientSiteRoleReqs: {
    path: '/site-role-requirements',
    label: 'Site role requirements',
    icon: ClipboardList,
    requiredCapabilities: [CAP.SITE_ROLE_REQUIREMENT_READ],
  },
  approvedBudgets: { path: '/budgets', label: 'Approved budgets', icon: Wallet, requiredCapabilities: [CAP.BUDGET_READ] },
  deployedEmployees: { path: '/deployment/client-employees', label: 'Deployed employees', icon: Users, requiredCapabilities: [CAP.EMPLOYEE_READ] },
  clientMrf: { path: '/mrf', label: 'MRF', icon: ClipboardList, requiredCapabilities: [CAP.MRF_READ] },
  clientCandidateReview: {
    path: '/hiring/client-review',
    label: 'Candidate review',
    icon: ClipboardList,
    requiredCapabilities: [CAP.HIRING_APPLICATION_READ],
  },

  // Inventory Management (Operations)
  inventoryDashboard: { path: '/inventory', label: 'Dashboard', icon: LayoutDashboard, requiredCapabilities: [CAP.INVENTORY_READ] },
  inventoryItems: { path: '/inventory/items', label: 'Inventory Items', icon: ClipboardList, requiredCapabilities: [CAP.INVENTORY_READ] },
  warehouses: { path: '/inventory/warehouses', label: 'Warehouses', icon: Building2, requiredCapabilities: [CAP.INVENTORY_READ] },
  inventoryOperations: { path: '/inventory/operations', label: 'Inventory Operations', icon: ClipboardCheck, requiredCapabilities: [CAP.INVENTORY_READ] },
  procurement: { path: '/inventory/procurement', label: 'Procurement', icon: Briefcase, requiredCapabilities: [CAP.INVENTORY_READ] },
  stockMovements: { path: '/inventory/stock-movements', label: 'Stock Movements', icon: TrendingUp, requiredCapabilities: [CAP.INVENTORY_READ] },
  siteInventory: { path: '/inventory/site-inventory', label: 'Site Inventory', icon: MapPin, requiredCapabilities: [CAP.INVENTORY_READ] },
  employeeAssets: { path: '/inventory/employee-assets', label: 'Employee Assets', icon: UserCircle, requiredCapabilities: [CAP.INVENTORY_READ] },
  vendors: { path: '/inventory/vendors', label: 'Vendors', icon: Truck, requiredCapabilities: [CAP.INVENTORY_READ] },

  // Inventory Management (Insights)
  inventoryTracking: { path: '/inventory/tracking', label: 'Inventory Tracking', icon: MapPin, requiredCapabilities: [CAP.INVENTORY_READ] },
  stockAudit: { path: '/inventory/audit', label: 'Stock Audit', icon: ClipboardCheck, requiredCapabilities: [CAP.INVENTORY_READ] },
  reportsAnalytics: { path: '/inventory/reports', label: 'Reports & Analytics', icon: FileText, requiredCapabilities: [CAP.INVENTORY_READ] },

  // Inventory Master Setup
  inventoryMasterSetup: { path: '/inventory/master-setup', label: 'Inventory Master Setup', icon: Settings2, requiredCapabilities: [CAP.INVENTORY_MANAGE] },

  // Integrations
  assetVault: { path: '/asset-vault', label: 'Asset Vault', icon: Package, requiredCapabilities: [CAP.ASSET_VAULT_ACCESS] },
} as const satisfies Record<string, NavItem>

// ─────────────────────────────────────────────────────────────────────────────
// Full internal nav groups (admin / mixed persona)
// ─────────────────────────────────────────────────────────────────────────────

export const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [ITEMS.dashboard, ITEMS.myAccess, ITEMS.myTasks, ITEMS.interviewAssignments],
  },
  {
    label: 'Organization',
    items: [
      ITEMS.users,
      ITEMS.userLogs,
      ITEMS.roles,
      ITEMS.clients,
      ITEMS.sites,
      ITEMS.departments,
      ITEMS.siteRoleRequirements,
    ],
  },
  {
    label: 'Sales',
    items: [ITEMS.salesDashboard, ITEMS.salesLeads],
  },
  {
    label: 'Operations',
    items: [ITEMS.operationsSurveys, ITEMS.mobilisation],
  },
  {
    label: 'Commercials',
    items: [ITEMS.masters, ITEMS.componentRules, ITEMS.budgets],
  },
  {
    label: 'Requests & approvals',
    items: [ITEMS.mrf, ITEMS.approvalSetup, ITEMS.tatManagement],
  },
  {
    label: 'Talent',
    items: [ITEMS.qrCampaigns, ITEMS.formBuilder, ITEMS.intakeSubmissions, ITEMS.resumePool, ITEMS.resumeReviewQueue],
  },
  {
    label: 'Hiring',
    items: [
      ITEMS.hiringDemands,
      ITEMS.hiringApplications,
      ITEMS.interviewPipeline,
      ITEMS.interviewAssignments,
      ITEMS.offers,
    ],
  },
  {
    label: 'Deployment',
    items: [
      ITEMS.employees,
      ITEMS.siteDeployments,
      ITEMS.deploymentHistory,
    ],
  },
  {
    label: 'Inventory Operations',
    items: [
      ITEMS.inventoryDashboard,
      ITEMS.inventoryOperations,
      ITEMS.inventoryItems,
      ITEMS.warehouses,
      ITEMS.procurement,
      ITEMS.stockMovements,
      ITEMS.siteInventory,
      ITEMS.employeeAssets,
      ITEMS.vendors,
      ITEMS.inventoryMasterSetup,
    ],
  },
  {
    label: 'Inventory Insights',
    items: [
      ITEMS.inventoryTracking,
      ITEMS.stockAudit,
      ITEMS.reportsAnalytics,
    ],
  },
  {
    label: 'Integrations',
    items: [ITEMS.assetVault],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Sales persona nav groups
// ─────────────────────────────────────────────────────────────────────────────

const salesNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [ITEMS.dashboard, ITEMS.myAccess, ITEMS.myTasks, ITEMS.interviewAssignments],
  },
  {
    label: 'Sales pipeline',
    items: [ITEMS.salesDashboard, ITEMS.salesLeads],
  },
  {
    label: 'Client setup',
    items: [ITEMS.clients, ITEMS.sites, ITEMS.siteRoleRequirements],
  },
  {
    label: 'Pricing',
    items: [ITEMS.componentRules, ITEMS.masters, ITEMS.budgets],
  },
  {
    label: 'Candidate intake',
    items: [ITEMS.qrCampaigns, ITEMS.formBuilder, ITEMS.intakeSubmissions],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Operations persona nav groups
// ─────────────────────────────────────────────────────────────────────────────

const operationsNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [ITEMS.dashboard, ITEMS.myAccess, ITEMS.myTasks, ITEMS.interviewAssignments],
  },
  {
    label: 'Operations work',
    items: [ITEMS.operationsSurveys],
  },
  {
    label: 'Site setup',
    items: [ITEMS.mobilisation, ITEMS.sites, ITEMS.siteRoleRequirements],
  },
  {
    label: 'Workforce',
    items: [ITEMS.employees, ITEMS.siteDeployments, ITEMS.deploymentHistory],
  },
  {
    label: 'Inventory Operations',
    items: [
      ITEMS.inventoryDashboard,
      ITEMS.inventoryItems,
      ITEMS.warehouses,
      ITEMS.procurement,
      ITEMS.stockMovements,
      ITEMS.siteInventory,
      ITEMS.employeeAssets,
      ITEMS.vendors,
      ITEMS.inventoryMasterSetup,
    ],
  },
  {
    label: 'Inventory Insights',
    items: [
      ITEMS.inventoryTracking,
      ITEMS.stockAudit,
      ITEMS.reportsAnalytics,
    ],
  },
  {
    label: 'Integrations',
    items: [ITEMS.assetVault],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Finance persona nav groups
// ─────────────────────────────────────────────────────────────────────────────

const financeNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [ITEMS.dashboard, ITEMS.myAccess, ITEMS.myTasks, ITEMS.interviewAssignments],
  },
  {
    label: 'Commercials',
    items: [ITEMS.budgets, ITEMS.componentRules, ITEMS.masters],
  },
  {
    label: 'Internal hiring requests',
    items: [ITEMS.mrf],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// HR persona nav groups
// ─────────────────────────────────────────────────────────────────────────────

const hrNavGroups: NavGroup[] = [
  {
    label: 'Overview',
    items: [ITEMS.dashboard, ITEMS.myAccess, ITEMS.myTasks, ITEMS.interviewAssignments],
  },
  {
    label: 'Talent sourcing',
    items: [
      ITEMS.qrCampaigns,
      ITEMS.formBuilder,
      ITEMS.intakeSubmissions,
      ITEMS.resumePool,
      ITEMS.resumeReviewQueue,
    ],
  },
  {
    label: 'Hiring workflow',
    items: [
      ITEMS.hiringDemands,
      ITEMS.hiringApplications,
      ITEMS.interviewPipeline,
      ITEMS.interviewAssignments,
      ITEMS.offers,
    ],
  },
  {
    label: 'Deployment',
    items: [ITEMS.employees, ITEMS.siteDeployments],
  },
  {
    label: 'Internal hiring requests',
    items: [ITEMS.mrf],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Client portal nav groups
// ─────────────────────────────────────────────────────────────────────────────

const clientPortalGroups: NavGroup[] = [
  {
    label: 'Account',
    items: [ITEMS.dashboard, ITEMS.myAccess, ITEMS.myTasks, ITEMS.interviewAssignments, ITEMS.companyProfile, ITEMS.clientSites, ITEMS.clientSiteRoleReqs],
  },
  {
    label: 'Commercials',
    items: [ITEMS.approvedBudgets],
  },
  {
    label: 'Workforce',
    items: [ITEMS.deployedEmployees],
  },
  {
    label: 'Requests',
    items: [ITEMS.clientMrf, ITEMS.clientCandidateReview, ITEMS.interviewAssignments],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Filter nav groups by user capabilities. Every persona group passes through
 * this function — capability checks are never bypassed.
 */
function filterByCapabilities(groups: NavGroup[], caps: string[]): NavGroup[] {
  return groups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) =>
        item.requiredCapabilities?.length ? hasAnyCapability(caps, item.requiredCapabilities) : true,
      ),
    }))
    .filter((group) => group.items.length > 0)
}

/**
 * Get nav groups for a specific persona.
 */
function getPersonaGroups(persona: string): NavGroup[] {
  switch (persona) {
    case 'sales':
      return salesNavGroups
    case 'operations':
      return operationsNavGroups
    case 'finance':
      return financeNavGroups
    case 'hr':
      return hrNavGroups
    case 'admin':
    case 'mixed':
    default:
      return navGroups
  }
}

/**
 * Returns the sidebar groups for the current user.
 * - Client-facing users get the trimmed client portal nav
 * - Internal users get persona-based nav filtered by capabilities
 *
 * Capability filtering is always applied — persona nav only controls which
 * shortcuts appear, not route access.
 */
export function buildNavGroups(me: MeResponse | null | undefined): NavGroup[] {
  const caps = me?.capabilities ?? []

  // Client portal
  if (isClientFacingUser(me)) {
    return filterByCapabilities(clientPortalGroups, caps)
  }

  // Internal: persona-based nav
  const persona = getNavPersona(me)
  const groups = getPersonaGroups(persona)
  return filterByCapabilities(groups, caps)
}

/** Flat list in sidebar order; used by `titleForPath` and dashboard shortcuts. */
export const navItems: NavItem[] = navGroups.flatMap((group) => group.items)

const routeTitles: Record<string, string> = Object.fromEntries(navItems.map((item) => [item.path, item.label]))

routeTitles['/'] = 'Home'
routeTitles['/deployment/client-employees'] = 'Deployed employees'

export function titleForPath(pathname: string): string {
  if (routeTitles[pathname]) {
    return routeTitles[pathname]!
  }
  const match = navItems.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
  return match?.label ?? 'Logicon ATS'
}
