import { indicatorStore } from '@/stores/indicatorStore';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import IndicatorSettingsDrawerSimple from '../../../components/IndicatorSettingsDrawer';

// Mock the stores
vi.mock('@/stores/indicatorStore', () => {
  const DEFAULT_STATE = {
    flags: {
      ema20: true,
      ema50: false,
      bband: false,
      bbFill: true,
      vwap: false,
      vwma: false,
      rsi: false,
      macd: false,
      stddev: false,
    },
    params: { bbPeriod: 20, bbMult: 2, vwmaPeriod: 20, stddevPeriod: 20, stddevMult: 2 },
    style: { bbFillColor: '#22d3ee', bbFillOpacity: 0.12 },
  };

  let currentState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  const subscribers = new Set<(state: ReturnType<typeof indicatorStore.get>) => void>();

  const store = {
    get: vi.fn(() => ({ ...currentState, ...currentState.flags })),
    set: vi.fn((partial: Partial<typeof currentState>) => {
      if (partial.params) currentState.params = { ...currentState.params, ...partial.params };
      if (partial.style) currentState.style = { ...currentState.style, ...partial.style };
      subscribers.forEach((fn) => fn({ ...currentState, ...currentState.flags }));
    }),
    setStyle: vi.fn((key: string, value: unknown) => {
      currentState.style = { ...currentState.style, [key]: value };
      subscribers.forEach((fn) => fn({ ...currentState, ...currentState.flags }));
    }),
    subscribe: vi.fn((fn: (state: ReturnType<typeof indicatorStore.get>) => void) => {
      subscribers.add(fn);
      fn({ ...currentState, ...currentState.flags }); // Call immediately
      return () => subscribers.delete(fn);
    }),
    reset: vi.fn(() => {
      currentState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      subscribers.forEach((fn) => fn({ ...currentState, ...currentState.flags }));
    }),
    saveForSymbol: vi.fn(),
    clearForSymbol: vi.fn(),
    // Expose for test reset
    __resetState: () => {
      currentState = JSON.parse(JSON.stringify(DEFAULT_STATE));
      vi.mocked(store.get).mockReturnValue({ ...currentState, ...currentState.flags });
    },
  };

  return { indicatorStore: store };
});

vi.mock('@/stores/symbolStore', () => ({
  symbolStore: {
    get: vi.fn(() => 'BTCUSD'),
  },
}));

