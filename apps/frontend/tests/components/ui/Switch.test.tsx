/**
 * Switch Component Tests
 *
 * Comprehensive tests for the Switch component system including:
 * - Switch: Base toggle switch
 * - SwitchGroup: Group of related switches
 * - SwitchCard: Card-style switch
 * - useSwitchGroup: Hook for managing group state
 */

import { Switch, SwitchCard, SwitchGroup, useSwitchGroup } from '@/src/components/ui/Switch';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

// ============================================================================
// Switch Component Tests
// ============================================================================

describe('Switch', () => {
  describe('Basic Rendering', () => {
    it('renders switch input with role', () => {
      render(<Switch aria-label="test switch" />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Switch label="Enable notifications" />);
      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    });

    it('renders with description', () => {
      render(<Switch label="Notifications" description="Receive email updates" />);
      expect(screen.getByText('Receive email updates')).toBeInTheDocument();
    });

    it('renders with custom className', () => {
      const { container } = render(<Switch label="Test" className="custom-class" />);
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('generates unique id when not provided', () => {
      render(<Switch label="Test" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('id');
    });

    it('uses provided id', () => {
      render(<Switch id="custom-id" label="Test" />);
      expect(screen.getByRole('switch')).toHaveAttribute('id', 'custom-id');
    });
  });

  describe('Sizes', () => {
    it('renders small size', () => {
      const { container } = render(<Switch size="sm" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('h-4', 'w-7');
    });

    it('renders medium size (default)', () => {
      const { container } = render(<Switch size="md" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('h-6', 'w-11');
    });

    it('renders large size', () => {
      const { container } = render(<Switch size="lg" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('h-8', 'w-14');
    });

    it('applies size to label text', () => {
      render(<Switch size="lg" label="Large label" />);
      expect(screen.getByText('Large label')).toHaveClass('text-lg');
    });
  });

  describe('Colors', () => {
    it('renders default color', () => {
      const { container } = render(<Switch color="default" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('peer-checked:bg-electric-2');
    });

    it('renders primary color', () => {
      const { container } = render(<Switch color="primary" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('peer-checked:bg-blue-500');
    });

    it('renders success color', () => {
      const { container } = render(<Switch color="success" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('peer-checked:bg-green-500');
    });

    it('renders warning color', () => {
      const { container } = render(<Switch color="warning" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('peer-checked:bg-yellow-500');
    });

    it('renders error color', () => {
      const { container } = render(<Switch color="error" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('peer-checked:bg-red-500');
    });
  });

  describe('States', () => {
    it('renders off by default', () => {
      render(<Switch aria-label="test" />);
      expect(screen.getByRole('switch')).not.toBeChecked();
    });

    it('renders on when defaultChecked', () => {
      render(<Switch defaultChecked aria-label="test" />);
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('renders on when controlled', () => {
      render(<Switch checked onChange={() => {}} aria-label="test" />);
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('renders disabled state', () => {
      render(<Switch disabled aria-label="test" />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('applies disabled styling to label', () => {
      render(<Switch disabled label="Disabled" />);
      expect(screen.getByText('Disabled')).toHaveClass('opacity-50');
    });
  });

  describe('Loading State', () => {
    it('disables switch when loading', () => {
      render(<Switch loading aria-label="test" />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('shows loading spinner', () => {
      const { container } = render(<Switch loading aria-label="test" />);
      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message', () => {
      render(<Switch error="This field is required" aria-label="test" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('error message has alert role', () => {
      render(<Switch error="Required" aria-label="test" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Required');
    });

    it('sets aria-invalid when error', () => {
      render(<Switch error="Error" aria-label="test" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-invalid', 'true');
    });

    it('error overrides track color to red', () => {
      const { container } = render(<Switch color="success" error="Error" aria-label="test" />);
      const track = container.querySelector('span[aria-hidden="true"]');
      expect(track).toHaveClass('peer-checked:bg-red-500');
    });
  });

  describe('Label Position', () => {
    it('renders label on right by default', () => {
      const { container } = render(<Switch label="Right label" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex-row');
    });

    it('renders label on left when specified', () => {
      const { container } = render(<Switch label="Left label" labelPosition="left" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('flex-row-reverse');
    });
  });

  describe('Interactions', () => {
    it('calls onChange when clicked', async () => {
      const handleChange = vi.fn();
      render(<Switch onChange={handleChange} aria-label="test" />);

      await userEvent.click(screen.getByRole('switch'));
      expect(handleChange).toHaveBeenCalledTimes(1);
    });

    it('toggles state on click (uncontrolled)', async () => {
      render(<Switch aria-label="test" />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).not.toBeChecked();
      await userEvent.click(switchEl);
      expect(switchEl).toBeChecked();
      await userEvent.click(switchEl);
      expect(switchEl).not.toBeChecked();
    });

    it('clicking label toggles switch', async () => {
      render(<Switch label="Click me" />);

      await userEvent.click(screen.getByText('Click me'));
      expect(screen.getByRole('switch')).toBeChecked();
    });

    it('does not toggle when disabled', async () => {
      const handleChange = vi.fn();
      render(<Switch disabled onChange={handleChange} aria-label="test" />);

      await userEvent.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('does not toggle when loading', async () => {
      const handleChange = vi.fn();
      render(<Switch loading onChange={handleChange} aria-label="test" />);

      await userEvent.click(screen.getByRole('switch'));
      expect(handleChange).not.toHaveBeenCalled();
    });

    it('supports keyboard interaction', async () => {
      const handleChange = vi.fn();
      render(<Switch onChange={handleChange} aria-label="test" />);

      const switchEl = screen.getByRole('switch');
      switchEl.focus();
      fireEvent.keyDown(switchEl, { key: ' ' });
      fireEvent.keyUp(switchEl, { key: ' ' });
      fireEvent.click(switchEl);
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has switch role', () => {
      render(<Switch aria-label="test" />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('is type checkbox', () => {
      render(<Switch aria-label="test" />);
      expect(screen.getByRole('switch')).toHaveAttribute('type', 'checkbox');
    });

    it('label is associated with switch', () => {
      render(<Switch label="Email notifications" />);
      expect(screen.getByRole('switch')).toHaveAccessibleName('Email notifications');
    });

    it('description is associated via aria-describedby', () => {
      render(<Switch label="Test" description="Helper text" />);
      expect(screen.getByRole('switch')).toHaveAttribute('aria-describedby');
    });

    it('error is associated via aria-describedby', () => {
      render(<Switch label="Test" error="Error message" />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-describedby');
      expect(switchEl).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to switch input', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<Switch ref={ref} aria-label="test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect(ref.current?.type).toBe('checkbox');
    });
  });

  describe('Native Props', () => {
    it('passes through name prop', () => {
      render(<Switch name="notifications" aria-label="test" />);
      expect(screen.getByRole('switch')).toHaveAttribute('name', 'notifications');
    });

    it('passes through value prop', () => {
      render(<Switch value="enabled" aria-label="test" />);
      expect(screen.getByRole('switch')).toHaveAttribute('value', 'enabled');
    });

    it('passes through required prop', () => {
      render(<Switch required aria-label="test" />);
      expect(screen.getByRole('switch')).toBeRequired();
    });
  });
});

// ============================================================================
// SwitchGroup Tests
// ============================================================================

describe('SwitchGroup', () => {
  describe('Basic Rendering', () => {
    it('renders children', () => {
      render(
        <SwitchGroup>
          <Switch label="Option 1" />
          <Switch label="Option 2" />
        </SwitchGroup>
      );

      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 2')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(
        <SwitchGroup label="Notification settings">
          <Switch label="Email" />
        </SwitchGroup>
      );

      expect(screen.getByText('Notification settings')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      render(
        <SwitchGroup label="Required" required>
          <Switch label="Option" />
        </SwitchGroup>
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders helper text', () => {
      render(
        <SwitchGroup helperText="Choose your preferences">
          <Switch label="Option" />
        </SwitchGroup>
      );

      expect(screen.getByText('Choose your preferences')).toBeInTheDocument();
    });

    it('renders error message', () => {
      render(
        <SwitchGroup error="At least one required">
          <Switch label="Option" />
        </SwitchGroup>
      );

      expect(screen.getByRole('alert')).toHaveTextContent('At least one required');
    });
  });

  describe('Orientation', () => {
    it('renders vertical by default', () => {
      const { container } = render(
        <SwitchGroup>
          <Switch label="A" />
          <Switch label="B" />
        </SwitchGroup>
      );

      const switchContainer = container.querySelector('.flex-col');
      expect(switchContainer).toBeInTheDocument();
    });

    it('renders horizontal when specified', () => {
      const { container } = render(
        <SwitchGroup orientation="horizontal">
          <Switch label="A" />
          <Switch label="B" />
        </SwitchGroup>
      );

      const switchContainer = container.querySelector('.flex-row');
      expect(switchContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has group role', () => {
      render(
        <SwitchGroup>
          <Switch label="Option" />
        </SwitchGroup>
      );

      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('label is associated via aria-labelledby', () => {
      render(
        <SwitchGroup label="Options">
          <Switch label="Option" />
        </SwitchGroup>
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby');
    });

    it('helper/error is associated via aria-describedby', () => {
      render(
        <SwitchGroup helperText="Helper">
          <Switch label="Option" />
        </SwitchGroup>
      );

      expect(screen.getByRole('group')).toHaveAttribute('aria-describedby');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref', () => {
      const ref = { current: null as HTMLDivElement | null };
      render(
        <SwitchGroup ref={ref}>
          <Switch label="Option" />
        </SwitchGroup>
      );

      expect(ref.current).toBeInstanceOf(HTMLDivElement);
    });
  });
});

// ============================================================================
// SwitchCard Tests
// ============================================================================

describe('SwitchCard', () => {
  describe('Basic Rendering', () => {
    it('renders as switch', () => {
      render(<SwitchCard title="Setting" />);
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('renders title', () => {
      render(<SwitchCard title="Dark Mode" />);
      expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<SwitchCard title="Setting" description="Enable dark theme" />);
      expect(screen.getByText('Enable dark theme')).toBeInTheDocument();
    });

    it('renders icon', () => {
      render(<SwitchCard title="Setting" icon={<span data-testid="icon">🌙</span>} />);
      expect(screen.getByTestId('icon')).toBeInTheDocument();
    });

    it('renders badge', () => {
      render(<SwitchCard title="Premium" badge={<span data-testid="badge">PRO</span>} />);
      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('toggles on click', async () => {
      render(<SwitchCard title="Option" />);
      const switchEl = screen.getByRole('switch');

      expect(switchEl).not.toBeChecked();
      await userEvent.click(switchEl);
      expect(switchEl).toBeChecked();
    });

    it('clicking card toggles switch', async () => {
      render(<SwitchCard title="Click anywhere" />);

      await userEvent.click(screen.getByText('Click anywhere'));
      expect(screen.getByRole('switch')).toBeChecked();
    });
  });

  describe('Disabled State', () => {
    it('renders disabled', () => {
      render(<SwitchCard title="Disabled" disabled />);
      expect(screen.getByRole('switch')).toBeDisabled();
    });

    it('applies disabled styles to card', () => {
      render(<SwitchCard title="Disabled" disabled />);
      const label = screen.getByText('Disabled').closest('label');
      expect(label).toHaveClass('opacity-50', 'cursor-not-allowed');
    });
  });

  describe('Ref Forwarding', () => {
    it('forwards ref to input', () => {
      const ref = { current: null as HTMLInputElement | null };
      render(<SwitchCard ref={ref} title="Test" />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });
});

// ============================================================================
// useSwitchGroup Hook Tests
// ============================================================================

describe('useSwitchGroup', () => {
  describe('Initial State', () => {
    it('starts with empty array by default', () => {
      const { result } = renderHook(() => useSwitchGroup());
      expect(result.current.value).toEqual([]);
    });

    it('uses defaultValue', () => {
      const { result } = renderHook(() => useSwitchGroup({ defaultValue: ['email', 'sms'] }));
      expect(result.current.value).toEqual(['email', 'sms']);
    });

    it('uses controlled value', () => {
      const { result } = renderHook(() => useSwitchGroup({ value: ['controlled'] }));
      expect(result.current.value).toEqual(['controlled']);
    });
  });

  describe('Enable/Disable Methods', () => {
    it('enable adds item', () => {
      const { result } = renderHook(() => useSwitchGroup<string>());

      act(() => {
        result.current.enable('email');
      });

      expect(result.current.value).toContain('email');
    });

    it('enable adds multiple items', () => {
      const { result } = renderHook(() => useSwitchGroup<string>());

      act(() => {
        result.current.enable(['email', 'sms']);
      });

      expect(result.current.value).toEqual(['email', 'sms']);
    });

    it('disable removes item', () => {
      const { result } = renderHook(() => useSwitchGroup({ defaultValue: ['email', 'sms'] }));

      act(() => {
        result.current.disable('email');
      });

      expect(result.current.value).toEqual(['sms']);
    });

    it('toggle adds if not enabled', () => {
      const { result } = renderHook(() => useSwitchGroup<string>());

      act(() => {
        result.current.toggle('email');
      });

      expect(result.current.value).toContain('email');
    });

    it('toggle removes if enabled', () => {
      const { result } = renderHook(() => useSwitchGroup({ defaultValue: ['email'] }));

      act(() => {
        result.current.toggle('email');
      });

      expect(result.current.value).not.toContain('email');
    });

    it('disableAll removes all selections', () => {
      const { result } = renderHook(() =>
        useSwitchGroup({ defaultValue: ['email', 'sms', 'push'] })
      );

      act(() => {
        result.current.disableAll();
      });

      expect(result.current.value).toEqual([]);
    });

    it('enableAll enables all provided values', () => {
      const { result } = renderHook(() => useSwitchGroup<string>());

      act(() => {
        result.current.enableAll(['email', 'sms', 'push']);
      });

      expect(result.current.value).toEqual(['email', 'sms', 'push']);
    });
  });

  describe('isEnabled', () => {
    it('returns true for enabled items', () => {
      const { result } = renderHook(() => useSwitchGroup({ defaultValue: ['email'] }));

      expect(result.current.isEnabled('email')).toBe(true);
    });

    it('returns false for disabled items', () => {
      const { result } = renderHook(() => useSwitchGroup<string>());

      expect(result.current.isEnabled('email')).toBe(false);
    });
  });

  describe('getSwitchProps', () => {
    it('returns checked: true for enabled items', () => {
      const { result } = renderHook(() => useSwitchGroup({ defaultValue: ['email'] }));

      const props = result.current.getSwitchProps('email');
      expect(props.checked).toBe(true);
    });

    it('returns checked: false for disabled items', () => {
      const { result } = renderHook(() => useSwitchGroup<string>());

      const props = result.current.getSwitchProps('email');
      expect(props.checked).toBe(false);
    });

    it('onChange handler enables on check', () => {
      const { result } = renderHook(() => useSwitchGroup<string>());

      const props = result.current.getSwitchProps('email');

      act(() => {
        props.onChange({ target: { checked: true } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.value).toContain('email');
    });

    it('onChange handler disables on uncheck', () => {
      const { result } = renderHook(() => useSwitchGroup({ defaultValue: ['email'] }));

      const props = result.current.getSwitchProps('email');

      act(() => {
        props.onChange({ target: { checked: false } } as React.ChangeEvent<HTMLInputElement>);
      });

      expect(result.current.value).not.toContain('email');
    });
  });

  describe('onChange Callback', () => {
    it('calls onChange when value changes', () => {
      const handleChange = vi.fn();
      const { result } = renderHook(() => useSwitchGroup({ onChange: handleChange }));

      act(() => {
        result.current.enable('email');
      });

      expect(handleChange).toHaveBeenCalledWith(['email']);
    });
  });
});

// ============================================================================
// Edge Cases & Integration Tests
// ============================================================================

describe('Switch Edge Cases', () => {
  it('handles rapid clicks', async () => {
    const handleChange = vi.fn();
    render(<Switch onChange={handleChange} aria-label="test" />);

    const switchEl = screen.getByRole('switch');
    await userEvent.tripleClick(switchEl);
    expect(handleChange).toHaveBeenCalled();
  });

  it('handles all size and color combinations', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    const colors = ['default', 'primary', 'success', 'warning', 'error'] as const;

    sizes.forEach((size) => {
      colors.forEach((color) => {
        const { unmount } = render(
          <Switch size={size} color={color} aria-label={`${size}-${color}`} />
        );
        expect(screen.getByRole('switch')).toBeInTheDocument();
        unmount();
      });
    });
  });

  it('handles special characters in label', () => {
    render(<Switch label={'Test & Special <Characters>'} />);
    expect(screen.getByText('Test & Special <Characters>')).toBeInTheDocument();
  });

  it('handles very long label text', () => {
    const longLabel = 'A'.repeat(200);
    render(<Switch label={longLabel} />);
    expect(screen.getByText(longLabel)).toBeInTheDocument();
  });

  it('handles emoji in label', () => {
    render(<Switch label="Enable dark mode 🌙" />);
    expect(screen.getByText('Enable dark mode 🌙')).toBeInTheDocument();
  });
});

describe('SwitchGroup Edge Cases', () => {
  it('handles empty children', () => {
    render(<SwitchGroup>{null}</SwitchGroup>);
    expect(screen.getByRole('group')).toBeInTheDocument();
  });

  it('handles many switches', () => {
    render(
      <SwitchGroup>
        {Array.from({ length: 20 }, (_, i) => (
          <Switch key={i} label={`Option ${i + 1}`} />
        ))}
      </SwitchGroup>
    );

    expect(screen.getAllByRole('switch')).toHaveLength(20);
  });
});

describe('Integration Tests', () => {
  it('switch group with hook integration', async () => {
    function TestComponent() {
      const { getSwitchProps, value } = useSwitchGroup<string>();
      const items = ['email', 'sms', 'push'];

      return (
        <div>
          {items.map((item) => (
            <Switch key={item} label={item.toUpperCase()} {...getSwitchProps(item)} />
          ))}
          <div data-testid="enabled">{value.join(',')}</div>
        </div>
      );
    }

    render(<TestComponent />);

    // Initially nothing enabled
    expect(screen.getByTestId('enabled')).toHaveTextContent('');

    // Enable email
    await userEvent.click(screen.getByText('EMAIL'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('email');

    // Enable sms
    await userEvent.click(screen.getByText('SMS'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('email,sms');

    // Disable email
    await userEvent.click(screen.getByText('EMAIL'));
    expect(screen.getByTestId('enabled')).toHaveTextContent('sms');
  });

  it('form submission with switches', async () => {
    const handleSubmit = vi.fn((e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      return Array.from(formData.entries());
    });

    render(
      <form onSubmit={handleSubmit}>
        <Switch name="marketing" label="Marketing emails" />
        <Switch name="updates" label="Product updates" defaultChecked />
        <button type="submit">Save</button>
      </form>
    );

    await userEvent.click(screen.getByText('Save'));
    expect(handleSubmit).toHaveBeenCalled();
  });

  it('controlled switch updates correctly', async () => {
    function ControlledSwitch() {
      const [enabled, setEnabled] = React.useState(false);
      return (
        <div>
          <Switch
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            label="Controlled"
          />
          <span data-testid="status">{enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      );
    }

    render(<ControlledSwitch />);

    expect(screen.getByTestId('status')).toHaveTextContent('Disabled');
    await userEvent.click(screen.getByRole('switch'));
    expect(screen.getByTestId('status')).toHaveTextContent('Enabled');
  });

  it('SwitchCard in settings panel', async () => {
    function SettingsPanel() {
      const [settings, setSettings] = React.useState({
        darkMode: false,
        notifications: true,
      });

      return (
        <div>
          <SwitchCard
            title="Dark Mode"
            description="Use dark theme"
            checked={settings.darkMode}
            onChange={(e) => setSettings((s) => ({ ...s, darkMode: e.target.checked }))}
          />
          <SwitchCard
            title="Notifications"
            description="Receive alerts"
            checked={settings.notifications}
            onChange={(e) => setSettings((s) => ({ ...s, notifications: e.target.checked }))}
          />
          <div data-testid="settings">{JSON.stringify(settings)}</div>
        </div>
      );
    }

    render(<SettingsPanel />);

    expect(screen.getByTestId('settings')).toHaveTextContent(
      '{"darkMode":false,"notifications":true}'
    );

    await userEvent.click(screen.getByText('Dark Mode'));
    expect(screen.getByTestId('settings')).toHaveTextContent(
      '{"darkMode":true,"notifications":true}'
    );
  });
});
