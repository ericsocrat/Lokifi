export type PersistSnapshot = {
  ts: number
  drawings: any[]
  selection: string[]
}

const SNAP_KEY = 'fynix-drawings@current'
const VERSIONS_KEY = 'fynix-drawings@versions'
const MAX_VERSIONS = 20

export function saveCurrent(drawings: any[], selection: Set<string>) {
  const snap: PersistSnapshot = {
    ts: Date.now(),
    drawings,
    selection: Array.from(selection)
  }
  localStorage.setItem(SNAP_KEY, JSON.stringify(snap))
}

export function loadCurrent(): PersistSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAP_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveVersion(drawings: any[], selection: Set<string>) {
  const version: PersistSnapshot = {
    ts: Date.now(),
    drawings,
    selection: Array.from(selection)
  }
  try {
    const raw = localStorage.getItem(VERSIONS_KEY)
    const arr: PersistSnapshot[] = raw ? JSON.parse(raw) : []
    arr.push(version)
    while (arr.length > MAX_VERSIONS) arr.shift()
    localStorage.setItem(VERSIONS_KEY, JSON.stringify(arr))
    // also keep current in sync
    saveCurrent(drawings, selection)
  } catch {
    // fallback to at least saving current
    saveCurrent(drawings, selection)
  }
}

export function listVersions(): PersistSnapshot[] {
  try {
    const raw = localStorage.getItem(VERSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
