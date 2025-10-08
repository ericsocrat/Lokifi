import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import type { Drawing } from '@/lib/drawings'
import { useChartStore } from '@/state/store'

let doc: Y.Doc | null = null
let provider: WebsocketProvider | null = null
let yDrawings: Y.Array<any> | null = null

export function startCollab(roomId: string, endpoint = 'wss://demos.yjs.dev'): { stop: () => void } {
  const s = (useChartStore as any).getState()
  doc = new Y.Doc()
  provider = new WebsocketProvider(endpoint, roomId, doc)
  yDrawings = doc.getArray('drawings')

  // initial sync: push local → Y
  doc.transact(() => {
    yDrawings!.delete(0, yDrawings!.length)
    s.drawings.forEach((d: Drawing) => yDrawings!.push([d]))
  })

  // local → remote
  const unsub = useChartStore.subscribe((state: any) => {
    if (!yDrawings) return
    doc!.transact(() => {
      yDrawings!.delete(0, yDrawings!.length)
      state.drawings.forEach((d: Drawing) => yDrawings!.push([d]))
    })
  })

  // remote → local
  const applyRemote = () => {
    const arr = yDrawings!.toArray()
    s.setAll?.({ drawings: arr as Drawing[] })
  }
  yDrawings.observeDeep(applyRemote)

  return {
    stop: () => {
      try { unsub() } catch {}
      try { provider?.destroy() } catch {}
      try { doc?.destroy() } catch {}
      doc = null; provider = null; yDrawings = null
    }
  }
}
