import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create mock store state
function createMockStore(overrides = {}) {
  return {
    indicators: {
      showRSI: true,
      showMACD: true,
      showBB: true,
      showStochastic: true,
      showADX: true,
      showCCI: true,
      showWilliamsR: true,
      showOBV: true,
      showADLine: true,
    },
    indicatorSettings: {
      rsiPeriod: 14,
      macdFastPeriod: 12,
      macdSlowPeriod: 26,
      macdSignalPeriod: 9,
      bbPeriod: 20,
      bbMult: 2,
      stochasticKPeriod: 14,
      stochasticDPeriod: 3,
      adxPeriod: 14,
      cciPeriod: 20,
      williamsRPeriod: 14,
    },
    updateIndicatorSetting: vi.fn(),
    resetIndicatorSettings: vi.fn(),
    applyPreset: vi.fn(),
    toggleIndicatorControlsPanel: vi.fn(),
    ...overrides,
  };
}

let mockStoreState = createMockStore();

vi.mock('@/state/store', () => ({
  useChartStore: () => mockStoreState,
}));

// Import after mock setup
import IndicatorControlsPanel from '@/components/dashboard/IndicatorControlsPanel';

describe('IndicatorControlsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = createMockStore();
    // Clear localStorage
    localStorage.clear();
  });

  describe('Rendering', () => {
    it('should render the panel with header', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByText('Indicator Settings')).toBeInTheDocument();
    });

    it('should render Reset All button', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByRole('button', { name: /reset all/i })).toBeInTheDocument();
    });

    it('should render Expand/Collapse button', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByRole('button', { name: /expand/i })).toBeInTheDocument();
    });

    it('should render preset selector', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByTitle('Select a trading strategy preset')).toBeInTheDocument();
    });

    it('should render Apply button for presets', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByRole('button', { name: /apply/i })).toBeInTheDocument();
    });

    it('should render keyboard shortcuts section', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByText('⌨️ Keyboard Shortcuts')).toBeInTheDocument();
    });

    it('should show collapsed state by default', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.queryByText('RSI Period')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should expand panel when clicking expand button', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      await user.click(screen.getByRole('button', { name: /expand/i }));

      expect(screen.getByText('RSI Period')).toBeInTheDocument();
    });

    it('should show collapse button when expanded', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      await user.click(screen.getByRole('button', { name: /expand/i }));

      expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
    });

    it('should collapse panel when clicking collapse button', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      // Expand
      await user.click(screen.getByRole('button', { name: /expand/i }));
      expect(screen.getByText('RSI Period')).toBeInTheDocument();

      // Collapse
      await user.click(screen.getByRole('button', { name: /collapse/i }));
      expect(screen.queryByText('RSI Period')).not.toBeInTheDocument();
    });
  });

  describe('Indicator Settings Display', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));
    });

    it('should display RSI settings when RSI is enabled', () => {
      expect(screen.getByText('RSI Period')).toBeInTheDocument();
      expect(screen.getByText('Relative Strength Index lookback period')).toBeInTheDocument();
    });

    it('should display MACD settings when MACD is enabled', () => {
      expect(screen.getByText('MACD Settings')).toBeInTheDocument();
      expect(screen.getByText('Fast Period')).toBeInTheDocument();
      expect(screen.getByText('Slow Period')).toBeInTheDocument();
      expect(screen.getByText('Signal Period')).toBeInTheDocument();
    });

    it('should display Bollinger Bands settings when BB is enabled', () => {
      expect(screen.getByText('Bollinger Bands Settings')).toBeInTheDocument();
      expect(screen.getByText('Period')).toBeInTheDocument();
      expect(screen.getByText('Std Deviation')).toBeInTheDocument();
    });

    it('should display Stochastic settings when Stochastic is enabled', () => {
      expect(screen.getByText('Stochastic Settings')).toBeInTheDocument();
      expect(screen.getByText('%K Period')).toBeInTheDocument();
      expect(screen.getByText('%D Period')).toBeInTheDocument();
    });

    it('should display ADX settings when ADX is enabled', () => {
      expect(screen.getByText('ADX Period')).toBeInTheDocument();
      expect(screen.getByText('Average Directional Index lookback period')).toBeInTheDocument();
    });

    it('should display CCI settings when CCI is enabled', () => {
      expect(screen.getByText('CCI Period')).toBeInTheDocument();
      expect(screen.getByText('Commodity Channel Index lookback period')).toBeInTheDocument();
    });

    it('should display Williams %R settings when Williams %R is enabled', () => {
      expect(screen.getByText('Williams %R Period')).toBeInTheDocument();
      expect(screen.getByText('Williams %R lookback period')).toBeInTheDocument();
    });

    it('should display OBV message when OBV is enabled', () => {
      expect(
        screen.getByText(/OBV \(On-Balance Volume\) - No configurable settings/)
      ).toBeInTheDocument();
    });

    it('should display A/D Line message when A/D Line is enabled', () => {
      expect(
        screen.getByText(/A\/D Line \(Accumulation\/Distribution\) - No configurable settings/)
      ).toBeInTheDocument();
    });
  });

  describe('Indicator Settings Hidden When Disabled', () => {
    it('should not show RSI settings when RSI is disabled', async () => {
      mockStoreState = createMockStore({
        indicators: { ...mockStoreState.indicators, showRSI: false },
      });

      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      expect(screen.queryByText('RSI Period')).not.toBeInTheDocument();
    });

    it('should not show MACD settings when MACD is disabled', async () => {
      mockStoreState = createMockStore({
        indicators: { ...mockStoreState.indicators, showMACD: false },
      });

      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      expect(screen.queryByText('MACD Settings')).not.toBeInTheDocument();
    });

    it('should show "No indicators active" message when all indicators disabled', async () => {
      mockStoreState = createMockStore({
        indicators: {
          showRSI: false,
          showMACD: false,
          showBB: false,
          showStochastic: false,
          showADX: false,
          showCCI: false,
          showWilliamsR: false,
          showOBV: false,
          showADLine: false,
        },
      });

      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      expect(
        screen.getByText(/No indicators active. Toggle indicators to customize settings./)
      ).toBeInTheDocument();
    });
  });

  describe('Input Value Changes', () => {
    it('should update RSI period when input changes', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const rsiInput = inputs[0]; // First input is RSI period

      fireEvent.change(rsiInput, { target: { value: '20' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('rsiPeriod', 20);
    });

    it('should validate and clamp values within range', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const rsiInput = inputs[0];

      // Try to set value above max (50)
      fireEvent.change(rsiInput, { target: { value: '100' } });

      // Should be clamped to max
      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('rsiPeriod', 50);
    });

    it('should validate and clamp values at minimum', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const rsiInput = inputs[0];

      // Try to set value below min (5)
      fireEvent.change(rsiInput, { target: { value: '2' } });

      // Should be clamped to min
      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('rsiPeriod', 5);
    });
  });

  describe('Reset Individual Value', () => {
    it('should have reset button for each indicator control', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      // Should find multiple reset buttons (↺)
      const resetButtons = screen.getAllByTitle('Reset to default');
      expect(resetButtons.length).toBeGreaterThan(0);
    });

    it('should reset individual value when clicking reset button', async () => {
      const user = userEvent.setup();
      mockStoreState = createMockStore({
        indicatorSettings: {
          ...createMockStore().indicatorSettings,
          rsiPeriod: 30, // Non-default value
        },
      });

      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const resetButtons = screen.getAllByTitle('Reset to default');
      await user.click(resetButtons[0]); // First reset button (RSI)

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('rsiPeriod', 14);
    });
  });

  describe('Reset All Functionality', () => {
    it('should show confirmation dialog when clicking Reset All', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      await user.click(screen.getByRole('button', { name: /reset all/i }));

      expect(screen.getByText('Reset All Indicators')).toBeInTheDocument();
      expect(
        screen.getByText(/This will reset all indicator settings to their default values/)
      ).toBeInTheDocument();
    });

    it('should reset settings when confirming', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      await user.click(screen.getByRole('button', { name: /reset all/i }));
      await user.click(screen.getByRole('button', { name: /^reset$/i }));

      expect(mockStoreState.resetIndicatorSettings).toHaveBeenCalled();
    });

    it('should close dialog when canceling', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      await user.click(screen.getByRole('button', { name: /reset all/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(screen.queryByText('Reset All Indicators')).not.toBeInTheDocument();
      expect(mockStoreState.resetIndicatorSettings).not.toHaveBeenCalled();
    });

    it('should skip confirmation when "dont ask again" was previously set', async () => {
      localStorage.setItem('lokifi_confirm_reset_all_indicators', 'false');

      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      await user.click(screen.getByRole('button', { name: /reset all/i }));

      // Should reset immediately without dialog
      expect(mockStoreState.resetIndicatorSettings).toHaveBeenCalled();
      expect(screen.queryByText('Reset All Indicators')).not.toBeInTheDocument();
    });
  });

  describe('Preset Selection', () => {
    it('should have all preset options', () => {
      render(<IndicatorControlsPanel />);

      const select = screen.getByTitle('Select a trading strategy preset');
      expect(select).toBeInTheDocument();

      expect(within(select).getByText(/Day Trading/)).toBeInTheDocument();
      expect(within(select).getByText(/Swing Trading/)).toBeInTheDocument();
      expect(within(select).getByText(/Position Trading/)).toBeInTheDocument();
    });

    it('should disable Apply button when no preset selected', () => {
      render(<IndicatorControlsPanel />);

      const applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton).toBeDisabled();
    });

    it('should enable Apply button when preset is selected', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      const select = screen.getByTitle('Select a trading strategy preset');
      await user.selectOptions(select, 'day-trading');

      const applyButton = screen.getByRole('button', { name: /apply/i });
      expect(applyButton).not.toBeDisabled();
    });

    it('should show confirmation dialog when applying preset', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      const select = screen.getByTitle('Select a trading strategy preset');
      await user.selectOptions(select, 'day-trading');
      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(screen.getByText('Apply Preset Configuration')).toBeInTheDocument();
      expect(screen.getByText(/Apply Day Trading preset/)).toBeInTheDocument();
    });

    it('should apply preset when confirmed', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      const select = screen.getByTitle('Select a trading strategy preset');
      await user.selectOptions(select, 'swing-trading');
      await user.click(screen.getByRole('button', { name: /apply/i }));
      await user.click(screen.getByRole('button', { name: /^reset$/i })); // Confirm button says "Reset"

      expect(mockStoreState.applyPreset).toHaveBeenCalledWith('swing-trading');
    });

    it('should not apply preset when cancelled', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      const select = screen.getByTitle('Select a trading strategy preset');
      await user.selectOptions(select, 'position-trading');
      await user.click(screen.getByRole('button', { name: /apply/i }));
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockStoreState.applyPreset).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should display Ctrl/Cmd+R shortcut', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByText('Reset All Settings:')).toBeInTheDocument();
      expect(screen.getByText('Ctrl/Cmd+R')).toBeInTheDocument();
    });

    it('should display Ctrl/Cmd+S shortcut', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByText('Apply Preset:')).toBeInTheDocument();
      expect(screen.getByText('Ctrl/Cmd+S')).toBeInTheDocument();
    });

    it('should display Ctrl/Cmd+I shortcut', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByText('Toggle Panel:')).toBeInTheDocument();
      expect(screen.getByText('Ctrl/Cmd+I')).toBeInTheDocument();
    });

    it('should display Esc shortcut', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByText('Close Dialogs:')).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
    });

    it('should trigger reset on Ctrl+R', async () => {
      render(<IndicatorControlsPanel />);

      fireEvent.keyDown(window, { key: 'r', ctrlKey: true });

      // Should show confirmation dialog
      expect(screen.getByText('Reset All Indicators')).toBeInTheDocument();
    });

    it('should toggle panel on Ctrl+I', async () => {
      render(<IndicatorControlsPanel />);

      fireEvent.keyDown(window, { key: 'i', ctrlKey: true });

      expect(mockStoreState.toggleIndicatorControlsPanel).toHaveBeenCalled();
    });
  });

  describe('MACD Settings Update', () => {
    it('should update MACD fast period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      // Find the MACD fast period input (comes after RSI input)
      const inputs = screen.getAllByRole('spinbutton');
      const macdFastInput = inputs[1]; // Second input

      fireEvent.change(macdFastInput, { target: { value: '15' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('macdFastPeriod', 15);
    });

    it('should update MACD slow period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const macdSlowInput = inputs[2]; // Third input

      fireEvent.change(macdSlowInput, { target: { value: '30' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('macdSlowPeriod', 30);
    });

    it('should update MACD signal period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const macdSignalInput = inputs[3]; // Fourth input

      fireEvent.change(macdSignalInput, { target: { value: '7' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('macdSignalPeriod', 7);
    });
  });

  describe('Bollinger Bands Settings Update', () => {
    it('should update BB period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const bbPeriodInput = inputs[4]; // Fifth input

      fireEvent.change(bbPeriodInput, { target: { value: '25' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('bbPeriod', 25);
    });

    it('should update BB multiplier', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const bbMultInput = inputs[5]; // Sixth input

      fireEvent.change(bbMultInput, { target: { value: '2.5' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('bbMult', 2.5);
    });
  });

  describe('Stochastic Settings Update', () => {
    it('should update Stochastic K period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const stochasticKInput = inputs[6]; // Seventh input

      fireEvent.change(stochasticKInput, { target: { value: '10' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('stochasticKPeriod', 10);
    });

    it('should update Stochastic D period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const stochasticDInput = inputs[7]; // Eighth input

      fireEvent.change(stochasticDInput, { target: { value: '5' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('stochasticDPeriod', 5);
    });
  });

  describe('Other Indicator Settings Update', () => {
    it('should update ADX period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const adxInput = inputs[8]; // Ninth input

      fireEvent.change(adxInput, { target: { value: '20' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('adxPeriod', 20);
    });

    it('should update CCI period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const cciInput = inputs[9]; // Tenth input

      fireEvent.change(cciInput, { target: { value: '25' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('cciPeriod', 25);
    });

    it('should update Williams %R period', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const williamsRInput = inputs[10]; // Eleventh input

      fireEvent.change(williamsRInput, { target: { value: '10' } });

      expect(mockStoreState.updateIndicatorSetting).toHaveBeenCalledWith('williamsRPeriod', 10);
    });
  });

  describe('Button Titles and Accessibility', () => {
    it('should have proper title on Reset All button', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByTitle('Reset all settings to defaults (Ctrl/Cmd+R)')).toBeInTheDocument();
    });

    it('should have proper title on disabled Apply button', () => {
      render(<IndicatorControlsPanel />);
      expect(screen.getByTitle('Select a preset first')).toBeInTheDocument();
    });

    it('should have proper title on enabled Apply button', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);

      const select = screen.getByTitle('Select a trading strategy preset');
      await user.selectOptions(select, 'day-trading');

      expect(screen.getByTitle('Apply selected preset (Ctrl/Cmd+S)')).toBeInTheDocument();
    });
  });

  describe('Input Blur Handling', () => {
    it('should restore valid value on blur with invalid input', async () => {
      const user = userEvent.setup();
      render(<IndicatorControlsPanel />);
      await user.click(screen.getByRole('button', { name: /expand/i }));

      const inputs = screen.getAllByRole('spinbutton');
      const rsiInput = inputs[0] as HTMLInputElement;

      // Type invalid value
      fireEvent.change(rsiInput, { target: { value: 'invalid' } });
      fireEvent.blur(rsiInput);

      // Should revert to previous valid value
      expect(rsiInput.value).toBe('14');
    });
  });

  describe('Styling and Layout', () => {
    it('should have rounded border on main container', () => {
      const { container } = render(<IndicatorControlsPanel />);
      const panel = container.querySelector('.rounded-2xl');
      expect(panel).toBeInTheDocument();
    });

    it('should have keyboard shortcuts section with border', () => {
      const { container } = render(<IndicatorControlsPanel />);
      const shortcutsSection = container.querySelector('.border-t');
      expect(shortcutsSection).toBeInTheDocument();
    });
  });
});
