import * as XLSX from 'xlsx'
import { getIntakeSubmission, listIntakeSubmissions, type ListIntakeSubmissionsParams } from '@/api/intakeSubmissions'
import { saveBlob } from '@/lib/fileDownload'
import type { IntakeSubmissionDetail, IntakeSubmissionRow } from './types'

export interface ExportProgress {
  phase: 'fetching_list' | 'fetching_details' | 'building_excel'
  current?: number
  total?: number
  message: string
}

export interface ExportSubmissionsOptions {
  filters: ListIntakeSubmissionsParams
  campaignLabelById: Map<number, string>
  roleLabelById: Map<number, string>
  onProgress?: (progress: ExportProgress) => void
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
  contacted: 'Contacted',
  hired: 'Hired',
  duplicate: 'Duplicate',
}

function formatValue(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v))).join(', ')
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  return String(value).trim()
}

function matchesDateRange(submittedAt: string, fromDate?: string, toDate?: string): boolean {
  if (!fromDate && !toDate) return true
  if (!submittedAt) return false
  const subDate = new Date(submittedAt)
  if (isNaN(subDate.getTime())) return true

  const year = subDate.getFullYear()
  const month = String(subDate.getMonth() + 1).padStart(2, '0')
  const day = String(subDate.getDate()).padStart(2, '0')
  const subDateStr = `${year}-${month}-${day}`

  if (fromDate && subDateStr < fromDate) return false
  if (toDate && subDateStr > toDate) return false
  return true
}

function generateExportFilename(
  filters: ListIntakeSubmissionsParams,
  campaignLabelById: Map<number, string>,
  roleLabelById: Map<number, string>,
): string {
  const parts: string[] = ['Intake_Submissions']

  if (filters.job_role && roleLabelById.has(filters.job_role)) {
    const rawName = roleLabelById.get(filters.job_role)!
    const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 25)
    parts.push(`Role-${cleanName}`)
  }
  if (filters.campaign && campaignLabelById.has(filters.campaign)) {
    const rawName = campaignLabelById.get(filters.campaign)!
    const cleanName = rawName.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 25)
    parts.push(`Camp-${cleanName}`)
  }
  if (filters.status) {
    parts.push(`Status-${filters.status}`)
  }
  if (filters.from_date && filters.to_date) {
    parts.push(`${filters.from_date}_to_${filters.to_date}`)
  } else if (filters.from_date) {
    parts.push(`from_${filters.from_date}`)
  } else if (filters.to_date) {
    parts.push(`to_${filters.to_date}`)
  } else {
    parts.push(new Date().toISOString().slice(0, 10))
  }

  return `${parts.join('_')}.xlsx`
}

/**
 * Concurrently fetch details for multiple submissions with a concurrency limit.
 */
async function fetchSubmissionDetailsInBatches(
  rows: IntakeSubmissionRow[],
  concurrency = 8,
  onBatchProgress?: (completed: number, total: number) => void,
): Promise<IntakeSubmissionDetail[]> {
  const total = rows.length
  let completed = 0
  const results: IntakeSubmissionDetail[] = new Array(total)

  let nextIndex = 0
  async function worker() {
    while (nextIndex < total) {
      const idx = nextIndex++
      const row = rows[idx]
      if (!row) {
        completed++
        continue
      }
      try {
        const detail = await getIntakeSubmission(row.id)
        results[idx] = detail
      } catch {
        // Fallback: create a basic detail record if get fails
        results[idx] = {
          id: row.id,
          campaign: row.campaign,
          site: row.site,
          candidate: row.candidate,
          job_role: row.job_role,
          first_name: row.first_name,
          middle_name: row.middle_name,
          last_name: row.last_name,
          full_name: row.full_name,
          other_role_title: row.other_role_title,
          mobile_number: row.mobile_number,
          mobile_number_normalized: row.mobile_number_normalized,
          status: row.status,
          language: row.language,
          is_possible_duplicate: row.is_possible_duplicate,
          submitted_at: row.submitted_at,
          updated_at: row.updated_at,
          duplicate_reason: '',
          ip_address: null,
          user_agent: '',
          answers: [],
          documents: [],
        }
      }
      completed++
      if (onBatchProgress) {
        onBatchProgress(completed, total)
      }
    }
  }

  const workerCount = Math.min(concurrency, total)
  const workers: Promise<void>[] = []
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker())
  }
  await Promise.all(workers)

  return results
}

/**
 * Export all filtered intake submissions to an Excel (.xlsx) file.
 * Dynamically discovers all form field columns configured for the intake forms.
 */
