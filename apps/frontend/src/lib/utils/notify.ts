let permissionPromise: Promise<NotificationPermission> | null = null

export function ensureNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied')
  }
  if (Notification.permission !== 'default') return Promise.resolve(Notification.permission)
  if (!permissionPromise) permissionPromise = Notification.requestPermission()
  return permissionPromise
}

export async function notify(title: string, body?: string, sound: 'ping' | 'none' = 'none') {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  try {
    const perm = await ensureNotificationPermission()
    if (perm === 'granted') {
      new Notification(title, { body })
    }
    if (sound === 'ping') {
      const a = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYBZwAA')
      a.volume = 0.15; a.play().catch(()=>{})
    }
  } catch {}
}
