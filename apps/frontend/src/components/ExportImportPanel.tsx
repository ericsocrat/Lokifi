"use client";

import { downloadText, exportPngFromRoot } from '@/lib/utils/io';
import { saveCurrent } from '@/lib/utils/persist';
import { encodeShare } from '@/lib/utils/share';
import { useChartStore } from '@/state/store';
import React from 'react';

export default function ExportImportPanel() {
  const s = useChartStore()
  const rootRef = React.useRef<HTMLDivElement>(null) // used for PNG export root

  // Provide a ref to the main chart area (we'll grab it from DOM if not set)
  React.useEffect(() => {
    if (!rootRef.current) {
      const el = document.querySelector('main.relative') as HTMLDivElement | null
      if (el) {
        // Use object spread to avoid read-only property assignment error
        Object.assign(rootRef, { current: el })
      }
    }
  }, [])

  const onExportJson = () => {
    const payload = {
      drawings: s.drawings,
      indicators: s.indicators,
      indicatorSettings: s.indicatorSettings,
      theme: s.theme,
      symbol: s.symbol,
      timeframe: s.timeframe
    }
    const pretty = JSON.stringify(payload, null, 2)
    downloadText(`lokifi-scene-.json`, pretty)
  }

  const onImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const drawings = Array.isArray(data.drawings) ? data.drawings : []
      const indicators = data.indicators ?? s.indicators
      const indicatorSettings = data.indicatorSettings ?? s.indicatorSettings
      const theme = data.theme ?? s.theme
      const symbol = data.symbol ?? s.symbol
      const timeframe = data.timeframe ?? s.timeframe

      useChartStore.setState({
        drawings,
        selection: new Set<string>(),
        indicators,
        indicatorSettings,
        theme,
        symbol,
        timeframe
      })
      try { saveCurrent(drawings, new Set()) } catch { }
      e.target.value = '' // reset file input
      alert('Imported scene.')
    } catch (err) {
      alert('Failed to import: ' + (err as any)?.message)
    }
  }

  const onExportPng = async () => {
    const root = rootRef.current || (document.querySelector('main.relative') as HTMLElement | null)
    if (!root) { alert('Chart area not found'); return }
    try {
      await exportPngFromRoot(root, `lokifi-.png`)
    } catch (e) {
      alert('PNG export failed. Make sure the chart is visible.')
    }
  }

  const onCopyShareUrl = async () => {
    const payload = {
      drawings: s.drawings,
      indicators: s.indicators,
      indicatorSettings: s.indicatorSettings,
      theme: s.theme,
      symbol: s.symbol,
      timeframe: s.timeframe
    }
    const hash = encodeShare(payload)
    const url = `${window.location.origin}#`
    try {
      await navigator.clipboard.writeText(url)
      alert('Sharable URL copied to clipboard.')
    } catch {
      // fallback: prompt
      window.prompt('Copy URL:', url)
    }
  }

  return (
    <div className='space-y-3 text-sm'>
      <h2 className='text-lg font-semibold'>Export / Import</h2>

      <div className='flex gap-2 flex-wrap'>
        <button className='px-3 py-1 rounded border border-neutral-700' onClick={onExportJson}>
          Export JSON
        </button>
        <label className='px-3 py-1 rounded border border-neutral-700 cursor-pointer'>
          Import JSON
          <input type='file' accept='.json,application/json' className='hidden' onChange={onImportJson} />
        </label>
        <button className='px-3 py-1 rounded border border-neutral-700' onClick={onExportPng}>
          Export PNG
        </button>
        <button className='px-3 py-1 rounded border border-neutral-700' onClick={onCopyShareUrl}>
          Copy Share URL
        </button>
      </div>

      <p className='text-xs text-neutral-400'>
        JSON includes drawings, indicators, and settings. PNG composites chart + drawings as seen.
      </p>
    </div>
  )
}

