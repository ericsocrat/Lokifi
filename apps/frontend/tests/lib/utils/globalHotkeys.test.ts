/**
 * Tests for globalHotkeys utility
 */
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/utils/keys', () => ({
  keyFromEvent: vi.fn((e) => e.key),
}));

const mockActions = {
  deleteSelected: vi.fn(),
  duplicateSelected: vi.fn(),
  setDrawingSettings: vi.fn(),
  drawingSettings: { arrowHeadSize: 12, lineCap: 'butt' as const, arrowHead: 'none' as const },
  alignSelected: vi.fn(),
  distributeSelected: vi.fn(),
};

const mockHotkeys: Record<string, string> = {
  DeleteSelected: 'Delete',
  DuplicateSelected: 'Ctrl+D',
  ArrowSizeIncrease: ']',
  ArrowSizeDecrease: '[',
  CycleLineCap: 'c',
  CycleArrowHead: 'a',
  AlignLeft: 'l',
  AlignRight: 'r',
  AlignTop: 't',
  AlignBottom: 'b',
  DistributeHoriz: 'h',
  DistributeVert: 'v',
};

vi.mock('@/state/store', () => ({
  useChartStore: Object.assign(
    vi.fn((selector) => {
      if (typeof selector === 'function') {
        return selector({ hotkeys: mockHotkeys });
      }
      return mockHotkeys;
    }),
    { getState: () => mockActions }
  ),
}));

// Import after mocks
import { useGlobalHotkeys } from '@/lib/utils/globalHotkeys';
import { keyFromEvent } from '@/lib/utils/keys';

describe('useGlobalHotkeys', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register keydown event listener on mount', () => {
    renderHook(() => useGlobalHotkeys());
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown event listener on unmount', () => {
    const { unmount } = renderHook(() => useGlobalHotkeys());
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  describe('action hotkeys', () => {
    it('should call deleteSelected when Delete key is pressed', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('Delete');
      const event = new KeyboardEvent('keydown', { key: 'Delete' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.deleteSelected).toHaveBeenCalled();
    });

    it('should call duplicateSelected for Ctrl+D', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('Ctrl+D');
      const event = new KeyboardEvent('keydown', { key: 'd', ctrlKey: true });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.duplicateSelected).toHaveBeenCalled();
    });

    it('should increase arrow size', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue(']');
      const event = new KeyboardEvent('keydown', { key: ']' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.setDrawingSettings).toHaveBeenCalledWith({ arrowHeadSize: 14 });
    });

    it('should decrease arrow size', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('[');
      const event = new KeyboardEvent('keydown', { key: '[' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.setDrawingSettings).toHaveBeenCalledWith({ arrowHeadSize: 10 });
    });

    it('should cycle line cap from butt to round', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('c');
      const event = new KeyboardEvent('keydown', { key: 'c' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.setDrawingSettings).toHaveBeenCalledWith({ lineCap: 'round' });
    });

    it('should cycle arrow head from none to open', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('a');
      const event = new KeyboardEvent('keydown', { key: 'a' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.setDrawingSettings).toHaveBeenCalledWith({ arrowHead: 'open' });
    });

    it('should align selected left', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('l');
      const event = new KeyboardEvent('keydown', { key: 'l' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.alignSelected).toHaveBeenCalledWith('left');
    });

    it('should align selected right', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('r');
      const event = new KeyboardEvent('keydown', { key: 'r' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.alignSelected).toHaveBeenCalledWith('right');
    });

    it('should distribute selected horizontally', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('h');
      const event = new KeyboardEvent('keydown', { key: 'h' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.distributeSelected).toHaveBeenCalledWith('h');
    });

    it('should distribute selected vertically', () => {
      renderHook(() => useGlobalHotkeys());

      const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
        e: KeyboardEvent
      ) => void;

      vi.mocked(keyFromEvent).mockReturnValue('v');
      const event = new KeyboardEvent('keydown', { key: 'v' });
      Object.defineProperty(event, 'preventDefault', { value: vi.fn() });

      handler(event);

      expect(mockActions.distributeSelected).toHaveBeenCalledWith('v');
    });
  });

  it('should ignore unmapped keys', () => {
    renderHook(() => useGlobalHotkeys());

    const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
      e: KeyboardEvent
    ) => void;

    vi.mocked(keyFromEvent).mockReturnValue('x');
    const event = new KeyboardEvent('keydown', { key: 'x' });
    const preventDefaultSpy = vi.fn();
    Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });

    handler(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(mockActions.deleteSelected).not.toHaveBeenCalled();
    expect(mockActions.duplicateSelected).not.toHaveBeenCalled();
  });

  it('should prevent default for mapped actions', () => {
    renderHook(() => useGlobalHotkeys());

    const handler = addEventListenerSpy.mock.calls.find((call) => call[0] === 'keydown')?.[1] as (
      e: KeyboardEvent
    ) => void;

    vi.mocked(keyFromEvent).mockReturnValue('Delete');
    const event = new KeyboardEvent('keydown', { key: 'Delete' });
    const preventDefaultSpy = vi.fn();
    Object.defineProperty(event, 'preventDefault', { value: preventDefaultSpy });

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});
