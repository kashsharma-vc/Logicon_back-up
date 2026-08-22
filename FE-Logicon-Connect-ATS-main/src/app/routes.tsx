import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireCapability } from '@/features/auth/RequireCapability'
import { RequireInternal } from '@/features/auth/RequireInternal'
import { LoginPage } from '@/features/auth/LoginPage'
import { SetPasswordPage } from '@/features/auth/SetPasswordPage'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { MyTasksPage } from '@/features/workflowTasks/MyTasksPage'
import { MePage } from '@/features/me/MePage'
import { PlaceholderPage } from '@/features/placeholder/PlaceholderPage'
import { UsersPage } from '@/features/users/UsersPage'
import { LogsDashboardPage } from '@/features/audit/LogsDashboardPage'
import { UserAccessPage } from '@/features/users/UserAccessPage'
import { RolesPage } from '@/features/roles/RolesPage'
import { HiringTATDashboard } from '@/features/dashboard/HiringTATDashboard'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { SitesPage } from '@/features/sites/SitesPage'
import { DepartmentsPage } from '@/features/departments/DepartmentsPage'
import { SiteRoleRequirementsPage } from '@/features/siteRoleRequirements/SiteRoleRequirementsPage'
import { CampaignsPage } from '@/features/campaigns/CampaignsPage'
import { FormBuilderListPage } from '@/features/formBuilder/FormBuilderListPage'
import { FormTemplateEditorPage } from '@/features/formBuilder/FormTemplateEditorPage'
import { IntakeSubmissionsPage } from '@/features/intakeSubmissions/IntakeSubmissionsPage'
import { IntakeSubmissionDetailPage } from '@/features/intakeSubmissions/IntakeSubmissionDetailPage'
import { ApplyPage } from '@/features/publicApply/ApplyPage'
import { MRFListPage } from '@/features/mrf/MRFListPage'
import { MRFDetailPage } from '@/features/mrf/MRFDetailPage'
import { MobilisationListPage } from '@/features/mobilisation/MobilisationListPage'
import { MobilisationDetailPage } from '@/features/mobilisation/MobilisationDetailPage'
import { ApprovalSetupPage } from '@/features/approvalSetup/ApprovalSetupPage'
import { TATPage } from '@/features/tat/TATPage'
import { MastersPage } from '@/features/masters/MastersPage'
import { BudgetPlansPage } from '@/features/budgets/BudgetPlansPage'
import { ClientBudgetCommercialsPage } from '@/features/budgets/ClientBudgetCommercialsPage'
import { CandidatesListPage } from '@/features/talent/CandidatesListPage'
import { CandidateDetailPage } from '@/features/talent/CandidateDetailPage'
import { ResumeReviewQueuePage } from '@/features/talent/ResumeReviewQueuePage'
import { HiringDemandsPage } from '@/features/hiring/HiringDemandsPage'
import { HiringDemandDetailPage } from '@/features/hiring/HiringDemandDetailPage'
import { HiringApplicationsListPage } from '@/features/hiring/HiringApplicationsListPage'
import { HiringApplicationDetailPage } from '@/features/hiring/HiringApplicationDetailPage'
import { InterviewPipelinePage } from '@/features/hiring/InterviewPipelinePage'
import { InterviewAssignmentsPage } from '@/features/hiring/InterviewAssignmentsPage'
import { ClientReviewPage } from '@/features/hiring/ClientReviewPage'
import { OffersPage } from '@/features/hiring/OffersPage'
import { InventoryComingSoonPage } from '@/features/inventory/ComingSoonPage'
import { InventoryOperationsPage } from '@/features/inventory/InventoryOperationsPage'
import { DashboardPage as InventoryDashboardPage } from '@/features/inventory/DashboardPage'
import { InventoryItemsPage } from '@/features/inventory/InventoryItemsPage'
import { InventoryMasterSetupPage } from '@/features/inventory/InventoryMasterSetupPage'
import { WarehouseManagementPage } from '@/features/inventory/warehouses/WarehouseManagementPage'
import { StockMovementsPage } from '@/features/inventory/movements/StockMovementsPage'
import { SiteInventoryPage } from '@/features/inventory/site-inventory/SiteInventoryPage'
import { EmployeesPage } from '@/features/deployment/EmployeesPage'
import { ClientEmployeesPage } from '@/features/deployment/ClientEmployeesPage'
import { SiteDeploymentsPage } from '@/features/deployment/SiteDeploymentsPage'
import { DeploymentHistoryPage } from '@/features/deployment/DeploymentHistoryPage'
import { SalesDashboardPage } from '@/features/sales/SalesDashboardPage'
import { ProposalComponentRulesPage } from '@/features/sales/ProposalComponentRulesPage'
import { SalesLeadListPage } from '@/features/sales/SalesLeadListPage'
import { SalesLeadDetailPage } from '@/features/sales/SalesLeadDetailPage'
import { SiteSurveyWorkspacePage } from '@/features/sales/SiteSurveyWorkspacePage'
import { SalesProposalWorkspacePage } from '@/features/sales/SalesProposalWorkspacePage'
import { PublicProposalResponsePage } from '@/features/sales/PublicProposalResponsePage'
import { OperationsSurveyQueuePage } from '@/features/sales/OperationsSurveyQueuePage'
import { FieldTrackingPage } from '@/features/fieldTracking/FieldTrackingPage'
import { AttendanceDashboardPage } from '@/features/attendance/AttendanceDashboardPage'
import { CAP, DEPLOYMENT_ANY, MASTERS_ANY } from '@/lib/capabilities'
import { AssetVaultPage } from '@/features/integrations/AssetVaultPage'

