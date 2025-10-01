"use client";

import { startCollab } from '@/lib/collab';
import { exportReportPDF } from '@/lib/pdf';
import { makeShareURL, tryLoadFromURL } from '@/lib/share';
import { useChartStore } from '@/state/store';
import React from 'react';

export default function ShareBar() {
  const s = useChartStore()
  const [room, setRoom] = React.useState('')
  const [collab, setCollab] = React.useState<{ stop: () => void } | null>(null)

  React.useEffect(() => {
    const snap = tryLoadFromURL()
    if (snap) {
      s.setAll?.({ drawings: snap.drawings, theme: snap.theme || s.theme, timeframe: snap.timeframe || s.timeframe })
      try { (window as any).__fynix_toast?.('Loaded from share link') } catch { }
      // clear hash to avoid repeat
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onShare = () => {
    const url = makeShareURL({
      v: 1, t: 'readOnly',
      drawings: s.drawings,
      theme: s.theme, timeframe: s.timeframe,
      createdAt: Date.now()
    })
    navigator.clipboard.writeText(url)
    try { (window as any).__fynix_toast?.('Share link copied') } catch { }
  }

  const toggleCollab = () => {
    if (collab) {
      collab.stop(); setCollab(null)
      try { (window as any).__fynix_toast?.('Collab stopped') } catch { }
    } else if (room.trim()) {
      setCollab(startCollab(room.trim()))
      try { (window as any).__fynix_toast?.('Collab started') } catch { }
    }
  }

  return (
    <div className='rounded-2xl border border-white/15 p-3 space-y-3'>
      <div className='font-semibold text-sm'>Share & Collaborate</div>
      <div className='grid grid-cols-3 gap-2 text-sm'>
        <button className='col-span-2 px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={onShare}>Copy Share Link</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={() => exportReportPDF()}>Export PDF</button>
      </div>
      <div className='grid grid-cols-3 gap-2 text-sm'>
        <input className='col-span-2 bg-transparent border border-white/15 rounded px-2 py-1' value={room} onChange={e => setRoom(e.target.value)} placeholder='Room ID (e.g. lokifi-dev)' />
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={toggleCollab}>{collab ? 'Stop' : 'Start'} Collab</button>
      </div>
      <div className='text-xs opacity-60'>Collab uses public demo server <code>demos.yjs.dev</code>. For production, point to your own y-websocket.</div>
    </div>
  )
}
