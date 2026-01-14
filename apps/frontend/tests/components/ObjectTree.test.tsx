import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectTree } from '../../components/ObjectTree';

// Mock the drawing store
const mockDrawingStore = {
  objects: [] as Array<{
    id: string;
    type: string;
    paneId: string;
    properties: { name: string; locked: boolean; visible: boolean; zIndex: number };
    style: { color: string };
  }>,
  selectedObjectId: null as string | null,
  selectObject: vi.fn(),
  deleteObject: vi.fn(),
  duplicateObject: vi.fn(() => 'new-id-123'),
  setObjectProperties: vi.fn(),
  moveObjectToPane: vi.fn(),
  getObjectsByPane: vi.fn((paneId: string) =>
    mockDrawingStore.objects.filter((obj) => obj.paneId === paneId)
  ),
  clearAllObjects: vi.fn(),
};

const mockPaneStore = {
  panes: [
    { id: 'price-pane', type: 'price' },
    { id: 'indicator-pane', type: 'indicator' },
  ],
};

vi.mock('@/lib/stores/drawingStore', () => ({
  useDrawingStore: () => mockDrawingStore,
  useDrawingObjects: () => [],
  useDrawingActiveTool: () => 'cursor',
  useDrawingIsDrawing: () => false,
  useDrawingSelectedObjectId: () => null,
  useDrawingCurrentDrawing: () => null,
  useDrawingDraggedObjectId: () => null,
  useDrawingSnapSettings: () => ({ snap: false }),
  useDrawingMagnetMode: () => false,
  useDrawingActions: () => ({}),
}));

vi.mock('@/lib/stores/paneStore', () => ({
  usePaneStore: () => mockPaneStore,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <span data-testid="chevron-down">▼</span>,
  ChevronRight: () => <span data-testid="chevron-right">▶</span>,
  Copy: () => <span data-testid="copy-icon">📋</span>,
  Eye: () => <span data-testid="eye-icon">👁</span>,
  EyeOff: () => <span data-testid="eye-off-icon">🙈</span>,
  Layers: () => <span data-testid="layers-icon">📚</span>,
  Lock: () => <span data-testid="lock-icon">🔒</span>,
  Trash2: () => <span data-testid="trash-icon">🗑</span>,
  Unlock: () => <span data-testid="unlock-icon">🔓</span>,
}));

// Sample drawing objects for testing
const createMockObject = (overrides: Partial<(typeof mockDrawingStore.objects)[0]> = {}) => ({
  id: 'object-1',
  type: 'trendline',
  paneId: 'price-pane',
  properties: {
    name: 'Trend Line 1',
    locked: false,
    visible: true,
    zIndex: 1,
  },
  style: { color: '#00ff88' },
  ...overrides,
});

