import { Tabs, TabsContent, TabsList, TabsTrigger, type TabItem } from '@/components/ui/Tabs';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Test Fixtures
// ============================================================================

const basicItems: TabItem[] = [
  { value: 'tab1', label: 'Tab 1', content: 'Content 1' },
  { value: 'tab2', label: 'Tab 2', content: 'Content 2' },
  { value: 'tab3', label: 'Tab 3', content: 'Content 3' },
];

const itemsWithBadges: TabItem[] = [
  { value: 'inbox', label: 'Inbox', badge: 5, content: 'Inbox content' },
  { value: 'sent', label: 'Sent', badge: 12, content: 'Sent content' },
  { value: 'drafts', label: 'Drafts', badge: 0, content: 'Drafts content' },
];

const itemsWithIcons: TabItem[] = [
  {
    value: 'home',
    label: 'Home',
    icon: <span data-testid="icon-home">🏠</span>,
    content: 'Home content',
  },
  {
    value: 'settings',
    label: 'Settings',
    icon: <span data-testid="icon-settings">⚙️</span>,
    content: 'Settings content',
  },
];

const itemsWithDisabled: TabItem[] = [
  { value: 'tab1', label: 'Tab 1', content: 'Content 1' },
  { value: 'tab2', label: 'Tab 2', disabled: true, content: 'Content 2' },
  { value: 'tab3', label: 'Tab 3', content: 'Content 3' },
];

// ============================================================================
// Basic Rendering Tests
// ============================================================================

