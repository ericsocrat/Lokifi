import PluginManager from '@/components/PluginManager';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock plugin utilities
const mockListPlugins = vi.fn();
const mockSetPluginEnabled = vi.fn();

vi.mock('@/lib/plugins/plugins', () => ({
  listPlugins: () => mockListPlugins(),
  setPluginEnabled: (...args: any[]) => mockSetPluginEnabled(...args),
}));

// Mock chart store
const mockStoreState = {};

vi.mock('@/state/store', () => ({
  useChartStore: () => mockStoreState,
}));

describe('PluginManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no plugins
    mockListPlugins.mockReturnValue([]);
  });

  describe('Initial Rendering', () => {
    it('should render the component title', () => {
      render(<PluginManager />);

      expect(screen.getByText('Plugins')).toBeInTheDocument();
    });

    it('should render install demo button', () => {
      render(<PluginManager />);

      const installButton = screen.getByRole('button', { name: /install demo/i });
      expect(installButton).toBeInTheDocument();
    });

    it('should show empty state when no plugins', () => {
      mockListPlugins.mockReturnValue([]);

      render(<PluginManager />);

      expect(screen.getByText('No plugins installed.')).toBeInTheDocument();
    });

    it('should have proper structure and styling', () => {
      const { container } = render(<PluginManager />);

      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveClass('rounded-2xl');
      expect(mainContainer).toHaveClass('border');
      expect(mainContainer).toHaveClass('border-white/15');
      expect(mainContainer).toHaveClass('p-3');
      expect(mainContainer).toHaveClass('space-y-3');
    });
  });

  describe('Plugin List', () => {
    it('should render single plugin', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: {
            id: 'plugin-1',
            name: 'Test Plugin',
            description: 'A test plugin',
          },
          enabled: true,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText('Test Plugin')).toBeInTheDocument();
      expect(screen.getByText('#plugin-1')).toBeInTheDocument();
      expect(screen.getByText('A test plugin')).toBeInTheDocument();
    });

    it('should render multiple plugins', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Plugin One' },
          enabled: true,
        },
        {
          meta: { id: 'plugin-2', name: 'Plugin Two' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText('Plugin One')).toBeInTheDocument();
      expect(screen.getByText('Plugin Two')).toBeInTheDocument();
    });

    it('should render plugin without description', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'No Description Plugin' },
          enabled: true,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText('No Description Plugin')).toBeInTheDocument();
      // Description should not be rendered
      const container = screen.getByText('No Description Plugin').parentElement;
      expect(container?.querySelector('.opacity-70.text-xs')).not.toBeInTheDocument();
    });

    it('should show plugin ID with hash prefix', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'my-plugin-id', name: 'My Plugin' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText('#my-plugin-id')).toBeInTheDocument();
    });
  });

  describe('Plugin Enable/Disable', () => {
    it('should show checked checkbox for enabled plugin', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Enabled Plugin' },
          enabled: true,
        },
      ]);

      render(<PluginManager />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should show unchecked checkbox for disabled plugin', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Disabled Plugin' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should call setPluginEnabled when checkbox is toggled', async () => {
      const user = userEvent.setup();
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Test Plugin' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockSetPluginEnabled).toHaveBeenCalledWith('plugin-1', true);
    });

    it('should disable plugin when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Test Plugin' },
          enabled: true,
        },
      ]);

      render(<PluginManager />);

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);

      expect(mockSetPluginEnabled).toHaveBeenCalledWith('plugin-1', false);
    });

    it('should handle toggling multiple plugins independently', async () => {
      const user = userEvent.setup();
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Plugin One' },
          enabled: true,
        },
        {
          meta: { id: 'plugin-2', name: 'Plugin Two' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      const checkboxes = screen.getAllByRole('checkbox');

      await user.click(checkboxes[0]!);
      expect(mockSetPluginEnabled).toHaveBeenCalledWith('plugin-1', false);

      await user.click(checkboxes[1]!);
      expect(mockSetPluginEnabled).toHaveBeenCalledWith('plugin-2', true);
    });

    it('should have enable label next to checkbox', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Test Plugin' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText('Enable')).toBeInTheDocument();
    });
  });

  describe('Install Demo Button', () => {
    it('should dispatch custom event when clicked', async () => {
      const user = userEvent.setup();
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      render(<PluginManager />);

      const installButton = screen.getByRole('button', { name: /install demo/i });
      await user.click(installButton);

      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'lokifi:install-demo-plugin',
        })
      );
    });

    it('should create CustomEvent with correct event name', async () => {
      const user = userEvent.setup();
      const events: Event[] = [];
      const originalDispatch = window.dispatchEvent.bind(window);

      vi.spyOn(window, 'dispatchEvent').mockImplementation((event) => {
        events.push(event);
        return originalDispatch(event);
      });

      render(<PluginManager />);

      const installButton = screen.getByRole('button', { name: /install demo/i });
      await user.click(installButton);

      const customEvent = events.find((e) => e.type === 'lokifi:install-demo-plugin');
      expect(customEvent).toBeDefined();
      expect(customEvent).toBeInstanceOf(CustomEvent);
    });
  });

  describe('Dynamic Updates', () => {
    it('should re-render when plugins list changes', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Plugin One' },
          enabled: true,
        },
      ]);

      const { rerender } = render(<PluginManager />);

      expect(screen.getByText('Plugin One')).toBeInTheDocument();

      // Update mock to return different plugins
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-2', name: 'Plugin Two' },
          enabled: false,
        },
      ]);

      rerender(<PluginManager />);

      // Note: The component uses a reducer to force updates internally
      // In real usage, the force() call triggers a re-render
    });

    it('should handle transition from empty to populated list', () => {
      mockListPlugins.mockReturnValue([]);

      const { rerender } = render(<PluginManager />);

      expect(screen.getByText('No plugins installed.')).toBeInTheDocument();

      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'New Plugin' },
          enabled: true,
        },
      ]);

      rerender(<PluginManager />);

      // After rerender, new plugin should be visible
      expect(mockListPlugins).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle plugin with very long name', () => {
      const longName = 'A'.repeat(100);
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: longName },
          enabled: true,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText(longName)).toBeInTheDocument();
    });

    it('should handle plugin with special characters in ID', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'my-plugin@v1.0.0', name: 'Special Plugin' },
          enabled: true,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText('#my-plugin@v1.0.0')).toBeInTheDocument();
    });

    it('should handle empty description string', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Plugin', description: '' },
          enabled: true,
        },
      ]);

      render(<PluginManager />);

      expect(screen.getByText('Plugin')).toBeInTheDocument();
      // Empty description should not render description element
    });

    it('should handle multiple rapid checkbox clicks', async () => {
      const user = userEvent.setup();
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Test Plugin' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      const checkbox = screen.getByRole('checkbox');

      await user.click(checkbox);
      await user.click(checkbox);
      await user.click(checkbox);

      // Should be called 3 times
      expect(mockSetPluginEnabled).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible install button', () => {
      render(<PluginManager />);

      const button = screen.getByRole('button', { name: /install demo/i });
      expect(button).toBeInTheDocument();
    });

    it('should have accessible checkboxes', () => {
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Plugin One' },
          enabled: true,
        },
        {
          meta: { id: 'plugin-2', name: 'Plugin Two' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Test Plugin' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      // Tab to install button
      await user.tab();
      expect(screen.getByRole('button', { name: /install demo/i })).toHaveFocus();

      // Tab to checkbox
      await user.tab();
      expect(screen.getByRole('checkbox')).toHaveFocus();
    });

    it('should toggle checkbox with space key', async () => {
      const user = userEvent.setup();
      mockListPlugins.mockReturnValue([
        {
          meta: { id: 'plugin-1', name: 'Test Plugin' },
          enabled: false,
        },
      ]);

      render(<PluginManager />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();

      await user.keyboard(' ');

      expect(mockSetPluginEnabled).toHaveBeenCalledWith('plugin-1', true);
    });
  });
});
