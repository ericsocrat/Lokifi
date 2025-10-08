// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rafThrottle<T extends (...args: any[]) => any>(fn: T): T {
  let queued = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastArgs: any[] | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastContext: any = null
  const tick = () => {
    queued = false
    const args = lastArgs; const ctx = lastContext
    lastArgs = null; lastContext = null
    if (args) fn.apply(ctx, args)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this;
    if (!queued) { queued = true; requestAnimationFrame(tick) }
  } as unknown as T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function microBatch<T extends (...args: any[]) => any>(fn: T): T {
  // Coalesce many calls in the same microtask into one
  let scheduled = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastArgs: any[] | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastContext: any = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this;
    if (!scheduled) {
      scheduled = true
      queueMicrotask(() => {
        scheduled = false
        const a = lastArgs; const t = lastContext
        lastArgs = null; lastContext = null
        if (a) fn.apply(t, a)
      })
    }
  } as unknown as T
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  } as unknown as T
}