// ─── Route path constants ─────────────────────────────────────────────────────
export const ROUTES = {
  DASHBOARD: '/dashboard',
  SALES: '/sales',
  SALES_DASHBOARD: '/sales/dashboard',
  SALES_LEADS: '/sales/leads',
  SALES_LEAD_DETAIL: (id: number | string) => `/sales/leads/${id}`,
  SALES_SURVEY_DETAIL: (id: number | string) => `/sales/surveys/${id}`,
  OPERATIONS_SURVEY_DETAIL: (id: number | string) => `/sales/operations-surveys/${id}`,
  SALES_PROPOSAL_DETAIL: (id: number | string) => `/sales/proposals/${id}`,
  PROPOSAL_RESPONSE: '/proposal-response',
  MOBILISATION: '/mobilisation',
  MOBILISATION_DETAIL: (id: number | string) => `/mobilisation/${id}`,
  CLIENT_ONBOARDING: '/client-onboarding',
  CLIENT_ONBOARDING_DETAIL: (id: number | string) => `/client-onboarding/${id}`,
} as const

function LegacyWageMasterRedirect() {
  const { search } = useLocation()
  return <Navigate to={{ pathname: '/masters', search }} replace />
}

function ClientOnboardingDetailRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/mobilisation/${id}`} replace />
}

function HiringDemandLegacyRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/hiring/demands/${id}`} replace />
}