describe('IndicatorSettingsDrawer (Simple - components/)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    (indicatorStore as unknown as { __resetState: () => void }).__resetState?.();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders collapsed by default', () => {
      render(<IndicatorSettingsDrawerSimple />);

      expect(screen.getByText(/Indicator Settings/)).toBeInTheDocument();
      // Check for collapsed indicator
      const button = screen.getByRole('button', { name: /Indicator Settings/ });
      expect(button.textContent).toContain('▸');

      // Should not show settings content when collapsed
      expect(screen.queryByText('Bollinger Bands')).not.toBeInTheDocument();
    });

    it('expands when header is clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      // Click to expand
      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      // Check for expanded indicator
      const button = screen.getByRole('button', { name: /Indicator Settings/ });
      expect(button.textContent).toContain('▾');
      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
    });

    it('collapses when header is clicked again', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      // Expand
      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));
      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));
      expect(screen.queryByText('Bollinger Bands')).not.toBeInTheDocument();
    });
  });

  describe('Bollinger Bands settings', () => {
    it('displays Bollinger Bands section', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
      expect(screen.getAllByText('Period')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Mult')[0]).toBeInTheDocument();
    });

    it('shows default bbPeriod value', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const periodInput = screen.getAllByRole('spinbutton')[0];
      expect(periodInput).toHaveValue(20);
    });

    it('updates bbPeriod when valid number entered', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const periodInput = screen.getAllByRole('spinbutton')[0];
      await user.clear(periodInput);
      await user.type(periodInput, '30');

      expect(indicatorStore.set).toHaveBeenCalled();
    });

    it('does not update bbPeriod for non-positive numbers', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const periodInput = screen.getAllByRole('spinbutton')[0];
      await user.clear(periodInput);
      await user.type(periodInput, '0');

      // Should not call set for 0 value
      const setCalls = vi.mocked(indicatorStore.set).mock.calls;
      const callsWithParams = setCalls.filter((call) => call[0]?.params);
      expect(callsWithParams.every((call) => call[0].params?.bbPeriod !== 0)).toBe(true);
    });

    it('updates bbMult when valid number entered', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const inputs = screen.getAllByRole('spinbutton');
      const multInput = inputs[1]; // Second input is bbMult
      await user.clear(multInput);
      await user.type(multInput, '2.5');

      expect(indicatorStore.set).toHaveBeenCalled();
    });
  });

  describe('VWMA settings', () => {
    it('displays VWMA section', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      expect(screen.getByText('VWMA')).toBeInTheDocument();
    });

    it('shows default vwmaPeriod value', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      // Find the VWMA period input (third spinbutton)
      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[2]).toHaveValue(20);
    });

    it('updates vwmaPeriod when valid number entered', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const inputs = screen.getAllByRole('spinbutton');
      const vwmaPeriodInput = inputs[2];
      await user.clear(vwmaPeriodInput);
      await user.type(vwmaPeriodInput, '14');

      expect(indicatorStore.set).toHaveBeenCalled();
    });
  });

  describe('StdDev Channels settings', () => {
    it('displays StdDev Channels section', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      expect(screen.getByText('StdDev Channels')).toBeInTheDocument();
    });

    it('shows default stddevPeriod and stddevMult values', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const inputs = screen.getAllByRole('spinbutton');
      expect(inputs[3]).toHaveValue(20); // stddevPeriod
      expect(inputs[4]).toHaveValue(2); // stddevMult
    });
  });

  describe('Bollinger Band Fill settings', () => {
    it('displays Fill section', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      expect(screen.getByText('Bollinger Band Fill')).toBeInTheDocument();
    });

    it('displays theme dropdown with default value', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const themeSelect = screen.getByRole('combobox');
      expect(themeSelect).toHaveValue('#22d3ee'); // Default
    });

    it('updates bbFillColor when theme is changed', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const themeSelect = screen.getByRole('combobox');
      await user.selectOptions(themeSelect, '#ef4444'); // Red

      expect(indicatorStore.setStyle).toHaveBeenCalledWith('bbFillColor', '#ef4444');
    });

    it('displays color picker', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const colorInput = document.querySelector('input[type="color"]');
      expect(colorInput).toBeInTheDocument();
      expect(colorInput).toHaveValue('#22d3ee');
    });

    it('updates bbFillColor when color picker changes', async () => {
      render(<IndicatorSettingsDrawerSimple />);

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement;
      fireEvent.change(colorInput, { target: { value: '#ff0000' } });

      expect(indicatorStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ bbFillColor: '#ff0000' }),
        })
      );
    });

    it('displays opacity slider', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
    });

    it('updates bbFillOpacity when slider changes', async () => {
      render(<IndicatorSettingsDrawerSimple />);

      // Expand
      fireEvent.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0.5' } });

      expect(indicatorStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          style: expect.objectContaining({ bbFillOpacity: 0.5 }),
        })
      );
    });

    it('displays opacity percentage', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      // Default opacity is 0.12 = 12%
      expect(screen.getByText('12%')).toBeInTheDocument();
    });
  });

  describe('action buttons', () => {
    it('displays Reset to defaults button', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      expect(screen.getByRole('button', { name: /Reset to defaults/ })).toBeInTheDocument();
    });

    it('calls reset when Reset to defaults is clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));
      await user.click(screen.getByRole('button', { name: /Reset to defaults/ }));

      expect(indicatorStore.reset).toHaveBeenCalled();
    });

    it('displays Save for symbol button with current symbol', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      expect(screen.getByRole('button', { name: /Save for BTCUSD/ })).toBeInTheDocument();
    });

    it('calls saveForSymbol when Save button is clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));
      await user.click(screen.getByRole('button', { name: /Save for BTCUSD/ }));

      expect(indicatorStore.saveForSymbol).toHaveBeenCalledWith('BTCUSD');
    });

    it('displays Clear preset button with current symbol', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      expect(screen.getByRole('button', { name: /Clear BTCUSD preset/ })).toBeInTheDocument();
    });

    it('calls clearForSymbol when Clear preset is clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));
      await user.click(screen.getByRole('button', { name: /Clear BTCUSD preset/ }));

      expect(indicatorStore.clearForSymbol).toHaveBeenCalledWith('BTCUSD');
    });
  });

  describe('store subscription', () => {
    it('subscribes to indicatorStore on mount', () => {
      render(<IndicatorSettingsDrawerSimple />);
      expect(indicatorStore.subscribe).toHaveBeenCalled();
    });

    it('unsubscribes from indicatorStore on unmount', () => {
      const unsubscribe = vi.fn();
      vi.mocked(indicatorStore.subscribe).mockReturnValue(unsubscribe);

      const { unmount } = render(<IndicatorSettingsDrawerSimple />);
      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });

    it('updates UI when store state changes', async () => {
      const user = userEvent.setup();

      // Setup mock to allow state changes
      let subscribeCallback: ((state: ReturnType<typeof indicatorStore.get>) => void) | null = null;
      vi.mocked(indicatorStore.subscribe).mockImplementation((fn) => {
        subscribeCallback = fn;
        fn(indicatorStore.get());
        return () => {
          subscribeCallback = null;
        };
      });

      render(<IndicatorSettingsDrawerSimple />);
      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      // Simulate store update
      if (subscribeCallback) {
        const newState = {
          ...indicatorStore.get(),
          params: { ...indicatorStore.get().params, bbPeriod: 50 },
        };
        vi.mocked(indicatorStore.get).mockReturnValue(newState);
        subscribeCallback(newState);
      }

      // UI should reflect new value
      await waitFor(() => {
        const inputs = screen.getAllByRole('spinbutton');
        expect(inputs[0]).toHaveValue(50);
      });
    });
  });

  describe('input validation', () => {
    it('rejects negative numbers for period inputs', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const periodInput = screen.getAllByRole('spinbutton')[0];
      await user.clear(periodInput);
      await user.type(periodInput, '-5');

      // Should not call set with negative value
      const setCalls = vi.mocked(indicatorStore.set).mock.calls;
      expect(
        setCalls.every((call) => !call[0]?.params?.bbPeriod || call[0].params.bbPeriod > 0)
      ).toBe(true);
    });

    it('accepts decimal values for multiplier inputs', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const inputs = screen.getAllByRole('spinbutton');
      const multInput = inputs[1]; // bbMult
      await user.clear(multInput);
      await user.type(multInput, '1.5');

      expect(indicatorStore.set).toHaveBeenCalled();
    });
  });

  describe('styling', () => {
    it('has proper container styling', () => {
      render(<IndicatorSettingsDrawerSimple />);

      const container = document.querySelector('.rounded-2xl');
      expect(container).toHaveClass('border');
      expect(container).toHaveClass('border-neutral-800');
    });

    it('button has full width', () => {
      render(<IndicatorSettingsDrawerSimple />);

      const button = screen.getByRole('button', { name: /Indicator Settings/ });
      expect(button).toHaveClass('w-full');
    });

    it('Clear button has rose border color', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawerSimple />);

      await user.click(screen.getByRole('button', { name: /Indicator Settings/ }));

      const clearButton = screen.getByRole('button', { name: /Clear BTCUSD preset/ });
      expect(clearButton).toHaveClass('border-rose-700');
    });
  });
});
