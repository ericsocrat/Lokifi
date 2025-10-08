import React from 'react'
type ToastMsg = { id: number; text: string; ttl: number }

let listeners: ((msg: ToastMsg)=>void)[] = []
let idSeq = 1

export function toast(text: string, ttl = 1200) {
  const msg: ToastMsg = { id: idSeq++, text, ttl }
  listeners.forEach(fn => fn(msg))
}

export function ToastHost() {
  const [items, setItems] = React.useState<ToastMsg[]>([])
  React.useEffect(() => {
    const on = (m: ToastMsg) => {
      setItems(prev => [...prev, m])
      setTimeout(() => {
        setItems(prev => prev.filter(x => x.id !== m.id))
      }, m.ttl)
    }
    listeners.push(on)
    return () => { listeners = listeners.filter(l => l !== on) }
  }, [])
  return (
    <div className="pointer-events-none fixed z-[999] bottom-4 right-4 flex flex-col gap-2">
      {items.map(m => (
        <div key={m.id}
             className="pointer-events-auto rounded-md border border-white/15 bg-black/80 text-white/90 px-3 py-2 text-sm shadow">
          {m.text}
        </div>
      ))}
    </div>
  )
}