describe('Tabs', () => {
  describe('Basic Rendering', () => {
    it('renders with items prop', () => {
      render(<Tabs items={basicItems} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
      expect(screen.getByText('Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 3')).toBeInTheDocument();
    });

    it('renders with compound components', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">First Tab</TabsTrigger>
            <TabsTrigger value="tab2">Second Tab</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">First Content</TabsContent>
          <TabsContent value="tab2">Second Content</TabsContent>
        </Tabs>
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByText('First Tab')).toBeInTheDocument();
      expect(screen.getByText('First Content')).toBeInTheDocument();
    });

    it('renders with testid', () => {
      render(<Tabs items={basicItems} />);
      expect(screen.getByTestId('tabs')).toBeInTheDocument();
      expect(screen.getByTestId('tabs-list')).toBeInTheDocument();
    });

    it('shows first tab content by default', () => {
      render(<Tabs items={basicItems} />);

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });

    it('shows specified defaultValue content', () => {
      render(<Tabs items={basicItems} defaultValue="tab2" />);

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<Tabs items={basicItems} className="custom-class" />);
      expect(screen.getByTestId('tabs')).toHaveClass('custom-class');
    });
  });

  // ============================================================================
  // Controlled/Uncontrolled Tests
  // ============================================================================

  describe('Controlled vs Uncontrolled', () => {
    it('works as uncontrolled with defaultValue', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      // Initially shows tab1 content
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Click tab2
      fireEvent.click(screen.getByTestId('tab-tab2'));

      // Should now show tab2 content
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });

    it('works as controlled with value prop', () => {
      const handleChange = vi.fn();
      const { rerender } = render(<Tabs items={basicItems} value="tab1" onChange={handleChange} />);

      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Click tab2
      fireEvent.click(screen.getByTestId('tab-tab2'));

      // onChange should be called but content shouldn't change (controlled)
      expect(handleChange).toHaveBeenCalledWith('tab2');
      expect(screen.getByText('Content 1')).toBeInTheDocument();

      // Update value externally
      rerender(<Tabs items={basicItems} value="tab2" onChange={handleChange} />);
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('calls onChange callback on tab change', () => {
      const handleChange = vi.fn();
      render(<Tabs items={basicItems} onChange={handleChange} />);

      fireEvent.click(screen.getByTestId('tab-tab2'));
      expect(handleChange).toHaveBeenCalledWith('tab2');

      fireEvent.click(screen.getByTestId('tab-tab3'));
      expect(handleChange).toHaveBeenCalledWith('tab3');
    });
  });

  // ============================================================================
  // Variant Tests
  // ============================================================================

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Tabs items={basicItems} variant="default" />);
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('bg-surface-100', 'rounded-lg');
    });

    it('renders pills variant', () => {
      render(<Tabs items={basicItems} variant="pills" />);
      const activeTab = screen.getByTestId('tab-tab1');
      expect(activeTab).toHaveClass('rounded-full', 'bg-primary');
    });

    it('renders underline variant', () => {
      render(<Tabs items={basicItems} variant="underline" />);
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('border-b');
    });

    it('renders enclosed variant', () => {
      render(<Tabs items={basicItems} variant="enclosed" />);
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('border-b');
    });
  });

  // ============================================================================
  // Size Tests
  // ============================================================================

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Tabs items={basicItems} size="sm" />);
      const tab = screen.getByTestId('tab-tab1');
      expect(tab).toHaveClass('px-2.5', 'py-1', 'text-xs');
    });

    it('renders medium size (default)', () => {
      render(<Tabs items={basicItems} size="md" />);
      const tab = screen.getByTestId('tab-tab1');
      expect(tab).toHaveClass('px-3', 'py-1.5', 'text-sm');
    });

    it('renders large size', () => {
      render(<Tabs items={basicItems} size="lg" />);
      const tab = screen.getByTestId('tab-tab1');
      expect(tab).toHaveClass('px-4', 'py-2', 'text-base');
    });
  });

  // ============================================================================
  // Orientation Tests
  // ============================================================================

  describe('Orientation', () => {
    it('renders horizontal by default', () => {
      render(<Tabs items={basicItems} />);
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('flex-row');
      expect(tabsList).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('renders vertical orientation', () => {
      render(<Tabs items={basicItems} orientation="vertical" />);
      const tabs = screen.getByTestId('tabs');
      const tabsList = screen.getByTestId('tabs-list');

      expect(tabs).toHaveClass('flex', 'gap-4');
      expect(tabsList).toHaveClass('flex-col');
      expect(tabsList).toHaveAttribute('aria-orientation', 'vertical');
    });
  });

  // ============================================================================
  // Icons and Badges Tests
  // ============================================================================

  describe('Icons and Badges', () => {
    it('renders icons', () => {
      render(<Tabs items={itemsWithIcons} />);

      expect(screen.getByTestId('icon-home')).toBeInTheDocument();
      expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    });

    it('renders badges', () => {
      render(<Tabs items={itemsWithBadges} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders icons and badges together', () => {
      const items: TabItem[] = [
        {
          value: 'notifications',
          label: 'Notifications',
          icon: <span data-testid="bell-icon">🔔</span>,
          badge: 99,
          content: 'Notifications content',
        },
      ];
      render(<Tabs items={items} />);

      expect(screen.getByTestId('bell-icon')).toBeInTheDocument();
      expect(screen.getByText('99')).toBeInTheDocument();
      expect(screen.getByText('Notifications')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Disabled State Tests
  // ============================================================================

  describe('Disabled State', () => {
    it('disables individual tabs', () => {
      render(<Tabs items={itemsWithDisabled} />);

      const disabledTab = screen.getByTestId('tab-tab2');
      expect(disabledTab).toBeDisabled();
      expect(disabledTab).toHaveAttribute('aria-disabled', 'true');
      expect(disabledTab).toHaveClass('opacity-50', 'cursor-not-allowed');
    });

    it('prevents clicking disabled tabs', () => {
      const handleChange = vi.fn();
      render(<Tabs items={itemsWithDisabled} onChange={handleChange} />);

      fireEvent.click(screen.getByTestId('tab-tab2'));
      expect(handleChange).not.toHaveBeenCalled();

      fireEvent.click(screen.getByTestId('tab-tab3'));
      expect(handleChange).toHaveBeenCalledWith('tab3');
    });

    it('disables all tabs when disabled prop is true', () => {
      render(<Tabs items={basicItems} disabled />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toBeDisabled();
        expect(tab).toHaveAttribute('aria-disabled', 'true');
      });
    });

    it('shows disabled state on tablist', () => {
      render(<Tabs items={basicItems} disabled />);
      expect(screen.getByRole('tablist')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  // ============================================================================
  // Full Width Tests
  // ============================================================================

  describe('Full Width', () => {
    it('applies full width styles', () => {
      render(<Tabs items={basicItems} fullWidth />);
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toHaveClass('*:flex-1');
    });
  });

  // ============================================================================
  // Keyboard Navigation Tests
  // ============================================================================

  describe('Keyboard Navigation', () => {
    it('navigates with ArrowRight in horizontal mode', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab2 = screen.getByTestId('tab-tab2');

      tab1.focus();
      fireEvent.keyDown(tab1, { key: 'ArrowRight' });

      expect(document.activeElement).toBe(tab2);
    });

    it('navigates with ArrowLeft in horizontal mode', () => {
      render(<Tabs items={basicItems} defaultValue="tab2" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab2 = screen.getByTestId('tab-tab2');

      tab2.focus();
      fireEvent.keyDown(tab2, { key: 'ArrowLeft' });

      expect(document.activeElement).toBe(tab1);
    });

    it('wraps around from last to first with ArrowRight', () => {
      render(<Tabs items={basicItems} defaultValue="tab3" />);

      const tab3 = screen.getByTestId('tab-tab3');
      const tab1 = screen.getByTestId('tab-tab1');

      tab3.focus();
      fireEvent.keyDown(tab3, { key: 'ArrowRight' });

      expect(document.activeElement).toBe(tab1);
    });

    it('wraps around from first to last with ArrowLeft', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab3 = screen.getByTestId('tab-tab3');

      tab1.focus();
      fireEvent.keyDown(tab1, { key: 'ArrowLeft' });

      expect(document.activeElement).toBe(tab3);
    });

    it('navigates with ArrowDown in vertical mode', () => {
      render(<Tabs items={basicItems} orientation="vertical" defaultValue="tab1" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab2 = screen.getByTestId('tab-tab2');

      tab1.focus();
      fireEvent.keyDown(tab1, { key: 'ArrowDown' });

      expect(document.activeElement).toBe(tab2);
    });

    it('navigates with ArrowUp in vertical mode', () => {
      render(<Tabs items={basicItems} orientation="vertical" defaultValue="tab2" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab2 = screen.getByTestId('tab-tab2');

      tab2.focus();
      fireEvent.keyDown(tab2, { key: 'ArrowUp' });

      expect(document.activeElement).toBe(tab1);
    });

    it('jumps to first tab with Home key', () => {
      render(<Tabs items={basicItems} defaultValue="tab3" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab3 = screen.getByTestId('tab-tab3');

      tab3.focus();
      fireEvent.keyDown(tab3, { key: 'Home' });

      expect(document.activeElement).toBe(tab1);
    });

    it('jumps to last tab with End key', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab3 = screen.getByTestId('tab-tab3');

      tab1.focus();
      fireEvent.keyDown(tab1, { key: 'End' });

      expect(document.activeElement).toBe(tab3);
    });

    it('skips disabled tabs during navigation', () => {
      render(<Tabs items={itemsWithDisabled} defaultValue="tab1" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab3 = screen.getByTestId('tab-tab3');

      tab1.focus();
      // ArrowRight should skip tab2 (disabled) and go to tab3
      fireEvent.keyDown(tab1, { key: 'ArrowRight' });

      expect(document.activeElement).toBe(tab3);
    });
  });

  // ============================================================================
  // ARIA and Accessibility Tests
  // ============================================================================

  describe('Accessibility', () => {
    it('has correct ARIA attributes on tablist', () => {
      render(<Tabs items={basicItems} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('has correct ARIA attributes on tabs', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      const activeTab = screen.getByTestId('tab-tab1');
      const inactiveTab = screen.getByTestId('tab-tab2');

      expect(activeTab).toHaveAttribute('role', 'tab');
      expect(activeTab).toHaveAttribute('aria-selected', 'true');
      expect(activeTab).toHaveAttribute('tabindex', '0');

      expect(inactiveTab).toHaveAttribute('role', 'tab');
      expect(inactiveTab).toHaveAttribute('aria-selected', 'false');
      expect(inactiveTab).toHaveAttribute('tabindex', '-1');
    });

    it('has correct ARIA attributes on tabpanel', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      const tabpanel = screen.getByRole('tabpanel');
      expect(tabpanel).toHaveAttribute('tabindex', '0');
    });

    it('links tabs to panels via aria-controls/aria-labelledby', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      const tab = screen.getByTestId('tab-tab1');
      const panel = screen.getByTestId('tab-content-tab1');

      const tabId = tab.getAttribute('id');
      const panelId = panel.getAttribute('id');

      expect(tab).toHaveAttribute('aria-controls', panelId);
      expect(panel).toHaveAttribute('aria-labelledby', tabId);
    });

    it('updates tabindex correctly when active tab changes', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      const tab1 = screen.getByTestId('tab-tab1');
      const tab2 = screen.getByTestId('tab-tab2');

      expect(tab1).toHaveAttribute('tabindex', '0');
      expect(tab2).toHaveAttribute('tabindex', '-1');

      fireEvent.click(tab2);

      expect(tab1).toHaveAttribute('tabindex', '-1');
      expect(tab2).toHaveAttribute('tabindex', '0');
    });
  });

  // ============================================================================
  // TabsContent Tests
  // ============================================================================

  describe('TabsContent', () => {
    it('only renders active content', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Content 3')).not.toBeInTheDocument();
    });

    it('renders different content when tab changes', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      fireEvent.click(screen.getByTestId('tab-tab2'));

      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('keeps content mounted with forceMount', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2" forceMount>
            Content 2
          </TabsContent>
        </Tabs>
      );

      // Both contents should be in DOM (tab2 has forceMount)
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();

      // But tab2 content should be hidden
      expect(screen.getByTestId('tab-content-tab2')).toHaveClass('hidden');
    });

    it('applies custom className to content', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1" className="custom-content-class">
            Content 1
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('tab-content-tab1')).toHaveClass('custom-content-class');
    });

    it('sets data-state attribute correctly', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1">Tab 1</TabsTrigger>
            <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Content 1</TabsContent>
          <TabsContent value="tab2" forceMount>
            Content 2
          </TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('tab-content-tab1')).toHaveAttribute('data-state', 'active');
      expect(screen.getByTestId('tab-content-tab2')).toHaveAttribute('data-state', 'inactive');
    });
  });

  // ============================================================================
  // Custom Classes Tests
  // ============================================================================

  describe('Custom Classes', () => {
    it('applies tabsListClassName', () => {
      render(<Tabs items={basicItems} tabsListClassName="custom-list-class" />);
      expect(screen.getByTestId('tabs-list')).toHaveClass('custom-list-class');
    });

    it('applies tabsContentClassName', () => {
      render(<Tabs items={basicItems} tabsContentClassName="custom-content-wrapper" />);
      // The content wrapper div should have the class
      const tabs = screen.getByTestId('tabs');
      const contentWrapper = tabs.querySelector('.custom-content-wrapper');
      expect(contentWrapper).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Compound Components Tests
  // ============================================================================

  describe('Compound Components', () => {
    it('renders TabsTrigger with icon prop', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" icon={<span data-testid="trigger-icon">📁</span>}>
              Files
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Files content</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('trigger-icon')).toBeInTheDocument();
      expect(screen.getByText('Files')).toBeInTheDocument();
    });

    it('renders TabsTrigger with badge prop', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger value="tab1" badge={42}>
              Notifications
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tab1">Notifications content</TabsContent>
        </Tabs>
      );

      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('allows TabsTrigger without children', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabsTrigger
              value="tab1"
              icon={<span data-testid="icon-only">🔔</span>}
              aria-label="Notifications"
            />
          </TabsList>
          <TabsContent value="tab1">Content</TabsContent>
        </Tabs>
      );

      expect(screen.getByTestId('icon-only')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Context Error Tests
  // ============================================================================

  describe('Context Errors', () => {
    it('throws error when TabsTrigger used outside Tabs', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabsTrigger value="test">Test</TabsTrigger>);
      }).toThrow('Tab components must be used within a Tabs component');

      consoleSpy.mockRestore();
    });

    it('throws error when TabsList used outside Tabs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(
          <TabsList>
            <TabsTrigger value="test">Test</TabsTrigger>
          </TabsList>
        );
      }).toThrow('Tab components must be used within a Tabs component');

      consoleSpy.mockRestore();
    });

    it('throws error when TabsContent used outside Tabs', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TabsContent value="test">Content</TabsContent>);
      }).toThrow('Tab components must be used within a Tabs component');

      consoleSpy.mockRestore();
    });
  });

  // ============================================================================
  // Data State Tests
  // ============================================================================

  describe('Data State Attributes', () => {
    it('sets data-state on triggers', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      expect(screen.getByTestId('tab-tab1')).toHaveAttribute('data-state', 'active');
      expect(screen.getByTestId('tab-tab2')).toHaveAttribute('data-state', 'inactive');
    });

    it('updates data-state when tab changes', () => {
      render(<Tabs items={basicItems} defaultValue="tab1" />);

      fireEvent.click(screen.getByTestId('tab-tab2'));

      expect(screen.getByTestId('tab-tab1')).toHaveAttribute('data-state', 'inactive');
      expect(screen.getByTestId('tab-tab2')).toHaveAttribute('data-state', 'active');
    });
  });
});
