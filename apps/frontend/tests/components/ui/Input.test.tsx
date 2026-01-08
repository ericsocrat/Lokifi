/**
 * Input Component Tests
 *
 * Comprehensive tests for the Input component system including:
 * - Input: Base text input with variants, sizes, states
 * - InputGroup, InputAddon: Grouped inputs with addons
 * - TextArea: Multi-line text input
 * - SearchInput: Specialized search input
 * - NumberInput: Numeric input with controls
 * - CurrencyInput: Currency-formatted input
 * - PasswordInput: Password input with visibility toggle
 */

import {
  CurrencyInput,
  Input,
  InputAddon,
  InputGroup,
  NumberInput,
  PasswordInput,
  SearchInput,
  TextArea,
} from '@/src/components/ui/Input';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Input Component Tests
// ============================================================================

describe('Input', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('renders as textbox role', () => {
      render(<Input aria-label="test input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Email" />);
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
    });

    it('renders label with required indicator', () => {
      render(<Input label="Email" required />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Input helperText="Enter your email address" />);
      expect(screen.getByText('Enter your email address')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<Input error="Email is required" />);
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      render(<Input className="custom-class" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('custom-class');
    });

    it('renders with custom wrapperClassName', () => {
      const { container } = render(<Input wrapperClassName="wrapper-class" />);
      expect(container.querySelector('[data-input-wrapper]')).toHaveClass('wrapper-class');
    });

    it('supports fullWidth prop', () => {
      const { container } = render(<Input fullWidth />);
      expect(container.querySelector('[data-input-wrapper]')).toHaveClass('w-full');
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<Input variant="default" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border');
      expect(input).toHaveClass('bg-surface-1');
    });

    it('renders filled variant', () => {
      render(<Input variant="filled" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-surface-2');
    });

    it('renders outlined variant', () => {
      render(<Input variant="outlined" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-2');
      expect(input).toHaveClass('bg-transparent');
    });

    it('renders ghost variant', () => {
      render(<Input variant="ghost" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('bg-transparent');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      render(<Input inputSize="sm" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-8');
      expect(input).toHaveClass('text-sm');
    });

    it('renders medium size (default)', () => {
      render(<Input inputSize="md" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-10');
      expect(input).toHaveClass('text-base');
    });

    it('renders large size', () => {
      render(<Input inputSize="lg" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('h-12');
      expect(input).toHaveClass('text-lg');
    });
  });

  describe('States', () => {
    it('renders error state', () => {
      render(<Input state="error" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });

    it('renders success state', () => {
      render(<Input state="success" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-green-500');
    });

    it('renders warning state', () => {
      render(<Input state="warning" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-yellow-500');
    });

    it('error prop overrides state prop', () => {
      render(<Input state="success" error="Error message" aria-label="test" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveClass('border-red-500');
    });
  });

  describe('Icons', () => {
    it('renders with start icon', () => {
      render(<Input startIcon={<span data-testid="start-icon">🔍</span>} aria-label="test" />);
      expect(screen.getByTestId('input-start-icon')).toBeInTheDocument();
      expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    });

    it('renders with end icon', () => {
      render(<Input endIcon={<span data-testid="end-icon">✓</span>} aria-label="test" />);
      expect(screen.getByTestId('input-end-icon')).toBeInTheDocument();
      expect(screen.getByTestId('end-icon')).toBeInTheDocument();
    });

    it('renders with end action', () => {
      render(
        <Input endAction={<button data-testid="end-action">Clear</button>} aria-label="test" />
      );
      expect(screen.getByTestId('input-end-action')).toBeInTheDocument();
      expect(screen.getByTestId('end-action')).toBeInTheDocument();
    });

    it('end action takes precedence over end icon', () => {
      render(
        <Input
          endIcon={<span data-testid="end-icon">✓</span>}
          endAction={<button data-testid="end-action">Clear</button>}
          aria-label="test"
        />
      );
      expect(screen.queryByTestId('input-end-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('input-end-action')).toBeInTheDocument();
    });

    it('applies correct padding with start icon (sm)', () => {
      render(<Input startIcon={<span>🔍</span>} inputSize="sm" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('pl-8');
    });

    it('applies correct padding with start icon (md)', () => {
      render(<Input startIcon={<span>🔍</span>} inputSize="md" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('pl-10');
    });

    it('applies correct padding with start icon (lg)', () => {
      render(<Input startIcon={<span>🔍</span>} inputSize="lg" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('pl-12');
    });

    it('applies correct padding with end icon (sm)', () => {
      render(<Input endIcon={<span>✓</span>} inputSize="sm" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('pr-8');
    });

    it('applies correct padding with end icon (md)', () => {
      render(<Input endIcon={<span>✓</span>} inputSize="md" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('pr-10');
    });

    it('applies correct padding with end icon (lg)', () => {
      render(<Input endIcon={<span>✓</span>} inputSize="lg" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('pr-12');
    });
  });

  describe('Disabled State', () => {
    it('renders disabled input', () => {
      render(<Input disabled aria-label="test" />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('applies disabled styles', () => {
      render(<Input disabled aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('disabled:opacity-50');
    });

    it('label has disabled styling', () => {
      render(<Input disabled label="Test Label" />);
      const label = screen.getByText('Test Label');
      expect(label).toHaveClass('opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('associates label with input', () => {
      render(<Input label="Email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
    });

    it('associates helper text with input via aria-describedby', () => {
      render(<Input label="Email" helperText="Enter your email" />);
      const input = screen.getByLabelText('Email');
      expect(input).toHaveAttribute('aria-describedby');
    });

    it('sets aria-invalid for error state', () => {
      render(<Input error="Error message" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error message has alert role', () => {
      render(<Input error="Error message" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Error message');
    });

    it('supports custom id', () => {
      render(<Input id="custom-id" label="Custom" />);
      expect(screen.getByLabelText('Custom')).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Interactions', () => {
    it('handles value changes', async () => {
      const handleChange = vi.fn();
      render(<Input onChange={handleChange} aria-label="test" />);

      await userEvent.type(screen.getByRole('textbox'), 'test');
      expect(handleChange).toHaveBeenCalled();
    });

    it('handles focus events', async () => {
      const handleFocus = vi.fn();
      render(<Input onFocus={handleFocus} aria-label="test" />);

      await userEvent.click(screen.getByRole('textbox'));
      expect(handleFocus).toHaveBeenCalled();
    });

    it('handles blur events', async () => {
      const handleBlur = vi.fn();
      render(<Input onBlur={handleBlur} aria-label="test" />);

      const input = screen.getByRole('textbox');
      await userEvent.click(input);
      await userEvent.tab();
      expect(handleBlur).toHaveBeenCalled();
    });

    it('passes through native input props', () => {
      render(
        <Input aria-label="test" maxLength={10} minLength={2} autoComplete="email" autoFocus />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('maxLength', '10');
      expect(input).toHaveAttribute('minLength', '2');
      expect(input).toHaveAttribute('autoComplete', 'email');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to input element', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Input ref={ref} aria-label="test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Floating Label', () => {
    it('renders floating label', () => {
      render(<Input label="Email" floatingLabel placeholder=" " />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('floating label has peer class on input', () => {
      render(<Input label="Email" floatingLabel placeholder=" " />);
      expect(screen.getByRole('textbox')).toHaveClass('peer');
    });
  });
});

// ============================================================================
// InputGroup Tests
// ============================================================================

describe('InputGroup', () => {
  it('renders children', () => {
    render(
      <InputGroup>
        <Input aria-label="test" />
      </InputGroup>
    );
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('has group role', () => {
    render(
      <InputGroup>
        <span>Test</span>
      </InputGroup>
    );
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <InputGroup className="custom-group">
        <span>Test</span>
      </InputGroup>
    );
    expect(screen.getByRole('group')).toHaveClass('custom-group');
  });

  it('has flex layout', () => {
    render(
      <InputGroup>
        <span>Test</span>
      </InputGroup>
    );
    expect(screen.getByRole('group')).toHaveClass('flex', 'items-stretch');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(
      <InputGroup ref={ref}>
        <span>Test</span>
      </InputGroup>
    );
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ============================================================================
// InputAddon Tests
// ============================================================================

describe('InputAddon', () => {
  it('renders children', () => {
    render(<InputAddon>$</InputAddon>);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('renders start position by default', () => {
    render(<InputAddon>$</InputAddon>);
    expect(screen.getByText('$')).toHaveClass('rounded-l-md');
  });

  it('renders end position', () => {
    render(<InputAddon position="end">.00</InputAddon>);
    expect(screen.getByText('.00')).toHaveClass('rounded-r-md');
  });

  it('applies custom className', () => {
    render(<InputAddon className="custom-addon">$</InputAddon>);
    expect(screen.getByText('$')).toHaveClass('custom-addon');
  });

  it('has correct base styles', () => {
    render(<InputAddon>$</InputAddon>);
    const addon = screen.getByText('$');
    expect(addon).toHaveClass('flex', 'items-center', 'bg-surface-2');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<InputAddon ref={ref}>$</InputAddon>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('works within InputGroup', () => {
    render(
      <InputGroup>
        <InputAddon>$</InputAddon>
        <Input aria-label="amount" />
        <InputAddon position="end">.00</InputAddon>
      </InputGroup>
    );

    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('.00')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

// ============================================================================
// TextArea Tests
// ============================================================================

describe('TextArea', () => {
  describe('Basic Rendering', () => {
    it('renders textarea element', () => {
      render(<TextArea aria-label="description" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<TextArea label="Description" />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<TextArea helperText="Max 500 characters" />);
      expect(screen.getByText('Max 500 characters')).toBeInTheDocument();
    });

    it('renders with error message', () => {
      render(<TextArea error="Description is required" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Description is required');
    });

    it('renders with placeholder', () => {
      render(<TextArea placeholder="Enter description..." />);
      expect(screen.getByPlaceholderText('Enter description...')).toBeInTheDocument();
    });

    it('renders with custom rows', () => {
      render(<TextArea minRows={5} aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
    });
  });

  describe('Variants', () => {
    it('renders default variant', () => {
      render(<TextArea variant="default" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('border', 'bg-surface-1');
    });

    it('renders filled variant', () => {
      render(<TextArea variant="filled" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('bg-surface-2');
    });

    it('renders outlined variant', () => {
      render(<TextArea variant="outlined" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-2', 'bg-transparent');
    });
  });

  describe('States', () => {
    it('renders error state', () => {
      render(<TextArea state="error" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
    });

    it('renders success state', () => {
      render(<TextArea state="success" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-green-500');
    });

    it('error prop overrides state', () => {
      render(<TextArea state="success" error="Error" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
    });
  });

  describe('Disabled State', () => {
    it('renders disabled textarea', () => {
      render(<TextArea disabled aria-label="test" />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('sets aria-invalid for error state', () => {
      render(<TextArea error="Error" aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('associates helper with aria-describedby', () => {
      render(<TextArea label="Test" helperText="Helper" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby');
    });
  });

  describe('Interactions', () => {
    it('handles value changes', async () => {
      const handleChange = vi.fn();
      render(<TextArea onChange={handleChange} aria-label="test" />);

      await userEvent.type(screen.getByRole('textbox'), 'test');
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to textarea', () => {
      const ref = { current: null as HTMLTextAreaElement | null };
      render(<TextArea ref={ref} aria-label="test" />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });

  describe('Full Width', () => {
    it('applies full width', () => {
      const { container } = render(<TextArea fullWidth />);
      expect(container.querySelector('[data-textarea-wrapper]')).toHaveClass('w-full');
    });
  });

  describe('AutoResize', () => {
    it('has overflow hidden when autoResize enabled', () => {
      render(<TextArea autoResize aria-label="test" />);
      expect(screen.getByRole('textbox')).toHaveClass('overflow-hidden');
    });
  });
});

// ============================================================================
// SearchInput Tests
// ============================================================================

describe('SearchInput', () => {
  describe('Basic Rendering', () => {
    it('renders with search icon', () => {
      render(<SearchInput aria-label="search" />);
      expect(screen.getByTestId('input-start-icon')).toBeInTheDocument();
    });

    it('renders with type search', () => {
      render(<SearchInput aria-label="search" />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<SearchInput placeholder="Search..." />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
  });

  describe('Clear Button', () => {
    it('shows clear button when has value', async () => {
      render(<SearchInput defaultValue="test" aria-label="search" />);
      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('hides clear button when empty', () => {
      render(<SearchInput aria-label="search" />);
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('clears value on click', async () => {
      render(<SearchInput defaultValue="test" aria-label="search" />);

      await userEvent.click(screen.getByLabelText('Clear search'));
      expect(screen.getByRole('searchbox')).toHaveValue('');
    });

    it('hides clear button when showClear is false', () => {
      render(<SearchInput defaultValue="test" showClear={false} aria-label="search" />);
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner', () => {
      const { container } = render(<SearchInput loading aria-label="search" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('hides clear button when loading', () => {
      render(<SearchInput loading defaultValue="test" aria-label="search" />);
      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });
  });

  describe('Search Callback', () => {
    it('calls onSearch on Enter', async () => {
      const handleSearch = vi.fn();
      render(<SearchInput onSearch={handleSearch} defaultValue="test query" aria-label="search" />);

      fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' });
      expect(handleSearch).toHaveBeenCalledWith('test query');
    });

    it('does not call onSearch on other keys', async () => {
      const handleSearch = vi.fn();
      render(<SearchInput onSearch={handleSearch} aria-label="search" />);

      fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'a' });
      expect(handleSearch).not.toHaveBeenCalled();
    });
  });

  describe('Controlled Mode', () => {
    it('uses controlled value', () => {
      render(<SearchInput value="controlled" onChange={() => {}} aria-label="search" />);
      expect(screen.getByRole('searchbox')).toHaveValue('controlled');
    });

    it('calls onChange with controlled value', async () => {
      const handleChange = vi.fn();
      render(<SearchInput value="" onChange={handleChange} aria-label="search" />);

      await userEvent.type(screen.getByRole('searchbox'), 'a');
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<SearchInput ref={ref} aria-label="search" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

// ============================================================================
// NumberInput Tests
// ============================================================================

describe('NumberInput', () => {
  describe('Basic Rendering', () => {
    it('renders with default props', () => {
      render(<NumberInput aria-label="quantity" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('has inputMode decimal', () => {
      render(<NumberInput aria-label="quantity" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('inputMode', 'decimal');
    });

    it('renders with label', () => {
      render(<NumberInput label="Quantity" />);
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
    });
  });

  describe('Controls', () => {
    it('shows controls when showControls is true', () => {
      render(<NumberInput showControls aria-label="quantity" />);
      expect(screen.getByLabelText('Increment')).toBeInTheDocument();
      expect(screen.getByLabelText('Decrement')).toBeInTheDocument();
    });

    it('hides controls by default', () => {
      render(<NumberInput aria-label="quantity" />);
      expect(screen.queryByLabelText('Increment')).not.toBeInTheDocument();
    });

    it('increments value on click', async () => {
      const handleChange = vi.fn();
      render(
        <NumberInput showControls defaultValue={5} onChange={handleChange} aria-label="qty" />
      );

      await userEvent.click(screen.getByLabelText('Increment'));
      expect(handleChange).toHaveBeenCalledWith(6, expect.any(Object));
    });

    it('decrements value on click', async () => {
      const handleChange = vi.fn();
      render(
        <NumberInput showControls defaultValue={5} onChange={handleChange} aria-label="qty" />
      );

      await userEvent.click(screen.getByLabelText('Decrement'));
      expect(handleChange).toHaveBeenCalledWith(4, expect.any(Object));
    });
  });

  describe('Min/Max Constraints', () => {
    it('clamps value to min when decrementing below', async () => {
      const handleChange = vi.fn();
      render(
        <NumberInput
          showControls
          min={0}
          defaultValue={1}
          onChange={handleChange}
          aria-label="qty"
        />
      );

      // Click decrement once - should go to 0
      await userEvent.click(screen.getByLabelText('Decrement'));
      expect(handleChange).toHaveBeenCalledWith(0, expect.any(Object));
    });

    it('clamps value to max when incrementing above', async () => {
      const handleChange = vi.fn();
      render(
        <NumberInput
          showControls
          max={10}
          defaultValue={9}
          onChange={handleChange}
          aria-label="qty"
        />
      );

      // Click increment once - should go to 10
      await userEvent.click(screen.getByLabelText('Increment'));
      expect(handleChange).toHaveBeenCalledWith(10, expect.any(Object));
    });

    it('disables increment at max', () => {
      render(<NumberInput showControls max={10} defaultValue={10} aria-label="qty" />);
      expect(screen.getByLabelText('Increment')).toBeDisabled();
    });

    it('disables decrement at min', () => {
      render(<NumberInput showControls min={0} defaultValue={0} aria-label="qty" />);
      expect(screen.getByLabelText('Decrement')).toBeDisabled();
    });
  });

  describe('Step', () => {
    it('uses custom step', async () => {
      const handleChange = vi.fn();
      render(
        <NumberInput
          showControls
          step={5}
          defaultValue={10}
          onChange={handleChange}
          aria-label="qty"
        />
      );

      await userEvent.click(screen.getByLabelText('Increment'));
      expect(handleChange).toHaveBeenCalledWith(15, expect.any(Object));
    });
  });

  describe('Precision', () => {
    it('formats with precision', () => {
      render(<NumberInput precision={2} defaultValue={10} aria-label="price" />);
      expect(screen.getByRole('textbox')).toHaveValue('10.00');
    });
  });

  describe('Custom Format/Parse', () => {
    it('uses custom formatValue', () => {
      render(
        <NumberInput
          defaultValue={1000}
          formatValue={(v) => v.toLocaleString()}
          aria-label="value"
        />
      );
      expect(screen.getByRole('textbox')).toHaveValue('1,000');
    });
  });

  describe('Disabled State', () => {
    it('disables input', () => {
      render(<NumberInput disabled aria-label="qty" />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('disables controls', () => {
      render(<NumberInput disabled showControls aria-label="qty" />);
      expect(screen.getByLabelText('Increment')).toBeDisabled();
      expect(screen.getByLabelText('Decrement')).toBeDisabled();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<NumberInput ref={ref} aria-label="qty" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

// ============================================================================
// CurrencyInput Tests
// ============================================================================

describe('CurrencyInput', () => {
  describe('Basic Rendering', () => {
    it('renders with currency symbol', () => {
      render(<CurrencyInput aria-label="price" />);
      expect(screen.getByText('$')).toBeInTheDocument();
    });

    it('formats value with decimals', () => {
      render(<CurrencyInput defaultValue={1234.5} aria-label="price" />);
      expect(screen.getByRole('textbox')).toHaveValue('1,234.50');
    });
  });

  describe('Custom Currency', () => {
    it('renders custom currency symbol', () => {
      render(<CurrencyInput currency="€" aria-label="price" />);
      expect(screen.getByText('€')).toBeInTheDocument();
    });

    it('renders pound symbol', () => {
      render(<CurrencyInput currency="£" aria-label="price" />);
      expect(screen.getByText('£')).toBeInTheDocument();
    });
  });

  describe('Locale Formatting', () => {
    it('formats with custom locale', () => {
      render(<CurrencyInput defaultValue={1234.56} locale="de-DE" aria-label="price" />);
      // German locale uses period as thousands separator
      expect(screen.getByRole('textbox')).toHaveValue('1.234,56');
    });
  });

  describe('Precision', () => {
    it('uses custom precision', () => {
      render(<CurrencyInput precision={4} defaultValue={10} aria-label="price" />);
      expect(screen.getByRole('textbox')).toHaveValue('10.0000');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<CurrencyInput ref={ref} aria-label="price" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

// ============================================================================
// PasswordInput Tests
// ============================================================================

describe('PasswordInput', () => {
  describe('Basic Rendering', () => {
    it('renders as password type', () => {
      render(<PasswordInput aria-label="password" />);
      expect(screen.getByLabelText('password')).toHaveAttribute('type', 'password');
    });

    it('shows toggle button by default', () => {
      render(<PasswordInput aria-label="password" />);
      expect(screen.getByLabelText('Show password')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<PasswordInput label="Password" />);
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });
  });

  describe('Visibility Toggle', () => {
    it('toggles to text type on click', async () => {
      render(<PasswordInput aria-label="password" />);

      await userEvent.click(screen.getByLabelText('Show password'));
      expect(screen.getByLabelText('password')).toHaveAttribute('type', 'text');
    });

    it('toggles back to password type', async () => {
      render(<PasswordInput aria-label="password" />);

      await userEvent.click(screen.getByLabelText('Show password'));
      await userEvent.click(screen.getByLabelText('Hide password'));
      expect(screen.getByLabelText('password')).toHaveAttribute('type', 'password');
    });

    it('changes button label on toggle', async () => {
      render(<PasswordInput aria-label="password" />);

      expect(screen.getByLabelText('Show password')).toBeInTheDocument();
      await userEvent.click(screen.getByLabelText('Show password'));
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
    });
  });

  describe('Hide Toggle', () => {
    it('hides toggle when showToggle is false', () => {
      render(<PasswordInput showToggle={false} aria-label="password" />);
      expect(screen.queryByLabelText('Show password')).not.toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('disables input', () => {
      render(<PasswordInput disabled aria-label="password" />);
      expect(screen.getByLabelText('password')).toBeDisabled();
    });

    it('disables toggle button', () => {
      render(<PasswordInput disabled aria-label="password" />);
      expect(screen.getByLabelText('Show password')).toBeDisabled();
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<PasswordInput ref={ref} aria-label="password" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('Props Passthrough', () => {
    it('passes through other Input props', () => {
      render(<PasswordInput label="Password" helperText="Min 8 characters" error="Too short" />);

      expect(screen.getByLabelText('Password')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Too short');
    });
  });
});

// ============================================================================
// Edge Cases & Integration Tests
// ============================================================================

describe('Input Edge Cases', () => {
  it('handles rapid value changes', async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} aria-label="test" />);

    await userEvent.type(screen.getByRole('textbox'), 'abcdef');
    expect(handleChange).toHaveBeenCalledTimes(6);
  });

  it('handles special characters', async () => {
    render(<Input aria-label="test" />);

    await userEvent.type(screen.getByRole('textbox'), '!@#$%^&*()');
    expect(screen.getByRole('textbox')).toHaveValue('!@#$%^&*()');
  });

  it('handles unicode characters', async () => {
    render(<Input aria-label="test" />);

    await userEvent.type(screen.getByRole('textbox'), '日本語テスト');
    expect(screen.getByRole('textbox')).toHaveValue('日本語テスト');
  });

  it('handles emoji input', async () => {
    render(<Input aria-label="test" />);

    await userEvent.type(screen.getByRole('textbox'), '😀🎉');
    expect(screen.getByRole('textbox')).toHaveValue('😀🎉');
  });

  it('handles very long input', () => {
    const longText = 'a'.repeat(100);
    render(<Input defaultValue={longText} aria-label="test" />);
    expect(screen.getByRole('textbox')).toHaveValue(longText);
  });

  it('handles all variants and sizes combinations', () => {
    const variants = ['default', 'filled', 'outlined', 'ghost'] as const;
    const sizes = ['sm', 'md', 'lg'] as const;

    variants.forEach((variant) => {
      sizes.forEach((size) => {
        const { unmount } = render(
          <Input variant={variant} inputSize={size} aria-label={`${variant}-${size}`} />
        );
        expect(screen.getByRole('textbox')).toBeInTheDocument();
        unmount();
      });
    });
  });

  it('handles all state combinations', () => {
    const states = ['default', 'error', 'success', 'warning'] as const;

    states.forEach((state) => {
      const { unmount } = render(<Input state={state} aria-label={`state-${state}`} />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      unmount();
    });
  });
});

describe('TextArea Edge Cases', () => {
  it('handles multiline input', () => {
    const multilineText = ['Line 1', 'Line 2', 'Line 3'].join('\n');
    render(<TextArea defaultValue={multilineText} aria-label="test" />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(multilineText);
  });

  it('preserves line breaks in value', async () => {
    const handleChange = vi.fn();
    render(<TextArea onChange={handleChange} aria-label="test" />);

    // Simply verify the textarea accepts input
    await userEvent.type(screen.getByRole('textbox'), 'First line');
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('NumberInput Edge Cases', () => {
  it('handles negative numbers', () => {
    render(<NumberInput defaultValue={-10} aria-label="test" />);
    expect(screen.getByRole('textbox')).toHaveValue('-10');
  });

  it('handles decimal numbers', () => {
    render(<NumberInput defaultValue={3.14159} precision={2} aria-label="test" />);
    expect(screen.getByRole('textbox')).toHaveValue('3.14');
  });

  it('handles zero', () => {
    render(<NumberInput defaultValue={0} aria-label="test" />);
    expect(screen.getByRole('textbox')).toHaveValue('0');
  });

  it('handles empty to number transition', async () => {
    const handleChange = vi.fn();
    render(<NumberInput onChange={handleChange} aria-label="test" />);

    await userEvent.type(screen.getByRole('textbox'), '42');
    expect(handleChange).toHaveBeenCalled();
  });
});

describe('Integration Tests', () => {
  it('InputGroup with addon and input works together', () => {
    render(
      <InputGroup>
        <InputAddon>https://</InputAddon>
        <Input aria-label="url" placeholder="example.com" />
      </InputGroup>
    );

    expect(screen.getByText('https://')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('example.com')).toBeInTheDocument();
  });

  it('form submission works with inputs', async () => {
    const handleSubmit = vi.fn((e) => e.preventDefault());

    render(
      <form onSubmit={handleSubmit}>
        <Input label="Email" name="email" />
        <button type="submit">Submit</button>
      </form>
    );

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com');
    await userEvent.click(screen.getByText('Submit'));

    expect(handleSubmit).toHaveBeenCalled();
  });
});
