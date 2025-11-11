import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { useChartStore } from '@/state/store';
import React from 'react';

/**
 * IndicatorControlsPanel - UI for customizing indicator periods and settings
 *
 * Provides user-facing controls for all 9 indicators:
 * - RSI: period (5-50, default 14)
 * - MACD: fast/slow/signal periods (defaults 12/26/9)
 * - Bollinger Bands: period + std deviation (defaults 20/2)
 * - Stochastic: %K and %D periods (defaults 14/3)
 * - ADX: period (default 14)
 * - CCI: period (default 20)
 * - Williams %R: period (default 14)
 * - OBV: no settings (cumulative)
 * - A/D Line: no settings (cumulative)
 */
// LocalStorage keys for confirmation preferences
const CONFIRM_RESET_ALL_KEY = 'lokifi_confirm_reset_all_indicators';
const CONFIRM_RESET_INDIVIDUAL_KEY = 'lokifi_confirm_reset_individual_indicator';

export default function IndicatorControlsPanel() {
  const {
    indicators,
    indicatorSettings,
    updateIndicatorSetting,
    resetIndicatorSettings,
    applyPreset,
    toggleIndicatorControlsPanel,
  } = useChartStore();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<string>('');

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    showDontAskAgain: boolean;
    storageKey?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    showDontAskAgain: false,
  });

  // Handle input change with validation
  const handleChange = (key: keyof typeof indicatorSettings, value: number) => {
    // Validate ranges based on indicator type
    const validatedValue = validateSetting(key, value);
    updateIndicatorSetting(key, validatedValue);
  };

  // Reset all settings to defaults
  const handleReset = () => {
    // Check if user has disabled this confirmation
    const skipConfirm = localStorage.getItem(CONFIRM_RESET_ALL_KEY) === 'false';

    if (skipConfirm) {
      resetIndicatorSettings();
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: 'Reset All Indicators',
      message:
        'This will reset all indicator settings to their default values. This action cannot be undone.',
      onConfirm: () => {
        resetIndicatorSettings();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
      showDontAskAgain: true,
      storageKey: CONFIRM_RESET_ALL_KEY,
    });
  };

  // Reset individual indicator to default
  const handleResetIndividual = (settingKeys: string[], indicatorName: string) => {
    // Check if user has disabled this confirmation
    const skipConfirm = localStorage.getItem(CONFIRM_RESET_INDIVIDUAL_KEY) === 'false';

    if (skipConfirm) {
      settingKeys.forEach((key) => {
        const defaultValue = getDefaultValue(key as keyof typeof indicatorSettings);
        updateIndicatorSetting(key as keyof typeof indicatorSettings, defaultValue);
      });
      return;
    }

    // Show confirmation dialog
    setConfirmDialog({
      isOpen: true,
      title: `Reset ${indicatorName}`,
      message: `This will reset ${indicatorName} settings to default values. This action cannot be undone.`,
      onConfirm: () => {
        settingKeys.forEach((key) => {
          const defaultValue = getDefaultValue(key as keyof typeof indicatorSettings);
          updateIndicatorSetting(key as keyof typeof indicatorSettings, defaultValue);
        });
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
      showDontAskAgain: true,
      storageKey: CONFIRM_RESET_INDIVIDUAL_KEY,
    });
  };

  // Handle "don't ask again" checkbox
  const handleDontAskAgainChange = (checked: boolean) => {
    if (confirmDialog.storageKey) {
      localStorage.setItem(confirmDialog.storageKey, checked ? 'false' : 'true');
    }
  };

  // Handle preset application with confirmation
  const handleApplyPreset = () => {
    if (!selectedPreset) return;

    const presetNames: Record<string, string> = {
      'day-trading': 'Day Trading',
      'swing-trading': 'Swing Trading',
      'position-trading': 'Position Trading',
    };

    setConfirmDialog({
      isOpen: true,
      title: 'Apply Preset Configuration',
      message: `Apply ${presetNames[selectedPreset]} preset? This will update all indicator settings.`,
      onConfirm: () => {
        applyPreset(selectedPreset);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
      },
      showDontAskAgain: false,
    });
  };

  // Keyboard shortcuts - attached after all handlers are defined
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R: Reset all indicator settings
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleReset();
        return;
      }

      // Ctrl/Cmd + S: Apply selected preset
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (selectedPreset) {
          handleApplyPreset();
        }
        return;
      }

      // Ctrl/Cmd + I: Toggle indicator panel visibility
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        toggleIndicatorControlsPanel();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPreset, handleReset, handleApplyPreset, toggleIndicatorControlsPanel]);

  return (
    <>
      <div className="rounded-2xl border border-white/15 p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm">Indicator Settings</div>
          <div className="flex gap-2">
            <button
              className="px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10 transition-colors"
              onClick={handleReset}
              title="Reset all settings to defaults (Ctrl/Cmd+R)"
            >
              Reset All
            </button>
            <button
              className="px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10 transition-colors"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼ Collapse' : '▶ Expand'}
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex gap-2">
          <select
            className="flex-1 px-2 py-1.5 text-xs rounded border border-white/15 bg-neutral-800 hover:bg-neutral-700 transition-colors"
            value={selectedPreset}
            onChange={(e) => setSelectedPreset(e.target.value)}
            title="Select a trading strategy preset"
          >
            <option value="">Select Trading Preset...</option>
            <option value="day-trading">📈 Day Trading (Quick Signals)</option>
            <option value="swing-trading">📊 Swing Trading (Balanced)</option>
            <option value="position-trading">📉 Position Trading (Long-term)</option>
          </select>
          <button
            className="px-3 py-1.5 text-xs rounded border border-white/15 bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleApplyPreset}
            disabled={!selectedPreset}
            title={selectedPreset ? 'Apply selected preset (Ctrl/Cmd+S)' : 'Select a preset first'}
          >
            Apply
          </button>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="space-y-4">
            {/* RSI Settings */}
            {indicators.showRSI && (
              <IndicatorControl
                label="RSI Period"
                value={indicatorSettings.rsiPeriod}
                onChange={(v) => handleChange('rsiPeriod', v)}
                min={5}
                max={50}
                defaultValue={14}
                description="Relative Strength Index lookback period"
              />
            )}

            {/* MACD Settings */}
            {indicators.showMACD && (
              <div className="space-y-2">
                <div className="text-xs font-semibold opacity-80">MACD Settings</div>
                <IndicatorControl
                  label="Fast Period"
                  value={indicatorSettings.macdFastPeriod}
                  onChange={(v) => handleChange('macdFastPeriod', v)}
                  min={3}
                  max={50}
                  defaultValue={12}
                />
                <IndicatorControl
                  label="Slow Period"
                  value={indicatorSettings.macdSlowPeriod}
                  onChange={(v) => handleChange('macdSlowPeriod', v)}
                  min={10}
                  max={100}
                  defaultValue={26}
                />
                <IndicatorControl
                  label="Signal Period"
                  value={indicatorSettings.macdSignalPeriod}
                  onChange={(v) => handleChange('macdSignalPeriod', v)}
                  min={3}
                  max={30}
                  defaultValue={9}
                />
              </div>
            )}

            {/* Bollinger Bands Settings */}
            {indicators.showBB && (
              <div className="space-y-2">
                <div className="text-xs font-semibold opacity-80">Bollinger Bands Settings</div>
                <IndicatorControl
                  label="Period"
                  value={indicatorSettings.bbPeriod}
                  onChange={(v) => handleChange('bbPeriod', v)}
                  min={5}
                  max={100}
                  defaultValue={20}
                />
                <IndicatorControl
                  label="Std Deviation"
                  value={indicatorSettings.bbMult}
                  onChange={(v) => handleChange('bbMult', v)}
                  min={1}
                  max={5}
                  step={0.1}
                  defaultValue={2}
                />
              </div>
            )}

            {/* Stochastic Settings */}
            {indicators.showStochastic && (
              <div className="space-y-2">
                <div className="text-xs font-semibold opacity-80">Stochastic Settings</div>
                <IndicatorControl
                  label="%K Period"
                  value={indicatorSettings.stochasticKPeriod}
                  onChange={(v) => handleChange('stochasticKPeriod', v)}
                  min={3}
                  max={50}
                  defaultValue={14}
                />
                <IndicatorControl
                  label="%D Period"
                  value={indicatorSettings.stochasticDPeriod}
                  onChange={(v) => handleChange('stochasticDPeriod', v)}
                  min={1}
                  max={20}
                  defaultValue={3}
                />
              </div>
            )}

            {/* ADX Settings */}
            {indicators.showADX && (
              <IndicatorControl
                label="ADX Period"
                value={indicatorSettings.adxPeriod}
                onChange={(v) => handleChange('adxPeriod', v)}
                min={5}
                max={50}
                defaultValue={14}
                description="Average Directional Index lookback period"
              />
            )}

            {/* CCI Settings */}
            {indicators.showCCI && (
              <IndicatorControl
                label="CCI Period"
                value={indicatorSettings.cciPeriod}
                onChange={(v) => handleChange('cciPeriod', v)}
                min={5}
                max={50}
                defaultValue={20}
                description="Commodity Channel Index lookback period"
              />
            )}

            {/* Williams %R Settings */}
            {indicators.showWilliamsR && (
              <IndicatorControl
                label="Williams %R Period"
                value={indicatorSettings.williamsRPeriod}
                onChange={(v) => handleChange('williamsRPeriod', v)}
                min={5}
                max={50}
                defaultValue={14}
                description="Williams %R lookback period"
              />
            )}

            {/* OBV - No Settings (Cumulative) */}
            {indicators.showOBV && (
              <div className="text-xs opacity-60 italic">
                OBV (On-Balance Volume) - No configurable settings
              </div>
            )}

            {/* A/D Line - No Settings (Cumulative) */}
            {indicators.showADLine && (
              <div className="text-xs opacity-60 italic">
                A/D Line (Accumulation/Distribution) - No configurable settings
              </div>
            )}

            {/* No indicators active message */}
            {!indicators.showRSI &&
              !indicators.showMACD &&
              !indicators.showBB &&
              !indicators.showStochastic &&
              !indicators.showADX &&
              !indicators.showCCI &&
              !indicators.showWilliamsR &&
              !indicators.showOBV &&
              !indicators.showADLine && (
                <div className="text-xs opacity-60 text-center py-4">
                  No indicators active. Toggle indicators to customize settings.
                </div>
              )}
          </div>
        )}

        {/* Keyboard Shortcuts Help */}
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs font-medium mb-2">⌨️ Keyboard Shortcuts</div>
          <div className="space-y-1 text-xs opacity-70">
            <div className="flex justify-between">
              <span>Reset All Settings:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Ctrl/Cmd+R</kbd>
            </div>
            <div className="flex justify-between">
              <span>Apply Preset:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Ctrl/Cmd+S</kbd>
            </div>
            <div className="flex justify-between">
              <span>Toggle Panel:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Ctrl/Cmd+I</kbd>
            </div>
            <div className="flex justify-between">
              <span>Close Dialogs:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono">Esc</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText="Reset"
        cancelText="Cancel"
        showDontAskAgain={confirmDialog.showDontAskAgain}
        onDontAskAgainChange={handleDontAskAgainChange}
      />
    </>
  );
}

