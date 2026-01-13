/**
 * Canvas and DOM polyfills for jsdom environment
 * Used by components that render to canvas (DrawingLayer, DrawingChart, etc.)
 */

import { vi } from 'vitest';

// Polyfill ResizeObserver for tests
if (!global.ResizeObserver) {
  global.ResizeObserver = class ResizeObserver {
    constructor(public callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
}

// Mock requestAnimationFrame to execute callbacks synchronously
// This enables testing RAF-based components (DrawingLayer draw loops)
// Without this mock, RAF callbacks are queued but never executed in sync tests
let rafCallbacks: Array<() => void> = [];
let rafId = 0;

global.requestAnimationFrame = vi.fn((callback: () => void) => {
  rafCallbacks.push(callback);
  return ++rafId;
}) as any;

global.cancelAnimationFrame = vi.fn((id: number) => {
  // Simple mock - real implementation would remove specific callback
  // For testing, we just clear all pending callbacks
  if (id) rafCallbacks = [];
}) as any;

// Helper function to flush all pending RAF callbacks
// Call this after rendering RAF-based components to execute draw loops
export function flushRafCallbacks() {
  const callbacks = [...rafCallbacks];
  rafCallbacks = [];
  callbacks.forEach((cb) => cb());
}

// Polyfill HTMLCanvasElement.getContext for tests
// Override unconditionally since jsdom has a stub that returns null
HTMLCanvasElement.prototype.getContext = function (contextType: string) {
  if (contextType === '2d') {
    return {
      save: vi.fn(),
      restore: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      font: '',
      textAlign: 'left' as CanvasTextAlign,
      textBaseline: 'top' as CanvasTextBaseline,
      globalAlpha: 1,
      lineCap: 'butt' as CanvasLineCap,
      lineJoin: 'miter' as CanvasLineJoin,
      setLineDash: vi.fn(),
      getLineDash: vi.fn(() => []),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      rect: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      isPointInPath: vi.fn(),
      isPointInStroke: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      drawImage: vi.fn(),
      createImageData: vi.fn(),
      getImageData: vi.fn(),
      putImageData: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createPattern: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      setTransform: vi.fn(),
      resetTransform: vi.fn(),
    } as any;
  }
  return null;
} as any;

// Polyfill OffscreenCanvas if needed (for off-screen rendering tests)
if (!global.OffscreenCanvas) {
  global.OffscreenCanvas = class OffscreenCanvas {
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
    width: number;
    height: number;
    getContext() {
      return null;
    }
    convertToBlob() {
      return Promise.resolve(new Blob());
    }
  } as any;
}
