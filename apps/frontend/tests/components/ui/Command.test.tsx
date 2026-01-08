import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandLoading,
  CommandSeparator,
  CommandShortcut,
  useCommandState,
} from '@/components/ui/Command';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock scrollIntoView since JSDOM doesn't support it
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// ============================================================================
// Test Utilities
// ============================================================================

function renderCommand(props: React.ComponentProps<typeof Command> = {}) {
  return render(
    <Command {...props}>
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem value="new">New File</CommandItem>
          <CommandItem value="open">Open File</CommandItem>
          <CommandItem value="save">Save File</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem value="preferences">Preferences</CommandItem>
          <CommandItem value="theme">Theme</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

// ============================================================================
// Command (Root) Tests
// ============================================================================

describe('Command', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      renderCommand();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      renderCommand();
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
      expect(screen.getByText('New File')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(
        <Command className="custom-class">
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      );
      expect(screen.getByRole('listbox')).toHaveClass('custom-class');
    });

    it('renders with data-command attribute', () => {
      renderCommand();
      expect(screen.getByRole('listbox')).toHaveAttribute('data-command');
    });

    it('renders with dialog variant styling', () => {
      render(
        <Command dialog>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      );
      expect(screen.getByRole('listbox')).toHaveAttribute('data-dialog', 'true');
    });
  });

  describe('Search Functionality', () => {
    it('filters items based on search input', async () => {
      const user = userEvent.setup();
      renderCommand();

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'new');

      expect(screen.getByText('New File')).toBeInTheDocument();
      expect(screen.queryByText('Open File')).not.toBeInTheDocument();
      expect(screen.queryByText('Save File')).not.toBeInTheDocument();
    });

    it('shows empty state when no results', async () => {
      const user = userEvent.setup();
      renderCommand();

      const input = screen.getByPlaceholderText('Search...');
      await user.type(input, 'xyz123');

      expect(screen.getByText('No results')).toBeInTheDocument();
    });

    it('uses controlled search value', async () => {
      const onSearchChange = vi.fn();
      render(
        <Command search="test" onSearchChange={onSearchChange}>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test Item</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    });

    it('calls onSearchChange when search changes', async () => {
      const user = userEvent.setup();
      const onSearchChange = vi.fn();

      render(
        <Command onSearchChange={onSearchChange}>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      );

      await user.type(screen.getByRole('textbox'), 'a');
      expect(onSearchChange).toHaveBeenCalledWith('a');
    });

    it('uses default search value', () => {
      render(
        <Command defaultSearch="default">
          <CommandInput />
          <CommandList>
            <CommandItem value="default">Default</CommandItem>
          </CommandList>
        </Command>
      );

      expect(screen.getByDisplayValue('default')).toBeInTheDocument();
    });

    it('supports custom filter function', async () => {
      const user = userEvent.setup();
      const customFilter = vi.fn((value: string, search: string) => {
        return value.startsWith(search);
      });

      render(
        <Command filter={customFilter}>
          <CommandInput />
          <CommandList>
            <CommandItem value="apple">Apple</CommandItem>
            <CommandItem value="banana">Banana</CommandItem>
          </CommandList>
        </Command>
      );

      await user.type(screen.getByRole('textbox'), 'a');
      expect(customFilter).toHaveBeenCalled();
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('filters by keywords', async () => {
      const user = userEvent.setup();
      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="settings" keywords={['preferences', 'config']}>
              Settings
            </CommandItem>
            <CommandItem value="profile">Profile</CommandItem>
          </CommandList>
        </Command>
      );

      await user.type(screen.getByRole('textbox'), 'pref');
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('calls onSelect when item is clicked', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(
        <Command onSelect={onSelect}>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test Item</CommandItem>
          </CommandList>
        </Command>
      );

      await user.click(screen.getByText('Test Item'));
      expect(onSelect).toHaveBeenCalledWith('test');
    });

    it('calls item onSelect callback', async () => {
      const user = userEvent.setup();
      const itemOnSelect = vi.fn();

      render(
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="test" onSelect={itemOnSelect}>
              Test Item
            </CommandItem>
          </CommandList>
        </Command>
      );

      await user.click(screen.getByText('Test Item'));
      expect(itemOnSelect).toHaveBeenCalledWith('test');
    });

    it('does not select disabled items', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();

      render(
        <Command onSelect={onSelect}>
          <CommandInput />
          <CommandList>
            <CommandItem value="disabled" disabled>
              Disabled Item
            </CommandItem>
          </CommandList>
        </Command>
      );

      await user.click(screen.getByText('Disabled Item'));
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// CommandDialog Tests
// ============================================================================

describe('CommandDialog', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = '';
  });

  it('renders when open is true', () => {
    render(
      <CommandDialog open={true} onOpenChange={() => {}}>
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <CommandDialog open={false} onOpenChange={() => {}}>
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape key', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <CommandDialog open={true} onOpenChange={onOpenChange}>
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>
    );

    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes on backdrop click', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <CommandDialog open={true} onOpenChange={onOpenChange}>
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>
    );

    const dialog = screen.getByRole('dialog');
    await user.click(dialog);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not close when clicking inside dialog content', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <CommandDialog open={true} onOpenChange={onOpenChange}>
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>
    );

    await user.click(screen.getByRole('listbox'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('prevents body scroll when open', () => {
    const { rerender } = render(
      <CommandDialog open={true} onOpenChange={() => {}}>
        <Command>
          <CommandInput />
        </Command>
      </CommandDialog>
    );

    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <CommandDialog open={false} onOpenChange={() => {}}>
        <Command>
          <CommandInput />
        </Command>
      </CommandDialog>
    );

    expect(document.body.style.overflow).toBe('');
  });

  it('renders without backdrop when showBackdrop is false', () => {
    render(
      <CommandDialog open={true} onOpenChange={() => {}} showBackdrop={false}>
        <Command>
          <CommandInput />
        </Command>
      </CommandDialog>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toHaveClass('bg-black/50');
  });

  it('has data-command-dialog attribute', () => {
    render(
      <CommandDialog open={true} onOpenChange={() => {}}>
        <Command>
          <CommandInput />
        </Command>
      </CommandDialog>
    );

    expect(screen.getByRole('dialog')).toHaveAttribute('data-command-dialog');
  });

  it('applies custom className', () => {
    render(
      <CommandDialog open={true} onOpenChange={() => {}} className="custom-dialog">
        <Command>
          <CommandInput />
        </Command>
      </CommandDialog>
    );

    const dialogContent = screen.getByRole('dialog').firstChild;
    expect(dialogContent).toHaveClass('custom-dialog');
  });
});

// ============================================================================
// CommandInput Tests
// ============================================================================

describe('CommandInput', () => {
  it('renders with default placeholder', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByPlaceholderText('Type a command or search...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <Command>
        <CommandInput placeholder="Custom placeholder" />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('renders with default search icon', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByRole('textbox').parentElement?.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with custom icon', () => {
    render(
      <Command>
        <CommandInput icon={<span data-testid="custom-icon">🔍</span>} />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('focuses automatically on mount', async () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveFocus();
    });
  });

  it('has proper aria-label', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Search commands');
  });

  it('has data-command-input attribute', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByRole('textbox')).toHaveAttribute('data-command-input');
  });
});

// ============================================================================
// CommandList Tests
// ============================================================================

describe('CommandList', () => {
  it('renders children', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test Item</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('applies default max height', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    const list = screen.getByRole('group');
    expect(list).toHaveStyle({ maxHeight: '300px' });
  });

  it('applies custom max height as number', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList maxHeight={500}>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    const list = screen.getByRole('group');
    expect(list).toHaveStyle({ maxHeight: '500px' });
  });

  it('applies custom max height as string', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList maxHeight="50vh">
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    const list = screen.getByRole('group');
    expect(list).toHaveStyle({ maxHeight: '50vh' });
  });

  it('has data-command-list attribute', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    const list = document.querySelector('[data-command-list]');
    expect(list).toBeInTheDocument();
  });
});

