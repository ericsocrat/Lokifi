export function keyFromEvent(e: KeyboardEvent | React.KeyboardEvent<HTMLInputElement>) {
  const parts: string[] = []
  if ((e as KeyboardEvent).ctrlKey || (e as KeyboardEvent).metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  const raw = (e as any).key
  const k = raw && raw.length === 1 ? raw.toUpperCase() : raw
  parts.push(k)
  return parts.join('+')
}
