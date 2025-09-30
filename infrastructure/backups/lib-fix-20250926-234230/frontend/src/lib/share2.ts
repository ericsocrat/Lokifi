import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string"

export type ShareMode = "view" | "edit"
export type ShareLink = { id: string; createdAt: number; mode: ShareMode; password?: string | null; url: string }

export function makeSharePayload(state: any, mode: ShareMode, password?: string | null) {
  const payload = {
    mode,
    password: password || null,
    scene: {
      drawings: state.drawings,
      indicators: state.indicators,
      indicatorSettings: state.indicatorSettings,
      theme: state.theme,
      timeframe: state.timeframe,
      layers: state.layers,
      activeLayerId: state.activeLayerId
    }
  }
  const json = JSON.stringify(payload)
  const h = compressToEncodedURIComponent(json)
  return h
}

// Stub shortlink: return #s=hash; in future, call backend to get /s/:id
export function makeShareUrl(hash:string): string {
  const base = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "https://app.fynix.ai/"
  return base + "#s=" + hash
}

export function tryLoadSharedState(): any | null {
  if (typeof window === "undefined") return null
  const m = window.location.hash.match(/#s=([^&]+)/)
  if (!m) return null
  try {
    const json = decompressFromEncodedURIComponent(m[1])
    return JSON.parse(json!)
  } catch { return null }
}
