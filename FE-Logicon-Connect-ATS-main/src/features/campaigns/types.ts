export type LangCode = 'en' | 'hi' | 'mr'

export interface CampaignJobRoleRow {
  id: number
  campaign: number
  job_role: number
  is_active: boolean
  job_role_name: string
  job_role_code: string
}

export interface CampaignRow {
  id: number
  org: number
  site: number | null
  name: string
  title: string
  code: string
  token: string
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  allow_duplicates: boolean
  requires_otp: boolean
  shuffle_fields: boolean
  default_language: LangCode
  enabled_languages: string[]
  campaign_roles: CampaignJobRoleRow[]
  /** Phase Form-Builder-Frontend-B: optional reusable intake template. */
  form_template?: number | null
  form_template_name?: string | null
  form_template_code?: string | null
  created_at: string
  updated_at: string
}

export interface CampaignWriteInput {
  name: string
  title?: string
  code: string
  site?: number | null
  is_active?: boolean
  starts_at?: string | null
  ends_at?: string | null
  allow_duplicates?: boolean
  requires_otp?: boolean
  shuffle_fields?: boolean
  default_language?: string
  enabled_languages?: string[]
  /** Phase Form-Builder-Frontend-B: optional reusable intake template. */
  form_template?: number | null
}

export interface CampaignJobRoleWriteInput {
  campaign: number
  job_role: number
  is_active?: boolean
}


