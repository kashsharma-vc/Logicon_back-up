export type UserType = 'internal' | 'client' | 'field'

export function userTypeLabel(t: UserType): string {
  if (t === 'internal') return 'Internal'
  if (t === 'client') return 'Client'
  return 'Field'
}

export function displayName(u: { first_name: string; last_name: string; username: string }): string {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim()
  return name || u.username
}

export type AssignmentType = 'primary' | 'additional' | 'delegated'

export const assignmentTypeOptions: { value: AssignmentType; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'additional', label: 'Additional' },
  { value: 'delegated', label: 'Delegated' },
]




