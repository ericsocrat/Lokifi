/**
 * Tests for exporters utility - PNG and SVG chart export
 */
import { exportPNG, exportSVG } from '@/lib/utils/exporters';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock useChartStore
vi.mock('@/state/store', () => ({
  useChartStore: {
    getState: vi.fn(() => ({
      drawings: [],
    })),
  },
}));

// Mock drawingsToSVG
vi.mock('@/lib/utils/svg', () => ({
  drawingsToSVG: vi.fn(() => '<svg></svg>'),
}));

describe('exporters', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;
  let mockCanvasContext: { drawImage: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    mockClick = vi.fn();
    mockCanvasContext = {
      drawImage: vi.fn(),
    };

    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    // Clean up any existing elements
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('exportPNG', () => {
    it('should do nothing if no canvas elements found', async () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      await exportPNG();

      expect(mockClick).not.toHaveBeenCalled();
    });

    it('should merge multiple canvases and export PNG', async () => {
      const main = document.createElement('main');

      // Create mock canvases
      const canvas1 = document.createElement('canvas');
      canvas1.width = 800;
      canvas1.height = 600;

      const canvas2 = document.createElement('canvas');
      canvas2.width = 800;
      canvas2.height = 600;

      main.appendChild(canvas1);
      main.appendChild(canvas2);
      document.body.appendChild(main);

      // Mock canvas context
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCanvasContext as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,test'
      );

      // Mock only anchor creation, let canvas creation work normally
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });

      await exportPNG();

      expect(mockClick).toHaveBeenCalled();
    });

    it('should use default filename', async () => {
      const main = document.createElement('main');
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      main.appendChild(canvas);
      document.body.appendChild(main);

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCanvasContext,
            toDataURL: () => 'data:image/png;base64,test',
          } as unknown as HTMLCanvasElement;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      await exportPNG();

      expect(anchorMock.download).toBe('lokifi-chart.png');
    });

    it('should use custom filename', async () => {
      const main = document.createElement('main');
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      main.appendChild(canvas);
      document.body.appendChild(main);

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCanvasContext,
            toDataURL: () => 'data:image/png;base64,test',
          } as unknown as HTMLCanvasElement;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      await exportPNG('my-chart.png');

      expect(anchorMock.download).toBe('my-chart.png');
    });

    it('should fall back to body if no main element', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      document.body.appendChild(canvas);

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockCanvasContext,
            toDataURL: () => 'data:image/png;base64,test',
          } as unknown as HTMLCanvasElement;
        }
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      await exportPNG();

      expect(mockClick).toHaveBeenCalled();
    });
  });

  describe('exportSVG', () => {
    it('should export drawings as SVG', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      // Mock getBoundingClientRect
      vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({
        width: 1200,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 1200,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      exportSVG();

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('should use default filename', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        bottom: 400,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      exportSVG();

      expect(anchorMock.download).toBe('lokifi-drawings.svg');
    });

    it('should use custom filename', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        bottom: 400,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      exportSVG('custom-drawings.svg');

      expect(anchorMock.download).toBe('custom-drawings.svg');
    });

    it('should revoke object URL after timeout', () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      vi.spyOn(main, 'getBoundingClientRect').mockReturnValue({
        width: 800,
        height: 400,
        top: 0,
        left: 0,
        bottom: 400,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      exportSVG();

      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10000);

      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should use default dimensions if no container found', async () => {
      // Remove main element
      const { drawingsToSVG } = vi.mocked(await import('@/lib/utils/svg'));

      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') return anchorMock as unknown as HTMLAnchorElement;
        return document.createElementNS('http://www.w3.org/1999/xhtml', tag) as HTMLElement;
      });

      exportSVG();

      // Should use default 1200x600 dimensions
      expect(drawingsToSVG).toHaveBeenCalledWith([], 1200, 600);
    });
  });
});
