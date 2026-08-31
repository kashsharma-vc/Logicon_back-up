import { api } from '@/api/client'

export function absoluteApiFileUrl(file: string): string {
  if (!file) return file
  if (file.startsWith('http://') || file.startsWith('https://')) return file
  const base = (api.defaults.baseURL ?? '').replace(/\/$/, '')
  if (!base) return file
  if (file.startsWith('/')) return `${base}${file}`
  return `${base}/${file}`
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Fetch a protected media/API file with the logged-in user's bearer token. */
export async function downloadAuthenticatedFile(filePath: string, filename: string): Promise<void> {
  const url = absoluteApiFileUrl(filePath)
  const res = await api.get(url, { responseType: 'blob' })
  saveBlob(res.data as Blob, filename)
}

export async function openAuthenticatedFile(filePath: string): Promise<void> {
  const url = absoluteApiFileUrl(filePath)
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = URL.createObjectURL(res.data as Blob)
  window.open(blobUrl, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
}
