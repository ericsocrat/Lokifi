import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Tests
// ============================================================================

describe('DropdownMenu', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders trigger button', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByText('Open Menu')).toBeInTheDocument();
    });

    it('does not render content when closed', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('renders content when opened', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Open Menu'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('renders menu items', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });

    it('supports defaultOpen prop', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Opening and Closing', () => {
    it('opens menu on trigger click', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Open Menu'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('closes menu on second trigger click', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      fireEvent.click(trigger);
      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.click(trigger);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('closes menu on escape key', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('calls onOpenChange when opened', () => {
      const onOpenChange = vi.fn();
      render(
        <DropdownMenu onOpenChange={onOpenChange}>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Open Menu'));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it('calls onOpenChange when closed', () => {
      const onOpenChange = vi.fn();
      render(
        <DropdownMenu defaultOpen onOpenChange={onOpenChange}>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Open Menu'));
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('supports controlled open state', () => {
      const Controlled = () => {
        const [open, setOpen] = React.useState(false);
        return (
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      };

      render(<Controlled />);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Open Menu'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  describe('Menu Items', () => {
    it('calls onClick when item is clicked', () => {
      const onClick = vi.fn();
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onClick}>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(onClick).toHaveBeenCalled();
    });

    it('closes menu when item is clicked', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Item 1'));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('does not close menu when closeOnClick is false', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem closeOnClick={false}>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Item 1'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('renders item with icon', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem icon={<span data-testid="icon">🎨</span>}>
              Item with Icon
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders item with shortcut', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem shortcut="⌘K">Item with Shortcut</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByText('⌘K')).toBeInTheDocument();
    });

    it('applies destructive styling', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem destructive>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      // The text is inside a span, we need to get the button (parent)
      const itemButton = screen.getByText('Delete').closest('button');
      expect(itemButton).toHaveClass('text-destructive');
    });

    it('disables item when disabled prop is true', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Disabled Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const item = screen.getByText('Disabled Item');
      expect(item.closest('button')).toBeDisabled();
    });
  });

  describe('DropdownMenuTrigger', () => {
    it('has correct aria attributes when closed', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('has correct aria attributes when open', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('opens menu on Enter key', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('opens menu on Space key', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      fireEvent.keyDown(trigger, { key: ' ' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('opens menu on ArrowDown key', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('disables trigger when disabled prop is true', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger disabled>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      expect(trigger).toBeDisabled();
    });
  });

  describe('DropdownMenuContent', () => {
    it('has role="menu"', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('closes on click outside', async () => {
      render(
        <div>
          <button>Outside</button>
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();

      fireEvent.pointerDown(screen.getByText('Outside'));
      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('applies align prop', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const content = screen.getByRole('menu');
      expect(content).toHaveAttribute('data-align', 'end');
    });

    it('applies side prop', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent side="top">
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const content = screen.getByRole('menu');
      expect(content).toHaveAttribute('data-side', 'top');
    });
  });

  describe('DropdownMenuLabel', () => {
    it('renders label text', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuItem>Profile</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-menu-label')).toHaveTextContent('My Account');
    });

    it('applies inset prop', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel inset>Inset Label</DropdownMenuLabel>
            <DropdownMenuItem>Item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const label = screen.getByTestId('dropdown-menu-label');
      expect(label).toHaveClass('pl-8');
    });
  });

  describe('DropdownMenuSeparator', () => {
    it('renders separator', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-menu-separator')).toBeInTheDocument();
    });

    it('has separator role', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('separator')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuGroup', () => {
    it('renders group', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
              <DropdownMenuItem>Item 2</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-menu-group')).toBeInTheDocument();
    });

    it('has group role', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem>Item 1</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });

  describe('DropdownMenuCheckboxItem', () => {
    it('renders checkbox item', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false}>Show Status Bar</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-menu-checkbox-item')).toBeInTheDocument();
    });

    it('has menuitemcheckbox role', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false}>Show Status Bar</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('menuitemcheckbox')).toBeInTheDocument();
    });

    it('shows check when checked', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={true}>Show Status Bar</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const item = screen.getByRole('menuitemcheckbox');
      expect(item).toHaveAttribute('aria-checked', 'true');
      expect(item).toHaveAttribute('data-state', 'checked');
    });

    it('calls onCheckedChange when clicked', () => {
      const onCheckedChange = vi.fn();
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked={false} onCheckedChange={onCheckedChange}>
              Show Status Bar
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Show Status Bar'));
      expect(onCheckedChange).toHaveBeenCalledWith(true);
    });

    it('toggles checked state', () => {
      const Controlled = () => {
        const [checked, setChecked] = React.useState(false);
        return (
          <DropdownMenu defaultOpen>
            <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>
                Toggle Me
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      };

      render(<Controlled />);

      const item = screen.getByRole('menuitemcheckbox');
      expect(item).toHaveAttribute('data-state', 'unchecked');

      fireEvent.click(screen.getByText('Toggle Me'));
      expect(item).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('DropdownMenuRadioGroup', () => {
    it('renders radio group', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1">
              <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-menu-radio-group')).toBeInTheDocument();
    });

    it('renders radio items', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1">
              <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getAllByRole('menuitemradio')).toHaveLength(2);
    });

    it('shows selected radio item', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option2">
              <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const items = screen.getAllByRole('menuitemradio');
      expect(items[0]).toHaveAttribute('aria-checked', 'false');
      expect(items[1]).toHaveAttribute('aria-checked', 'true');
    });

    it('calls onValueChange when radio is clicked', () => {
      const onValueChange = vi.fn();
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value="option1" onValueChange={onValueChange}>
              <DropdownMenuRadioItem value="option1">Option 1</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">Option 2</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.click(screen.getByText('Option 2'));
      expect(onValueChange).toHaveBeenCalledWith('option2');
    });
  });

  describe('DropdownMenuShortcut', () => {
    it('renders shortcut', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-menu-shortcut')).toHaveTextContent('⌘S');
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates with ArrowDown', async () => {
      const user = userEvent.setup();
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
            <DropdownMenuItem>Item 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      // Wait for initial focus (requestAnimationFrame used in component)
      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Item 1');
      });

      // Use userEvent for better keyboard simulation
      await user.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Item 2');
      });
    });

    it('navigates with ArrowUp', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
            <DropdownMenuItem>Item 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'ArrowUp' });

      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Item 3');
      });
    });

    it('wraps to first item at end', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const menu = screen.getByRole('menu');

      // Move to second item
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      // Move to first (wrap)
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Item 1');
      });
    });

    it('navigates to first with Home key', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
            <DropdownMenuItem>Item 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'Home' });

      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Item 1');
      });
    });

    it('navigates to last with End key', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
            <DropdownMenuItem>Item 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'End' });

      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Item 3');
      });
    });

    it('closes on Tab key', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'Tab' });

      await waitFor(() => {
        expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      });
    });

    it('disabled items are not focusable during navigation', async () => {
      // This test verifies the behavior that disabled items are excluded
      // from keyboard navigation by checking that only enabled items
      // can receive focus when the menu opens
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem disabled>Item 1 (Disabled)</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
            <DropdownMenuItem>Item 3</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      // When menu opens, it should focus the first ENABLED item (Item 2),
      // not the first item overall (disabled Item 1)
      await waitFor(() => {
        expect(document.activeElement).toHaveTextContent('Item 2');
      });

      // Verify disabled item is marked correctly
      const disabledItem = screen.getByText('Item 1 (Disabled)').closest('button');
      expect(disabledItem).toHaveAttribute('data-disabled', 'true');
      expect(disabledItem).toBeDisabled();
    });
  });

  describe('Submenu', () => {
    it('renders submenu trigger', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByTestId('dropdown-menu-sub-trigger')).toBeInTheDocument();
    });

    it('opens submenu on hover', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      fireEvent.mouseEnter(screen.getByTestId('dropdown-menu-sub-trigger'));

      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu-sub-content')).toBeInTheDocument();
      });
    });

    it('opens submenu on ArrowRight key', async () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>More Options</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Sub Item 1</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const subTrigger = screen.getByTestId('dropdown-menu-sub-trigger');
      fireEvent.keyDown(subTrigger, { key: 'ArrowRight' });

      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu-sub-content')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('trigger has aria-haspopup', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByText('Open Menu')).toHaveAttribute('aria-haspopup', 'menu');
    });

    it('menu items have menuitem role', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('menuitem')).toBeInTheDocument();
    });

    it('content has vertical orientation', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByRole('menu')).toHaveAttribute('aria-orientation', 'vertical');
    });

    it('trigger aria-controls points to content id', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      const content = screen.getByRole('menu');
      expect(trigger).toHaveAttribute('aria-controls', content.id);
    });

    it('content aria-labelledby points to trigger id', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');
      const content = screen.getByRole('menu');
      expect(content).toHaveAttribute('aria-labelledby', trigger.id);
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid open/close', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      const trigger = screen.getByText('Open Menu');

      for (let i = 0; i < 10; i++) {
        fireEvent.click(trigger);
      }

      // Should be closed after even number of clicks
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('handles empty content', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent />
        </DropdownMenu>
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('handles many items', () => {
      const items = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}`);

      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            {items.map((item) => (
              <DropdownMenuItem key={item}>{item}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getAllByRole('menuitem')).toHaveLength(50);
    });

    it('handles special characters in item text', () => {
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>{"<script>alert('XSS')</script>"}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );

      expect(screen.getByText("<script>alert('XSS')</script>")).toBeInTheDocument();
    });
  });
});
