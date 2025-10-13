import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string'
import type { Drawing } from '@/lib/utils/drawings'

export type ShareSnapshot = {
  v: 1
  t: 'readOnly' | 'editable'
  drawings: Drawing[]
  theme?: 'light'|'dark'
  timeframe?: string
  createdAt: number
}

export function makeShareURL(s: ShareSnapshot): string {
  const payload = JSON.stringify(s)
  const packed = compressToEncodedURIComponent(payload)
  const url = new URL(window.location.href)
  url.hash = 'share=' + packed
  return url.toString()
}

export function tryLoadFromURL(): ShareSnapshot | null {
  const h = window.location.hash
  const m = /share=([^&]+)/.exec(h)
  if (!m) return null
  try {
    const payload = decompressFromEncodedURIComponent(m[1])
    if (!payload) return null
    const snap = JSON.parse(payload)
    if (snap?.v === 1) return snap as ShareSnapshot
    return null
  } catch {
    return null
  }
}
export function encodeShare(obj:any){ try{ return btoa(unescape(encodeURIComponent(JSON.stringify(obj)))) }catch{ return "" } }
export function decodeShare(s:string){ try{ return JSON.parse(decodeURIComponent(escape(atob(s)))) }catch{ return null } }