/**
 * Tests for io utility
 */
import { downloadBlob, downloadText, exportPngFromRoot } from '@/lib/utils/io';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('io', () => {
  let originalURL: typeof URL;
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Save original URL
    originalURL = globalThis.URL;

    // Create mock URL methods
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
    mockRevokeObjectURL = vi.fn();

    // Mock URL
    globalThis.URL = {
      ...originalURL,
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    } as unknown as typeof URL;
  });

  afterEach(() => {
    globalThis.URL = originalURL;
    vi.restoreAllMocks();
  });

  describe('downloadText', () => {
    it('should create blob with text and download', () => {
      const clickSpy = vi.fn();
      const removeSpy = vi.fn();

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: clickSpy,
        remove: removeSpy,
      } as unknown as HTMLAnchorElement);

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      downloadText('test.json', '{"key": "value"}');

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(clickSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should use application/json content type', () => {
      let createdBlob: Blob | null = null;
      mockCreateObjectURL.mockImplementation((blob: Blob) => {
        createdBlob = blob;
        return 'blob:test';
      });

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      } as unknown as HTMLAnchorElement);

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      downloadText('data.json', '{}');

      expect(createdBlob).toBeInstanceOf(Blob);
      expect(createdBlob!.type).toBe('application/json;charset=utf-8');
    });
  });

  describe('downloadBlob', () => {
    it('should create download link and trigger click', () => {
      const clickSpy = vi.fn();
      const removeSpy = vi.fn();

      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: clickSpy,
        remove: removeSpy,
      } as unknown as HTMLAnchorElement);

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      const blob = new Blob(['test content'], { type: 'text/plain' });
      downloadBlob('test.txt', blob);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should set correct filename', () => {
      const anchor = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
      };

      vi.spyOn(document, 'createElement').mockReturnValue(anchor as unknown as HTMLAnchorElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      const blob = new Blob(['content']);
      downloadBlob('my-file.csv', blob);

      expect(anchor.download).toBe('my-file.csv');
    });
  });

  describe('exportPngFromRoot', () => {
    it('should throw error if no canvases found', async () => {
      const root = document.createElement('div');

      await expect(exportPngFromRoot(root)).rejects.toThrow('No canvases found to export.');
    });

    it('should composite canvases and download as PNG', async () => {
      // Create mock canvas
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 100;
      mockCanvas.height = 100;

      // Mock canvas context
      const mockContext = {
        drawImage: vi.fn(),
      };

      // Create output canvas mock
      const outputCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockContext),
        toBlob: vi.fn((callback) => {
          callback(new Blob(['png data'], { type: 'image/png' }));
        }),
      };

      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tag) => {
        if (tag === 'canvas') {
          return outputCanvas as unknown as HTMLCanvasElement;
        }
        return {
          href: '',
          download: '',
          click: vi.fn(),
          remove: vi.fn(),
        } as unknown as HTMLAnchorElement;
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      // Setup root with canvas
      const root = document.createElement('div');
      Object.defineProperty(root, 'querySelectorAll', {
        value: () => [mockCanvas],
      });
      Object.defineProperty(root, 'clientWidth', { value: 800 });
      Object.defineProperty(root, 'clientHeight', { value: 600 });

      await exportPngFromRoot(root, 'chart.png');

      expect(outputCanvas.toBlob).toHaveBeenCalled();
    });

    it('should use max dimensions from canvases', async () => {
      const canvas1 = document.createElement('canvas');
      canvas1.width = 100;
      canvas1.height = 200;

      const canvas2 = document.createElement('canvas');
      canvas2.width = 300;
      canvas2.height = 150;

      const mockContext = { drawImage: vi.fn() };

      let outputCanvasWidth = 0;
      let outputCanvasHeight = 0;

      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tag) => {
        if (tag === 'canvas') {
          return {
            get width() {
              return outputCanvasWidth;
            },
            set width(v) {
              outputCanvasWidth = v;
            },
            get height() {
              return outputCanvasHeight;
            },
            set height(v) {
              outputCanvasHeight = v;
            },
            getContext: () => mockContext,
            toBlob: vi.fn((cb) => cb(new Blob(['']))),
          } as unknown as HTMLCanvasElement;
        }
        return {
          href: '',
          download: '',
          click: vi.fn(),
          remove: vi.fn(),
        } as unknown as HTMLAnchorElement;
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      const root = document.createElement('div');
      Object.defineProperty(root, 'querySelectorAll', {
        value: () => [canvas1, canvas2],
      });

      await exportPngFromRoot(root);

      expect(outputCanvasWidth).toBe(300); // Max width
      expect(outputCanvasHeight).toBe(200); // Max height
    });

    it('should use default filename', async () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 100;
      mockCanvas.height = 100;

      let downloadFilename = '';
      const mockContext = { drawImage: vi.fn() };

      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tag) => {
        if (tag === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => mockContext,
            toBlob: vi.fn((cb) => cb(new Blob(['']))),
          } as unknown as HTMLCanvasElement;
        }
        return {
          href: '',
          get download() {
            return downloadFilename;
          },
          set download(v) {
            downloadFilename = v;
          },
          click: vi.fn(),
          remove: vi.fn(),
        } as unknown as HTMLAnchorElement;
      });

      vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);

      const root = document.createElement('div');
      Object.defineProperty(root, 'querySelectorAll', {
        value: () => [mockCanvas],
      });

      await exportPngFromRoot(root);

      expect(downloadFilename).toBe('lokifi.png');
    });
  });
});
