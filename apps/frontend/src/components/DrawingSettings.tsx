import React from 'react'
import { useChartStore } from '@/state/store'

export default function DrawingSettings() {
  const snapEnabled = useChartStore(s => s.drawingSettings.snapEnabled)
  const snapStep = useChartStore(s => s.drawingSettings.snapStep)
  const showHandles = useChartStore(s => s.drawingSettings.showHandles)
  const setDrawingSettings = useChartStore(s => s.setDrawingSettings)

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Drawing Settings</h2>
      <div className="space-y-3 text-sm">
        <label className="flex items-center justify-between">
          <span>Snap to grid</span>
          <input type="checkbox" checked={snapEnabled} onChange={() => setDrawingSettings({ snapEnabled: !snapEnabled })} />
        </label>
        <label className="flex items-center justify-between">
          <span>Snap step (px)</span>
          <input className="ml-2 bg-transparent border px-2 py-1 rounded w-24" type="number" min={2} max={100} step={1}
            value={snapStep} onChange={(e: any) => setDrawingSettings({ snapStep: parseInt(e.target.value || '10', 10) })} />
        </label>
        <label className="flex items-center justify-between">
          <span>Show handles</span>
          <input type="checkbox" checked={showHandles} onChange={() => setDrawingSettings({ showHandles: !showHandles })} />
        </label>
        <div className="text-xs text-neutral-400 pt-1">
          Tips: press <kbd>S</kbd> to toggle snapping while focused on the canvas.
        </div>
      </div>
    </div>
  )
}
