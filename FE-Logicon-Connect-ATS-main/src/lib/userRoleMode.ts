import type { MeResponse, NavPersona } from '@/types/api'

/**
 * Backend-driven check: user should see client portal.
 * Uses `is_client_facing` or `portal_mode === 'client'` from backend /me response.
 * No frontend role-code guessing — backend is the source of truth.
 */
export function isClientFacingUser(me: MeResponse | null | undefined): boolean {
  if (!me) return false
  return Boolean(me.is_client_facing || me.portal_mode === 'client')
}

/**
 * Backend-driven check: user should see internal nav.
 * Returns true when portal_mode is not 'client'.
 */
export function isInternalUser(me: MeResponse | null | undefined): boolean {
  return Boolean(me && me.portal_mode !== 'client')
}

/**
 * Backend-driven nav persona for sidebar grouping.
 * Defaults to 'mixed' for full nav if backend field is missing.
 */
export function getNavPersona(me: MeResponse | null | undefined): NavPersona {
  return me?.nav_persona ?? 'mixed'
}
