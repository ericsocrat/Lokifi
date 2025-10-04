/**
 * Alert system type definitions
 */

export type AlertSound = 'ping' | 'none';

export type AlertKind = 'cross' | 'time' | 'fib' | 'region';

export interface BaseAlert {
  id?: string;
  note: string;
  sound: AlertSound;
  cooldownMs: number;
  maxTriggers?: number;
  enabled: boolean;
}

export interface CrossAlert extends BaseAlert {
  kind: 'cross';
  drawingId: string;
}

export interface TimeAlert extends BaseAlert {
  kind: 'time';
  when: number;
}

export interface FibAlert extends BaseAlert {
  kind: 'fib';
  drawingId: string;
  level: number;
}

export interface RegionAlert extends BaseAlert {
  kind: 'region';
  drawingId: string;
}

export type Alert = CrossAlert | TimeAlert | FibAlert | RegionAlert;