// ============================================================================
// CommandEmpty Tests
// ============================================================================

describe('CommandEmpty', () => {
  it('does not render when there are results', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('does not render when search is empty', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
        </CommandList>
      </Command>
    );

    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('renders when search has no results', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty>No results found</CommandEmpty>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'xyz');
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('renders default message', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty />
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'xyz');
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('renders custom message', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty message="Custom empty message" />
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'xyz');
    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('renders children over message', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty message="Message">
            <span>Children content</span>
          </CommandEmpty>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'xyz');
    expect(screen.getByText('Children content')).toBeInTheDocument();
    expect(screen.queryByText('Message')).not.toBeInTheDocument();
  });

  it('has status role and aria-live', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandEmpty>No results</CommandEmpty>
          <CommandItem value="apple">Apple</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'xyz');
    const empty = screen.getByRole('status');
    expect(empty).toHaveAttribute('aria-live', 'polite');
  });
});

// ============================================================================
// CommandGroup Tests
// ============================================================================

describe('CommandGroup', () => {
  it('renders children', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandGroup>
            <CommandItem value="test">Test Item</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('renders heading', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandGroup heading="My Group">
            <CommandItem value="test">Test Item</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('My Group')).toBeInTheDocument();
  });

  it('hides when all items are filtered out', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem value="new">New</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Settings">
            <CommandItem value="preferences">Preferences</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'new');
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.queryByText('Settings')).not.toBeInTheDocument();
  });

  it('shows with forceMount even when filtered', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandGroup heading="Actions">
            <CommandItem value="new">New</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Settings" forceMount>
            <CommandItem value="preferences">Preferences</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'new');
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('has proper aria-labelledby when heading exists', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandGroup heading="Test Group">
            <CommandItem value="test">Test</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    const group = document.querySelector('[data-command-group]');
    expect(group).toHaveAttribute('aria-labelledby');
  });

  it('has data-command-group attribute', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandGroup>
            <CommandItem value="test">Test</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    expect(document.querySelector('[data-command-group]')).toBeInTheDocument();
  });
});