function HiringApplicationLegacyRedirect() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/hiring/applications/${id}`} replace />
}

import { FieldEmployeeLoginPage } from '@/features/auth/FieldEmployeeLoginPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/field-login', element: <FieldEmployeeLoginPage /> },
  { path: '/set-password', element: <SetPasswordPage /> },

  { path: '/apply/:token', element: <ApplyPage /> },
  { path: '/proposal-response', element: <PublicProposalResponsePage /> },
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'attendance-dashboard', element: <AttendanceDashboardPage /> },
          { path: 'field-tracking/*', element: <FieldTrackingPage /> },


          // Inventory
          { path: 'inventory', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryDashboardPage /></RequireCapability> },
          { path: 'inventory/items', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryItemsPage /></RequireCapability> },
          { path: 'inventory/warehouses', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><WarehouseManagementPage /></RequireCapability> },
          { path: 'inventory/procurement', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryComingSoonPage title="Procurement" /></RequireCapability> },
          { path: 'inventory/stock-movements', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><StockMovementsPage /></RequireCapability> },
          { path: 'inventory/site-inventory', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><SiteInventoryPage /></RequireCapability> },
          { path: 'inventory/employee-assets', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryComingSoonPage title="Employee Assets" /></RequireCapability> },
          { path: 'inventory/vendors', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryComingSoonPage title="Vendors" /></RequireCapability> },
          { path: 'inventory/operations', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryOperationsPage /></RequireCapability> },
          { path: 'inventory/tracking', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryComingSoonPage title="Inventory Tracking" /></RequireCapability> },
          { path: 'inventory/audit', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryComingSoonPage title="Stock Audit" /></RequireCapability> },
          { path: 'inventory/reports', element: <RequireCapability anyOf={[CAP.INVENTORY_READ]}><InventoryComingSoonPage title="Reports & Analytics" /></RequireCapability> },
          { path: 'inventory/master-setup', element: <RequireCapability anyOf={[CAP.INVENTORY_MANAGE]}><InventoryMasterSetupPage /></RequireCapability> },
          { path: 'me', element: <MePage /> },
          { path: 'my-tasks', element: <MyTasksPage /> },
          {
            path: 'users',
            element: (
              <RequireCapability anyOf={[CAP.USER_READ]}>
                <UsersPage />
              </RequireCapability>
            ),
          },
          {
            path: 'admin/logs',
            element: (
              <RequireCapability anyOf={[CAP.USER_READ]}>
                <LogsDashboardPage />
              </RequireCapability>
            ),
          },
          {
            path: 'users/:userId/access',
            element: (
              <RequireCapability anyOf={[CAP.ROLE_READ]}>
                <UserAccessPage />
              </RequireCapability>
            ),
          },
          {
            path: 'roles',
            element: (
              <RequireCapability anyOf={[CAP.ROLE_READ]}>
                <RolesPage />
              </RequireCapability>
            ),
          },
          {
            path: 'clients',
            element: (
              <RequireCapability anyOf={[CAP.CLIENT_READ]}>
                <ClientsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'sites',
            element: (
              <RequireCapability anyOf={[CAP.SITE_READ]}>
                <SitesPage />
              </RequireCapability>
            ),
          },
          {
            path: 'departments',
            element: (
              <RequireCapability anyOf={[CAP.DEPARTMENT_READ]}>
                <DepartmentsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'wage-master',
            element: <LegacyWageMasterRedirect />,
          },
          {
            path: 'masters',
            element: (
              <RequireCapability anyOf={[...MASTERS_ANY]}>
                <MastersPage />
              </RequireCapability>
            ),
          },
          {
            path: 'budgets',
            element: (
              <RequireCapability anyOf={[CAP.BUDGET_READ]}>
                <BudgetPlansPage />
              </RequireCapability>
            ),
          },
          {
            path: 'budgets/:id',
            element: (
              <RequireCapability anyOf={[CAP.BUDGET_READ]}>
                <ClientBudgetCommercialsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'site-role-requirements',
            element: (
              <RequireCapability anyOf={[CAP.SITE_ROLE_REQUIREMENT_READ]}>
                <SiteRoleRequirementsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'qr-campaigns',
            element: (
              <RequireCapability anyOf={[CAP.CAMPAIGN_READ]}>
                <CampaignsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'form-builder',
            element: (
              <RequireCapability anyOf={[CAP.CAMPAIGN_READ]}>
                <FormBuilderListPage />
              </RequireCapability>
            ),
          },
          {
            path: 'form-builder/:templateId',
            element: (
              <RequireCapability anyOf={[CAP.CAMPAIGN_READ]}>
                <FormTemplateEditorPage />
              </RequireCapability>
            ),
          },
          {
            path: 'intake-submissions',
            element: (
              <RequireCapability anyOf={[CAP.SUBMISSION_READ]}>
                <IntakeSubmissionsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'intake-submissions/:id',
            element: (
              <RequireCapability anyOf={[CAP.SUBMISSION_READ]}>
                <IntakeSubmissionDetailPage />
              </RequireCapability>
            ),
          },
          {
            path: 'attendance-dashboard',
            element: <AttendanceDashboardPage />,
          },
          {
            path: 'mrf',
            element: (
              <RequireCapability anyOf={[CAP.MRF_READ]}>
                <MRFListPage />
              </RequireCapability>
            ),
          },
          {
            path: 'mrf/:id',
            element: (
              <RequireCapability anyOf={[CAP.MRF_READ]}>
                <MRFDetailPage />
              </RequireCapability>
            ),
          },
          {
            path: 'mobilisation',
            element: (
              <RequireCapability anyOf={[CAP.MOBILISATION_READ]}>
                <MobilisationListPage />
              </RequireCapability>
            ),
          },
          {
            path: 'mobilisation/:id',
            element: (
              <RequireCapability anyOf={[CAP.MOBILISATION_READ]}>
                <MobilisationDetailPage />
              </RequireCapability>
            ),
          },
          {
            path: 'client-onboarding',
            element: <Navigate to="/mobilisation" replace />,
          },
          {
            path: 'client-onboarding/:id',
            element: <ClientOnboardingDetailRedirect />,
          },
          {
            path: 'sales',
            element: (
              <RequireCapability anyOf={[CAP.SALES_LEAD_READ]}>
                <Navigate to="/sales/dashboard" replace />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/dashboard',
            element: (
              <RequireCapability anyOf={[CAP.SALES_LEAD_READ]}>
                <SalesDashboardPage />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/leads',
            element: (
              <RequireCapability anyOf={[CAP.SALES_LEAD_READ]}>
                <SalesLeadListPage />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/leads/:id',
            element: (
              <RequireCapability anyOf={[CAP.SALES_LEAD_READ]}>
                <SalesLeadDetailPage />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/surveys/:id',
            element: (
              <RequireCapability anyOf={[CAP.SALES_SURVEY_READ]}>
                <SiteSurveyWorkspacePage />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/proposals/:id',
            element: (
              <RequireCapability anyOf={[CAP.SALES_PROPOSAL_READ]}>
                <SalesProposalWorkspacePage />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/operations-surveys',
            element: (
              <RequireCapability anyOf={[CAP.SALES_SURVEY_READ]}>
                <OperationsSurveyQueuePage />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/operations-surveys/:id',
            element: (
              <RequireCapability anyOf={[CAP.SALES_SURVEY_READ]}>
                <SiteSurveyWorkspacePage />
              </RequireCapability>
            ),
          },
          {
            path: 'sales/component-rules',
            element: (
              <RequireCapability anyOf={[CAP.SALES_PROPOSAL_READ]}>
                <ProposalComponentRulesPage />
              </RequireCapability>
            ),
          },
          {
            path: 'approval-setup',
            element: (
              <RequireCapability anyOf={[CAP.WORKFLOW_CONFIG_READ]}>
                <ApprovalSetupPage />
              </RequireCapability>
            ),
          },
          {
            path: 'tat-management',
            element: (
              <RequireCapability anyOf={[CAP.WORKFLOW_CONFIG_READ]}>
                <TATPage />
              </RequireCapability>
            ),
          },
          {
            path: 'candidates',
            element: (
              <RequireCapability anyOf={[CAP.CANDIDATE_READ]}>
                <CandidatesListPage />
              </RequireCapability>
            ),
          },
          {
            path: 'candidates/review-queue',
            element: (
              <RequireCapability anyOf={[CAP.RESUME_READ, CAP.RESUME_VIEW]}>
                <ResumeReviewQueuePage />
              </RequireCapability>
            ),
          },
          {
            path: 'candidates/:id',
            element: (
              <RequireCapability anyOf={[CAP.CANDIDATE_READ]}>
                <CandidateDetailPage />
              </RequireCapability>
            ),
          },
          {
            path: 'hiring/pipeline',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                  <InterviewPipelinePage />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'hiring/interview-assignments',
            element: (
              <RequireCapability anyOf={[CAP.INTERVIEW_READ, CAP.INTERVIEW_ASSIGNMENT_READ]}>
                <InterviewAssignmentsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'hiring/demands',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                  <HiringDemandsPage />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'hiring/demands/:id',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                  <HiringDemandDetailPage />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'hiring/applications',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                  <HiringApplicationsListPage />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'hiring/tat-dashboard',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                  <HiringTATDashboard />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'hiring/applications/:id',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                  <HiringApplicationDetailPage />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'hiring',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                  <Navigate to="/hiring/applications" replace />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'hiring-pipeline',
            element: (
              <RequireInternal>
                <Navigate to="/hiring/pipeline" replace />
              </RequireInternal>
            ),
          },
          {
            path: 'hiring-demands',
            element: (
              <RequireInternal>
                <Navigate to="/hiring/demands" replace />
              </RequireInternal>
            ),
          },
          {
            path: 'hiring-demands/:id',
            element: (
              <RequireInternal>
                <HiringDemandLegacyRedirect />
              </RequireInternal>
            ),
          },
          {
            path: 'hiring-applications',
            element: (
              <RequireInternal>
                <Navigate to="/hiring/applications" replace />
              </RequireInternal>
            ),
          },
          {
            path: 'hiring-applications/:id',
            element: (
              <RequireInternal>
                <HiringApplicationLegacyRedirect />
              </RequireInternal>
            ),
          },
          {
            path: 'talent/resume-review',
            element: <Navigate to="/candidates/review-queue" replace />,
          },
          {
            path: 'hiring/client-review',
            element: (
              <RequireCapability anyOf={[CAP.HIRING_APPLICATION_READ]}>
                <ClientReviewPage />
              </RequireCapability>
            ),
          },
          {
            path: 'hiring/offers',
            element: (
              <RequireInternal>
                <RequireCapability anyOf={[CAP.OFFER_READ, CAP.OFFER_CREATE, CAP.OFFER_UPDATE, CAP.OFFER_APPROVE, CAP.OFFER_MANAGE]}>
                  <OffersPage />
                </RequireCapability>
              </RequireInternal>
            ),
          },
          {
            path: 'deployment',
            element: (
              <RequireCapability anyOf={[...DEPLOYMENT_ANY]}>
                <PlaceholderPage title="Deployment" />
              </RequireCapability>
            ),
          },
          {
            path: 'deployment/employees',
            element: (
              <RequireCapability anyOf={[CAP.EMPLOYEE_READ]}>
                <EmployeesPage />
              </RequireCapability>
            ),
          },
          {
            path: 'deployment/client-employees',
            element: (
              <RequireCapability anyOf={[CAP.EMPLOYEE_READ]}>
                <ClientEmployeesPage />
              </RequireCapability>
            ),
          },
          {
            path: 'deployment/site-deployments',
            element: (
              <RequireCapability anyOf={[CAP.SITE_DEPLOYMENT_READ]}>
                <SiteDeploymentsPage />
              </RequireCapability>
            ),
          },
          {
            path: 'deployment/history',
            element: (
              <RequireCapability anyOf={[CAP.DEPLOYMENT_READ]}>
                <DeploymentHistoryPage />
              </RequireCapability>
            ),
          },
          {
            path: 'asset-vault',
            element: (
              <RequireCapability anyOf={[CAP.ASSET_VAULT_ACCESS]}>
                <AssetVaultPage />
              </RequireCapability>
            ),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },

])
