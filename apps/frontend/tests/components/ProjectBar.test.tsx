import ProjectBar from '@/components/ProjectBar';
import * as persistence from '@/lib/data/persistence';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock persistence utilities
vi.mock('@/lib/data/persistence', () => ({
  listSlots: vi.fn(() => []),
  saveSlot: vi.fn(),
  loadSlot: vi.fn(),
  deleteSlot: vi.fn(),
  projectFromState: vi.fn((state, name) => ({
    name,
    drawings: state.drawings,
    theme: state.theme,
    timeframe: state.timeframe,
  })),
}));

// Mock exporters
vi.mock('@/lib/utils/exporters', () => ({
  exportPNG: vi.fn(),
  exportSVG: vi.fn(),
}));

// Mock chart store
const mockClearSelection = vi.fn();
const mockSetAll = vi.fn();

vi.mock('@/state/store', () => ({
  useChartStore: () => ({
    drawings: [],
    theme: 'dark',
    timeframe: '1D',
    clearSelection: mockClearSelection,
    setAll: mockSetAll,
  }),
}));

describe('ProjectBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock toast
    (window as any).__lokifi_toast = vi.fn();
  });

  afterEach(() => {
    delete (window as any).__lokifi_toast;
  });

  describe('Initial Render', () => {
    it('should render the ProjectBar component', () => {
      render(<ProjectBar />);
      expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    it('should render export buttons', () => {
      render(<ProjectBar />);
      expect(screen.getByText('Export PNG')).toBeInTheDocument();
      expect(screen.getByText('Export SVG')).toBeInTheDocument();
    });

    it('should render project name input with default value', () => {
      render(<ProjectBar />);
      const input = screen.getByPlaceholderText('Slot name');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('My project');
    });

    it('should render Save button', () => {
      render(<ProjectBar />);
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should show empty state when no projects exist', () => {
      render(<ProjectBar />);
      expect(screen.getByText('No saved projects yet.')).toBeInTheDocument();
    });
  });

  describe('Project Name Management', () => {
    it('should allow changing the project name', async () => {
      const user = userEvent.setup();
      render(<ProjectBar />);

      const input = screen.getByPlaceholderText('Slot name');
      await user.clear(input);
      await user.type(input, 'New Project Name');

      expect(input).toHaveValue('New Project Name');
    });

    it('should update input value on every keystroke', async () => {
      const user = userEvent.setup();
      render(<ProjectBar />);

      const input = screen.getByPlaceholderText('Slot name');
      await user.clear(input);
      await user.type(input, 'ABC');

      expect(input).toHaveValue('ABC');
    });
  });

  describe('Save Operations', () => {
    it('should save project when Save button is clicked', async () => {
      const { saveSlot, projectFromState } = await import('@/lib/data/persistence');
      const user = userEvent.setup();
      render(<ProjectBar />);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(projectFromState).toHaveBeenCalled();
      expect(saveSlot).toHaveBeenCalledWith('My project', expect.any(Object));
    });

    it('should use current project name when saving', async () => {
      const { saveSlot } = await import('@/lib/data/persistence');
      const user = userEvent.setup();
      render(<ProjectBar />);

      const input = screen.getByPlaceholderText('Slot name');
      await user.clear(input);
      await user.type(input, 'Custom Project');

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(saveSlot).toHaveBeenCalledWith('Custom Project', expect.any(Object));
    });

    it('should show toast notification after save', async () => {
      const user = userEvent.setup();
      render(<ProjectBar />);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect((window as any).__lokifi_toast).toHaveBeenCalledWith('Saved project');
    });

    it('should refresh slot list after save', async () => {
      const { listSlots } = await import('@/lib/data/persistence');
      const user = userEvent.setup();

      // Mock listSlots to return saved project
      (listSlots as any).mockReturnValue(['My project']);

      render(<ProjectBar />);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(listSlots).toHaveBeenCalled();
      });
    });
  });

  describe('Load Operations', () => {
    it('should display saved projects', () => {
      vi.mocked(persistence.listSlots).mockReturnValue(['Project 1', 'Project 2']);

      render(<ProjectBar />);

      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
    });

    it('should render Load button for each project', () => {
      vi.mocked(persistence.listSlots).mockReturnValue(['Project A']);

      render(<ProjectBar />);

      const loadButtons = screen.getAllByText('Load');
      expect(loadButtons.length).toBeGreaterThan(0);
    });

    it('should call loadSlot when Load button is clicked', async () => {
      const { listSlots, loadSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValue(['Test Project']);
      (loadSlot as any).mockReturnValue({
        name: 'Test Project',
        drawings: [],
        theme: 'dark',
        timeframe: '1D',
      });

      const user = userEvent.setup();
      render(<ProjectBar />);

      const loadButton = screen.getAllByText('Load')[0];
      await user.click(loadButton);

      expect(loadSlot).toHaveBeenCalledWith('Test Project');
    });

    it('should clear selection before loading project', async () => {
      const { listSlots, loadSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValue(['Project']);
      (loadSlot as any).mockReturnValue({
        drawings: [],
        theme: 'dark',
        timeframe: '1D',
      });

      const user = userEvent.setup();
      render(<ProjectBar />);

      const loadButton = screen.getAllByText('Load')[0];
      await user.click(loadButton);

      expect(mockClearSelection).toHaveBeenCalled();
    });

    it('should update store state when loading project', async () => {
      const { listSlots, loadSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValue(['Project']);
      (loadSlot as any).mockReturnValue({
        drawings: [{ type: 'line' }],
        theme: 'light',
        timeframe: '5M',
      });

      const user = userEvent.setup();
      render(<ProjectBar />);

      const loadButton = screen.getAllByText('Load')[0];
      await user.click(loadButton);

      expect(mockSetAll).toHaveBeenCalledWith({
        drawings: [{ type: 'line' }],
        theme: 'light',
        timeframe: '5M',
      });
    });

    it('should show toast notification after load', async () => {
      const { listSlots, loadSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValue(['Project']);
      (loadSlot as any).mockReturnValue({
        drawings: [],
        theme: 'dark',
        timeframe: '1D',
      });

      const user = userEvent.setup();
      render(<ProjectBar />);

      const loadButton = screen.getAllByText('Load')[0];
      await user.click(loadButton);

      expect((window as any).__lokifi_toast).toHaveBeenCalledWith('Loaded project');
    });

    it('should not update state if loadSlot returns null', async () => {
      const { listSlots, loadSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValue(['Invalid']);
      (loadSlot as any).mockReturnValue(null);

      const user = userEvent.setup();
      render(<ProjectBar />);

      const loadButton = screen.getAllByText('Load')[0];
      await user.click(loadButton);

      expect(mockSetAll).not.toHaveBeenCalled();
    });
  });

  describe('Delete Operations', () => {
    it('should render Delete button for each project', () => {
      vi.mocked(persistence.listSlots).mockReturnValue(['Project A', 'Project B']);

      render(<ProjectBar />);

      const deleteButtons = screen.getAllByText('Delete');
      expect(deleteButtons.length).toBe(2);
    });

    it('should call deleteSlot when Delete button is clicked', async () => {
      const { listSlots, deleteSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValue(['To Delete']);

      const user = userEvent.setup();
      render(<ProjectBar />);

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      expect(deleteSlot).toHaveBeenCalledWith('To Delete');
    });

    it('should refresh slot list after delete', async () => {
      const { listSlots, deleteSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValueOnce(['Project 1']);
      (listSlots as any).mockReturnValueOnce([]);

      const user = userEvent.setup();
      render(<ProjectBar />);

      const deleteButton = screen.getAllByText('Delete')[0];
      await user.click(deleteButton);

      expect(deleteSlot).toHaveBeenCalled();
      expect(listSlots).toHaveBeenCalledTimes(2); // Initial + after delete
    });
  });

  describe('Export Operations', () => {
    it('should call exportPNG when Export PNG button is clicked', async () => {
      const { exportPNG } = await import('@/lib/utils/exporters');
      const user = userEvent.setup();
      render(<ProjectBar />);

      const exportButton = screen.getByText('Export PNG');
      await user.click(exportButton);

      expect(exportPNG).toHaveBeenCalled();
    });

    it('should call exportSVG when Export SVG button is clicked', async () => {
      const { exportSVG } = await import('@/lib/utils/exporters');
      const user = userEvent.setup();
      render(<ProjectBar />);

      const exportButton = screen.getByText('Export SVG');
      await user.click(exportButton);

      expect(exportSVG).toHaveBeenCalled();
    });
  });

  describe('Slot Management', () => {
    it('should call listSlots on component mount', () => {
      render(<ProjectBar />);

      expect(persistence.listSlots).toHaveBeenCalled();
    });

    it('should handle multiple saved projects', () => {
      vi.mocked(persistence.listSlots).mockReturnValue(['Alpha', 'Beta', 'Gamma']);

      render(<ProjectBar />);

      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('should truncate long project names in the list', () => {
      vi.mocked(persistence.listSlots).mockReturnValue([
        'Very Long Project Name That Should Be Truncated',
      ]);

      render(<ProjectBar />);

      const projectName = screen.getByText('Very Long Project Name That Should Be Truncated');
      expect(projectName).toHaveClass('truncate');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing toast function gracefully', async () => {
      delete (window as any).__lokifi_toast;

      const user = userEvent.setup();
      render(<ProjectBar />);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      // Should not throw error
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should use default values when loading project with missing data', async () => {
      const { listSlots, loadSlot } = await import('@/lib/data/persistence');
      (listSlots as any).mockReturnValue(['Partial']);
      (loadSlot as any).mockReturnValue({
        drawings: [],
        // Missing theme and timeframe
      });

      const user = userEvent.setup();
      render(<ProjectBar />);

      const loadButton = screen.getAllByText('Load')[0];
      await user.click(loadButton);

      expect(mockSetAll).toHaveBeenCalledWith({
        drawings: [],
        theme: 'dark', // Default from store
        timeframe: '1D', // Default from store
      });
    });

    it('should handle empty project name when saving', async () => {
      const { saveSlot } = await import('@/lib/data/persistence');
      const user = userEvent.setup();
      render(<ProjectBar />);

      const input = screen.getByPlaceholderText('Slot name');
      await user.clear(input);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      expect(saveSlot).toHaveBeenCalledWith('', expect.any(Object));
    });
  });
});
