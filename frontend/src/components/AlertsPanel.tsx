import React from 'react'
import { useChartStore } from '@/state/store'
import type { Alert } from '@/lib/alerts'

export default function AlertsPanel() {
  const s = useChartStore()
  const [note, setNote] = React.useState('Crossing alert')

  const selectedLineIds = Array.from(s.selection).filter(id => {
    const d = s.drawings.find(dd => dd.id===id)
    return d && (d.kind==='hline' || d.kind==='trendline' || d.kind==='ray' || d.kind==='arrow')
  })

  const add = () => {
    if (!selectedLineIds.length) return
    s.addAlertForDrawing(selectedLineIds[0], note)
  }

  const testTrigger = () => {
    // Simulate alert evaluation with two Y values around the first selected line
    const d = s.drawings.find(dd => dd.id === selectedLineIds[0])
    if (!d) return
    const y = d.kind==='hline' ? d.points[0].y : d.points[0].y
    s.evaluateAlerts(y - 5, y + 5)
  }

  return (
    <div className='rounded-2xl border border-white/15 p-3 space-y-3'>
      <div className='font-semibold text-sm'>Alerts</div>
      <div className='text-xs opacity-70'>Select a line (trendline, ray, arrow, or hline) and create an alert that triggers on price crossing.</div>
      <div className='grid grid-cols-3 gap-2 text-sm'>
        <input className='col-span-2 bg-transparent border border-white/15 rounded px-2 py-1' value={note} onChange={e=>setNote(e.target.value)} placeholder='Note (optional)'/>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' disabled={!selectedLineIds.length} onClick={add}>Create Alert</button>
      </div>

      <AlertList />
      <div className='grid grid-cols-2 gap-2 text-sm'>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={testTrigger}>Test Trigger</button>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>s.clearAlertEvents()}>Clear Events</button>
      </div>
    </div>
  )
}

function AlertList() {
  const s = useChartStore()
  const alerts = s.alerts
  return (
    <div className='space-y-2'>
      {alerts.length===0 && <div className='text-xs opacity-60'>No alerts yet.</div>}
      {alerts.map(al => (
        <div key={al.id} className='flex items-center justify-between text-sm'>
          <div className='truncate'>
            <span className='opacity-70'>#{al.id.slice(0,5)}</span> on <code>{al.drawingId.slice(0,5)}</code> — {al.note || 'line cross'}
          </div>
          <div className='flex gap-2'>
            <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>useChartStore.getState().toggleAlert(al.id)}>{al.enabled ? 'Disable' : 'Enable'}</button>
            <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>useChartStore.getState().removeAlert(al.id)}>Delete</button>
          </div>
        </div>
      ))}

      {s.alertEvents.length>0 && (
        <div className='rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs'>
          <div className='font-semibold mb-1'>Recent triggers</div>
          {s.alertEvents.slice(-5).map(ev => (
            <div key={ev.at} className='opacity-90'>#{ev.id.slice(0,5)} at {new Date(ev.at).toLocaleTimeString()} — price {ev.price.toFixed(2)}</div>
          ))}
        </div>
      )}
    </div>
  )
}
