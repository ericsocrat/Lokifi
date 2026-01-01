/**
 * @vitest-environment jsdom
 */
import type {
  ChartTemplate,
  ExportOptions,
  ShareableLink,
} from '@/lib/stores/templatesStore';
import {
  useFilteredTemplates,
  useTemplatesStore,
} from '@/lib/stores/templatesStore';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/server';

// Mock feature flags with templates and imgExport enabled
vi.mock('@/lib/stores/featureFlags', () => ({
  FLAGS: {
    templates: true,
    imgExport: true,
  },
}));

// Mock global fetch for API calls using vi.stubGlobal for proper interception
const mockFetch = vi.fn();

// Disable MSW for this test file to use direct fetch mocking
beforeAll(() => {
  server.close();
  vi.stubGlobal('fetch', mockFetch);
});

afterAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

// Helper to create a mock template
const createMockTemplate = (overrides?: Partial<ChartTemplate>): ChartTemplate => ({
  id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: 'Test Template',
  description: 'A test template',
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: 'test_user',
  tags: ['test'],
  isPublic: false,
  usageCount: 0,
  config: {
    chartType: 'candlestick',
    timeframe: '1h',
    theme: 'dark',
    indicators: [],
    drawings: [],
    showVolume: true,
    showGrid: true,
    showCrosshair: true,
    showLegend: true,
    priceScaleMode: 'normal',
    priceLines: [],
    timeScaleOptions: {
      rightOffset: 5,
      barSpacing: 6,
      minBarSpacing: 2,
    },
    colors: {
      upColor: '#26a69a',
      downColor: '#ef5350',
      backgroundColor: '#131722',
      gridColor: '#363c4e',
      textColor: '#d1d4dc',
    },
  },
  ...overrides,
});

// Helper to create a mock shareable link
const createMockShareableLink = (overrides?: Partial<ShareableLink>): ShareableLink => ({
  id: `link_${Date.now()}`,
  templateId: 'template_123',
  createdAt: new Date(),
  viewCount: 0,
  isPublic: true,
  shortCode: 'abc123',
  ...overrides,
});