// ============================================================================
// CommandItem Tests
// ============================================================================

describe('CommandItem', () => {
  it('renders children', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test Content</CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test" icon={<span data-testid="icon">📁</span>}>
            Test
          </CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders with shortcut', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test" shortcut="⌘N">
            New File
          </CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('⌘N')).toBeInTheDocument();
  });

  it('has proper aria-selected state', async () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    // First item should be selected by default
    await waitFor(() => {
      const firstItem = screen.getByText('First').closest('[role="option"]');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('shows disabled state', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="disabled" disabled>
            Disabled Item
          </CommandItem>
        </CommandList>
      </Command>
    );

    // Disabled items are visible but marked as disabled
    const disabledItem = screen.getByText('Disabled Item').closest('[role="option"]');
    expect(disabledItem).toBeInTheDocument();
    expect(disabledItem).toHaveAttribute('aria-disabled', 'true');
    expect(disabledItem).toHaveAttribute('data-disabled', 'true');
    expect(disabledItem).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('selects on mouse enter', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    const secondItem = screen.getByText('Second').closest('[role="option"]');
    await user.hover(secondItem!);

    expect(secondItem).toHaveAttribute('aria-selected', 'true');
  });

  it('has data-value attribute', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="my-value">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(document.querySelector('[data-value="my-value"]')).toBeInTheDocument();
  });

  it('has data-command-item attribute', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
        </CommandList>
      </Command>
    );

    expect(document.querySelector('[data-command-item]')).toBeInTheDocument();
  });
});

// ============================================================================
// CommandSeparator Tests
// ============================================================================

describe('CommandSeparator', () => {
  it('renders when not filtering', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandSeparator />
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    expect(document.querySelector('[data-command-separator]')).toBeInTheDocument();
  });

  it('hides when filtering', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandSeparator />
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'first');
    expect(document.querySelector('[data-command-separator]')).not.toBeInTheDocument();
  });

  it('shows with alwaysRender when filtering', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandSeparator alwaysRender />
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'first');
    expect(document.querySelector('[data-command-separator]')).toBeInTheDocument();
  });

  it('has separator role', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
          <CommandSeparator />
        </CommandList>
      </Command>
    );

    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('has horizontal orientation', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
          <CommandSeparator />
        </CommandList>
      </Command>
    );

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
  });
});

// ============================================================================
// CommandShortcut Tests
// ============================================================================

describe('CommandShortcut', () => {
  it('renders single key', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">
            Test
            <CommandShortcut keys={['⌘']} />
          </CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('⌘')).toBeInTheDocument();
  });

  it('renders multiple keys', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">
            Test
            <CommandShortcut keys={['⌘', 'K']} />
          </CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('⌘')).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('has proper aria-label', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">
            Test
            <CommandShortcut keys={['Ctrl', 'S']} />
          </CommandItem>
        </CommandList>
      </Command>
    );

    expect(screen.getByLabelText('Keyboard shortcut: Ctrl + S')).toBeInTheDocument();
  });

  it('has data-command-shortcut attribute', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">
            Test
            <CommandShortcut keys={['⌘']} />
          </CommandItem>
        </CommandList>
      </Command>
    );

    expect(document.querySelector('[data-command-shortcut]')).toBeInTheDocument();
  });
});

// ============================================================================
// CommandLoading Tests
// ============================================================================

