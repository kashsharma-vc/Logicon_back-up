import type { DocumentTypeCode, ProfileQuality, ProfileQualityChecks } from '@/features/talent/types'

/** Business-friendly labels for resume processing state (no technical jargon). */
export function resumeStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const map: Record<string, string> = {
    uploaded: 'Received',
    extracting: 'Processing',
    ocr_required: 'Needs extra capture',
    parsing: 'Structuring',
    validating: 'Checking',
    indexed: 'Ready',
    manual_review: 'Needs review',
    failed: 'Could not process',
    duplicate_file: 'Duplicate file',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

export function resumeStatusVariant(
  status: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'attention' {
  if (!status) return 'neutral'
  const s = status.toLowerCase()
  if (s === 'indexed') return 'success'
  if (s === 'manual_review') return 'attention'
  if (s === 'failed') return 'danger'
  if (s === 'duplicate_file') return 'warning'
  if (s === 'uploaded' || s === 'extracting' || s === 'parsing' || s === 'validating' || s === 'ocr_required') return 'info'
  return 'neutral'
}

/** Pool card status labels per document-history UX spec. */
export function poolResumeStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const s = status.toLowerCase()
  if (s === 'indexed') return 'Ready'
  if (s === 'manual_review') return 'Needs review'
  if (s === 'failed') return 'Failed'
  if (s === 'duplicate_file') return 'Duplicate'
  if (s === 'uploaded' || s === 'extracting' || s === 'parsing' || s === 'validating' || s === 'ocr_required') {
    return 'Processing'
  }
  return resumeStatusLabel(status)
}

export function poolResumeStatusVariant(
  status: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'attention' {
  if (!status) return 'neutral'
  const s = status.toLowerCase()
  if (s === 'indexed') return 'success'
  if (s === 'manual_review') return 'attention'
  if (s === 'failed') return 'danger'
  if (s === 'duplicate_file') return 'warning'
  if (s === 'uploaded' || s === 'extracting' || s === 'parsing' || s === 'validating') return 'info'
  return 'neutral'
}

export function documentTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Imported'
  const map: Record<string, string> = {
    pdf: 'PDF resume',
    docx: 'Word resume',
    doc: 'Word resume',
    txt: 'Text resume',
    xlsx: 'Excel import',
    csv: 'CSV import',
    unknown: 'Imported',
  }
  return map[type.toLowerCase()] ?? 'Imported'
}

export function documentTypeShort(type: string | null | undefined): string {
  if (!type) return '—'
  const map: Record<string, string> = {
    pdf: 'PDF',
    docx: 'DOCX',
    doc: 'DOC',
    txt: 'TXT',
    xlsx: 'XLSX',
    csv: 'CSV',
  }
  return map[type.toLowerCase()] ?? type.toUpperCase()
}

export function sourceTypeLabel(source: string | null | undefined): string {
  if (!source) return '—'
  const map: Record<string, string> = {
    qr_intake: 'QR intake',
    bulk_upload: 'Bulk upload',
    excel_import: 'Excel import',
    manual_upload: 'Manual upload',
    manual_intake: 'Manual entry',
    recruiter_upload: 'Recruiter upload',
    campaign: 'Campaign',
    qr: 'QR code',
    referral: 'Referral',
    portal: 'Portal',
    import_: 'Import',
  }
  return map[source.toLowerCase()] ?? source.replace(/_/g, ' ')
}

export function sourceTypeVariant(
  source: string | null | undefined,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (!source) return 'neutral'
  const s = source.toLowerCase()
  if (s === 'qr_intake' || s === 'qr') return 'info'
  return 'neutral'
}

export const SOURCE_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All sources' },
  { value: 'qr_intake', label: 'QR intake' },
  { value: 'bulk_upload', label: 'Bulk upload' },
  { value: 'excel_import', label: 'Excel import' },
  { value: 'manual_upload', label: 'Manual upload' },
  { value: 'recruiter_upload', label: 'Recruiter upload' },
  { value: 'portal', label: 'Portal' },
  { value: 'referral', label: 'Referral' },
  { value: 'campaign', label: 'Campaign' },
]

