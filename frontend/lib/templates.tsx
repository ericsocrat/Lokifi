import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { FLAGS } from './featureFlags';

// Template Types
export interface ChartTemplate {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  
  // Chart Configuration
  config: {
    // Layout
    chartType: 'candlestick' | 'line' | 'area' | 'bars' | 'heiken-ashi';
    timeframe: string;
    theme: 'light' | 'dark' | 'auto';
    
    // Indicators
    indicators: IndicatorConfig[];
    
    // Drawing Tools
    drawings: DrawingConfig[];
    
    // Display Settings
    showVolume: boolean;
    showGrid: boolean;
    showCrosshair: boolean;
    showLegend: boolean;
    
    // Price Scale
    priceScaleMode: 'normal' | 'logarithmic' | 'percentage';
    priceLines: PriceLine[];
    
    // Time Scale
    timeScaleOptions: {
      rightOffset: number;
      barSpacing: number;
      minBarSpacing: number;
    };
    
    // Colors & Styling
    colors: {
      upColor: string;
      downColor: string;
      backgroundColor: string;
      gridColor: string;
      textColor: string;
    };
  };
}

export interface IndicatorConfig {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  style: {
    color: string;
    lineWidth: number;
    lineStyle: 'solid' | 'dashed' | 'dotted';
  };
  pane: number; // 0 = main chart, 1+ = separate panes
}

export interface DrawingConfig {
  id: string;
  type: string;
  points: { time: number; price: number }[];
  style: {
    color: string;
    lineWidth: number;
    fillColor?: string;
    textColor?: string;
  };
  properties: Record<string, any>;
}

export interface PriceLine {
  price: number;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  axisLabelVisible: boolean;
  title?: string;
}

// Export Types
export interface ExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  width: number;
  height: number;
  quality: number; // 0.1 - 1.0 for JPEG
  includeWatermark: boolean;
  backgroundColor: string;
  
  // PDF specific options
  orientation?: 'portrait' | 'landscape';
  pageSize?: 'A4' | 'A3' | 'Letter' | 'Legal';
}

export interface ShareableLink {
  id: string;
  templateId: string;
  symbol?: string;
  createdAt: Date;
  expiresAt?: Date;
  viewCount: number;
  isPublic: boolean;
  shortCode: string;
}

// Store State
interface TemplatesState {
  // Templates
  templates: ChartTemplate[];
  templatesByUser: Map<string, ChartTemplate[]>;
  publicTemplates: ChartTemplate[];
  featuredTemplates: ChartTemplate[];
  
  // Current template being edited/applied
  activeTemplate: ChartTemplate | null;
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  
  // Export
  exportOptions: ExportOptions;
  exportHistory: ExportRecord[];
  
  // Sharing
  shareableLinks: ShareableLink[];
  
  // Search & Filter
  searchQuery: string;
  selectedTags: string[];
  sortBy: 'name' | 'created' | 'updated' | 'usage';
  sortOrder: 'asc' | 'desc';
  
  // Loading States
  isLoading: boolean;
  isExporting: boolean;
  error: string | null;
}

interface ExportRecord {
  id: string;
  templateId: string;
  format: string;
  timestamp: Date;
  filename: string;
  fileSize: number;
}

// Store Actions
interface TemplatesActions {
  // Template Management
  createTemplate: (name: string, config: ChartTemplate['config']) => Promise<string>;
  updateTemplate: (id: string, updates: Partial<ChartTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string, newName: string) => Promise<string>;
  
  // Template Application
  applyTemplate: (templateId: string, symbol?: string) => void;
  setActiveTemplate: (template: ChartTemplate | null) => void;
  markUnsavedChanges: (hasChanges: boolean) => void;
  
  // Loading & Syncing
  loadUserTemplates: () => Promise<void>;
  loadPublicTemplates: () => Promise<void>;
  loadFeaturedTemplates: () => Promise<void>;
  syncTemplate: (id: string) => Promise<void>;
  
  // Import/Export
  importTemplate: (templateData: any) => Promise<string>;
  exportTemplate: (id: string) => ChartTemplate;
  exportAsImage: (templateId: string, symbol: string, options?: Partial<ExportOptions>) => Promise<Blob>;
  exportAsPDF: (templateId: string, symbol: string, options?: Partial<ExportOptions>) => Promise<Blob>;
  
