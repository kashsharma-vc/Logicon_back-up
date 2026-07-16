import type { PublicFormField } from '@/features/publicApply/types'

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'] as const
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

export function validateMobile10Digits(value: string): string | null {
  const cleaned = (value ?? '').replace(/\s+/g, '').replace(/-/g, '')
  if (!/^[6-9]\d{9}$/.test(cleaned)) return 'mobileInvalid'
  if (['0000000000', '1111111111', '1234567890', '9999999999'].includes(cleaned)) return 'mobileInvalid'
  return null
}

export function validateFileBasic(file: File): 'fileTooLarge' | 'fileTypeNotAllowed' | null {
  const name = file.name.toLowerCase()
  const okExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
  if (!okExt) return 'fileTypeNotAllowed'
  if (file.size > MAX_UPLOAD_SIZE_BYTES) return 'fileTooLarge'
  return null
}

export function isEmptyFieldValue(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

export function validateRequiredFields(
  fields: PublicFormField[],
  valuesById: Record<number, unknown>,
  fileById: Record<number, File | null>,
): Record<number, string> {
  const errors: Record<number, string> = {}
  for (const f of fields) {
    if (!f.is_required) continue
    if (f.field_type === 'file') {
      if (!fileById[f.id]) errors[f.id] = 'required'
      continue
    }
    if (isEmptyFieldValue(valuesById[f.id])) {
      errors[f.id] = 'required'
    }
  }
  return errors
}

function toFloat(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

export function validateBusinessRules(valuesByKey: Record<string, unknown>): string[] {
  const errs: string[] = []
  const age = toFloat(valuesByKey.age)
  if (age != null && (age < 18 || age > 60)) errs.push('ageRange')

  const exp = toFloat(valuesByKey.experience_years)
  if (exp != null && age != null && exp > age - 14) errs.push('expTooHigh')

  const salary = toFloat(valuesByKey.expected_salary)
  if (salary != null && salary > 500000) errs.push('salaryTooHigh')

  const joiningRaw = valuesByKey.joining_availability
  if (joiningRaw && String(joiningRaw).trim()) {
    const d = new Date(String(joiningRaw))
    if (!Number.isNaN(d.getTime())) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dd = new Date(d)
      dd.setHours(0, 0, 0, 0)
      if (dd < today) errs.push('joiningPast')
    }
  }

  return errs
}


