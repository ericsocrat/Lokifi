import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Store mock setup
const mockToggleIndicator = vi.fn();
const mockUpdateIndicatorSettings = vi.fn();

const createMockStore = (overrides = {}) => ({
  indicators: {
    showBB: false,
    showRSI: false,
    showMACD: false,
    showStochastic: false,
    showADX: false,
    showCCI: false,
    showWilliamsR: false,
    showOBV: false,
    showADLine: false,
    showVWAP: false,
    showVWMA: false,
    showStdChannels: false,
    bandFill: false,
    ...overrides,
  },
  indicatorSettings: {
    bbPeriod: 20,
    bbMult: 2,
    rsiPeriod: 14,
    macdFastPeriod: 12,
    macdSlowPeriod: 26,
    macdSignalPeriod: 9,
    stochasticKPeriod: 14,
    stochasticDPeriod: 3,
    adxPeriod: 14,
    cciPeriod: 20,
    williamsRPeriod: 14,
    vwmaPeriod: 20,
    stdChannelPeriod: 20,
    stdChannelMult: 2,
    ...overrides,
  },
  toggleIndicator: mockToggleIndicator,
  updateIndicatorSettings: mockUpdateIndicatorSettings,
});

let mockStoreState = createMockStore();

vi.mock('@/state/store', () => ({
  useChartStore: () => mockStoreState,
}));

import IndicatorSettingsDrawer from '@/components/IndicatorSettingsDrawer';

