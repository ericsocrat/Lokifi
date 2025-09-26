import React from 'react'
import { useChartStore } from '@/state/store'
import type { Alert } from '@/lib/alerts'
import { ensureNotificationPermission } from '@/lib/notify'

type Filter = 'all'|'active'|'snoozed'|'disabled'|'triggered'

export default function AlertsPanel() {
  const s = useChartStore()
  const [filter, setFilter] = React.useState<Filter>('all')

  const list = s.alerts.filter(a => {
    if (filter === 'all') return true
    if (filter === 'active') return a.enabled && (!a.snoozedUntil || a.snoozedUntil < Date.now())
    if (filter === 'snoozed') return !!a.snoozedUntil && a.snoozedUntil > Date.now()
    if (filter === 'disabled') return !a.enabled
    if (filter === 'triggered') return (a.triggers ?? 0) > 0
    return true
  })

  const openModal = () => {
    window.dispatchEvent(new CustomEvent('fynix:open-alert'))
  }

  return (
    <div className='rounded-2xl border border-white/15 p-3 space-y-3'>
      <div className='flex items-center justify-between'>
        <div className='font-semibold text-sm'>Alert Center</div>
        <div className='flex gap-2'>
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={openModal}>+ New Alert</button>
          <select className='bg-transparent border border-white/15 rounded px-2 py-1 text-xs'
                  value={filter} onChange={e=>setFilter(e.target.value as Filter)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="snoozed">Snoozed</option>
            <option value="disabled">Disabled</option>
            <option value="triggered">Triggered</option>
          </select>
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'
                  onClick={()=>ensureNotificationPermission()}>Enable Notifications</button>
        </div>
      </div>

      <div className='space-y-2'>
        {list.length === 0 && <div className='text-xs opacity-60'>No alerts.</div>}
        {list.map(al => <AlertRow key={al.id} a={al} />)}
      </div>

      {s.alertEvents.length>0 && (
        <div className='rounded border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs'>
          <div className='font-semibold mb-1'>Recent triggers</div>
          {s.alertEvents.slice(-8).reverse().map(ev => (
            <div key={ev.at} className='opacity-90'>
              #{ev.id.slice(0,5)} — {ev.kind} at {new Date(ev.at).toLocaleTimeString()} {ev.price!=null ? `@ ${ev.price.toFixed(2)}`:''}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AlertRow({ a }: { a: Alert }) {
  const s = useChartStore()
  const snooze = (mins: number) => s.snoozeAlert(a.id, mins ? (Date.now() + mins*60_000) : null)
  return (
    <div className='flex items-center justify-between text-sm rounded border border-white/10 px-2 py-1'>
      <div className='truncate'>
        <span className='opacity-70'>#{a.id.slice(0,5)}</span> — <code>{a.kind}</code>
        {a.note ? <> &nbsp; {a.note}</> : null}
        {a.maxTriggers ? <> &nbsp; <span className='opacity-60'>(max {a.maxTriggers})</span></> : null}
        {a.triggers ? <> &nbsp; <span className='opacity-60'>{a.triggers}x</span></> : null}
        {a.snoozedUntil && a.snoozedUntil > Date.now() ? <> &nbsp; <span className='opacity-60'>snoozed</span></> : null}
      </div>
      <div className='flex gap-2'>
        <select className='bg-transparent border border-white/15 rounded px-2 py-1 text-xs' value={a.sound||'none'}
                onChange={e=>s.updateAlert(a.id, { sound: e.target.value as any })}>
          <option value="ping">Ping</option>
          <option value="none">No sound</option>
        </select>
        <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10' onClick={()=>s.toggleAlert(a.id)}>{a.enabled ? 'Disable':'Enable'}</button>
        <div className='relative group'>
          <button className='px-2 py-1 text-xs rounded border border-white/15 hover:bg-white/10'>Snooze ▾</button>
          <div className='absolute right-0 mt-1 hidden group-hover:block bg-black/80 border border-white/10 rounded shadow-lg text-xs'>
            <MenuBtn onClick={()=>snooze(5)}>5m</MenuBtn>
            <MenuBtn onClick={()=>snooze(15)}>15m</MenuBtn>
            <MenuBtn onClick={()=>snooze(60)}>1h</MenuBtn>
            <MenuBtn onClick={()=>snooze(0)}>Clear</MenuBtn>
          </div>
        </div>
        <button className='px-2 py-1 text-xs rounded border border-red-500/40 hover:bg-red-500/10' onClick={()=>s.removeAlert(a.id)}>Delete</button>
      </div>
    </div>
  )
}
function MenuBtn({children, onClick}:{children:React.ReactNode; onClick:()=>void}) {
  return <div className='px-3 py-2 hover:bg-white/10 cursor-pointer' onClick={onClick}>{children}</div>
}