export function importBatchStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const map: Record<string, string> = {
    queued: 'Queued',
    processing: 'Processing',
    completed: 'Completed',
    completed_with_errors: 'Completed with issues',
    failed: 'Failed',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

const PROFILE_QUALITY_CHECK_LABELS: Record<keyof ProfileQualityChecks, string> = {
  phone_present: 'Phone',
  mapped_role_present: 'Mapped role',
  resume_file_present: 'Resume file',
  skills_present: 'Skills',
  experience_present: 'Experience',
  education_present: 'Education',
  location_present: 'Location',
}

export function profileQualityCheckLabel(key: string): string {
  return PROFILE_QUALITY_CHECK_LABELS[key as keyof ProfileQualityChecks] ?? key.replace(/_/g, ' ')
}

export type ProfileQualityTier = 'complete' | 'needs_info' | 'weak' | 'unknown'

export function profileQualityTier(score: number | null | undefined): ProfileQualityTier {
  if (score == null) return 'unknown'
  const s = score
  if (s >= 80) return 'complete'
  if (s >= 50) return 'needs_info'
  return 'weak'
}

export function profileQualityTierLabel(tier: ProfileQualityTier): string {
  if (tier === 'complete') return 'Complete'
  if (tier === 'needs_info') return 'Needs info'
  if (tier === 'unknown') return 'Not scored'
  return 'Weak profile'
}

export function profileQualityTierVariant(
  tier: ProfileQualityTier,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (tier === 'complete') return 'success'
  if (tier === 'needs_info') return 'warning'
  if (tier === 'unknown') return 'neutral'
  return 'danger'
}

export function profileQualityCheckItems(pq: ProfileQuality | null | undefined): { key: string; label: string; present: boolean }[] {
  if (!pq?.checks) return []
  return Object.entries(pq.checks).map(([key, present]) => ({
    key,
    label: profileQualityCheckLabel(key),
    present: Boolean(present),
  }))
}

export const DOCUMENT_TYPE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All document types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'txt', label: 'TXT' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
]

export function isDocumentTypeCode(v: string): v is DocumentTypeCode {
  return ['pdf', 'docx', 'doc', 'txt', 'xlsx', 'csv', 'unknown'].includes(v)
}

export function hiringApplicationStatusLabel(status: string | null | undefined): string {
  if (!status) return '—'
  const map: Record<string, string> = {
    draft: 'Draft',
    shortlisted: 'Shortlisted',
    client_review: 'Client review',
    interview_scheduled: 'Interview scheduled',
    interview_in_progress: 'Interview in progress',
    selected: 'Selected',
    rejected: 'Rejected',
    offer_released: 'Offer released',
    offer_accepted: 'Offer accepted',
    offer_declined: 'Offer declined',
    deployed: 'Deployed',
    cancelled: 'Cancelled',
  }
  return map[status] ?? status.replace(/_/g, ' ')
}

export const HIRING_APPLICATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: hiringApplicationStatusLabel('draft') },
  { value: 'shortlisted', label: hiringApplicationStatusLabel('shortlisted') },
  { value: 'client_review', label: hiringApplicationStatusLabel('client_review') },
  { value: 'interview_scheduled', label: hiringApplicationStatusLabel('interview_scheduled') },
  { value: 'interview_in_progress', label: hiringApplicationStatusLabel('interview_in_progress') },
  { value: 'selected', label: hiringApplicationStatusLabel('selected') },
  { value: 'rejected', label: hiringApplicationStatusLabel('rejected') },
  { value: 'offer_released', label: hiringApplicationStatusLabel('offer_released') },
  { value: 'offer_accepted', label: hiringApplicationStatusLabel('offer_accepted') },
  { value: 'offer_declined', label: hiringApplicationStatusLabel('offer_declined') },
  { value: 'deployed', label: hiringApplicationStatusLabel('deployed') },
  { value: 'cancelled', label: hiringApplicationStatusLabel('cancelled') },
]

// ─── Candidate Journey Status ────────────────────────────────────────────────

const JOURNEY_STATUS_LABELS: Record<string, string> = {
  unknown: 'Unknown',
  available: 'Available',
  available_from_date: 'Available (future)',
  notice_period: 'Notice period',
  not_available: 'Not available',
  shortlisted: 'Shortlisted',
  sent_to_client: 'Sent to client',
  client_approved: 'Client approved',
  client_rejected: 'Client rejected',
  interview: 'Interview',
  offer_draft: 'Offer draft',
  offer_released: 'Offer released',
  offer_accepted: 'Offer accepted',
  offer_declined: 'Offer declined',
  offer_withdrawn: 'Offer withdrawn',
  offer_expired: 'Offer expired',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  deployed: 'Deployed',
  employee_active: 'Active employee',
  employee_inactive: 'Inactive employee',
  employee_suspended: 'Suspended',
  deployment_planned: 'Deployment planned',
  exited: 'Exited',
  deployment_completed: 'Deployment completed',
  deployment_transferred: 'Transferred',
  deployment_cancelled: 'Deployment cancelled',
  duplicate: 'Duplicate',
  blacklisted: 'Blacklisted',
  do_not_contact: 'Do not contact',
}