describe('IndicatorSettingsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStoreState = createMockStore();
  });

  describe('Rendering', () => {
    it('should render main heading', () => {
      render(<IndicatorSettingsDrawer />);
      expect(screen.getByText('Indicators')).toBeInTheDocument();
    });

    it('should render all primary indicator toggles', () => {
      render(<IndicatorSettingsDrawer />);

      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
      expect(screen.getByText('RSI')).toBeInTheDocument();
      expect(screen.getByText('MACD')).toBeInTheDocument();
      expect(screen.getByText('Stochastic')).toBeInTheDocument();
      expect(screen.getByText('ADX')).toBeInTheDocument();
      expect(screen.getByText('CCI')).toBeInTheDocument();
      expect(screen.getByText('Williams %R')).toBeInTheDocument();
      expect(screen.getByText('OBV')).toBeInTheDocument();
      expect(screen.getByText('A/D Line')).toBeInTheDocument();
    });

    it('should render legacy indicators section', () => {
      render(<IndicatorSettingsDrawer />);

      expect(screen.getByText('Legacy Indicators')).toBeInTheDocument();
      expect(screen.getByText('VWAP')).toBeInTheDocument();
      expect(screen.getByText('VWMA')).toBeInTheDocument();
      expect(screen.getByText('StdDev Channels')).toBeInTheDocument();
    });

    it('should render divider between sections', () => {
      render(<IndicatorSettingsDrawer />);
      expect(document.querySelector('hr')).toBeInTheDocument();
    });

    it('should have all checkboxes unchecked by default', () => {
      render(<IndicatorSettingsDrawer />);

      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).not.toBeChecked();
      });
    });
  });

  describe('Bollinger Bands', () => {
    it('should toggle Bollinger Bands when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const bbLabel = screen.getByText('Bollinger Bands').closest('label');
      const checkbox = within(bbLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showBB');
    });

    it('should show settings when Bollinger Bands is enabled', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      expect(screen.getByText('Period')).toBeInTheDocument();
      expect(screen.getByText('Std Dev')).toBeInTheDocument();
      expect(screen.getByText('Band Fill')).toBeInTheDocument();
    });

    it('should not show settings when Bollinger Bands is disabled', () => {
      mockStoreState = createMockStore({ showBB: false });
      render(<IndicatorSettingsDrawer />);

      // Only the Period from RSI/other indicators should not appear since they're all hidden
      // But RSI has Period too, so let's check for Std Dev which is BB-specific
      expect(screen.queryByText('Std Dev')).not.toBeInTheDocument();
      expect(screen.queryByText('Band Fill')).not.toBeInTheDocument();
    });

    it('should update period setting', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('20');
      fireEvent.change(periodInput, { target: { value: '30' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ bbPeriod: 30 });
    });

    it('should update std dev setting', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      // Find the Std Dev input by its value
      const stdDevInput = screen.getByDisplayValue('2');
      fireEvent.change(stdDevInput, { target: { value: '2.5' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ bbMult: 2.5 });
    });

    it('should toggle band fill', async () => {
      const user = userEvent.setup();
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const bandFillLabel = screen.getByText('Band Fill').closest('label');
      const checkbox = within(bandFillLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('bandFill');
    });

    it('should have proper input constraints for period', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('20');
      expect(periodInput).toHaveAttribute('min', '5');
      expect(periodInput).toHaveAttribute('max', '100');
    });

    it('should have proper input constraints for std dev', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const stdDevInput = screen.getByDisplayValue('2');
      expect(stdDevInput).toHaveAttribute('min', '1');
      expect(stdDevInput).toHaveAttribute('max', '5');
      expect(stdDevInput).toHaveAttribute('step', '0.1');
    });
  });

  describe('RSI', () => {
    it('should toggle RSI when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const rsiLabel = screen.getByText('RSI').closest('label');
      const checkbox = within(rsiLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showRSI');
    });

    it('should show RSI period setting when enabled', () => {
      mockStoreState = createMockStore({ showRSI: true });
      render(<IndicatorSettingsDrawer />);

      const periodInputs = screen.getAllByDisplayValue('14');
      expect(periodInputs.length).toBeGreaterThan(0);
    });

    it('should update RSI period', () => {
      mockStoreState = createMockStore({ showRSI: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('14');
      fireEvent.change(periodInput, { target: { value: '21' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ rsiPeriod: 21 });
    });

    it('should have proper input constraints', () => {
      mockStoreState = createMockStore({ showRSI: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('14');
      expect(periodInput).toHaveAttribute('min', '5');
      expect(periodInput).toHaveAttribute('max', '50');
    });
  });

  describe('MACD', () => {
    it('should toggle MACD when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const macdLabel = screen.getByText('MACD').closest('label');
      const checkbox = within(macdLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showMACD');
    });

    it('should show all MACD settings when enabled', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      expect(screen.getByText('Fast')).toBeInTheDocument();
      expect(screen.getByText('Slow')).toBeInTheDocument();
      expect(screen.getByText('Signal')).toBeInTheDocument();
    });

    it('should update fast period', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const fastInput = screen.getByDisplayValue('12');
      fireEvent.change(fastInput, { target: { value: '15' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ macdFastPeriod: 15 });
    });

    it('should update slow period', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const slowInput = screen.getByDisplayValue('26');
      fireEvent.change(slowInput, { target: { value: '30' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ macdSlowPeriod: 30 });
    });

    it('should update signal period', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const signalInput = screen.getByDisplayValue('9');
      fireEvent.change(signalInput, { target: { value: '12' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ macdSignalPeriod: 12 });
    });

    it('should have proper constraints for fast period', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const fastInput = screen.getByDisplayValue('12');
      expect(fastInput).toHaveAttribute('min', '3');
      expect(fastInput).toHaveAttribute('max', '50');
    });

    it('should have proper constraints for slow period', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const slowInput = screen.getByDisplayValue('26');
      expect(slowInput).toHaveAttribute('min', '10');
      expect(slowInput).toHaveAttribute('max', '100');
    });

    it('should have proper constraints for signal period', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const signalInput = screen.getByDisplayValue('9');
      expect(signalInput).toHaveAttribute('min', '3');
      expect(signalInput).toHaveAttribute('max', '30');
    });
  });

  describe('Stochastic', () => {
    it('should toggle Stochastic when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const stochLabel = screen.getByText('Stochastic').closest('label');
      const checkbox = within(stochLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showStochastic');
    });

    it('should show %K and %D settings when enabled', () => {
      mockStoreState = createMockStore({ showStochastic: true });
      render(<IndicatorSettingsDrawer />);

      expect(screen.getByText('%K Period')).toBeInTheDocument();
      expect(screen.getByText('%D Period')).toBeInTheDocument();
    });

    it('should update %K period', () => {
      mockStoreState = createMockStore({ showStochastic: true });
      render(<IndicatorSettingsDrawer />);

      // %K is 14, %D is 3
      const kInput = screen.getByDisplayValue('14');
      fireEvent.change(kInput, { target: { value: '10' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ stochasticKPeriod: 10 });
    });

    it('should update %D period', () => {
      mockStoreState = createMockStore({ showStochastic: true });
      render(<IndicatorSettingsDrawer />);

      const dInput = screen.getByDisplayValue('3');
      fireEvent.change(dInput, { target: { value: '5' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ stochasticDPeriod: 5 });
    });
  });

  describe('ADX', () => {
    it('should toggle ADX when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const adxLabel = screen.getByText('ADX').closest('label');
      const checkbox = within(adxLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showADX');
    });

    it('should show period setting when enabled', () => {
      mockStoreState = createMockStore({ showADX: true });
      render(<IndicatorSettingsDrawer />);

      const periodInputs = screen.getAllByDisplayValue('14');
      expect(periodInputs.length).toBeGreaterThan(0);
    });

    it('should update ADX period', () => {
      mockStoreState = createMockStore({ showADX: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('14');
      fireEvent.change(periodInput, { target: { value: '20' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ adxPeriod: 20 });
    });
  });

  describe('CCI', () => {
    it('should toggle CCI when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const cciLabel = screen.getByText('CCI').closest('label');
      const checkbox = within(cciLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showCCI');
    });

    it('should update CCI period', () => {
      mockStoreState = createMockStore({ showCCI: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('20');
      fireEvent.change(periodInput, { target: { value: '25' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ cciPeriod: 25 });
    });
  });

  describe('Williams %R', () => {
    it('should toggle Williams %R when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const wrLabel = screen.getByText('Williams %R').closest('label');
      const checkbox = within(wrLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showWilliamsR');
    });

    it('should update Williams %R period', () => {
      mockStoreState = createMockStore({ showWilliamsR: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('14');
      fireEvent.change(periodInput, { target: { value: '21' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ williamsRPeriod: 21 });
    });
  });

  describe('OBV', () => {
    it('should toggle OBV when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const obvLabel = screen.getByText('OBV').closest('label');
      const checkbox = within(obvLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showOBV');
    });

    it('should show "no configurable settings" message when enabled', () => {
      mockStoreState = createMockStore({ showOBV: true });
      render(<IndicatorSettingsDrawer />);

      expect(screen.getByText('No configurable settings')).toBeInTheDocument();
    });
  });

  describe('A/D Line', () => {
    it('should toggle A/D Line when checkbox clicked', async () => {
      const user = userEvent.setup();
      render(<IndicatorSettingsDrawer />);

      const adLineLabel = screen.getByText('A/D Line').closest('label');
      const checkbox = within(adLineLabel!).getByRole('checkbox');

      await user.click(checkbox);

      expect(mockToggleIndicator).toHaveBeenCalledWith('showADLine');
    });

    it('should show "no configurable settings" when enabled', () => {
      mockStoreState = createMockStore({ showADLine: true });
      render(<IndicatorSettingsDrawer />);

      const noSettingsMessages = screen.getAllByText('No configurable settings');
      expect(noSettingsMessages.length).toBeGreaterThan(0);
    });
  });

  describe('Legacy Indicators', () => {
    describe('VWAP', () => {
      it('should toggle VWAP when checkbox clicked', async () => {
        const user = userEvent.setup();
        render(<IndicatorSettingsDrawer />);

        const vwapLabel = screen.getByText('VWAP').closest('label');
        const checkbox = within(vwapLabel!).getByRole('checkbox');

        await user.click(checkbox);

        expect(mockToggleIndicator).toHaveBeenCalledWith('showVWAP');
      });
    });

    describe('VWMA', () => {
      it('should toggle VWMA when checkbox clicked', async () => {
        const user = userEvent.setup();
        render(<IndicatorSettingsDrawer />);

        const vwmaLabel = screen.getByText('VWMA').closest('label');
        const checkbox = within(vwmaLabel!).getByRole('checkbox');

        await user.click(checkbox);

        expect(mockToggleIndicator).toHaveBeenCalledWith('showVWMA');
      });

      it('should show period setting when VWMA enabled', () => {
        mockStoreState = createMockStore({ showVWMA: true });
        render(<IndicatorSettingsDrawer />);

        const periodInputs = screen.getAllByDisplayValue('20');
        expect(periodInputs.length).toBeGreaterThan(0);
      });

      it('should update VWMA period', () => {
        mockStoreState = createMockStore({ showVWMA: true });
        render(<IndicatorSettingsDrawer />);

        const periodInput = screen.getByDisplayValue('20');
        fireEvent.change(periodInput, { target: { value: '30' } });

        expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ vwmaPeriod: 30 });
      });
    });

    describe('StdDev Channels', () => {
      it('should toggle StdDev Channels when checkbox clicked', async () => {
        const user = userEvent.setup();
        render(<IndicatorSettingsDrawer />);

        const stdLabel = screen.getByText('StdDev Channels').closest('label');
        const checkbox = within(stdLabel!).getByRole('checkbox');

        await user.click(checkbox);

        expect(mockToggleIndicator).toHaveBeenCalledWith('showStdChannels');
      });

      it('should show settings when enabled', () => {
        mockStoreState = createMockStore({ showStdChannels: true });
        render(<IndicatorSettingsDrawer />);

        expect(screen.getByText('Mult')).toBeInTheDocument();
      });

      it('should update StdDev channel period', () => {
        mockStoreState = createMockStore({ showStdChannels: true });
        render(<IndicatorSettingsDrawer />);

        const periodInput = screen.getByDisplayValue('20');
        fireEvent.change(periodInput, { target: { value: '30' } });

        expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ stdChannelPeriod: 30 });
      });

      it('should update StdDev channel multiplier', () => {
        mockStoreState = createMockStore({ showStdChannels: true });
        render(<IndicatorSettingsDrawer />);

        const multInput = screen.getByDisplayValue('2');
        fireEvent.change(multInput, { target: { value: '3' } });

        expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ stdChannelMult: 3 });
      });
    });
  });

  describe('Multiple Indicators', () => {
    it('should show multiple indicator settings simultaneously', () => {
      mockStoreState = createMockStore({
        showBB: true,
        showRSI: true,
        showMACD: true,
      });
      render(<IndicatorSettingsDrawer />);

      // BB settings
      expect(screen.getByText('Std Dev')).toBeInTheDocument();
      expect(screen.getByText('Band Fill')).toBeInTheDocument();

      // MACD settings
      expect(screen.getByText('Fast')).toBeInTheDocument();
      expect(screen.getByText('Slow')).toBeInTheDocument();
      expect(screen.getByText('Signal')).toBeInTheDocument();
    });
  });

  describe('Default Values Handling', () => {
    it('should use default value when input is cleared (BB period)', async () => {
      const _user = userEvent.setup();
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('20');
      fireEvent.change(periodInput, { target: { value: '' } });

      // Should parse empty as fallback default (20)
      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ bbPeriod: 20 });
    });

    it('should use default value when input is cleared (BB mult)', async () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const multInput = screen.getByDisplayValue('2');
      fireEvent.change(multInput, { target: { value: '' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ bbMult: 2 });
    });

    it('should use default value when RSI input is cleared', () => {
      mockStoreState = createMockStore({ showRSI: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('14');
      fireEvent.change(periodInput, { target: { value: '' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ rsiPeriod: 14 });
    });

    it('should use default value when MACD fast is cleared', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const fastInput = screen.getByDisplayValue('12');
      fireEvent.change(fastInput, { target: { value: '' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ macdFastPeriod: 12 });
    });

    it('should use default value when MACD slow is cleared', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const slowInput = screen.getByDisplayValue('26');
      fireEvent.change(slowInput, { target: { value: '' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ macdSlowPeriod: 26 });
    });

    it('should use default value when MACD signal is cleared', () => {
      mockStoreState = createMockStore({ showMACD: true });
      render(<IndicatorSettingsDrawer />);

      const signalInput = screen.getByDisplayValue('9');
      fireEvent.change(signalInput, { target: { value: '' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ macdSignalPeriod: 9 });
    });

    it('should use default value when Stochastic K is cleared', () => {
      mockStoreState = createMockStore({ showStochastic: true });
      render(<IndicatorSettingsDrawer />);

      const kInput = screen.getByDisplayValue('14');
      fireEvent.change(kInput, { target: { value: '' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ stochasticKPeriod: 14 });
    });

    it('should use default value when Stochastic D is cleared', () => {
      mockStoreState = createMockStore({ showStochastic: true });
      render(<IndicatorSettingsDrawer />);

      const dInput = screen.getByDisplayValue('3');
      fireEvent.change(dInput, { target: { value: '' } });

      expect(mockUpdateIndicatorSettings).toHaveBeenCalledWith({ stochasticDPeriod: 3 });
    });
  });

  describe('Styling', () => {
    it('should have proper spacing container', () => {
      render(<IndicatorSettingsDrawer />);
      expect(document.querySelector('.space-y-4')).toBeInTheDocument();
    });

    it('should have styled input fields', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('20');
      expect(periodInput).toHaveClass('bg-transparent', 'border', 'rounded');
    });

    it('should have legacy section with reduced opacity', () => {
      render(<IndicatorSettingsDrawer />);
      expect(document.querySelector('.opacity-75')).toBeInTheDocument();
    });

    it('should have italic styling for no settings message', () => {
      mockStoreState = createMockStore({ showOBV: true });
      render(<IndicatorSettingsDrawer />);

      expect(document.querySelector('.italic')).toBeInTheDocument();
    });

    it('should have divider with proper styling', () => {
      render(<IndicatorSettingsDrawer />);

      const hr = document.querySelector('hr');
      expect(hr).toHaveClass('border-white/10');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<IndicatorSettingsDrawer />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Indicators');
    });

    it('should have associated labels for checkboxes', () => {
      render(<IndicatorSettingsDrawer />);

      const bbLabel = screen.getByText('Bollinger Bands').closest('label');
      expect(bbLabel).toBeInTheDocument();
      expect(within(bbLabel!).getByRole('checkbox')).toBeInTheDocument();
    });

    it('should have associated labels for number inputs', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const periodLabel = screen.getByText('Period').closest('label');
      expect(periodLabel).toBeInTheDocument();
      expect(within(periodLabel!).getByRole('spinbutton')).toBeInTheDocument();
    });

    it('should have number type inputs for settings', () => {
      mockStoreState = createMockStore({ showBB: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('20');
      expect(periodInput).toHaveAttribute('type', 'number');
    });

    it('should have min/max constraints on all period inputs', () => {
      mockStoreState = createMockStore({ showRSI: true });
      render(<IndicatorSettingsDrawer />);

      const periodInput = screen.getByDisplayValue('14');
      expect(periodInput).toHaveAttribute('min');
      expect(periodInput).toHaveAttribute('max');
    });
  });
});
