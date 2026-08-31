/**
 * Paginated budget plan lookups for selectors (onboarding, MRF, line items).
 */
import { listBudgetPlans, type ListBudgetPlansParams } from '@/api/budgets'
import { parseApiError } from '@/lib/apiError'
import type { BudgetPlanRow } from '@/features/budgets/types'
import { LOOKUP_MAX_PAGES, LOOKUP_PAGE_SIZE } from '@/features/budgets/loadPagedLookups'

export type BudgetLookupResult = { ok: true; items: BudgetPlanRow[] } | { ok: false; error: string }

function dedupeById(items: BudgetPlanRow[]): BudgetPlanRow[] {
  const m = new Map<number, BudgetPlanRow>()
  for (const b of items) m.set(b.id, b)
  return [...m.values()]
}

/**
 * Loads active + draft budget plans for given filters (paginated, deduped by id).
 * On any request failure returns error with no partial results.
 */
export async function loadBudgetPlansActiveAndDraft(
  base: Omit<ListBudgetPlansParams, 'page' | 'status'>,
): Promise<BudgetLookupResult> {
  const collected: BudgetPlanRow[] = []
  try {
    for (const status of ['active', 'draft'] as const) {
      for (let page = 1; page <= LOOKUP_MAX_PAGES; page++) {
        const res = await listBudgetPlans({
          ...base,
          status,
          page,
          is_active: true,
        })
        collected.push(...res.items)
        if (res.items.length < LOOKUP_PAGE_SIZE) break
      }
    }
    return { ok: true, items: dedupeById(collected) }
  } catch (e: unknown) {
    return { ok: false, error: parseApiError(e, 'Failed to load budget plans').message }
  }
}

export function formatBudgetPlanOptionLabel(b: BudgetPlanRow): string {
  const amt = b.amount != null ? String(b.amount) : ''
  const cur = b.currency ?? ''
  return `${b.name} (${b.code}) — ${amt} ${cur} — ${b.status}`
}

/** Billable budgets for a client (onboarding / client-level MRF budgets). */
export async function loadBillableBudgetOptionsForClient(clientId: number): Promise<BudgetLookupResult> {
  if (!Number.isFinite(clientId) || clientId < 1) return { ok: true, items: [] }
  return loadBudgetPlansActiveAndDraft({
    budget_nature: 'billable',
    client: clientId,
  })
}

/**
 * Billable budgets for an MRF: site-specific plus client-level (site null),
 * filtered to rows that apply to the selected site.
 */
export async function loadBillableBudgetOptionsForSite(
  siteId: number,
  clientId: number,
): Promise<BudgetLookupResult> {
  if (!Number.isFinite(siteId) || !Number.isFinite(clientId)) return { ok: true, items: [] }

  const bySite = await loadBudgetPlansActiveAndDraft({
    budget_nature: 'billable',
    site: siteId,
    client: clientId,
  })
  if (!bySite.ok) return bySite

  const byClient = await loadBudgetPlansActiveAndDraft({
    budget_nature: 'billable',
    client: clientId,
  })
  if (!byClient.ok) return byClient

  const map = new Map<number, BudgetPlanRow>()
  for (const b of bySite.items) map.set(b.id, b)
  for (const b of byClient.items) {
    if (b.client !== clientId) continue
    if (b.site == null || b.site === siteId) map.set(b.id, b)
  }
  return { ok: true, items: [...map.values()] }
}

/** Non-billable budgets for one or more departments (union, deduped). */
export async function loadNonBillableBudgetOptionsForDepartments(
  departmentIds: number[],
): Promise<BudgetLookupResult> {
  const uniq = [...new Set(departmentIds.filter((n) => Number.isFinite(n) && n > 0))]
  if (uniq.length === 0) return { ok: true, items: [] }

  const map = new Map<number, BudgetPlanRow>()
  for (const deptId of uniq) {
    const r = await loadBudgetPlansActiveAndDraft({
      budget_nature: 'non_billable',
      department: deptId,
    })
    if (!r.ok) return r
    for (const b of r.items) map.set(b.id, b)
  }
  return { ok: true, items: [...map.values()] }
}

/**
 * Strict internal hiring budget lookup for a specific department.
 * Filters: budget_nature=non_billable, budget_type=hiring,
 *          department=deptId, status=active, is_active=true
 *
 * Returns:
 * - ok=true, budget=row if exactly one matching budget
 * - ok=true, budget=null if no matching budget
 * - ok=false, error=string if multiple budgets found or API error
 */
export async function loadInternalHiringBudgetForDepartment(
  departmentId: number,
): Promise<{ ok: true; budget: BudgetPlanRow | null } | { ok: false; error: string }> {
  if (!Number.isFinite(departmentId) || departmentId < 1) {
    return { ok: true, budget: null }
  }
  try {
    const res = await listBudgetPlans({
      budget_nature: 'non_billable',
      budget_type: 'hiring',
      department: departmentId,
      status: 'active',
      is_active: true,
      page: 1,
    })
    if (res.items.length === 0) {
      return { ok: true, budget: null }
    }
    if (res.items.length > 1) {
      return {
        ok: false,
        error: `Multiple active internal hiring budgets found for this department (${res.items.length}). Please ensure only one is active.`,
      }
    }
    return { ok: true, budget: res.items[0] ?? null }
  } catch (e: unknown) {
    return { ok: false, error: parseApiError(e, 'Internal hiring budget lookup failed').message }
  }
}

/** Generic entry: prefer specialized helpers above. */
export async function loadBudgetOptions(
  params: Omit<ListBudgetPlansParams, 'page' | 'status'>,
): Promise<BudgetLookupResult> {
  return loadBudgetPlansActiveAndDraft(params)
}
