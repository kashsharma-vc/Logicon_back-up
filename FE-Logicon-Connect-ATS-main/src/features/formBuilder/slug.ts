/** Slug-like validator: lowercase letters, digits, underscores; 1+ chars. */
export const SLUG_RE = /^[a-z][a-z0-9_]*$/

export function validateSlug(value: string): string | null {
  const t = value.trim()
  if (!t) return 'Required.'
  if (!SLUG_RE.test(t)) return 'Use lowercase letters, digits, underscores; must start with a letter.'
  return null
}

/** Best-effort code suggestion derived from a human label. Does not mutate input. */
export function suggestCode(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}
