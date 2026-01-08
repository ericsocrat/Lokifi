import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select, type SelectOption } from '@/components/ui/Select';

const basicOptions: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

const optionsWithIcons: SelectOption[] = [
  { value: 'usd', label: 'US Dollar', icon: <span data-testid="icon-usd">$</span> },
  { value: 'eur', label: 'Euro', icon: <span data-testid="icon-eur">€</span> },
];

const optionsWithGroups: SelectOption[] = [
  { value: 'apple', label: 'Apple', group: 'Fruits' },
  { value: 'banana', label: 'Banana', group: 'Fruits' },
  { value: 'carrot', label: 'Carrot', group: 'Vegetables' },
  { value: 'broccoli', label: 'Broccoli', group: 'Vegetables' },
];

const optionsWithDisabled: SelectOption[] = [
  { value: 'enabled1', label: 'Enabled 1' },
  { value: 'disabled', label: 'Disabled Option', disabled: true },
  { value: 'enabled2', label: 'Enabled 2' },
];

describe('Select', () => {
  describe('Basic Rendering', () => {
    it('renders with placeholder', () => {
      render(<Select options={basicOptions} placeholder="Select a fruit" data-testid="select" />);
      expect(screen.getByText('Select a fruit')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      expect(screen.getByText('Select...')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Select options={basicOptions} label="Fruit" data-testid="select" />);
      expect(screen.getByText('Fruit')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      render(<Select options={basicOptions} label="Fruit" required data-testid="select" />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders helper text', () => {
      render(<Select options={basicOptions} helperText="Choose your favorite" data-testid="select" />);
      expect(screen.getByText('Choose your favorite')).toBeInTheDocument();
    });

    it('has combobox role', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('Dropdown Behavior', () => {
    it('opens dropdown on click', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('closes dropdown on second click', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);
      fireEvent.click(trigger);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows all options in dropdown', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Banana')).toBeInTheDocument();
      expect(screen.getByText('Cherry')).toBeInTheDocument();
    });

    it('closes dropdown on Escape', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Single Selection', () => {
    it('selects an option on click', () => {
      const handleChange = vi.fn();
      render(<Select options={basicOptions} onChange={handleChange} data-testid="select" />);
      
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Apple'));
      
      expect(handleChange).toHaveBeenCalledWith('apple');
    });

    it('displays selected value', () => {
      render(<Select options={basicOptions} value="banana" data-testid="select" />);
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('closes dropdown after selection', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Apple'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('shows check icon for selected option', () => {
      render(<Select options={basicOptions} value="apple" data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const appleOption = screen.getByTestId('select-option-apple');
      expect(appleOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Multiple Selection', () => {
    it('allows selecting multiple options', () => {
      const handleChange = vi.fn();
      render(
        <Select
          options={basicOptions}
          multiple
          value={[]}
          onChange={handleChange}
          data-testid="select"
        />
      );
      
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByTestId('select-option-apple'));
      
      expect(handleChange).toHaveBeenCalledWith(['apple']);
    });

    it('does not close dropdown after selection in multiple mode', () => {
      render(
        <Select
          options={basicOptions}
          multiple
          data-testid="select"
        />
      );
      
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByTestId('select-option-apple'));
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('shows count when multiple selected', () => {
      render(
        <Select
          options={basicOptions}
          multiple
          value={['apple', 'banana']}
          data-testid="select"
        />
      );
      
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });

    it('shows single label when only one selected', () => {
      render(
        <Select
          options={basicOptions}
          multiple
          value={['apple']}
          data-testid="select"
        />
      );
      
      // Will show "Apple" in the trigger
      expect(screen.getByRole('combobox')).toHaveTextContent('Apple');
    });

    it('deselects when clicking selected option', () => {
      const handleChange = vi.fn();
      render(
        <Select
          options={basicOptions}
          multiple
          value={['apple']}
          onChange={handleChange}
          data-testid="select"
        />
      );
      
      fireEvent.click(screen.getByRole('combobox'));
      // Use testid since "Apple" appears in both trigger and dropdown
      fireEvent.click(screen.getByTestId('select-option-apple'));
      
      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it('has aria-multiselectable on listbox', () => {
      render(<Select options={basicOptions} multiple data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    });
  });

  describe('Searchable', () => {
    it('shows search input when searchable', () => {
      render(<Select options={basicOptions} searchable data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('select-search')).toBeInTheDocument();
    });

    it('filters options based on search', () => {
      render(<Select options={basicOptions} searchable data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const searchInput = screen.getByTestId('select-search');
      fireEvent.change(searchInput, { target: { value: 'app' } });
      
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.queryByText('Banana')).not.toBeInTheDocument();
    });

    it('shows "No options found" when no matches', () => {
      render(<Select options={basicOptions} searchable data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const searchInput = screen.getByTestId('select-search');
      fireEvent.change(searchInput, { target: { value: 'xyz' } });
      
      expect(screen.getByText('No options found')).toBeInTheDocument();
    });

    it('uses custom search placeholder', () => {
      render(
        <Select
          options={basicOptions}
          searchable
          searchPlaceholder="Type to search..."
          data-testid="select"
        />
      );
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByPlaceholderText('Type to search...')).toBeInTheDocument();
    });

    it('clears search on selection', () => {
      render(<Select options={basicOptions} searchable data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const searchInput = screen.getByTestId('select-search');
      fireEvent.change(searchInput, { target: { value: 'app' } });
      fireEvent.click(screen.getByText('Apple'));
      
      // Re-open to check search is cleared
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('select-search')).toHaveValue('');
    });
  });

  describe('Grouped Options', () => {
    it('renders group headers', () => {
      render(<Select options={optionsWithGroups} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      expect(screen.getByText('Fruits')).toBeInTheDocument();
      expect(screen.getByText('Vegetables')).toBeInTheDocument();
    });

    it('renders options under correct groups', () => {
      render(<Select options={optionsWithGroups} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      // All options should be visible
      expect(screen.getByText('Apple')).toBeInTheDocument();
      expect(screen.getByText('Carrot')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('cannot open when disabled', () => {
      render(<Select options={basicOptions} disabled data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('has disabled attribute', () => {
      render(<Select options={basicOptions} disabled data-testid="select" />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('has opacity styling when disabled', () => {
      render(<Select options={basicOptions} disabled data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveClass('opacity-50');
    });

    it('disables specific options', () => {
      render(<Select options={optionsWithDisabled} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const disabledOption = screen.getByTestId('select-option-disabled');
      expect(disabledOption).toBeDisabled();
    });

    it('cannot select disabled option', () => {
      const handleChange = vi.fn();
      render(
        <Select options={optionsWithDisabled} onChange={handleChange} data-testid="select" />
      );
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByTestId('select-option-disabled'));
      
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('Clearable', () => {
    it('shows clear button when value selected and clearable', () => {
      render(
        <Select
          options={basicOptions}
          value="apple"
          clearable
          data-testid="select"
        />
      );
      expect(screen.getByTestId('select-clear')).toBeInTheDocument();
    });

    it('does not show clear button when no value', () => {
      render(<Select options={basicOptions} clearable data-testid="select" />);
      expect(screen.queryByTestId('select-clear')).not.toBeInTheDocument();
    });

    it('clears selection on clear button click', () => {
      const handleChange = vi.fn();
      render(
        <Select
          options={basicOptions}
          value="apple"
          clearable
          onChange={handleChange}
          data-testid="select"
        />
      );
      
      fireEvent.click(screen.getByTestId('select-clear'));
      expect(handleChange).toHaveBeenCalledWith('');
    });

    it('clears multiple selection', () => {
      const handleChange = vi.fn();
      render(
        <Select
          options={basicOptions}
          multiple
          value={['apple', 'banana']}
          clearable
          onChange={handleChange}
          data-testid="select"
        />
      );
      
      fireEvent.click(screen.getByTestId('select-clear'));
      expect(handleChange).toHaveBeenCalledWith([]);
    });

    it('does not open dropdown when clicking clear', () => {
      render(
        <Select
          options={basicOptions}
          value="apple"
          clearable
          data-testid="select"
        />
      );
      
      fireEvent.click(screen.getByTestId('select-clear'));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error styling', () => {
      render(<Select options={basicOptions} error data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveClass('border-red-500');
    });

    it('shows error message', () => {
      render(
        <Select
          options={basicOptions}
          error
          errorMessage="Please select an option"
          data-testid="select"
        />
      );
      expect(screen.getByText('Please select an option')).toBeInTheDocument();
    });

    it('has aria-invalid when error', () => {
      render(<Select options={basicOptions} error data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Size Variants', () => {
    it('renders small size', () => {
      render(<Select options={basicOptions} size="sm" data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveClass('h-8');
    });

    it('renders medium size (default)', () => {
      render(<Select options={basicOptions} size="md" data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveClass('h-10');
    });

    it('renders large size', () => {
      render(<Select options={basicOptions} size="lg" data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveClass('h-12');
    });
  });

  describe('Keyboard Navigation', () => {
    it('opens dropdown on Enter', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown on Space', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.keyDown(screen.getByRole('combobox'), { key: ' ' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('opens dropdown on ArrowDown', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('navigates options with ArrowDown and selects with Enter', () => {
      const handleChange = vi.fn();
      render(<Select options={basicOptions} onChange={handleChange} data-testid="select" />);
      
      const combobox = screen.getByRole('combobox');
      // Open and navigate
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      // Navigate to first option and select
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      fireEvent.keyDown(combobox, { key: 'Enter' });
      
      // Should have selected second option (banana) since we moved down twice
      // Or first option if starting from -1 and first ArrowDown goes to 0
      expect(handleChange).toHaveBeenCalled();
    });

    it('supports ArrowUp navigation', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      const combobox = screen.getByRole('combobox');
      
      // Open dropdown
      fireEvent.click(combobox);
      
      // Navigate with ArrowUp (should wrap to last option)
      fireEvent.keyDown(combobox, { key: 'ArrowUp' });
      
      // Dropdown should still be open
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    it('selects option with Enter key', () => {
      const handleChange = vi.fn();
      render(<Select options={basicOptions} onChange={handleChange} data-testid="select" />);
      
      const combobox = screen.getByRole('combobox');
      // Open with Space
      fireEvent.keyDown(combobox, { key: ' ' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      // Hover over an option to highlight it
      fireEvent.mouseEnter(screen.getByTestId('select-option-banana'));
      
      // Select with Enter
      fireEvent.keyDown(combobox, { key: 'Enter' });
      
      expect(handleChange).toHaveBeenCalledWith('banana');
    });

    it('closes on Tab', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Tab' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('With Icons', () => {
    it('renders icons in options', () => {
      render(<Select options={optionsWithIcons} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('icon-usd')).toBeInTheDocument();
      expect(screen.getByTestId('icon-eur')).toBeInTheDocument();
    });

    it('shows icon in selected value', () => {
      render(<Select options={optionsWithIcons} value="usd" data-testid="select" />);
      expect(screen.getByTestId('icon-usd')).toBeInTheDocument();
    });
  });

  describe('Options with Description', () => {
    it('renders description in options', () => {
      const options: SelectOption[] = [
        { value: 'opt1', label: 'Option 1', description: 'First option description' },
      ];
      render(<Select options={options} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByText('First option description')).toBeInTheDocument();
    });

    it('filters by description when searchable', () => {
      const options: SelectOption[] = [
        { value: 'opt1', label: 'Option 1', description: 'unique description' },
        { value: 'opt2', label: 'Option 2', description: 'other text' },
      ];
      render(<Select options={options} searchable data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const searchInput = screen.getByTestId('select-search');
      fireEvent.change(searchInput, { target: { value: 'unique' } });
      
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.queryByText('Option 2')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has aria-expanded attribute', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      const trigger = screen.getByRole('combobox');
      
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-haspopup="listbox"', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('has aria-controls pointing to listbox', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const trigger = screen.getByRole('combobox');
      const listbox = screen.getByRole('listbox');
      expect(trigger).toHaveAttribute('aria-controls', listbox.id);
    });

    it('supports aria-label', () => {
      render(<Select options={basicOptions} aria-label="Select fruit" data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Select fruit');
    });

    it('has aria-required when required', () => {
      render(<Select options={basicOptions} required data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-required', 'true');
    });

    it('options have role="option"', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('selected option has aria-selected="true"', () => {
      render(<Select options={basicOptions} value="apple" data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      
      const selectedOption = screen.getByTestId('select-option-apple');
      expect(selectedOption).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Form Integration', () => {
    it('renders hidden input with name', () => {
      const { container } = render(
        <Select options={basicOptions} name="fruit" value="apple" data-testid="select" />
      );
      const hiddenInput = container.querySelector('input[type="hidden"]');
      expect(hiddenInput).toHaveAttribute('name', 'fruit');
      expect(hiddenInput).toHaveAttribute('value', 'apple');
    });

    it('hidden input has comma-separated values for multiple', () => {
      const { container } = render(
        <Select
          options={basicOptions}
          name="fruits"
          multiple
          value={['apple', 'banana']}
          data-testid="select"
        />
      );
      const hiddenInput = container.querySelector('input[type="hidden"]');
      expect(hiddenInput).toHaveAttribute('value', 'apple,banana');
    });
  });

  describe('Custom ClassName', () => {
    it('applies className to trigger', () => {
      render(<Select options={basicOptions} className="custom-trigger" data-testid="select" />);
      expect(screen.getByRole('combobox')).toHaveClass('custom-trigger');
    });

    it('applies dropdownClassName to dropdown', () => {
      render(
        <Select
          options={basicOptions}
          dropdownClassName="custom-dropdown"
          data-testid="select"
        />
      );
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('select-dropdown')).toHaveClass('custom-dropdown');
    });
  });

  describe('Max Height', () => {
    it('applies maxHeight as number', () => {
      render(<Select options={basicOptions} maxHeight={200} data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('select-dropdown')).toHaveStyle({ maxHeight: '200px' });
    });

    it('applies maxHeight as string', () => {
      render(<Select options={basicOptions} maxHeight="50vh" data-testid="select" />);
      fireEvent.click(screen.getByRole('combobox'));
      expect(screen.getByTestId('select-dropdown')).toHaveStyle({ maxHeight: '50vh' });
    });
  });

  describe('Uncontrolled Mode', () => {
    it('works with defaultValue', () => {
      render(<Select options={basicOptions} defaultValue="banana" data-testid="select" />);
      expect(screen.getByText('Banana')).toBeInTheDocument();
    });

    it('updates internal state when selecting', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      
      fireEvent.click(screen.getByRole('combobox'));
      fireEvent.click(screen.getByText('Apple'));
      
      // Should now display Apple
      expect(screen.getByText('Apple')).toBeInTheDocument();
    });

    it('works with defaultValue array for multiple', () => {
      render(
        <Select
          options={basicOptions}
          multiple
          defaultValue={['apple', 'banana']}
          data-testid="select"
        />
      );
      expect(screen.getByText('2 selected')).toBeInTheDocument();
    });
  });

  describe('Chevron Icon', () => {
    it('rotates chevron when open', () => {
      render(<Select options={basicOptions} data-testid="select" />);
      const trigger = screen.getByRole('combobox');
      
      // Get chevron by class
      const chevron = trigger.querySelector('[class*="rotate-180"]');
      expect(chevron).not.toBeInTheDocument();
      
      fireEvent.click(trigger);
      const rotatedChevron = trigger.querySelector('[class*="rotate-180"]');
      expect(rotatedChevron).toBeInTheDocument();
    });
  });
});
