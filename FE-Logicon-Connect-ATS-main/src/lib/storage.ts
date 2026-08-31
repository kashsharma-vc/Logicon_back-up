const PREFIX = 'logicon_enterprise_'

export const storageKeys = {
  accessToken: `${PREFIX}access`,
  refreshToken: `${PREFIX}refresh`,
} as const

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore quota / private mode */
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}




