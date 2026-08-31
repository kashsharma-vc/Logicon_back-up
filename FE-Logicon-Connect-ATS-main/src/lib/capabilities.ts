/**
 * Capability strings aligned with enterprise-backend/apps/access/capabilities.py
 */
export const CAP = {
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',

  ROLE_READ: 'role.read',
  ROLE_CREATE: 'role.create',
  ROLE_UPDATE: 'role.update',
  ROLE_DELETE: 'role.delete',

  CLIENT_READ: 'client.read',
  CLIENT_CREATE: 'client.create',
  CLIENT_UPDATE: 'client.update',
  CLIENT_DELETE: 'client.delete',

  SITE_READ: 'site.read',
  SITE_CREATE: 'site.create',
  SITE_UPDATE: 'site.update',
  SITE_DELETE: 'site.delete',

  SITE_ROLE_REQUIREMENT_READ: 'site_role_requirement.read',
  SITE_ROLE_REQUIREMENT_CREATE: 'site_role_requirement.create',
  SITE_ROLE_REQUIREMENT_UPDATE: 'site_role_requirement.update',
  SITE_ROLE_REQUIREMENT_DELETE: 'site_role_requirement.delete',

  JOB_ROLE_READ: 'job_role.read',
  JOB_ROLE_CREATE: 'job_role.create',
  JOB_ROLE_UPDATE: 'job_role.update',
  JOB_ROLE_DELETE: 'job_role.delete',
  WAGE_READ: 'wage.read',
  WAGE_CREATE: 'wage.create',
  WAGE_UPDATE: 'wage.update',
  WAGE_DELETE: 'wage.delete',
  CAMPAIGN_READ: 'campaign.read',
  CAMPAIGN_CREATE: 'campaign.create',
  CAMPAIGN_UPDATE: 'campaign.update',
  CAMPAIGN_DELETE: 'campaign.delete',
  SUBMISSION_READ: 'submission.read',
  SUBMISSION_UPDATE: 'submission.update',
  MRF_READ: 'mrf.read',
  MRF_CREATE: 'mrf.create',
  MRF_UPDATE: 'mrf.update',
  MRF_DELETE: 'mrf.delete',
  MRF_OVERRIDE_COMMERCIALS: 'mrf.override_commercials',

  CLIENT_ONBOARDING_READ: 'client_onboarding.read',
  CLIENT_ONBOARDING_CREATE: 'client_onboarding.create',
  CLIENT_ONBOARDING_UPDATE: 'client_onboarding.update',
  CLIENT_ONBOARDING_DELETE: 'client_onboarding.delete',

  MOBILISATION_READ: 'mobilisation.read',
  MOBILISATION_CREATE: 'mobilisation.create',
  MOBILISATION_UPDATE: 'mobilisation.update',
  MOBILISATION_FINALIZE: 'mobilisation.finalize',
  MOBILISATION_MANAGE: 'mobilisation.manage',

  SALES_LEAD_READ: 'sales_lead.read',
  SALES_LEAD_UPDATE: 'sales_lead.update',
  SALES_LEAD_MANAGE: 'sales_lead.manage',

  SALES_SURVEY_READ: 'sales_survey.read',
  SALES_SURVEY_UPDATE: 'sales_survey.update',
  SALES_SURVEY_ASSIGN: 'sales_survey.assign',
  SALES_SURVEY_MANAGE: 'sales_survey.manage',

  SALES_PROPOSAL_READ: 'sales_proposal.read',
  SALES_PROPOSAL_UPDATE: 'sales_proposal.update',
  SALES_PROPOSAL_APPROVE: 'sales_proposal.approve',
  SALES_PROPOSAL_MANAGE: 'sales_proposal.manage',
  SALES_PROPOSAL_SEND_TO_CLIENT: 'sales_proposal.send_to_client',

  WORKFLOW_READ: 'workflow.read',
  WORKFLOW_START: 'workflow.start_workflow',
  WORKFLOW_APPROVE: 'workflow.approve',
  WORKFLOW_REJECT: 'workflow.reject',
  WORKFLOW_REASSIGN: 'workflow.reassign',
  WORKFLOW_CONFIG_READ: 'workflow.config.read',
  WORKFLOW_CONFIG_MANAGE: 'workflow.config.manage',

  CANDIDATE_READ: 'candidate.read',
  CANDIDATE_CREATE: 'candidate.create',
  CANDIDATE_UPDATE: 'candidate.update',
  CANDIDATE_SHORTLIST: 'candidate.shortlist',

  RESUME_READ: 'resume.read',
  RESUME_VIEW: 'resume.view_resume',
  RESUME_UPLOAD: 'resume.upload',

  HIRING_APPLICATION_READ: 'hiring_application.read',
  HIRING_APPLICATION_CREATE: 'hiring_application.create',
  HIRING_APPLICATION_UPDATE: 'hiring_application.update',
  HIRING_APPLICATION_MANAGE: 'hiring_application.manage',
  PIPELINE_STAGE_READ: 'pipeline_stage.read',
  CANDIDATE_MATCH_READ: 'candidate_match.read',

  INTERVIEW_READ: 'interview.read',
  INTERVIEW_CREATE: 'interview.create',
  INTERVIEW_MANAGE: 'interview.manage',
  INTERVIEW_ASSIGNMENT_READ: 'interview.assignment.read',
  INTERVIEW_FEEDBACK_CREATE: 'interview.feedback.create',

  OFFER_READ: 'offer.read',
  OFFER_CREATE: 'offer.create',
  OFFER_UPDATE: 'offer.update',
  OFFER_APPROVE: 'offer.approve',
  OFFER_MANAGE: 'offer.manage',

  EMPLOYEE_READ: 'employee.read',
  EMPLOYEE_CREATE: 'employee.create',
  EMPLOYEE_UPDATE: 'employee.update',
  EMPLOYEE_MANAGE: 'employee.manage',

  SITE_DEPLOYMENT_READ: 'site_deployment.read',
  SITE_DEPLOYMENT_CREATE: 'site_deployment.create',
  SITE_DEPLOYMENT_UPDATE: 'site_deployment.update',
  SITE_DEPLOYMENT_MANAGE: 'site_deployment.manage',

  DEPLOYMENT_READ: 'deployment.read',
  DEPLOYMENT_CREATE: 'deployment.create',
  DEPLOYMENT_MANAGE: 'deployment.manage',

  BUDGET_READ: 'budget.read',
  BUDGET_CREATE: 'budget.create',
  BUDGET_UPDATE: 'budget.update',
  BUDGET_DELETE: 'budget.delete',

  DEPARTMENT_READ: 'department.read',
  DEPARTMENT_CREATE: 'department.create',
  DEPARTMENT_UPDATE: 'department.update',
  DEPARTMENT_DELETE: 'department.delete',

  INVENTORY_READ: 'inventory.read',
  INVENTORY_MANAGE: 'inventory.manage',
  ASSET_VAULT_ACCESS: 'asset_vault.access',

} as const

export function hasAnyCapability(userCaps: string[] | undefined, required: string[]): boolean {
  if (!userCaps?.length || !required.length) {
    return false
  }
  const set = new Set(userCaps)
  return required.some((c) => set.has(c))
}

/** User must have every listed capability. */
export function hasAllCapabilities(userCaps: string[] | undefined, required: string[]): boolean {
  if (!required.length) return true
  if (!userCaps?.length) return false
  const set = new Set(userCaps)
  return required.every((c) => set.has(c))
}

/** Deployment area: allow site deployment or legacy deployment.read */
export const DEPLOYMENT_ANY = [CAP.SITE_DEPLOYMENT_READ, CAP.DEPLOYMENT_READ] as const

/** Masters: job roles and/or wage masters */
export const MASTERS_ANY = [CAP.JOB_ROLE_READ, CAP.WAGE_READ] as const


