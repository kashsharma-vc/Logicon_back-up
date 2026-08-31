import type { BudgetCommercialBreakupLine, BudgetCommercialBudgetLine } from '@/api/budgets'
import { componentTypeSectionLabel, parseBreakupAmount } from '@/features/sales/salesBreakupGrouping'

export type BudgetBreakupSection = {
  componentType: string
  label: string
  rows: BudgetCommercialBreakupLine[]
  total: number
}

export type BudgetRoleGroup = {
  groupKey: string
  roleRequirementId: number | null
  title: string
  siteName: string | null
  headcount: number | null
  unitCost: string | null
  totalCost: string | null
  budgetSortOrder: number
  sections: BudgetBreakupSection[]
  total: number
}

const UNASSIGNED_GROUP_KEY = 'unassigned'

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

function sortBreakupLines(a: BudgetCommercialBreakupLine, b: BudgetCommercialBreakupLine): number {
  const order = (a.sort_order ?? 0) - (b.sort_order ?? 0)
  if (order !== 0) return order
  return a.id - b.id
}

function getRoleGroupKey(line: BudgetCommercialBreakupLine): string {
  if (line.role_requirement != null && line.role_requirement > 0) {
    return `req:${line.role_requirement}`
  }
  if (line.job_role != null || line.site != null) {
    return `role:${line.job_role ?? 0}:site:${line.site ?? 0}`
  }
  return UNASSIGNED_GROUP_KEY
}

function buildBudgetLookups(budgetLines: BudgetCommercialBudgetLine[]) {
  const byRoleRequirement = new Map<number, BudgetCommercialBudgetLine>()
  const byRoleSite = new Map<string, BudgetCommercialBudgetLine>()
  for (const bl of budgetLines) {
    if (bl.role_requirement != null && bl.role_requirement > 0) {
      byRoleRequirement.set(bl.role_requirement, bl)
    }
    const rsKey = `role:${bl.job_role ?? 0}:site:${bl.site ?? 0}`
    if (!byRoleSite.has(rsKey)) {
      byRoleSite.set(rsKey, bl)
    }
  }
  return { byRoleRequirement, byRoleSite }
}

function resolveBudgetLine(
  groupKey: string,
  lookups: ReturnType<typeof buildBudgetLookups>,
): BudgetCommercialBudgetLine | undefined {
  if (groupKey.startsWith('req:')) {
    const id = Number(groupKey.slice(4))
    if (Number.isFinite(id)) return lookups.byRoleRequirement.get(id)
    return undefined
  }
  if (groupKey.startsWith('role:')) {
    return lookups.byRoleSite.get(groupKey)
  }
  return undefined
}

function resolveRoleTitle(
  groupKey: string,
  lines: BudgetCommercialBreakupLine[],
  budgetLine: BudgetCommercialBudgetLine | undefined,
): string {
  if (groupKey === UNASSIGNED_GROUP_KEY) return 'Unassigned breakup'
  const fromBudget = budgetLine?.job_role_name?.trim()
  if (fromBudget) return fromBudget
  const fromLine = lines.find((l) => l.job_role_name?.trim())?.job_role_name?.trim()
  if (fromLine) return fromLine
  const desc = budgetLine?.description?.trim()
  if (desc) return desc
  return 'Role'
}

function resolveSiteName(
  lines: BudgetCommercialBreakupLine[],
  budgetLine: BudgetCommercialBudgetLine | undefined,
): string | null {
  const fromBudget = budgetLine?.site_name?.trim()
  if (fromBudget) return fromBudget
  const fromLine = lines.find((l) => l.site_name?.trim())?.site_name?.trim()
  return fromLine ?? null
}

function buildSectionsForLines(lines: BudgetCommercialBreakupLine[]): BudgetBreakupSection[] {
  const byType = new Map<string, BudgetCommercialBreakupLine[]>()
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

/** Groups client-safe breakup lines by role, joining to budget lines for headcount/cost metadata. */
export function buildBudgetRoleGroups(
  breakupLines: BudgetCommercialBreakupLine[],
  budgetLines: BudgetCommercialBudgetLine[],
): BudgetRoleGroup[] {
  const lookups = buildBudgetLookups(budgetLines)
  const lineGroups = new Map<string, BudgetCommercialBreakupLine[]>()
  const firstSeenOrder: string[] = []

  for (const line of breakupLines) {
    const key = getRoleGroupKey(line)
    if (!lineGroups.has(key)) {
      lineGroups.set(key, [])
      firstSeenOrder.push(key)
    }
    lineGroups.get(key)!.push(line)
  }

  const groups: BudgetRoleGroup[] = []

  for (const groupKey of firstSeenOrder) {
    const lines = lineGroups.get(groupKey) ?? []
    const budgetLine = resolveBudgetLine(groupKey, lookups)
    const sections = buildSectionsForLines(lines)
    const total = lines.reduce((sum, row) => sum + parseBreakupAmount(row.amount), 0)
    const minSort = lines.reduce(
      (min, row) => Math.min(min, row.sort_order ?? Number.MAX_SAFE_INTEGER),
      Number.MAX_SAFE_INTEGER,
    )

    groups.push({
      groupKey,
      roleRequirementId:
        groupKey.startsWith('req:') && Number.isFinite(Number(groupKey.slice(4)))
          ? Number(groupKey.slice(4))
          : null,
      title: resolveRoleTitle(groupKey, lines, budgetLine),
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
    if (a.groupKey === UNASSIGNED_GROUP_KEY) return 1
    if (b.groupKey === UNASSIGNED_GROUP_KEY) return -1
    const order = a.budgetSortOrder - b.budgetSortOrder
    if (order !== 0) return order
    return a.title.localeCompare(b.title)
  })
}
