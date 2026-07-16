import type { ProposalBudgetLine, ProposalBreakupLine } from '@/types/sales'

export type BreakupComponentSection = {
  componentType: string
  label: string
  rows: ProposalBreakupLine[]
  total: number
}

export type BreakupRoleGroup = {
  groupKey: string
  budgetLineId: number | null
  roleRequirementId: number | null
  title: string
  siteName: string | null
  headcount: number | null
  unitCost: string | null
  totalCost: string | null
  budgetSortOrder: number
  sections: BreakupComponentSection[]
  total: number
}

const COMPONENT_TYPE_ORDER: string[] = [
  'earning',
  'employee_deduction',
  'employer_contribution',
  'statutory',
  'reimbursement',
  'equipment',
  'management_fee',
  'tax',
  'total',
]

export function parseBreakupAmount(amount: string | null | undefined): number {
  if (amount == null || amount === '') return 0
  const n = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : Number(amount)
  return Number.isFinite(n) ? n : 0
}

export function componentTypeSectionLabel(componentType: string): string {
  const t = componentType.trim().toLowerCase()
  if (t === 'earning') return 'Earning'
  if (t === 'employee_deduction' || t.includes('deduction')) return 'Deduction'
  if (t === 'employer_contribution' || t.includes('employer')) return 'Employer Contribution'
  if (t === 'total') return 'Total'
  if (!t) return 'Other'
  return componentType
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

function componentTypeSortIndex(componentType: string): number {
  const t = componentType.trim().toLowerCase()
  const idx = COMPONENT_TYPE_ORDER.indexOf(t)
  if (idx >= 0) return idx
  if (t.includes('earning')) return 0
  if (t.includes('deduction')) return 1
  if (t.includes('employer')) return 2
  if (t.includes('total')) return 100
  return 50
}

export function sortBreakupLines(a: ProposalBreakupLine, b: ProposalBreakupLine): number {
  const order = (a.sort_order ?? 0) - (b.sort_order ?? 0)
  if (order !== 0) return order
  return a.id - b.id
}

export function hasBreakupRoleMapping(line: ProposalBreakupLine): boolean {
  return line.role_requirement != null && line.role_requirement > 0
}

export function getUnmappedBreakupLines(lines: ProposalBreakupLine[]): ProposalBreakupLine[] {
  return lines.filter((line) => !hasBreakupRoleMapping(line))
}

export function getBreakupRoleGroupKey(line: ProposalBreakupLine): string | null {
  if (line.role_requirement != null && line.role_requirement > 0) {
    return `req:${line.role_requirement}`
  }
  return null
}

function buildBudgetLookups(budgetLines: ProposalBudgetLine[]) {
  const byRoleRequirement = new Map<number, ProposalBudgetLine>()
  for (const bl of budgetLines) {
    if (bl.role_requirement != null && bl.role_requirement > 0) {
      byRoleRequirement.set(bl.role_requirement, bl)
    }
  }
  return { byRoleRequirement }
}

function resolveBudgetLine(
  groupKey: string,
  lookups: ReturnType<typeof buildBudgetLookups>,
): ProposalBudgetLine | undefined {
  if (groupKey.startsWith('req:')) {
    const id = Number(groupKey.slice(4))
    if (Number.isFinite(id)) return lookups.byRoleRequirement.get(id)
    return undefined
  }
  return undefined
}

function resolveRoleTitle(
  lines: ProposalBreakupLine[],
  budgetLine: ProposalBudgetLine | undefined,
): string {
  const fromBudget = budgetLine?.job_role_name?.trim()
  if (fromBudget) return fromBudget
  const fromLine = lines.find((l) => l.job_role_name?.trim())?.job_role_name?.trim()
  if (fromLine) return fromLine
  const desc = budgetLine?.description?.trim()
  if (desc) return desc
  return 'Role'
}

function resolveSiteName(
  lines: ProposalBreakupLine[],
  budgetLine: ProposalBudgetLine | undefined,
): string | null {
  const fromBudget = budgetLine?.site_name?.trim()
  if (fromBudget) return fromBudget
  const fromLine = lines.find((l) => l.site_name?.trim())?.site_name?.trim()
  return fromLine ?? null
}

function buildSectionsForLines(lines: ProposalBreakupLine[]): BreakupComponentSection[] {
  const byType = new Map<string, ProposalBreakupLine[]>()
  for (const line of lines) {
    const type = line.component_type?.trim() || 'other'
    if (!byType.has(type)) byType.set(type, [])
    byType.get(type)!.push(line)
  }

  return [...byType.entries()]
    .sort(([a], [b]) => componentTypeSortIndex(a) - componentTypeSortIndex(b))
    .map(([componentType, typeLines]) => {
      const rows = [...typeLines].sort(sortBreakupLines)
      const total = rows.reduce((sum, row) => sum + parseBreakupAmount(row.amount), 0)
      return {
        componentType,
        label: componentTypeSectionLabel(componentType),
        rows,
        total,
      }
    })
}

export function buildBreakupRoleGroups(
  breakupLines: ProposalBreakupLine[],
  budgetLines: ProposalBudgetLine[],
): BreakupRoleGroup[] {
  const lookups = buildBudgetLookups(budgetLines)
  const lineGroups = new Map<string, ProposalBreakupLine[]>()
  const firstSeenOrder: string[] = []

  for (const line of breakupLines) {
    const key = getBreakupRoleGroupKey(line)
    if (key == null) continue
    if (!lineGroups.has(key)) {
      lineGroups.set(key, [])
      firstSeenOrder.push(key)
    }
    lineGroups.get(key)!.push(line)
  }

  const groups: BreakupRoleGroup[] = []

  for (const groupKey of firstSeenOrder) {
    const lines = lineGroups.get(groupKey) ?? []
    const budgetLine = resolveBudgetLine(groupKey, lookups)
    const sections = buildSectionsForLines(lines)
    const total = lines.reduce((sum, row) => sum + parseBreakupAmount(row.amount), 0)
    const minSort = lines.reduce((min, row) => Math.min(min, row.sort_order ?? Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER)

    groups.push({
      groupKey,
      budgetLineId: budgetLine?.id ?? null,
      roleRequirementId:
        groupKey.startsWith('req:') && Number.isFinite(Number(groupKey.slice(4)))
          ? Number(groupKey.slice(4))
          : null,
      title: resolveRoleTitle(lines, budgetLine),
      siteName: resolveSiteName(lines, budgetLine),
      headcount: budgetLine?.manpower_count ?? null,
      unitCost: budgetLine?.unit_cost ?? null,
      totalCost: budgetLine?.total_cost ?? null,
      budgetSortOrder:
        budgetLine?.sort_order != null
          ? budgetLine.sort_order
          : minSort === Number.MAX_SAFE_INTEGER
            ? 999999
            : minSort,
      sections,
      total,
    })
  }

  return groups.sort((a, b) => {
    const order = a.budgetSortOrder - b.budgetSortOrder
    if (order !== 0) return order
    return a.title.localeCompare(b.title)
  })
}

export function getBreakupComponentStyle(type: string): {
  border: string
  text: string
} {
  const lower = type.toLowerCase()
  if (lower.includes('earning') || lower.includes('basic')) {
    return { border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-400' }
  }
  if (lower.includes('deduction')) {
    return { border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400' }
  }
  if (lower.includes('allowance')) {
    return { border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400' }
  }
  if (lower.includes('employer')) {
    return { border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400' }
  }
  if (lower.includes('total') || lower.includes('gross') || lower.includes('net')) {
    return { border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-400' }
  }
  return { border: 'border-app-border', text: 'text-app-text' }
}

export type BreakupRoleBandStyle = {
  border: string
  borderAccent: string
  headerBg: string
  headerBorder: string
  bodyBg: string
  iconBg: string
  iconText: string
  titleText: string
  totalText: string
  metaText: string
}

const ROLE_BAND_PALETTE: BreakupRoleBandStyle[] = [
  {
    border: 'border-brand-200 dark:border-brand-800',
    borderAccent: 'border-l-brand-500 dark:border-l-brand-400',
    headerBg:
      'bg-gradient-to-r from-brand-50 via-brand-50/70 to-app-surface dark:from-brand-950/50 dark:via-brand-900/25 dark:to-app-surface',
    headerBorder: 'border-brand-200/80 dark:border-brand-800/80',
    bodyBg: 'bg-brand-50/25 dark:bg-brand-950/15',
    iconBg: 'bg-brand-500/15 dark:bg-brand-500/20',
    iconText: 'text-brand-600 dark:text-brand-400',
    titleText: 'text-brand-900 dark:text-brand-100',
    totalText: 'text-brand-700 dark:text-brand-300',
    metaText: 'text-brand-800/80 dark:text-brand-200/80',
  },
  {
    border: 'border-emerald-200 dark:border-emerald-800',
    borderAccent: 'border-l-emerald-500 dark:border-l-emerald-400',
    headerBg:
      'bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-app-surface dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-app-surface',
    headerBorder: 'border-emerald-200/80 dark:border-emerald-800/80',
    bodyBg: 'bg-emerald-50/25 dark:bg-emerald-950/15',
    iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    titleText: 'text-emerald-900 dark:text-emerald-100',
    totalText: 'text-emerald-700 dark:text-emerald-300',
    metaText: 'text-emerald-800/80 dark:text-emerald-200/80',
  },
  {
    border: 'border-blue-200 dark:border-blue-800',
    borderAccent: 'border-l-blue-500 dark:border-l-blue-400',
    headerBg:
      'bg-gradient-to-r from-blue-50 via-blue-50/70 to-app-surface dark:from-blue-950/40 dark:via-blue-900/20 dark:to-app-surface',
    headerBorder: 'border-blue-200/80 dark:border-blue-800/80',
    bodyBg: 'bg-blue-50/25 dark:bg-blue-950/15',
    iconBg: 'bg-blue-500/15 dark:bg-blue-500/20',
    iconText: 'text-blue-600 dark:text-blue-400',
    titleText: 'text-blue-900 dark:text-blue-100',
    totalText: 'text-blue-700 dark:text-blue-300',
    metaText: 'text-blue-800/80 dark:text-blue-200/80',
  },
  {
    border: 'border-violet-200 dark:border-violet-800',
    borderAccent: 'border-l-violet-500 dark:border-l-violet-400',
    headerBg:
      'bg-gradient-to-r from-violet-50 via-violet-50/70 to-app-surface dark:from-violet-950/40 dark:via-violet-900/20 dark:to-app-surface',
    headerBorder: 'border-violet-200/80 dark:border-violet-800/80',
    bodyBg: 'bg-violet-50/25 dark:bg-violet-950/15',
    iconBg: 'bg-violet-500/15 dark:bg-violet-500/20',
    iconText: 'text-violet-600 dark:text-violet-400',
    titleText: 'text-violet-900 dark:text-violet-100',
    totalText: 'text-violet-700 dark:text-violet-300',
    metaText: 'text-violet-800/80 dark:text-violet-200/80',
  },
]

/** Distinct full-width band styling per role so users can scan Electrician vs Plumber, etc. */
export function getBreakupRoleBandStyle(roleIndex: number, _groupKey: string): BreakupRoleBandStyle {
  return ROLE_BAND_PALETTE[roleIndex % ROLE_BAND_PALETTE.length]!
}
