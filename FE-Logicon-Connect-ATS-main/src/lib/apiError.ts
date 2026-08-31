import axios from 'axios'

export interface ParsedApiError {
  message: string
  fields: Record<string, string>
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(stringifyValue).filter(Boolean).join(' ')
  }
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, nested]) => `${key}: ${stringifyValue(nested)}`)
      .filter(Boolean)
      .join(' ')
  }
  return value == null ? '' : String(value)
}

export function parseApiError(error: unknown, fallback = 'Request failed'): ParsedApiError {
  if (!axios.isAxiosError(error)) {
    return { message: error instanceof Error ? error.message : fallback, fields: {} }
  }

  const data = error.response?.data
  if (!data || typeof data !== 'object') {
    return { message: error.message || fallback, fields: {} }
  }

  const fields: Record<string, string> = {}
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const msg = stringifyValue(value)
    if (msg) fields[key] = msg
  }

  const message =
    fields.detail ||
    fields.non_field_errors ||
    Object.entries(fields)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' ') ||
    fallback

  return { message, fields }
}

/** Structured 400 from workflow step actions (e.g. onboarding finalization preflight). */
export interface ParsedWorkflowActionError {
  /** Best single-line summary (for compact UI / legacy). */
  summary: string
  /** Top-level `detail` string when present. */
  detail: string | null
  /** Top-level `errors: string[]` when present. */
  errors: string[]
  /** Other DRF-style keys rendered as readable lines. */
  fieldMessages: string[]
}

function stringifyDrfField(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(stringifyDrfField).filter(Boolean).join(' ')
  }
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${stringifyDrfField(v)}`)
      .filter(Boolean)
      .join(' ')
  }
  return value == null ? '' : String(value)
}

/**
 * Parse workflow `actOnWorkflowStep` failure payloads:
 * - `detail`, `errors[]`, and normal DRF field errors.
 * Falls back like parseApiError when shape is unknown.
 */
export function parseWorkflowStepActionError(
  error: unknown,
  fallback = 'Action failed',
): ParsedWorkflowActionError {
  const empty: ParsedWorkflowActionError = {
    summary: fallback,
    detail: null,
    errors: [],
    fieldMessages: [],
  }

  if (!axios.isAxiosError(error)) {
    return {
      ...empty,
      summary: error instanceof Error ? error.message : fallback,
    }
  }

  const data = error.response?.data
  if (!data || typeof data !== 'object') {
    return { ...empty, summary: error.message || fallback }
  }

  const d = data as Record<string, unknown>
  const detail = typeof d.detail === 'string' && d.detail.trim() ? d.detail.trim() : null

  let errors: string[] = []
  if (Array.isArray(d.errors)) {
    errors = d.errors.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
  }

  const fieldMessages: string[] = []
  for (const [key, value] of Object.entries(d)) {
    if (key === 'detail' || key === 'errors') continue
    const msg = stringifyDrfField(value)
    if (msg) fieldMessages.push(`${key.replace(/_/g, ' ')}: ${msg}`)
  }

  const parsed = parseApiError(error, fallback)
  const summary =
    detail ||
    (errors.length > 0 ? errors[0] : null) ||
    (fieldMessages.length > 0 ? fieldMessages[0] : null) ||
    parsed.message

  return { summary, detail, errors, fieldMessages }
}

