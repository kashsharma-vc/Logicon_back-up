export type SubmissionStatus =
  | 'new'
  | 'reviewed'
  | 'shortlisted'
  | 'rejected'
  | 'contacted'
  | 'hired'
  | 'duplicate'

export interface IntakeSubmissionRow {
  id: number
  campaign: number
  campaign_name?: string | null
  campaign_title?: string | null
  site: number | null
  candidate: number
  job_role: number | null
  job_role_name?: string | null
  job_role_code?: string | null
  first_name: string
  middle_name: string
  last_name: string
  full_name: string
  other_role_title: string
  mobile_number: string
  mobile_number_normalized: string
  status: SubmissionStatus | string
  language: string
  is_possible_duplicate: boolean
  submitted_at: string
  updated_at: string
}

export interface IntakeSubmissionAnswerRow {
  id: number
  field: number | null
  field_label_snapshot: string
  field_type_snapshot: string
  value: unknown
  created_at: string
}

export interface IntakeSubmissionDocumentRow {
  id: number
  document_type: string
  file: string
  original_filename: string
  content_type: string
  size_bytes: number
  uploaded_at: string
}

export interface IntakeSubmissionDetail extends IntakeSubmissionRow {
  duplicate_reason: string
  ip_address: string | null
  user_agent: string
  answers: IntakeSubmissionAnswerRow[]
  documents: IntakeSubmissionDocumentRow[]
}