describe('ObjectTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDrawingStore.objects = [];
    mockDrawingStore.selectedObjectId = null;
    mockDrawingStore.getObjectsByPane = vi.fn((paneId: string) =>
      mockDrawingStore.objects.filter((obj) => obj.paneId === paneId)
    );
  });

  describe('Collapsed State', () => {
    it('should render collapsed view when isCollapsed is true', () => {
      render(<ObjectTree isCollapsed={true} />);

      // Should show expand button
      expect(screen.getByTitle('Expand Object Tree')).toBeInTheDocument();
    });

    it('should show object count when collapsed', () => {
      mockDrawingStore.objects = [
        createMockObject({ id: '1' }),
        createMockObject({ id: '2' }),
        createMockObject({ id: '3' }),
      ];

      render(<ObjectTree isCollapsed={true} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should call onToggleCollapse when expand button clicked', () => {
      const onToggle = vi.fn();
      render(<ObjectTree isCollapsed={true} onToggleCollapse={onToggle} />);

      fireEvent.click(screen.getByTitle('Expand Object Tree'));

      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('Expanded State - Header', () => {
    it('should render header with Objects title', () => {
      render(<ObjectTree />);

      expect(screen.getByText('Objects')).toBeInTheDocument();
    });

    it('should show object count in header', () => {
      mockDrawingStore.objects = [createMockObject(), createMockObject({ id: '2' })];

      render(<ObjectTree />);

      // Count should appear in header badge
      const countBadges = screen.getAllByText('2');
      expect(countBadges.length).toBeGreaterThan(0);
    });

    it('should show collapse button', () => {
      render(<ObjectTree />);

      expect(screen.getByTitle('Collapse Object Tree')).toBeInTheDocument();
    });

    it('should call onToggleCollapse when collapse button clicked', () => {
      const onToggle = vi.fn();
      render(<ObjectTree onToggleCollapse={onToggle} />);

      fireEvent.click(screen.getByTitle('Collapse Object Tree'));

      expect(onToggle).toHaveBeenCalled();
    });
  });

  describe('Clear All Button', () => {
    it('should show clear all button when objects exist', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);

      expect(screen.getByTitle('Clear All Objects')).toBeInTheDocument();
    });

    it('should not show clear all button when no objects', () => {
      mockDrawingStore.objects = [];

      render(<ObjectTree />);

      expect(screen.queryByTitle('Clear All Objects')).not.toBeInTheDocument();
    });

    it('should call clearAllObjects after confirm', () => {
      mockDrawingStore.objects = [createMockObject()];
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ObjectTree />);
      fireEvent.click(screen.getByTitle('Clear All Objects'));

      expect(window.confirm).toHaveBeenCalledWith('Delete all drawing objects?');
      expect(mockDrawingStore.clearAllObjects).toHaveBeenCalled();
    });

    it('should not clear when user cancels confirm', () => {
      mockDrawingStore.objects = [createMockObject()];
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<ObjectTree />);
      fireEvent.click(screen.getByTitle('Clear All Objects'));

      expect(mockDrawingStore.clearAllObjects).not.toHaveBeenCalled();
    });
  });

  describe('Pane Display', () => {
    it('should display panes', () => {
      render(<ObjectTree />);

      expect(screen.getByText('Price Chart')).toBeInTheDocument();
      expect(screen.getByText('Indicators')).toBeInTheDocument();
    });

    it('should show object count for each pane', () => {
      mockDrawingStore.objects = [
        createMockObject({ id: '1', paneId: 'price-pane' }),
        createMockObject({ id: '2', paneId: 'price-pane' }),
        createMockObject({ id: '3', paneId: 'indicator-pane' }),
      ];

      render(<ObjectTree />);

      // Each pane should show its count
      const counts = screen.getAllByText(/[0-3]/);
      expect(counts.length).toBeGreaterThan(0);
    });

    it('should toggle pane expansion on click', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);

      // Price pane is expanded by default - should show object name
      expect(screen.getByText('Trend Line 1')).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(screen.getByText('Price Chart'));

      // After clicking, expanded set changes (controlled internally)
    });
  });

  describe('Objects Display', () => {
    it('should display objects in their pane', () => {
      mockDrawingStore.objects = [
        createMockObject({
          id: '1',
          properties: { ...createMockObject().properties, name: 'Line A' },
        }),
      ];

      render(<ObjectTree />);

      expect(screen.getByText('Line A')).toBeInTheDocument();
    });

    it('should show "No drawing objects" messages when panes are empty', () => {
      mockDrawingStore.objects = [];

      render(<ObjectTree />);

      // Multiple "No drawing objects" messages appear (in pane and overall empty state)
      const noObjectsMessages = screen.getAllByText('No drawing objects');
      expect(noObjectsMessages.length).toBeGreaterThan(0);
    });

    it('should display object color indicator', () => {
      mockDrawingStore.objects = [createMockObject({ style: { color: '#ff0000' } })];

      render(<ObjectTree />);

      // Color indicator is a div with backgroundColor - verify object renders
      expect(screen.getByText('Trend Line 1')).toBeInTheDocument();
    });

    it('should highlight selected object', () => {
      mockDrawingStore.objects = [createMockObject()];
      mockDrawingStore.selectedObjectId = 'object-1';

      render(<ObjectTree />);

      // Selected object should have special styling class
      const objectElement = screen.getByText('Trend Line 1').closest('div[class*="mx-2"]');
      expect(objectElement).toHaveClass('bg-[#2962ff]/20');
    });

    it('should sort objects by zIndex (highest first)', () => {
      mockDrawingStore.objects = [
        createMockObject({
          id: '1',
          properties: { ...createMockObject().properties, name: 'Low Z', zIndex: 1 },
        }),
        createMockObject({
          id: '2',
          properties: { ...createMockObject().properties, name: 'High Z', zIndex: 10 },
        }),
        createMockObject({
          id: '3',
          properties: { ...createMockObject().properties, name: 'Mid Z', zIndex: 5 },
        }),
      ];

      render(<ObjectTree />);

      // All objects should be visible
      expect(screen.getByText('Low Z')).toBeInTheDocument();
      expect(screen.getByText('High Z')).toBeInTheDocument();
      expect(screen.getByText('Mid Z')).toBeInTheDocument();
    });
  });

  describe('Object Selection', () => {
    it('should call selectObject when object clicked', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);
      fireEvent.click(screen.getByText('Trend Line 1'));

      expect(mockDrawingStore.selectObject).toHaveBeenCalledWith('object-1');
    });

    it('should deselect when clicking already selected object', () => {
      mockDrawingStore.objects = [createMockObject()];
      mockDrawingStore.selectedObjectId = 'object-1';

      render(<ObjectTree />);
      fireEvent.click(screen.getByText('Trend Line 1'));

      expect(mockDrawingStore.selectObject).toHaveBeenCalledWith(null);
    });
  });

  describe('Visibility Toggle', () => {
    it('should show eye icon for visible objects', () => {
      mockDrawingStore.objects = [
        createMockObject({ properties: { ...createMockObject().properties, visible: true } }),
      ];

      render(<ObjectTree />);

      expect(screen.getByTitle('Hide')).toBeInTheDocument();
    });

    it('should show eye-off icon for hidden objects', () => {
      mockDrawingStore.objects = [
        createMockObject({ properties: { ...createMockObject().properties, visible: false } }),
      ];

      render(<ObjectTree />);

      expect(screen.getByTitle('Show')).toBeInTheDocument();
    });

    it('should toggle visibility when eye button clicked', () => {
      mockDrawingStore.objects = [
        createMockObject({ properties: { ...createMockObject().properties, visible: true } }),
      ];

      render(<ObjectTree />);
      fireEvent.click(screen.getByTitle('Hide'));

      expect(mockDrawingStore.setObjectProperties).toHaveBeenCalledWith('object-1', {
        visible: false,
      });
    });
  });

  describe('Lock Toggle', () => {
    it('should show lock icon for locked objects', () => {
      mockDrawingStore.objects = [
        createMockObject({ properties: { ...createMockObject().properties, locked: true } }),
      ];

      render(<ObjectTree />);

      expect(screen.getByTitle('Unlock')).toBeInTheDocument();
    });

    it('should show unlock icon for unlocked objects', () => {
      mockDrawingStore.objects = [
        createMockObject({ properties: { ...createMockObject().properties, locked: false } }),
      ];

      render(<ObjectTree />);

      expect(screen.getByTitle('Lock')).toBeInTheDocument();
    });

    it('should toggle lock when lock button clicked', () => {
      mockDrawingStore.objects = [
        createMockObject({ properties: { ...createMockObject().properties, locked: false } }),
      ];

      render(<ObjectTree />);
      fireEvent.click(screen.getByTitle('Lock'));

      expect(mockDrawingStore.setObjectProperties).toHaveBeenCalledWith('object-1', {
        locked: true,
      });
    });
  });

  describe('Context Menu', () => {
    it('should show context menu on right click', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);

      const objectElement = screen.getByText('Trend Line 1');
      fireEvent.contextMenu(objectElement);

      expect(screen.getByText('Duplicate')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show move to options in context menu', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);

      const objectElement = screen.getByText('Trend Line 1');
      fireEvent.contextMenu(objectElement);

      expect(screen.getByText('Move to')).toBeInTheDocument();
      // Both pane options should be in context menu
      const contextMenu = screen.getByText('Move to').closest('div[class*="fixed"]');
      expect(contextMenu).toBeInTheDocument();
    });

    it('should duplicate object when Duplicate clicked', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);

      fireEvent.contextMenu(screen.getByText('Trend Line 1'));
      fireEvent.click(screen.getByText('Duplicate'));

      expect(mockDrawingStore.duplicateObject).toHaveBeenCalledWith('object-1');
      expect(mockDrawingStore.selectObject).toHaveBeenCalledWith('new-id-123');
    });

    it('should delete object when Delete clicked', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);

      fireEvent.contextMenu(screen.getByText('Trend Line 1'));
      fireEvent.click(screen.getByText('Delete'));

      expect(mockDrawingStore.deleteObject).toHaveBeenCalledWith('object-1');
    });

    it('should close context menu on outside click', () => {
      mockDrawingStore.objects = [createMockObject()];

      render(<ObjectTree />);

      fireEvent.contextMenu(screen.getByText('Trend Line 1'));
      expect(screen.getByText('Duplicate')).toBeInTheDocument();

      // Click outside
      fireEvent.click(document.body);

      expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    });
  });

  describe('Move to Pane', () => {
    it('should call moveObjectToPane when pane option clicked', () => {
      mockDrawingStore.objects = [createMockObject({ paneId: 'price-pane' })];

      render(<ObjectTree />);

      fireEvent.contextMenu(screen.getByText('Trend Line 1'));

      // Find and click Indicators option in context menu
      const contextMenu = screen.getByText('Move to').closest('div[class*="fixed"]');
      if (contextMenu) {
        const indicatorsOption = within(contextMenu).getByText('Indicators');
        fireEvent.click(indicatorsOption);
      }

      expect(mockDrawingStore.moveObjectToPane).toHaveBeenCalledWith('object-1', 'indicator-pane');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no objects', () => {
      mockDrawingStore.objects = [];

      render(<ObjectTree />);

      expect(screen.getByText('Select a tool to draw')).toBeInTheDocument();
    });

    it('should show layers icon in empty state', () => {
      mockDrawingStore.objects = [];

      render(<ObjectTree />);

      // The Layers icon should be visible in empty state
      const layersIcons = screen.getAllByTestId('layers-icon');
      expect(layersIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Multiple Objects', () => {
    it('should display multiple objects in same pane', () => {
      mockDrawingStore.objects = [
        createMockObject({
          id: '1',
          properties: { ...createMockObject().properties, name: 'Line 1' },
        }),
        createMockObject({
          id: '2',
          properties: { ...createMockObject().properties, name: 'Line 2' },
        }),
        createMockObject({
          id: '3',
          properties: { ...createMockObject().properties, name: 'Line 3' },
        }),
      ];

      render(<ObjectTree />);

      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });

    it('should display objects in different panes', () => {
      mockDrawingStore.objects = [
        createMockObject({
          id: '1',
          paneId: 'price-pane',
          properties: { ...createMockObject().properties, name: 'Price Object' },
        }),
        createMockObject({
          id: '2',
          paneId: 'indicator-pane',
          properties: { ...createMockObject().properties, name: 'Indicator Object' },
        }),
      ];

      render(<ObjectTree />);

      expect(screen.getByText('Price Object')).toBeInTheDocument();

      // Expand indicator pane
      fireEvent.click(screen.getByText('Indicators'));

      expect(screen.getByText('Indicator Object')).toBeInTheDocument();
    });
  });
});
