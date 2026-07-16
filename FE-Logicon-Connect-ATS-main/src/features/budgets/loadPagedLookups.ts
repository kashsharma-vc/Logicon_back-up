/**
 * Paginated lookup loading for budget UI (and similar screens).
 * Matches list endpoints that return up to 50 items per page (DRF default in this app).
 */
import { listClients, type ClientRow } from '@/api/clients'
import { listDepartments, type DepartmentRow } from '@/api/departments'
import { listSites, type SiteProfileRow } from '@/api/sites'
import { parseApiError } from '@/lib/apiError'

export const LOOKUP_PAGE_SIZE = 50
export const LOOKUP_MAX_PAGES = 40

export type LookupLoadResult<T> = { ok: true; items: T[] } | { ok: false; error: string }

function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>()
  const out: T[] = []
  for (const it of items) {
    if (seen.has(it.id)) continue
    seen.add(it.id)
    out.push(it)
  }
  return out
}

/** Loads all active clients (paginated until short page or cap). On any failure, returns error and no partial list. */
export async function loadAllClients(): Promise<LookupLoadResult<ClientRow>> {
  const items: ClientRow[] = []
  try {
    for (let page = 1; page <= LOOKUP_MAX_PAGES; page++) {
      const res = await listClients({ page, is_active: true })
      items.push(...res.items)
      if (res.items.length < LOOKUP_PAGE_SIZE) break
    }
    return { ok: true, items: dedupeById(items) }
  } catch (e: unknown) {
    return { ok: false, error: parseApiError(e, 'Failed to load clients').message }
  }
}

/** Loads all active departments (paginated until short page or cap). */
export async function loadAllDepartments(): Promise<LookupLoadResult<DepartmentRow>> {
  const items: DepartmentRow[] = []
  try {
    for (let page = 1; page <= LOOKUP_MAX_PAGES; page++) {
      const res = await listDepartments({ page, is_active: true })
      items.push(...res.items)
      if (res.items.length < LOOKUP_PAGE_SIZE) break
    }
    return { ok: true, items: dedupeById(items) }
  } catch (e: unknown) {
    return { ok: false, error: parseApiError(e, 'Failed to load departments').message }
  }
}

/**
 * Loads all active sites, optionally filtered by client.
 * On failure returns error and empty items (no silent partial data).
 */
export async function loadAllSites(params?: { client?: number }): Promise<LookupLoadResult<SiteProfileRow>> {
  const items: SiteProfileRow[] = []
  try {
    for (let page = 1; page <= LOOKUP_MAX_PAGES; page++) {
      const res = await listSites({
        page,
        is_active: true,
        ...(typeof params?.client === 'number' ? { client: params.client } : {}),
      })
      items.push(...res.items)
      if (res.items.length < LOOKUP_PAGE_SIZE) break
    }
    return { ok: true, items: dedupeById(items) }
  } catch (e: unknown) {
    return { ok: false, error: parseApiError(e, 'Failed to load sites').message }
  }
}
