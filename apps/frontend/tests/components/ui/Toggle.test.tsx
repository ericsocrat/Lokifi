import { Toggle } from '@/components/ui/Toggle';
import { fireEvent, render, screen, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('Toggle', () => {
  describe('Basic Rendering', () => {
    it('renders without label', () => {
      render(<Toggle data-testid="toggle" />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Toggle label="Enable notifications" data-testid="toggle" />);
      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    });

    it('renders with label and description', () => {
      render(
        <Toggle
          label="Dark mode"
          description="Use dark theme throughout the app"
          data-testid="toggle"
        />
      );
      expect(screen.getByText('Dark mode')).toBeInTheDocument();
      expect(screen.getByText('Use dark theme throughout the app')).toBeInTheDocument();
    });

    it('renders label on the left when labelPosition is left', () => {
      render(<Toggle label="Test Label" labelPosition="left" data-testid="toggle" />);
      const container = screen.getByTestId('toggle-container');
      const label = screen.getByText('Test Label');
      // toggle element exists but we only need to verify label position
      screen.getByRole('switch');

      // Check that both exist and label comes before toggle in DOM
      expect(container.firstChild).toContainElement(label);
    });

    it('renders label on the right by default', () => {
      render(<Toggle label="Test Label" data-testid="toggle" />);
      const toggle = screen.getByRole('switch');
      const label = screen.getByText('Test Label');

      // Toggle should come before label in the DOM when label is on the right
      expect(toggle.compareDocumentPosition(label)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('Controlled Mode', () => {
    it('reflects checked prop as true', () => {
      render(<Toggle checked={true} data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('reflects checked prop as false', () => {
      render(<Toggle checked={false} data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onChange with new value when clicked', () => {
      const handleChange = vi.fn();
      render(<Toggle checked={false} onChange={handleChange} data-testid="toggle" />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('calls onChange with false when unchecking', () => {
      const handleChange = vi.fn();
      render(<Toggle checked={true} onChange={handleChange} data-testid="toggle" />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Uncontrolled Mode', () => {
    it('uses defaultChecked for initial state', () => {
      render(<Toggle defaultChecked={true} data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('defaults to unchecked when no defaultChecked', () => {
      render(<Toggle data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    });

    it('calls onChange when toggled in uncontrolled mode', () => {
      const handleChange = vi.fn();
      render(<Toggle onChange={handleChange} data-testid="toggle" />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });
  });

  describe('Disabled State', () => {
    it('renders as disabled', () => {
      render(<Toggle disabled data-testid="toggle" />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('does not call onChange when disabled', () => {
      const handleChange = vi.fn();
      render(<Toggle disabled onChange={handleChange} data-testid="toggle" />);

      fireEvent.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('shows disabled label styling', () => {
      render(<Toggle disabled label="Disabled toggle" data-testid="toggle" />);
      expect(screen.getByText('Disabled toggle')).toHaveClass('text-gray-500');
    });

    it('shows disabled description styling', () => {
      render(<Toggle disabled label="Toggle" description="Description" data-testid="toggle" />);
      expect(screen.getByText('Description')).toHaveClass('text-gray-600');
    });

    it('has opacity-50 class when disabled', () => {
      render(<Toggle disabled data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('opacity-50');
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<Toggle size="sm" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('h-4', 'w-7');
    });

    it('renders medium size (default)', () => {
      render(<Toggle size="md" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('h-5', 'w-9');
    });

    it('renders large size', () => {
      render(<Toggle size="lg" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('h-6', 'w-11');
    });

    it('applies correct label size for sm', () => {
      render(<Toggle size="sm" label="Small" data-testid="toggle" />);
      expect(screen.getByText('Small')).toHaveClass('text-sm');
    });

    it('applies correct label size for lg', () => {
      render(<Toggle size="lg" label="Large" data-testid="toggle" />);
      expect(screen.getByText('Large')).toHaveClass('text-base');
    });
  });

  describe('Color Variants', () => {
    it('applies primary color when checked', () => {
      render(<Toggle checked color="primary" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-blue-600');
    });

    it('applies success color when checked', () => {
      render(<Toggle checked color="success" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-green-600');
    });

    it('applies warning color when checked', () => {
      render(<Toggle checked color="warning" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-yellow-500');
    });

    it('applies danger color when checked', () => {
      render(<Toggle checked color="danger" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-red-600');
    });

    it('applies gray background when unchecked', () => {
      render(<Toggle checked={false} data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('bg-gray-600');
    });
  });

  describe('Keyboard Interaction', () => {
    it('toggles on Enter key', () => {
      const handleChange = vi.fn();
      render(<Toggle onChange={handleChange} data-testid="toggle" />);

      fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('toggles on Space key', () => {
      const handleChange = vi.fn();
      render(<Toggle onChange={handleChange} data-testid="toggle" />);

      fireEvent.keyDown(screen.getByRole('switch'), { key: ' ' });
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('does not toggle on other keys', () => {
      const handleChange = vi.fn();
      render(<Toggle onChange={handleChange} data-testid="toggle" />);

      fireEvent.keyDown(screen.getByRole('switch'), { key: 'a' });
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('does not toggle via keyboard when disabled', () => {
      const handleChange = vi.fn();
      render(<Toggle disabled onChange={handleChange} data-testid="toggle" />);

      fireEvent.keyDown(screen.getByRole('switch'), { key: 'Enter' });
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has role="switch"', () => {
      render(<Toggle data-testid="toggle" />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('has aria-checked attribute', () => {
      render(<Toggle checked data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    });

    it('supports aria-label', () => {
      render(<Toggle aria-label="Custom label" data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Custom label');
    });

    it('supports aria-labelledby from external label', () => {
      render(
        <>
          <span id="external-label">External Label</span>
          <Toggle aria-labelledby="external-label" data-testid="toggle" />
        </>
      );
      expect(screen.getByRole('switch')).toHaveAttribute('aria-labelledby', 'external-label');
    });

    it('links label via aria-labelledby', () => {
      render(<Toggle label="My Label" data-testid="toggle" />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-labelledby');
    });

    it('links description via aria-describedby', () => {
      render(<Toggle label="Toggle" description="This is a description" data-testid="toggle" />);
      const toggle = screen.getByRole('switch');
      expect(toggle).toHaveAttribute('aria-describedby');
    });

    it('has aria-disabled when disabled', () => {
      render(<Toggle disabled data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Data Attributes', () => {
    it('has data-state="checked" when checked', () => {
      render(<Toggle checked data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'checked');
    });

    it('has data-state="unchecked" when unchecked', () => {
      render(<Toggle checked={false} data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveAttribute('data-state', 'unchecked');
    });

    it('supports data-testid', () => {
      render(<Toggle data-testid="my-toggle" />);
      expect(screen.getByTestId('my-toggle')).toBeInTheDocument();
    });
  });

  describe('Form Integration', () => {
    it('renders hidden input with name when provided', () => {
      const { container } = render(<Toggle name="notifications" checked data-testid="toggle" />);
      const hiddenInput = container.querySelector('input[type="hidden"]');
      expect(hiddenInput).toHaveAttribute('name', 'notifications');
      expect(hiddenInput).toHaveAttribute('value', 'on');
    });

    it('hidden input value is empty when unchecked', () => {
      const { container } = render(
        <Toggle name="notifications" checked={false} data-testid="toggle" />
      );
      const hiddenInput = container.querySelector('input[type="hidden"]');
      expect(hiddenInput).toHaveAttribute('value', '');
    });

    it('uses custom value when provided', () => {
      const { container } = render(
        <Toggle name="theme" value="dark" checked data-testid="toggle" />
      );
      const hiddenInput = container.querySelector('input[type="hidden"]');
      expect(hiddenInput).toHaveAttribute('value', 'dark');
    });
  });

  describe('Container Click', () => {
    it('toggles when clicking on the container with label', () => {
      const handleChange = vi.fn();
      render(<Toggle label="Click me" onChange={handleChange} data-testid="toggle" />);

      fireEvent.click(screen.getByTestId('toggle-container'));
      expect(handleChange).toHaveBeenCalledWith(true);
    });

    it('does not toggle container click when disabled', () => {
      const handleChange = vi.fn();
      render(<Toggle label="Click me" disabled onChange={handleChange} data-testid="toggle" />);

      fireEvent.click(screen.getByTestId('toggle-container'));
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom ClassName', () => {
    it('applies custom className to container', () => {
      render(<Toggle label="Test" className="custom-class" data-testid="toggle" />);
      expect(screen.getByTestId('toggle-container')).toHaveClass('custom-class');
    });

    it('applies custom className to wrapper without label', () => {
      render(<Toggle className="custom-class" data-testid="toggle" />);
      expect(screen.getByTestId('toggle-container')).toHaveClass('custom-class');
    });
  });

  describe('Focus Styling', () => {
    it('has focus-visible ring classes', () => {
      render(<Toggle data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Transition Classes', () => {
    it('has transition classes for smooth animation', () => {
      render(<Toggle data-testid="toggle" />);
      expect(screen.getByRole('switch')).toHaveClass('transition-colors');
    });
  });
});
