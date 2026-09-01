/**
 * Validates if a given string is a clean, realistic job role name.
 * Filters out accidental dates, timestamps, emails, addresses, phone numbers,
 * or garbage values created during bulk Excel resume imports.
 */
export function isValidJobRoleName(name: string | undefined | null): boolean {
  if (!name || !name.trim()) return false
  const s = name.trim()

  // Reject email addresses and website domains
  if (s.includes('@') || /\.com$/i.test(s) || /\.in$/i.test(s) || /\.org$/i.test(s)) {
    return false
  }

  // Reject dates, timestamps, or date formats (e.g., "09-Jul-2026", "2026-07-09", "09/07/2026", "00:00:00")
  if (
    s.includes('00:00:00') ||
    /\d{4}-\d{2}-\d{2}/.test(s) ||
    /\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(s) ||
    /\d{1,2}[-\s](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s]\d{2,4}/i.test(s) ||
    /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-\s]\d{2,4}/i.test(s)
  ) {
    return false
  }

  // Reject phone numbers / mostly numeric strings (e.g., "9876543210")
  const digits = s.replace(/\D/g, '')
  if (digits.length >= 7 && digits.length / s.length > 0.5) {
    return false
  }

  // Reject URLs
  if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('www.')) {
    return false
  }

  // Reject address patterns (e.g., "6 NO HUT", "Flat 102", "Plot No 5", "House 12")
  if (
    /^\d+\s+(?:no|hut|room|flat|plot|block|sector|chawl|nagar)\b/i.test(s) ||
    /^(?:hut|room|flat|plot|block|house)\s*(?:no\.?|#)?\s*\d+/i.test(s)
  ) {
    return false
  }

  // Reject excessively long strings
  if (s.length > 70) {
    return false
  }

  return true
}
