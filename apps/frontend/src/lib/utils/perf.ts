// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function rafThrottle<T extends (...args: any[]) => any>(fn: T): T {
  // any required: Generic function wrapper for any function signature
  let queued = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastArgs: any[] | null = null; // any required: Arguments match generic function signature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastContext: any = null; // any required: Context preservation for this binding
  const tick = () => {
    queued = false;
    const args = lastArgs;
    const ctx = lastContext;
    lastArgs = null;
    lastContext = null;
    if (args) fn.apply(ctx, args);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    // any required: Preserves this context and variadic arguments
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this;
    if (!queued) {
      queued = true;
      requestAnimationFrame(tick);
    }
  } as unknown as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function microBatch<T extends (...args: any[]) => any>(fn: T): T {
  // any required: Generic function wrapper for any function signature
  // Coalesce many calls in the same microtask into one
  let scheduled = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastArgs: any[] | null = null; // any required: Arguments match generic function signature
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastContext: any = null; // any required: Context preservation for this binding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    // any required: Preserves this context and variadic arguments
    lastArgs = args;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastContext = this;
    if (!scheduled) {
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        const a = lastArgs;
        const t = lastContext;
        lastArgs = null;
        lastContext = null;
        if (a) fn.apply(t, a);
      });
    }
  } as unknown as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  // any required: Generic function wrapper for any function signature
  let timer: ReturnType<typeof setTimeout> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]) {
    // any required: Preserves this context and variadic arguments
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  } as unknown as T;
}