export async function exportIntakeSubmissionsToExcel({
  filters,
  campaignLabelById,
  roleLabelById,
  onProgress,
}: ExportSubmissionsOptions): Promise<number> {
  onProgress?.({
    phase: 'fetching_list',
    message: 'Fetching submissions list...',
  })

  // 1. Fetch all matching submissions (all pages)
  let page = 1
  let allRows: IntakeSubmissionRow[] = []
  let hasMore = true

  while (hasMore) {
    const res = await listIntakeSubmissions({
      ...filters,
      page,
    })

    if (res.items && res.items.length > 0) {
      allRows = allRows.concat(res.items)
      onProgress?.({
        phase: 'fetching_list',
        current: allRows.length,
        total: res.count,
        message: `Found ${allRows.length}${res.count ? ` of ${res.count}` : ''} submissions...`,
      })

      if (res.count && allRows.length >= res.count) {
        hasMore = false
      } else if (res.items.length < 50) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  // Double check date range filter in case backend list endpoint didn't apply date query
  if (filters.from_date || filters.to_date) {
    allRows = allRows.filter((r) => matchesDateRange(r.submitted_at, filters.from_date, filters.to_date))
  }

  if (allRows.length === 0) {
    throw new Error('No submissions found to export matching the selected filters and date range.')
  }

  // 2. Fetch full details (including answers & documents) for each submission
  onProgress?.({
    phase: 'fetching_details',
    current: 0,
    total: allRows.length,
    message: `Loading form answers (0/${allRows.length})...`,
  })

  const detailedSubmissions = await fetchSubmissionDetailsInBatches(
    allRows,
    8,
    (completed, total) => {
      onProgress?.({
        phase: 'fetching_details',
        current: completed,
        total,
        message: `Loading form answers (${completed}/${total})...`,
      })
    },
  )

  onProgress?.({
    phase: 'building_excel',
    current: detailedSubmissions.length,
    total: detailedSubmissions.length,
    message: 'Generating Excel spreadsheet...',
  })

  // 3. Dynamically discover all unique form field labels across all submissions
  const dynamicFieldLabelsOrdered: string[] = []
  const seenFieldLabels = new Set<string>()

  detailedSubmissions.forEach((sub) => {
    sub.answers?.forEach((ans) => {
      const label = (ans.field_label_snapshot || '').trim()
      if (label && !seenFieldLabels.has(label)) {
        seenFieldLabels.add(label)
        dynamicFieldLabelsOrdered.push(label)
      }
    })
  })

  // 4. Construct Table Data Rows
  const rowsData = detailedSubmissions.map((sub) => {
    const candidateName =
      sub.full_name || [sub.first_name, sub.middle_name, sub.last_name].filter(Boolean).join(' ') || '—'
    const campaignName = campaignLabelById.get(sub.campaign) ?? `Campaign #${sub.campaign}`
    const roleName = sub.job_role
      ? roleLabelById.get(sub.job_role) ?? `Role #${sub.job_role}`
      : sub.other_role_title
        ? `Other: ${sub.other_role_title}`
        : '—'
    const statusLabel = STATUS_LABELS[sub.status] || sub.status
    const submittedDateStr = sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'

    // Create a lookup for candidate answers by label
    const answerMap = new Map<string, string>()
    sub.answers?.forEach((ans) => {
      const label = (ans.field_label_snapshot || '').trim()
      if (label) {
        const valStr = formatValue(ans.value)
        if (answerMap.has(label)) {
          // If multiple answers for same label, append
          const prev = answerMap.get(label)
          answerMap.set(label, prev ? `${prev}; ${valStr}` : valStr)
        } else {
          answerMap.set(label, valStr)
        }
      }
    })

    // Documents / Resumes
    const documentsList =
      sub.documents && sub.documents.length > 0
        ? sub.documents.map((d) => d.original_filename || d.document_type || 'File').join(', ')
        : '—'

    const rowObj: Record<string, string | number> = {
      'Submission ID': `#${sub.id}`,
      'Candidate Name': candidateName,
      'First Name': sub.first_name || '',
      'Middle Name': sub.middle_name || '',
      'Last Name': sub.last_name || '',
      'Mobile Number': sub.mobile_number_normalized || sub.mobile_number || '',
      Campaign: campaignName,
      'Job Role': roleName,
      Status: statusLabel,
      Language: (sub.language || 'en').toUpperCase(),
      'Is Duplicate': sub.is_possible_duplicate ? 'Yes' : 'No',
      'Duplicate Reason': sub.duplicate_reason || '',
    }

    // Add all dynamic form fields in order
    dynamicFieldLabelsOrdered.forEach((fieldLabel) => {
      rowObj[fieldLabel] = answerMap.get(fieldLabel) ?? ''
    })

    // Attach documents and date columns at the end
    rowObj['Uploaded Documents'] = documentsList
    rowObj['Submitted Date'] = submittedDateStr

    return rowObj
  })

  // 5. Generate Worksheet & Workbook
  const worksheet = XLSX.utils.json_to_sheet(rowsData)

  // Compute optimal column widths
  const allHeaderKeys = [
    'Submission ID',
    'Candidate Name',
    'First Name',
    'Middle Name',
    'Last Name',
    'Mobile Number',
    'Campaign',
    'Job Role',
    'Status',
    'Language',
    'Is Duplicate',
    'Duplicate Reason',
    ...dynamicFieldLabelsOrdered,
    'Uploaded Documents',
    'Submitted Date',
  ]

  const colWidths = allHeaderKeys.map((key) => {
    let maxLen = key.length
    rowsData.forEach((row) => {
      const val = row[key] != null ? String(row[key]) : ''
      if (val.length > maxLen) {
        maxLen = Math.min(val.length, 60) // cap maximum column width to 60 chars
      }
    })
    return { wch: Math.max(maxLen + 3, 12) }
  })
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Intake Submissions')

  // 6. Write and trigger download with descriptive filter-aware filename
  const filename = generateExportFilename(filters, campaignLabelById, roleLabelById)

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveBlob(blob, filename)

  return detailedSubmissions.length
}
