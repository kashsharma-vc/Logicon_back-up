import axios from 'axios'

function getBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base || typeof base !== 'string') {
    throw new Error('VITE_API_BASE_URL is not set')
  }
  return base.replace(/\/$/, '')
}

export const api = axios.create({
  baseURL: getBaseUrl(),
})

export function isAuthRequestUrl(url: string | undefined): boolean {
  if (!url) {
    return false
  }
  return url.includes('/api/token/')
}




