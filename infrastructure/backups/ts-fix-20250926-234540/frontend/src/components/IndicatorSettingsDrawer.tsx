import React from 'react'
import { useChartStore } from '@/state/store'

export default function IndicatorSettingsDrawer() {
  const s = useChartStore()
  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Indicators</h2>
      <div className="space-y-2">
        <label className="flex items-center justify-between">
          <span>Bollinger Bands</span>
          <input type="checkbox" checked={s.indicators.showBB} onChange={() => s.toggleIndicator('showBB')} />
        </label>
        {s.indicators.showBB && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center justify-between">Period
              <input className="ml-2 bg-transparent border px-2 py-1 rounded" type="number" value={s.indicatorSettings.bbPeriod}
                onChange={e => s.updateIndicatorSettings({ bbPeriod: parseInt(e.target.value||'0') })} />
            </label>
            <label className="flex items-center justify-between">Mult
              <input className="ml-2 bg-transparent border px-2 py-1 rounded" type="number" value={s.indicatorSettings.bbMult}
                onChange={e => s.updateIndicatorSettings({ bbMult: parseFloat(e.target.value||'0') })} />
            </label>
            <label className="flex items-center justify-between col-span-2">Band Fill
              <input type="checkbox" checked={s.indicators.bandFill} onChange={() => s.toggleIndicator('bandFill')} />
            </label>
          </div>
        )}

        <label className="flex items-center justify-between mt-2">
          <span>VWAP</span>
          <input type="checkbox" checked={s.indicators.showVWAP} onChange={() => s.toggleIndicator('showVWAP')} />
        </label>

        <label className="flex items-center justify-between">
          <span>VWMA</span>
          <input type="checkbox" checked={s.indicators.showVWMA} onChange={() => s.toggleIndicator('showVWMA')} />
        </label>
        {s.indicators.showVWMA && (
          <div className="text-sm">
            <label className="flex items-center justify-between">VWMA Period
              <input className="ml-2 bg-transparent border px-2 py-1 rounded" type="number" value={s.indicatorSettings.vwmaPeriod}
                onChange={e => s.updateIndicatorSettings({ vwmaPeriod: parseInt(e.target.value||'0') })} />
            </label>
          </div>
        )}

        <label className="flex items-center justify-between mt-2">
          <span>StdDev Channels</span>
          <input type="checkbox" checked={s.indicators.showStdChannels} onChange={() => s.toggleIndicator('showStdChannels')} />
        </label>
        {s.indicators.showStdChannels && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <label className="flex items-center justify-between">Period
              <input className="ml-2 bg-transparent border px-2 py-1 rounded" type="number" value={s.indicatorSettings.stdChannelPeriod}
                onChange={e => s.updateIndicatorSettings({ stdChannelPeriod: parseInt(e.target.value||'0') })} />
            </label>
            <label className="flex items-center justify-between">Mult
              <input className="ml-2 bg-transparent border px-2 py-1 rounded" type="number" value={s.indicatorSettings.stdChannelMult}
                onChange={e => s.updateIndicatorSettings({ stdChannelMult: parseFloat(e.target.value||'0') })} />
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
