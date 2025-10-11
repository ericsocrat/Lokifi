import { describe, it, expect } from 'vitest';
import { angleDeg, tfToSeconds, barsFromTimes } from './chartUtils';

describe('chartUtils', () => {
  it('angleDeg simple', () => {
    expect(angleDeg(0, 0, 1, 0)).toBeCloseTo(0);
    expect(angleDeg(0, 0, 0, 1)).toBeCloseTo(90);
  });

  it('tfToSeconds', () => {
    expect(tfToSeconds('1m')).toBe(60);
    expect(tfToSeconds('2h')).toBe(7200);
    expect(tfToSeconds('3d')).toBe(259200);
    expect(tfToSeconds('5')).toBe(300);
  });

  it('barsFromTimes', () => {
    const a = 0, b = 3600; // one hour apart
    expect(barsFromTimes(a, b, '1m')).toBeCloseTo(60);
  });
});