/**
 * Individual Indicator Control Component
 */
interface IndicatorControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  description?: string;
}

function IndicatorControl({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  defaultValue,
  description,
}: IndicatorControlProps) {
  const [inputValue, setInputValue] = React.useState(value.toString());

  // Sync inputValue when value changes externally (e.g., reset)
  React.useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Parse and validate
    const parsed = parseFloat(newValue);
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, min), max);
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    // Ensure valid value on blur
    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) {
      setInputValue(value.toString());
    }
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1">
        <div className="text-xs font-medium">{label}</div>
        {description && <div className="text-xs opacity-60">{description}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          min={min}
          max={max}
          step={step}
          className="w-16 px-2 py-1 text-xs rounded border border-white/15 bg-transparent"
        />
        <button
          className="px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10 transition-colors"
          onClick={() => {
            setInputValue(defaultValue.toString());
            onChange(defaultValue);
          }}
          title="Reset to default"
        >
          ↺
        </button>
      </div>
    </div>
  );
}

/**
 * Validate setting values based on indicator type
 */
function validateSetting(key: string, value: number): number {
  const validations: Record<string, { min: number; max: number }> = {
    rsiPeriod: { min: 5, max: 50 },
    macdFastPeriod: { min: 3, max: 50 },
    macdSlowPeriod: { min: 10, max: 100 },
    macdSignalPeriod: { min: 3, max: 30 },
    bbPeriod: { min: 5, max: 100 },
    bbMult: { min: 1, max: 5 },
    stochasticKPeriod: { min: 3, max: 50 },
    stochasticDPeriod: { min: 1, max: 20 },
    adxPeriod: { min: 5, max: 50 },
    cciPeriod: { min: 5, max: 50 },
    williamsRPeriod: { min: 5, max: 50 },
  };

  const validation = validations[key];
  if (!validation) return value;

  return Math.min(Math.max(value, validation.min), validation.max);
}

/**
 * Get default value for a specific indicator setting
 */
function getDefaultValue(key: string): number {
  const defaults: Record<string, number> = {
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
  };

  return defaults[key] ?? 14; // Default fallback
}
