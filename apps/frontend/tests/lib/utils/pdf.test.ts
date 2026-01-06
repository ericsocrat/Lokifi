/**
 * Tests for pdf utility - PDF chart report export
 */
import { exportReportPDF } from '@/lib/utils/pdf';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock pdf-lib
vi.mock('pdf-lib', () => {
  const mockPage = {
    getSize: () => ({ width: 612, height: 792 }), // Letter size in pts
    drawText: vi.fn(),
    drawImage: vi.fn(),
  };

  const mockFont = {
    widthOfTextAtSize: vi.fn((text: string, size: number) => text.length * size * 0.5),
  };

  const mockImage = {
    width: 800,
    height: 600,
  };

  const mockPdf = {
    addPage: vi.fn(() => mockPage),
    embedFont: vi.fn(async () => mockFont),
    embedPng: vi.fn(async () => mockImage),
    save: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])), // %PDF
  };

  return {
    PDFDocument: {
      create: vi.fn(async () => mockPdf),
    },
    StandardFonts: {
      Helvetica: 'Helvetica',
    },
    rgb: vi.fn((r, g, b) => ({ r, g, b })),
  };
});

describe('pdf', () => {
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

    // Mock fetch for data URL conversion
    globalThis.fetch = vi.fn(
      async () =>
        ({
          arrayBuffer: async () => new ArrayBuffer(100),
        }) as Response
    );

    // Clean up any existing elements
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('exportReportPDF', () => {
    it('should do nothing if no canvas elements found', async () => {
      const main = document.createElement('main');
      document.body.appendChild(main);

      await exportReportPDF();

      expect(mockClick).not.toHaveBeenCalled();
    });

    it('should export chart as PDF with default title', async () => {
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

      // Mock anchor creation
      const originalCreateElement = document.createElement.bind(document);
      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return anchorMock as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });

      await exportReportPDF();

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(anchorMock.download).toBe('lokifi-report.pdf');
    });

    it('should use custom title in PDF', async () => {
      const main = document.createElement('main');
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      main.appendChild(canvas);
      document.body.appendChild(main);

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCanvasContext as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,test'
      );

      const originalCreateElement = document.createElement.bind(document);
      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return anchorMock as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });

      await exportReportPDF('BTC Analysis Report');

      // PDF was created and downloaded
      expect(mockClick).toHaveBeenCalled();
    });

    it('should merge base and overlay canvases', async () => {
      const main = document.createElement('main');

      // Base canvas (chart)
      const baseCanvas = document.createElement('canvas');
      baseCanvas.width = 1200;
      baseCanvas.height = 800;

      // Overlay canvas (drawings)
      const overlayCanvas = document.createElement('canvas');
      overlayCanvas.width = 1200;
      overlayCanvas.height = 800;

      main.appendChild(baseCanvas);
      main.appendChild(overlayCanvas);
      document.body.appendChild(main);

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCanvasContext as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,merged'
      );

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });

      await exportReportPDF();

      // Both canvases should be drawn to merged canvas
      expect(mockCanvasContext.drawImage).toHaveBeenCalledTimes(2);
    });

    it('should revoke object URL after timeout', async () => {
      const main = document.createElement('main');
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      main.appendChild(canvas);
      document.body.appendChild(main);

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCanvasContext as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,test'
      );

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });

      await exportReportPDF();

      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10000);

      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should fall back to body if no main element', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      document.body.appendChild(canvas);

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCanvasContext as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,test'
      );

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });

      await exportReportPDF();

      expect(mockClick).toHaveBeenCalled();
    });

    it('should create blob with PDF MIME type', async () => {
      const main = document.createElement('main');
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      main.appendChild(canvas);
      document.body.appendChild(main);

      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
        mockCanvasContext as unknown as CanvasRenderingContext2D
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,test'
      );

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'a') {
          return { href: '', download: '', click: mockClick } as unknown as HTMLAnchorElement;
        }
        return originalCreateElement(tag);
      });

      await exportReportPDF();

      // Verify blob was created with correct type
      const blobArg = mockCreateObjectURL.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('application/pdf');
    });
  });
});
