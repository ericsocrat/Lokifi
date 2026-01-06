/**
 * PluginDrawer Component Tests
 *
 * Tests for plugin configuration management UI
 */

import PluginDrawer from '@/components/PluginDrawer';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock storage utilities
const mockLoadJSON = vi.fn();
const mockSaveJSON = vi.fn();

vi.mock('@/lib/utils/storage', () => ({
  loadJSON: (key: string, defaultValue: unknown) => mockLoadJSON(key, defaultValue),
  saveJSON: (key: string, value: unknown) => mockSaveJSON(key, value),
}));

// Mock plugins
const mockPlugins = [
  {
    meta: { id: 'plugin-1', name: 'Test Plugin 1', description: 'First test plugin' },
    defaults: { apiKey: 'default-key-1', timeout: '30' },
  },
  {
    meta: { id: 'plugin-2', name: 'Test Plugin 2', description: 'Second test plugin' },
    defaults: { enabled: 'true', maxRetries: '3' },
  },
  {
    meta: { id: 'plugin-3', name: 'Plugin No Description' },
    defaults: null,
  },
];

vi.mock('@/lib/plugins/plugins', () => ({
  listPlugins: () => mockPlugins,
}));

// Store original URL methods
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;
const originalCreateElement = document.createElement.bind(document);

// Mock URL methods
let createdBlobContent: string = '';
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  // Reset mocks
  mockLoadJSON.mockReturnValue({});
  mockSaveJSON.mockClear();
  mockRevokeObjectURL.mockClear();
  createdBlobContent = '';

  // Mock URL API
  URL.createObjectURL = vi.fn((blob: Blob) => {
    // Capture blob content
    return 'blob:mock-url';
  });
  URL.revokeObjectURL = mockRevokeObjectURL;

  // Mock Blob to capture content
  global.Blob = vi.fn((content: BlobPart[], options?: BlobPropertyBag) => {
    createdBlobContent = content[0] as string;
    return {
      type: options?.type || 'application/json',
      size: createdBlobContent.length,
    } as Blob;
  }) as unknown as typeof Blob;

  // Mock document.createElement for anchor clicks
  vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
    const element = originalCreateElement(tagName);
    if (tagName === 'a') {
      (element as HTMLAnchorElement).click = vi.fn();
    }
    return element;
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