/**
 * Returns a business-friendly label for candidate journey status.
 * Uses backend-provided label if available, otherwise falls back to mapping.
 */
export function candidateJourneyStatusLabel(
  status?: string | null,
  backendLabel?: string | null,
): string {
  if (backendLabel?.trim()) return backendLabel.trim()
  if (!status) return 'Unknown'
  return JOURNEY_STATUS_LABELS[status] ?? status.replace(/_/g, ' ')
}

/**
 * Returns badge variant for candidate journey status.
 */
export function candidateJourneyStatusVariant(
  status?: string | null,
): 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'attention' {
  if (!status) return 'neutral'
  const s = status.toLowerCase()

  // Success states - available, hired, active
  if (['available', 'available_from_date', 'notice_period', 'client_approved'].includes(s)) {
    return 'success'
  }

  // Info states - in progress
  if (['shortlisted', 'sent_to_client', 'interview', 'offer_draft', 'offer_released', 'offer_accepted', 'deployment_planned'].includes(s)) {
    return 'info'
  }

  // Warning states - draft, pending, suspended
  if (['employee_active', 'employee_inactive', 'employee_suspended', 'deployment_transferred'].includes(s)) {
    return 'warning'
  }

  // Danger states - rejected, declined, blocked
  if (['not_available', 'client_rejected', 'offer_declined', 'offer_withdrawn', 'offer_expired', 'rejected', 'cancelled', 'deployment_cancelled', 'duplicate', 'blacklisted', 'do_not_contact'].includes(s)) {
    return 'danger'
  }

  // Neutral states - completed, exited, unknown
  if (['deployed', 'exited', 'deployment_completed', 'unknown'].includes(s)) {
    return 'neutral'
  }

  return 'neutral'
}

/**
 * Returns true if the journey status indicates the candidate should not be shortlisted.
 */
export function isJourneyStatusBlocked(status?: string | null): boolean {
  if (!status) return false
  const s = status.toLowerCase()
  return [
    'offer_accepted',
    'deployed',
    'deployment_planned',
    'deployment_completed',
    'deployment_transferred',
    'deployment_cancelled',
    'employee_active',
    'employee_inactive',
    'employee_suspended',
    'exited',
    'blacklisted',
    'do_not_contact',
    'duplicate',
  ].includes(s)
}

export const JOURNEY_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All journey statuses' },
  { value: 'unknown', label: 'Unknown' },
  { value: 'available', label: 'Available' },
  { value: 'available_from_date', label: 'Available from date' },
  { value: 'notice_period', label: 'Notice period' },
  { value: 'not_available', label: 'Not available' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'sent_to_client', label: 'Sent to client' },
  { value: 'client_approved', label: 'Client approved' },
  { value: 'client_rejected', label: 'Client rejected' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer_draft', label: 'Offer draft' },
  { value: 'offer_released', label: 'Offer released' },
  { value: 'offer_accepted', label: 'Offer accepted' },
  { value: 'offer_declined', label: 'Offer declined' },
  { value: 'offer_withdrawn', label: 'Offer withdrawn' },
  { value: 'offer_expired', label: 'Offer expired' },
  { value: 'deployed', label: 'Deployed' },
  { value: 'deployment_planned', label: 'Deployment planned' },
  { value: 'deployment_completed', label: 'Deployment completed' },
  { value: 'deployment_transferred', label: 'Deployment transferred' },
  { value: 'deployment_cancelled', label: 'Deployment cancelled' },
  { value: 'employee_active', label: 'Active employee' },
  { value: 'employee_inactive', label: 'Inactive employee' },
  { value: 'employee_suspended', label: 'Suspended employee' },
  { value: 'exited', label: 'Exited' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'blacklisted', label: 'Blacklisted' },
  { value: 'do_not_contact', label: 'Do not contact' },
]