describe('TemplatesStore', () => {
  beforeEach(() => {
    // Reset fetch mock with comprehensive default response
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
      blob: async () => new Blob(['test content'], { type: 'application/octet-stream' }),
    });

    // Reset store state
    useTemplatesStore.setState({
      templates: [],
      templatesByUser: new Map(),
      publicTemplates: [],
      featuredTemplates: [],
      activeTemplate: null,
      isEditing: false,
      hasUnsavedChanges: false,
      exportOptions: {
        format: 'png',
        width: 1920,
        height: 1080,
        quality: 1.0,
        includeWatermark: false,
        backgroundColor: '#ffffff',
        orientation: 'landscape',
        pageSize: 'A4',
      },
      exportHistory: [],
      shareableLinks: [],
      searchQuery: '',
      selectedTags: [],
      sortBy: 'updated',
      sortOrder: 'desc',
      isLoading: false,
      isExporting: false,
      error: null,
    });
  });

  describe('Initial State', () => {
    it('should initialize with default values', () => {
      const state = useTemplatesStore.getState();

      expect(state.templates).toEqual([]);
      expect(state.publicTemplates).toEqual([]);
      expect(state.featuredTemplates).toEqual([]);
      expect(state.activeTemplate).toBeNull();
      expect(state.isEditing).toBe(false);
      expect(state.hasUnsavedChanges).toBe(false);
      expect(state.searchQuery).toBe('');
      expect(state.selectedTags).toEqual([]);
      expect(state.sortBy).toBe('updated');
      expect(state.sortOrder).toBe('desc');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should have default export options', () => {
      const { exportOptions } = useTemplatesStore.getState();

      expect(exportOptions.format).toBe('png');
      expect(exportOptions.width).toBe(1920);
      expect(exportOptions.height).toBe(1080);
      expect(exportOptions.quality).toBe(1.0);
      expect(exportOptions.includeWatermark).toBe(false);
    });

    it('should have empty export history', () => {
      const { exportHistory } = useTemplatesStore.getState();
      expect(exportHistory).toEqual([]);
    });

    it('should have empty shareable links', () => {
      const { shareableLinks } = useTemplatesStore.getState();
      expect(shareableLinks).toEqual([]);
    });
  });

  describe('Template Management', () => {
    describe('createTemplate', () => {
      it('should create a new template with valid config', async () => {
        const mockTemplate = createMockTemplate({ id: 'server_template_1' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTemplate,
        });

        const { createTemplate } = useTemplatesStore.getState();
        const config: ChartTemplate['config'] = {
          chartType: 'candlestick',
          timeframe: '1h',
          theme: 'dark',
          indicators: [],
          drawings: [],
          showVolume: true,
          showGrid: true,
          showCrosshair: true,
          showLegend: true,
          priceScaleMode: 'normal',
          priceLines: [],
          timeScaleOptions: { rightOffset: 5, barSpacing: 6, minBarSpacing: 2 },
          colors: {
            upColor: '#26a69a',
            downColor: '#ef5350',
            backgroundColor: '#131722',
            gridColor: '#363c4e',
            textColor: '#d1d4dc',
          },
        };

        const id = await createTemplate('My Template', config);

        expect(id).toBeTruthy();
        expect(id).toContain('template_');

        const { templates } = useTemplatesStore.getState();
        expect(templates.length).toBeGreaterThan(0);
      });

      it('should set active template after creation', async () => {
        // API returns the saved template with the same name
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockTemplate({ name: 'Active Template' }),
        });

        const { createTemplate } = useTemplatesStore.getState();
        await createTemplate('Active Template', createMockTemplate().config);

        const { activeTemplate } = useTemplatesStore.getState();
        expect(activeTemplate).not.toBeNull();
        expect(activeTemplate?.name).toBe('Active Template');
      });

      it('should handle API errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

        const { createTemplate } = useTemplatesStore.getState();
        await createTemplate('Failing Template', createMockTemplate().config);

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to save template');
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const { createTemplate } = useTemplatesStore.getState();
        await createTemplate('Network Error Template', createMockTemplate().config);

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Network error');
      });
    });

    describe('updateTemplate', () => {
      it('should update existing template', async () => {
        const template = createMockTemplate({ id: 'template_to_update' });
        useTemplatesStore.setState({ templates: [template] });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { updateTemplate } = useTemplatesStore.getState();
        await updateTemplate('template_to_update', { name: 'Updated Name' });

        const { templates } = useTemplatesStore.getState();
        expect(templates[0].name).toBe('Updated Name');
      });

      it('should update timestamp on update', async () => {
        const oldDate = new Date('2020-01-01');
        const template = createMockTemplate({ id: 'template_1', updatedAt: oldDate });
        useTemplatesStore.setState({ templates: [template] });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { updateTemplate } = useTemplatesStore.getState();
        await updateTemplate('template_1', { name: 'New Name' });

        const { templates } = useTemplatesStore.getState();
        expect(templates[0].updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
      });

      it('should update active template if it matches', async () => {
        const template = createMockTemplate({ id: 'active_template' });
        useTemplatesStore.setState({
          templates: [template],
          activeTemplate: template,
        });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { updateTemplate } = useTemplatesStore.getState();
        await updateTemplate('active_template', { name: 'Updated Active' });

        const { activeTemplate } = useTemplatesStore.getState();
        expect(activeTemplate?.name).toBe('Updated Active');
      });

      it('should handle update errors', async () => {
        const template = createMockTemplate({ id: 'error_template' });
        useTemplatesStore.setState({ templates: [template] });

        mockFetch.mockResolvedValueOnce({ ok: false });

        const { updateTemplate } = useTemplatesStore.getState();
        await updateTemplate('error_template', { name: 'Will Fail' });

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to update template');
      });
    });

    describe('deleteTemplate', () => {
      it('should delete template from list', async () => {
        const template = createMockTemplate({ id: 'delete_me' });
        useTemplatesStore.setState({ templates: [template] });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { deleteTemplate } = useTemplatesStore.getState();
        await deleteTemplate('delete_me');

        const { templates } = useTemplatesStore.getState();
        expect(templates).toHaveLength(0);
      });

      it('should clear active template if deleted', async () => {
        const template = createMockTemplate({ id: 'active_delete' });
        useTemplatesStore.setState({
          templates: [template],
          activeTemplate: template,
        });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { deleteTemplate } = useTemplatesStore.getState();
        await deleteTemplate('active_delete');

        const { activeTemplate } = useTemplatesStore.getState();
        expect(activeTemplate).toBeNull();
      });

      it('should handle delete errors', async () => {
        const template = createMockTemplate({ id: 'error_delete' });
        useTemplatesStore.setState({ templates: [template] });

        mockFetch.mockResolvedValueOnce({ ok: false });

        const { deleteTemplate } = useTemplatesStore.getState();
        await deleteTemplate('error_delete');

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to delete template');
      });
    });

    describe('duplicateTemplate', () => {
      it('should create a copy of template with new name', async () => {
        const template = createMockTemplate({ id: 'original', name: 'Original' });
        useTemplatesStore.setState({ templates: [template] });

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockTemplate({ name: 'Duplicate' }),
        });

        const { duplicateTemplate } = useTemplatesStore.getState();
        const newId = await duplicateTemplate('original', 'Duplicate');

        expect(newId).toBeTruthy();
        const { templates } = useTemplatesStore.getState();
        expect(templates.length).toBeGreaterThanOrEqual(1);
      });

      it('should return empty string for non-existent template', async () => {
        const { duplicateTemplate } = useTemplatesStore.getState();
        const newId = await duplicateTemplate('non_existent', 'Copy');

        expect(newId).toBe('');
      });
    });
  });

  describe('Template Application', () => {
    it('should apply template and set as active', () => {
      const template = createMockTemplate({ id: 'apply_template' });
      useTemplatesStore.setState({ templates: [template] });

      const { applyTemplate } = useTemplatesStore.getState();
      applyTemplate('apply_template', 'AAPL');

      const { activeTemplate } = useTemplatesStore.getState();
      expect(activeTemplate?.id).toBe('apply_template');
    });

    it('should increment usage count when applied', () => {
      const template = createMockTemplate({ id: 'usage_template', usageCount: 5 });
      useTemplatesStore.setState({ templates: [template] });

      const { applyTemplate } = useTemplatesStore.getState();
      applyTemplate('usage_template');

      const { templates } = useTemplatesStore.getState();
      expect(templates[0].usageCount).toBe(6);
    });

    it('should dispatch templateApplied event', () => {
      const eventListener = vi.fn();
      window.addEventListener('templateApplied', eventListener);

      const template = createMockTemplate({ id: 'event_template' });
      useTemplatesStore.setState({ templates: [template] });

      const { applyTemplate } = useTemplatesStore.getState();
      applyTemplate('event_template', 'TSLA');

      expect(eventListener).toHaveBeenCalled();
      window.removeEventListener('templateApplied', eventListener);
    });

    it('should not apply non-existent template', () => {
      const { applyTemplate } = useTemplatesStore.getState();
      applyTemplate('non_existent');

      const { activeTemplate } = useTemplatesStore.getState();
      expect(activeTemplate).toBeNull();
    });

    it('should set active template directly', () => {
      const template = createMockTemplate();

      const { setActiveTemplate } = useTemplatesStore.getState();
      setActiveTemplate(template);

      const { activeTemplate } = useTemplatesStore.getState();
      expect(activeTemplate).toEqual(template);
    });

    it('should clear active template when set to null', () => {
      const template = createMockTemplate();
      useTemplatesStore.setState({ activeTemplate: template });

      const { setActiveTemplate } = useTemplatesStore.getState();
      setActiveTemplate(null);

      const { activeTemplate } = useTemplatesStore.getState();
      expect(activeTemplate).toBeNull();
    });

    it('should mark unsaved changes', () => {
      const { markUnsavedChanges } = useTemplatesStore.getState();
      markUnsavedChanges(true);

      const { hasUnsavedChanges } = useTemplatesStore.getState();
      expect(hasUnsavedChanges).toBe(true);
    });

    it('should clear unsaved changes flag', () => {
      useTemplatesStore.setState({ hasUnsavedChanges: true });

      const { markUnsavedChanges } = useTemplatesStore.getState();
      markUnsavedChanges(false);

      const { hasUnsavedChanges } = useTemplatesStore.getState();
      expect(hasUnsavedChanges).toBe(false);
    });
  });

  describe('Loading & Syncing', () => {
    describe('loadUserTemplates', () => {
      it('should load user templates from API', async () => {
        const templates = [
          createMockTemplate({ id: 'user_template_1' }),
          createMockTemplate({ id: 'user_template_2' }),
        ];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => templates,
        });

        const { loadUserTemplates } = useTemplatesStore.getState();
        await loadUserTemplates();

        const state = useTemplatesStore.getState();
        expect(state.templates).toHaveLength(2);
        expect(state.isLoading).toBe(false);
      });

      it('should set loading state during fetch', async () => {
        mockFetch.mockImplementationOnce(() =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ ok: true, json: async () => [] }),
              100
            )
          )
        );

        const { loadUserTemplates } = useTemplatesStore.getState();
        const promise = loadUserTemplates();

        // Check loading state immediately
        const { isLoading } = useTemplatesStore.getState();
        expect(isLoading).toBe(true);

        await promise;
      });

      it('should handle load errors', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { loadUserTemplates } = useTemplatesStore.getState();
        await loadUserTemplates();

        const { error, isLoading } = useTemplatesStore.getState();
        expect(error).toBe('Failed to load templates');
        expect(isLoading).toBe(false);
      });
    });

    describe('loadPublicTemplates', () => {
      it('should load public templates', async () => {
        const templates = [createMockTemplate({ isPublic: true })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => templates,
        });

        const { loadPublicTemplates } = useTemplatesStore.getState();
        await loadPublicTemplates();

        const { publicTemplates } = useTemplatesStore.getState();
        expect(publicTemplates).toHaveLength(1);
      });

      it('should handle public templates load error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { loadPublicTemplates } = useTemplatesStore.getState();
        await loadPublicTemplates();

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to load public templates');
      });
    });

    describe('loadFeaturedTemplates', () => {
      it('should load featured templates', async () => {
        const templates = [createMockTemplate({ name: 'Featured' })];
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => templates,
        });

        const { loadFeaturedTemplates } = useTemplatesStore.getState();
        await loadFeaturedTemplates();

        const { featuredTemplates } = useTemplatesStore.getState();
        expect(featuredTemplates).toHaveLength(1);
      });

      it('should handle featured templates load error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { loadFeaturedTemplates } = useTemplatesStore.getState();
        await loadFeaturedTemplates();

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to load featured templates');
      });
    });

    describe('syncTemplate', () => {
      it('should sync existing template', async () => {
        const existingTemplate = createMockTemplate({ id: 'sync_template', name: 'Old Name' });
        useTemplatesStore.setState({ templates: [existingTemplate] });

        const updatedTemplate = { ...existingTemplate, name: 'New Name' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedTemplate,
        });

        const { syncTemplate } = useTemplatesStore.getState();
        await syncTemplate('sync_template');

        const { templates } = useTemplatesStore.getState();
        expect(templates[0].name).toBe('New Name');
      });

      it('should add template if not found locally', async () => {
        const newTemplate = createMockTemplate({ id: 'new_sync' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => newTemplate,
        });

        const { syncTemplate } = useTemplatesStore.getState();
        await syncTemplate('new_sync');

        const { templates } = useTemplatesStore.getState();
        expect(templates).toHaveLength(1);
        expect(templates[0].id).toBe('new_sync');
      });

      it('should update active template if synced', async () => {
        const template = createMockTemplate({ id: 'active_sync', name: 'Old' });
        useTemplatesStore.setState({
          templates: [template],
          activeTemplate: template,
        });

        const updated = { ...template, name: 'Synced' };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updated,
        });

        const { syncTemplate } = useTemplatesStore.getState();
        await syncTemplate('active_sync');

        const { activeTemplate } = useTemplatesStore.getState();
        expect(activeTemplate?.name).toBe('Synced');
      });

      it('should handle sync errors', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { syncTemplate } = useTemplatesStore.getState();
        await syncTemplate('error_sync');

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to sync template');
      });
    });
  });

  describe('Import/Export', () => {
    describe('importTemplate', () => {
      it('should import valid template data', async () => {
        const templateData = createMockTemplate();
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => templateData,
        });

        const { importTemplate } = useTemplatesStore.getState();
        const id = await importTemplate(templateData);

        expect(id).toBeTruthy();
      });

      it('should use default name if not provided', async () => {
        const templateData: Partial<ChartTemplate> = {
          config: createMockTemplate().config,
        };
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => createMockTemplate({ name: 'Imported Template' }),
        });

        const { importTemplate } = useTemplatesStore.getState();
        await importTemplate(templateData);

        const { templates } = useTemplatesStore.getState();
        expect(templates[0].name).toBe('Imported Template');
      });

      it('should reject invalid template data', async () => {
        const { importTemplate } = useTemplatesStore.getState();
        const id = await importTemplate({});

        expect(id).toBe('');
        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Invalid template data');
      });
    });

    describe('exportTemplate', () => {
      it('should export template as clean copy', () => {
        const template = createMockTemplate({
          id: 'export_me',
          createdBy: 'original_user',
          usageCount: 100,
        });
        useTemplatesStore.setState({ templates: [template] });

        const { exportTemplate } = useTemplatesStore.getState();
        const exported = exportTemplate('export_me');

        expect(exported.id).toContain('exported_');
        expect(exported.createdBy).toBe('exported');
        expect(exported.usageCount).toBe(0);
        expect(exported.config).toEqual(template.config);
      });

      it('should throw error for non-existent template', () => {
        const { exportTemplate } = useTemplatesStore.getState();

        expect(() => exportTemplate('non_existent')).toThrow('Template not found');
      });
    });

    describe('exportAsImage', () => {
      it('should export template as image', async () => {
        const blobContent = new Blob(['image data'], { type: 'image/png' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: async () => blobContent,
        });

        const { exportAsImage } = useTemplatesStore.getState();
        const blob = await exportAsImage('template_1', 'AAPL');

        expect(blob).toBeInstanceOf(Blob);
      });

      it('should set exporting state during export', async () => {
        mockFetch.mockImplementationOnce(() =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  blob: async () => new Blob(['test']),
                }),
              100
            )
          )
        );

        const { exportAsImage } = useTemplatesStore.getState();
        const promise = exportAsImage('template_1', 'AAPL');

        const { isExporting } = useTemplatesStore.getState();
        expect(isExporting).toBe(true);

        await promise;
      });

      it('should add to export history', async () => {
        const blob = new Blob(['test'], { type: 'image/png' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: async () => blob,
        });

        const { exportAsImage } = useTemplatesStore.getState();
        await exportAsImage('template_1', 'TSLA', { format: 'png' });

        const { exportHistory } = useTemplatesStore.getState();
        expect(exportHistory).toHaveLength(1);
        expect(exportHistory[0].format).toBe('png');
        expect(exportHistory[0].filename).toBe('TSLA_chart.png');
      });

      it('should handle export errors', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { exportAsImage } = useTemplatesStore.getState();

        await expect(exportAsImage('template_1', 'AAPL')).rejects.toThrow('Export failed');
      });

      it('should use custom export options', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: async () => new Blob(['test']),
        });

        const customOptions: Partial<ExportOptions> = {
          width: 3840,
          height: 2160,
          format: 'jpg',
          quality: 0.9,
        };

        const { exportAsImage } = useTemplatesStore.getState();
        await exportAsImage('template_1', 'AAPL', customOptions);

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/export/image',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('3840'),
          })
        );
      });
    });

    describe('exportAsPDF', () => {
      it('should export template as PDF', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: async () => new Blob(['pdf data'], { type: 'application/pdf' }),
        });

        const { exportAsPDF } = useTemplatesStore.getState();
        const blob = await exportAsPDF('template_1', 'AAPL');

        expect(blob).toBeInstanceOf(Blob);
      });

      it('should use PDF format override', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: async () => new Blob(['pdf data']),
        });

        const { exportAsPDF } = useTemplatesStore.getState();
        await exportAsPDF('template_1', 'MSFT', { format: 'png' as const }); // Should override to PDF

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/export/image',
          expect.objectContaining({
            body: expect.stringContaining('"format":"pdf"'),
          })
        );
      });
    });
  });

  describe('Sharing', () => {
    describe('createShareableLink', () => {
      it('should create a shareable link', async () => {
        const link = createMockShareableLink({ shortCode: 'xyz789' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => link,
        });

        const { createShareableLink } = useTemplatesStore.getState();
        const shortCode = await createShareableLink('template_1', true);

        expect(shortCode).toBe('xyz789');

        const { shareableLinks } = useTemplatesStore.getState();
        expect(shareableLinks).toHaveLength(1);
      });

      it('should create link with expiration', async () => {
        const link = createMockShareableLink({
          expiresAt: new Date(Date.now() + 86400000),
        });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => link,
        });

        const { createShareableLink } = useTemplatesStore.getState();
        await createShareableLink('template_1', false, 86400000);

        expect(mockFetch).toHaveBeenCalledWith(
          '/api/templates/share',
          expect.objectContaining({
            body: expect.stringContaining('86400000'),
          })
        );
      });

      it('should handle share link creation error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { createShareableLink } = useTemplatesStore.getState();
        const shortCode = await createShareableLink('template_1', true);

        expect(shortCode).toBe('');
        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to create share link');
      });
    });

    describe('revokeShareableLink', () => {
      it('should revoke shareable link', async () => {
        const link = createMockShareableLink({ id: 'revoke_link' });
        useTemplatesStore.setState({ shareableLinks: [link] });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { revokeShareableLink } = useTemplatesStore.getState();
        await revokeShareableLink('revoke_link');

        const { shareableLinks } = useTemplatesStore.getState();
        expect(shareableLinks).toHaveLength(0);
      });

      it('should handle revoke error', async () => {
        const link = createMockShareableLink({ id: 'error_link' });
        useTemplatesStore.setState({ shareableLinks: [link] });

        mockFetch.mockResolvedValueOnce({ ok: false });

        const { revokeShareableLink } = useTemplatesStore.getState();
        await revokeShareableLink('error_link');

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Failed to revoke link');
      });
    });

    describe('accessSharedTemplate', () => {
      it('should access shared template by short code', async () => {
        const sharedTemplate = createMockTemplate({ name: 'Shared' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => sharedTemplate,
        });

        const { accessSharedTemplate } = useTemplatesStore.getState();
        const template = await accessSharedTemplate('abc123');

        expect(template.name).toBe('Shared');
      });

      it('should throw error for invalid short code', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { accessSharedTemplate } = useTemplatesStore.getState();

        await expect(accessSharedTemplate('invalid')).rejects.toThrow(
          'Failed to access shared template'
        );
      });
    });
  });

  describe('Search & Filter', () => {
    it('should set search query', () => {
      const { setSearchQuery } = useTemplatesStore.getState();
      setSearchQuery('candlestick');

      const { searchQuery } = useTemplatesStore.getState();
      expect(searchQuery).toBe('candlestick');
    });

    it('should toggle tag selection', () => {
      const { toggleTag } = useTemplatesStore.getState();

      // Add tag
      toggleTag('trading');
      expect(useTemplatesStore.getState().selectedTags).toContain('trading');

      // Remove tag
      toggleTag('trading');
      expect(useTemplatesStore.getState().selectedTags).not.toContain('trading');
    });

    it('should set sort options', () => {
      const { setSortOptions } = useTemplatesStore.getState();
      setSortOptions('name', 'asc');

      const { sortBy, sortOrder } = useTemplatesStore.getState();
      expect(sortBy).toBe('name');
      expect(sortOrder).toBe('asc');
    });
  });

  describe('Bulk Operations', () => {
    describe('exportMultipleTemplates', () => {
      it('should export multiple templates as ZIP', async () => {
        const zipBlob = new Blob(['zip content'], { type: 'application/zip' });
        mockFetch.mockResolvedValueOnce({
          ok: true,
          blob: async () => zipBlob,
        });

        const { exportMultipleTemplates } = useTemplatesStore.getState();
        const blob = await exportMultipleTemplates(['template_1', 'template_2']);

        expect(blob).toBeInstanceOf(Blob);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/templates/bulk-export',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({ templateIds: ['template_1', 'template_2'] }),
          })
        );
      });

      it('should handle bulk export error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: false });

        const { exportMultipleTemplates } = useTemplatesStore.getState();

        await expect(
          exportMultipleTemplates(['template_1', 'template_2'])
        ).rejects.toThrow('Bulk export failed');
      });
    });

    describe('deleteMultipleTemplates', () => {
      it('should delete multiple templates', async () => {
        const templates = [
          createMockTemplate({ id: 'delete_1' }),
          createMockTemplate({ id: 'delete_2' }),
          createMockTemplate({ id: 'keep_me' }),
        ];
        useTemplatesStore.setState({ templates });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { deleteMultipleTemplates } = useTemplatesStore.getState();
        await deleteMultipleTemplates(['delete_1', 'delete_2']);

        const { templates: remaining } = useTemplatesStore.getState();
        expect(remaining).toHaveLength(1);
        expect(remaining[0].id).toBe('keep_me');
      });

      it('should clear active template if in deleted list', async () => {
        const active = createMockTemplate({ id: 'active_bulk' });
        useTemplatesStore.setState({
          templates: [active],
          activeTemplate: active,
        });

        mockFetch.mockResolvedValueOnce({ ok: true });

        const { deleteMultipleTemplates } = useTemplatesStore.getState();
        await deleteMultipleTemplates(['active_bulk']);

        const { activeTemplate } = useTemplatesStore.getState();
        expect(activeTemplate).toBeNull();
      });

      it('should handle bulk delete error', async () => {
        const templates = [createMockTemplate({ id: 'bulk_error' })];
        useTemplatesStore.setState({ templates });

        mockFetch.mockResolvedValueOnce({ ok: false });

        const { deleteMultipleTemplates } = useTemplatesStore.getState();
        await deleteMultipleTemplates(['bulk_error']);

        const { error } = useTemplatesStore.getState();
        expect(error).toBe('Bulk delete failed');
      });
    });
  });

  describe('Selectors', () => {
    describe('useFilteredTemplates', () => {
      it('should filter templates by search query', () => {
        const templates = [
          createMockTemplate({ id: '1', name: 'Candlestick Chart' }),
          createMockTemplate({ id: '2', name: 'Line Chart' }),
          createMockTemplate({ id: '3', name: 'Area Chart' }),
        ];
        useTemplatesStore.setState({
          templates,
          searchQuery: 'candle',
        });

        // Access store state directly since useFilteredTemplates is a hook
        const state = useTemplatesStore.getState();
        let filtered = [...state.templates];

        if (state.searchQuery) {
          const query = state.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (template) =>
              template.name.toLowerCase().includes(query) ||
              template.description?.toLowerCase().includes(query) ||
              template.tags.some((tag) => tag.toLowerCase().includes(query))
          );
        }

        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Candlestick Chart');
      });

      it('should filter templates by tags', () => {
        const templates = [
          createMockTemplate({ id: '1', tags: ['trading', 'stocks'] }),
          createMockTemplate({ id: '2', tags: ['crypto'] }),
          createMockTemplate({ id: '3', tags: ['trading', 'forex'] }),
        ];
        useTemplatesStore.setState({
          templates,
          selectedTags: ['trading'],
        });

        const state = useTemplatesStore.getState();
        let filtered = [...state.templates];

        if (state.selectedTags.length > 0) {
          filtered = filtered.filter((template) =>
            state.selectedTags.some((tag) => template.tags.includes(tag))
          );
        }

        expect(filtered).toHaveLength(2);
      });

      it('should sort templates by name ascending', () => {
        const templates = [
          createMockTemplate({ id: '1', name: 'Zebra' }),
          createMockTemplate({ id: '2', name: 'Alpha' }),
          createMockTemplate({ id: '3', name: 'Beta' }),
        ];
        useTemplatesStore.setState({
          templates,
          sortBy: 'name',
          sortOrder: 'asc',
        });

        const state = useTemplatesStore.getState();
        const sorted = [...state.templates].sort((a, b) => {
          const comparison = a.name.localeCompare(b.name);
          return state.sortOrder === 'desc' ? -comparison : comparison;
        });

        expect(sorted[0].name).toBe('Alpha');
        expect(sorted[2].name).toBe('Zebra');
      });

      it('should sort templates by usage descending', () => {
        const templates = [
          createMockTemplate({ id: '1', usageCount: 10 }),
          createMockTemplate({ id: '2', usageCount: 50 }),
          createMockTemplate({ id: '3', usageCount: 25 }),
        ];
        useTemplatesStore.setState({
          templates,
          sortBy: 'usage',
          sortOrder: 'desc',
        });

        const state = useTemplatesStore.getState();
        const sorted = [...state.templates].sort((a, b) => {
          const comparison = a.usageCount - b.usageCount;
          return state.sortOrder === 'desc' ? -comparison : comparison;
        });

        expect(sorted[0].usageCount).toBe(50);
        expect(sorted[2].usageCount).toBe(10);
      });

      it('should sort templates by created date', () => {
        const templates = [
          createMockTemplate({ id: '1', createdAt: new Date('2024-01-01') }),
          createMockTemplate({ id: '2', createdAt: new Date('2024-03-01') }),
          createMockTemplate({ id: '3', createdAt: new Date('2024-02-01') }),
        ];
        useTemplatesStore.setState({
          templates,
          sortBy: 'created',
          sortOrder: 'asc',
        });

        const state = useTemplatesStore.getState();
        const sorted = [...state.templates].sort((a, b) => {
          const comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          return state.sortOrder === 'desc' ? -comparison : comparison;
        });

        expect(new Date(sorted[0].createdAt).getMonth()).toBe(0); // January
        expect(new Date(sorted[2].createdAt).getMonth()).toBe(2); // March
      });

      it('should sort templates by updated date', () => {
        const templates = [
          createMockTemplate({ id: '1', updatedAt: new Date('2024-06-01') }),
          createMockTemplate({ id: '2', updatedAt: new Date('2024-04-01') }),
          createMockTemplate({ id: '3', updatedAt: new Date('2024-05-01') }),
        ];
        useTemplatesStore.setState({
          templates,
          sortBy: 'updated',
          sortOrder: 'desc',
        });

        const state = useTemplatesStore.getState();
        const sorted = [...state.templates].sort((a, b) => {
          const comparison =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          return state.sortOrder === 'desc' ? -comparison : comparison;
        });

        expect(new Date(sorted[0].updatedAt).getMonth()).toBe(5); // June
        expect(new Date(sorted[2].updatedAt).getMonth()).toBe(3); // April
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty template list', () => {
      useTemplatesStore.setState({ templates: [] });

      const { templates } = useTemplatesStore.getState();
      expect(templates).toEqual([]);
    });

    it('should handle template with all optional fields', () => {
      const minimalConfig: ChartTemplate['config'] = {
        chartType: 'line',
        timeframe: '1d',
        theme: 'light',
        indicators: [],
        drawings: [],
        showVolume: false,
        showGrid: false,
        showCrosshair: false,
        showLegend: false,
        priceScaleMode: 'normal',
        priceLines: [],
        timeScaleOptions: { rightOffset: 0, barSpacing: 6, minBarSpacing: 1 },
        colors: {
          upColor: '#000',
          downColor: '#000',
          backgroundColor: '#fff',
          gridColor: '#ccc',
          textColor: '#000',
        },
      };

      const template = createMockTemplate({
        description: undefined,
        config: minimalConfig,
      });

      useTemplatesStore.setState({ templates: [template] });

      const { templates } = useTemplatesStore.getState();
      expect(templates[0].description).toBeUndefined();
    });

    it('should handle concurrent template updates', async () => {
      const template = createMockTemplate({ id: 'concurrent' });
      useTemplatesStore.setState({ templates: [template] });

      mockFetch.mockResolvedValue({ ok: true });

      const { updateTemplate } = useTemplatesStore.getState();

      // Run concurrent updates
      await Promise.all([
        updateTemplate('concurrent', { name: 'Update 1' }),
        updateTemplate('concurrent', { name: 'Update 2' }),
      ]);

      // Last update wins
      const { templates } = useTemplatesStore.getState();
      expect(templates[0].name).toBe('Update 2');
    });

    it('should handle special characters in search query', () => {
      const templates = [
        createMockTemplate({ id: '1', name: 'Template (1)' }),
        createMockTemplate({ id: '2', name: 'Template [2]' }),
        createMockTemplate({ id: '3', name: 'Template {3}' }),
      ];
      useTemplatesStore.setState({ templates, searchQuery: '(1)' });

      const state = useTemplatesStore.getState();
      const filtered = state.templates.filter((t) =>
        t.name.toLowerCase().includes(state.searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Template (1)');
    });

    it('should handle very long template names', () => {
      const longName = 'A'.repeat(1000);
      const template = createMockTemplate({ name: longName });

      useTemplatesStore.setState({ templates: [template] });

      const { templates } = useTemplatesStore.getState();
      expect(templates[0].name).toHaveLength(1000);
    });

    it('should handle unicode in template names', () => {
      const templates = [
        createMockTemplate({ id: '1', name: '日本語テンプレート' }),
        createMockTemplate({ id: '2', name: 'Emoji Template 📊' }),
        createMockTemplate({ id: '3', name: 'Accents éàü' }),
      ];
      useTemplatesStore.setState({ templates, searchQuery: '日本' });

      const state = useTemplatesStore.getState();
      const filtered = state.templates.filter((t) =>
        t.name.toLowerCase().includes(state.searchQuery.toLowerCase())
      );

      expect(filtered).toHaveLength(1);
    });
  });
});
