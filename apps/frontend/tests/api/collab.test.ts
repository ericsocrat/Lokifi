/**
 * Tests for collaboration API (Yjs WebSocket)
 */
import { startCollab } from '@/lib/api/collab';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Yjs
const mockYArrayPush = vi.fn();
const mockYArrayDelete = vi.fn();
const mockYArrayLength = 0;
const mockYArrayToArray = vi.fn().mockReturnValue([]);
const mockYArrayObserveDeep = vi.fn();

const mockYArray = {
  push: mockYArrayPush,
  delete: mockYArrayDelete,
  get length() {
    return mockYArrayLength;
  },
  toArray: mockYArrayToArray,
  observeDeep: mockYArrayObserveDeep,
};

const mockDocTransact = vi.fn((fn: () => void) => fn());
const mockDocGetArray = vi.fn().mockReturnValue(mockYArray);
const mockDocDestroy = vi.fn();

vi.mock('yjs', () => ({
  Doc: vi.fn().mockImplementation(() => ({
    transact: mockDocTransact,
    getArray: mockDocGetArray,
    destroy: mockDocDestroy,
  })),
}));

// Mock y-websocket
const mockProviderDestroy = vi.fn();
vi.mock('y-websocket', () => ({
  WebsocketProvider: vi.fn().mockImplementation(() => ({
    destroy: mockProviderDestroy,
  })),
}));

// Mock the chart store
const mockSetAll = vi.fn();
const mockUnsubscribe = vi.fn();
let mockStoreState = { drawings: [], setAll: mockSetAll };

vi.mock('@/state/store', () => ({
  useChartStore: {
    getState: vi.fn(() => mockStoreState),
    subscribe: vi.fn(() => mockUnsubscribe),
  },
}));

import { useChartStore } from '@/state/store';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const mockChartStore = useChartStore as unknown as {
  getState: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
};

describe('startCollab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = { drawings: [], setAll: mockSetAll };
    mockChartStore.getState.mockReturnValue(mockStoreState);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create a Y.Doc instance', () => {
      startCollab('test-room');

      expect(Y.Doc).toHaveBeenCalled();
    });

    it('should create WebsocketProvider with room ID and default endpoint', () => {
      startCollab('my-room');

      expect(WebsocketProvider).toHaveBeenCalledWith(
        'wss://demos.yjs.dev',
        'my-room',
        expect.anything()
      );
    });

    it('should use custom endpoint when provided', () => {
      startCollab('my-room', 'wss://custom.yjs.server');

      expect(WebsocketProvider).toHaveBeenCalledWith(
        'wss://custom.yjs.server',
        'my-room',
        expect.anything()
      );
    });

    it('should get drawings array from Y.Doc', () => {
      startCollab('test-room');

      expect(mockDocGetArray).toHaveBeenCalledWith('drawings');
    });

    it('should return an object with stop function', () => {
      const result = startCollab('test-room');

      expect(result).toHaveProperty('stop');
      expect(typeof result.stop).toBe('function');
    });
  });

  describe('initial sync', () => {
    it('should sync local drawings to Y array', () => {
      const drawings = [
        { id: '1', type: 'line', points: [] },
        { id: '2', type: 'rectangle', points: [] },
      ];
      mockStoreState = { drawings, setAll: mockSetAll };
      mockChartStore.getState.mockReturnValue(mockStoreState);

      startCollab('test-room');

      // Should clear Y array first
      expect(mockYArrayDelete).toHaveBeenCalledWith(0, 0);
      // Should push each drawing
      expect(mockYArrayPush).toHaveBeenCalledTimes(2);
    });

    it('should use transaction for initial sync', () => {
      startCollab('test-room');

      expect(mockDocTransact).toHaveBeenCalled();
    });
  });

  describe('local to remote sync', () => {
    it('should subscribe to store changes', () => {
      startCollab('test-room');

      expect(mockChartStore.subscribe).toHaveBeenCalled();
    });
  });

  describe('remote to local sync', () => {
    it('should observe Y array for remote changes', () => {
      startCollab('test-room');

      expect(mockYArrayObserveDeep).toHaveBeenCalled();
    });

    it('should call setAll when remote changes occur', () => {
      startCollab('test-room');

      // Get the observer callback and call it
      const observerCallback = mockYArrayObserveDeep.mock.calls[0][0];
      
      mockYArrayToArray.mockReturnValue([{ id: '1', type: 'line' }]);
      observerCallback();

      expect(mockSetAll).toHaveBeenCalledWith({
        drawings: [{ id: '1', type: 'line' }],
      });
    });
  });

  describe('stop function', () => {
    it('should unsubscribe from store', () => {
      const { stop } = startCollab('test-room');

      stop();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('should destroy WebSocket provider', () => {
      const { stop } = startCollab('test-room');

      stop();

      expect(mockProviderDestroy).toHaveBeenCalled();
    });

    it('should destroy Y.Doc', () => {
      const { stop } = startCollab('test-room');

      stop();

      expect(mockDocDestroy).toHaveBeenCalled();
    });

    it('should not throw when stop is called multiple times', () => {
      const { stop } = startCollab('test-room');

      expect(() => {
        stop();
        stop();
        stop();
      }).not.toThrow();
    });

    it('should handle errors during cleanup gracefully', () => {
      mockUnsubscribe.mockImplementation(() => {
        throw new Error('Unsubscribe failed');
      });
      mockProviderDestroy.mockImplementation(() => {
        throw new Error('Provider destroy failed');
      });

      const { stop } = startCollab('test-room');

      // Should not throw despite internal errors
      expect(() => stop()).not.toThrow();
    });
  });

  describe('room ID handling', () => {
    it('should use unique room IDs for different sessions', () => {
      startCollab('room-1');
      startCollab('room-2');

      const calls = (WebsocketProvider as ReturnType<typeof vi.fn>).mock.calls;
      expect(calls[0][1]).toBe('room-1');
      expect(calls[1][1]).toBe('room-2');
    });

    it('should handle special characters in room ID', () => {
      startCollab('room/with/slashes');

      expect(WebsocketProvider).toHaveBeenCalledWith(
        expect.any(String),
        'room/with/slashes',
        expect.anything()
      );
    });
  });
});
