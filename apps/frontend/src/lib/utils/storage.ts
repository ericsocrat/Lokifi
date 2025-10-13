export function saveJSON<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}
