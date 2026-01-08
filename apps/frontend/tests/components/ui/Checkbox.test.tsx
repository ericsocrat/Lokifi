/**
 * Checkbox Component Tests
 *
 * Comprehensive tests for the Checkbox component system including:
 * - Checkbox: Base checkbox with variants, sizes, states
 * - CheckboxGroup: Group of related checkboxes
 * - CheckboxCard: Card-style checkbox
 * - useCheckboxGroup: Hook for managing group state
 */

import {
  Checkbox,
  CheckboxCard,
  CheckboxGroup,
  useCheckboxGroup,
} from '@/src/components/ui/Checkbox';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Checkbox Component Tests
// ============================================================================

describe('Checkbox', () => {
  describe('Basic Rendering', () => {
    it('renders checkbox input', () => {
      render(<Checkbox aria-label="test checkbox" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Checkbox label="Accept terms" />);
      expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(<Checkbox label="Notifications" description="Receive email updates" />);
      expect(screen.getByText('Receive email updates')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<Checkbox wrapperClassName="custom-wrapper" />);
      expect(container.firstChild).toHaveClass('custom-wrapper');
    });

    it('generates unique id when not provided', () => {
      render(<Checkbox label="Test" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('id');
    });

    it('uses provided id', () => {
      render(<Checkbox id="custom-id" label="Test" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<Checkbox size="sm" aria-label="test" />);
      expect(container.querySelector('div[aria-hidden="true"]')).toHaveClass('h-4', 'w-4');
    });

    it('renders medium size (default)', () => {
      const { container } = render(<Checkbox size="md" aria-label="test" />);
      expect(container.querySelector('div[aria-hidden="true"]')).toHaveClass('h-5', 'w-5');
    });

    it('renders large size', () => {
      const { container } = render(<Checkbox size="lg" aria-label="test" />);
      expect(container.querySelector('div[aria-hidden="true"]')).toHaveClass('h-6', 'w-6');
    });

    it('applies size to label text', () => {
      render(<Checkbox size="lg" label="Large label" />);
      expect(screen.getByText('Large label')).toHaveClass('text-lg');
    });
  });

  describe('Colors', () => {
    it('renders default color', () => {
      const { container } = render(<Checkbox color="default" aria-label="test" />);
      const customBox = container.querySelector('div[aria-hidden="true"]');
      expect(customBox).toHaveClass('focus:ring-electric-2');
    });

    it('renders primary color', () => {
      const { container } = render(<Checkbox color="primary" aria-label="test" />);
      const customBox = container.querySelector('div[aria-hidden="true"]');
      expect(customBox).toHaveClass('focus:ring-blue-500');
    });

    it('renders success color', () => {
      const { container } = render(<Checkbox color="success" aria-label="test" />);
      const customBox = container.querySelector('div[aria-hidden="true"]');
      expect(customBox).toHaveClass('focus:ring-green-500');
    });

    it('renders warning color', () => {
      const { container } = render(<Checkbox color="warning" aria-label="test" />);
      const customBox = container.querySelector('div[aria-hidden="true"]');
      expect(customBox).toHaveClass('focus:ring-yellow-500');
    });

    it('renders error color', () => {
      const { container } = render(<Checkbox color="error" aria-label="test" />);
      const customBox = container.querySelector('div[aria-hidden="true"]');
      expect(customBox).toHaveClass('focus:ring-red-500');
    });
  });

  describe('States', () => {
    it('renders unchecked by default', () => {
      render(<Checkbox aria-label="test" />);
      expect(screen.getByRole('checkbox')).not.toBeChecked();
    });

    it('renders checked when defaultChecked', () => {
      render(<Checkbox defaultChecked aria-label="test" />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('renders checked when controlled', () => {
      render(<Checkbox checked onChange={() => {}} aria-label="test" />);
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('renders disabled state', () => {
      render(<Checkbox disabled aria-label="test" />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('applies disabled styling to label', () => {
      render(<Checkbox disabled label="Disabled" />);
      expect(screen.getByText('Disabled')).toHaveClass('opacity-50');
    });
  });

  describe('Indeterminate State', () => {
    it('sets indeterminate property on input', () => {
      render(<Checkbox indeterminate aria-label="test" />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.indeterminate).toBe(true);
    });

    it('shows indeterminate icon when indeterminate', () => {
      const { container } = render(<Checkbox indeterminate aria-label="test" />);
      // Indeterminate icon should be visible (has stroke of M5 12h14)
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error State', () => {
    it('renders error message', () => {
      render(<Checkbox error="This field is required" aria-label="test" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('error message has alert role', () => {
      render(<Checkbox error="Required" aria-label="test" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Required');
    });

    it('sets aria-invalid when error', () => {
      render(<Checkbox error="Error" aria-label="test" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error overrides color to red', () => {
      const { container } = render(<Checkbox color="success" error="Error" aria-label="test" />);
      const customBox = container.querySelector('div[aria-hidden="true"]');
      expect(customBox).toHaveClass('border-red-500');
    });
  });

  describe('Label Position', () => {
    it('renders label on right by default', () => {
      const { container } = render(<Checkbox label="Right label" />);
      const wrapper = container.querySelector('.flex.items-start');
      expect(wrapper?.firstChild).toHaveClass('relative'); // checkbox comes first
    });

    it('renders label on left when specified', () => {
      const { container } = render(<Checkbox label="Left label" labelPosition="left" />);
      const wrapper = container.querySelector('.flex.items-start');
      expect(wrapper?.firstChild).toHaveClass('flex-col'); // label wrapper comes first
    });
  });

  describe('Interactions', () => {
    it('calls onChange when clicked', async () => {
      const handleChange = vi.fn();
      render(<Checkbox onChange={handleChange} aria-label="test" />);

      await userEvent.click(screen.getByRole('checkbox'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('toggles checked state on click (uncontrolled)', async () => {
      render(<Checkbox aria-label="test" />);
      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });

    it('clicking label toggles checkbox', async () => {
      render(<Checkbox label="Click me" />);

      await userEvent.click(screen.getByText('Click me'));
      expect(screen.getByRole('checkbox')).toBeChecked();
    });

    it('does not toggle when disabled', async () => {
      const handleChange = vi.fn();
      render(<Checkbox disabled onChange={handleChange} aria-label="test" />);

      await userEvent.click(screen.getByRole('checkbox'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('supports keyboard interaction (space)', async () => {
      const handleChange = vi.fn();
      render(<Checkbox onChange={handleChange} aria-label="test" />);

      const checkbox = screen.getByRole('checkbox');
      checkbox.focus();
      fireEvent.keyDown(checkbox, { key: ' ' });
      fireEvent.keyUp(checkbox, { key: ' ' });
      fireEvent.click(checkbox);
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has checkbox role', () => {
      render(<Checkbox aria-label="test" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('label is associated with checkbox', () => {
      render(<Checkbox label="Email notifications" />);
      expect(screen.getByLabelText('Email notifications')).toBeInTheDocument();
    });

    it('description is associated via aria-describedby', () => {
      render(<Checkbox label="Test" description="Helper text" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('aria-describedby');
    });

    it('error is associated via aria-describedby', () => {
      render(<Checkbox label="Test" error="Error message" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-describedby');
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to checkbox input', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Checkbox ref={ref} aria-label="test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('checkbox');
    });
  });

  describe('Native Props', () => {
    it('passes through name prop', () => {
      render(<Checkbox name="terms" aria-label="test" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('name', 'terms');
    });

    it('passes through value prop', () => {
      render(<Checkbox value="accepted" aria-label="test" />);
      expect(screen.getByRole('checkbox')).toHaveAttribute('value', 'accepted');
    });

    it('passes through required prop', () => {
      render(<Checkbox required aria-label="test" />);
      expect(screen.getByRole('checkbox')).toBeRequired();
    });
  });
});

// ============================================================================
// CheckboxGroup Tests
// ============================================================================

describe('CheckboxGroup', () => {
  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <CheckboxGroup>
          <Checkbox label="Option 1" />
          <Checkbox label="Option 2" />
        </CheckboxGroup>
      );

      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(
        <CheckboxGroup label="Choose options">
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(screen.getByText('Choose options')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      render(
        <CheckboxGroup label="Required" required>
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders helper text', () => {
      render(
        <CheckboxGroup helperText="Select at least one">
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(screen.getByText('Select at least one')).toBeInTheDocument();
    });

    it('renders error message', () => {
      render(
        <CheckboxGroup error="Selection required">
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Selection required');
    });
  });

  describe('Orientation', () => {
    it('renders vertical by default', () => {
      const { container } = render(
        <CheckboxGroup>
          <Checkbox label="A" />
          <Checkbox label="B" />
        </CheckboxGroup>
      );

      const checkboxContainer = container.querySelector('.flex-col');
      expect(checkboxContainer).toBeInTheDocument();
    });

    it('renders horizontal when specified', () => {
      const { container } = render(
        <CheckboxGroup orientation="horizontal">
          <Checkbox label="A" />
          <Checkbox label="B" />
        </CheckboxGroup>
      );

      const checkboxContainer = container.querySelector('.flex-row');
      expect(checkboxContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has group role', () => {
      render(
        <CheckboxGroup>
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('label is associated via aria-labelledby', () => {
      render(
        <CheckboxGroup label="Options">
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby');
    });

    it('helper/error is associated via aria-describedby', () => {
      render(
        <CheckboxGroup helperText="Helper">
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-describedby');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(
        <CheckboxGroup ref={ref}>
          <Checkbox label="Option" />
        </CheckboxGroup>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});

// ============================================================================
// CheckboxCard Tests
// ============================================================================

describe('CheckboxCard', () => {
  describe('Basic Rendering', () => {
    it('renders as checkbox', () => {
      render(<CheckboxCard title="Plan" />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    it('renders title', () => {
      render(<CheckboxCard title="Premium Plan" />);
      expect(screen.getByText('Premium Plan')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<CheckboxCard title="Plan" description="Full access" />);
      expect(screen.getByText('Full access')).toBeInTheDocument();
    });

    it('renders icon', () => {
      render(<CheckboxCard title="Plan" icon={<span data-testid="icon">⭐</span>} />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('toggles on click', async () => {
      render(<CheckboxCard title="Option" />);
      const checkbox = screen.getByRole('checkbox');

      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('clicking label toggles checkbox', async () => {
      render(<CheckboxCard title="Click anywhere" />);

      await userEvent.click(screen.getByText('Click anywhere'));
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });

  describe('Disabled State', () => {
    it('renders disabled', () => {
      render(<CheckboxCard title="Disabled" disabled />);
      expect(screen.getByRole('checkbox')).toBeDisabled();
    });

    it('applies disabled styles to card', () => {
      render(<CheckboxCard title="Disabled" disabled className="test-card" />);
      const label = screen.getByText('Disabled').closest('label');
      expect(label).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to input', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<CheckboxCard ref={ref} title="Test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

// ============================================================================
// useCheckboxGroup Hook Tests
// ============================================================================

describe('useCheckboxGroup', () => {
  describe('Initial State', () => {
    it('starts with empty array by default', () => {
      const { result } = renderHook(() => useCheckboxGroup());
      expect(result.current.value).toEqual([]);
    });

    it('uses defaultValue', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a', 'b'] }));
      expect(result.current.value).toEqual(['a', 'b']);
    });

    it('uses controlled value', () => {
      const { result } = renderHook(() => useCheckboxGroup({ value: ['controlled'] }));
      expect(result.current.value).toEqual(['controlled']);
    });
  });

  describe('Selection Methods', () => {
    it('select adds item', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      act(() => {
        result.current.select('a');
      });

      expect(result.current.value).toContain('a');
    });

    it('select adds multiple items', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      act(() => {
        result.current.select(['a', 'b']);
      });

      expect(result.current.value).toEqual(['a', 'b']);
    });

    it('deselect removes item', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a', 'b'] }));

      act(() => {
        result.current.deselect('a');
      });

      expect(result.current.value).toEqual(['b']);
    });

    it('toggle adds if not selected', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      act(() => {
        result.current.toggle('a');
      });

      expect(result.current.value).toContain('a');
    });

    it('toggle removes if selected', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a'] }));

      act(() => {
        result.current.toggle('a');
      });

      expect(result.current.value).not.toContain('a');
    });

    it('clear removes all selections', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a', 'b', 'c'] }));

      act(() => {
        result.current.clear();
      });

      expect(result.current.value).toEqual([]);
    });

    it('selectAll selects all provided values', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      act(() => {
        result.current.selectAll(['a', 'b', 'c']);
      });

      expect(result.current.value).toEqual(['a', 'b', 'c']);
    });
  });

  describe('Min/Max Constraints', () => {
    it('respects max constraint', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a', 'b'], max: 2 }));

      act(() => {
        result.current.select('c');
      });

      expect(result.current.value).toEqual(['a', 'b']);
      expect(result.current.value).not.toContain('c');
    });

    it('respects min constraint', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a'], min: 1 }));

      act(() => {
        result.current.deselect('a');
      });

      expect(result.current.value).toEqual(['a']);
    });
  });

  describe('getCheckboxProps', () => {
    it('returns checked: true for selected items', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a'] }));

      const props = result.current.getCheckboxProps('a');
      expect(props.checked).toBe(true);
    });

    it('returns checked: false for unselected items', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      const props = result.current.getCheckboxProps('a');
      expect(props.checked).toBe(false);
    });

    it('onChange handler toggles selection', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      const props = result.current.getCheckboxProps('a');

      act(() => {
        props.onChange({ target: { checked: true } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.value).toContain('a');
    });

    it('disables checkbox when max reached', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a', 'b'], max: 2 }));

      const props = result.current.getCheckboxProps('c');
      expect(props.disabled).toBe(true);
    });
  });

  describe('getSelectAllProps', () => {
    it('returns checked: true when all selected', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a', 'b', 'c'] }));

      const props = result.current.getSelectAllProps(['a', 'b', 'c']);
      expect(props.checked).toBe(true);
    });

    it('returns indeterminate: true when some selected', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a'] }));

      const props = result.current.getSelectAllProps(['a', 'b', 'c']);
      expect(props.indeterminate).toBe(true);
    });

    it('returns checked: false when none selected', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      const props = result.current.getSelectAllProps(['a', 'b', 'c']);
      expect(props.checked).toBe(false);
    });

    it('onChange selects all when checked', () => {
      const { result } = renderHook(() => useCheckboxGroup<string>());

      const props = result.current.getSelectAllProps(['a', 'b', 'c']);

      act(() => {
        props.onChange({ target: { checked: true } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.value).toEqual(['a', 'b', 'c']);
    });

    it('onChange clears all when unchecked', () => {
      const { result } = renderHook(() => useCheckboxGroup({ defaultValue: ['a', 'b', 'c'] }));

      const props = result.current.getSelectAllProps(['a', 'b', 'c']);

      act(() => {
        props.onChange({ target: { checked: false } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.value).toEqual([]);
    });
  });

  describe('onChange Callback', () => {
    it('calls onChange when selection changes', () => {
      const handleChange = vi.fn();
      const { result } = renderHook(() => useCheckboxGroup({ onChange: handleChange }));

      act(() => {
        result.current.select('a');
      });

      expect(handleChange).toHaveBeenCalledWith(['a']);
    });
  });
});

// ============================================================================
// Edge Cases & Integration Tests
// ============================================================================

describe('Checkbox Edge Cases', () => {
  it('handles rapid clicks', async () => {
    const handleChange = vi.fn();
    render(<Checkbox onChange={handleChange} aria-label="test" />);

    const checkbox = screen.getByRole('checkbox');
    await userEvent.tripleClick(checkbox);
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles all size and color combinations', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const colors = ['default', 'primary', 'success', 'warning', 'error'] as const;

    sizes.forEach((size) => {
      colors.forEach((color) => {
        const { unmount } = render(
          <Checkbox size={size} color={color} aria-label={`${size}-${color}`} />
        );
        expect(screen.getByRole('checkbox')).toBeInTheDocument();
        unmount();
      });
    });
  });

  it('handles special characters in label', () => {
    render(<Checkbox label={'Test & Special <Characters>'} />);
    expect(screen.getByText('Test & Special <Characters>')).toBeInTheDocument();
  });

  it('handles very long label text', () => {
    const longLabel = 'A'.repeat(200);
    render(<Checkbox label={longLabel} />);
    expect(screen.getByText(longLabel)).toBeInTheDocument();
  });

  it('handles emoji in label', () => {
    render(<Checkbox label="Accept terms 📋✅" />);
    expect(screen.getByText('Accept terms 📋✅')).toBeInTheDocument();
  });
});

describe('CheckboxGroup Edge Cases', () => {
  it('handles empty children', () => {
    render(<CheckboxGroup>{null}</CheckboxGroup>);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('handles many checkboxes', () => {
    render(
      <CheckboxGroup>
        {Array.from({ length: 20 }, (_, i) => (
          <Checkbox key={i} label={`Option ${i + 1}`} />
        ))}
      </CheckboxGroup>
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(20);
  });
});

describe('Integration Tests', () => {
  it('checkbox group with hook integration', async () => {
    function TestComponent() {
      const { getCheckboxProps, getSelectAllProps, value } = useCheckboxGroup<string>();
      const items = ['a', 'b', 'c'];

      return (
        <div>
          <Checkbox label="Select All" {...getSelectAllProps(items)} />
          {items.map((item) => (
            <Checkbox key={item} label={item.toUpperCase()} {...getCheckboxProps(item)} />
          ))}
          <div data-testid="selected">{value.join(',')}</div>
        </div>
      );
    }

    render(<TestComponent />);

    // Initially nothing selected
    expect(screen.getByTestId('selected')).toHaveTextContent('');

    // Select individual item
    await userEvent.click(screen.getByLabelText('A'));
    expect(screen.getByTestId('selected')).toHaveTextContent('a');

    // Select all
    await userEvent.click(screen.getByLabelText('Select All'));
    expect(screen.getByTestId('selected')).toHaveTextContent('a,b,c');

    // Deselect all
    await userEvent.click(screen.getByLabelText('Select All'));
    expect(screen.getByTestId('selected')).toHaveTextContent('');
  });

  it('form submission with checkboxes', async () => {
    const handleSubmit = vi.fn((e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      return Array.from(formData.entries());
    });

    render(
      <form onSubmit={handleSubmit}>
        <Checkbox name="terms" label="Accept terms" />
        <Checkbox name="newsletter" label="Subscribe" defaultChecked />
        <button type="submit">Submit</button>
      </form>
    );

    await userEvent.click(screen.getByText('Submit'));
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('controlled checkbox updates correctly', async () => {
    function ControlledCheckbox() {
      const [checked, setChecked] = React.useState(false);
      return (
        <div>
          <Checkbox
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            label="Controlled"
          />
          <span data-testid="status">{checked ? 'Checked' : 'Unchecked'}</span>
        </div>
      );
    }

    render(<ControlledCheckbox />);

    expect(screen.getByTestId('status')).toHaveTextContent('Unchecked');
    await userEvent.click(screen.getByLabelText('Controlled'));
    expect(screen.getByTestId('status')).toHaveTextContent('Checked');
  });
});
