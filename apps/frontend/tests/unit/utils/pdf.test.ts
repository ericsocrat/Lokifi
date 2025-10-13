import { exportReportPDF } from '@/lib/utils/pdf';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock pdf-lib module
vi.mock('pdf-lib', () => {
  const mockPage = {
    drawText: vi.fn(),
    drawImage: vi.fn(),
    getSize: vi.fn(() => ({ width: 612, height: 792 })),
  };

  const mockPDFDoc = {
    addPage: vi.fn(() => mockPage),
    embedFont: vi.fn(() => Promise.resolve({})),
    embedPng: vi.fn(() => Promise.resolve({})),
    save: vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3]))),
  };

  return {
    PDFDocument: {
      create: vi.fn(() => Promise.resolve(mockPDFDoc)),
    },
    StandardFonts: {
      Helvetica: 'Helvetica',
    },
    rgb: vi.fn((r: number, g: number, b: number) => ({ r, g, b })),
  };
});

// Mock exporters
vi.mock('@/lib/exporters', () => ({
  exportPNG: vi.fn(),
}));

describe('PDF Export', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;
  let mockAnchor: HTMLAnchorElement;

  beforeEach(() => {
    // Mock canvas context
    mockContext = {
      drawImage: vi.fn(),
    } as any;

    // Mock canvas element
    mockCanvas = {
      width: 800,
      height: 600,
      getContext: vi.fn(() => mockContext),
      toDataURL: vi.fn(() => 'data:image/png;base64,mockImageData'),
    } as any;

    // Mock anchor element
    mockAnchor = {
      href: '',
      download: '',
      click: vi.fn(),
    } as any;

    // Mock document methods
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') return mockCanvas as any;
      if (tagName === 'a') return mockAnchor as any;
      return document.createElement(tagName);
    });

    vi.spyOn(document, 'querySelector').mockReturnValue(document.body);
    vi.spyOn(document.body, 'querySelectorAll').mockReturnValue([mockCanvas, mockCanvas] as any);

    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      } as Response)
    );

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('exportReportPDF', () => {
    it('returns early when no canvases found', async () => {
      vi.spyOn(document.body, 'querySelectorAll').mockReturnValue([] as any);

      // Should not throw
      await expect(exportReportPDF()).resolves.toBeUndefined();
    });

    it('completes export process successfully', async () => {
      await exportReportPDF();

      // Verify key steps occurred
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('creates download link with correct attributes', async () => {
      await exportReportPDF();

      expect(mockAnchor.href).toBe('blob:mock-url');
      expect(mockAnchor.download).toBe('lokifi-report.pdf');
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    it('accepts custom title parameter', async () => {
      // Should not throw with custom title
      await expect(exportReportPDF('Custom Title')).resolves.toBeUndefined();
    });

    it('uses default title when none provided', async () => {
      // Should not throw with default title
      await expect(exportReportPDF()).resolves.toBeUndefined();
    });

    it('handles canvas drawing operations', async () => {
      await exportReportPDF();

      // Should combine canvases by drawing them
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
    });

    it('converts canvas to data URL format', async () => {
      await exportReportPDF();

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
    });

    it('fetches image data for PDF embedding', async () => {
      await exportReportPDF();

      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('data:image/png'));
    });

    it('creates blob URL for download', async () => {
      await exportReportPDF();

      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    });

    it('falls back to document.body when main not found', async () => {
      vi.spyOn(document, 'querySelector').mockReturnValue(null);
      vi.spyOn(document.body, 'querySelectorAll').mockReturnValue([mockCanvas] as any);

      await exportReportPDF();

      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });
});

