// Small chart-related utilities made testable separately
export function angleDeg(x1: number, y1: number, x2: number, y2: number): number {
  return (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
}

export function tfToSeconds(tf: string): number {
  const n = parseInt(tf, 10);
  if (Number.isFinite(n)) {
    if (tf.endsWith('m')) return n * 60;
    if (tf.endsWith('h')) return n * 3600;
    if (tf.endsWith('d')) return n * 86400;
    if (tf.endsWith('w')) return n * 604800;
  }
  // default minutes
  return (Number.isFinite(n) ? n : 1) * 60;
}

export function barsFromTimes(aSec: number, bSec: number, tf: string): number {
  const dt = Math.abs(bSec - aSec);
  const spb = tfToSeconds(tf) || 60;
  return dt / spb;
}