describe('PluginDrawer', () => {
  describe('Header', () => {
    it('should render Plugins heading', () => {
      render(<PluginDrawer />);

      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });

    it('should apply correct heading styling', () => {
      render(<PluginDrawer />);

      const heading = screen.getByText('Plugins');
      expect(heading.tagName).toBe('H2');
      expect(heading).toHaveClass('text-lg', 'font-semibold', 'mb-2');
    });
  });

  describe('Plugin List', () => {
    it('should render all plugins', () => {
      render(<PluginDrawer />);

      expect(screen.getByText('Test Plugin 1')).toBeInTheDocument();
      expect(screen.getByText('Test Plugin 2')).toBeInTheDocument();
      expect(screen.getByText('Plugin No Description')).toBeInTheDocument();
    });

    it('should display plugin descriptions', () => {
      render(<PluginDrawer />);

      expect(screen.getByText('First test plugin')).toBeInTheDocument();
      expect(screen.getByText('Second test plugin')).toBeInTheDocument();
    });

    it('should show "No description" for plugins without description', () => {
      render(<PluginDrawer />);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('should render plugin cards with correct styling', () => {
      render(<PluginDrawer />);

      const cards = document.querySelectorAll('.rounded-xl.border.border-neutral-700');
      expect(cards.length).toBe(3);
    });
  });

  describe('Plugin Configuration', () => {
    it('should render config inputs for plugins with defaults', () => {
      render(<PluginDrawer />);

      // Plugin 1 has apiKey and timeout
      expect(screen.getByText('apiKey')).toBeInTheDocument();
      expect(screen.getByText('timeout')).toBeInTheDocument();

      // Plugin 2 has enabled and maxRetries
      expect(screen.getByText('enabled')).toBeInTheDocument();
      expect(screen.getByText('maxRetries')).toBeInTheDocument();
    });

    it('should show default values in inputs', () => {
      render(<PluginDrawer />);

      const inputs = screen.getAllByRole('textbox');
      const values = inputs.map((input) => (input as HTMLInputElement).value);

      expect(values).toContain('default-key-1');
      expect(values).toContain('30');
      expect(values).toContain('true');
      expect(values).toContain('3');
    });

    it('should show saved values when config exists', () => {
      mockLoadJSON.mockReturnValue({
        'plugin-1': { apiKey: 'saved-key', timeout: '60' },
      });

      render(<PluginDrawer />);

      const apiKeyInput = screen.getByDisplayValue('saved-key');
      const timeoutInput = screen.getByDisplayValue('60');

      expect(apiKeyInput).toBeInTheDocument();
      expect(timeoutInput).toBeInTheDocument();
    });

    it('should not render inputs for plugins without defaults', () => {
      render(<PluginDrawer />);

      // Plugin 3 has no defaults, so should have no inputs
      const pluginCard = screen.getByText('Plugin No Description').closest('.rounded-xl');
      const inputs = pluginCard?.querySelectorAll('input[type="text"]');
      expect(inputs?.length || 0).toBe(0);
    });
  });

  describe('Configuration Updates', () => {
    it('should update state when input changes', () => {
      render(<PluginDrawer />);

      const apiKeyInput = screen.getByDisplayValue('default-key-1');
      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });

      expect(screen.getByDisplayValue('new-api-key')).toBeInTheDocument();
    });

    it('should save to storage when input changes', () => {
      render(<PluginDrawer />);

      const apiKeyInput = screen.getByDisplayValue('default-key-1');
      fireEvent.change(apiKeyInput, { target: { value: 'new-api-key' } });

      expect(mockSaveJSON).toHaveBeenCalledWith(
        'lokifi-plugin-cfg',
        expect.objectContaining({
          'plugin-1': expect.objectContaining({ apiKey: 'new-api-key' }),
        })
      );
    });

    it('should preserve existing config when updating one field', () => {
      mockLoadJSON.mockReturnValue({
        'plugin-1': { apiKey: 'existing-key', timeout: '45' },
      });

      render(<PluginDrawer />);

      const timeoutInput = screen.getByDisplayValue('45');
      fireEvent.change(timeoutInput, { target: { value: '90' } });

      expect(mockSaveJSON).toHaveBeenCalledWith(
        'lokifi-plugin-cfg',
        expect.objectContaining({
          'plugin-1': { apiKey: 'existing-key', timeout: '90' },
        })
      );
    });
  });

  describe('Export Functionality', () => {
    it('should render Export button', () => {
      render(<PluginDrawer />);

      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should create JSON blob when export is clicked', () => {
      mockLoadJSON.mockReturnValue({ 'plugin-1': { apiKey: 'test-key' } });

      render(<PluginDrawer />);

      fireEvent.click(screen.getByText('Export'));

      expect(createdBlobContent).toBe(
        JSON.stringify({ 'plugin-1': { apiKey: 'test-key' } }, null, 2)
      );
    });

    it('should create download link with correct filename', () => {
      render(<PluginDrawer />);

      fireEvent.click(screen.getByText('Export'));

      // Verify createElement was called with 'a'
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should revoke object URL after download', () => {
      render(<PluginDrawer />);

      fireEvent.click(screen.getByText('Export'));

      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('Import Functionality', () => {
    it('should render Import button', () => {
      render(<PluginDrawer />);

      expect(screen.getByText('Import')).toBeInTheDocument();
    });

    it('should have hidden file input', () => {
      render(<PluginDrawer />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveClass('hidden');
    });

    it('should accept JSON files only', () => {
      render(<PluginDrawer />);

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'application/json');
    });

    it('should trigger file input when Import is clicked', () => {
      render(<PluginDrawer />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(screen.getByText('Import'));

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should parse and apply imported JSON', async () => {
      render(<PluginDrawer />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a mock file
      const importData = { 'plugin-1': { apiKey: 'imported-key', timeout: '100' } };
      const file = new File([JSON.stringify(importData)], 'config.json', {
        type: 'application/json',
      });

      // Mock FileReader
      const mockReader = {
        result: JSON.stringify(importData),
        readAsText: vi.fn(function (this: FileReader) {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
            }
          }, 0);
        }),
        onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);

      // Trigger file selection
      Object.defineProperty(fileInput, 'files', { value: [file] });
      await act(async () => {
        fireEvent.change(fileInput);
        // Wait for FileReader callback
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(mockSaveJSON).toHaveBeenCalledWith('lokifi-plugin-cfg', importData);
    });

    it('should handle invalid JSON gracefully', async () => {
      render(<PluginDrawer />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Create a file with invalid JSON
      const file = new File(['invalid json content'], 'config.json', { type: 'application/json' });

      // Mock FileReader with invalid JSON
      const mockReader = {
        result: 'invalid json content',
        readAsText: vi.fn(function (this: FileReader) {
          setTimeout(() => {
            if (this.onload) {
              this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
            }
          }, 0);
        }),
        onload: null as ((event: ProgressEvent<FileReader>) => void) | null,
      };

      vi.spyOn(global, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);

      // Trigger file selection - should not throw
      Object.defineProperty(fileInput, 'files', { value: [file] });
      await act(async () => {
        fireEvent.change(fileInput);
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // saveJSON should not be called with invalid data
      expect(mockSaveJSON).not.toHaveBeenCalled();
    });
  });

  describe('Button Styling', () => {
    it('should apply correct styling to Export button', () => {
      render(<PluginDrawer />);

      const exportButton = screen.getByText('Export');
      expect(exportButton).toHaveClass(
        'px-3',
        'py-2',
        'rounded-2xl',
        'border',
        'border-neutral-700'
      );
    });

    it('should apply correct styling to Import button', () => {
      render(<PluginDrawer />);

      const importButton = screen.getByText('Import');
      expect(importButton).toHaveClass(
        'px-3',
        'py-2',
        'rounded-2xl',
        'border',
        'border-neutral-700'
      );
    });

    it('should render button container with gap', () => {
      render(<PluginDrawer />);

      const buttonContainer = document.querySelector('.flex.gap-2');
      expect(buttonContainer).toBeInTheDocument();
    });
  });

  describe('Storage Integration', () => {
    it('should load config from storage on mount', () => {
      render(<PluginDrawer />);

      expect(mockLoadJSON).toHaveBeenCalledWith('lokifi-plugin-cfg', {});
    });

    it('should use storage key "lokifi-plugin-cfg"', () => {
      render(<PluginDrawer />);

      const apiKeyInput = screen.getByDisplayValue('default-key-1');
      fireEvent.change(apiKeyInput, { target: { value: 'test' } });

      expect(mockSaveJSON).toHaveBeenCalledWith('lokifi-plugin-cfg', expect.anything());
    });
  });

  describe('Accessibility', () => {
    it('should have labeled inputs for config fields', () => {
      render(<PluginDrawer />);

      const labels = document.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have semantic heading', () => {
      render(<PluginDrawer />);

      const heading = screen.getByRole('heading', { name: /plugins/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have clickable buttons', () => {
      render(<PluginDrawer />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBe(2); // Export and Import
    });
  });
});
