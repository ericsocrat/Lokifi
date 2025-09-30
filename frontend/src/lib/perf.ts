export function rafThrottle<T extends (...args:any[])=>void>(fn: T): T {
  let queued = false
  let lastArgs: any[] | null = null
  let lastContext: any = null
  const tick = () => {
    queued = false
    const args = lastArgs; const ctx = lastContext
    lastArgs = null; lastContext = null
    if (args) fn.apply(ctx, args)
  }
  return function(this: any, ...args: any[]) {
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this;
    if (!queued) { queued = true; requestAnimationFrame(tick) }
  } as unknown as T
}

export function microBatch<T extends (...args:any[])=>void>(fn: T): T {
  // Coalesce many calls in the same microtask into one
  let scheduled = false
  let lastArgs: any[] | null = null
  let lastContext: any = null
  return function(this: any, ...args: any[]) {
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

export function debounce<T extends (...args:any[])=>void>(fn: T, ms: number): T {
  let timer: any
  return function(this: any, ...args: any[]) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), ms)
  } as unknown as T
}
