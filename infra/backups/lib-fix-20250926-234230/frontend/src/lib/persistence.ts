import type { Drawing } from '@/lib/drawings'

export type ProjectV1 = {
  version: 1
  name: string
  createdAt: number
  drawings: Drawing[]
  theme?: 'light' | 'dark'
  timeframe?: string
}

const LS_PREFIX = 'lokifi.project.'
const SLOT_INDEX_KEY = 'lokifi.project.slotIndex' // stores list of used slot names

export function listSlots(): string[] {
  try {
    const raw = localStorage.getItem(SLOT_INDEX_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function setSlots(slots: string[]) {
  localStorage.setItem(SLOT_INDEX_KEY, JSON.stringify(Array.from(new Set(slots))))
}

export function saveSlot(slotName: string, project: ProjectV1) {
  const payload = { ...project }
  const json = JSON.stringify(payload)
  const checksum = fnv1a(json)
  const pack = JSON.stringify({ checksum, payload })
  localStorage.setItem(LS_PREFIX + slotName, pack)
  const slots = listSlots()
  setSlots([ ...slots.filter(s => s !== slotName), slotName ])
}

export function loadSlot(slotName: string): ProjectV1 | null {
  const raw = localStorage.getItem(LS_PREFIX + slotName)
  if (!raw) return null
  try {
    const { checksum, payload } = JSON.parse(raw)
    const json = JSON.stringify(payload)
    if (checksum !== fnv1a(json)) {
      console.warn('Checksum mismatch for slot', slotName)
    }
    if (payload?.version === 1) return payload as ProjectV1
    return null
  } catch {
    return null
  }
}

export function deleteSlot(slotName: string) {
  localStorage.removeItem(LS_PREFIX + slotName)
  setSlots(listSlots().filter(s => s !== slotName))
}

export function projectFromState(s: {
  drawings: Drawing[],
  theme: 'light'|'dark',
  timeframe: string
}, name = 'Untitled'): ProjectV1 {
  return {
    version: 1,
    name,
    createdAt: Date.now(),
    drawings: s.drawings,
    theme: s.theme,
    timeframe: s.timeframe
  }
}

/** Simple but fast checksum (FNV-1a 32-bit in hex) */
export function fnv1a(str: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return ('0000000' + h.toString(16)).slice(-8)
}
