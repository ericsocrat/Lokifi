/**
 * Tests for report utility - PDF report generation
 */
import { buildReportPDF, downloadPdf, type ReportBlock } from '@/lib/utils/report';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock pdf-lib
vi.mock('pdf-lib', () => {
  const mockPage = {
    getWidth: () => 595, // A4 width in pts
    getHeight: () => 842, // A4 height in pts
    getSize: () => ({ width: 595, height: 842 }),
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
    embedJpg: vi.fn(async () => mockImage),
    save: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])), // %PDF
  };

  return {
    PDFDocument: {
      create: vi.fn(async () => mockPdf),
    },
    StandardFonts: {
      Helvetica: 'Helvetica',
      HelveticaBold: 'Helvetica-Bold',
    },
    rgb: vi.fn((r, g, b) => ({ r, g, b })),
  };
});

describe('report', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let mockClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = vi.fn();
    mockClick = vi.fn();

    globalThis.URL.createObjectURL = mockCreateObjectURL;
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL;

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') {
        return {
          href: '',
          download: '',
          click: mockClick,
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });

    // Mock atob for base64 decoding
    globalThis.atob = vi.fn((_base64) => 'decoded-binary-content');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('buildReportPDF', () => {
    it('should create a PDF from empty blocks', async () => {
      const bytes = await buildReportPDF([]);

      expect(bytes).toBeInstanceOf(Uint8Array);
      expect(bytes.length).toBeGreaterThan(0);
    });

    it('should handle title blocks', async () => {
      const blocks: ReportBlock[] = [{ kind: 'title', text: 'My Report' }];

      const bytes = await buildReportPDF(blocks);

      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should handle text blocks with markdown', async () => {
      const blocks: ReportBlock[] = [{ kind: 'text', markdown: 'This is **bold** and *italic*' }];

      const bytes = await buildReportPDF(blocks);

      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should handle image blocks with PNG', async () => {
      const blocks: ReportBlock[] = [
        { kind: 'image', dataUrl: 'data:image/png;base64,iVBORw0KGgo=' },
      ];

      const bytes = await buildReportPDF(blocks);

      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should handle image blocks with JPEG', async () => {
      const blocks: ReportBlock[] = [
        { kind: 'image', dataUrl: 'data:image/jpeg;base64,/9j/4AAQ=' },
      ];

      const bytes = await buildReportPDF(blocks);

      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should handle image blocks with caption', async () => {
      const blocks: ReportBlock[] = [
        { kind: 'image', dataUrl: 'data:image/png;base64,xyz=', caption: 'Chart 1' },
      ];

      const bytes = await buildReportPDF(blocks);

      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should handle snapshot blocks', async () => {
      const blocks: ReportBlock[] = [
        { kind: 'snapshot', pngDataUrl: 'data:image/png;base64,abc=', title: 'BTC Chart' },
      ];

      const bytes = await buildReportPDF(blocks);

      expect(bytes).toBeInstanceOf(Uint8Array);
    });

    it('should handle multiple blocks', async () => {
      const blocks: ReportBlock[] = [
        { kind: 'title', text: 'Trading Report' },
        { kind: 'text', markdown: '## Summary\n\nThis is a summary.' },
        { kind: 'snapshot', pngDataUrl: 'data:image/png;base64,snap=', title: 'Overview' },
        { kind: 'text', markdown: 'Analysis notes here.' },
        { kind: 'image', dataUrl: 'data:image/png;base64,chart=', caption: 'ETH/USD' },
      ];

      const bytes = await buildReportPDF(blocks);

      expect(bytes).toBeInstanceOf(Uint8Array);
    });
  });

  describe('downloadPdf', () => {
    it('should create a blob and trigger download', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

      downloadPdf(bytes);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('should use default filename', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockReturnValue(
        anchorMock as unknown as HTMLAnchorElement
      );

      downloadPdf(bytes);

      expect(anchorMock.download).toBe('report.pdf');
    });

    it('should use custom filename', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      const anchorMock = { href: '', download: '', click: mockClick };
      vi.spyOn(document, 'createElement').mockReturnValue(
        anchorMock as unknown as HTMLAnchorElement
      );

      downloadPdf(bytes, 'my-custom-report.pdf');

      expect(anchorMock.download).toBe('my-custom-report.pdf');
    });

    it('should revoke object URL after timeout', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

      downloadPdf(bytes);

      expect(mockRevokeObjectURL).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);

      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should set blob type to application/pdf', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);

      downloadPdf(bytes);

      // Verify blob was created with correct type
      const blobArg = mockCreateObjectURL.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('application/pdf');
    });
  });
});
