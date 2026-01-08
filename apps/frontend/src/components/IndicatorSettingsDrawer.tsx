import { useChartStore } from '@/state/store';
import React from 'react';

export default function IndicatorSettingsDrawer() {
  const s = useChartStore();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold mb-2">Indicators</h2>

      {/* Bollinger Bands */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>Bollinger Bands</span>
          <input
            type="checkbox"
            checked={s.indicators.showBB}
            onChange={() => s.toggleIndicator('showBB')}
          />
        </label>
        {s.indicators.showBB && (
          <div className="grid grid-cols-2 gap-2 text-sm pl-4">
            <label className="flex items-center justify-between">
              Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.bbPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ bbPeriod: parseInt(e.target.value || '20') })
                }
                min={5}
                max={100}
              />
            </label>
            <label className="flex items-center justify-between">
              Std Dev
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.bbMult}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ bbMult: parseFloat(e.target.value || '2') })
                }
                min={1}
                max={5}
                step={0.1}
              />
            </label>
            <label className="flex items-center justify-between col-span-2">
              Band Fill
              <input
                type="checkbox"
                checked={s.indicators.bandFill}
                onChange={() => s.toggleIndicator('bandFill')}
              />
            </label>
          </div>
        )}
      </div>

      {/* RSI */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>RSI</span>
          <input
            type="checkbox"
            checked={s.indicators.showRSI}
            onChange={() => s.toggleIndicator('showRSI')}
          />
        </label>
        {s.indicators.showRSI && (
          <div className="text-sm pl-4">
            <label className="flex items-center justify-between">
              Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.rsiPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ rsiPeriod: parseInt(e.target.value || '14') })
                }
                min={5}
                max={50}
              />
            </label>
          </div>
        )}
      </div>

      {/* MACD */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>MACD</span>
          <input
            type="checkbox"
            checked={s.indicators.showMACD}
            onChange={() => s.toggleIndicator('showMACD')}
          />
        </label>
        {s.indicators.showMACD && (
          <div className="grid grid-cols-2 gap-2 text-sm pl-4">
            <label className="flex items-center justify-between">
              Fast
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.macdFastPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ macdFastPeriod: parseInt(e.target.value || '12') })
                }
                min={3}
                max={50}
              />
            </label>
            <label className="flex items-center justify-between">
              Slow
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.macdSlowPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ macdSlowPeriod: parseInt(e.target.value || '26') })
                }
                min={10}
                max={100}
              />
            </label>
            <label className="flex items-center justify-between col-span-2">
              Signal
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.macdSignalPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({
                    macdSignalPeriod: parseInt(e.target.value || '9'),
                  })
                }
                min={3}
                max={30}
              />
            </label>
          </div>
        )}
      </div>

      {/* Stochastic */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>Stochastic</span>
          <input
            type="checkbox"
            checked={s.indicators.showStochastic}
            onChange={() => s.toggleIndicator('showStochastic')}
          />
        </label>
        {s.indicators.showStochastic && (
          <div className="grid grid-cols-2 gap-2 text-sm pl-4">
            <label className="flex items-center justify-between">
              %K Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.stochasticKPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({
                    stochasticKPeriod: parseInt(e.target.value || '14'),
                  })
                }
                min={3}
                max={50}
              />
            </label>
            <label className="flex items-center justify-between">
              %D Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.stochasticDPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({
                    stochasticDPeriod: parseInt(e.target.value || '3'),
                  })
                }
                min={1}
                max={20}
              />
            </label>
          </div>
        )}
      </div>

      {/* ADX */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>ADX</span>
          <input
            type="checkbox"
            checked={s.indicators.showADX}
            onChange={() => s.toggleIndicator('showADX')}
          />
        </label>
        {s.indicators.showADX && (
          <div className="text-sm pl-4">
            <label className="flex items-center justify-between">
              Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.adxPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ adxPeriod: parseInt(e.target.value || '14') })
                }
                min={5}
                max={50}
              />
            </label>
          </div>
        )}
      </div>

      {/* CCI */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>CCI</span>
          <input
            type="checkbox"
            checked={s.indicators.showCCI}
            onChange={() => s.toggleIndicator('showCCI')}
          />
        </label>
        {s.indicators.showCCI && (
          <div className="text-sm pl-4">
            <label className="flex items-center justify-between">
              Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.cciPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ cciPeriod: parseInt(e.target.value || '20') })
                }
                min={5}
                max={50}
              />
            </label>
          </div>
        )}
      </div>

      {/* Williams %R */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>Williams %R</span>
          <input
            type="checkbox"
            checked={s.indicators.showWilliamsR}
            onChange={() => s.toggleIndicator('showWilliamsR')}
          />
        </label>
        {s.indicators.showWilliamsR && (
          <div className="text-sm pl-4">
            <label className="flex items-center justify-between">
              Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.williamsRPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ williamsRPeriod: parseInt(e.target.value || '14') })
                }
                min={5}
                max={50}
              />
            </label>
          </div>
        )}
      </div>

      {/* OBV (no settings) */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>OBV</span>
          <input
            type="checkbox"
            checked={s.indicators.showOBV}
            onChange={() => s.toggleIndicator('showOBV')}
          />
        </label>
        {s.indicators.showOBV && (
          <div className="text-xs pl-4 opacity-60 italic">No configurable settings</div>
        )}
      </div>

      {/* A/D Line (no settings) */}
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>A/D Line</span>
          <input
            type="checkbox"
            checked={s.indicators.showADLine}
            onChange={() => s.toggleIndicator('showADLine')}
          />
        </label>
        {s.indicators.showADLine && (
          <div className="text-xs pl-4 opacity-60 italic">No configurable settings</div>
        )}
      </div>

      {/* Divider */}
      <hr className="border-white/10" />

      {/* Legacy Indicators */}
      <div className="space-y-2 opacity-75">
        <div className="text-xs font-semibold opacity-60 uppercase">Legacy Indicators</div>

        <label className="flex items-center justify-between">
          <span>VWAP</span>
          <input
            type="checkbox"
            checked={s.indicators.showVWAP}
            onChange={() => s.toggleIndicator('showVWAP')}
          />
        </label>

        <label className="flex items-center justify-between">
          <span>VWMA</span>
          <input
            type="checkbox"
            checked={s.indicators.showVWMA}
            onChange={() => s.toggleIndicator('showVWMA')}
          />
        </label>
        {s.indicators.showVWMA && (
          <div className="text-sm pl-4">
            <label className="flex items-center justify-between">
              Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.vwmaPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({ vwmaPeriod: parseInt(e.target.value || '20') })
                }
              />
            </label>
          </div>
        )}

        <label className="flex items-center justify-between">
          <span>StdDev Channels</span>
          <input
            type="checkbox"
            checked={s.indicators.showStdChannels}
            onChange={() => s.toggleIndicator('showStdChannels')}
          />
        </label>
        {s.indicators.showStdChannels && (
          <div className="grid grid-cols-2 gap-2 text-sm pl-4">
            <label className="flex items-center justify-between">
              Period
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.stdChannelPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({
                    stdChannelPeriod: parseInt(e.target.value || '20'),
                  })
                }
              />
            </label>
            <label className="flex items-center justify-between">
              Mult
              <input
                className="ml-2 w-16 bg-transparent border px-2 py-1 rounded"
                type="number"
                value={s.indicatorSettings.stdChannelMult}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  s.updateIndicatorSettings({
                    stdChannelMult: parseFloat(e.target.value || '2'),
                  })
                }
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

