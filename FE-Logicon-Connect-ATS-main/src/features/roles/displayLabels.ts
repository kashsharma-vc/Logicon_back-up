/** Display helpers for read-only role catalog (scope types match ScopeNode.node_type). */

const SCOPE_LABELS: Record<string, string> = {
  company: 'Company',
  client: 'Client',
  site: 'Site',
  department: 'Department',
  region: 'Region',
  city: 'City',
  cost_center: 'Cost Center',
}

export function formatAssignableLevel(node_type_scope: string | null | undefined): string {
  if (node_type_scope == null || node_type_scope.trim() === '') return 'No restriction'
  return SCOPE_LABELS[node_type_scope] ?? node_type_scope
}

/** @deprecated prefer formatAssignableLevel for role-catalog UX */
export function formatRoleScopeDisplay(node_type_scope: string | null | undefined): string {
  return formatAssignableLevel(node_type_scope)
}

/** Business-friendly label for permission `resource` (grouping in summaries). */
export function permissionAreaLabel(resource: string): string {
  const map: Record<string, string> = {
    user: 'Users',
    role: 'Roles & access',
    client: 'Clients',
    site: 'Sites',
    mrf: 'Manpower requests',
    workflow: 'Approvals',
    workflow_config: 'Approval setup',
    client_onboarding: 'Mobilisation',
    department: 'Departments',
    campaign: 'Campaigns',
    submission: 'Intake submissions',
    site_role_requirement: 'Site role requirements',
    job_role: 'Job roles',
    wage: 'Wages',
    hiring_application: 'Hiring',
    site_deployment: 'Site deployment',
    deployment: 'Deployment',
    core: 'Core',
    access: 'Access',
    onboarding: 'Mobilisation',
  }
  return map[resource] ?? resource.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
