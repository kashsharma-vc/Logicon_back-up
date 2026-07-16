import type { SkillCategory } from '@/api/jobs'

export type { SkillCategory }

export const SKILL_CATEGORY_OPTIONS: { value: SkillCategory; label: string }[] = [
  { value: 'unskilled', label: 'Unskilled' },
  { value: 'semi_skilled', label: 'Semi-skilled' },
  { value: 'skilled', label: 'Skilled' },
  { value: 'highly_skilled', label: 'Highly skilled' },
  { value: 'supervisor', label: 'Supervisor' },
]

export function skillCategoryLabel(value: SkillCategory, display?: string | null) {
  const d = display?.trim()
  if (d) return d
  return SKILL_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value
}
