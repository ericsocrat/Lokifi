/**
 * Tests for hotkeys utility
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the chart store
vi.mock('@/state/store', () => ({
  useChartStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector({ setTool: vi.fn() });
    }
    return vi.fn();
  }),
}));

// Import after mock
import useHotkeys from '@/lib/utils/hotkeys';
import { useChartStore } from '@/state/store';

describe('useHotkeys', () => {
  let mockSetTool: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockSetTool = vi.fn();
    vi.mocked(useChartStore).mockImplementation((selector) => {
      if (typeof selector === 'function') {
        return selector({ setTool: mockSetTool });
      }
      return mockSetTool;
    });

    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register keydown event listener on mount', () => {
    renderHook(() => useHotkeys());
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown event listener on unmount', () => {
    const { unmount } = renderHook(() => useHotkeys());
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  describe('tool shortcuts', () => {
    const testCases = [
      { key: 'v', tool: 'select' },
      { key: 'V', tool: 'select' },
      { key: 't', tool: 'trendline' },
      { key: 'T', tool: 'trendline' },
      { key: 'h', tool: 'hline' },
      { key: 'r', tool: 'rect' },
      { key: 'a', tool: 'arrow' },
      { key: 'p', tool: 'parallel-channel' },
      { key: 'f', tool: 'fib' },
    ];

    testCases.forEach(({ key, tool }) => {
      it(`should set tool to ${tool} when ${key} is pressed`, () => {
        renderHook(() => useHotkeys());

        // Get the registered handler
        const handler = addEventListenerSpy.mock.calls.find(
          (call) => call[0] === 'keydown'
        )?.[1] as (e: KeyboardEvent) => void;

        // Simulate keypress
        const event = new KeyboardEvent('keydown', { key });
        handler(event);

        expect(mockSetTool).toHaveBeenCalledWith(tool);
      });
    });
  });

  it('should ignore keypresses when target is an input element', () => {
    renderHook(() => useHotkeys());

    const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
      e: KeyboardEvent
    ) => void;

    // Create event with input target
    const event = {
      key: 'v',
      target: { tagName: 'INPUT' },
    } as unknown as KeyboardEvent;

    handler(event);

    expect(mockSetTool).not.toHaveBeenCalled();
  });

  it('should ignore unknown keys', () => {
    renderHook(() => useHotkeys());

    const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
      e: KeyboardEvent
    ) => void;

    // Press unknown key
    const event = new KeyboardEvent('keydown', { key: 'x' });
    handler(event);

    expect(mockSetTool).not.toHaveBeenCalled();
  });
});
