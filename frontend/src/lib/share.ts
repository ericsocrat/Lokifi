type ShareState = {
  drawings: any[]
  indicators: any
  indicatorSettings: any
  theme?: string
  symbol?: string
  timeframe?: string
}

export function encodeShare(state: ShareState): string {
  // url-safe base64 of URI-encoded JSON
  const json = JSON.stringify(state)
  const base64 = btoa(unescape(encodeURIComponent(json)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeShare(hash: string): ShareState | null {
  try {
    const base64 = hash.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
    const txt = decodeURIComponent(escape(atob(base64 + pad)))
    return JSON.parse(txt)
  } catch { return null }
}