describe('CommandLoading', () => {
  it('renders when loading is true', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={true} />
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('does not render when loading is false', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={false} />
        </CommandList>
      </Command>
    );

    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={true} message="Searching..." />
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('renders children over message', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={true} message="Loading...">
            <span>Custom content</span>
          </CommandLoading>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Custom content')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('has status role and aria-live', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={true} />
        </CommandList>
      </Command>
    );

    const loading = screen.getByRole('status');
    expect(loading).toHaveAttribute('aria-live', 'polite');
  });

  it('has spinner animation', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={true} />
        </CommandList>
      </Command>
    );

    const spinner = screen.getByRole('status').querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('has data-command-loading attribute', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={true} />
        </CommandList>
      </Command>
    );

    expect(document.querySelector('[data-command-loading]')).toBeInTheDocument();
  });
});

// ============================================================================
// Keyboard Navigation Tests
// ============================================================================

describe('Keyboard Navigation', () => {
  it('navigates down with ArrowDown', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      const secondItem = screen.getByText('Second').closest('[role="option"]');
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('navigates up with ArrowUp', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowUp}');

    await waitFor(() => {
      const firstItem = screen.getByText('First').closest('[role="option"]');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('goes to first item with Home', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
          <CommandItem value="third">Third</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{Home}');

    await waitFor(() => {
      const firstItem = screen.getByText('First').closest('[role="option"]');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('goes to last item with End', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
          <CommandItem value="third">Third</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{End}');

    await waitFor(() => {
      const thirdItem = screen.getByText('Third').closest('[role="option"]');
      expect(thirdItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('selects item with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Command onSelect={onSelect}>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('first');
  });

  it('loops navigation when loop is enabled', async () => {
    const user = userEvent.setup();
    render(
      <Command loop>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      const firstItem = screen.getByText('First').closest('[role="option"]');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('does not loop navigation by default', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      const secondItem = screen.getByText('Second').closest('[role="option"]');
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('does not navigate past first item without loop', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowUp}');

    await waitFor(() => {
      const firstItem = screen.getByText('First').closest('[role="option"]');
      expect(firstItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('loops to last item when pressing ArrowUp at first item with loop', async () => {
    const user = userEvent.setup();
    render(
      <Command loop>
        <CommandInput />
        <CommandList>
          <CommandItem value="first">First</CommandItem>
          <CommandItem value="second">Second</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowUp}');

    await waitFor(() => {
      const secondItem = screen.getByText('Second').closest('[role="option"]');
      expect(secondItem).toHaveAttribute('aria-selected', 'true');
    });
  });
});

// ============================================================================
// useCommandState Hook Tests
// ============================================================================

describe('useCommandState', () => {
  it('returns default values outside Command context', () => {
    function TestComponent() {
      const state = useCommandState();
      return (
        <div>
          <span data-testid="search">{state.search}</span>
          <span data-testid="index">{state.selectedIndex}</span>
          <span data-testid="count">{state.filteredCount}</span>
        </div>
      );
    }

    render(<TestComponent />);

    expect(screen.getByTestId('search')).toHaveTextContent('');
    expect(screen.getByTestId('index')).toHaveTextContent('-1');
    expect(screen.getByTestId('count')).toHaveTextContent('0');
  });

  it('returns current state inside Command context', async () => {
    const user = userEvent.setup();

    function TestComponent() {
      const state = useCommandState();
      return (
        <div>
          <span data-testid="search">{state.search}</span>
          <span data-testid="count">{state.filteredCount}</span>
        </div>
      );
    }

    render(
      <Command>
        <CommandInput />
        <CommandList>
          <TestComponent />
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'app');

    expect(screen.getByTestId('search')).toHaveTextContent('app');
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

describe('Accessibility', () => {
  it('has proper role structure', () => {
    renderCommand();

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('has aria-label on command', () => {
    renderCommand();
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Command menu');
  });

  it('announces empty state to screen readers', async () => {
    const user = userEvent.setup();
    renderCommand();

    await user.type(screen.getByRole('textbox'), 'xyz');

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('dialog has proper modal attributes', () => {
    render(
      <CommandDialog open={true} onOpenChange={() => {}}>
        <Command>
          <CommandInput />
          <CommandList>
            <CommandItem value="test">Test</CommandItem>
          </CommandList>
        </Command>
      </CommandDialog>
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Command dialog');
  });

  it('separator has proper ARIA attributes', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test">Test</CommandItem>
          <CommandSeparator />
        </CommandList>
      </Command>
    );

    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  it('handles empty command gracefully', () => {
    render(
      <Command>
        <CommandInput />
        <CommandList />
      </Command>
    );

    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('handles rapid typing', async () => {
    const user = userEvent.setup();
    renderCommand();

    const input = screen.getByRole('textbox');
    await user.type(input, 'abcdefghij', { delay: 10 });

    expect(input).toHaveValue('abcdefghij');
  });

  it('handles special characters in search', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="test@example.com">Email</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), '@');
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('handles unicode in search', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="日本語">Japanese</CommandItem>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), '日本');
    expect(screen.getByText('Japanese')).toBeInTheDocument();
  });

  it('resets selection when search changes', async () => {
    const user = userEvent.setup();
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandItem value="apple">Apple</CommandItem>
          <CommandItem value="apricot">Apricot</CommandItem>
          <CommandItem value="banana">Banana</CommandItem>
        </CommandList>
      </Command>
    );

    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowDown}');
    await user.type(screen.getByRole('textbox'), 'app');

    // Selection should reset to first filtered item
    await waitFor(() => {
      const appleItem = screen.getByText('Apple').closest('[role="option"]');
      expect(appleItem).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('handles dynamic item addition', async () => {
    const user = userEvent.setup();

    function DynamicCommand() {
      const [items, setItems] = useState(['One', 'Two']);

      return (
        <Command>
          <CommandInput />
          <CommandList>
            {items.map((item) => (
              <CommandItem key={item} value={item.toLowerCase()}>
                {item}
              </CommandItem>
            ))}
          </CommandList>
          <button onClick={() => setItems([...items, 'Three'])}>Add</button>
        </Command>
      );
    }

    render(<DynamicCommand />);

    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();

    await user.click(screen.getByText('Add'));

    expect(screen.getByText('Three')).toBeInTheDocument();
  });

  it('throws error when CommandInput used outside Command', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<CommandInput />);
    }).toThrow('Command components must be used within a Command');

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// Financial Dashboard Use Cases
// ============================================================================

describe('Financial Dashboard Use Cases', () => {
  it('supports portfolio navigation command', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Command onSelect={onSelect}>
        <CommandInput placeholder="Go to..." />
        <CommandList>
          <CommandGroup heading="Portfolios">
            <CommandItem value="portfolio:main" keywords={['main', 'default']}>
              Main Portfolio
            </CommandItem>
            <CommandItem value="portfolio:retirement" keywords={['401k', 'ira']}>
              Retirement
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'main');
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledWith('portfolio:main');
  });

  it('supports quick actions', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <Command onSelect={onSelect}>
        <CommandInput />
        <CommandList>
          <CommandGroup heading="Quick Actions">
            <CommandItem value="action:buy" icon={<span>💰</span>} shortcut="⌘B">
              Buy Asset
            </CommandItem>
            <CommandItem value="action:sell" icon={<span>📤</span>} shortcut="⌘S">
              Sell Asset
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Buy Asset')).toBeInTheDocument();
    expect(screen.getByText('⌘B')).toBeInTheDocument();

    await user.click(screen.getByText('Buy Asset'));
    expect(onSelect).toHaveBeenCalledWith('action:buy');
  });

  it('supports search across multiple categories', async () => {
    const user = userEvent.setup();

    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandGroup heading="Portfolios">
            <CommandItem value="portfolio:main">Main Portfolio</CommandItem>
          </CommandGroup>
          <CommandGroup heading="Assets">
            <CommandItem value="asset:btc" keywords={['bitcoin', 'crypto']}>
              Bitcoin (BTC)
            </CommandItem>
            <CommandItem value="asset:eth" keywords={['ethereum', 'crypto']}>
              Ethereum (ETH)
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem value="action:add-alert">Add Price Alert</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    );

    await user.type(screen.getByRole('textbox'), 'crypto');

    // Should show only crypto assets
    expect(screen.getByText('Bitcoin (BTC)')).toBeInTheDocument();
    expect(screen.getByText('Ethereum (ETH)')).toBeInTheDocument();
    expect(screen.queryByText('Main Portfolio')).not.toBeInTheDocument();
    expect(screen.queryByText('Add Price Alert')).not.toBeInTheDocument();
  });

  it('supports loading state for async search', async () => {
    render(
      <Command>
        <CommandInput />
        <CommandList>
          <CommandLoading loading={true} message="Searching assets..." />
        </CommandList>
      </Command>
    );

    expect(screen.getByText('Searching assets...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });
});