  // Sharing
  createShareableLink: (templateId: string, isPublic: boolean, expiresIn?: number) => Promise<string>;
  revokeShareableLink: (linkId: string) => Promise<void>;
  accessSharedTemplate: (shortCode: string) => Promise<ChartTemplate>;
  
  // Search & Filter
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  setSortOptions: (sortBy: TemplatesState['sortBy'], sortOrder: TemplatesState['sortOrder']) => void;
  
  // Bulk Operations
  exportMultipleTemplates: (templateIds: string[]) => Promise<Blob>; // ZIP file
  deleteMultipleTemplates: (templateIds: string[]) => Promise<void>;
}

const defaultExportOptions: ExportOptions = {
  format: 'png',
  width: 1920,
  height: 1080,
  quality: 1.0,
  includeWatermark: false,
  backgroundColor: '#ffffff',
  orientation: 'landscape',
  pageSize: 'A4'
};

// Create Store
export const useTemplatesStore = create<TemplatesState & TemplatesActions>()(
  persist(
    immer<any>((set, get, store) => ({
      // Initial State
      templates: [],
      templatesByUser: new Map(),
      publicTemplates: [],
      featuredTemplates: [],
      activeTemplate: null,
      isEditing: false,
      hasUnsavedChanges: false,
      exportOptions: defaultExportOptions,
      exportHistory: [],
      shareableLinks: [],
      searchQuery: '',
      selectedTags: [],
      sortBy: 'updated',
      sortOrder: 'desc',
      isLoading: false,
      isExporting: false,
      error: null,
      
      // Template Management
      createTemplate: async (name: string, config: ChartTemplate['config']) => {
        if (!FLAGS.templates) return '';
        
        const id = `template_${Date.now()}`;
        const now = new Date();
        
        const template: ChartTemplate = {
          id,
          name,
          createdAt: now,
          updatedAt: now,
          createdBy: 'current_user', // TODO: Get from auth context
          tags: [],
          isPublic: false,
          usageCount: 0,
          config
        };
        
        set((state: any) => {
          state.templates.push(template);
          state.activeTemplate = template;
        });
        
        try {
          const response = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(template)
          });
          
          if (!response.ok) throw new Error('Failed to save template');
          
          const savedTemplate = await response.json();
          
          set((state: any) => {
            const index = state.templates.findIndex(t => t.id === id);
            if (index !== -1) {
              state.templates[index] = savedTemplate;
              state.activeTemplate = savedTemplate;
            }
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to create template';
          });
        }
        
        return id;
      },
      
      updateTemplate: async (id: string, updates: Partial<ChartTemplate>) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          const template = state.templates.find((t: any) => t.id === id);
          if (template) {
            Object.assign(template, updates);
            template.updatedAt = new Date();
            
            if (state.activeTemplate?.id === id) {
              state.activeTemplate = template;
            }
          }
        });
        
        try {
          const response = await fetch(`/api/templates/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          });
          
          if (!response.ok) throw new Error('Failed to update template');
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to update template';
          });
        }
      },
      
      deleteTemplate: async (id: string) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          const index = state.templates.findIndex(t => t.id === id);
          if (index !== -1) {
            state.templates.splice(index, 1);
          }
          
          if (state.activeTemplate?.id === id) {
            state.activeTemplate = null;
          }
        });
        
        try {
          const response = await fetch(`/api/templates/${id}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) throw new Error('Failed to delete template');
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to delete template';
          });
        }
      },
      
      duplicateTemplate: async (id: string, newName: string) => {
        if (!FLAGS.templates) return '';
        
        const { templates, createTemplate } = get();
        const template = templates.find((t: any) => t.id === id);
        
        if (!template) return '';
        
        return await createTemplate(newName, { ...template.config });
      },
      
      // Template Application
      applyTemplate: (templateId: string, symbol?: string) => {
        if (!FLAGS.templates) return;
        
        const { templates } = get();
        const template = templates.find((t: any) => t.id === templateId);
        
        if (!template) return;
        
        set((state: any) => {
          state.activeTemplate = template;
          
          // Increment usage count
          template.usageCount++;
        });
        
        // Emit template application event
        window.dispatchEvent(new CustomEvent('templateApplied', {
          detail: { template, symbol }
        }));
      },
      
      setActiveTemplate: (template: ChartTemplate | null) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          state.activeTemplate = template;
        });
      },
      
      markUnsavedChanges: (hasChanges: boolean) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          state.hasUnsavedChanges = hasChanges;
        });
      },
      
      // Loading & Syncing
      loadUserTemplates: async () => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          state.isLoading = true;
          state.error = null;
        });
        
        try {
          const response = await fetch('/api/templates/user');
          if (!response.ok) throw new Error('Failed to load templates');
          
          const templates: ChartTemplate[] = await response.json();
          
          set((state: any) => {
            state.templates = templates;
            state.isLoading = false;
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to load templates';
            state.isLoading = false;
          });
        }
      },
      
      loadPublicTemplates: async () => {
        if (!FLAGS.templates) return;
        
        try {
          const response = await fetch('/api/templates/public');
          if (!response.ok) throw new Error('Failed to load public templates');
          
          const templates: ChartTemplate[] = await response.json();
          
          set((state: any) => {
            state.publicTemplates = templates;
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to load public templates';
          });
        }
      },
      
      loadFeaturedTemplates: async () => {
        if (!FLAGS.templates) return;
        
        try {
          const response = await fetch('/api/templates/featured');
          if (!response.ok) throw new Error('Failed to load featured templates');
          
          const templates: ChartTemplate[] = await response.json();
          
          set((state: any) => {
            state.featuredTemplates = templates;
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to load featured templates';
          });
        }
      },
      
      syncTemplate: async (id: string) => {
        if (!FLAGS.templates) return;
        
        try {
          const response = await fetch(`/api/templates/${id}`);
          if (!response.ok) throw new Error('Failed to sync template');
          
          const template: ChartTemplate = await response.json();
          
          set((state: any) => {
            const index = state.templates.findIndex(t => t.id === id);
            if (index !== -1) {
              state.templates[index] = template;
            } else {
              state.templates.push(template);
            }
            
            if (state.activeTemplate?.id === id) {
              state.activeTemplate = template;
            }
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to sync template';
          });
        }
      },
      
      // Import/Export
      importTemplate: async (templateData: any) => {
        if (!FLAGS.templates) return '';
        
        try {
          // Validate template data structure
          if (!templateData.config) {
            throw new Error('Invalid template data');
          }
          
          const { createTemplate } = get();
          return await createTemplate(
            templateData.name || 'Imported Template',
            templateData.config
          );
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to import template';
          });
          return '';
        }
      },
      
      exportTemplate: (id: string) => {
        const { templates } = get();
        const template = templates.find((t: any) => t.id === id);
        
        if (!template) {
          throw new Error('Template not found');
        }
        
        // Create a clean copy for export (remove sensitive data)
        const exportTemplate = {
          ...template,
          id: `exported_${Date.now()}`,
          createdBy: 'exported',
          usageCount: 0
        };
        
        return exportTemplate;
      },
      
      exportAsImage: async (templateId: string, symbol: string, options?: Partial<ExportOptions>) => {
        if (!FLAGS.imgExport) throw new Error('Image export not enabled');
        
        set((state: any) => {
          state.isExporting = true;
          state.error = null;
        });
        
        const exportOpts = { ...defaultExportOptions, ...options };
        
        try {
          const response = await fetch('/api/export/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId,
              symbol,
              options: exportOpts
            })
          });
          
          if (!response.ok) throw new Error('Export failed');
          
          const blob = await response.blob();
          
          // Record export history
          set((state: any) => {
            state.exportHistory.push({
              id: `export_${Date.now()}`,
              templateId,
              format: exportOpts.format,
              timestamp: new Date(),
              filename: `${symbol}_chart.${exportOpts.format}`,
              fileSize: blob.size
            });
            state.isExporting = false;
          });
          
          return blob;
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Export failed';
            state.isExporting = false;
          });
          throw error;
        }
      },
      
      exportAsPDF: async (templateId: string, symbol: string, options?: Partial<ExportOptions>) => {
        if (!FLAGS.imgExport) throw new Error('PDF export not enabled');
        
        const exportOpts = { ...defaultExportOptions, ...options, format: 'pdf' as const };
        return get().exportAsImage(templateId, symbol, exportOpts);
      },
      
      // Sharing
      createShareableLink: async (templateId: string, isPublic: boolean, expiresIn?: number) => {
        if (!FLAGS.templates) return '';
        
        try {
          const response = await fetch('/api/templates/share', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateId,
              isPublic,
              expiresIn
            })
          });
          
          if (!response.ok) throw new Error('Failed to create share link');
          
          const link: ShareableLink = await response.json();
          
          set((state: any) => {
            state.shareableLinks.push(link);
          });
          
          return link.shortCode;
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to create share link';
          });
          return '';
        }
      },
      
      revokeShareableLink: async (linkId: string) => {
        if (!FLAGS.templates) return;
        
        try {
          const response = await fetch(`/api/templates/share/${linkId}`, {
            method: 'DELETE'
          });
          
          if (!response.ok) throw new Error('Failed to revoke link');
          
          set((state: any) => {
            const index = state.shareableLinks.findIndex(link => link.id === linkId);
            if (index !== -1) {
              state.shareableLinks.splice(index, 1);
            }
          });
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to revoke link';
          });
        }
      },
      
      accessSharedTemplate: async (shortCode: string) => {
        if (!FLAGS.templates) throw new Error('Templates not enabled');
        
        const response = await fetch(`/api/templates/shared/${shortCode}`);
        if (!response.ok) throw new Error('Failed to access shared template');
        
        return await response.json();
      },
      
      // Search & Filter
      setSearchQuery: (query: string) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          state.searchQuery = query;
        });
      },
      
      toggleTag: (tag: string) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          const index = state.selectedTags.indexOf(tag);
          if (index !== -1) {
            state.selectedTags.splice(index, 1);
          } else {
            state.selectedTags.push(tag);
          }
        });
      },
      
      setSortOptions: (sortBy: TemplatesState['sortBy'], sortOrder: TemplatesState['sortOrder']) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          state.sortBy = sortBy;
          state.sortOrder = sortOrder;
        });
      },
      
      // Bulk Operations
      exportMultipleTemplates: async (templateIds: string[]) => {
        if (!FLAGS.templates) throw new Error('Templates not enabled');
        
        const response = await fetch('/api/templates/bulk-export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateIds })
        });
        
        if (!response.ok) throw new Error('Bulk export failed');
        
        return await response.blob();
      },
      
      deleteMultipleTemplates: async (templateIds: string[]) => {
        if (!FLAGS.templates) return;
        
        set((state: any) => {
          state.templates = state.templates.filter((t: any) => !templateIds.includes(t.id));
          
          if (state.activeTemplate && templateIds.includes(state.activeTemplate.id)) {
            state.activeTemplate = null;
          }
        });
        
        try {
          const response = await fetch('/api/templates/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templateIds })
          });
          
          if (!response.ok) throw new Error('Bulk delete failed');
          
        } catch (error) {
          set((state: any) => {
            state.error = error instanceof Error ? error.message : 'Failed to delete templates';
          });
        }
      }
    })),
    {
      name: 'lokifi-templates-storage',
      version: 1,
      migrate: (persistedState: any, version: number) => {
        if (version === 0) {
          return {
            ...persistedState,
            exportHistory: [],
            shareableLinks: []
          };
        }
        return persistedState as TemplatesState & TemplatesActions;
      }
    }
  )
);

// Selectors
export const useFilteredTemplates = () => 
  useTemplatesStore((state: any) => {
    let filtered = [...state.templates];
    
    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter((template: any) =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Apply tag filter
    if (state.selectedTags.length > 0) {
      filtered = filtered.filter((template: any) =>
        state.selectedTags.some(tag => template.tags.includes(tag))
      );
    }
    
    // Apply sorting
    filtered.sort((a: any, b: any) => {
      let comparison = 0;
      
      switch (state.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'updated':
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case 'usage':
          comparison = a.usageCount - b.usageCount;
          break;
      }
      
      return state.sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return filtered;
  });

export const useTemplateById = (id: string) =>
  useTemplatesStore((state: any) => state.templates.find((t: any) => t.id === id));

export const useActiveTemplate = () =>
  useTemplatesStore((state: any) => state.activeTemplate);

// Initialize store
if (typeof window !== 'undefined' && FLAGS.templates) {
  const store = useTemplatesStore.getState();
  store.loadUserTemplates();
  store.loadFeaturedTemplates();
}

